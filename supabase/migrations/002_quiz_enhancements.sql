-- Add category and bookmark columns to quiz_questions
alter table quiz_questions
  add column if not exists category text not null default 'tech'
    check (category in ('tech', 'industry', 'customer')),
  add column if not exists is_bookmarked boolean not null default false;

-- Indexes for new columns and missed-question queries
create index if not exists idx_quiz_questions_category on quiz_questions(category);
create index if not exists idx_quiz_questions_bookmarked on quiz_questions(is_bookmarked) where is_bookmarked = true;
create index if not exists idx_quiz_attempts_incorrect on quiz_attempts(question_id) where is_correct = false;
