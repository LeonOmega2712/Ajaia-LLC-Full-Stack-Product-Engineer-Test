import { NextResponse } from "next/server";
import { z } from "zod";
import { startSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { parseOrThrow } from "@/lib/documents/validation";
import { ValidationError } from "@/lib/errors";
import { readJson, withErrors } from "@/lib/http/handler";

const loginSchema = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email address.") });

/** Mock login: any seeded account can sign in by email, no password. */
export const POST = withErrors(async (req) => {
  const { email } = parseOrThrow(loginSchema, await readJson(req));
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new ValidationError("Unknown account. Use one of the demo users listed below.");
  await startSession(user.id);
  return NextResponse.json({ ok: true });
});
