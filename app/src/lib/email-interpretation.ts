import { readAppEnv } from "./env";

export interface NormalizedEmailMessage {
  providerMessageId: string;
  providerThreadId?: string;
  grantId: string;
  fromAddress?: string;
  fromName?: string;
  toAddresses: Array<{ email?: string; name?: string }>;
  subject?: string;
  snippet?: string;
  bodyText?: string;
  receivedAt?: Date;
  metadata: Record<string, unknown>;
}

export interface EmailExtraction {
  type: string;
  confidence: number;
  extractedJson: Record<string, unknown>;
  studentFacingSummary?: string;
}

interface EmailInterpretation {
  collegeRelated: boolean;
  classification: string;
  confidence: number;
  studentFacingSummary?: string;
  extractions: EmailExtraction[];
}

const collegeKeywords = [
  "admission",
  "admitted",
  "application",
  "college",
  "deadline",
  "deposit",
  "fafsa",
  "financial aid",
  "housing",
  "orientation",
  "scholarship",
  "student portal",
  "tuition",
  "university",
  "uvu",
];

export async function interpretEmail(message: NormalizedEmailMessage): Promise<EmailInterpretation> {
  const heuristic = heuristicInterpretation(message);
  const env = readAppEnv();
  if (!env.llmApiKey || !env.llmBaseUrl || !env.llmModel || !heuristic.collegeRelated) return heuristic;

  try {
    const response = await fetch(`${env.llmBaseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.llmApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.llmModel,
        messages: [
          {
            role: "system",
            content:
              "extract college-related student action items from email. return only compact json with keys collegeRelated, classification, confidence, studentFacingSummary, extractions. extractions is an array of {type, confidence, studentFacingSummary, extractedJson}.",
          },
          {
            role: "user",
            content: JSON.stringify({
              from: message.fromAddress,
              subject: message.subject,
              snippet: message.snippet,
              body: message.bodyText?.slice(0, 6000),
              receivedAt: message.receivedAt?.toISOString(),
            }),
          },
        ],
        max_completion_tokens: 500,
      }),
    });
    if (!response.ok) return heuristic;
    const parsed = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = parsed.choices?.[0]?.message?.content;
    const interpretation = content ? parseInterpretation(content) : undefined;
    return interpretation ?? heuristic;
  } catch {
    return heuristic;
  }
}

function heuristicInterpretation(message: NormalizedEmailMessage): EmailInterpretation {
  const haystack = [message.fromAddress, message.subject, message.snippet, message.bodyText]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
  const collegeRelated = collegeKeywords.some((keyword) => haystack.includes(keyword));
  if (!collegeRelated) {
    return {
      collegeRelated: false,
      classification: "not_college_related",
      confidence: 0.4,
      extractions: [],
    };
  }

  const classification = classifyFromText(haystack);
  const deadline = readDateishText(haystack);
  const studentFacingSummary = buildStudentSummary(message, classification, deadline);
  const extractedJson = {
    subject: message.subject,
    from: message.fromAddress,
    deadline,
    receivedAt: message.receivedAt?.toISOString(),
  };

  return {
    collegeRelated: true,
    classification,
    confidence: deadline ? 0.78 : 0.68,
    studentFacingSummary,
    extractions: [
      {
        type: classification,
        confidence: deadline ? 0.78 : 0.68,
        studentFacingSummary,
        extractedJson,
      },
    ],
  };
}

function classifyFromText(text: string): string {
  if (/\bscholarship|grant\b/.test(text)) return "scholarship";
  if (/\bfafsa|financial aid|tuition|aid offer\b/.test(text)) return "financial_aid";
  if (/\bhousing|deposit|orientation|enroll\b/.test(text)) return "enrollment";
  if (/\bdeadline|due|submit by|last day\b/.test(text)) return "deadline";
  if (/\badmitted|accepted|admission\b/.test(text)) return "admissions";
  return "college_update";
}

function buildStudentSummary(
  message: NormalizedEmailMessage,
  classification: string,
  deadline?: string,
): string {
  const subject = message.subject ? `"${message.subject}"` : "a college email";
  const dueText = deadline ? ` with a possible date: ${deadline}` : "";
  return `${subject} looks like ${classification.replaceAll("_", " ")}${dueText}.`;
}

function parseInterpretation(content: string): EmailInterpretation | undefined {
  const jsonText = content.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(jsonText) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
  const record = parsed as Record<string, unknown>;

  return {
    collegeRelated: record.collegeRelated === true,
    classification: readString(record.classification) ?? "college_update",
    confidence: clampConfidence(record.confidence),
    studentFacingSummary: readString(record.studentFacingSummary),
    extractions: Array.isArray(record.extractions)
      ? record.extractions.map(readExtraction).filter((entry): entry is EmailExtraction => Boolean(entry))
      : [],
  };
}

function readExtraction(value: unknown): EmailExtraction | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const type = readString(record.type);
  if (!type) return undefined;

  return {
    type,
    confidence: clampConfidence(record.confidence),
    studentFacingSummary: readString(record.studentFacingSummary),
    extractedJson:
      record.extractedJson && typeof record.extractedJson === "object" && !Array.isArray(record.extractedJson)
        ? (record.extractedJson as Record<string, unknown>)
        : {},
  };
}

function readDateishText(text: string): string | undefined {
  return (
    text.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:,\s*\d{4})?\b/i)?.[0] ??
    text.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/)?.[0] ??
    text.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0]
  );
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function clampConfidence(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0.7;
  return Math.min(Math.max(numeric, 0), 1);
}
