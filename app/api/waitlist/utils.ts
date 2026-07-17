// Pure helpers for the waitlist endpoint. No imports from non-pure modules so
// this stays unit-testable in isolation (same discipline as translate/utils.ts).

export const MAX_EMAIL_CHARS = 254;
export const MAX_CONTEXT_CHARS = 500;

// Shape-only email check: one @, a dot in the domain, no whitespace. Real
// deliverability is not our concern here — this just rejects obvious garbage.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(s: string): boolean {
  return typeof s === 'string' && s.length <= MAX_EMAIL_CHARS && EMAIL_RE.test(s);
}

export function normalizeEmail(s: string): string {
  return s.trim().toLowerCase();
}

export interface ParsedWaitlistBody {
  email: string;
  context: string | null;
  honeypotTripped: boolean;
}

// Tolerant parse: any missing/malformed field degrades to a sensible default
// rather than throwing. context is trimmed and hard-capped (truncated, not
// rejected); the honeypot trips when a bot fills the hidden `website` field.
export function parseWaitlistBody(body: unknown): ParsedWaitlistBody {
  const obj = (body && typeof body === 'object') ? (body as Record<string, unknown>) : {};

  const email = typeof obj.email === 'string' ? obj.email : '';

  let context: string | null = null;
  if (typeof obj.context === 'string') {
    const trimmed = obj.context.trim();
    if (trimmed.length > 0) context = trimmed.slice(0, MAX_CONTEXT_CHARS);
  }

  const honeypotTripped = typeof obj.website === 'string' && obj.website.length > 0;

  return { email, context, honeypotTripped };
}
