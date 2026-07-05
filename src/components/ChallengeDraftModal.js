import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Repeat, Clock, Brain, TrendingUp } from 'lucide-react';
import { formatStatLabel } from '../lib/statUtils';
import { normalizeTaskDomain, TASK_DOMAIN_OPTIONS } from '../lib/taskDomains';

const CHALLENGE_TYPE_LABELS = {
  daily: 'Diario (cada día)',
  weekly: 'Semanal (cada semana)',
  monthly: 'Mensual (cada mes)',
};

const CHALLENGE_TYPE_COLORS = {
  daily: 'bg-[hsl(var(--info))]',
  weekly: 'bg-primary',
  monthly: 'bg-[hsl(var(--virtus-secondary))]',
};

// 0 = domingo ... 6 = sábado (JS getDay convention)
const WEEKDAYS = [
  { value: 1, label: 'L' },
  { value: 2, label: 'M' },
  { value: 3, label: 'X' },
  { value: 4, label: 'J' },
  { value: 5, label: 'V' },
  { value: 6, label: 'S' },
  { value: 0, label: 'D' },
];

export default function ChallengeDraftModal({ isOpen, onClose, draft, onConfirm, onReject, confirming }) {
  const [editedData, setEditedData] = useState(null);

  useEffect(() => {
    if (draft?.data) {
      const d = draft.data;
      setEditedData({
        title: d.title || '',
        description: d.description || '',
        domain: normalizeTaskDomain(d.domain, 'Hábitos'),
        target_stats: d.target_stats || [],
        stat_rewards: d.stat_rewards || {},
        recurrence_rule: {
          type: d.recurrence_rule?.type || draft.challenge_type,
          interval: d.recurrence_rule?.interval || 1,
          weekdays: d.recurrence_rule?.weekdays || [],
        },
        suggested_time: d.suggested_time || '08:00',
        estimated_minutes: d.estimated_minutes || 30,
      });
    }
  }, [draft]);

  if (!draft || !editedData) return null;

  const challengeType = draft.challenge_type;
  const isWeekly = challengeType === 'weekly';
  const reasoning = draft.data?.agent_reasoning;

  const toggleWeekday = (value) => {
    const current = editedData.recurrence_rule.weekdays || [];
    const next = current.includes(value)
      ? current.filter((d) => d !== value)
      : [...current, value].sort((a, b) => a - b);
    setEditedData({
      ...editedData,
      domain: normalizeTaskDomain(editedData.domain, 'Hábitos'),
      recurrence_rule: { ...editedData.recurrence_rule, weekdays: next },
    });
  };

  const handleConfirm = () => {
    onConfirm({
      ...editedData,
      recurrence_rule: {
        ...editedData.recurrence_rule,
        type: challengeType, // locked to challenge cadence
      },
    });
  };

  const weekdaysInvalid = isWeekly && (editedData.recurrence_rule.weekdays || []).length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-primary" />
            Propuesta de rutina para tu desafío
          </DialogTitle>
          <DialogDescription>
            Ajusta los días, la hora y la duración que mejor te encajen antes de programar la rutina.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={CHALLENGE_TYPE_COLORS[challengeType]}>
              {CHALLENGE_TYPE_LABELS[challengeType]}
            </Badge>
            <Badge variant="outline" className="text-xs italic">“{draft.prompt}”</Badge>
          </div>

          {reasoning && (
            <div className="p-3 bg-[hsl(var(--warning-soft))] border border-[hsl(var(--warning))] rounded-lg">
              <div className="flex items-start gap-2">
                <Brain className="w-5 h-5 text-[hsl(var(--warning))] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Por qué esta rutina</p>
                  <p className="text-sm text-muted-foreground mt-1">{reasoning}</p>
                </div>
              </div>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="ch-title">Título de la rutina</Label>
            <Input
              id="ch-title"
              value={editedData.title}
              onChange={(e) => setEditedData({ ...editedData, title: e.target.value })}
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="ch-desc">Descripción</Label>
            <Textarea
              id="ch-desc"
              value={editedData.description}
              onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="challenge-domain">Dominio *</Label>
            <Select
              value={editedData.domain || 'Hábitos'}
              onValueChange={(value) => setEditedData({ ...editedData, domain: value })}
            >
              <SelectTrigger id="challenge-domain" data-testid="challenge-domain-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_DOMAIN_OPTIONS.map((domain) => (
                  <SelectItem key={domain} value={domain}>{domain}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Weekdays (weekly only) */}
          {isWeekly && (
            <div className="space-y-2">
              <Label>Días de la semana</Label>
              <div className="flex gap-2 flex-wrap">
                {WEEKDAYS.map((day) => {
                  const active = (editedData.recurrence_rule.weekdays || []).includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleWeekday(day.value)}
                      className={`w-9 h-9 rounded-full text-sm font-medium border transition-colors ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground border-input'
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
              {weekdaysInvalid && (
                <p className="text-xs text-destructive">Selecciona al menos un día.</p>
              )}
            </div>
          )}

          {/* Time + duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ch-time">Hora</Label>
              <Input
                id="ch-time"
                type="time"
                value={editedData.suggested_time}
                onChange={(e) => setEditedData({ ...editedData, suggested_time: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ch-minutes">Duración (min)</Label>
              <Input
                id="ch-minutes"
                type="number"
                min="5"
                max="480"
                value={editedData.estimated_minutes}
                onChange={(e) =>
                  setEditedData({ ...editedData, estimated_minutes: parseInt(e.target.value, 10) || 30 })
                }
              />
            </div>
          </div>

          {/* Stat rewards (display) */}
          {Object.keys(editedData.stat_rewards || {}).length > 0 && (
            <div className="space-y-2">
              <Label>Estadísticas a mejorar</Label>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(editedData.stat_rewards).map(([stat, reward]) => (
                  <div key={stat} className="flex items-center gap-1 p-2 bg-secondary rounded-lg">
                    <span className="text-sm font-medium">{formatStatLabel(stat)}</span>
                    <TrendingUp className="w-3 h-3 text-[hsl(var(--success))]" />
                    <span className="text-xs text-[hsl(var(--success))] font-semibold">+{reward}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {challengeType === 'daily' && 'Se programará todos los días.'}
            {challengeType === 'weekly' && 'Se repetirá cada semana en los días seleccionados.'}
            {challengeType === 'monthly' && 'Se repetirá cada mes (a largo plazo).'}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onReject} disabled={confirming}>
            Rechazar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={confirming || !editedData.title || weekdaysInvalid}
            className="bg-primary text-primary-foreground hover:bg-[hsl(var(--primary)/0.9)]"
          >
            {confirming ? 'Creando...' : 'Programar desafío'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
