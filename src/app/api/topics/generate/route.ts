import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, MODEL, extractJSON } from '@/lib/anthropic';
import { getTopicDeepDivePrompt } from '@/lib/prompts';
import type { TopicDeepDive } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const anthropic = getAnthropicClient();
    const { topic } = await request.json();

    if (!topic) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 });
    }

    const prompt = getTopicDeepDivePrompt(topic);
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const deepDive = extractJSON<TopicDeepDive>(text);

    return NextResponse.json({ deepDive });
  } catch (error) {
    console.error('Topic generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate topic deep dive' },
      { status: 500 }
    );
  }
}
