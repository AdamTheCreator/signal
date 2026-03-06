import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { question_id } = await request.json();

    if (!question_id) {
      return NextResponse.json({ error: 'question_id is required' }, { status: 400 });
    }

    // Fetch current bookmark state
    const { data: question, error: fetchError } = await supabase
      .from('quiz_questions')
      .select('is_bookmarked')
      .eq('id', question_id)
      .single();

    if (fetchError || !question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Toggle bookmark
    const newValue = !question.is_bookmarked;
    const { error: updateError } = await supabase
      .from('quiz_questions')
      .update({ is_bookmarked: newValue })
      .eq('id', question_id);

    if (updateError) {
      console.error('Failed to toggle bookmark:', updateError);
      return NextResponse.json({ error: 'Failed to toggle bookmark' }, { status: 500 });
    }

    return NextResponse.json({ is_bookmarked: newValue });
  } catch (error) {
    console.error('Bookmark error:', error);
    return NextResponse.json({ error: 'Failed to toggle bookmark' }, { status: 500 });
  }
}
