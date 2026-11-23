import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { documentService } from "@/lib/documents";
import { withErrors } from "@/lib/http/handler";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withErrors<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  return NextResponse.json({ versions: await documentService.listVersions(user.id, (await params).id) });
});
