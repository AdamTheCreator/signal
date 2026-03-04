import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, MODEL, extractJSON } from '@/lib/anthropic';
import { getSupabaseClient } from '@/lib/supabase';
import { getAnswerEvaluationPrompt } from '@/lib/prompts';

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

export async function GET() {
  try {
    const supabase = getSupabaseClient();

    // Spaced repetition: prioritize topics where incorrect > correct and last_seen is oldest
    const { data: mastery } = await supabase
      .from('topic_mastery')
      .select('*')
      .order('mastery_level', { ascending: true })
      .order('last_seen_at', { ascending: true, nullsFirst: true });

    // Get questions for weak topics first
    let questions: Record<string, unknown>[] = [];

    if (mastery && mastery.length > 0) {
      // Weak topics: incorrect > correct or mastery_level < 2
      const weakTopics = mastery
        .filter((m) => m.incorrect_count > m.correct_count || m.mastery_level < 2)
        .map((m) => m.topic_tag);

      if (weakTopics.length > 0) {
        const { data: weakQuestions } = await supabase
          .from('quiz_questions')
          .select('*')
          .in('topic_tag', weakTopics)
          .limit(10);

        if (weakQuestions) questions = weakQuestions;
      }
    }

    // If we don't have enough questions from weak topics, add general ones
    if (questions.length < 10) {
      const existingIds = questions.map((q) => q.id as string);
      const { data: moreQuestions } = await supabase
        .from('quiz_questions')
        .select('*')
        .not('id', 'in', `(${existingIds.length > 0 ? existingIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)
        .limit(10 - questions.length);

      if (moreQuestions) questions = [...questions, ...moreQuestions];
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
