import type { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

export interface DocRange {
  from: number;
  to: number;
}

/** Convenience wrapper around findTextRangeInDoc for an Editor instance. */
export function findTextRange(editor: Editor, needle: string): DocRange | null {
  return findTextRangeInDoc(editor.state.doc, needle);
}

/**
 * Find the first occurrence of `needle` in a ProseMirror document and return its
 * positions. Whitespace is normalized so suggestions whose `original` text
 * differs only in spacing/newlines still match. Returns null if not found.
 * Works directly on a doc node so it can be called from inside a PM plugin.
 */
export function findTextRangeInDoc(
  doc: ProseMirrorNode,
  needle: string,
): DocRange | null {
  const target = normalize(needle);
  if (!target) return null;

  // Build a flat string of the doc while recording the PM position of each char.
  let flat = "";
  const positions: number[] = [];

  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      for (let i = 0; i < node.text.length; i++) {
        flat += node.text[i];
        positions.push(pos + i);
      }
    } else if (node.isBlock && flat.length > 0) {
      // Treat block boundaries as a single space so cross-paragraph matches work.
      flat += " ";
      positions.push(-1);
    }
    return true;
  });

  const normalizedFlat = normalizeKeepIndex(flat);
  const idx = normalizedFlat.text.indexOf(target);
  if (idx === -1) return null;

  const startFlat = normalizedFlat.map[idx];
  const endFlat = normalizedFlat.map[idx + target.length - 1];

  const from = positions[startFlat];
  const to = positions[endFlat];
  if (from == null || to == null || from < 0 || to < 0) return null;

  return { from, to: to + 1 };
}

function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Collapse whitespace but keep a map from each normalized-string index back to
 * the original index, so we can translate match offsets to PM positions.
 */
function normalizeKeepIndex(s: string): { text: string; map: number[] } {
  let text = "";
  const map: number[] = [];
  let prevSpace = false;

  for (let i = 0; i < s.length; i++) {
    const isSpace = /\s/.test(s[i]);
    if (isSpace) {
      if (!prevSpace && text.length > 0) {
        text += " ";
        map.push(i);
      }
      prevSpace = true;
    } else {
      text += s[i];
      map.push(i);
      prevSpace = false;
    }
  }
  // Trim a trailing collapsed space.
  if (text.endsWith(" ")) {
    text = text.slice(0, -1);
    map.pop();
  }
  return { text, map };
}
