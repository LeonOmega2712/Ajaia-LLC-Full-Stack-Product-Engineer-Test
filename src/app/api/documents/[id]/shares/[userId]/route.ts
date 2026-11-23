import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { documentService } from "@/lib/documents";
import { withErrors } from "@/lib/http/handler";

type Ctx = { params: Promise<{ id: string; userId: string }> };

export const DELETE = withErrors<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id, userId } = await params;
  const doc = await documentService.unshare(user.id, id, userId);
  return NextResponse.json({ shares: doc.shares });
});
