import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  getClientIp,
  isRateLimited,
  validateTranslationInput,
  TONES,
} from '../translate/utils';

let anthropic: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) throw new Error('CLAUDE_API_KEY is not set');
    anthropic = new Anthropic({ apiKey });
  }
  return anthropic;
}

function buildCheckPrompt(tone: string): string {
  const register = TONES[tone] ?? tone;
  return `You are checking text for correctness and naturalness. The text may be in any language — check it in whatever language it's written in. Do not translate it.

Your job: assess whether the text is grammatically correct and sounds like something a real native speaker would actually say or write. The ${register} register provides context for what "natural" looks like in this setting.

Respond in this exact format:
- First line: "✓ Natural" or "⚠ Unnatural"
- Then 1–2 sentences explaining why. Be specific — name the issue if there is one.
- If unnatural, end with: Try: [a more natural version in the same language]

No markdown. No quotes around the alternative. Be concise.`;
}

export async function POST(request: NextRequest) {
  try {
    let client: Anthropic;
    try {
      client = getAnthropicClient();
    } catch {
      console.error('CLAUDE_API_KEY is not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (isRateLimited(getClientIp(request.headers))) {
      return NextResponse.json(
        { error: 'Too many requests — please wait a moment and try again.' },
        { status: 429 }
      );
    }

    const { text, selectedTone } = await request.json();

    const validationError = validateTranslationInput(text, selectedTone);
    if (validationError) {
      return NextResponse.json({ error: validationError.error }, { status: validationError.status });
    }

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      temperature: 0.3,
      system: buildCheckPrompt(selectedTone),
      messages: [
        {
          role: 'user',
          content: `Check this text for the "${selectedTone}" register:\n\n"""${text}"""`,
        },
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }
          const finalMsg = await stream.finalMessage();
          if (finalMsg.stop_reason === 'max_tokens') {
            controller.enqueue(encoder.encode('\n[[MAX_TOKENS]]'));
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
    console.error('Check error:', error);
    return NextResponse.json({ error: 'Failed to check naturalness' }, { status: 500 });
  }
}
