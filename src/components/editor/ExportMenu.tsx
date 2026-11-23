"use client";

import type { Editor } from "@tiptap/react";
import { exportFileName, htmlToMarkdown } from "@/lib/export/markdown";

function download(fileName: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = Object.assign(document.createElement("a"), { href: url, download: fileName });
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Export actions available to anyone who can read the document.
 * Markdown is generated client-side from the live editor; PDF uses the browser's
 * print dialog with a print stylesheet (no extra dependency, selectable text).
 */
export function ExportMenu({ editor, title }: { editor: Editor | null; title: string }) {
  const buttonClass = "rounded border border-gray-300 bg-white px-2 py-1 text-sm hover:bg-gray-50 disabled:opacity-50";
  return (
    <div className="flex gap-2 print:hidden">
      <button
        className={buttonClass}
        disabled={!editor}
        onClick={() => editor && download(exportFileName(title, "md"), htmlToMarkdown(editor.getHTML()), "text/markdown;charset=utf-8")}
      >
        Export .md
      </button>
      <button className={buttonClass} disabled={!editor} onClick={() => window.print()} title="Opens the print dialog; choose 'Save as PDF'">
        Export PDF
      </button>
    </div>
  );
}
