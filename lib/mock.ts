// ── Front-end prototype mock layer ────────────────────────────────────────
// No auth, no backend. Canned translation/check responses are streamed with a
// fake delay + typewriter effect to mimic the real app's behavior.

export type ToneId = 'casual' | 'polite' | 'formal' | 'blunt';

export const TONES: { id: ToneId; kanji: string; label: string }[] = [
  { id: 'casual', kanji: '普通', label: 'CASUAL' },
  { id: 'polite', kanji: '丁寧', label: 'POLITE' },
  { id: 'formal', kanji: '正式', label: 'FORMAL' },
  { id: 'blunt', kanji: '直接', label: 'BLUNT' },
];

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  tone?: string;
  explanation?: string;
  kind?: 'translation' | 'check';
  timestamp: number;
  isStreaming?: boolean;
}

export const MOCK_USER = {
  name: 'Anthony Ta',
  email: 'anthony@example.com',
  initials: 'AT',
};

interface CannedResult {
  translation: string;
  explanation: string;
}

// A few canned translation pairs keyed loosely by detected language. The mock
// rotates through these so repeated sends feel varied without a real model.
const CANNED_TRANSLATIONS: CannedResult[] = [
  {
    translation: 'きゅうりは飲み物にするものじゃないね笑',
    explanation:
      'The casual ね softens the statement into a shared observation, and 笑 ("lol") keeps it playful rather than critical — a gentle, humorous pushback on an unconventional idea.',
  },
  {
    translation: 'サッカー見てる？日本、今ちょうどやってるよ',
    explanation:
      'Plain-form 見てる and the sentence-final よ make this sound like a quick message to a friend. Adding ちょうど ("right now / just now") makes the timing feel natural and conversational.',
  },
  {
    translation: '今夜って空いてたりする？',
    explanation:
      'The ～たりする softener turns a direct question into a light, low-pressure invitation — closer to "are you maybe free tonight?" than a blunt "are you free?".',
  },
];

const CANNED_CHECKS: { verdict: string; body: string }[] = [
  {
    verdict: '✓ Sounds natural',
    body: 'This reads as natural, casual Japanese. ずらせる？ is a normal way to ask if a meeting can be moved among colleagues you\'re comfortable with. For a more senior audience, you could soften it to 会議をずらすことは可能でしょうか？',
  },
  {
    verdict: '△ Slightly unnatural',
    body: 'The meaning comes across, but native speakers would more likely drop the explicit subject and rely on context. Consider trimming particles for a smoother, more spoken rhythm.',
  },
];

// Tone tweaks appended so the selected tone visibly affects output.
const TONE_SUFFIX: Record<ToneId, string> = {
  casual: '',
  polite: 'です',
  formal: '。何卒よろしくお願いいたします',
  blunt: '。',
};

let translateIndex = 0;
let checkIndex = 0;

export function getMockTranslation(input: string, tone: ToneId): CannedResult {
  const base = CANNED_TRANSLATIONS[translateIndex % CANNED_TRANSLATIONS.length];
  translateIndex += 1;
  const suffix = TONE_SUFFIX[tone];
  return {
    translation: suffix ? base.translation.replace(/[笑よ]?$/, '') + suffix : base.translation,
    explanation: base.explanation,
  };
}

export function getMockCheck(): { verdict: string; body: string } {
  const result = CANNED_CHECKS[checkIndex % CANNED_CHECKS.length];
  checkIndex += 1;
  return result;
}

// Seeded "today" history so the signed-in view has a populated thread on load.
export function buildSeedHistory(): ChatMessage[] {
  const now = Date.now();
  const min = 60 * 1000;
  const mk = (
    offset: number,
    role: 'user' | 'assistant',
    text: string,
    extra: Partial<ChatMessage> = {},
  ): ChatMessage => ({
    id: `seed_${offset}_${role}`,
    role,
    text,
    timestamp: now - offset,
    tone: 'casual',
    kind: 'translation',
    ...extra,
  });

  return [
    mk(48 * min, 'user', 'Cucumbers really should not be turned into drinks lol'),
    mk(48 * min - 1000, 'assistant', 'きゅうりは飲み物にするものじゃないね笑', {
      explanation:
        'The casual ね softens it into a shared observation and 笑 keeps the tone playful — a gentle, humorous take rather than real criticism.',
    }),
    mk(34 * min, 'user', 'do u watch soccer? japans playing right now'),
    mk(34 * min - 1000, 'assistant', 'サッカー見てる？日本、今ちょうどやってるよ', {
      explanation:
        'Plain-form 見てる with sentence-final よ makes it sound like a quick message to a friend.',
    }),
  ];
}
