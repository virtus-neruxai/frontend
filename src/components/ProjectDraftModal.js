import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Rocket, Clock, Target, Trash2, ChevronDown, Calendar, Repeat } from 'lucide-react';
import { getProfileName, getProfileEmoji } from '../lib/profileUtils';
import { normalizeTaskDomain, TASK_DOMAIN_OPTIONS } from '../lib/taskDomains';
import {
  kindMeta,
  recurrenceSummary,
  formatItemDatetime,
  formatDateRange,
} from '../lib/projectItems';

/**
 * Confirmation modal for a project plan proposed by the Mentor ("Modo plan").
 *
 * draftData is the ui_action payload:
 *   { data: { project, items:[…] }, metadata: { confidence, expires_in_seconds } }
 * Editing is intentionally light (title / description / duration + remove) —
 * deeper structural changes are made conversationally in the chat. On confirm
 * we send edited_data = { project:{…partial}, items:[…full] }; the agent-service
 * executor re-validates the hard invariants, so we keep task_kind / dates /
 * recurrence intact and only recompute date_end from an edited duration.
 */
const recomputeEnd = (startIso, minutes) => {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return null;
  const mins = Number(minutes) || 40;
  return new Date(start.getTime() + mins * 60000).toISOString();
};

export default function ProjectDraftModal({ isOpen, onClose, draftData, onConfirm, onReject }) {
  const [project, setProject] = useState(null);
  const [items, setItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const data = draftData?.data;
    if (!data) return;
    const p = data.project || {};
    setProject({
      title: p.title || 'Plan',
      description: p.description || '',
      goal_statement: p.goal_statement || '',
      domain: normalizeTaskDomain(p.domain, 'Hábitos'),
      start_date: p.start_date || null,
      end_date: p.end_date || null,
      prompt_profile: p.prompt_profile || null,
    });
    setItems(
      (data.items || []).map((it, idx) => ({
        ...it,
        _key: `${idx}-${it.title}`,
        estimated_duration_minutes: it.estimated_duration_minutes || 40,
      }))
    );
  }, [draftData]);

  const counts = useMemo(() => {
    const tasks = items.filter((it) => it.task_kind !== 'routine').length;
    const routines = items.filter((it) => it.task_kind === 'routine').length;
    return { tasks, routines, total: items.length };
  }, [items]);

  // Items grouped by phase_label, preserving first-seen order — mirrors how the
  // Mentor narrates the plan in the chat.
  const phases = useMemo(() => {
    const groups = [];
    const byLabel = new Map();
    items.forEach((it) => {
      const label = it.phase_label || '';
      if (!byLabel.has(label)) {
        const group = { label, items: [] };
        byLabel.set(label, group);
        groups.push(group);
      }
      byLabel.get(label).items.push(it);
    });
    return groups;
  }, [items]);

  const updateItem = (key, patch) =>
    setItems((prev) => prev.map((it) => (it._key === key ? { ...it, ...patch } : it)));

  const removeItem = (key) => setItems((prev) => prev.filter((it) => it._key !== key));

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const domain = normalizeTaskDomain(project.domain, 'Hábitos');
      const payload = {
        project: {
          title: project.title,
          description: project.description,
          domain,
        },
        items: items.map(({ _key, ...it }) => ({
          ...it,
          domain,
          date_end: recomputeEnd(it.date_start, it.estimated_duration_minutes),
        })),
      };
      await onConfirm(payload);
      onClose();
    } catch (error) {
      console.error('Error confirming project draft:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      await onReject();
      onClose();
    } catch (error) {
      console.error('Error rejecting project draft:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!draftData || !project) return null;

  const metadata = draftData.metadata || {};
  const profile = project.prompt_profile;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            Plan propuesto por tu Mentor
          </DialogTitle>
          <DialogDescription>
            Revisa el proyecto y sus bloques. Ajusta lo que quieras y confírmalo para crear las tareas y rutinas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* ── Project header ─────────────────────────────────────────── */}
          <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Target className="w-3 h-3" />
                {counts.total} elemento{counts.total === 1 ? '' : 's'}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Calendar className="w-3 h-3" />
                {formatDateRange(project.start_date, project.end_date)}
              </Badge>
              {typeof metadata.confidence === 'number' && (
                <Badge variant={metadata.confidence > 0.7 ? 'default' : 'secondary'}>
                  Confianza {(metadata.confidence * 100).toFixed(0)}%
                </Badge>
              )}
              {metadata.expires_in_seconds && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  Expira en {Math.floor(metadata.expires_in_seconds / 60)} min
                </Badge>
              )}
              {profile && (
                <Badge variant="outline" className="text-xs">
                  {getProfileEmoji(profile)} {getProfileName(profile)}
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-title">Título del proyecto</Label>
              <Input
                id="project-title"
                value={project.title}
                onChange={(e) => setProject({ ...project, title: e.target.value })}
                maxLength={120}
              />
            </div>

            {project.goal_statement && (
              <p className="text-sm text-muted-foreground italic">🎯 {project.goal_statement}</p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="project-description">Descripción</Label>
                <Textarea
                  id="project-description"
                  value={project.description}
                  onChange={(e) => setProject({ ...project, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-domain">Dominio</Label>
                <Select
                  value={project.domain}
                  onValueChange={(value) => setProject({ ...project, domain: value })}
                >
                  <SelectTrigger id="project-domain">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_DOMAIN_OPTIONS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: kindMeta('task').color }} />
                {counts.tasks} tarea{counts.tasks === 1 ? '' : 's'}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: kindMeta('routine').color }} />
                {counts.routines} rutina{counts.routines === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {/* ── Items grouped by phase ─────────────────────────────────── */}
          {phases.map((phase, pIdx) => (
            <div key={phase.label || `phase-${pIdx}`} className="space-y-2">
              {phase.label && (
                <p className="text-sm font-semibold text-foreground px-1">{phase.label}</p>
              )}
              <div className="space-y-2">
                {phase.items.map((item) => (
                  <PlanItemCard
                    key={item._key}
                    item={item}
                    onChange={(patch) => updateItem(item._key, patch)}
                    onRemove={() => removeItem(item._key)}
                    canRemove={items.length > 1}
                  />
                ))}
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <p className="text-sm text-center text-muted-foreground py-6">
              No queda ningún bloque. Descarta el plan o pide uno nuevo al Mentor.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReject} disabled={isSubmitting}>
            Descartar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || items.length === 0 || !project.title.trim()}
            className="bg-primary text-primary-foreground hover:bg-[hsl(var(--primary)/0.9)]"
          >
            {isSubmitting ? 'Creando…' : `Confirmar plan (${items.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** One plan block: clean summary by default, editable fields on expand. */
function PlanItemCard({ item, onChange, onRemove, canRemove }) {
  const [open, setOpen] = useState(false);
  const meta = kindMeta(item.task_kind);
  const isRoutine = item.task_kind === 'routine';
  const KindIcon = meta.Icon;

  return (
    <div className="flex overflow-hidden rounded-lg border bg-card">
      <div className="w-1 shrink-0" style={{ backgroundColor: meta.color }} />
      <div className="min-w-0 flex-1 p-3">
        <div className="flex items-start gap-2">
          <KindIcon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: meta.color }} />
          <Input
            value={item.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className="h-8 flex-1 border-transparent bg-transparent px-1 text-sm font-medium hover:border-input focus:border-input"
            maxLength={120}
          />
          {canRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={onRemove}
              aria-label="Quitar bloque"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 pl-6 text-xs">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium"
            style={{ color: meta.color, backgroundColor: 'color-mix(in srgb, currentColor 12%, transparent)' }}
          >
            {meta.label}
          </span>
          {isRoutine ? (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Repeat className="h-3 w-3" />
              {recurrenceSummary(item.recurrence_rule)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatItemDatetime(item.date_start)}
            </span>
          )}
          <span className="text-muted-foreground">{item.estimated_duration_minutes} min</span>
        </div>

        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="mt-2 ml-6 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
            {open ? 'Ocultar detalles' : 'Detalles y ajustes'}
          </CollapsibleTrigger>
          <CollapsibleContent className="ml-6 mt-2 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Descripción</Label>
              <Textarea
                value={item.description || ''}
                onChange={(e) => onChange({ description: e.target.value })}
                rows={2}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Duración (minutos)</Label>
              <Input
                type="number"
                min={5}
                max={480}
                value={item.estimated_duration_minutes}
                onChange={(e) =>
                  onChange({ estimated_duration_minutes: Math.max(5, Math.min(480, parseInt(e.target.value, 10) || 40)) })
                }
                className="h-8 w-28 text-sm"
              />
            </div>
            {item.agent_reasoning && (
              <p className="rounded-md bg-muted/60 p-2 text-xs text-muted-foreground">
                💭 {item.agent_reasoning}
              </p>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
