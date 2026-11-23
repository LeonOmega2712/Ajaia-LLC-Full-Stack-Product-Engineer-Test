import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { documentService } from "@/lib/documents";
import { parseOrThrow, shareSchema } from "@/lib/documents/validation";
import { readJson, withErrors } from "@/lib/http/handler";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withErrors<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { email, role } = parseOrThrow(shareSchema, await readJson(req));
  const doc = await documentService.share(user.id, (await params).id, email, role);
  return NextResponse.json({ shares: doc.shares });
});
