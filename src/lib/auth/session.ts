import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { UnauthorizedError } from "@/lib/errors";
import type { UserSummary } from "@/lib/documents/types";
import { signUserId, verifyToken } from "./token";

const COOKIE = "ajaia_session";

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not configured.");
  return value;
}

export async function getCurrentUser(): Promise<UserSummary | null> {
  const store = await cookies();
  const userId = verifyToken(store.get(COOKIE)?.value, secret());
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true } });
}

/** For API routes: throws 401 when there is no session. */
export async function requireUser(): Promise<UserSummary> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

/** For pages: redirects to the login screen when there is no session. */
export async function requireUserOrRedirect(): Promise<UserSummary> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function startSession(userId: string): Promise<void> {
  (await cookies()).set(COOKIE, signUserId(userId, secret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
