import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { documentService } from "@/lib/documents";
import { withErrors } from "@/lib/http/handler";

type Ctx = { params: Promise<{ id: string; versionId: string }> };

export const GET = withErrors<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id, versionId } = await params;
  return NextResponse.json(await documentService.getVersion(user.id, id, versionId));
});
