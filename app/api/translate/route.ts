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
  // x-vercel-forwarded-for is set by Vercel infrastructure and cannot be forged by clients.
  // x-forwarded-for is skipped — its leftmost entry is client-controlled and spoofable.
  const vercelIp = request.headers.get('x-vercel-forwarded-for');
  if (vercelIp) return vercelIp.split(',')[0].trim();
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

Output format — follow exactly:
1. The translated text only. No labels, quotes, or surrounding text.
2. On its own line: [[EXPLANATION]]
3. One sentence IN ENGLISH about notable nuance, slang, or politeness markers (skip the obvious).`;
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

    const stream = anthropic.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      temperature: 0.5,
      system: buildSystemPrompt(selectedTone),
      messages: [
        {
          role: 'user',
          content: `Translate into the "${selectedTone}" register:\n\n"""${text}"""`,
        },
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }
        } catch (err) {
          controller.error(err);
          return;
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json({ error: 'Failed to translate' }, { status: 500 });
  }
}
