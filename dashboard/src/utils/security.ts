/**
 * Security Utilities
 *
 * Provides password hashing, token generation, and input validation
 */

import { createHash, randomBytes, timingSafeEqual } from "crypto";

// ============================================================================
// PASSWORD HASHING (using built-in crypto for portability)
// ============================================================================

/**
 * Hash a password using SHA-256 with salt
 *
 * Note: In production, consider using bcrypt via npm package
 * This implementation uses crypto for zero dependencies
 */
const SALT_LENGTH = 32;
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH).toString("base64");
  const hash = createHash("sha256")
    .update(salt + password)
    .digest("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  const [salt, hash] = hashedPassword.split(":");
  if (!salt || !hash) return false;

  const computedHash = createHash("sha256")
    .update(salt + password)
    .digest("hex");

  // Use timing-safe comparison to prevent timing attacks
  return timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(computedHash)
  );
}

// ============================================================================
// TOKEN GENERATION
// ============================================================================

/**
 * Generate a cryptographically secure random token
 */
export function generateToken(length: number = 32): string {
  return randomBytes(length).toString("base64url");
}

/**
 * Generate a unique session token
 */
export function generateSessionToken(): string {
  return generateToken(48);
}

// ============================================================================
// INPUT VALIDATION
// ============================================================================

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .trim();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * Requirements: min 8 chars, at least one letter and one number
 */
export function isValidPassword(password: string): boolean {
  if (password.length < 8) return false;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasLetter && hasNumber;
}

/**
 * Validate UUID format
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// ============================================================================
// RATE LIMITING (in-memory for simplicity, use Redis in production)
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given identifier
 *
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute default
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Clean up expired entries
  if (entry && entry.resetAt < now) {
    rateLimitStore.delete(identifier);
  }

  const current = rateLimitStore.get(identifier);

  if (!current) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (current.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
    };
  }

  current.count++;
  return {
    allowed: true,
    remaining: maxRequests - current.count,
    resetAt: current.resetAt,
  };
}

/**
 * Clear rate limit for a specific identifier (for testing)
 */
export function clearRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

// ============================================================================
// SQL INJECTION PREVENTION
// ============================================================================

/**
 * Escape special characters for SQL (additional layer of defense)
 * Note: Drizzle ORM handles parameterized queries, this is extra safety
 */
export function escapeSqlString(str: string): string {
  return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
    switch (char) {
      case "\0":
        return "\\0";
      case "\x08":
        return "\\b";
      case "\x09":
        return "\\t";
      case "\x1a":
        return "\\z";
      case "\n":
        return "\\n";
      case "\r":
        return "\\r";
      case '"':
      case "'":
      case "\\":
      case "%":
        return "\\" + char;
      default:
        return char;
    }
  });
}

// ============================================================================
// CSRF TOKEN (for forms)
// ============================================================================()

export function generateCsrfToken(): string {
  return generateToken(32);
}

/**
 * Verify CSRF token (simple implementation)
 */
export function verifyCsrfToken(token: string, storedToken: string): boolean {
  return token === storedToken;
}
