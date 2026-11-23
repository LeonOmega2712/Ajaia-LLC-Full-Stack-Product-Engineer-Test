import { z } from "zod";
import { ValidationError } from "@/lib/errors";

export const TITLE_MAX = 200;
export const CONTENT_MAX_BYTES = 1_000_000;

export const titleSchema = z
  .string()
  .trim()
  .min(1, "Title cannot be empty.")
  .max(TITLE_MAX, `Title must be at most ${TITLE_MAX} characters.`);

export const contentSchema = z
  .string()
  .refine((s) => Buffer.byteLength(s, "utf8") <= CONTENT_MAX_BYTES, "Document is too large (max 1 MB).");

export const createDocumentSchema = z.object({ title: titleSchema.optional(), content: contentSchema.optional() });

export const updateDocumentSchema = z
  .object({ title: titleSchema.optional(), content: contentSchema.optional() })
  .refine((v) => v.title !== undefined || v.content !== undefined, "Nothing to update.");

export const shareSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  role: z.enum(["VIEWER", "EDITOR"]).default("EDITOR"),
});

/** Parses input with a schema and converts failures to a single ValidationError. */
export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new ValidationError(result.error.issues[0]?.message ?? "Invalid input.");
  return result.data;
}
