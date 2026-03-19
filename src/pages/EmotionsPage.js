/**
 * EmotionsPageRefactored.js
 * 
 * Purpose:
 * - Main emotions page composition using hooks and components
 * - Clean Architecture pattern: separates business logic from UI
 * - Reduced from 778 lines to ~180 lines
 * 
 * Architecture:
 * - useEmotions hook handles state and business logic (ViewModel)
 * - Components handle UI rendering (View layer)
 * - This file orchestrates composition (Controller/Coordinator)
 * 
 * Mobile Migration:
 * - Android: EmotionsScreen.kt composable with ViewModel injection
 * - iOS: EmotionsView.swift with ObservableObject ViewModel
 */

import React, { useState } from 'react';
import { format } from 'date-fns';
import { Plus, ChevronLeft, ChevronRight, Calendar, LayoutGrid, Clock } from 'lucide-react';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

// Hooks (ViewModels)
import { useEmotions } from '../presentation/viewmodels/useEmotions';

// Components (View layer)
import { EmotionCalendar } from '../presentation/components/emotions/EmotionCalendar';
import { RecentEmotionsCard } from '../presentation/components/emotions/RecentEmotionsCard';
import { AddEmotionModal } from '../presentation/components/emotions/AddEmotionModal';
import { EditEmotionModal } from '../presentation/components/emotions/EditEmotionModal';
import { DayDetailModal } from '../presentation/components/emotions/DayDetailModal';

const VIEW_LABELS = {
  month: 'Mes',
  week: 'Semana',
  day: 'Día',
};

const formatTitle = (view, currentDate) => {
  if (view === 'week') {
    const start = new Date(currentDate);
    const end = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay() + 1); // Monday
    end.setDate(end.getDate() + (7 - end.getDay())); // Sunday
    return `Semana ${format(start, 'dd MMM')} - ${format(end, 'dd MMM')}`;
  }
  if (view === 'day') {
    return format(currentDate, 'dd MMMM yyyy');
  }
  return format(currentDate, 'MMMM yyyy');
};

export default function EmotionsPageRefactored() {
  // ViewModel (business logic)
  const emotions = useEmotions();
  
  // Local UI state
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Handle day click (show day detail modal)
  const handleDayClick = (dateKey) => {
    setSelectedDay(dateKey);
  };

  // Handle emoji click (show edit modal)
  const handleEmojiClick = (entry) => {
    setSelectedEntry(entry);
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6" data-testid="emotions-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1
              className="text-2xl font-bold text-[#18181B] dark:text-white"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Emociones
            </h1>
            <div className="flex items-center gap-2 text-sm text-[#71717A]">
              <Calendar className="w-4 h-4" />
              <span>{formatTitle(emotions.view, emotions.currentDate)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={emotions.handlePrev}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={emotions.handleToday}>
              Hoy
            </Button>
            <Button variant="outline" size="icon" onClick={emotions.handleNext}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content */}
          <div className="flex-1 space-y-4">
            {/* View Selector */}
            <div className="flex items-center gap-2">
              {Object.keys(VIEW_LABELS).map((key) => (
                <Button
                  key={key}
                  variant={emotions.view === key ? 'default' : 'outline'}
                  onClick={() => emotions.handleViewChange(key)}
                  className="gap-2"
                  data-testid={`emotion-view-${key}`}
                >
                  {key === 'month' && <LayoutGrid className="w-4 h-4" />}
                  {key === 'week' && <Calendar className="w-4 h-4" />}
                  {key === 'day' && <Clock className="w-4 h-4" />}
                  {VIEW_LABELS[key]}
                </Button>
              ))}
            </div>

            {/* Calendar */}
            <EmotionCalendar
              view={emotions.view}
              currentDate={emotions.currentDate}
              daysInRange={emotions.daysInRange}
              groupedEntries={emotions.groupedEntries}
              onDayClick={handleDayClick}
              onEmojiClick={handleEmojiClick}
              loading={emotions.loading}
            />
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-[320px] space-y-4">
            {/* Add Button */}
            <Card className="p-4 border border-[#E4E4E7]">
              <Button
                className="w-full gap-2 bg-[#F97316] hover:bg-[#EA580C]"
                onClick={() => setShowAddModal(true)}
              >
                <Plus className="w-4 h-4" />
                Registrar emoción
              </Button>
            </Card>

            {/* Recent Emotions */}
            <RecentEmotionsCard recentEntries={emotions.recentEntries} />
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddEmotionModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSubmit={emotions.createEmotion}
      />

      <DayDetailModal
        open={!!selectedDay}
        onOpenChange={() => setSelectedDay(null)}
        dateKey={selectedDay}
        entries={selectedDay ? emotions.groupedEntries[selectedDay] || [] : []}
        onEdit={setSelectedEntry}
        onDelete={emotions.deleteEmotion}
      />

      <EditEmotionModal
        open={!!selectedEntry}
        onOpenChange={() => setSelectedEntry(null)}
        entry={selectedEntry}
        onSubmit={emotions.updateEmotion}
        onDelete={emotions.deleteEmotion}
      />
    </Layout>
  );
}
