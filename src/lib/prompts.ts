const SHARED_CONTEXT = `You are a world-class personalized learning system for Adam.
Background: 15 years SE experience, Senior Manager of Solutions Engineering at GitHub, expert in GitHub Copilot, GHAS, DevSecOps, Azure DevOps, MCP/developer platforms.
Goal: Preparing for OpenAI Solutions Engineer (Deployment/Codex) role.
Learning style: Systems thinker who prefers analogy-driven explanations, enterprise examples, and "what does this mean for a customer" framing.
Today's date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
CRITICAL: Respond ONLY with valid JSON matching the exact schema specified. No markdown, no backticks, no explanation.`;

export interface PreviousBriefSummary {
  intelHeadlines: string[];
  deepContextTopics: string[];
  concepts: string[];
  interviewFocusAreas: string[];
  interviewQuestions: string[];
}

function formatExclusion(label: string, items: string[]): string {
  if (items.length === 0) return '';
  return `\n\nIMPORTANT — You have already covered these ${label} in recent briefs. Do NOT repeat or closely rephrase any of them:\n- ${items.join('\n- ')}`;
}

function collectField(briefs: PreviousBriefSummary[], key: keyof PreviousBriefSummary): string[] {
  return Array.from(new Set(briefs.flatMap(b => b[key])));
}

export function getIntelPrompt(previousBriefs: PreviousBriefSummary[]): { system: string; user: string } {
  const exclusion = formatExclusion('headlines', collectField(previousBriefs, 'intelHeadlines'));
  return {
    system: SHARED_CONTEXT,
    user: `Give Adam 3 high-signal developments in: OpenAI products (Codex, API, Agents SDK, MCP), developer platforms, enterprise AI adoption.
Return JSON array: [{"headline": string, "summary": string, "whyItMatters": string}]
Each item should have a punchy headline, 2-3 sentence summary with specifics, and a "why it matters" that explicitly connects to Adam's GitHub/enterprise SE background.${exclusion}`,
  };
}

export function getDeepContextPrompt(previousBriefs: PreviousBriefSummary[]): { system: string; user: string } {
  const exclusion = formatExclusion('topics', collectField(previousBriefs, 'deepContextTopics'));
  return {
    system: SHARED_CONTEXT,
    user: `Pick the most strategically important topic for an OpenAI SE candidate right now. Write a deep context piece covering origin, evolution, inflections, trajectory, and customer narrative.
Return JSON: {"topic": string, "origin": string, "evolution": string, "inflections": string, "trajectory": string, "customerNarrative": string}
The customer narrative should frame how an SE would explain this to a skeptical enterprise customer.${exclusion}`,
  };
}

export function getConceptPrompt(previousBriefs: PreviousBriefSummary[]): { system: string; user: string } {
  const exclusion = formatExclusion('concepts', collectField(previousBriefs, 'concepts'));
  return {
    system: SHARED_CONTEXT,
    user: `Choose one foundational AI concept essential for an OpenAI SE role. Rotate through: RAG, embeddings, fine-tuning vs prompting, context windows, function calling, agents/tool use, MCP, grounding, evals, RLHF, inference optimization, vector databases, structured outputs, temperature/sampling, reasoning models.
Return JSON: {"concept": string, "plainEnglish": string, "technical": string, "enterpriseUseCase": string, "misconceptions": string, "interviewAnswer": string}
Plain English should be one sentence an exec would understand. Technical should be 3-4 sentences on how it actually works. Interview answer should be a framework for responding if asked about this concept.${exclusion}`,
  };
}

export function getInterviewEdgePrompt(previousBriefs: PreviousBriefSummary[]): { system: string; user: string } {
  const focusAreas = collectField(previousBriefs, 'interviewFocusAreas');
  const questions = collectField(previousBriefs, 'interviewQuestions');
  const parts: string[] = [];
  if (focusAreas.length > 0) parts.push(formatExclusion('focus areas', focusAreas));
  if (questions.length > 0) parts.push(formatExclusion('likely questions', questions));
  const exclusion = parts.join('');
  return {
    system: SHARED_CONTEXT,
    user: `Coach Adam on his OpenAI SE interview. Give him the one thing to focus on this week, a likely question with answer framework using his GitHub/enterprise background, a technical concept to brush up on, and a show-don't-tell suggestion.
Return JSON: {"focusThisWeek": string, "likelyQuestion": string, "answerFramework": string, "technicalBrushUp": string, "showDontTell": string}${exclusion}`,
  };
}

export function getQuizGenerationPrompt(briefContent: string): { system: string; user: string } {
  return {
    system: SHARED_CONTEXT,
    user: `Given this brief content: ${briefContent}

Generate 12 quiz questions (3 per pillar: intel, deep_context, concept, interview_edge).
Mix types: multiple_choice (with 4 options, 1 correct), free_response, customer_explain.
Each question should test understanding and application, not just recall.
For customer_explain questions, frame them as "A customer asks..." or "Your VP wants to know..." scenarios.
Return JSON array: [{"pillar": string, "question": string, "answer": string, "question_type": "multiple_choice"|"free_response"|"customer_explain", "topic_tag": string, "options": string[]|null}]
For multiple_choice, options must be an array of 4 strings. For other types, options should be null. The answer for multiple_choice should be the exact text of the correct option.`,
  };
}

export function getTopicSuggestionsPrompt(weakTopics: { topic_tag: string; correct_count: number; incorrect_count: number }[]): { system: string; user: string } {
  return {
    system: SHARED_CONTEXT,
    user: `Based on Adam's quiz performance, these are his weak areas:
${weakTopics.map(t => `- ${t.topic_tag}: ${t.correct_count} correct, ${t.incorrect_count} incorrect`).join('\n')}

Suggest 5 micro-lesson topics that would help strengthen these weak areas. Each topic should be specific, actionable, and directly relevant to the OpenAI SE role.
Return JSON array: [{"title": string, "whyItMatters": string, "estimatedReadTime": string, "difficulty": string, "topicTag": string}]
difficulty should be "beginner", "intermediate", or "advanced".
estimatedReadTime should be like "5 min read" or "8 min read".`,
  };
}

export function getTopicDeepDivePrompt(topic: string): { system: string; user: string } {
  return {
    system: SHARED_CONTEXT,
    user: `Generate a focused 5-minute deep dive on: "${topic}"
Frame everything through Adam's perspective as a GitHub SE transitioning to OpenAI.
Return JSON: {"topic": string, "plainEnglish": string, "technical": string, "enterpriseUseCase": string, "misconceptions": string, "interviewAnswer": string}
Plain English: one sentence an exec would understand.
Technical: 3-4 detailed sentences on how it works.
Enterprise use case: real-world scenario in a company context.
Misconceptions: common misunderstandings to avoid.
Interview answer: framework for discussing this topic with confidence.`,
  };
}

export function getAnswerEvaluationPrompt(question: string, correctAnswer: string, userAnswer: string): { system: string; user: string } {
  return {
    system: SHARED_CONTEXT,
    user: `Evaluate Adam's answer to this quiz question.
Question: ${question}
Expected answer: ${correctAnswer}
Adam's answer: ${userAnswer}

Return JSON: {"is_correct": boolean, "explanation": string}
is_correct should be true if Adam's answer demonstrates understanding of the key concepts, even if worded differently.
explanation should be 2-3 sentences: acknowledge what was right, correct any misconceptions, and reinforce the key takeaway.`,
  };
}
