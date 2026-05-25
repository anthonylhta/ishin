export const MAX_INPUT_CHARS = 2000;
export const RATE_LIMIT = 15;
export const RATE_WINDOW_MS = 60_000;

export const TONES: Record<string, string> = {
  casual: 'casual (普通): how friends actually talk and text — plain form, contractions, slang, and sentence-final particles. Never textbook-stiff.',
  polite: 'polite (丁寧): です／ます form. The everyday-polite default with strangers and colleagues.',
  formal: 'formal (正式): keigo — honorific and humble forms (尊敬語・謙譲語, ございます). Business, ceremonial, or deferential contexts.',
  blunt: 'blunt (直接): terse and direct — abrupt plain forms or imperatives. Reads as curt or commanding.',
};

export const hits = new Map<string, { count: number; resetAt: number }>();

export function getClientIp(headers: { get(name: string): string | null }): string {
  const vercelIp = headers.get('x-vercel-forwarded-for');
  if (vercelIp) return vercelIp.split(',')[0].trim();
  return headers.get('x-real-ip') ?? 'unknown';
}

export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  if (hits.size > 5000) {
    for (const [key, value] of hits) {
      if (now > value.resetAt) hits.delete(key);
    }
  }
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count += 1;
  return false;
}

export function buildSystemPrompt(tone: string): string {
  return `You are a native-level Japanese ⇄ English translator. Your output must sound like a real native speaker actually wrote it — natural, idiomatic, and never literal or robotic.

Direction (strict): English input → Japanese. Japanese input → English. For mixed input, translate into the language opposite the dominant one.

Translate into the "${tone}" register:
${TONES[tone]}

Naturalness comes first:
- Translate the meaning and the vibe, not the words. Rephrase freely so it reads the way a native would genuinely say it.
- Match the source's tone, emotion, and emphasis — keep it light if it's light, dry if it's dry.
- Casual especially: use real spoken/texting language — contractions, natural slang, dropped subjects, and sentence-final particles (ね／よ／じゃん／っしょ). Render net-slang and abbreviations idiomatically (e.g. 草 → "lol", りょ → "got it"), never literally.
- Preserve emoji and kaomoji and the feeling they carry. Keep proper nouns and numbers intact.
- Output only the message itself — no quotes, notes, or alternatives inside the translation.

Output format — follow exactly:
1. The translated text only. No labels, quotes, or surrounding text.
2. On its own line: [[EXPLANATION]]
3. One sentence IN ENGLISH about notable nuance, slang, or politeness markers (skip the obvious).`;
}

export function validateTranslationInput(
  text: unknown,
  selectedTone: unknown
): { error: string; status: number } | null {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return { error: 'Text is required', status: 400 };
  }
  if (text.length > MAX_INPUT_CHARS) {
    return { error: `Text too long (max ${MAX_INPUT_CHARS} characters)`, status: 400 };
  }
  if (!selectedTone || typeof selectedTone !== 'string' || !(selectedTone in TONES)) {
    return { error: 'Invalid tone', status: 400 };
  }
  return null;
}
