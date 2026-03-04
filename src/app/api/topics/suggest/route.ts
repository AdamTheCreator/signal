import { NextResponse } from 'next/server';
import { getAnthropicClient, MODEL, extractJSON } from '@/lib/anthropic';
import { getSupabaseClient } from '@/lib/supabase';
import { getTopicSuggestionsPrompt } from '@/lib/prompts';
import type { TopicSuggestion } from '@/types';

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const anthropic = getAnthropicClient();

    // Fetch topic mastery data
    const { data: mastery, error: masteryError } = await supabase
      .from('topic_mastery')
      .select('*')
      .order('mastery_level', { ascending: true });

    if (masteryError) {
      return NextResponse.json({ error: 'Failed to fetch mastery data' }, { status: 500 });
    }

    // Find weak topics (incorrect > correct or low mastery)
    const weakTopics = (mastery || [])
      .filter(
        (m) =>
          m.incorrect_count > m.correct_count ||
          m.mastery_level < 2
      )
      .map((m) => ({
        topic_tag: m.topic_tag,
        correct_count: m.correct_count,
        incorrect_count: m.incorrect_count,
      }));

    // If no mastery data yet, provide default weak areas
    const topicsForPrompt = weakTopics.length > 0
      ? weakTopics
      : [
          { topic_tag: 'OpenAI Codex', correct_count: 0, incorrect_count: 0 },
          { topic_tag: 'Agents SDK', correct_count: 0, incorrect_count: 0 },
          { topic_tag: 'RAG Architecture', correct_count: 0, incorrect_count: 0 },
          { topic_tag: 'Enterprise AI Governance', correct_count: 0, incorrect_count: 0 },
          { topic_tag: 'MCP Protocol', correct_count: 0, incorrect_count: 0 },
        ];

    const prompt = getTopicSuggestionsPrompt(topicsForPrompt);
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1000,
      system: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const suggestions = extractJSON<TopicSuggestion[]>(text);

    return NextResponse.json({ suggestions, weakTopics: topicsForPrompt });
  } catch (error) {
    console.error('Topic suggestion error:', error);
    return NextResponse.json(
      { error: 'Failed to generate topic suggestions' },
      { status: 500 }
    );
  }
}
