import Anthropic from '@anthropic-ai/sdk';

export const MODEL = 'claude-sonnet-4-6' as const;

let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Missing ANTHROPIC_API_KEY environment variable');
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

/**
 * Extract JSON from Claude's response, handling potential markdown fences or preamble.
 */
export function extractJSON<T>(text: string): T {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Find first [ or { and last ] or }
    const firstBracket = text.indexOf('[');
    const firstBrace = text.indexOf('{');

    let start: number;
    let end: number;

    if (firstBracket === -1 && firstBrace === -1) {
      throw new Error('No JSON found in response');
    }

    if (firstBracket === -1) {
      start = firstBrace;
      end = text.lastIndexOf('}') + 1;
    } else if (firstBrace === -1) {
      start = firstBracket;
      end = text.lastIndexOf(']') + 1;
    } else {
      start = Math.min(firstBracket, firstBrace);
      if (start === firstBracket) {
        end = text.lastIndexOf(']') + 1;
      } else {
        end = text.lastIndexOf('}') + 1;
      }
    }

    const jsonStr = text.substring(start, end);
    return JSON.parse(jsonStr);
  }
}
