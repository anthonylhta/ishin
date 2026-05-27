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

For Japanese text, actively check for these error patterns — do not let the subject (pronoun or name) influence the verdict, judge structure and register only:
- Giving/receiving verb direction: あげる = speaker gives outward to others; くれる = someone gives inward to the speaker; もらう = speaker receives. The same logic applies to てあげる/てくれる/てもらう. Using あげる when the speaker is the recipient is a hard error — name it explicitly.
- Transitive/intransitive verb pairs (開ける/開く, 出す/出る, 入れる/入る, 起こす/起きる, 消す/消える, 続ける/続く): if the subject undergoes the action use intransitive; if it causes the action use transitive.
- ないで vs なくて: ないで = "without doing X" or a negative request; なくて = negative reason or cause. They are not interchangeable.
- Conditional forms: と expresses automatic consequence and is ungrammatical before requests or commands. たら, ば, and なら each carry distinct nuance — flag clearly inappropriate use.
- Register consistency: plain form in polite contexts or です/ます leaked into casual speech are both errors. The register should be uniform throughout.
- な-adjective conjugation: な-adjectives do not inflect like い-adjectives. きれいくない is wrong; きれいじゃない is correct. Watch for other な-adjectives that end in い (きれい, きらい, ゆうめい).
- Subject pronoun overuse: Japanese drops subjects when clear from context. Repeating 私/僕/俺 every sentence sounds unnatural, especially in casual register.

Respond in this exact format:
- First line: "✓ Natural" or "⚠ Unnatural"
- Then 1–2 sentences explaining why. Be specific — name the rule if there is one.
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
