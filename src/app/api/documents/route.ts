import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { documentService } from "@/lib/documents";
import { createDocumentSchema, parseOrThrow } from "@/lib/documents/validation";
import { readJson, withErrors } from "@/lib/http/handler";

export const GET = withErrors(async () => {
  const user = await requireUser();
  return NextResponse.json(await documentService.list(user.id));
});

export const POST = withErrors(async (req) => {
  const user = await requireUser();
  const input = parseOrThrow(createDocumentSchema, await readJson(req));
  return NextResponse.json(await documentService.create(user.id, input), { status: 201 });
});
