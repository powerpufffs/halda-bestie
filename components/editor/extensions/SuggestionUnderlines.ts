import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { findTextRangeInDoc } from "@/lib/findText";

/** One underlined span: the text to match and which color to use. */
export interface UnderlineItem {
  id: string;
  original: string;
  /** "grammar" → green wavy underline · "content" → yellow wavy underline. */
  variant: "grammar" | "content";
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    suggestionUnderlines: {
      /** Replace the full set of suggestion underlines shown in the editor. */
      setSuggestionUnderlines: (items: UnderlineItem[]) => ReturnType;
    };
  }
}

const key = new PluginKey<UnderlineItem[]>("suggestionUnderlines");

/**
 * Paints a persistent Grammarly-style wavy underline beneath every pending
 * suggestion, color-coded by category. The matched range is recomputed from the
 * live document on each update, so underlines track the text as the student
 * edits and disappear when a suggestion is accepted/rejected (removed from the
 * list). Decorations never touch the saved document.
 */
export const SuggestionUnderlines = Extension.create({
  name: "suggestionUnderlines",

  addCommands() {
    return {
      setSuggestionUnderlines:
        (items: UnderlineItem[]) =>
        ({ tr, dispatch }) => {
          if (dispatch) dispatch(tr.setMeta(key, items));
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<UnderlineItem[]>({
        key,
        state: {
          init: () => [],
          apply(tr, old) {
            const meta = tr.getMeta(key) as UnderlineItem[] | undefined;
            return meta ?? old;
          },
        },
        props: {
          decorations(state) {
            const items = key.getState(state);
            if (!items || items.length === 0) return DecorationSet.empty;

            const decos: Decoration[] = [];
            for (const item of items) {
              const range = findTextRangeInDoc(state.doc, item.original);
              if (!range) continue;
              const cls =
                item.variant === "grammar"
                  ? "suggestion-underline-grammar"
                  : "suggestion-underline-content";
              decos.push(
                Decoration.inline(range.from, range.to, {
                  class: cls,
                  // Lets the editor resolve which suggestion a tap landed on
                  // (used to open the mobile floating island).
                  "data-sug-id": item.id,
                }),
              );
            }
            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },
});

export default SuggestionUnderlines;
