import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Switch } from '../../../components/ui/switch';
import { Slider } from '../../../components/ui/slider';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';

const PROGRESS_LABELS = {
  1: 'Apenas reconocido',
  2: 'Entendiendo la causa',
  3: 'Trabajando en ello',
  4: 'Notando mejora',
  5: 'Resuelto',
};

export function EmotionalPatternAcknowledgeDialog({ pattern, onSave, onClose, open }) {
  const existing = pattern || {};
  const [confirmed, setConfirmed] = useState(existing.user_confirmed ?? false);
  const [working, setWorking] = useState(existing.user_working ?? false);
  const [progress, setProgress] = useState(existing.user_progress ?? 1);
  const [notes, setNotes] = useState(existing.user_notes ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(existing.pattern_key, {
        confirmed,
        working_on_it: confirmed ? working : false,
        progress: confirmed ? progress : 1,
        notes: notes.trim() || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const rangeLabel = existing.range ? `×${existing.count} señales en los últimos ${existing.range} días` : `×${existing.count || 0} señales detectadas`;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existing.label || existing.pattern_key}</DialogTitle>
          <p className="text-sm text-muted-foreground">{rangeLabel}</p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Step 1: Confirm */}
          <div className="flex items-center justify-between">
            <Label htmlFor="emotional-pattern-confirmed" className="text-sm font-medium leading-snug">
              ¿Reconoces este patrón en ti?
            </Label>
            <Switch
              id="emotional-pattern-confirmed"
              checked={confirmed}
              onCheckedChange={setConfirmed}
            />
          </div>

          {confirmed && (
            <>
              {/* Step 2: Working on it */}
              <div className="flex items-center justify-between">
                <Label htmlFor="emotional-pattern-working" className="text-sm font-medium leading-snug">
                  ¿Estás trabajando activamente en ello?
                </Label>
                <Switch
                  id="emotional-pattern-working"
                  checked={working}
                  onCheckedChange={setWorking}
                />
              </div>

              {/* Step 3: Progress 1-5 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">¿Cómo de cerca estás de resolverlo?</Label>
                  <span className="text-sm font-semibold text-primary">{progress} / 5</span>
                </div>
                <Slider
                  min={1}
                  max={5}
                  step={1}
                  value={[progress]}
                  onValueChange={([v]) => setProgress(v)}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground px-0.5">
                  <span>Apenas reconocido</span>
                  <span>Resuelto</span>
                </div>
                <p className="text-xs text-center font-medium text-foreground">
                  {PROGRESS_LABELS[progress]}
                </p>
              </div>

              {/* Step 4: Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="emotional-pattern-notes" className="text-sm font-medium">
                  Notas o aprendizajes <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Textarea
                  id="emotional-pattern-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="¿Qué has descubierto sobre este patrón?"
                  className="resize-none text-sm"
                />
              </div>

              {/* Resolution callout */}
              {progress === 5 && (
                <div className="rounded-md bg-[hsl(var(--success-soft))] px-3 py-2 text-sm text-[hsl(var(--success))]">
                  Al guardar, este patrón pasará a tu lista de <strong>patrones superados</strong>.
                </div>
              )}
            </>
          )}

        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
