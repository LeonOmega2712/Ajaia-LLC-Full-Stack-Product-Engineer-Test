import { describe, expect, it } from "vitest";
import { importFile, markdownToHtml, textToHtml } from "@/lib/import/fileImport";
import { ValidationError } from "@/lib/errors";

describe("file import", () => {
  it("converts plain text paragraphs and escapes HTML", () => {
    expect(textToHtml("Hello\nworld\n\n<b>x</b>")).toBe("<p>Hello<br>world</p><p>&lt;b&gt;x&lt;/b&gt;</p>");
  });

  it("converts markdown formatting to editor HTML", () => {
    const html = markdownToHtml("# Title\n\n**bold** and *it*\n\n- a\n- b");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>it</em>");
    expect(html).toContain("<li>a</li>");
  });

  it("escapes raw HTML inside markdown", () => {
    expect(markdownToHtml("<script>alert(1)</script>")).not.toContain("<script>");
  });

  it("derives the title from the filename", () => {
    expect(importFile("Meeting notes.md", "# hi", 4).title).toBe("Meeting notes");
  });

  it("rejects unsupported, empty, and oversized files", () => {
    expect(() => importFile("a.pdf", "x", 1)).toThrow(ValidationError);
    expect(() => importFile("a.txt", "   ", 3)).toThrow(/empty/);
    expect(() => importFile("a.txt", "x", 2_000_000)).toThrow(/too large/);
  });
});
