import { useCallback, useEffect, useState } from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  GitFork,
  Lightbulb,
  ListTodo,
  Loader2,
  RefreshCw,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { proactiveApi, graphAnalyticsApi } from '../lib/api';
import TaskDraftModal from '../components/TaskDraftModal';
import MissionDraftModal from '../components/MissionDraftModal';

// ─── helpers ────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending_confirmation: { label: 'Pendiente', className: 'bg-yellow-200 text-yellow-900 dark:bg-yellow-800 dark:text-yellow-200' },
  confirmed: { label: 'Confirmada', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  auto_applied: { label: 'Aplicada', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  rejected: { label: 'Rechazada', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  failed: { label: 'Fallida', className: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-500' },
  expired: {
    label: 'Expirada',
    className: 'border border-slate-300 bg-slate-200 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100',
  },
  notified: { label: 'Notificada', className: 'bg-muted text-muted-foreground' },
};

const FAMILY_CONFIG = {
  edit: { label: 'Reprogramar', icon: CalendarClock, color: 'text-blue-500' },
  split: { label: 'Dividir', icon: GitFork, color: 'text-purple-500' },
  new_task: { label: 'Nueva tarea', icon: ListTodo, color: 'text-emerald-500' },
  new_routine: { label: 'Nueva rutina', icon: RefreshCw, color: 'text-teal-500' },
  new_mission: { label: 'Nueva misión', icon: Sparkles, color: 'text-amber-500' },
  insight: { label: 'Insight', icon: Lightbulb, color: 'text-orange-500' },
};

function getDisplayFamily(suggestion) {
  const family = suggestion?.proposal_family;
  const taskKind = suggestion?.draft_payload?.task_kind;
  if (family === 'new_task' && taskKind === 'routine') return 'new_routine';
  return family;
}

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { label: status, className: 'bg-muted text-muted-foreground' };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function FamilyIcon({ family }) {
  const config = FAMILY_CONFIG[family] || { icon: BrainCircuit, color: 'text-muted-foreground' };
  const Icon = config.icon;
  return <Icon className={`h-4 w-4 ${config.color}`} />;
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: es });
  } catch {
    return iso;
  }
}

function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    const d = parseISO(iso);
    return d.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function formatDateTimeRange(startIso, endIso) {
  if (!startIso) return '—';
  const start = formatDateTime(startIso);
  if (!endIso) return start;
  return `${start} → ${formatDateTime(endIso)}`;
}

function inferDifficulty(value, durationMinutes) {
  const raw = Number(value);
  if (Number.isFinite(raw) && raw >= 1 && raw <= 5) return raw;
  const duration = Math.max(5, Number(durationMinutes || 30));
  if (duration <= 20) return 1;
  if (duration <= 45) return 2;
  if (duration <= 90) return 3;
  if (duration <= 150) return 4;
  return 5;
}

function getExpiryBadge(iso) {
  if (!iso) return null;
  try {
    const expiresAt = parseISO(iso);
    const diffMs = expiresAt - Date.now();
    if (diffMs <= 0) return null; // already marked expired by status
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffH >= 24) return null; // don't clutter if plenty of time left
    const label = diffH > 0 ? `Expira en ${diffH}h` : `Expira en ${diffM}min`;
    const urgent = diffH < 3;
    return { label, urgent };
  } catch {
    return null;
  }
}

function SplitSubtaskLine({ subtask, compact = false }) {
  if (!subtask) return null;
  const range = formatDateTimeRange(subtask.date_start, subtask.date_end);

  if (compact) {
    return (
      <span>
        <span className="text-foreground font-medium">{subtask.title}</span>
        {' · '}{subtask.estimated_minutes}min
        {subtask.date_start && <> · {range}</>}
      </span>
    );
  }

  return (
    <>
      <p className="font-medium text-foreground">{subtask.title}</p>
      {subtask.description && <p className="text-muted-foreground text-xs mt-0.5">{subtask.description}</p>}
      <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
        {subtask.estimated_minutes && (
          <span>⏱ {subtask.estimated_minutes} min</span>
        )}
        {subtask.date_start && (
          <span>📅 {range}</span>
        )}
      </div>
    </>
  );
}

// ─── Draft detail renderers ──────────────────────────────────────────────────

function EditDraftDetail({ draft }) {
  if (!draft) return null;
  return (
    <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
      <p className="font-medium text-foreground">{draft.title || 'Tarea'}</p>
      {draft.current_date_start && (
        <p className="text-muted-foreground">
          Actual: <span className="text-foreground">{formatDateTime(draft.current_date_start)} → {formatDateTime(draft.current_date_end)}</span>
        </p>
      )}
      <p className="text-muted-foreground">
        Propuesto: <span className="text-emerald-600 dark:text-emerald-400 font-medium">
          {formatDateTime(draft.proposed_date_start)} → {formatDateTime(draft.proposed_date_end)}
        </span>
      </p>
    </div>
  );
}

function SplitDraftDetail({ draft, autoApplyResult = null }) {
  const subtasks = autoApplyResult?.applied_subtasks || draft?.subtasks || [];
  if (!draft || subtasks.length === 0) return null;
  return (
    <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-sm space-y-2">
      <p className="font-medium text-foreground">{draft.title || 'Tarea'} → {subtasks.length} subtareas</p>
      <ul className="space-y-1 pl-1">
        {subtasks.map((st, i) => (
          <li key={i} className="flex items-start gap-2 text-muted-foreground">
            <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary/60 flex-shrink-0" />
            <SplitSubtaskLine subtask={st} compact />
          </li>
        ))}
      </ul>
    </div>
  );
}

function NewTaskDraftDetail({ draft }) {
  if (!draft) return null;
  return (
    <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
      <p className="font-medium text-foreground">{draft.title || 'Nueva tarea'}</p>
      {draft.description && <p className="text-muted-foreground">{draft.description}</p>}
      {draft.date_start && (
        <p className="text-muted-foreground">
          Fecha: <span className="text-foreground">{formatDateTime(draft.date_start)} → {formatDateTime(draft.date_end)}</span>
        </p>
      )}
    </div>
  );
}

function MissionDraftDetail({ draft }) {
  if (!draft) return null;
  return (
    <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
      <p className="font-medium text-foreground">{draft.title || 'Nueva misión'}</p>
      {draft.description && <p className="text-muted-foreground">{draft.description}</p>}
    </div>
  );
}

function DraftDetail({ family, draft, autoApplyResult }) {
  if (!draft) return null;
  if (family === 'edit') return <EditDraftDetail draft={draft} />;
  if (family === 'split') return <SplitDraftDetail draft={draft} autoApplyResult={autoApplyResult} />;
  if (family === 'new_task' || family === 'new_routine') return <NewTaskDraftDetail draft={draft} />;
  if (family === 'new_mission') return <MissionDraftDetail draft={draft} />;
  return null;
}

// ─── Single suggestion card ──────────────────────────────────────────────────

function SuggestionCard({ suggestion, onConfirm, onReject, actionLoading }) {
  const [expanded, setExpanded] = useState(false);
  const isPending = suggestion.status === 'pending_confirmation';
  const displayFamily = getDisplayFamily(suggestion);
  const familyConfig = FAMILY_CONFIG[displayFamily] || { label: displayFamily };

  return (
    <Card className="transition-shadow hover:shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0">
            <FamilyIcon family={displayFamily} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {familyConfig.label}
              </span>
              <StatusBadge status={suggestion.status} />
              {isPending && (() => {
                const expiry = getExpiryBadge(suggestion.expires_at);
                if (!expiry) return null;
                return (
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${expiry.urgent ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                    {expiry.label}
                  </span>
                );
              })()}
            </div>
            <p className="text-sm font-medium text-foreground leading-snug">{suggestion.summary}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatDate(suggestion.created_at)}</p>
          </div>
          <button
            onClick={() => setExpanded((p) => !p)}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <DraftDetail
            family={displayFamily}
            draft={suggestion.draft_payload}
            autoApplyResult={suggestion.auto_apply_result}
          />

          {suggestion.context_snapshot?.reason_codes?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {suggestion.context_snapshot.reason_codes.map((rc) => (
                <Badge key={rc} variant="secondary" className="text-xs">{rc}</Badge>
              ))}
            </div>
          )}

          {suggestion.auto_apply_result && (
            <p className="mt-2 text-xs text-green-600 dark:text-green-400">
              ✓ Aplicado correctamente
            </p>
          )}

          {isPending && (
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                onClick={() => onConfirm(suggestion.id)}
                disabled={actionLoading === suggestion.id}
                className="gap-1.5"
              >
                {actionLoading === suggestion.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Confirmar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject(suggestion.id)}
                disabled={actionLoading === suggestion.id}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                <XCircle className="h-3.5 w-3.5" />
                Rechazar
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <BrainCircuit className="h-10 w-10 text-muted-foreground/40 mb-3" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ProactiveSuggestionsPage() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [newTaskModal, setNewTaskModal] = useState(null);
  const [newMissionModal, setNewMissionModal] = useState(null);
  const [splitModal, setSplitModal] = useState(null);

  const fetchSuggestions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await proactiveApi.list({ limit: 50 });
      setSuggestions(res.data?.suggestions || []);
    } catch (err) {
      toast.error('No se pudieron cargar las sugerencias');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const handleConfirm = async (id) => {
    let suggestion = suggestions.find((s) => s.id === id);
    // NEW_TASK and NEW_MISSION open their respective edit modal before creating
    if (suggestion?.proposal_family === 'new_task' && suggestion?.status === 'pending_confirmation') {
      const dp = suggestion.draft_payload || {};
      if (!dp.date_start) {
        try {
          const res = await graphAnalyticsApi.getBestSlot(dp.estimated_duration_minutes || 45);
          const slots = res.data?.slots || [];
          if (slots.length > 0) {
            const best = slots[0];
            suggestion = { ...suggestion, draft_payload: { ...dp, date_start: best.date_start, date_end: best.date_end } };
          }
        } catch (_) { /* degradar silenciosamente */ }
      }
      setNewTaskModal(suggestion);
      return;
    }
    if (suggestion?.proposal_family === 'new_mission' && suggestion?.status === 'pending_confirmation') {
      const dp = suggestion.draft_payload || {};
      if (!dp.start_date) {
        try {
          const res = await graphAnalyticsApi.getBestSlot(dp.estimated_minutes || 45);
          const slots = res.data?.slots || [];
          if (slots.length > 0) {
            suggestion = { ...suggestion, draft_payload: { ...dp, start_date: slots[0].date_start } };
          }
        } catch (_) { /* degradar silenciosamente */ }
      }
      setNewMissionModal(suggestion);
      return;
    }
    // SPLIT: show review modal before confirming
    if (suggestion?.proposal_family === 'split' && suggestion?.status === 'pending_confirmation') {
      setSplitModal(suggestion);
      return;
    }
    // All other families confirm directly
    setActionLoading(id);
    try {
      const res = await proactiveApi.confirm(id);
      const updated = res.data;
      setSuggestions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      const isApplied = updated.status === 'auto_applied';
      toast.success(isApplied ? 'Cambio aplicado correctamente' : 'Sugerencia confirmada');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al confirmar la sugerencia');
    } finally {
      setActionLoading(null);
    }
  };

  const handleNewTaskModalConfirm = async (taskPayload) => {
    const suggestion = newTaskModal;
    if (!suggestion) return;
    setActionLoading(suggestion.id);
    try {
      const res = await proactiveApi.confirm(suggestion.id, { task_data: taskPayload });
      const updated = res.data;
      setSuggestions((prev) => prev.map((s) => (s.id === suggestion.id ? updated : s)));
      toast.success(updated.status === 'auto_applied' ? 'Tarea creada correctamente' : 'Sugerencia confirmada');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al crear la tarea');
      throw err; // let the modal stay open on error
    } finally {
      setActionLoading(null);
      setNewTaskModal(null);
    }
  };

  const handleNewMissionModalConfirm = async (missionPayload) => {
    const suggestion = newMissionModal;
    if (!suggestion) return;
    setActionLoading(suggestion.id);
    try {
      const res = await proactiveApi.confirm(suggestion.id, { task_data: missionPayload });
      const updated = res.data;
      setSuggestions((prev) => prev.map((s) => (s.id === suggestion.id ? updated : s)));
      toast.success(updated.status === 'auto_applied' ? 'Misión creada correctamente' : 'Sugerencia confirmada');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al crear la misión');
      throw err;
    } finally {
      setActionLoading(null);
      setNewMissionModal(null);
    }
  };

  const handleSplitModalConfirm = async () => {
    const suggestion = splitModal;
    if (!suggestion) return;
    setActionLoading(suggestion.id);
    try {
      const res = await proactiveApi.confirm(suggestion.id);
      const updated = res.data;
      setSuggestions((prev) => prev.map((s) => (s.id === suggestion.id ? updated : s)));
      toast.success(updated.status === 'auto_applied' ? 'Tarea dividida correctamente' : 'División confirmada');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al confirmar la división');
    } finally {
      setActionLoading(null);
      setSplitModal(null);
    }
  };

  const handleReject = async (id) => {
    setActionLoading(id);
    try {
      const res = await proactiveApi.reject(id);
      setSuggestions((prev) => prev.map((s) => (s.id === id ? res.data : s)));
      toast.success('Sugerencia rechazada');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al rechazar la sugerencia');
    } finally {
      setActionLoading(null);
    }
  };

  const existingTasks = suggestions.filter((s) => s.branch === 'existing_tasks');
  const newProposals = suggestions.filter((s) => s.branch === 'new_proposals');
  const pendingCount = suggestions.filter((s) => s.status === 'pending_confirmation').length;

  // Build draftData format expected by TaskDraftModal
  const VALID_DOMAINS = ['Personal', 'Propósito', 'Mental', 'Hábitos', 'Salud', 'Relaciones', 'Social', 'Trabajo', 'Finanzas', 'Aprendizaje', 'Hogar', 'Ocio', 'Otro'];
  const normalizeDomain = (d) => VALID_DOMAINS.includes(d) ? d : 'Personal';

  const buildNewTaskDraftData = (suggestion) => {
    const dp = suggestion.draft_payload || {};
    return {
      metadata: {
        title: 'Nueva tarea sugerida',
        source: 'proactive',
        suggestion_id: suggestion.id,
      },
      data: {
        task_action: 'CREATE_DRAFT',
        title: dp.title || suggestion.summary || '',
        description: dp.description || suggestion.summary || '',
        date_start: dp.date_start || '',
        date_end: dp.date_end || '',
        estimated_duration_minutes: dp.estimated_duration_minutes || 30,
        difficulty: inferDifficulty(dp.difficulty, dp.estimated_duration_minutes),
        domain: normalizeDomain(dp.domain),
        task_kind: dp.task_kind || 'task',
        tags: dp.tags || [],
        covey_classification: dp.covey_classification || { urgent: false, important: true },
      },
    };
  };

  // Build draftData format expected by MissionDraftModal
  const buildNewMissionDraftData = (suggestion) => {
    const dp = suggestion.draft_payload || {};
    return {
      metadata: {
        title: 'Nueva misión sugerida',
        source: 'proactive',
        suggestion_id: suggestion.id,
      },
      data: {
        title: dp.title || suggestion.summary || '',
        description: dp.description || suggestion.summary || '',
        mission_type: dp.mission_type || 'daily',
        difficulty: inferDifficulty(dp.difficulty, dp.estimated_minutes),
        estimated_minutes: dp.estimated_minutes || 30,
        target_stats: dp.target_stats || [],
        stat_rewards: dp.stat_rewards || {},
        start_date: dp.start_date || '',
        due_date: dp.due_date || '',
        related_to: dp.related_to || {},
      },
    };
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Sugerencias proactivas
            </h1>
            <p className="text-muted-foreground mt-1">
              {pendingCount > 0
                ? `${pendingCount} sugerencia${pendingCount !== 1 ? 's' : ''} pendiente${pendingCount !== 1 ? 's' : ''} de revisión`
                : 'El asistente analiza tu contexto para sugerirte mejoras'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchSuggestions} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="existing">
          <TabsList className="bg-transparent p-0 h-auto gap-1">
            <TabsTrigger value="existing" className="gap-2 data-[state=inactive]:text-muted-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:rounded-none data-[state=inactive]:bg-transparent">
              <CalendarClock className="h-4 w-4" />
              Ajustar tareas
              {existingTasks.filter((s) => s.status === 'pending_confirmation').length > 0 && (
                <span className="ml-1 rounded-full bg-orange-500 text-white px-1.5 py-0.5 text-[10px] font-semibold">
                  {existingTasks.filter((s) => s.status === 'pending_confirmation').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="proposals" className="gap-2 data-[state=inactive]:text-muted-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:rounded-none data-[state=inactive]:bg-transparent">
              <Sparkles className="h-4 w-4" />
              Nuevas propuestas
              {newProposals.filter((s) => s.status === 'pending_confirmation').length > 0 && (
                <span className="ml-1 rounded-full bg-orange-500 text-white px-1.5 py-0.5 text-[10px] font-semibold">
                  {newProposals.filter((s) => s.status === 'pending_confirmation').length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="mt-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : existingTasks.length === 0 ? (
              <EmptyState message="No hay sugerencias sobre tareas existentes" />
            ) : (
              <div className="space-y-3">
                {existingTasks.map((s) => (
                  <SuggestionCard
                    key={s.id}
                    suggestion={s}
                    onConfirm={handleConfirm}
                    onReject={handleReject}
                    actionLoading={actionLoading}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="proposals" className="mt-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : newProposals.length === 0 ? (
              <EmptyState message="No hay nuevas propuestas todavía" />
            ) : (
              <div className="space-y-3">
                {newProposals.map((s) => (
                  <SuggestionCard
                    key={s.id}
                    suggestion={s}
                    onConfirm={handleConfirm}
                    onReject={handleReject}
                    actionLoading={actionLoading}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* NEW_TASK confirmation modal */}
      {newTaskModal && (
        <TaskDraftModal
          isOpen={!!newTaskModal}
          onClose={() => setNewTaskModal(null)}
          draftData={buildNewTaskDraftData(newTaskModal)}
          onConfirm={handleNewTaskModalConfirm}
          onReject={() => setNewTaskModal(null)}
        />
      )}

      {/* NEW_MISSION confirmation modal */}
      {newMissionModal && (
        <MissionDraftModal
          isOpen={!!newMissionModal}
          onClose={() => setNewMissionModal(null)}
          draftData={buildNewMissionDraftData(newMissionModal)}
          onConfirm={handleNewMissionModalConfirm}
          onReject={() => setNewMissionModal(null)}
        />
      )}

      {/* SPLIT review modal */}
      {splitModal && (() => {
        const dp = splitModal.draft_payload || {};
        const subtasks = dp.subtasks || [];
        const isLoading = actionLoading === splitModal.id;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-background rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between p-5 border-b">
                <div className="flex items-center gap-2">
                  <GitFork className="h-5 w-5 text-purple-500" />
                  <h2 className="text-base font-semibold">Dividir tarea</h2>
                </div>
                <button onClick={() => setSplitModal(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-5 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Tarea a dividir</p>
                  <p className="font-medium text-foreground">{dp.title || splitModal.summary}</p>
                </div>

                <p className="text-sm text-muted-foreground">{splitModal.summary}</p>

                {subtasks.length > 0 ? (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                      Se crearán {subtasks.length} subtarea{subtasks.length !== 1 ? 's' : ''}
                    </p>
                    <ul className="space-y-2">
                      {subtasks.map((st, i) => (
                        <li key={i} className="rounded-lg border bg-muted/40 p-3 text-sm">
                          <SplitSubtaskLine subtask={st} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    El plan de división se generará al confirmar.
                  </p>
                )}
              </div>

              <div className="flex gap-2 p-5 border-t">
                <Button onClick={handleSplitModalConfirm} disabled={isLoading} className="flex-1 gap-1.5">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Confirmar división
                </Button>
                <Button variant="outline" onClick={() => setSplitModal(null)} disabled={isLoading} className="flex-1 gap-1.5 text-destructive hover:text-destructive">
                  <XCircle className="h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </Layout>
  );
}
