import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, MODEL, extractJSON } from '@/lib/anthropic';
import { getSupabaseClient } from '@/lib/supabase';
import { getAnswerEvaluationPrompt, getQuizGenerationPrompt, getStandaloneQuizPrompt } from '@/lib/prompts';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { question_id, user_answer } = await request.json();

    if (!question_id || !user_answer) {
      return NextResponse.json(
        { error: 'question_id and user_answer are required' },
        { status: 400 }
      );
    }

    // Fetch the question
    const { data: question, error: qError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('id', question_id)
      .single();

    if (qError || !question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    let isCorrect: boolean;
    let explanation: string;

    if (question.question_type === 'multiple_choice') {
      // For multiple choice, do exact match
      isCorrect = user_answer.trim() === question.answer.trim();
      explanation = isCorrect
        ? 'Correct! You selected the right answer.'
        : `The correct answer was: "${question.answer}"`;
    } else {
      // For free response and customer_explain, use AI evaluation
      const anthropic = getAnthropicClient();
      const evalPrompt = getAnswerEvaluationPrompt(
        question.question,
        question.answer,
        user_answer
      );

      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 500,
        system: evalPrompt.system,
        messages: [{ role: 'user', content: evalPrompt.user }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const evaluation = extractJSON<{ is_correct: boolean; explanation: string }>(text);
      isCorrect = evaluation.is_correct;
      explanation = evaluation.explanation;
    }

    // Save the attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .insert({
        question_id,
        user_answer,
        is_correct: isCorrect,
      })
      .select()
      .single();

    if (attemptError) {
      console.error('Failed to save attempt:', attemptError);
      return NextResponse.json({ error: 'Failed to save attempt' }, { status: 500 });
    }

    // Update topic mastery
    const { data: existing } = await supabase
      .from('topic_mastery')
      .select('*')
      .eq('topic_tag', question.topic_tag)
      .single();

    if (existing) {
      const newCorrect = existing.correct_count + (isCorrect ? 1 : 0);
      const newIncorrect = existing.incorrect_count + (isCorrect ? 0 : 1);
      const total = newCorrect + newIncorrect;
      const ratio = total > 0 ? newCorrect / total : 0;

      let masteryLevel = existing.mastery_level;
      if (ratio >= 0.9 && total >= 5) masteryLevel = 3;
      else if (ratio >= 0.7 && total >= 3) masteryLevel = 2;
      else if (total >= 1) masteryLevel = 1;

      await supabase
        .from('topic_mastery')
        .update({
          correct_count: newCorrect,
          incorrect_count: newIncorrect,
          last_seen_at: new Date().toISOString(),
          mastery_level: masteryLevel,
        })
        .eq('topic_tag', question.topic_tag);
    } else {
      await supabase.from('topic_mastery').insert({
        topic_tag: question.topic_tag,
        correct_count: isCorrect ? 1 : 0,
        incorrect_count: isCorrect ? 0 : 1,
        last_seen_at: new Date().toISOString(),
        mastery_level: 1,
      });
    }

    return NextResponse.json({
      attempt,
      is_correct: isCorrect,
      correct_answer: question.answer,
      explanation,
    });
  } catch (error) {
    console.error('Quiz attempt error:', error);
    return NextResponse.json(
      { error: 'Failed to process quiz attempt' },
      { status: 500 }
    );
  }
}

interface GeneratedQuestion {
  pillar: string;
  question: string;
  answer: string;
  question_type: 'multiple_choice' | 'free_response' | 'customer_explain';
  topic_tag: string;
  options: string[] | null;
  category?: 'tech' | 'industry' | 'customer';
}

async function autoGenerateQuestions(supabase: ReturnType<typeof getSupabaseClient>) {
  const anthropic = getAnthropicClient();

  // First, try briefs that don't have quiz questions yet
  const { data: allBriefs } = await supabase
    .from('briefs')
    .select('id, intel, deep_context, concept, interview_edge')
    .order('created_at', { ascending: false })
    .limit(5);

  if (allBriefs && allBriefs.length > 0) {
    for (const brief of allBriefs) {
      const { count } = await supabase
        .from('quiz_questions')
        .select('*', { count: 'exact', head: true })
        .eq('brief_id', brief.id);

      if (count === 0) {
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

        const toInsert = questions.map((q) => ({
          brief_id: brief.id,
          pillar: q.pillar,
          question: q.question,
          answer: q.answer,
          question_type: q.question_type,
          topic_tag: q.topic_tag,
          options: q.options,
          category: q.category || 'tech',
        }));

        const { data: saved } = await supabase
          .from('quiz_questions')
          .insert(toInsert)
          .select();

        if (saved && saved.length > 0) return saved;
      }
    }
  }

  // Fallback: standalone generation targeting weak topics
  const { data: mastery } = await supabase
    .from('topic_mastery')
    .select('topic_tag, correct_count, incorrect_count')
    .order('mastery_level', { ascending: true })
    .limit(10);

  const { data: existing } = await supabase
    .from('quiz_questions')
    .select('question')
    .order('id', { ascending: false })
    .limit(30);

  const weakTopics = (mastery || []).map((m) => ({
    topic_tag: m.topic_tag,
    correct_count: m.correct_count,
    incorrect_count: m.incorrect_count,
  }));
  const existingQuestions = (existing || []).map((q) => q.question as string);

  const prompt = getStandaloneQuizPrompt(weakTopics, existingQuestions);
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: prompt.system,
    messages: [{ role: 'user', content: prompt.user }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const questions = extractJSON<GeneratedQuestion[]>(text);

  const toInsert = questions.map((q) => ({
    brief_id: null,
    pillar: q.pillar,
    question: q.question,
    answer: q.answer,
    question_type: q.question_type,
    topic_tag: q.topic_tag,
    options: q.options,
    category: q.category || 'tech',
  }));

  const { data: saved } = await supabase
    .from('quiz_questions')
    .insert(toInsert)
    .select();

  return saved || [];
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'standard';
    const category = searchParams.get('category') || 'all';
    const filterCategory = category && category !== 'all';

    let questions: Record<string, unknown>[] = [];

    if (mode === 'bookmarked') {
      let query = supabase
        .from('quiz_questions')
        .select('*')
        .eq('is_bookmarked', true);
      if (filterCategory) query = query.eq('category', category);
      const { data } = await query.limit(20);
      questions = data || [];

    } else if (mode === 'missed') {
      // Get question IDs with at least one incorrect attempt
      const { data: incorrectAttempts } = await supabase
        .from('quiz_attempts')
        .select('question_id')
        .eq('is_correct', false);

      if (incorrectAttempts && incorrectAttempts.length > 0) {
        const missedIds = Array.from(new Set(incorrectAttempts.map((a) => a.question_id)));
        let query = supabase
          .from('quiz_questions')
          .select('*')
          .in('id', missedIds);
        if (filterCategory) query = query.eq('category', category);
        const { data } = await query.limit(20);
        questions = data || [];
      }

    } else {
      // Standard mode: spaced repetition + category filter
      const { data: mastery } = await supabase
        .from('topic_mastery')
        .select('*')
        .order('mastery_level', { ascending: true })
        .order('last_seen_at', { ascending: true, nullsFirst: true });

      if (mastery && mastery.length > 0) {
        const weakTopics = mastery
          .filter((m) => m.incorrect_count > m.correct_count || m.mastery_level < 2)
          .map((m) => m.topic_tag);

        if (weakTopics.length > 0) {
          let query = supabase
            .from('quiz_questions')
            .select('*')
            .in('topic_tag', weakTopics);
          if (filterCategory) query = query.eq('category', category);
          const { data: weakQuestions } = await query.limit(10);
          if (weakQuestions) questions = weakQuestions;
        }
      }

      if (questions.length < 10) {
        const existingIds = questions.map((q) => q.id as string);
        let query = supabase
          .from('quiz_questions')
          .select('*')
          .not('id', 'in', `(${existingIds.length > 0 ? existingIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);
        if (filterCategory) query = query.eq('category', category);
        const { data: moreQuestions } = await query.limit(10 - questions.length);
        if (moreQuestions) questions = [...questions, ...moreQuestions];
      }

      // Auto-generate when pool is empty
      if (questions.length === 0) {
        try {
          const generated = await autoGenerateQuestions(supabase);
          if (generated && generated.length > 0) {
            if (filterCategory) {
              questions = generated.filter((q) => q.category === category);
            } else {
              questions = generated;
            }
          }
        } catch (genError) {
          console.error('Auto-generation failed:', genError);
        }
      }
    }

    // Shuffle questions
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Quiz fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz questions' },
      { status: 500 }
    );
  }
}
