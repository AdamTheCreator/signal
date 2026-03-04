'use client';

import { motion } from 'framer-motion';
import type { TabId } from '@/types';

interface TabNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'brief', label: 'Daily Brief', icon: '◈' },
  { id: 'quiz', label: 'Quiz Bank', icon: '◎' },
  { id: 'topics', label: 'Topic Generator', icon: '◆' },
];

export default function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    <nav className="flex border-b border-white/[0.08]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`tab-button relative flex items-center gap-2 ${
            activeTab === tab.id ? 'active' : ''
          }`}
        >
          <span className="font-mono text-xs">{tab.icon}</span>
          <span>{tab.label}</span>
          {activeTab === tab.id && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5"
              style={{
                background: 'linear-gradient(90deg, #00e5ff, #10b981)',
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
        </button>
      ))}
    </nav>
  );
}
