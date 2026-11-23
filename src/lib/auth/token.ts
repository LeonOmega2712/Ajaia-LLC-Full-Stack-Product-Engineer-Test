import { createHmac, timingSafeEqual } from "node:crypto";

/** Minimal signed token: "<userId>.<hmac>". Prevents trivially forging another user's cookie. */
export function signUserId(userId: string, secret: string): string {
  return `${userId}.${hmac(userId, secret)}`;
}

export function verifyToken(token: string | undefined, secret: string): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = token.slice(0, dot);
  const expected = Buffer.from(hmac(userId, secret));
  const actual = Buffer.from(token.slice(dot + 1));
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? userId : null;
}

function hmac(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}
