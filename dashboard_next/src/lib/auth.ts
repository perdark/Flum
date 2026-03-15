/**
 * Authentication & Authorization Library
 *
 * Handles session management, RBAC permissions, and user authentication
 */

import { cookies } from "next/headers";
import { getDb } from "@/db";
import { users, sessions } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import type { UserRole, Permission, UserWithPermissions } from "@/types";
import { ROLE_PERMISSIONS } from "@/types";
import { generateSessionToken, isValidUuid } from "@/utils/security";

// ============================================================================
// COOKIE CONFIGURATION
// ============================================================================()

const SESSION_COOKIE_NAME = "session_token";
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================()

export async function createSession(userId: string): Promise<string> {
  const db = getDb();
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  await db.insert(sessions).values({
    userId,
    token,
    expiresAt,
  });

  // Set cookie in nextjs
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return token;
}

/**
 * Get current session from cookie
 */
export async function getSession(): Promise<{
  userId: string;
  token: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  const db = getDb();
  const session = await db
    .select({
      userId: sessions.userId,
      token: sessions.token,
    })
    .from(sessions)
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (!session[0]) {
    // Invalid or expired session
    return null;
  }

  return session[0];
}

/**
 * Get current authenticated user with permissions
 */
export async function getCurrentUser(): Promise<UserWithPermissions | null> {
  const session = await getSession();

  if (!session) return null;

  const db = getDb();
  const user = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(and(eq(users.id, session.userId), eq(users.isActive, true)))
    .limit(1);

  if (!user[0]) return null;

  const userData = user[0];

  // Validate user has required role, otherwise return null
  if (!userData.role || userData.role !== 'admin' && userData.role !== 'staff') {
    return null;
  }

  return {
    id: userData.id,
    email: userData.email,
    name: userData.name || userData.email.split('@')[0],
    role: userData.role as UserRole,
    isActive: userData.isActive,
  };
}

/**
 * Invalidate current session (logout)
 */
export async function invalidateSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const db = getDb();
    await db.delete(sessions).where(eq(sessions.token, token));
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Invalidate all sessions for a user
 */
export async function invalidateAllUserSessions(userId: string): Promise<void> {
  const db = getDb();
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

// ============================================================================
// AUTHORIZATION / RBAC
// ============================================================================()

export function hasPermission(
  user: UserWithPermissions | null,
  permission: Permission
): boolean {
  if (!user) return false;
  if (!user.isActive) return false;

  const permissions = ROLE_PERMISSIONS[user.role];
  return permissions.includes(permission);
}

/**
 * Check if user has specific role
 */
export function hasRole(
  user: UserWithPermissions | null,
  role: UserRole
): boolean {
  if (!user) return false;
  return user.role === role;
}

/**
 * Require authentication - throw if not authenticated
 */
export async function requireAuth(): Promise<UserWithPermissions> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  return user;
}

/**
 * Require specific permission - throw if not authorized
 */
export async function requirePermission(
  permission: Permission
): Promise<UserWithPermissions> {
  const user = await requireAuth();

  if (!hasPermission(user, permission)) {
    throw new Error("FORBIDDEN");
  }

  return user;
}

/**
 * Require admin role - throw if not admin
 */
export async function requireAdmin(): Promise<UserWithPermissions> {
  const user = await requireAuth();

  if (user.role !== "admin") {
    throw new Error("FORBIDDEN");
  }

  return user;
}

// ============================================================================
// AUTHENTICATION HELPERS
// ============================================================================()

/**
 * Verify user credentials
 */
export async function verifyCredentials(
  email: string,
  password: string
): Promise<UserWithPermissions | null> {
  const { verifyPassword } = await import("@/utils/security");

  const db = getDb();
  const user = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user[0]) return null;
  if (!user[0].isActive) return null;
  if (!user[0].passwordHash) return null;
  if (!user[0].role || user[0].role !== 'admin' && user[0].role !== 'staff') return null;

  const isValid = await verifyPassword(password, user[0].passwordHash);
  if (!isValid) return null;

  // Update last login
  await db
    .update(users)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, user[0].id));

  return {
    id: user[0].id,
    email: user[0].email,
    name: user[0].name || user[0].email.split('@')[0],
    role: user[0].role as UserRole,
    isActive: user[0].isActive,
  };
}

/**
 * Check if a session token is valid
 */
export async function validateSessionToken(token: string): Promise<boolean> {
  if (!token || !isValidUuid(token)) return false;

  const db = getDb();
  const session = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return !!session[0];
}
