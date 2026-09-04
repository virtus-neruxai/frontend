import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';

export function HealthPracticeApplicationDialog({ practice, open, onSave, onClose }) {
  const [applicationDate, setApplicationDate] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setApplicationDate(new Date().toISOString().slice(0, 10));
    setNote('');
    setError('');
  }, [open]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await onSave?.(practice?.practice_key, {
        application_date: applicationDate || null,
        note: note.trim() || null,
      });
      onClose();
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail
        || 'No se pudo guardar esta aplicación. Puedes volver a intentarlo.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="health-practice-application-dialog">
        <DialogHeader>
          <DialogTitle>Lo has hecho</DialogTitle>
          <p className="text-sm text-muted-foreground">{practice?.title}</p>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="health-practice-date">Fecha</Label>
            <Input
              id="health-practice-date"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={applicationDate}
              onChange={(event) => setApplicationDate(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="health-practice-note">
              Nota <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="health-practice-note"
              rows={3}
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Unas palabras bastan."
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Esto registra un hecho. No crea una tarea, una racha ni una puntuación.
          </p>
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button size="sm" onClick={save} disabled={saving || !applicationDate}>
            {saving ? 'Guardando…' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
