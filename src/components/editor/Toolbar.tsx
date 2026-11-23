"use client";

import { type Editor, useEditorState } from "@tiptap/react";

interface ToolbarButton {
  label: string;
  title: string;
  isActive: (e: Editor) => boolean;
  run: (e: Editor) => void;
  className?: string;
}

const chain = (e: Editor) => e.chain().focus();

/** Declarative button list: adding a format is one entry, not new JSX. */
const BUTTON_GROUPS: ToolbarButton[][] = [
  [
    { label: "P", title: "Normal text", isActive: (e) => e.isActive("paragraph"), run: (e) => chain(e).setParagraph().run() },
    ...([1, 2, 3] as const).map((level) => ({
      label: `H${level}`,
      title: `Heading ${level}`,
      isActive: (e: Editor) => e.isActive("heading", { level }),
      run: (e: Editor) => chain(e).toggleHeading({ level }).run(),
    })),
  ],
  [
    { label: "B", title: "Bold (Ctrl+B)", className: "font-bold", isActive: (e) => e.isActive("bold"), run: (e) => chain(e).toggleBold().run() },
    { label: "I", title: "Italic (Ctrl+I)", className: "italic", isActive: (e) => e.isActive("italic"), run: (e) => chain(e).toggleItalic().run() },
    { label: "U", title: "Underline (Ctrl+U)", className: "underline", isActive: (e) => e.isActive("underline"), run: (e) => chain(e).toggleUnderline().run() },
    { label: "S", title: "Strikethrough", className: "line-through", isActive: (e) => e.isActive("strike"), run: (e) => chain(e).toggleStrike().run() },
  ],
  [
    { label: "• List", title: "Bulleted list", isActive: (e) => e.isActive("bulletList"), run: (e) => chain(e).toggleBulletList().run() },
    { label: "1. List", title: "Numbered list", isActive: (e) => e.isActive("orderedList"), run: (e) => chain(e).toggleOrderedList().run() },
    { label: "❝", title: "Quote", isActive: (e) => e.isActive("blockquote"), run: (e) => chain(e).toggleBlockquote().run() },
  ],
  [
    { label: "↶", title: "Undo (Ctrl+Z)", isActive: () => false, run: (e) => chain(e).undo().run() },
    { label: "↷", title: "Redo (Ctrl+Shift+Z)", isActive: () => false, run: (e) => chain(e).redo().run() },
  ],
];

const ALL_BUTTONS = BUTTON_GROUPS.flat();

export function Toolbar({ editor }: { editor: Editor }) {
  // Re-render only when the active-state vector changes.
  const active = useEditorState({ editor, selector: ({ editor: e }) => ALL_BUTTONS.map((b) => b.isActive(e)) });

  let index = 0;
  return (
    <div className="sticky top-14 z-10 flex flex-wrap gap-1 rounded-t-lg border-b border-gray-200 bg-white px-2 py-1.5">
      {BUTTON_GROUPS.map((group, g) => (
        <div key={g} className="flex gap-1 border-r border-gray-200 pr-1 last:border-r-0">
          {group.map((b) => {
            const isActive = active[index++];
            return (
              <button
                key={b.title}
                type="button"
                title={b.title}
                aria-pressed={isActive}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => b.run(editor)}
                className={`min-w-8 rounded px-2 py-1 text-sm hover:bg-gray-100 ${isActive ? "bg-blue-100 text-blue-800" : ""} ${b.className ?? ""}`}
              >
                {b.label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
