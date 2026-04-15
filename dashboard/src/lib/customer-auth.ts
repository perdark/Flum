import { cookies } from "next/headers";
import { getDb } from "@/db";
import { customers, customerSessions } from "@/db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import { generateSessionToken } from "@/utils/security";

export const CUSTOMER_SESSION_COOKIE = "customer_session";
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

export type StoreCustomer = {
  id: string;
  email: string;
  name: string;
  type: string;
  businessName: string | null;
};

export async function getStoreCustomer(): Promise<StoreCustomer | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = getDb();
  const rows = await db
    .select({
      id: customers.id,
      email: customers.email,
      name: customers.name,
      type: customers.type,
      businessName: customers.businessName,
    })
    .from(customerSessions)
    .innerJoin(customers, eq(customers.id, customerSessions.customerId))
    .where(
      and(
        eq(customerSessions.token, token),
        gt(customerSessions.expiresAt, new Date()),
        isNull(customers.deletedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function createCustomerSessionCookie(customerId: string) {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_MS);
  const db = getDb();
  await db.insert(customerSessions).values({
    customerId,
    token,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearCustomerSessionCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (token) {
    const db = getDb();
    await db.delete(customerSessions).where(eq(customerSessions.token, token));
  }
  cookieStore.delete(CUSTOMER_SESSION_COOKIE);
}
