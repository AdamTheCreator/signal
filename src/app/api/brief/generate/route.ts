import { NextResponse } from 'next/server';
import { getAnthropicClient, MODEL, extractJSON } from '@/lib/anthropic';
import { getSupabaseClient } from '@/lib/supabase';
import { INTEL_PROMPT, DEEP_CONTEXT_PROMPT, CONCEPT_PROMPT, INTERVIEW_EDGE_PROMPT } from '@/lib/prompts';
import type { IntelItem, DeepContext, ConceptOfDay, InterviewEdge } from '@/types';

async function generatePillar<T>(system: string, user: string, maxTokens: number): Promise<T> {
  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  if (response.stop_reason === 'max_tokens') {
    console.warn('Response truncated (max_tokens), text length:', text.length);
  }
  return extractJSON<T>(text);
}

export async function POST() {
  try {
    const supabase = getSupabaseClient();

    // Generate all 4 pillars in parallel
    const [intel, deepContext, concept, interviewEdge] = await Promise.all([
      generatePillar<IntelItem[]>(INTEL_PROMPT.system, INTEL_PROMPT.user, 3000),
      generatePillar<DeepContext>(DEEP_CONTEXT_PROMPT.system, DEEP_CONTEXT_PROMPT.user, 3000),
      generatePillar<ConceptOfDay>(CONCEPT_PROMPT.system, CONCEPT_PROMPT.user, 3000),
      generatePillar<InterviewEdge>(INTERVIEW_EDGE_PROMPT.system, INTERVIEW_EDGE_PROMPT.user, 3000),
    ]);

    // Save to Supabase
    const { data: brief, error } = await supabase
      .from('briefs')
      .insert({
        date: new Date().toISOString().split('T')[0],
        intel,
        deep_context: deepContext,
        concept,
        interview_edge: interviewEdge,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: 'Failed to save brief' }, { status: 500 });
    }

    // Auto-generate quiz questions for this brief
    try {
      const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : 'http://localhost:3000';

      await fetch(`${baseUrl}/api/quiz/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief_id: brief.id }),
      });
    } catch (quizError) {
      // Don't fail the brief generation if quiz generation fails
      console.error('Quiz auto-generation failed:', quizError);
    }

    return NextResponse.json({ brief });
  } catch (error) {
    console.error('Brief generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate brief' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const { data: briefs, error } = await supabase
      .from('briefs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch briefs' }, { status: 500 });
    }

    return NextResponse.json({ briefs });
  } catch (error) {
    console.error('Brief fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch briefs' }, { status: 500 });
  }
}
