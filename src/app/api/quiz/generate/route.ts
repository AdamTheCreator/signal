import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, MODEL, extractJSON } from '@/lib/anthropic';
import { getSupabaseClient } from '@/lib/supabase';
import { getQuizGenerationPrompt } from '@/lib/prompts';

interface GeneratedQuestion {
  pillar: string;
  question: string;
  answer: string;
  question_type: 'multiple_choice' | 'free_response' | 'customer_explain';
  topic_tag: string;
  options: string[] | null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const anthropic = getAnthropicClient();
    const { brief_id } = await request.json();

    if (!brief_id) {
      return NextResponse.json({ error: 'brief_id is required' }, { status: 400 });
    }

    // Fetch the brief content
    const { data: brief, error: briefError } = await supabase
      .from('briefs')
      .select('*')
      .eq('id', brief_id)
      .single();

    if (briefError || !brief) {
      return NextResponse.json({ error: 'Brief not found' }, { status: 404 });
    }

    // Generate quiz questions using Claude
    const briefContent = JSON.stringify({
      intel: brief.intel,
      deep_context: brief.deep_context,
      concept: brief.concept,
      interview_edge: brief.interview_edge,
    });

    const prompt = getQuizGenerationPrompt(briefContent);
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: prompt.system,
      messages: [{ role: 'user', content: prompt.user }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const questions = extractJSON<GeneratedQuestion[]>(text);

    // Save questions to Supabase
    const questionsToInsert = questions.map((q) => ({
      brief_id,
      pillar: q.pillar,
      question: q.question,
      answer: q.answer,
      question_type: q.question_type,
      topic_tag: q.topic_tag,
      options: q.options,
    }));

    const { data: savedQuestions, error: insertError } = await supabase
      .from('quiz_questions')
      .insert(questionsToInsert)
      .select();

    if (insertError) {
      console.error('Failed to save quiz questions:', insertError);
      return NextResponse.json({ error: 'Failed to save questions' }, { status: 500 });
    }

    // Initialize topic mastery for new topics
    const uniqueTopics = Array.from(new Set(questions.map((q) => q.topic_tag)));
    for (const topic of uniqueTopics) {
      await supabase
        .from('topic_mastery')
        .upsert(
          { topic_tag: topic, mastery_level: 0 },
          { onConflict: 'topic_tag', ignoreDuplicates: true }
        );
    }

    return NextResponse.json({ questions: savedQuestions });
  } catch (error) {
    console.error('Quiz generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate quiz questions' },
      { status: 500 }
    );
  }
}
