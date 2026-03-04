'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TopicSuggestion, TopicDeepDive } from '@/types';

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: '#10b981',
  intermediate: '#f59e0b',
  advanced: '#ef4444',
};

export default function TopicGenerator() {
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [generatingTopic, setGeneratingTopic] = useState<string | null>(null);
  const [deepDives, setDeepDives] = useState<Record<string, TopicDeepDive>>({});

  useEffect(() => {
    fetchSuggestions();
  }, []);

  async function fetchSuggestions() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/topics/suggest');
      const data = await res.json();
      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch {
      setError('Failed to load topic suggestions');
    } finally {
      setLoading(false);
    }
  }

  async function generateDeepDive(topic: string) {
    if (deepDives[topic]) return; // Already generated

    setGeneratingTopic(topic);
    try {
      const res = await fetch('/api/topics/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      if (data.deepDive) {
        setDeepDives((prev) => ({ ...prev, [topic]: data.deepDive }));
      }
    } catch {
      setError(`Failed to generate deep dive for "${topic}"`);
    } finally {
      setGeneratingTopic(null);
    }
  }

  async function generateCustomTopic() {
    if (!customTopic.trim()) return;
    const topic = customTopic.trim();
    setCustomTopic('');

    // Add as a suggestion card
    const newSuggestion: TopicSuggestion = {
      title: topic,
      whyItMatters: 'Custom topic requested by you',
      estimatedReadTime: '5 min read',
      difficulty: 'intermediate',
      topicTag: topic.toLowerCase().replace(/\s+/g, '_'),
    };
    setSuggestions((prev) => [newSuggestion, ...prev]);

    // Auto-generate deep dive
    await generateDeepDive(topic);
  }

  function DeepDiveContent({ dive }: { dive: TopicDeepDive }) {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-4 pt-4 border-t border-white/[0.06] space-y-3"
      >
        {[
          { label: 'Plain English', text: dive.plainEnglish, color: '#00e5ff' },
          { label: 'Technical Deep Dive', text: dive.technical, color: '#7c3aed' },
          { label: 'Enterprise Use Case', text: dive.enterpriseUseCase, color: '#10b981' },
          { label: 'Common Misconceptions', text: dive.misconceptions, color: '#f59e0b' },
          { label: 'Interview Answer Framework', text: dive.interviewAnswer, color: '#ef4444' },
        ].map(({ label, text, color }) => (
          <div key={label}>
            <span className="font-mono text-xs uppercase tracking-wider" style={{ color }}>
              {label}
            </span>
            <p className="text-sm text-white/60 leading-relaxed mt-1">{text}</p>
          </div>
        ))}
      </motion.div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="spinner mb-4" style={{ width: 32, height: 32 }} />
        <p className="text-white/40 text-sm">Analyzing your quiz performance...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-white">Topic Generator</h2>
        <p className="text-sm text-white/40 mt-1">
          Adaptive topics based on your quiz performance gaps
        </p>
      </div>

      {/* Custom topic input */}
      <div className="flex gap-3">
        <input
          type="text"
          value={customTopic}
          onChange={(e) => setCustomTopic(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && generateCustomTopic()}
          placeholder="Request any topic for a deep dive..."
          className="flex-1 px-4 py-3 rounded-lg bg-white/[0.03] border border-white/[0.08]
            text-white text-sm placeholder:text-white/20
            focus:outline-none focus:border-white/20 transition-colors"
        />
        <button
          onClick={generateCustomTopic}
          disabled={!customTopic.trim() || generatingTopic !== null}
          className="px-5 py-3 rounded-lg text-sm font-medium
            bg-gradient-to-r from-[#7c3aed]/20 to-[#f59e0b]/20
            border border-[#7c3aed]/30 text-white
            hover:from-[#7c3aed]/30 hover:to-[#f59e0b]/30
            disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          Generate
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Topic suggestions */}
      <div className="space-y-4">
        <AnimatePresence>
          {suggestions.map((suggestion, i) => {
            const diffColor = DIFFICULTY_COLORS[suggestion.difficulty] || '#00e5ff';
            const dive = deepDives[suggestion.title];
            const isGenerating = generatingTopic === suggestion.title;

            return (
              <motion.div
                key={suggestion.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="pillar-card"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-white text-sm">{suggestion.title}</h3>
                      <span
                        className="px-2 py-0.5 rounded text-xs font-mono"
                        style={{
                          color: diffColor,
                          backgroundColor: `${diffColor}15`,
                          border: `1px solid ${diffColor}30`,
                        }}
                      >
                        {suggestion.difficulty}
                      </span>
                    </div>
                    <p className="text-sm text-white/50 leading-relaxed">{suggestion.whyItMatters}</p>
                    <span className="font-mono text-xs text-white/30 mt-2 inline-block">
                      {suggestion.estimatedReadTime}
                    </span>
                  </div>

                  <button
                    onClick={() => generateDeepDive(suggestion.title)}
                    disabled={isGenerating || !!dive}
                    className="px-4 py-2 rounded-lg text-xs font-medium
                      bg-white/[0.05] border border-white/[0.08] text-white/70
                      hover:bg-white/[0.08] hover:text-white
                      disabled:opacity-30 disabled:cursor-not-allowed
                      transition-all flex items-center gap-2 self-start shrink-0"
                  >
                    {isGenerating ? (
                      <>
                        <div className="spinner w-3 h-3" />
                        Generating...
                      </>
                    ) : dive ? (
                      'Generated ✓'
                    ) : (
                      'Generate Deep Dive'
                    )}
                  </button>
                </div>

                {/* Deep dive content */}
                <AnimatePresence>
                  {dive && <DeepDiveContent dive={dive} />}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {suggestions.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-4xl mb-4 opacity-20">◆</div>
          <h3 className="text-lg font-medium text-white/50 mb-2">No suggestions yet</h3>
          <p className="text-sm text-white/30 max-w-md">
            Complete some quizzes first so we can identify your learning gaps, or type a
            custom topic above to generate a deep dive on any subject.
          </p>
        </div>
      )}
    </div>
  );
}
