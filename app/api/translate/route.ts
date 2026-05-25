import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  getClientIp,
  isRateLimited,
  buildSystemPrompt,
  validateTranslationInput,
} from './utils';

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
    console.error('Translation error:', error);
    return NextResponse.json({ error: 'Failed to translate' }, { status: 500 });
  }
}
