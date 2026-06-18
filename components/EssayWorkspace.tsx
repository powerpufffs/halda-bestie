"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { uid } from "@/lib/applyTypes";
import { SAMPLE_ESSAY } from "@/lib/sampleEssay";
import {
  DRAFTS_STORAGE_KEY,
  fileExtension,
  textToHtml,
  wordsFromHtml,
  type EssayDraft,
} from "@/lib/essayDrafts";
import { EssayHome } from "@/components/EssayHome";
import EssayEditor from "@/components/EssayEditor";

/**
 * Owns the senior's saved essay drafts. Shows the drafts "home" page, or the
 * editor for whichever draft is open. Drafts persist to localStorage.
 */
export function EssayWorkspace() {
  const [drafts, setDrafts, loaded] = useLocalStorage<EssayDraft[]>(DRAFTS_STORAGE_KEY, []);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const seeded = useRef(false);

  // First ever run: seed the sample essay so the home page isn't empty.
  useEffect(() => {
    if (!loaded || seeded.current) return;
    seeded.current = true;
    if (drafts.length === 0) {
      const t = Date.now();
      setDrafts([
        {
          id: uid(),
          title: "My Common App Personal Statement",
          prompt: "",
          contentHtml: SAMPLE_ESSAY,
          words: wordsFromHtml(SAMPLE_ESSAY),
          score: null,
          createdAt: t,
          updatedAt: t,
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const updateDraft = useCallback(
    (id: string, patch: Partial<EssayDraft>) => {
      setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    },
    [setDrafts],
  );

  const handleSave = useCallback(
    (patch: Partial<EssayDraft>) => {
      if (activeId) updateDraft(activeId, patch);
    },
    [activeId, updateDraft],
  );

  const createDraft = useCallback(() => {
    const t = Date.now();
    const draft: EssayDraft = {
      id: uid(),
      title: "Untitled draft",
      prompt: "",
      contentHtml: "",
      words: 0,
      score: null,
      createdAt: t,
      updatedAt: t,
    };
    setDrafts((prev) => [draft, ...prev]);
    setActiveId(draft.id);
  }, [setDrafts]);

  // Create a draft from an uploaded document (pdf/docx/txt/md/…) and open it.
  // Text is extracted server-side so PDF and Word files come through cleanly.
  const createFromFile = useCallback(
    async (file: File) => {
      setUploadError(null);
      setUploading(true);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/extract-document", { method: "POST", body: form });
        const data: { text?: string; error?: string } = await res.json();
        if (!res.ok) throw new Error(data.error || "Couldn't read that file.");

        const html = textToHtml(data.text ?? "");
        const t = Date.now();
        const draft: EssayDraft = {
          id: uid(),
          title: file.name.replace(/\.[^.]+$/, "").trim() || "Untitled draft",
          prompt: "",
          contentHtml: html,
          words: wordsFromHtml(html),
          score: null,
          format: fileExtension(file.name) || undefined,
          createdAt: t,
          updatedAt: t,
        };
        setDrafts((prev) => [draft, ...prev]);
        setActiveId(draft.id);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [setDrafts],
  );

  const deleteDraft = useCallback(
    (id: string) => {
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      setActiveId((cur) => (cur === id ? null : cur));
    },
    [setDrafts],
  );

  // Avoid a flash of the empty state before localStorage is read.
  if (!loaded) return <div className="h-full bg-slate-50 dark:bg-slate-900" />;

  const active = activeId ? drafts.find((d) => d.id === activeId) ?? null : null;

  if (active) {
    return (
      <EssayEditor
        key={active.id}
        draft={active}
        onBack={() => setActiveId(null)}
        onSave={handleSave}
      />
    );
  }

  return (
    <EssayHome
      drafts={drafts}
      onOpen={setActiveId}
      onCreate={createDraft}
      onUpload={createFromFile}
      onDelete={deleteDraft}
      uploading={uploading}
      uploadError={uploadError}
      onDismissError={() => setUploadError(null)}
    />
  );
}

export default EssayWorkspace;
