import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { documentService } from "@/lib/documents";
import { withErrors } from "@/lib/http/handler";

type Ctx = { params: Promise<{ id: string; versionId: string }> };

export const POST = withErrors<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id, versionId } = await params;
  const doc = await documentService.restoreVersion(user.id, id, versionId);
  return NextResponse.json({ title: doc.title, content: doc.content, version: doc.version });
});
