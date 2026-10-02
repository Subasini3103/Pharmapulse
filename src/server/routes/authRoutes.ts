import { Router, Response } from 'express';
import { db } from '../../db/index.ts';
import { users, customers, auditLogs } from '../../db/schema.ts';
import {
  validatePasswordStrength,
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  logAudit,
} from '../auth.ts';
import { requireAuth, AuthenticatedRequest } from '../middleware.ts';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const router = Router();

// POST /api/auth/register (Public registration - Customer accounts only)
router.post('/register', async (req, res): Promise<any> => {
  const { name, email, phone, password, confirmPassword } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, and password are required fields.',
    });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address.',
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Password and Confirm Password do not match.',
    });
  }

  // Validate password strength
  const strengthCheck = validatePasswordStrength(password);
  if (!strengthCheck.isValid) {
    return res.status(400).json({
      success: false,
      message: strengthCheck.message,
    });
  }

  try {
    // Check duplicate email
    const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()));
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    const passwordHash = await hashPassword(password);

    // Strictly enforce CUSTOMER role for public registration
    const [newUser] = await db
      .insert(users)
      .values({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone ? phone.trim() : null,
        passwordHash,
        role: 'CUSTOMER',
        status: 'ACTIVE',
      })
      .returning();

    // Create customer profile linked to user
    const [newCustomer] = await db
      .insert(customers)
      .values({
        userId: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: phone ? phone.trim() : 'N/A',
      })
      .returning();

    await logAudit({
      userId: newUser.id,
      userEmail: newUser.email,
      action: 'USER_REGISTRATION',
      details: `New customer registered: ${newUser.email}`,
      ipAddress: req.ip || '127.0.0.1',
      result: 'SUCCESS',
    });

    const tokenPayload = {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role as any,
      name: newUser.name,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      data: {
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          phone: newUser.phone,
          status: newUser.status,
          customerId: newCustomer.id,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during registration. Please try again.',
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res): Promise<any> => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required.',
    });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const userRecords = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (userRecords.length === 0) {
      await logAudit({
        userEmail: normalizedEmail,
        action: 'FAILED_LOGIN',
        details: 'Attempt with non-existent email',
        ipAddress: req.ip || '127.0.0.1',
        result: 'FAILURE',
      });
      // Generic message to avoid email enumeration
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const user = userRecords[0];

    // Check account lockout
    if (user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
      const waitMinutes = Math.ceil(
        (new Date(user.lockoutUntil).getTime() - Date.now()) / (1000 * 60)
      );
      await logAudit({
        userId: user.id,
        userEmail: user.email,
        action: 'LOCKED_LOGIN_ATTEMPT',
        details: `Login attempted while locked out. Time remaining: ${waitMinutes} mins`,
        ipAddress: req.ip || '127.0.0.1',
        result: 'FAILURE',
      });
      return res.status(403).json({
        success: false,
        message: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${waitMinutes} minute(s).`,
      });
    }

    // Verify password
    const isPasswordMatch = await comparePassword(password, user.passwordHash);

    if (!isPasswordMatch) {
      const newAttempts = user.failedLoginAttempts + 1;
      let lockoutUntil: Date | null = null;

      // After 5 failed attempts, lock for 15 minutes
      if (newAttempts >= 5) {
        lockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
      }

      await db
        .update(users)
        .set({
          failedLoginAttempts: newAttempts,
          lockoutUntil,
        })
        .where(eq(users.id, user.id));

      await logAudit({
        userId: user.id,
        userEmail: user.email,
        action: 'FAILED_LOGIN',
        details: `Password mismatch. Failed attempt #${newAttempts}`,
        ipAddress: req.ip || '127.0.0.1',
        result: 'FAILURE',
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Check account status
    if (user.status !== 'ACTIVE') {
      await logAudit({
        userId: user.id,
        userEmail: user.email,
        action: 'INACTIVE_LOGIN_ATTEMPT',
        details: `Account status is ${user.status}`,
        ipAddress: req.ip || '127.0.0.1',
        result: 'FAILURE',
      });
      return res.status(403).json({
        success: false,
        message: `Your account is currently ${user.status.toLowerCase()}. Please contact system administration.`,
      });
    }

    // Reset failed login attempts on successful login
    await db
      .update(users)
      .set({
        failedLoginAttempts: 0,
        lockoutUntil: null,
      })
      .where(eq(users.id, user.id));

    // Audit log
    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'LOGIN',
      details: `Successful login as ${user.role}`,
      ipAddress: req.ip || '127.0.0.1',
      result: 'SUCCESS',
    });

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as any,
      name: user.name,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          status: user.status,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during login.',
    });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res): Promise<any> => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: 'Refresh token is required.',
    });
  }

  try {
    const payload = verifyToken(refreshToken);

    const userRecords = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId));

    if (userRecords.length === 0 || userRecords[0].status !== 'ACTIVE') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token or inactive account.',
      });
    }

    const user = userRecords[0];

    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role as any,
      name: user.name,
    });

    return res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token is expired or invalid. Please log in again.',
    });
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req: AuthenticatedRequest, res): Promise<any> => {
  if (req.user) {
    await logAudit({
      userId: req.user.userId,
      userEmail: req.user.email,
      action: 'LOGOUT',
      details: 'User logged out',
      ipAddress: req.ip || '127.0.0.1',
      result: 'SUCCESS',
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Logout successful.',
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res): Promise<any> => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  try {
    const userRecords = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, req.user.userId));

    if (userRecords.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = userRecords[0];

    return res.status(200).json({
      success: true,
      data: {
        user: {
          ...user,
          customerId: req.user.customerId,
          supplierId: req.user.supplierId,
          pharmacistId: req.user.pharmacistId,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch current user' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res): Promise<any> => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  try {
    const userList = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()));
    if (userList.length === 0) {
      // Don't leak whether email exists
      return res.status(200).json({
        success: true,
        message: 'If the email is registered, password reset instructions will be sent.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db
      .update(users)
      .set({
        resetToken,
        resetTokenExpiry: resetExpiry,
      })
      .where(eq(users.id, userList[0].id));

    await logAudit({
      userId: userList[0].id,
      userEmail: userList[0].email,
      action: 'PASSWORD_RESET_REQUESTED',
      details: 'Password reset token generated',
      ipAddress: req.ip || '127.0.0.1',
      result: 'SUCCESS',
    });

    return res.status(200).json({
      success: true,
      message: 'Password reset token generated successfully. In production this is sent via email.',
      data: {
        resetToken, // Provided in development for test flow
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Password reset request failed' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res): Promise<any> => {
  const { token, newPassword, confirmPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ success: false, message: 'Token and new password are required' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match' });
  }

  const strength = validatePasswordStrength(newPassword);
  if (!strength.isValid) {
    return res.status(400).json({ success: false, message: strength.message });
  }

  try {
    const userList = await db.select().from(users).where(eq(users.resetToken, token));
    if (userList.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset token' });
    }

    const user = userList[0];
    if (!user.resetTokenExpiry || new Date(user.resetTokenExpiry) < new Date()) {
      return res.status(400).json({ success: false, message: 'Reset token has expired' });
    }

    const newHash = await hashPassword(newPassword);

    await db
      .update(users)
      .set({
        passwordHash: newHash,
        resetToken: null,
        resetTokenExpiry: null,
        failedLoginAttempts: 0,
        lockoutUntil: null,
      })
      .where(eq(users.id, user.id));

    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'PASSWORD_RESET_COMPLETED',
      details: 'Password was successfully changed via reset token',
      ipAddress: req.ip || '127.0.0.1',
      result: 'SUCCESS',
    });

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
});

export default router;
