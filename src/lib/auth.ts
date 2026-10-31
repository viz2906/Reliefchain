// ============================================================================
// ReliefChain: JWT Authentication & Role-Based Access Control (RBAC)
// File: src/lib/auth.ts
// ============================================================================

import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'reliefchain_super_secure_jwt_token_2026_pes_univ';

export type UserRole = 'ADMIN' | 'LOGISTICS_STAFF' | 'FIRST_RESPONDER';

export interface UserSession {
  userId: number;
  email: string;
  fullName: string;
  role: UserRole;
  zoneId?: number;
}

export function signToken(user: UserSession): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): UserSession | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserSession;
  } catch {
    return null;
  }
}

export function getUserFromRequest(req: NextRequest): UserSession | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

// Role-based authorization checker
export function hasPermission(role: UserRole, requiredRoles: UserRole[]): boolean {
  if (role === 'ADMIN') return true; // Superuser access
  return requiredRoles.includes(role);
}
