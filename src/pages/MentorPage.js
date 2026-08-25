import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Layout from '../components/Layout';
import ConversationHistory from '../components/chat/ConversationHistory';
import TaskDraftModal from '../components/TaskDraftModal';
import MissionDraftModal from '../components/MissionDraftModal';
import ProjectDraftModal from '../components/ProjectDraftModal';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { ChallengesTab } from '../presentation/components/character/ChallengesTab';
import { ProfileHeroCard } from '../presentation/components/profile-theme/ProfileHeroCard';
import { agentApi, draftTypeFromAction } from '../lib/api';
import { useAgentChat } from '../presentation/viewmodels/useAgentChat';
import { useDrafts } from '../presentation/viewmodels/useDrafts';
import { useProfileTheme } from '../theme/useProfileTheme';
import { Clock, MessageCircle, PlusCircle, Repeat, Rocket, Send } from 'lucide-react';

const formatConvDate = (dateString) => {
  if (!dateString) return '';
  try {
    return format(new Date(dateString), "d MMM, HH:mm", { locale: es });
  } catch {
    return '';
  }
};

export default function MentorPage() {
  const { theme, persistedProfileId } = useProfileTheme();
  const profileName = theme.name;
  const conversationHistoryRef = useRef();
  const [activeTab, setActiveTab] = useState('agent');

  const {
    chatMessage,
    chatResponse,
    chatMetadata,
    chatLoading,
    sessionId,
    deepReasoning,
    setDeepReasoning,
    userDataQa,
    setUserDataQa,
    projectPlan,
    setProjectPlan,
    sendMessage,
    setChatMessage,
    startNewConversation,
    selectConversation,
  } = useAgentChat(persistedProfileId);

  const {
    showTaskDraftModal,
    showMissionDraftModal,
    showProjectDraftModal,
    currentDraftData,
    openDraftModal,
    confirmTaskDraft,
    rejectTaskDraft,
    confirmMissionDraft,
    rejectMissionDraft,
    confirmProjectDraft,
    rejectProjectDraft,
    setShowTaskDraftModal,
    setShowMissionDraftModal,
    setShowProjectDraftModal,
  } = useDrafts();

  // Metadata of the currently selected/active conversation (for UI indicator)
  const [activeConversation, setActiveConversation] = useState(null);

  const [pendingDraft, setPendingDraft] = useState(null);
  const [draftNowTick, setDraftNowTick] = useState(Date.now());

  // Clear active conversation when profile changes (sessionId comes from new profile's storage)
  useEffect(() => {
    setActiveConversation(null);
  }, [persistedProfileId]);

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

  useEffect(() => {
    if (pendingDraft && userDataQa) {
      setUserDataQa(false);
    }
  }, [pendingDraft, userDataQa, setUserDataQa]);

  // A draft outlives the tab that received it — it sits in Redis for the full
  // hour (REDIS_DRAFT_TTL) regardless of what the browser remembers. Only
  // `pendingDraft` itself, plain React state, was lost on reload; this
  // recovers it once per session so closing the tab does not mean starting
  // the confirmation over. Scoped to `sessionId` so switching profile or
  // starting a new conversation does not resurrect an older thread's draft.
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    agentApi.getPendingDrafts(sessionId).then(({ data }) => {
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
      // Recovery is a convenience, not the main flow: a failed lookup just
      // means the person starts fresh, same as before this existed.
    });
    return () => { cancelled = true; };
  }, [sessionId]);

  const formatDraftType = (type) => {
    if (type === 'task') return 'tarea';
    if (type === 'mission') return 'misión';
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

  // Called by ConversationHistory when user clicks a conversation.
  // Updates the active session so future messages go there.
  const handleSelectConversation = useCallback((convSessionId, convData) => {
    selectConversation(convSessionId);
    setActiveConversation(convData || { session_id: convSessionId });
  }, [selectConversation]);

  // Starts a new conversation and clears the active conversation indicator.
  const handleNewConversation = useCallback(() => {
    startNewConversation();
    setActiveConversation(null);
    if (conversationHistoryRef.current) {
      conversationHistoryRef.current.refresh();
    }
  }, [startNewConversation]);

  // Label shown in the active conversation indicator
  const convPreview = activeConversation?.preview
    ? `"${activeConversation.preview.slice(0, 80)}${activeConversation.preview.length > 80 ? '…' : ''}"`
    : null;
  const sendButtonLabel = projectPlan
    ? 'Diseñando tu plan…'
    : userDataQa
      ? 'Consultando tus datos…'
      : deepReasoning
        ? 'Razonando en profundidad…'
        : 'Pensando...';

  return (
    <Layout ambient>
      <div className="space-y-6" data-testid="mentor-page">
        <ProfileHeroCard
          title={`Mentor · ${profileName}`}
          titleAs="h1"
          description="Convierte conversaciones y desafíos en acciones concretas."
          action={
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Espacio activo</p>
              <p className="font-bold text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
                {activeTab === 'challenges' ? 'Desafíos' : `Mentor ${profileName}`}
              </p>
            </div>
          }
        />

        <Tabs defaultValue="agent" className="space-y-4" onValueChange={setActiveTab}>
          <TabsList className="bg-muted p-1 rounded-full">
            <TabsTrigger value="agent" className="rounded-full data-[state=active]:bg-card">
              <MessageCircle className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Mentor {profileName}
            </TabsTrigger>
            <TabsTrigger value="challenges" className="rounded-full data-[state=active]:bg-card">
              <Repeat className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Desafíos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agent">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Mentor {profileName}</CardTitle>
                <Button
                  onClick={handleNewConversation}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <PlusCircle className="w-3 h-3 mr-1" />
                  Nueva Conversación
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {chatResponse && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{chatResponse}</p>
                  </div>
                )}

                {chatResponse && chatMetadata?.deep_reasoning_active && chatMetadata?.degraded_sources?.length > 0 && (
                  <div
                    className="p-3 border border-[hsl(var(--warning))] bg-[hsl(var(--warning-soft))] rounded-lg flex items-start gap-3"
                    data-testid="deep-reasoning-partial-context"
                  >
                    <Badge variant="outline" className="text-foreground border-[hsl(var(--warning))] bg-background shrink-0">
                      Contexto parcial
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      Algunas fuentes de contexto no estaban disponibles; el análisis puede estar incompleto.
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
                  <MessageCircle className={[
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
                    placeholder="Pregunta a tu mentor..."
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

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="deep-reasoning-toggle">Razonar</Label>
                    <p className="text-xs text-muted-foreground">
                      Responde con análisis profundo. No ejecuta acciones automáticamente.
                    </p>
                  </div>
                  <Switch
                    id="deep-reasoning-toggle"
                    checked={deepReasoning}
                    onCheckedChange={setDeepReasoning}
                    disabled={chatLoading || userDataQa}
                    data-testid="deep-reasoning-toggle"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="user-data-qa-toggle">Datos de la app</Label>
                    <p className="text-xs text-muted-foreground">
                      Responde consultando tus tareas, misiones, stats, diario y challenges.
                    </p>
                  </div>
                  <Switch
                    id="user-data-qa-toggle"
                    checked={userDataQa}
                    onCheckedChange={setUserDataQa}
                    disabled={chatLoading || deepReasoning || projectPlan || Boolean(pendingDraft)}
                    data-testid="user-data-qa-toggle"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="project-plan-toggle" className="flex items-center gap-1.5">
                      <Rocket className="w-3.5 h-3.5 text-primary" />
                      Modo plan
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Diseña un proyecto completo (tareas y rutinas hasta una fecha) a partir de una meta.
                    </p>
                  </div>
                  <Switch
                    id="project-plan-toggle"
                    checked={projectPlan}
                    onCheckedChange={setProjectPlan}
                    disabled={chatLoading || deepReasoning || userDataQa}
                    data-testid="project-plan-toggle"
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPendingDraft(null)}
                      >
                        Cerrar aviso
                      </Button>
                    </div>
                  </div>
                )}

                <ConversationHistory
                  ref={conversationHistoryRef}
                  activeSessionId={sessionId}
                  onSelectConversation={handleSelectConversation}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="challenges" className="space-y-4">
            <ChallengesTab />
          </TabsContent>
        </Tabs>

        <TaskDraftModal
          isOpen={showTaskDraftModal}
          onClose={() => setShowTaskDraftModal(false)}
          draftData={currentDraftData}
          onConfirm={(editedData) => confirmTaskDraft(editedData)}
          onReject={rejectTaskDraft}
        />

        <MissionDraftModal
          isOpen={showMissionDraftModal}
          onClose={() => setShowMissionDraftModal(false)}
          draftData={currentDraftData}
          onConfirm={(editedData) => confirmMissionDraft(editedData)}
          onReject={rejectMissionDraft}
        />

        <ProjectDraftModal
          isOpen={showProjectDraftModal}
          onClose={() => setShowProjectDraftModal(false)}
          draftData={currentDraftData}
          onConfirm={(editedData) => confirmProjectDraft(editedData)}
          onReject={rejectProjectDraft}
        />
      </div>
    </Layout>
  );
}
