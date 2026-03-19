/**
 * AddEmotionModal Component
 * 
 * Purpose:
 * - Modal for adding new emotion
 * - 5-step wizard: polarity → emotion → intensity → note → datetime
 * 
 * Props:
 * - open: Boolean
 * - onOpenChange: Callback
 * - onSubmit: Callback with payload
 * 
 * Mobile Migration:
 * - Android: BottomSheet or fullscreen dialog with stepper
 * - iOS: Sheet or fullScreenCover with step navigation
 */

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { EMOTION_CATALOG } from '../../../lib/emotionConstants';
import { EmotionTaskLinkSection } from './EmotionTaskLinkSection';

const formatDateKey = (value) => format(value, 'yyyy-MM-dd');
const formatDateTimeInput = (value) => format(value, "yyyy-MM-dd'T'HH:mm");

export function AddEmotionModal({ open, onOpenChange, onSubmit }) {
  const [polarity, setPolarity] = useState('');
  const [emotion, setEmotion] = useState('');
  const [intensity, setIntensity] = useState(0);
  const [note, setNote] = useState('');
  const [occurredAt, setOccurredAt] = useState(formatDateTimeInput(new Date()));
  const [linkToTask, setLinkToTask] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState('');

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setPolarity('');
      setEmotion('');
      setIntensity(0);
      setNote('');
      setOccurredAt(formatDateTimeInput(new Date()));
      setLinkToTask(false);
      setSelectedTaskId('');
    }
  }, [open]);

  const isReady = polarity && emotion && intensity && (!linkToTask || selectedTaskId);

  const handleSubmit = async () => {
    if (!isReady) {
      toast.error('Completa todos los pasos');
      return;
    }
    
    const occurredAtDate = occurredAt ? new Date(occurredAt) : new Date();
    const success = await onSubmit({
      date: formatDateKey(occurredAtDate),
      occurred_at: occurredAtDate.toISOString(),
      source: 'user',
      polarity,
      emotion,
      intensity,
      note: note.trim() ? note.trim() : null,
      task_related: linkToTask,
      related_task_id: linkToTask ? selectedTaskId : null,
    });
    
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#18181B] dark:text-white">Registrar emoción</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Step 1: Polarity */}
          <div>
            <p className="text-sm font-medium text-[#18181B] dark:text-white">1. Polaridad</p>
            <div className="mt-2 flex gap-2">
              {[
                { value: 'positive', label: 'Positiva' },
                { value: 'neutral', label: 'Neutral' },
                { value: 'negative', label: 'Negativa' },
              ].map(({ value, label }) => (
                <Button
                  key={value}
                  variant={polarity === value ? 'default' : 'outline'}
                  onClick={() => {
                    setPolarity(value);
                    setEmotion('');
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Step 2: Emotion */}
          <div>
            <p className="text-sm font-medium text-[#18181B] dark:text-white">2. Emoción</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(EMOTION_CATALOG[polarity] || []).map((item) => (
                <Button
                  key={item.label}
                  variant={emotion === item.label ? 'default' : 'outline'}
                  onClick={() => setEmotion(item.label)}
                  className="gap-2"
                >
                  <span>{item.emoji}</span>
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Step 3: Intensity */}
          <div>
            <p className="text-sm font-medium text-[#18181B] dark:text-white">3. Intensidad</p>
            <div className="mt-2 flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <Button
                  key={value}
                  variant={intensity === value ? 'default' : 'outline'}
                  onClick={() => setIntensity(value)}
                >
                  {value}
                </Button>
              ))}
            </div>
          </div>

          {/* Step 4: Note */}
          <div>
            <p className="text-sm font-medium text-[#18181B] dark:text-white">4. Nota (opcional)</p>
            <Textarea
              className="bg-white text-black placeholder:text-gray-500 dark:bg-white dark:text-black"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Escribe una nota..."
            />
          </div>

          {/* Step 5: Datetime */}
          <div>
            <p className="text-sm font-medium text-[#18181B] dark:text-white">5. Fecha y hora</p>
            <input
              className="mt-2 w-full rounded-md border border-[#E4E4E7] px-3 py-2 text-sm bg-white text-black dark:bg-white dark:text-black"
              type="datetime-local"
              value={occurredAt}
              onChange={(event) => setOccurredAt(event.target.value)}
            />
          </div>

          <EmotionTaskLinkSection
            open={open}
            occurredAt={occurredAt}
            linkToTask={linkToTask}
            onLinkToTaskChange={setLinkToTask}
            selectedTaskId={selectedTaskId}
            onSelectedTaskIdChange={setSelectedTaskId}
          />
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!isReady}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
