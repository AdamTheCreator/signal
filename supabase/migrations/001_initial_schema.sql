-- Saved daily briefs
create table if not exists briefs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  date date default current_date,
  intel jsonb,
  deep_context jsonb,
  concept jsonb,
  interview_edge jsonb
);

-- Quiz questions generated from briefs
create table if not exists quiz_questions (
  id uuid default gen_random_uuid() primary key,
  brief_id uuid references briefs(id) on delete cascade,
  pillar text not null,
  question text not null,
  answer text not null,
  question_type text not null check (question_type in ('multiple_choice', 'free_response', 'customer_explain')),
  topic_tag text not null,
  options jsonb -- for multiple choice
);

-- User quiz attempts
create table if not exists quiz_attempts (
  id uuid default gen_random_uuid() primary key,
  question_id uuid references quiz_questions(id) on delete cascade,
  user_answer text not null,
  is_correct boolean not null,
  attempted_at timestamptz default now()
);

-- Topic mastery tracking
create table if not exists topic_mastery (
  id uuid default gen_random_uuid() primary key,
  topic_tag text unique not null,
  correct_count int default 0,
  incorrect_count int default 0,
  last_seen_at timestamptz,
  mastery_level int default 0 check (mastery_level between 0 and 3)
  -- 0=unseen, 1=learning, 2=practiced, 3=mastered
);

-- Indexes for performance
create index if not exists idx_briefs_date on briefs(date desc);
create index if not exists idx_quiz_questions_brief on quiz_questions(brief_id);
create index if not exists idx_quiz_questions_topic on quiz_questions(topic_tag);
create index if not exists idx_quiz_attempts_question on quiz_attempts(question_id);
create index if not exists idx_topic_mastery_tag on topic_mastery(topic_tag);
create index if not exists idx_topic_mastery_level on topic_mastery(mastery_level);
