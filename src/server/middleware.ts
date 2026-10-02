import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload, logAudit } from './auth.ts';
import { db } from '../db/index.ts';
import { users, customers, suppliers, pharmacists } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload & {
    dbId: number;
    status: string;
    customerId?: number;
    supplierId?: number;
    pharmacistId?: number;
  };
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Missing or malformed authorization token',
    });
  }

  const token = authHeader.split('Bearer ')[1].trim();

  try {
    const payload = verifyToken(token);

    // Fetch user from DB to verify user exists and account is ACTIVE
    const userRecords = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId));

    if (userRecords.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User account no longer exists',
      });
    }

    const user = userRecords[0];

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: `Forbidden: User account is ${user.status}. Please contact the administrator.`,
      });
    }

    // Attach role-linked IDs
    let customerId: number | undefined;
    let supplierId: number | undefined;
    let pharmacistId: number | undefined;

    if (user.role === 'CUSTOMER') {
      const c = await db
        .select()
        .from(customers)
        .where(eq(customers.userId, user.id));
      if (c.length > 0) customerId = c[0].id;
    } else if (user.role === 'SUPPLIER') {
      const s = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.userId, user.id));
      if (s.length > 0) supplierId = s[0].id;
    } else if (user.role === 'PHARMACIST') {
      const p = await db
        .select()
        .from(pharmacists)
        .where(eq(pharmacists.userId, user.id));
      if (p.length > 0) pharmacistId = p[0].id;
    }

    req.user = {
      ...payload,
      dbId: user.id,
      status: user.status,
      customerId,
      supplierId,
      pharmacistId,
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Token expired. Please log in again or refresh token.',
        isExpired: true,
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid token',
    });
  }
};

export const requireRole = (allowedRoles: Array<'ADMIN' | 'PHARMACIST' | 'SUPPLIER' | 'CUSTOMER'>) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logAudit({
        userId: req.user.userId,
        userEmail: req.user.email,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        details: `Role ${req.user.role} attempted to access protected resource requiring: ${allowedRoles.join(', ')}`,
        ipAddress: req.ip || '127.0.0.1',
        result: 'FAILURE',
      });

      return res.status(403).json({
        success: false,
        message: `403 Forbidden: You do not have permission to perform this action. Required role(s): ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};
