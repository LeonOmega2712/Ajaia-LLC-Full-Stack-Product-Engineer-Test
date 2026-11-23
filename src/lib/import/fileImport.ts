import { marked } from "marked";
import { ValidationError } from "@/lib/errors";

export const SUPPORTED_EXTENSIONS = [".txt", ".md", ".markdown"] as const;
export const MAX_UPLOAD_BYTES = 1_000_000;

export interface ImportedDocument {
  title: string;
  html: string;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Plain text: blank lines separate paragraphs, single newlines become <br>. */
export function textToHtml(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Markdown with raw HTML escaped, so an uploaded file cannot inject markup. */
export function markdownToHtml(md: string): string {
  const renderer = new marked.Renderer();
  renderer.html = ({ text }) => escapeHtml(text);
  return marked.parse(md, { renderer, async: false, gfm: true }) as string;
}

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

export function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").trim();
  return (base || "Imported document").slice(0, 200);
}

export function importFile(filename: string, contents: string, sizeBytes: number): ImportedDocument {
  const ext = extensionOf(filename);
  if (!(SUPPORTED_EXTENSIONS as readonly string[]).includes(ext)) {
    throw new ValidationError(`Unsupported file type "${ext || "none"}". Upload a .txt or .md file.`);
  }
  if (sizeBytes > MAX_UPLOAD_BYTES) throw new ValidationError("File is too large (max 1 MB).");
  if (!contents.trim()) throw new ValidationError("The file is empty.");
  const html = ext === ".txt" ? textToHtml(contents) : markdownToHtml(contents);
  return { title: titleFromFilename(filename), html };
}
