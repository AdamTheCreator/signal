// ============================================================
// Database Models
// ============================================================

export interface Brief {
  id: string;
  created_at: string;
  date: string;
  intel: IntelItem[];
  deep_context: DeepContext;
  concept: ConceptOfDay;
  interview_edge: InterviewEdge;
}

export interface IntelItem {
  headline: string;
  summary: string;
  whyItMatters: string;
}

export interface DeepContext {
  topic: string;
  origin: string;
  evolution: string;
  inflections: string;
  trajectory: string;
  customerNarrative: string;
}

export interface ConceptOfDay {
  concept: string;
  plainEnglish: string;
  technical: string;
  enterpriseUseCase: string;
  misconceptions: string;
  interviewAnswer: string;
}

export interface InterviewEdge {
  focusThisWeek: string;
  likelyQuestion: string;
  answerFramework: string;
  technicalBrushUp: string;
  showDontTell: string;
}

export type QuizMode = 'standard' | 'bookmarked' | 'missed';
export type QuizCategory = 'all' | 'tech' | 'industry' | 'customer';

export interface QuizQuestion {
  id: string;
  brief_id: string;
  pillar: string;
  question: string;
  answer: string;
  question_type: 'multiple_choice' | 'free_response' | 'customer_explain';
  topic_tag: string;
  options: string[] | null;
  category: 'tech' | 'industry' | 'customer';
  is_bookmarked: boolean;
}

export interface QuizAttempt {
  id: string;
  question_id: string;
  user_answer: string;
  is_correct: boolean;
  attempted_at: string;
}

export interface TopicMastery {
  id: string;
  topic_tag: string;
  correct_count: number;
  incorrect_count: number;
  last_seen_at: string | null;
  mastery_level: number;
}

// ============================================================
// API Request/Response Types
// ============================================================

export interface GenerateBriefResponse {
  brief: Brief;
}

export interface GenerateQuizRequest {
  brief_id: string;
}

export interface QuizAttemptRequest {
  question_id: string;
  user_answer: string;
}

export interface QuizAttemptResponse {
  attempt: QuizAttempt;
  is_correct: boolean;
  correct_answer: string;
  explanation: string;
}

export interface TopicSuggestion {
  title: string;
  whyItMatters: string;
  estimatedReadTime: string;
  difficulty: string;
  topicTag: string;
}

export interface TopicDeepDive {
  topic: string;
  plainEnglish: string;
  technical: string;
  enterpriseUseCase: string;
  misconceptions: string;
  interviewAnswer: string;
}

// ============================================================
// UI State Types
// ============================================================

export type TabId = 'brief' | 'quiz' | 'topics';

export interface QuizSessionState {
  currentQuestion: QuizQuestion | null;
  questionsAnswered: number;
  correctAnswers: number;
  sessionQuestions: QuizQuestion[];
  currentIndex: number;
  isComplete: boolean;
}
