/**
 * EditEmotionModal Component
 * 
 * Purpose:
 * - Modal for editing existing emotion
 * - Pre-populated with current values
 * - Allows deletion
 * 
 * Props:
 * - open: Boolean
 * - onOpenChange: Callback
 * - entry: Emotion entry object
 * - onSubmit: Callback with (id, payload)
 * - onDelete: Callback with id
 * 
 * Mobile Migration:
 * - Android: BottomSheet or dialog with delete action
 * - iOS: Sheet with destructive action button
 */

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { EMOTION_CATALOG } from '../../../lib/emotionConstants';
import { EmotionTaskLinkSection } from './EmotionTaskLinkSection';

const formatDateTimeInput = (value) => format(value, "yyyy-MM-dd'T'HH:mm");
const resolveEntryDate = (entry) => new Date(entry.occurred_at || entry.ts);

export function EditEmotionModal({ open, onOpenChange, entry, onSubmit, onDelete }) {
  const [polarity, setPolarity] = useState('');
  const [emotion, setEmotion] = useState('');
  const [intensity, setIntensity] = useState(0);
  const [note, setNote] = useState('');
  const [occurredAt, setOccurredAt] = useState(formatDateTimeInput(new Date()));
  const [linkToTask, setLinkToTask] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState('');

  // Load entry data when modal opens
  useEffect(() => {
    if (entry) {
      setPolarity(entry.polarity);
      setEmotion(entry.emotion);
      setIntensity(entry.intensity);
      setNote(entry.note || '');
      setOccurredAt(formatDateTimeInput(resolveEntryDate(entry)));
      setLinkToTask(entry.task_related === true);
      setSelectedTaskId(entry.related_task_id || '');
    }
  }, [entry]);

  const isReady = polarity && emotion && intensity && (!linkToTask || selectedTaskId);

  const handleSubmit = async () => {
    if (!entry || !isReady) {
      return;
    }
    
    const selectedDate = occurredAt ? new Date(occurredAt) : new Date();
    const success = await onSubmit(entry.id, {
      source: entry.source || 'user',
      polarity,
      emotion,
      intensity,
      occurred_at: selectedDate.toISOString(),
      note: note.trim() ? note.trim() : null,
      task_related: linkToTask,
      related_task_id: linkToTask ? selectedTaskId : null,
    });
    
    if (success) {
      onOpenChange(false);
    }
  };

  const handleDelete = async () => {
    if (!entry) return;
    
    const success = await onDelete(entry.id);
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="emotion-edit-modal">
        <DialogHeader>
          <DialogTitle>Editar emoción</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Polarity */}
          <div>
            <p className="text-sm font-medium text-[#18181B]">Polaridad</p>
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
                    if (EMOTION_CATALOG[value]?.every((item) => item.label !== emotion)) {
                      setEmotion('');
                    }
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Emotion */}
          <div>
            <p className="text-sm font-medium text-[#18181B]">Emoción</p>
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

          {/* Intensity */}
          <div>
            <p className="text-sm font-medium text-[#18181B]">Intensidad</p>
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

          {/* Note */}
          <div>
            <p className="text-sm font-medium text-[#18181B]">Nota (opcional)</p>
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
          </div>

          {/* Datetime */}
          <div>
            <p className="text-sm font-medium text-[#18181B]">Fecha y hora</p>
            <input
              className="mt-2 w-full rounded-md border border-[#E4E4E7] px-3 py-2 text-sm"
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
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            data-testid="delete-emotion-button"
          >
            Eliminar emoción
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!isReady}>
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
