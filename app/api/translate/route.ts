import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const TONES: Record<string, string> = {
  casual: 'casual (普通): plain/dictionary form (だ, short forms). Speech among close friends or family.',
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
  return `You are an expert Japanese ⇄ English translator specializing in tone and politeness.

Direction (strict): English input → Japanese. Japanese input → English. For mixed input, translate into the language opposite the dominant one.

Translate the input into the "${tone}" register only:
${TONES[tone]}

The translation must read naturally to a native speaker — convey the meaning faithfully, not word-for-word. Preserve proper nouns, numbers, and formatting. When translating into Japanese, use the grammatical markers noted above; when translating into English, match the equivalent register.

Also write a one-sentence explanation IN ENGLISH naming the key politeness markers or word choices that set this tone.`;
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

    const { text, selectedTone } = await request.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    if (!selectedTone || !(selectedTone in TONES)) {
      return NextResponse.json({ error: 'Invalid tone' }, { status: 400 });
    }

    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      temperature: 0.4,
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
