'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { QuizQuestion } from '@/types';

interface WeakTopic {
  topic_tag: string;
  correct_count: number;
  incorrect_count: number;
}

const PILLAR_COLORS: Record<string, string> = {
  intel: '#00e5ff',
  deep_context: '#7c3aed',
  concept: '#10b981',
  interview_edge: '#f59e0b',
};

export default function QuizBank() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [freeAnswer, setFreeAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [explanation, setExplanation] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  async function fetchQuestions() {
    setLoading(true);
    setError(null);
    try {
      const [quizRes, topicsRes] = await Promise.all([
        fetch('/api/quiz/attempt'),
        fetch('/api/topics/suggest').catch(() => null),
      ]);
      const data = await quizRes.json();
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        setCurrentIndex(0);
        resetQuestionState();
      } else {
        setQuestions([]);
      }
      if (topicsRes?.ok) {
        const topicsData = await topicsRes.json();
        if (topicsData.weakTopics) {
          setWeakTopics(topicsData.weakTopics);
        }
      }
    } catch {
      setError('Failed to load quiz questions');
    } finally {
      setLoading(false);
    }
  }

  function resetQuestionState() {
    setSelectedAnswer(null);
    setFreeAnswer('');
    setSubmitted(false);
    setIsCorrect(null);
    setExplanation('');
    setCorrectAnswer('');
  }

  async function submitAnswer() {
    const question = questions[currentIndex];
    if (!question) return;

    const userAnswer =
      question.question_type === 'multiple_choice' ? selectedAnswer : freeAnswer;

    if (!userAnswer || userAnswer.trim() === '') return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/quiz/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: question.id,
          user_answer: userAnswer,
        }),
      });

      const data = await res.json();
      setIsCorrect(data.is_correct);
      setExplanation(data.explanation);
      setCorrectAnswer(data.correct_answer);
      setSubmitted(true);
      setSessionTotal((prev) => prev + 1);
      if (data.is_correct) setSessionCorrect((prev) => prev + 1);
    } catch {
      setError('Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  }

  function nextQuestion() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      resetQuestionState();
    }
  }

  const question = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + (submitted ? 1 : 0)) / questions.length) * 100 : 0;
  const pillarColor = question ? PILLAR_COLORS[question.pillar] || '#00e5ff' : '#00e5ff';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="spinner mb-4" style={{ width: 32, height: 32 }} />
        <p className="text-white/40 text-sm">Loading quiz questions...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-4xl mb-4 opacity-20">◎</div>
        <h3 className="text-lg font-medium text-white/50 mb-2">No quiz questions yet</h3>
        <p className="text-sm text-white/30 max-w-md">
          Generate a Daily Brief first — quiz questions are automatically created from
          each brief&apos;s content. Head to the Daily Brief tab to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Session progress */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-white/40 font-mono">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className="text-white/60">
            {sessionCorrect}/{sessionTotal} correct this session
          </span>
        </div>
        <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, #00e5ff, #10b981)` }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Question card */}
      <AnimatePresence mode="wait">
        {question && (
          <motion.div
            key={question.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="pillar-card"
            style={{ borderTopColor: pillarColor, borderTopWidth: '2px' }}
          >
            {/* Tags */}
            <div className="flex items-center gap-2 mb-4">
              <span
                className="px-2 py-0.5 rounded text-xs font-mono uppercase"
                style={{
                  color: pillarColor,
                  backgroundColor: `${pillarColor}15`,
                  border: `1px solid ${pillarColor}30`,
                }}
              >
                {question.pillar.replace('_', ' ')}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-mono text-white/40 bg-white/[0.03] border border-white/[0.08]">
                {question.topic_tag}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-mono text-white/30 bg-white/[0.02]">
                {question.question_type.replace('_', ' ')}
              </span>
            </div>

            {/* Question */}
            <h3 className="text-white font-medium mb-6 leading-relaxed">
              {question.question}
            </h3>

            {/* Multiple choice options */}
            {question.question_type === 'multiple_choice' && question.options && (
              <div className="space-y-3">
                {question.options.map((option, i) => {
                  let className = 'quiz-option';
                  if (submitted) {
                    if (option === correctAnswer) className += ' correct';
                    else if (option === selectedAnswer && !isCorrect) className += ' incorrect';
                  } else if (option === selectedAnswer) {
                    className += ' selected';
                  }

                  return (
                    <button
                      key={i}
                      className={className}
                      onClick={() => !submitted && setSelectedAnswer(option)}
                      disabled={submitted}
                    >
                      <span className="font-mono text-xs text-white/30 mr-3">
                        {String.fromCharCode(65 + i)}.
                      </span>
                      {option}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Free response / customer explain */}
            {(question.question_type === 'free_response' ||
              question.question_type === 'customer_explain') && (
              <div>
                <textarea
                  value={freeAnswer}
                  onChange={(e) => setFreeAnswer(e.target.value)}
                  disabled={submitted}
                  placeholder={
                    question.question_type === 'customer_explain'
                      ? 'Explain as if you were talking to the customer...'
                      : 'Type your answer...'
                  }
                  className="w-full h-32 p-4 rounded-lg bg-white/[0.03] border border-white/[0.08]
                    text-white text-sm leading-relaxed resize-none
                    focus:outline-none focus:border-white/20 transition-colors
                    placeholder:text-white/20
                    disabled:opacity-50"
                />
              </div>
            )}

            {/* Submit / Next buttons */}
            <div className="mt-6 flex items-center gap-3">
              {!submitted ? (
                <button
                  onClick={submitAnswer}
                  disabled={
                    submitting ||
                    (question.question_type === 'multiple_choice'
                      ? !selectedAnswer
                      : freeAnswer.trim() === '')
                  }
                  className="px-5 py-2.5 rounded-lg text-sm font-medium
                    bg-white/[0.08] border border-white/[0.12] text-white
                    hover:bg-white/[0.12] transition-all
                    disabled:opacity-30 disabled:cursor-not-allowed
                    flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="spinner w-4 h-4" />
                      Evaluating...
                    </>
                  ) : (
                    'Submit Answer'
                  )}
                </button>
              ) : (
                <button
                  onClick={nextQuestion}
                  disabled={currentIndex >= questions.length - 1}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium
                    bg-gradient-to-r from-[#00e5ff]/20 to-[#10b981]/20
                    border border-[#00e5ff]/30 text-white
                    hover:from-[#00e5ff]/30 hover:to-[#10b981]/30
                    disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  {currentIndex >= questions.length - 1 ? 'Quiz Complete' : 'Next Question →'}
                </button>
              )}
            </div>

            {/* Result feedback */}
            <AnimatePresence>
              {submitted && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`mt-6 p-4 rounded-lg border ${
                    isCorrect
                      ? 'bg-[#10b981]/10 border-[#10b981]/20'
                      : 'bg-red-500/10 border-red-500/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-sm font-semibold ${isCorrect ? 'text-[#10b981]' : 'text-red-400'}`}>
                      {isCorrect ? 'Correct!' : 'Not quite'}
                    </span>
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed">{explanation}</p>
                  {!isCorrect && question.question_type !== 'multiple_choice' && (
                    <div className="mt-3 pt-3 border-t border-white/[0.05]">
                      <span className="font-mono text-xs text-white/30 uppercase">Expected Answer</span>
                      <p className="text-sm text-white/50 mt-1">{correctAnswer}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session summary when complete */}
      {submitted && currentIndex >= questions.length - 1 && sessionTotal > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pillar-card text-center py-8"
        >
          <div className="text-3xl mb-3">
            {sessionCorrect / sessionTotal >= 0.8 ? '🎯' : sessionCorrect / sessionTotal >= 0.5 ? '📚' : '💪'}
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">Session Complete</h3>
          <p className="text-white/40 text-sm mb-4">
            You got {sessionCorrect} out of {sessionTotal} correct (
            {Math.round((sessionCorrect / sessionTotal) * 100)}%)
          </p>
          <button
            onClick={() => {
              setSessionCorrect(0);
              setSessionTotal(0);
              fetchQuestions();
            }}
            className="px-5 py-2.5 rounded-lg text-sm font-medium
              bg-gradient-to-r from-[#00e5ff]/20 to-[#10b981]/20
              border border-[#00e5ff]/30 text-white
              hover:from-[#00e5ff]/30 hover:to-[#10b981]/30 transition-all"
          >
            Start New Session
          </button>
        </motion.div>
      )}

      {/* Weak topics */}
      {weakTopics.length > 0 && (
        <div className="pillar-card">
          <h4 className="font-mono text-xs text-white/40 uppercase tracking-wider mb-3">
            Topics to Review
          </h4>
          <div className="flex flex-wrap gap-2">
            {weakTopics.map((topic) => (
              <span
                key={topic.topic_tag}
                className="px-3 py-1.5 rounded-lg text-xs font-mono
                  bg-red-500/10 border border-red-500/20 text-red-400"
              >
                {topic.topic_tag} ({topic.correct_count}/{topic.correct_count + topic.incorrect_count})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
