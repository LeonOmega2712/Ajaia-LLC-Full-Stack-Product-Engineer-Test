import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { withErrors } from "@/lib/http/handler";
import { presenceService } from "@/lib/presence";

type Ctx = { params: Promise<{ id: string }> };

/** Heartbeat: marks the caller as viewing the document and returns who is viewing it now. */
export const POST = withErrors<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const viewers = await presenceService.heartbeat(user.id, (await params).id);
  return NextResponse.json({ viewers: viewers.map(({ id, name, email, isYou }) => ({ id, name, email, isYou })) });
});
