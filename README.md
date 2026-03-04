# SIGNAL — AI Learning Platform

A personalized intelligence and learning system built for OpenAI Solutions Engineer interview preparation. Generates daily AI-powered briefs, adaptive quizzes with spaced repetition, and targeted deep-dive topics based on performance gaps.

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS + Framer Motion
- **Database:** Supabase (Postgres)
- **AI:** Anthropic Claude API (claude-sonnet-4-6)
- **Deployment:** Vercel

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor and run the migration file:

```sql
-- Copy and paste the contents of supabase/migrations/001_initial_schema.sql
```

This creates 4 tables: `briefs`, `quiz_questions`, `quiz_attempts`, `topic_mastery`.

### 3. Configure environment variables

Copy the example env file and fill in your values:

```bash
cp .env.local.example .env.local
```

Required variables:

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key from [console.anthropic.com](https://console.anthropic.com) |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (Settings > API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key (Settings > API) |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional — Supabase service role key for admin operations |

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Deploy to Vercel

```bash
npx vercel
```

Or connect your GitHub repo to Vercel for auto-deploys. Set environment variables in the Vercel dashboard under Settings > Environment Variables.

## Features

### Daily Brief
Generates a 4-pillar intelligence digest via Claude API:
- **Intel** — 3 high-signal AI/developer platform developments
- **Deep Context** — Strategic deep-dive on one critical topic
- **Concept of the Day** — Foundational AI concept with interview framing
- **Interview Edge** — Actionable coaching for the week

### Quiz Bank
- Auto-generates 12 quiz questions per brief (3 per pillar)
- Multiple choice, free response, and customer scenario question types
- AI-evaluated free-text answers
- Spaced repetition prioritizes weak topics
- Session progress tracking

### Topic Generator
- Suggests 5 micro-lesson topics based on quiz performance gaps
- On-demand deep dives with plain English, technical, and interview framings
- Custom topic input for any subject

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── brief/generate/    POST: generate brief, GET: fetch history
│   │   ├── quiz/generate/     POST: generate quiz from brief
│   │   ├── quiz/attempt/      POST: submit answer, GET: fetch questions
│   │   ├── topics/suggest/    GET: AI-suggested topics
│   │   └── topics/generate/   POST: generate deep dive
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── DailyBrief.tsx
│   ├── QuizBank.tsx
│   ├── TopicGenerator.tsx
│   ├── TabNav.tsx
│   └── LoadingCard.tsx
├── lib/
│   ├── anthropic.ts           Claude API client + JSON extraction
│   ├── supabase.ts            Supabase client
│   └── prompts.ts             All AI prompt templates
└── types/
    └── index.ts               TypeScript interfaces
```
