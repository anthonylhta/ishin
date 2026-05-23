import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const MAX_INPUT_CHARS = 2000;

// Simple in-memory fixed-window rate limit. Anonymous /api/translate is open to
// guests, so this caps how fast a single IP can spend tokens. Note: per warm
// serverless instance — it resets on cold start and isn't shared across
// instances. For stronger guarantees, back it with Upstash Redis / a DB.
const RATE_LIMIT = 15; // requests
const RATE_WINDOW_MS = 60_000; // per minute
const hits = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

function isRateLimited(ip: string): boolean {
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

const TONES: Record<string, string> = {
  casual: 'casual (普通): how friends actually talk and text — plain form, contractions, slang, and sentence-final particles. Never textbook-stiff.',
  polite: 'polite (丁寧): です／ます form. The everyday-polite default with strangers and colleagues.',
  formal: 'formal (正式): keigo — honorific and humble forms (尊敬語・謙譲語, ございます). Business, ceremonial, or deferential contexts.',
  blunt: 'blunt (直接): terse and direct — abrupt plain forms or imperatives. Reads as curt or commanding.',
};

const TRANSLATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    detectedSourceLang: { type: 'string', enum: ['en', 'ja'] },
    targetLang: { type: 'string', enum: ['en', 'ja'] },
    translation: { type: 'string' },
    explanation: { type: 'string' },
  },
  required: ['detectedSourceLang', 'targetLang', 'translation', 'explanation'],
};

function buildSystemPrompt(tone: string): string {
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

Then write a one-sentence explanation IN ENGLISH of any notable nuance, slang, or politeness markers (skip the obvious).`;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      console.error('CLAUDE_API_KEY is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (isRateLimited(getClientIp(request))) {
      return NextResponse.json(
        { error: 'Too many requests — please wait a moment and try again.' },
        { status: 429 }
      );
    }

    const { text, selectedTone } = await request.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    if (text.length > MAX_INPUT_CHARS) {
      return NextResponse.json(
        { error: `Text too long (max ${MAX_INPUT_CHARS} characters)` },
        { status: 400 }
      );
    }
    if (!selectedTone || !(selectedTone in TONES)) {
      return NextResponse.json({ error: 'Invalid tone' }, { status: 400 });
    }

    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      temperature: 0.5,
      system: buildSystemPrompt(selectedTone),
      output_config: {
        format: { type: 'json_schema', schema: TRANSLATION_SCHEMA },
      },
      messages: [
        {
          role: 'user',
          content: `Translate into the "${selectedTone}" register:\n\n"""${text}"""`,
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return NextResponse.json({ error: 'Unable to translate this text' }, { status: 422 });
    }
    if (response.stop_reason === 'max_tokens') {
      return NextResponse.json({ error: 'Input too long to translate' }, { status: 422 });
    }

    const block = response.content[0];
    if (block?.type !== 'text') {
      console.error('Unexpected content block type:', block?.type);
      return NextResponse.json({ error: 'Invalid response from Claude' }, { status: 500 });
    }

    // Structured outputs guarantees schema-valid JSON — no markdown to strip.
    const parsed = JSON.parse(block.text);

    return NextResponse.json({
      inputText: text,
      detectedSourceLang: parsed.detectedSourceLang,
      targetLang: parsed.targetLang,
      variants: [
        {
          tone: selectedTone,
          translation: parsed.translation,
          explanation: parsed.explanation,
        },
      ],
    });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json({ error: 'Failed to translate' }, { status: 500 });
  }
}
