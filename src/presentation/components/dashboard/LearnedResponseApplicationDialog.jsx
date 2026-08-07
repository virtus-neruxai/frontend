import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import { statsApi } from '../../../lib/api';

/**
 * NRRM §8.6 — the user reporting that they applied the behaviour once.
 *
 * Only the user opens this. The system may notice a trigger came back (F7.2)
 * but it never fills this in on their behalf: a detected candidate is a
 * question, an application is a statement, and only the person can make it
 * (I11).
 *
 * `outcome` is deliberately optional and deliberately never aggregated: it
 * describes one moment, not progress. There is no "it went badly" that turns
 * into a number somewhere.
 */

// Same closed vocabulary the friction panel already names — trigger_category
// answers "what activated the old response", which is exactly a friction.
const FALLBACK_TRIGGER_LABELS = {
  unspecified: 'No sabría decir',
};

const OUTCOME_OPTIONS = [
  { value: 'better', label: 'Mejor que antes' },
  { value: 'same', label: 'Parecido' },
  { value: 'harder', label: 'Me costó' },
];

export function LearnedResponseApplicationDialog({ behavior, open, onSave, onClose }) {
  const [triggerCategory, setTriggerCategory] = useState('unspecified');
  const [triggerNote, setTriggerNote] = useState('');
  const [outcome, setOutcome] = useState('');
  const [saving, setSaving] = useState(false);
  const [labels, setLabels] = useState(FALLBACK_TRIGGER_LABELS);

  useEffect(() => {
    if (!open) return;
    setTriggerCategory('unspecified');
    setTriggerNote('');
    setOutcome('');
    // Fail-soft: without labels the select still works with "No sabría decir",
    // which is a valid answer, not a degraded one.
    statsApi
      .getFrictionLabels()
      .then((res) => {
        const fetched = res?.data?.labels || {};
        const { none, ...usable } = fetched;
        setLabels({ ...FALLBACK_TRIGGER_LABELS, ...usable });
      })
      .catch(() => setLabels(FALLBACK_TRIGGER_LABELS));
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(behavior?.response_key, {
        trigger_category: triggerCategory,
        trigger_note: triggerNote.trim() || null,
        outcome: outcome || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const options = Object.entries(labels).sort(([a], [b]) => {
    if (a === 'unspecified') return 1;
    if (b === 'unspecified') return -1;
    return labels[a].localeCompare(labels[b]);
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="application-dialog">
        <DialogHeader>
          <DialogTitle>Lo pusiste en práctica</DialogTitle>
          <p className="text-sm text-muted-foreground">{behavior?.alternative_response}</p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">¿Ante qué apareció?</Label>
            <Select value={triggerCategory} onValueChange={setTriggerCategory}>
              <SelectTrigger aria-label="Ante qué apareció">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map(([code, label]) => (
                  <SelectItem key={code} value={code}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="application-note" className="text-sm font-medium">
              Qué pasó <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="application-note"
              value={triggerNote}
              onChange={(e) => setTriggerNote(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Un par de palabras te bastan."
              className="resize-none text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Cómo te fue <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {OUTCOME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setOutcome(outcome === option.value ? '' : option.value)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    outcome === option.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {/* No "it went badly": this describes a moment, not your progress. */}
            <p className="text-xs text-muted-foreground">
              Esto no puntúa nada. Solo queda anotado por si te sirve releerlo.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
