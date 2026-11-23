import { describe, expect, it } from "vitest";
import { exportFileName, htmlToMarkdown } from "@/lib/export/markdown";
import { markdownToHtml } from "@/lib/import/fileImport";

describe("markdown export", () => {
  it("converts every toolbar format", () => {
    const md = htmlToMarkdown(
      "<h1>Title</h1><h2>Sub</h2><p><strong>b</strong> <em>i</em> <u>u</u> <s>s</s></p><ul><li><p>one</p></li></ul><ol><li><p>first</p></li></ol><blockquote><p>q</p></blockquote>",
    );
    expect(md).toContain("# Title");
    expect(md).toContain("## Sub");
    expect(md).toContain("**b** *i* <u>u</u> ~~s~~");
    expect(md).toMatch(/^-\s+one$/m);
    expect(md).toMatch(/^1\.\s+first$/m);
    expect(md).toContain("> q");
  });

  it("round-trips through the importer", () => {
    const html = markdownToHtml(htmlToMarkdown("<h2>Plan</h2><p><strong>Ship</strong> it</p>"));
    expect(html).toContain("<h2>Plan</h2>");
    expect(html).toContain("<strong>Ship</strong>");
  });

  it("builds safe file names", () => {
    expect(exportFileName("Reunión: Q4 / plan", "md")).toBe("Reunion-Q4-plan.md");
    expect(exportFileName("   ", "md")).toBe("document.md");
  });
});
