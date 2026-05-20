import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

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

    const anthropic = new Anthropic({ apiKey });
    const body = await request.json();
    const { text, selectedTone } = body;

    console.log(`Selected tone: ${selectedTone}`);
    console.log(`Input text: ${text}`);

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a Japanese–English translation expert.

    CRITICAL RULE: If input is English → output MUST be Japanese. If input is Japanese → output MUST be English.

    Always output valid JSON. No markdown, no backticks.

    JSON structure:
    {
      "detectedSourceLang": "en" or "ja",
      "targetLang": "en" or "ja",
      "variants": [
        {
          "tone": "casual",
          "translation": "translation here",
          "explanation": "brief explanation"
        } 
      ]
    }

    Tone labels: "casual", "polite", "formal", "blunt"`;

        const userPrompt = `Input text: "${text}"

    Required tones: casual, polite, formal, blunt

    Output raw JSON only.`;

    console.log('Calling Claude API...');

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      temperature: 0.4,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    let content = response.content[0].text;
    console.log('Raw Claude response:', content);

    // Clean markdown
    content = content.replace(/```json\n?/g, '');
    content = content.replace(/```\n?/g, '');
    content = content.trim();

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('JSON parse error:', e);
      return NextResponse.json(
        { error: 'Invalid response format' },
        { status: 500 }
      );
    }

    // Ensure variants exists
    if (!parsed.variants || !Array.isArray(parsed.variants)) {
      console.error('No variants array in response:', parsed);
      return NextResponse.json(
        { error: 'Invalid response structure' },
        { status: 500 }
      );
    }

    console.log(`Success: ${parsed.variants.length} variants returned`);
    console.log('First variant:', parsed.variants[0]);

    // Return exactly what frontend expects
    return NextResponse.json({
      inputText: text,
      detectedSourceLang: parsed.detectedSourceLang || 'auto',
      targetLang: parsed.targetLang || 'ja',
      variants: parsed.variants,
    });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'Failed to translate' },
      { status: 500 }
    );
  }
}