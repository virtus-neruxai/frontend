/**
 * EmotionCalendar Component
 * 
 * Purpose:
 * - Display emotions in calendar view (month/week/day)
 * - Handle day clicks and emoji clicks
 * - Render different layouts for each view
 * 
 * Props:
 * - view: 'month' | 'week' | 'day'
 * - currentDate: Date object
 * - daysInRange: Array of Date objects
 * - groupedEntries: Object with date keys
 * - onDayClick: Callback for day click
 * - onEmojiClick: Callback for emoji click
 * - loading: Boolean loading state
 * 
 * Mobile Migration:
 * - Android: EmotionCalendar.kt composable with LazyColumn/Grid
 * - iOS: EmotionCalendar.swift with List or LazyVGrid
 */

import React from 'react';
import { format, isSameMonth } from 'date-fns';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const formatDateKey = (value) => format(value, 'yyyy-MM-dd');
const resolveEntryDate = (entry) => new Date(entry.occurred_at || entry.ts);

/**
 * Pick first entries ordered by occurrence time (oldest -> newest)
 */
const pickTopEntries = (entries, limit = 3) => {
  return [...entries]
    .sort((a, b) => resolveEntryDate(a) - resolveEntryDate(b))
    .slice(0, limit);
};

export function EmotionCalendar({
  view,
  currentDate,
  daysInRange,
  groupedEntries,
  onDayClick,
  onEmojiClick,
  loading
}) {
  if (loading) {
    return <Card className="p-6 text-sm text-[#71717A]">Cargando...</Card>;
  }

  // Month View
  if (view === 'month') {
    return (
      <div className="grid grid-cols-7 gap-2">
        {/* Weekday headers */}
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-xs font-semibold text-[#71717A]">
            {label}
          </div>
        ))}
        
        {/* Day cells */}
        {daysInRange.map((day) => {
          const dateKey = formatDateKey(day);
          const dayEntries = groupedEntries[dateKey] || [];
          const topEntries = pickTopEntries(dayEntries, 3);
          
          return (
            <Card
              key={dateKey}
              className={`min-h-[110px] p-2 cursor-pointer border border-[#E4E4E7] ${
                isSameMonth(day, currentDate) ? 'bg-white' : 'bg-[#F4F4F5]'
              }`}
              data-testid={`emotion-day-${dateKey}`}
              onClick={() => onDayClick && onDayClick(dateKey)}
            >
              <div className="text-xs font-semibold text-[#18181B]">
                {format(day, 'd')}
              </div>
              <div className="mt-2 flex flex-col gap-1">
                {topEntries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="flex items-center gap-2 text-left text-sm"
                    data-testid={`emotion-emoji-${entry.id}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onEmojiClick && onEmojiClick(entry);
                    }}
                  >
                    <span className="text-lg">{entry.emoji}</span>
                    <span className="text-xs text-[#71717A]">
                      {format(resolveEntryDate(entry), 'HH:mm')}
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    );
  }

  // Week View
  if (view === 'week') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {daysInRange.map((day) => {
          const dateKey = formatDateKey(day);
          const dayEntries = groupedEntries[dateKey] || [];
          const topEntries = pickTopEntries(dayEntries, 3);
          
          return (
            <Card
              key={dateKey}
              className="min-h-[160px] p-3 border border-[#E4E4E7] cursor-pointer"
              onClick={() => onDayClick && onDayClick(dateKey)}
            >
              <div className="text-xs font-semibold text-[#18181B]">
                {format(day, 'EEE d')}
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {topEntries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="flex items-center justify-between gap-2 rounded-lg bg-[#FFF7ED] px-2 py-1 text-sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEmojiClick && onEmojiClick(entry);
                    }}
                  >
                    <span className="text-base">{entry.emoji}</span>
                    <span className="text-xs text-[#71717A]">
                      {format(resolveEntryDate(entry), 'HH:mm')}
                    </span>
                  </button>
                ))}
              </div>
              {dayEntries.length > 3 && (
                <Button
                  variant="ghost"
                  className="mt-2 text-xs text-[#71717A]"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDayClick && onDayClick(dateKey);
                  }}
                >
                  Ver todo ({dayEntries.length})
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    );
  }

  // Day View
  const dateKey = formatDateKey(currentDate);
  const dayEntries = [...(groupedEntries[dateKey] || [])].sort(
    (a, b) => resolveEntryDate(a) - resolveEntryDate(b)
  );

  return (
    <Card className="p-4 border border-[#E4E4E7]">
      <div className="space-y-3">
        {dayEntries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start justify-between border-b border-[#E4E4E7] pb-3"
          >
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#18181B]">
                <span className="text-xl">{entry.emoji}</span>
                {entry.emotion}
                <span className="text-xs text-[#71717A]">{entry.intensity}/5</span>
              </div>
              <div className="text-xs text-[#71717A]">
                {format(resolveEntryDate(entry), 'HH:mm')}
              </div>
              {entry.note && (
                <p className="mt-1 text-sm text-[#52525B]">{entry.note}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onEmojiClick && onEmojiClick(entry)}
              >
                Editar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (window.confirm('¿Eliminar esta emoción?')) {
                    // This should be handled by parent with deleteEmotion callback
                    // For now, trigger onEmojiClick and handle in modal
                  }
                }}
              >
                Eliminar
              </Button>
            </div>
          </div>
        ))}
        {dayEntries.length === 0 && (
          <div className="text-sm text-[#71717A]">Sin emociones registradas.</div>
        )}
      </div>
    </Card>
  );
}
