import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface HighlightRange {
  from: number;
  to: number;
  /** Distinguishes styling for an AI suggestion vs. a focused comment. */
  variant?: "suggestion" | "comment";
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    activeHighlight: {
      /** Visually highlight a range without mutating the document. Pass null to clear. */
      setActiveHighlight: (range: HighlightRange | null) => ReturnType;
    };
  }
}

const activeHighlightKey = new PluginKey<DecorationSet>("activeHighlight");

/**
 * Paints a transient inline decoration over a range. Used when the user clicks
 * an AI suggestion (or a comment) so the relevant essay text lights up. Because
 * it's a decoration — not a mark — it never ends up in the saved document and
 * is trivial to clear.
 */
export const ActiveHighlight = Extension.create({
  name: "activeHighlight",

  addCommands() {
    return {
      setActiveHighlight:
        (range: HighlightRange | null) =>
        ({ tr, dispatch }) => {
          if (dispatch) dispatch(tr.setMeta(activeHighlightKey, range));
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: activeHighlightKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, old) {
            const meta = tr.getMeta(activeHighlightKey) as
              | HighlightRange
              | null
              | undefined;

            if (meta === undefined) {
              // No change requested — just map existing decorations through edits.
              return old.map(tr.mapping, tr.doc);
            }
            if (meta === null) return DecorationSet.empty;

            const cls =
              meta.variant === "comment"
                ? "active-comment-range"
                : "active-suggestion-range";
            return DecorationSet.create(tr.doc, [
              Decoration.inline(meta.from, meta.to, { class: cls }),
            ]);
          },
        },
        props: {
          decorations(state) {
            return activeHighlightKey.getState(state);
          },
        },
      }),
    ];
  },
});

export default ActiveHighlight;
