import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.ts';
import { auditLogs, users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET_KEY || 'pharmacy-secure-jwt-secret-key-2026-production-ready';
const ACCESS_TOKEN_EXPIRY = '30m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  userId: number;
  email: string;
  role: 'ADMIN' | 'PHARMACIST' | 'SUPPLIER' | 'CUSTOMER';
  name: string;
}

// Enforce: Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
export function validatePasswordStrength(password: string): { isValid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number.' };
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one special character (e.g. @, #, $, !).' };
  }
  return { isValid: true };
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export async function logAudit(params: {
  userId?: number | null;
  userEmail?: string | null;
  action: string;
  details?: string;
  ipAddress?: string;
  result?: 'SUCCESS' | 'FAILURE';
}) {
  try {
    await db.insert(auditLogs).values({
      userId: params.userId || null,
      userEmail: params.userEmail || null,
      action: params.action,
      details: params.details || null,
      ipAddress: params.ipAddress || '127.0.0.1',
      result: params.result || 'SUCCESS',
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
