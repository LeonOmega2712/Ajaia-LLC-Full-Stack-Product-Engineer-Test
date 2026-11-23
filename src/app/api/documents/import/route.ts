import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { documentService } from "@/lib/documents";
import { ValidationError } from "@/lib/errors";
import { withErrors } from "@/lib/http/handler";
import { importFile } from "@/lib/import/fileImport";

/** Creates a new document from an uploaded .txt or .md file. */
export const POST = withErrors(async (req) => {
  const user = await requireUser();
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new ValidationError("Choose a file to upload.");
  const { title, html } = importFile(file.name, await file.text(), file.size);
  return NextResponse.json(await documentService.create(user.id, { title, content: html }), { status: 201 });
});
