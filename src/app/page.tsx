'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TabNav from '@/components/TabNav';
import DailyBrief from '@/components/DailyBrief';
import QuizBank from '@/components/QuizBank';
import TopicGenerator from '@/components/TopicGenerator';
import type { TabId } from '@/types';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('brief');

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00e5ff] to-[#7c3aed] flex items-center justify-center">
                <span className="text-white text-sm font-bold">S</span>
              </div>
              <div>
                <h1 className="text-white font-semibold text-lg tracking-tight">SIGNAL</h1>
                <p className="text-white/30 text-xs font-mono">AI Learning Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div className="w-2 h-2 rounded-full bg-[#10b981]" />
                <span className="text-xs text-white/40 font-mono">Adam</span>
              </div>
            </div>
          </div>
          <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'brief' && <DailyBrief />}
            {activeTab === 'quiz' && <QuizBank />}
            {activeTab === 'topics' && <TopicGenerator />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
