'use client';

interface LoadingCardProps {
  pillar: string;
  color: string;
}

export default function LoadingCard({ pillar, color }: LoadingCardProps) {
  return (
    <div
      className="pillar-card"
      style={{ borderTopColor: color, borderTopWidth: '2px' }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="spinner" style={{ borderTopColor: color }} />
        <span
          className="font-mono text-xs uppercase tracking-wider"
          style={{ color }}
        >
          {pillar}
        </span>
      </div>
      <div className="space-y-3">
        <div className="h-4 bg-white/[0.05] rounded loading-pulse w-3/4" />
        <div className="h-4 bg-white/[0.05] rounded loading-pulse w-full" />
        <div className="h-4 bg-white/[0.05] rounded loading-pulse w-5/6" />
        <div className="h-4 bg-white/[0.05] rounded loading-pulse w-2/3" />
      </div>
    </div>
  );
}
