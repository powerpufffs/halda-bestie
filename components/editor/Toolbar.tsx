"use client";

import type { Editor } from "@tiptap/react";

interface ToolbarProps {
  editor: Editor | null;
}

/** Icon button with active/pressed state. */
function ToolButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault() /* keep editor selection */}
      onClick={onClick}
      className={[
        "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-40",
        active ? "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/** Shared SVG wrapper (Lucide-style line icons). */
function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function Toolbar({ editor }: ToolbarProps) {
  const blockValue = editor?.isActive("heading", { level: 1 })
    ? "h1"
    : editor?.isActive("heading", { level: 2 })
      ? "h2"
      : "p";

  const setBlock = (v: string) => {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (v === "h1") chain.setHeading({ level: 1 }).run();
    else if (v === "h2") chain.setHeading({ level: 2 }).run();
    else chain.setParagraph().run();
  };

  return (
    <div className="sticky top-0 z-10 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/80 px-3 py-2 backdrop-blur">
      {/* Text style */}
      <select
        value={blockValue}
        disabled={!editor}
        onChange={(e) => setBlock(e.target.value)}
        className="h-9 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-sm text-slate-700 dark:text-slate-100 outline-none hover:bg-slate-50 dark:hover:bg-slate-700/50 focus:border-emerald-400 disabled:opacity-40"
        title="Text style"
      >
        <option value="p">Normal text</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
      </select>

      <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-700" />

      <ToolButton
        title="Bold (⌘B)"
        active={editor?.isActive("bold")}
        disabled={!editor}
        onClick={() => editor?.chain().focus().toggleBold().run()}
      >
        <Icon>
          <path d="M6 4h8a4 4 0 0 1 0 8H6z" />
          <path d="M6 12h9a4 4 0 0 1 0 8H6z" />
        </Icon>
      </ToolButton>

      <ToolButton
        title="Italic (⌘I)"
        active={editor?.isActive("italic")}
        disabled={!editor}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
      >
        <Icon>
          <line x1="19" y1="4" x2="10" y2="4" />
          <line x1="14" y1="20" x2="5" y2="20" />
          <line x1="15" y1="4" x2="9" y2="20" />
        </Icon>
      </ToolButton>

      <ToolButton
        title="Underline (⌘U)"
        active={editor?.isActive("underline")}
        disabled={!editor}
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
      >
        <Icon>
          <path d="M6 4v6a6 6 0 0 0 12 0V4" />
          <line x1="4" y1="20" x2="20" y2="20" />
        </Icon>
      </ToolButton>

      <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-700" />

      <ToolButton
        title="Bulleted list"
        active={editor?.isActive("bulletList")}
        disabled={!editor}
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
      >
        <Icon>
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <circle cx="3.5" cy="6" r="1" />
          <circle cx="3.5" cy="12" r="1" />
          <circle cx="3.5" cy="18" r="1" />
        </Icon>
      </ToolButton>

      <ToolButton
        title="Numbered list"
        active={editor?.isActive("orderedList")}
        disabled={!editor}
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
      >
        <Icon>
          <line x1="10" y1="6" x2="21" y2="6" />
          <line x1="10" y1="12" x2="21" y2="12" />
          <line x1="10" y1="18" x2="21" y2="18" />
          <path d="M4 6h1v4" />
          <path d="M4 10h2" />
          <path d="M6.5 16.5c0-.8-.7-1.2-1.5-1.2s-1.5.4-1.5 1.2M3.5 18.5h3" />
        </Icon>
      </ToolButton>
    </div>
  );
}

export default Toolbar;
