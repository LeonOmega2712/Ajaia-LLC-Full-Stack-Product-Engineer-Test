import TurndownService from "turndown";

/**
 * TipTap wraps every list item's text in <p>, which turndown renders as a "loose" list with
 * whitespace-only lines between items. Unwrapping single-paragraph items gives a tight list.
 */
const unwrapListParagraphs = (html: string) => html.replace(/<li><p>((?:(?!<\/?p[ >]).)*?)<\/p><\/li>/g, "<li>$1</li>");

/** Converts editor HTML to Markdown. Underline has no Markdown syntax, so it stays as inline <u>. */
export function htmlToMarkdown(html: string): string {
  const service = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", codeBlockStyle: "fenced", emDelimiter: "*" });
  service.addRule("listItem", {
    filter: "li",
    replacement: (content, node) => {
      const parent = node.parentNode as HTMLElement | null;
      const index = parent ? Array.prototype.indexOf.call(parent.children, node) : 0;
      const prefix = parent?.nodeName === "OL" ? `${Number(parent.getAttribute("start") ?? 1) + index}. ` : "- ";
      const body = content.replace(/^\n+/, "").replace(/\n+$/, "\n").replace(/\n(?=.)/g, `\n${" ".repeat(prefix.length)}`);
      return prefix + body + (node.nextSibling && !body.endsWith("\n") ? "\n" : "");
    },
  });
  service.addRule("strikethrough", {
    filter: ["s", "del"],
    replacement: (content) => `~~${content}~~`,
  });
  service.addRule("underline", {
    filter: ["u"],
    replacement: (content) => `<u>${content}</u>`,
  });
  return service.turndown(unwrapListParagraphs(html)).trim() + "\n";
}

/** Safe, readable file name derived from the document title. */
export function exportFileName(title: string, extension: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9-_ ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return `${base || "document"}.${extension}`;
}
