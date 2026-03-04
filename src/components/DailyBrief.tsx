'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingCard from './LoadingCard';
import type { Brief, IntelItem, DeepContext, ConceptOfDay, InterviewEdge } from '@/types';

const PILLAR_CONFIG = {
  intel: { label: "TODAY'S INTEL", color: '#00e5ff', icon: '◈' },
  deep_context: { label: 'DEEP CONTEXT', color: '#7c3aed', icon: '◎' },
  concept: { label: 'CONCEPT OF THE DAY', color: '#10b981', icon: '◉' },
  interview_edge: { label: 'INTERVIEW EDGE', color: '#f59e0b', icon: '◆' },
};

function IntelCard({ data }: { data: IntelItem[] }) {
  return (
    <div className="space-y-4">
      {data.map((item, i) => (
        <div key={i} className="space-y-1.5">
          <h4 className="font-semibold text-white text-sm">{item.headline}</h4>
          <p className="text-sm text-white/60 leading-relaxed">{item.summary}</p>
          <div className="flex items-start gap-2 mt-2 p-2.5 rounded-lg bg-[#00e5ff]/[0.04] border border-[#00e5ff]/[0.1]">
            <span className="text-[#00e5ff] text-xs font-mono mt-0.5 shrink-0">WHY IT MATTERS</span>
            <p className="text-xs text-white/70 leading-relaxed">{item.whyItMatters}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function DeepContextCard({ data }: { data: DeepContext }) {
  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-white text-sm">{data.topic}</h4>
      {[
        { label: 'Origin', text: data.origin },
        { label: 'Evolution', text: data.evolution },
        { label: 'Inflections', text: data.inflections },
        { label: 'Trajectory', text: data.trajectory },
        { label: 'Customer Narrative', text: data.customerNarrative },
      ].map(({ label, text }) => (
        <div key={label}>
          <span className="font-mono text-xs text-[#7c3aed] uppercase tracking-wider">
            {label}
          </span>
          <p className="text-sm text-white/60 leading-relaxed mt-1">{text}</p>
        </div>
      ))}
    </div>
  );
}

function ConceptCard({ data }: { data: ConceptOfDay }) {
  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-white text-sm">{data.concept}</h4>
      {[
        { label: 'Plain English', text: data.plainEnglish },
        { label: 'Technical', text: data.technical },
        { label: 'Enterprise Use Case', text: data.enterpriseUseCase },
        { label: 'Misconceptions', text: data.misconceptions },
        { label: 'Interview Answer', text: data.interviewAnswer },
      ].map(({ label, text }) => (
        <div key={label}>
          <span className="font-mono text-xs text-[#10b981] uppercase tracking-wider">
            {label}
          </span>
          <p className="text-sm text-white/60 leading-relaxed mt-1">{text}</p>
        </div>
      ))}
    </div>
  );
}

function InterviewEdgeCard({ data }: { data: InterviewEdge }) {
  return (
    <div className="space-y-3">
      {[
        { label: 'Focus This Week', text: data.focusThisWeek },
        { label: 'Likely Question', text: data.likelyQuestion },
        { label: 'Answer Framework', text: data.answerFramework },
        { label: 'Technical Brush-Up', text: data.technicalBrushUp },
        { label: "Show Don't Tell", text: data.showDontTell },
      ].map(({ label, text }) => (
        <div key={label}>
          <span className="font-mono text-xs text-[#f59e0b] uppercase tracking-wider">
            {label}
          </span>
          <p className="text-sm text-white/60 leading-relaxed mt-1">{text}</p>
        </div>
      ))}
    </div>
  );
}

export default function DailyBrief() {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPillars, setLoadingPillars] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Load today's brief on mount
  useEffect(() => {
    fetchExistingBrief();
  }, []);

  async function fetchExistingBrief() {
    try {
      const res = await fetch('/api/brief/generate');
      const data = await res.json();
      if (data.briefs && data.briefs.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        const todaysBrief = data.briefs.find((b: Brief) => b.date === todayStr);
        if (todaysBrief) {
          setBrief(todaysBrief);
        }
      }
    } catch {
      // No existing brief, that's fine
    }
  }

  async function generateBrief() {
    setLoading(true);
    setError(null);
    setLoadingPillars({
      intel: true,
      deep_context: true,
      concept: true,
      interview_edge: true,
    });

    try {
      const res = await fetch('/api/brief/generate', { method: 'POST' });
      if (!res.ok) {
        throw new Error('Failed to generate brief');
      }
      const data = await res.json();
      setBrief(data.brief);
      setLoadingPillars({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate brief');
      setLoadingPillars({});
    } finally {
      setLoading(false);
    }
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.15,
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
      },
    }),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Daily Brief</h2>
          <p className="text-sm text-white/40 font-mono mt-1">{today}</p>
        </div>
        <button
          onClick={generateBrief}
          disabled={loading}
          className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all
            bg-gradient-to-r from-[#00e5ff]/20 to-[#10b981]/20
            border border-[#00e5ff]/30 text-white
            hover:from-[#00e5ff]/30 hover:to-[#10b981]/30
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center gap-2 self-start sm:self-auto"
        >
          {loading ? (
            <>
              <div className="spinner w-4 h-4" style={{ borderTopColor: '#00e5ff' }} />
              Generating...
            </>
          ) : brief ? (
            'Refresh Brief'
          ) : (
            "Generate Today's Brief"
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && !brief && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Object.entries(PILLAR_CONFIG).map(([key, config]) => (
            <LoadingCard key={key} pillar={config.label} color={config.color} />
          ))}
        </div>
      )}

      {/* Brief content */}
      <AnimatePresence mode="wait">
        {brief && !loading && (
          <motion.div
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
          >
            {/* Intel */}
            <motion.div
              custom={0}
              variants={cardVariants}
              className="pillar-card"
              style={{ borderTopColor: PILLAR_CONFIG.intel.color, borderTopWidth: '2px' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="font-mono text-sm" style={{ color: PILLAR_CONFIG.intel.color }}>
                  {PILLAR_CONFIG.intel.icon}
                </span>
                <span
                  className="font-mono text-xs uppercase tracking-wider"
                  style={{ color: PILLAR_CONFIG.intel.color }}
                >
                  {PILLAR_CONFIG.intel.label}
                </span>
              </div>
              <IntelCard data={brief.intel} />
            </motion.div>

            {/* Deep Context */}
            <motion.div
              custom={1}
              variants={cardVariants}
              className="pillar-card"
              style={{ borderTopColor: PILLAR_CONFIG.deep_context.color, borderTopWidth: '2px' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="font-mono text-sm" style={{ color: PILLAR_CONFIG.deep_context.color }}>
                  {PILLAR_CONFIG.deep_context.icon}
                </span>
                <span
                  className="font-mono text-xs uppercase tracking-wider"
                  style={{ color: PILLAR_CONFIG.deep_context.color }}
                >
                  {PILLAR_CONFIG.deep_context.label}
                </span>
              </div>
              <DeepContextCard data={brief.deep_context} />
            </motion.div>

            {/* Concept */}
            <motion.div
              custom={2}
              variants={cardVariants}
              className="pillar-card"
              style={{ borderTopColor: PILLAR_CONFIG.concept.color, borderTopWidth: '2px' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="font-mono text-sm" style={{ color: PILLAR_CONFIG.concept.color }}>
                  {PILLAR_CONFIG.concept.icon}
                </span>
                <span
                  className="font-mono text-xs uppercase tracking-wider"
                  style={{ color: PILLAR_CONFIG.concept.color }}
                >
                  {PILLAR_CONFIG.concept.label}
                </span>
              </div>
              <ConceptCard data={brief.concept} />
            </motion.div>

            {/* Interview Edge */}
            <motion.div
              custom={3}
              variants={cardVariants}
              className="pillar-card"
              style={{ borderTopColor: PILLAR_CONFIG.interview_edge.color, borderTopWidth: '2px' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="font-mono text-sm" style={{ color: PILLAR_CONFIG.interview_edge.color }}>
                  {PILLAR_CONFIG.interview_edge.icon}
                </span>
                <span
                  className="font-mono text-xs uppercase tracking-wider"
                  style={{ color: PILLAR_CONFIG.interview_edge.color }}
                >
                  {PILLAR_CONFIG.interview_edge.label}
                </span>
              </div>
              <InterviewEdgeCard data={brief.interview_edge} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!brief && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-4xl mb-4 opacity-20">◈</div>
          <h3 className="text-lg font-medium text-white/50 mb-2">No brief generated yet</h3>
          <p className="text-sm text-white/30 max-w-md">
            Hit the button above to generate your personalized daily intelligence brief.
            Each brief covers 4 pillars tailored to your OpenAI SE preparation.
          </p>
        </div>
      )}
    </div>
  );
}
