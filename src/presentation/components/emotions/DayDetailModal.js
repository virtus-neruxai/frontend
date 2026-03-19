/**
 * DayDetailModal Component
 * 
 * Purpose:
 * - Modal showing all emotions for a specific day
 * - Allows editing and deleting individual emotions
 * 
 * Props:
 * - open: Boolean
 * - onOpenChange: Callback
 * - dateKey: String (yyyy-MM-dd)
 * - entries: Array of emotions for that day
 * - onEdit: Callback to trigger edit modal
 * - onDelete: Callback to delete emotion
 * 
 * Mobile Migration:
 * - Android: FullScreenDialog with RecyclerView
 * - iOS: Sheet with List
 */

import React from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';

const resolveEntryDate = (entry) => new Date(entry.occurred_at || entry.ts);

export function DayDetailModal({ open, onOpenChange, dateKey, entries = [], onEdit, onDelete }) {
  const formattedDate = dateKey
    ? format(new Date(`${dateKey}T00:00:00`), 'dd MMMM yyyy')
    : '';
  const sortedEntries = [...entries].sort((a, b) => resolveEntryDate(a) - resolveEntryDate(b));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="emotion-day-detail-modal">
        <DialogHeader>
          <DialogTitle>Detalle del día {formattedDate}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {sortedEntries.map((entry) => (
            <Card key={entry.id} className="p-3 border border-[#E4E4E7]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#18181B]">
                    <span className="text-lg">{entry.emoji}</span>
                    {entry.emotion}
                    <span className="text-xs text-[#71717A]">{entry.intensity}/5</span>
                  </div>
                  <div className="text-xs text-[#71717A]">
                    {format(resolveEntryDate(entry), 'HH:mm')}
                  </div>
                  {entry.note && <p className="text-xs text-[#52525B] mt-1">{entry.note}</p>}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      onEdit && onEdit(entry);
                      onOpenChange(false);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      await onDelete(entry.id);
                    }}
                    data-testid={`delete-emotion-${entry.id}`}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {sortedEntries.length === 0 && (
            <div className="text-sm text-[#71717A]">No hay emociones registradas.</div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
