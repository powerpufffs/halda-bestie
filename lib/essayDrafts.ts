// A saved essay draft shown on the Essay Reviewer home page and edited in EssayEditor.

export interface EssayDraft {
  id: string;
  title: string;
  /** The prompt/question the essay is responding to (optional). */
  prompt: string;
  /** TipTap/ProseMirror HTML for the document body. */
  contentHtml: string;
  /** Cached word count so the home cards don't have to parse HTML. */
  words: number;
  /** Last analysis score (0–100), or null if never analyzed. */
  score: number | null;
  /** Source format chip, e.g. "pdf", "docx", "txt". Undefined for blank drafts. */
  format?: string;
  createdAt: number;
  updatedAt: number;
}

/** Lowercase file extension without the dot, or "" if none. */
export function fileExtension(filename: string): string {
  const m = /\.([^.]+)$/.exec(filename);
  return m ? m[1].toLowerCase() : "";
}

export const DRAFTS_STORAGE_KEY = "essaylab.drafts";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Convert an uploaded plain-text/markdown document into TipTap paragraph HTML. */
export function textToHtml(text: string): string {
  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  if (blocks.length === 0) return "<p></p>";
  return blocks.map((b) => `<p>${escapeHtml(b).replace(/\n/g, "<br>")}</p>`).join("");
}

/** Word count from draft HTML without needing the editor mounted. */
export function wordsFromHtml(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim();
  return text ? text.split(/\s+/).length : 0;
}
