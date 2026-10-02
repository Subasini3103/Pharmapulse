import { Router } from 'express';
import { db } from '../../db/index.ts';
import { users, auditLogs, customers, suppliers, pharmacists } from '../../db/schema.ts';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware.ts';
import { hashPassword, validatePasswordStrength, logAudit } from '../auth.ts';
import { eq, desc, ne } from 'drizzle-orm';

const router = Router();

// GET /api/admin/users (Admin only)
router.get('/users', requireAuth, requireRole(['ADMIN']), async (_req, res): Promise<any> => {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        status: users.status,
        failedLoginAttempts: users.failedLoginAttempts,
        lockoutUntil: users.lockoutUntil,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return res.status(200).json({ success: true, data: allUsers });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// POST /api/admin/users (Admin only - create user with specified role)
router.post('/users', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res): Promise<any> => {
  const { name, email, phone, role, password, confirmPassword } = req.body;

  if (!name || !email || !role || !password) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, role, and password are required.',
    });
  }

  const validRoles = ['ADMIN', 'PHARMACIST', 'SUPPLIER', 'CUSTOMER'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, message: `Role must be one of: ${validRoles.join(', ')}` });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match' });
  }

  const strength = validatePasswordStrength(password);
  if (!strength.isValid) {
    return res.status(400).json({ success: false, message: strength.message });
  }

  try {
    const existing = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase()));
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'A user with this email already exists.' });
    }

    const passwordHash = await hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : null,
        passwordHash,
        role,
        status: 'ACTIVE',
      })
      .returning();

    // Create role-specific linked record
    if (role === 'CUSTOMER') {
      await db.insert(customers).values({
        userId: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone || 'N/A',
      });
    } else if (role === 'SUPPLIER') {
      await db.insert(suppliers).values({
        userId: newUser.id,
        companyName: req.body.companyName || `${newUser.name} Supplies`,
        contactPerson: newUser.name,
        email: newUser.email,
        phone: newUser.phone || 'N/A',
        status: 'ACTIVE',
      });
    } else if (role === 'PHARMACIST') {
      await db.insert(pharmacists).values({
        userId: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        licenseNumber: req.body.licenseNumber || 'RPH-PENDING',
        qualification: req.body.qualification || 'Licensed Pharmacist',
      });
    }

    await logAudit({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      action: 'ADMIN_USER_CREATION',
      details: `Admin created user ${newUser.email} with role ${newUser.role}`,
      ipAddress: req.ip || '127.0.0.1',
      result: 'SUCCESS',
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create user' });
  }
});

// PUT /api/admin/users/:id/status (Admin only)
router.put('/users/:id/status', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res): Promise<any> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid user ID' });

  const { status } = req.body;
  const validStatuses = ['ACTIVE', 'INACTIVE', 'BLOCKED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  // Prevent admin from blocking themselves
  if (req.user?.userId === id && status !== 'ACTIVE') {
    return res.status(400).json({ success: false, message: 'You cannot deactivate or block your own admin account.' });
  }

  try {
    const [updated] = await db
      .update(users)
      .set({
        status,
        failedLoginAttempts: status === 'ACTIVE' ? 0 : undefined,
        lockoutUntil: status === 'ACTIVE' ? null : undefined,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    await logAudit({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      action: 'USER_STATUS_CHANGE',
      details: `Changed status of user ${updated.email} to ${status}`,
      ipAddress: req.ip || '127.0.0.1',
      result: 'SUCCESS',
    });

    return res.status(200).json({ success: true, message: `User status changed to ${status}`, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update user status' });
  }
});

// PUT /api/admin/users/:id/role (Admin only)
router.put('/users/:id/role', requireAuth, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res): Promise<any> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid user ID' });

  const { role } = req.body;
  const validRoles = ['ADMIN', 'PHARMACIST', 'SUPPLIER', 'CUSTOMER'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, message: `Role must be one of: ${validRoles.join(', ')}` });
  }

  try {
    const [updated] = await db
      .update(users)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    await logAudit({
      userId: req.user?.userId,
      userEmail: req.user?.email,
      action: 'USER_ROLE_CHANGE',
      details: `Changed role of user ${updated.email} to ${role}`,
      ipAddress: req.ip || '127.0.0.1',
      result: 'SUCCESS',
    });

    return res.status(200).json({ success: true, message: `User role changed to ${role}`, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update user role' });
  }
});

// GET /api/admin/audit-logs (Admin only)
router.get('/audit-logs', requireAuth, requireRole(['ADMIN']), async (req, res): Promise<any> => {
  const { limit, action } = req.query;

  try {
    const logs = await db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        userEmail: auditLogs.userEmail,
        action: auditLogs.action,
        details: auditLogs.details,
        ipAddress: auditLogs.ipAddress,
        result: auditLogs.result,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit ? parseInt(limit as string, 10) : 100);

    return res.status(200).json({ success: true, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
});

export default router;
