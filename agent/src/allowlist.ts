const DM_SPACE_ID_PATTERN = /^any;-;(.+)$/;

export function parseAllowedSenders(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map(normalizeSenderId)
      .filter(Boolean),
  );
}

export function resolveSenderId(
  rawSenderId: string | undefined,
  spaceId: string,
): string | undefined {
  const trimmedSender = rawSenderId?.trim();
  if (trimmedSender) {
    return normalizeSenderId(trimmedSender);
  }

  const dmMatch = DM_SPACE_ID_PATTERN.exec(spaceId);
  const fromSpace = dmMatch?.[1]?.trim();
  return fromSpace ? normalizeSenderId(fromSpace) : undefined;
}

function normalizeSenderId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes("@")) return trimmed.toLowerCase();

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length >= 11) return `+${digits}`;
  return trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
}
