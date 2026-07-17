import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient } from '../anthropic';
import {
  getClientIp,
  isRateLimited,
  isPaused,
  validateTranslationInput,
  buildCheckPrompt,
} from '../translate/utils';

export async function POST(request: NextRequest) {
  try {
    if (isPaused()) {
      return NextResponse.json(
        { error: 'Ishin is paused right now — please check back soon.' },
        { status: 503 }
      );
    }

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
      // Check stays on Sonnet 4.6 (ADR 0043): temperature 0.3 keeps the binary
      // ✓/⚠ verdict low-variance, which Sonnet 5 can't do (it rejects non-default
      // temperature). Revisit before 4.6 deprecates — see the ADR 0043 follow-ups.
      model: 'claude-sonnet-4-6',
      // Sized for the shared 2000-char input cap: a long ⚠ verdict (explanation
      // + full-length Try: rewrite) overflowed 512 and streamed out truncated.
      max_tokens: 2048,
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
