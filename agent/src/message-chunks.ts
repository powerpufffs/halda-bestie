const TARGET_CHARS = 150;
const MAX_CHARS = 220;

export function splitIntoTextBubbles(text: string): string[] {
  const normalized = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  const chunks = normalized.flatMap(splitParagraph);
  return chunks.length > 0 ? chunks : [text.trim()].filter(Boolean);
}

function splitParagraph(paragraph: string): string[] {
  if (paragraph.length <= MAX_CHARS) return [paragraph];

  const sentences = paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()) ?? [paragraph];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (!current) {
      current = sentence;
      continue;
    }

    const next = `${current} ${sentence}`;
    if (next.length > TARGET_CHARS) {
      chunks.push(...splitLongChunk(current));
      current = sentence;
    } else {
      current = next;
    }
  }

  if (current) chunks.push(...splitLongChunk(current));
  return chunks;
}

function splitLongChunk(chunk: string): string[] {
  if (chunk.length <= MAX_CHARS) return [chunk];

  const words = chunk.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > TARGET_CHARS && current) {
      chunks.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}
