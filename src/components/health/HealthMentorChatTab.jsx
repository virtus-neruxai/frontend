import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ConversationHistory from '../chat/ConversationHistory';
import TaskDraftModal from '../TaskDraftModal';
import ProjectDraftModal from '../ProjectDraftModal';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import { draftTypeFromAction, healthAgentApi, healthConversationsApi } from '../../lib/api';
import { useHealthChat } from '../../presentation/viewmodels/useHealthChat';
import { useDrafts } from '../../presentation/viewmodels/useDrafts';
import { Clock, HeartPulse, Info, PlusCircle, Rocket, RotateCcw, Send } from 'lucide-react';

const formatConvDate = (dateString) => {
  if (!dateString) return '';
  try {
    return format(new Date(dateString), "d MMM, HH:mm", { locale: es });
  } catch {
    return '';
  }
};

const RISK_NOTICES = {
  AMBER: 'He priorizado la seguridad: falta algún dato para concretar más.',
  RED: 'He priorizado la seguridad. Consulta con un profesional sanitario.',
};

/**
 * "Mentor Salud" tab in `MentorPage.js`, right of "Mentor <perfil>" — the
 * same shape as that tab (a chat card, nothing nested under it), pointed at
 * the health surface's own endpoint/session/history. Registro corporal,
 * Registro corporal, Alimentación, Entrenamiento y Notas viven aparte, en
 * `HealthDataTab.jsx` ("Salud" en la
 * navegación, `/health-data`) — esta pestaña es solo la conversación.
 */
export default function HealthMentorChatTab() {
  const conversationHistoryRef = useRef();

  const {
    chatMessage,
    chatResponse,
    chatMetadata,
    chatLoading,
    sessionId,
    deepReasoning,
    setDeepReasoning,
    projectPlan,
    setProjectPlan,
    sendMessage,
    setChatMessage,
    startNewConversation,
    selectConversation,
    resetSession,
  } = useHealthChat();

  const {
    showTaskDraftModal,
    showProjectDraftModal,
    currentDraftData,
    openDraftModal,
    confirmTaskDraft,
    rejectTaskDraft,
    confirmProjectDraft,
    rejectProjectDraft,
    setShowTaskDraftModal,
    setShowProjectDraftModal,
  } = useDrafts();

  const [activeConversation, setActiveConversation] = useState(null);
  const [pendingDraft, setPendingDraft] = useState(null);
  const [draftNowTick, setDraftNowTick] = useState(Date.now());

  useEffect(() => {
    if (!pendingDraft) return undefined;
    const id = setInterval(() => setDraftNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [pendingDraft]);

  useEffect(() => {
    if (!pendingDraft) return;
    if (Date.now() >= pendingDraft.expiresAt) {
      setPendingDraft(null);
      toast.info('La propuesta del mentor ha expirado');
    }
  }, [pendingDraft, draftNowTick]);

  // Same recovery as the general Mentor (see MentorPage.js): the draft itself
  // survives a closed tab in Redis for an hour, only this page's in-memory
  // pendingDraft did not. Scoped to sessionId and to the health surface's own
  // endpoint, so it can never resurface a Mentor `<perfil>` proposal here.
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    healthAgentApi.getPendingDrafts(sessionId).then(({ data }) => {
      if (cancelled) return;
      const draft = data.drafts?.[0];
      if (!draft?.ui_action) return;
      const expiresAt = new Date(draft.expires_at).getTime();
      if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) return;
      setPendingDraft({
        draftId: draft.draft_id,
        uiAction: draft.ui_action,
        type: draftTypeFromAction(draft.ui_action.action),
        expiresAt,
      });
    }).catch(() => {
      // Recovery is a convenience, not the main flow.
    });
    return () => { cancelled = true; };
  }, [sessionId]);

  const formatDraftType = (type) => {
    if (type === 'task') return 'tarea';
    if (type === 'project') return 'plan de proyecto';
    return 'propuesta';
  };

  const getDraftTimeLabel = () => {
    if (!pendingDraft) return '';
    const remainingMs = Math.max(0, pendingDraft.expiresAt - draftNowTick);
    const remainingSec = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(remainingSec / 60);
    const seconds = remainingSec % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  const handleChat = async () => {
    await sendMessage(chatMessage, ({ draftId, uiAction, type }) => {
      const expiresInSeconds = uiAction?.metadata?.expires_in_seconds ?? 3600;
      setPendingDraft({
        draftId,
        uiAction,
        type,
        expiresAt: Date.now() + expiresInSeconds * 1000,
      });
      toast.success('Tu mentor tiene una propuesta pendiente. Ábrela cuando quieras.');
    });

    if (conversationHistoryRef.current) {
      conversationHistoryRef.current.refresh();
    }
  };

  const handleSelectConversation = useCallback((convSessionId, convData) => {
    selectConversation(convSessionId);
    setActiveConversation(convData || { session_id: convSessionId });
  }, [selectConversation]);

  const handleNewConversation = useCallback(() => {
    startNewConversation();
    setActiveConversation(null);
    if (conversationHistoryRef.current) {
      conversationHistoryRef.current.refresh();
    }
  }, [startNewConversation]);

  // Distinct from "Nueva Conversación": that opens a fresh thread, this keeps
  // the thread and makes the mentor forget the slots it had collected — the
  // explicit reset the health policy requires.
  const handleResetContext = useCallback(async () => {
    await resetSession();
    if (conversationHistoryRef.current) {
      conversationHistoryRef.current.refresh();
    }
  }, [resetSession]);

  const convPreview = activeConversation?.preview
    ? `"${activeConversation.preview.slice(0, 80)}${activeConversation.preview.length > 80 ? '…' : ''}"`
    : null;

  const sendButtonLabel = projectPlan
    ? 'Diseñando tu plan…'
    : deepReasoning
      ? 'Razonando en profundidad…'
      : 'Pensando...';

  const riskNotice = RISK_NOTICES[chatMetadata?.risk_level] || null;
  const surfaceDisabled = chatMetadata?.enabled === false;

  return (
    <div className="space-y-4">
      {/* The mentor now remembers what you've told it across conversations
          (see agent-service/graph/nodes/health_recall.py) — it does not read
          your recorded activity or tasks mid-conversation; only the health
          report (pestaña "Informe de salud" en Informes) does that. */}
      <div
        role="note"
        className="flex gap-3 rounded-lg border border-dashed border-border bg-muted/50 p-3 text-xs"
      >
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" aria-hidden="true" />
        <p className="text-muted-foreground leading-snug">
          Recuerdo lo que me cuentas entre conversaciones, si lo permites en Ajustes.
          No sustituyo a un profesional sanitario.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-primary" strokeWidth={1.5} aria-hidden="true" />
            Mentor de Salud
          </CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={handleResetContext}
              variant="ghost"
              size="sm"
              className="text-xs"
              disabled={chatLoading || !sessionId}
              title="Mantiene la conversación, pero el mentor olvida lo que le has contado en ella"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reiniciar contexto
            </Button>
            <Button
              onClick={handleNewConversation}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <PlusCircle className="w-3 h-3 mr-1" />
              Nueva Conversación
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {chatResponse && (
            <div className="p-4 bg-muted rounded-lg" aria-live="polite">
              <p className="text-sm text-foreground whitespace-pre-wrap">{chatResponse}</p>
            </div>
          )}

          {chatResponse && (riskNotice || surfaceDisabled) && (
            <div className="p-3 border border-[hsl(var(--warning))] bg-[hsl(var(--warning-soft))] rounded-lg flex items-start gap-3">
              <Badge variant="outline" className="text-foreground border-[hsl(var(--warning))] bg-background shrink-0">
                {surfaceDisabled ? 'No disponible' : 'Seguridad'}
              </Badge>
              <p className="text-xs text-muted-foreground">
                {surfaceDisabled
                  ? 'El mentor de salud no está activo en tu cuenta.'
                  : riskNotice}
              </p>
            </div>
          )}

          {/* ── Active conversation indicator ─────────────────────────── */}
          <div className={[
            'flex items-start gap-3 px-3 py-2.5 rounded-lg border text-xs transition-colors',
            activeConversation
              ? 'bg-primary/10 border-primary/40'
              : 'bg-muted/50 border-dashed border-border',
          ].join(' ')}>
            <HeartPulse className={[
              'w-4 h-4 mt-0.5 shrink-0',
              activeConversation ? 'text-primary' : 'text-muted-foreground',
            ].join(' ')} />
            <div className="min-w-0 flex-1 space-y-0.5">
              {activeConversation ? (
                <>
                  <p className="font-semibold text-primary leading-tight">
                    Continuando conversación del {formatConvDate(activeConversation.last_message_at)}
                  </p>
                  {convPreview && (
                    <p className="text-muted-foreground leading-snug italic">{convPreview}</p>
                  )}
                  <p className="text-muted-foreground">
                    Tu mensaje se añadirá a esta conversación · Pulsa{' '}
                    <button
                      onClick={handleNewConversation}
                      className="text-primary underline underline-offset-2 hover:opacity-70"
                    >
                      Nueva Conversación
                    </button>{' '}
                    para empezar una nueva
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-foreground leading-tight">Nueva conversación</p>
                  <p className="text-muted-foreground">
                    Tu mensaje iniciará una nueva conversación ·{' '}
                    Selecciona una del historial para continuar una existente
                  </p>
                </>
              )}
            </div>
          </div>
          {/* ─────────────────────────────────────────────────────────── */}

          <div className="flex gap-2">
            <Textarea
              placeholder="Pregunta a tu mentor de salud..."
              aria-label="Mensaje para el mentor de salud"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && chatMessage.trim() && !chatLoading) {
                  handleChat();
                }
              }}
              className="min-h-[80px]"
            />
          </div>

          {/* Two toggles only. "Datos de la app" belongs to Mentor <perfil>;
              the health endpoint returns 422 if it ever arrives here. */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="health-deep-reasoning-toggle">Razonar</Label>
              <p className="text-xs text-muted-foreground">
                Responde con análisis profundo. No ejecuta acciones automáticamente.
              </p>
            </div>
            <Switch
              id="health-deep-reasoning-toggle"
              checked={deepReasoning}
              onCheckedChange={setDeepReasoning}
              disabled={chatLoading || projectPlan}
              data-testid="health-deep-reasoning-toggle"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="health-project-plan-toggle" className="flex items-center gap-1.5">
                <Rocket className="w-3.5 h-3.5 text-primary" />
                Modo plan
              </Label>
              <p className="text-xs text-muted-foreground">
                Diseña un plan completo (tareas y rutinas hasta una fecha) a partir de un objetivo de salud.
              </p>
            </div>
            <Switch
              id="health-project-plan-toggle"
              checked={projectPlan}
              onCheckedChange={setProjectPlan}
              disabled={chatLoading || deepReasoning}
              data-testid="health-project-plan-toggle"
            />
          </div>

          <Button
            onClick={handleChat}
            disabled={!chatMessage.trim() || chatLoading}
            className="rounded-full w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            {chatLoading ? sendButtonLabel : 'Enviar'}
          </Button>

          {pendingDraft && (
            <div className="p-4 border border-[hsl(var(--warning))] bg-[hsl(var(--warning-soft))] rounded-lg">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Tu mentor te propone una {formatDraftType(pendingDraft.type)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Puedes abrirla, editarla y confirmarla cuando quieras.
                  </p>
                </div>
                <Badge variant="outline" className="text-foreground border-[hsl(var(--warning))] bg-background shrink-0">
                  <Clock className="w-3 h-3 mr-1" />
                  {getDraftTimeLabel()}
                </Badge>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-[hsl(var(--primary)/0.9)]"
                  onClick={() => {
                    openDraftModal({
                      draftId: pendingDraft.draftId,
                      uiAction: pendingDraft.uiAction,
                      type: pendingDraft.type,
                    });
                    setPendingDraft(null);
                  }}
                >
                  Abrir propuesta
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPendingDraft(null)}>
                  Cerrar aviso
                </Button>
              </div>
            </div>
          )}

          {/* Same component as the general Mentor, pointed at the health feed.
              profileScoped=false because this history is one thread per user:
              a knee described under one voice is the same knee under another. */}
          <ConversationHistory
            ref={conversationHistoryRef}
            api={healthConversationsApi}
            profileScoped={false}
            emptyLabel="Todavía no tienes conversaciones de salud. Empieza una nueva arriba."
            activeSessionId={sessionId}
            onSelectConversation={handleSelectConversation}
          />
        </CardContent>
      </Card>

      {/* Task and project only. Health never proposes a mission, so
          MissionDraftModal is deliberately not imported here. */}
      <TaskDraftModal
        isOpen={showTaskDraftModal}
        onClose={() => setShowTaskDraftModal(false)}
        draftData={currentDraftData}
        onConfirm={(editedData) => confirmTaskDraft(editedData)}
        onReject={rejectTaskDraft}
      />

      <ProjectDraftModal
        isOpen={showProjectDraftModal}
        onClose={() => setShowProjectDraftModal(false)}
        draftData={currentDraftData}
        onConfirm={(editedData) => confirmProjectDraft(editedData)}
        onReject={rejectProjectDraft}
      />
    </div>
  );
}
