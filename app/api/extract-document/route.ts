import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * POST /api/extract-document — pull plain text out of an uploaded document.
 * Accepts multipart/form-data with a `file` field. Supports PDF and Word
 * (.docx) via parsers; everything else is read as UTF-8 text (.txt, .md, …).
 */
export async function POST(req: NextRequest) {
  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    let text = "";

    if (name.endsWith(".pdf") || file.type === "application/pdf") {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        // Strip pdf-parse's "-- N of M --" page-break markers.
        text = (result.text ?? "").replace(/\n*--\s*\d+\s+of\s+\d+\s*--\n*/g, "\n\n");
      } finally {
        await parser.destroy();
      }
    } else if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value ?? "";
    } else if (name.endsWith(".doc")) {
      // Legacy binary .doc isn't reliably parseable here.
      return NextResponse.json(
        { error: "Legacy .doc files aren't supported — please save as .docx or PDF." },
        { status: 415 },
      );
    } else {
      // .txt, .md, .markdown, .rtf, and anything else: treat as text.
      text = buffer.toString("utf-8");
    }

    return NextResponse.json({ text: text.trim() });
  } catch (err) {
    console.error("[extract-document] failed:", err);
    return NextResponse.json(
      { error: "Couldn't read that file. It may be scanned, encrypted, or corrupted." },
      { status: 422 },
    );
  }
}
