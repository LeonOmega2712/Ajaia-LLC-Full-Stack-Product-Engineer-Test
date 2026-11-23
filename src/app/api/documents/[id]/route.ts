import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { documentService } from "@/lib/documents";
import { parseOrThrow, updateDocumentSchema } from "@/lib/documents/validation";
import { readJson, withErrors } from "@/lib/http/handler";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withErrors<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  return NextResponse.json(await documentService.get(user.id, (await params).id));
});

export const PATCH = withErrors<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const input = parseOrThrow(updateDocumentSchema, await readJson(req));
  const doc = await documentService.update(user.id, (await params).id, input);
  return NextResponse.json({ id: doc.id, title: doc.title, updatedAt: doc.updatedAt });
});

export const DELETE = withErrors<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  await documentService.delete(user.id, (await params).id);
  return new NextResponse(null, { status: 204 });
});
