import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import ConversationHistory from '../components/chat/ConversationHistory';
import TaskDraftModal from '../components/TaskDraftModal';
import MissionDraftModal from '../components/MissionDraftModal';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { ChallengesTab } from '../presentation/components/character/ChallengesTab';
import { ProfileHeroCard } from '../presentation/components/profile-theme/ProfileHeroCard';
import { useAgentChat } from '../presentation/viewmodels/useAgentChat';
import { useDrafts } from '../presentation/viewmodels/useDrafts';
import { useProfileTheme } from '../theme/useProfileTheme';
import { Clock, MessageCircle, Repeat, Send } from 'lucide-react';

export default function MentorPage() {
  const { theme } = useProfileTheme();
  const profileName = theme.name;
  const conversationHistoryRef = useRef();
  const [activeTab, setActiveTab] = useState('agent');

  const {
    chatMessage,
    chatResponse,
    chatLoading,
    sessionId,
    sendMessage,
    setChatMessage,
    startNewConversation,
  } = useAgentChat();

  const {
    showTaskDraftModal,
    showMissionDraftModal,
    currentDraftData,
    openDraftModal,
    confirmTaskDraft,
    rejectTaskDraft,
    confirmMissionDraft,
    rejectMissionDraft,
    setShowTaskDraftModal,
    setShowMissionDraftModal,
  } = useDrafts();

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

  const formatDraftType = (type) => {
    if (type === 'task') return 'tarea';
    if (type === 'mission') return 'misión';
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
                  onClick={startNewConversation}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <MessageCircle className="w-3 h-3 mr-1" />
                  Nueva Conversación
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {chatResponse && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{chatResponse}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Pregunta a tu mentor..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
                <Button
                  onClick={handleChat}
                  disabled={!chatMessage.trim() || chatLoading}
                  className="rounded-full w-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {chatLoading ? 'Pensando...' : 'Enviar'}
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
      </div>
    </Layout>
  );
}
