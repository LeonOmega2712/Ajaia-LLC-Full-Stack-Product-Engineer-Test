import { NextResponse } from "next/server";
import { endSession } from "@/lib/auth/session";
import { withErrors } from "@/lib/http/handler";

export const POST = withErrors(async () => {
  await endSession();
  return NextResponse.json({ ok: true });
});
