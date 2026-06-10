import Anthropic from '@anthropic-ai/sdk';

// Module-level singleton — reused across invocations on a warm function
// instead of being recreated per request. Lives outside translate/utils.ts so
// that module stays pure (it's unit-tested directly).
let anthropic: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) throw new Error('CLAUDE_API_KEY is not set');
    anthropic = new Anthropic({ apiKey });
  }
  return anthropic;
}
