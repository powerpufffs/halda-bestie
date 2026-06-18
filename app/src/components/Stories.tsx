"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useLocalStorage } from "@/lib/useLocalStorage";

export type StoryFriend = {
  name: string;
  avatar: string;
  /** Short caption shown in the full-screen viewer. */
  caption: string;
  /** Gradient classes for the viewer background. */
  bg: string;
  /** Big focal emoji for the viewer. */
  art: string;
};

type MyStory = { caption: string; art: string };

/** Preset "vibes" the user can pick when posting their own story. */
const VIBES = ["🔥", "📚", "😭", "🎉", "💀", "✨", "🫠", "🏆"];

/**
 * Instagram-style stories rail: the user's own bubble (add / view) followed by
 * friends' story bubbles with gradient rings (unviewed) that fade to grey once
 * opened. Tapping a bubble opens a full-screen viewer.
 */
export function Stories({ friends }: { friends: StoryFriend[] }) {
  const [myStory, setMyStory] = useLocalStorage<MyStory | null>("hb.story", null);
  const [viewed, setViewed] = useLocalStorage<string[]>("hb.viewed", []);

  const [composing, setComposing] = useState(false);
  const [viewing, setViewing] = useState<StoryFriend | MyStory | null>(null);

  // Composer state
  const [draftArt, setDraftArt] = useState("🔥");
  const [draftCaption, setDraftCaption] = useState("");

  function openFriend(f: StoryFriend) {
    setViewing(f);
    if (!viewed.includes(f.name)) setViewed([...viewed, f.name]);
  }

  function postStory() {
    setMyStory({ art: draftArt, caption: draftCaption.trim() || "my moment ✨" });
    setComposing(false);
    setDraftCaption("");
    setDraftArt("🔥");
  }

  const viewingName =
    viewing && "name" in viewing ? viewing.name : "Your story";
  const viewingBg =
    viewing && "bg" in viewing
      ? viewing.bg
      : "from-fuchsia-500 via-purple-600 to-amber-500";

  return (
    <>
      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {/* Your story bubble */}
        <button
          onClick={() => (myStory ? setViewing(myStory) : setComposing(true))}
          className="flex w-[68px] shrink-0 flex-col items-center gap-1 focus:outline-none"
        >
          <span className="relative">
            <span
              className={`flex h-16 w-16 items-center justify-center rounded-full p-[3px] ${
                myStory
                  ? "bg-gradient-to-tr from-fuchsia-500 via-amber-400 to-pink-500"
                  : "bg-slate-200 dark:bg-slate-700"
              }`}
            >
              <span className="flex h-full w-full items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-violet-100 to-fuchsia-100 text-2xl dark:border-slate-900 dark:from-violet-500/30 dark:to-fuchsia-500/30">
                {myStory ? myStory.art : "🌟"}
              </span>
            </span>
            {!myStory && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-fuchsia-600 text-white dark:border-slate-900">
                <Plus className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
            )}
          </span>
          <span className="w-full truncate text-center text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            {myStory ? "Your story" : "Add story"}
          </span>
        </button>

        {/* Friend story bubbles */}
        {friends.map((f) => {
          const seen = viewed.includes(f.name);
          return (
            <button
              key={f.name}
              onClick={() => openFriend(f)}
              className="flex w-[68px] shrink-0 flex-col items-center gap-1 focus:outline-none"
            >
              <span
                className={`flex h-16 w-16 items-center justify-center rounded-full p-[3px] ${
                  seen
                    ? "bg-slate-200 dark:bg-slate-700"
                    : "bg-gradient-to-tr from-fuchsia-500 via-amber-400 to-pink-500"
                }`}
              >
                <span className="flex h-full w-full items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-violet-100 to-fuchsia-100 text-2xl dark:border-slate-900 dark:from-violet-500/30 dark:to-fuchsia-500/30">
                  {f.avatar}
                </span>
              </span>
              <span className="w-full truncate text-center text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                {f.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Full-screen story viewer */}
      {viewing && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setViewing(null)}
        >
          <div
            className={`relative flex aspect-[9/16] w-full max-w-sm flex-col overflow-hidden rounded-3xl bg-gradient-to-br ${viewingBg} shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* progress bar */}
            <div className="absolute inset-x-3 top-3 h-1 overflow-hidden rounded-full bg-white/30">
              <div className="h-full w-full origin-left rounded-full bg-white" />
            </div>
            <div className="flex items-center gap-2 p-4 pt-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/25 text-lg backdrop-blur">
                {viewing && "avatar" in viewing ? viewing.avatar : "🌟"}
              </span>
              <span className="text-sm font-bold text-white drop-shadow">{viewingName}</span>
              <span className="text-xs font-medium text-white/70">· now</span>
              <button
                onClick={() => setViewing(null)}
                aria-label="Close story"
                className="ml-auto text-white/90"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-16 text-center">
              <span className="text-7xl drop-shadow-lg">{viewing.art}</span>
              <p className="text-xl font-black text-white drop-shadow">{viewing.caption}</p>
            </div>
          </div>
        </div>
      )}

      {/* Add-story composer */}
      {composing && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setComposing(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-slate-800 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Add to your story</h3>
              <button
                onClick={() => setComposing(false)}
                aria-label="Close"
                className="text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Live preview */}
            <div className="mb-4 flex aspect-[16/9] items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-fuchsia-500 via-purple-600 to-amber-500">
              <span className="text-5xl drop-shadow">{draftArt}</span>
              {draftCaption && (
                <span className="max-w-[55%] text-lg font-black text-white drop-shadow">
                  {draftCaption}
                </span>
              )}
            </div>

            {/* Vibe picker */}
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
              Pick a vibe
            </p>
            <div className="mb-4 flex flex-wrap gap-2">
              {VIBES.map((v) => (
                <button
                  key={v}
                  onClick={() => setDraftArt(v)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition ${
                    draftArt === v
                      ? "bg-fuchsia-100 ring-2 ring-fuchsia-500 dark:bg-fuchsia-500/20"
                      : "bg-slate-100 dark:bg-slate-700"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            <input
              value={draftCaption}
              onChange={(e) => setDraftCaption(e.target.value.slice(0, 40))}
              placeholder="What's the move? (optional)"
              className="mb-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-fuchsia-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />

            <button
              onClick={postStory}
              className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 to-purple-600 py-3 text-sm font-black text-white shadow-lg shadow-fuchsia-500/30 active:scale-[0.98]"
            >
              Share to story 🚀
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Stories;
