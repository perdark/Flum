/**
 * Customer Authentication Library
 *
 * Handles session management and user authentication for storefront customers
 */

import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { users, sessions } from "@/lib/db/schema";
import { eq, and, gt, or } from "drizzle-orm";
import {
  generateSessionToken,
  isValidEmail,
  isValidPassword,
  hashPassword,
  sanitizeInput,
} from "@/lib/utils/security";

// ============================================================================
// COOKIE CONFIGURATION
// ============================================================================

const SESSION_COOKIE_NAME = "customer_session";
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days for customers

// ============================================================================
// TYPES
// ============================================================================

export interface CustomerUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  avatar?: string | null;
  phoneNumber?: string | null;
}

export interface AuthError {
  code: string;
  message: string;
}

export interface AuthResult {
  success: boolean;
  user?: CustomerUser;
  error?: AuthError;
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

export async function createCustomerSession(userId: string): Promise<string> {
  const db = getDb();
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  await db.insert(sessions).values({
    userId,
    token,
    expiresAt,
  });

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

export async function getCustomerSession(): Promise<{
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
    return null;
  }

  return session[0];
}

export async function getCurrentCustomer(): Promise<CustomerUser | null> {
  const session = await getCustomerSession();

  if (!session) return null;

  const db = getDb();
  const user = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      name: users.name,
      avatar: users.avatar,
      phoneNumber: users.phoneNumber,
      isActive: users.isActive,
    })
    .from(users)
    .where(and(eq(users.id, session.userId), eq(users.isActive, true)))
    .limit(1);

  if (!user[0]) return null;

  return {
    id: user[0].id,
    email: user[0].email,
    firstName: user[0].firstName,
    lastName: user[0].lastName,
    name: user[0].name,
    avatar: user[0].avatar,
    phoneNumber: user[0].phoneNumber,
  };
}

export async function invalidateCustomerSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    const db = getDb();
    await db.delete(sessions).where(eq(sessions.token, token));
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

// ============================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================

export async function registerCustomer(
  email: string,
  password: string,
  firstName?: string,
  lastName?: string
): Promise<AuthResult> {
  // Validate input
  const sanitizedEmail = sanitizeInput(email.toLowerCase());
  if (!isValidEmail(sanitizedEmail)) {
    return {
      success: false,
      error: { code: "INVALID_EMAIL", message: "Invalid email format" },
    };
  }

  if (!isValidPassword(password)) {
    return {
      success: false,
      error: {
        code: "WEAK_PASSWORD",
        message: "Password must be at least 8 characters with letters and numbers",
      },
    };
  }

  const db = getDb();

  // Check if user already exists
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, sanitizedEmail))
    .limit(1);

  if (existing[0]) {
    return {
      success: false,
      error: { code: "EMAIL_EXISTS", message: "Email already registered" },
    };
  }

  // Hash password and create user
  const passwordHash = await hashPassword(password);

  const result = await db
    .insert(users)
    .values({
      email: sanitizedEmail,
      passwordHash,
      firstName: firstName ? sanitizeInput(firstName) : null,
      lastName: lastName ? sanitizeInput(lastName) : null,
      isActive: true,
    })
    .returning({ id: users.id, email: users.email });

  if (!result[0]) {
    return {
      success: false,
      error: { code: "REGISTRATION_FAILED", message: "Failed to create account" },
    };
  }

  // Create session
  await createCustomerSession(result[0].id);

  return {
    success: true,
    user: {
      id: result[0].id,
      email: result[0].email,
      firstName,
      lastName,
    },
  };
}

export async function loginCustomer(
  email: string,
  password: string
): Promise<AuthResult> {
  const sanitizedEmail = sanitizeInput(email.toLowerCase());

  if (!isValidEmail(sanitizedEmail)) {
    return {
      success: false,
      error: { code: "INVALID_EMAIL", message: "Invalid email format" },
    };
  }

  const db = getDb();
  const user = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      firstName: users.firstName,
      lastName: users.lastName,
      name: users.name,
      avatar: users.avatar,
      phoneNumber: users.phoneNumber,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.email, sanitizedEmail))
    .limit(1);

  if (!user[0]) {
    return {
      success: false,
      error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" },
    };
  }

  if (!user[0].isActive) {
    return {
      success: false,
      error: { code: "ACCOUNT_DISABLED", message: "Account has been disabled" },
    };
  }

  if (!user[0].passwordHash) {
    return {
      success: false,
      error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" },
    };
  }

  // Verify password
  const { verifyPassword } = await import("@/lib/utils/security");
  const isValid = await verifyPassword(password, user[0].passwordHash);

  if (!isValid) {
    return {
      success: false,
      error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" },
    };
  }

  // Update last login
  await db
    .update(users)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, user[0].id));

  // Create session
  await createCustomerSession(user[0].id);

  return {
    success: true,
    user: {
      id: user[0].id,
      email: user[0].email,
      firstName: user[0].firstName,
      lastName: user[0].lastName,
      name: user[0].name,
      avatar: user[0].avatar,
      phoneNumber: user[0].phoneNumber,
    },
  };
}

export async function logoutCustomer(): Promise<void> {
  await invalidateCustomerSession();
}

// ============================================================================
// HELPERS
// ============================================================================

export async function requireCustomer(): Promise<CustomerUser> {
  const user = await getCurrentCustomer();

  if (!user) {
    throw new Error("AUTHENTICATION_REQUIRED");
  }

  return user;
}
