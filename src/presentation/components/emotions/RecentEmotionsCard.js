/**
 * RecentEmotionsCard Component
 * 
 * Purpose:
 * - Display recent emotions in sidebar
 * - Show emotion details with timestamp
 * 
 * Props:
 * - recentEntries: Array of recent emotion entries
 * 
 * Mobile Migration:
 * - Android: RecentEmotionsCard.kt composable with LazyColumn
 * - iOS: RecentEmotionsCard.swift with List
 */

import React from 'react';
import { format } from 'date-fns';
import { Card } from '../../../components/ui/card';

const resolveEntryDate = (entry) => new Date(entry.occurred_at || entry.ts);
const resolveSource = (entry) => entry.source === 'mentor' ? 'mentor' : 'user';

const SOURCE_STYLES = {
  user: 'bg-slate-100 text-slate-700 border-slate-200',
  mentor: 'bg-amber-100 text-amber-800 border-amber-200',
};

const SOURCE_LABEL = {
  user: 'Yo',
  mentor: 'Mentor',
};

export function RecentEmotionsCard({ recentEntries = [] }) {
  return (
    <Card className="p-4 border border-[#E4E4E7]" data-testid="recent-emotions">
      <h2 className="text-sm font-semibold text-[#18181B] dark:text-white">Recientes</h2>
      <div className="mt-3 space-y-3">
        {recentEntries.map((entry) => (
          <div key={entry.id} className="border-b border-[#E4E4E7] pb-3 last:border-0">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-[#71717A]">
                {format(resolveEntryDate(entry), 'dd/MM/yyyy HH:mm')}
              </div>
              <span
                className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SOURCE_STYLES[resolveSource(entry)]}`}
              >
                {SOURCE_LABEL[resolveSource(entry)]}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-[#18181B] dark:text-white">
              {entry.emotion}
              <span className="text-xs text-[#71717A]">{entry.intensity}/5</span>
            </div>
            {entry.note && (
              <p className="mt-1 text-xs text-[#52525B]" data-testid={`recent-note-${entry.id}`}>
                {entry.note}
              </p>
            )}
          </div>
        ))}
        {recentEntries.length === 0 && (
          <div className="text-xs text-[#71717A]">Sin emociones recientes.</div>
        )}
      </div>
    </Card>
  );
}
