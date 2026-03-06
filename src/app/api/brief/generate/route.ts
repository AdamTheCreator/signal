import { NextResponse } from 'next/server';
import { getAnthropicClient, MODEL, extractJSON } from '@/lib/anthropic';
import { getSupabaseClient } from '@/lib/supabase';
import { getIntelPrompt, getDeepContextPrompt, getConceptPrompt, getInterviewEdgePrompt } from '@/lib/prompts';
import type { PreviousBriefSummary } from '@/lib/prompts';
import type { IntelItem, DeepContext, ConceptOfDay, InterviewEdge, Brief } from '@/types';

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

    // Fetch recent briefs for dedup context
    const { data: recentBriefs } = await supabase
      .from('briefs')
      .select('intel, deep_context, concept, interview_edge')
      .order('date', { ascending: false })
      .limit(7);

    const previousBriefs: PreviousBriefSummary[] = (recentBriefs ?? []).map((b: Pick<Brief, 'intel' | 'deep_context' | 'concept' | 'interview_edge'>) => ({
      intelHeadlines: (b.intel ?? []).map((i: IntelItem) => i.headline),
      deepContextTopics: b.deep_context?.topic ? [b.deep_context.topic] : [],
      concepts: b.concept?.concept ? [b.concept.concept] : [],
      interviewFocusAreas: b.interview_edge?.focusThisWeek ? [b.interview_edge.focusThisWeek.slice(0, 50)] : [],
      interviewQuestions: b.interview_edge?.likelyQuestion ? [b.interview_edge.likelyQuestion.slice(0, 80)] : [],
    }));

    // Generate all 4 pillars in parallel
    const intelPrompt = getIntelPrompt(previousBriefs);
    const deepContextPrompt = getDeepContextPrompt(previousBriefs);
    const conceptPrompt = getConceptPrompt(previousBriefs);
    const interviewEdgePrompt = getInterviewEdgePrompt(previousBriefs);

    const [intel, deepContext, concept, interviewEdge] = await Promise.all([
      generatePillar<IntelItem[]>(intelPrompt.system, intelPrompt.user, 3000),
      generatePillar<DeepContext>(deepContextPrompt.system, deepContextPrompt.user, 3000),
      generatePillar<ConceptOfDay>(conceptPrompt.system, conceptPrompt.user, 3000),
      generatePillar<InterviewEdge>(interviewEdgePrompt.system, interviewEdgePrompt.user, 3000),
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
