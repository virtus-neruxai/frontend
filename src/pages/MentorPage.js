import { useRef, useState } from 'react';
import Layout from '../components/Layout';
import ConversationHistory from '../components/chat/ConversationHistory';
import TaskDraftModal from '../components/TaskDraftModal';
import MissionDraftModal from '../components/MissionDraftModal';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { ChallengesTab } from '../presentation/components/character/ChallengesTab';
import { ProfileHeroCard } from '../presentation/components/profile-theme/ProfileHeroCard';
import { useAgentChat } from '../presentation/viewmodels/useAgentChat';
import { useDrafts } from '../presentation/viewmodels/useDrafts';
import { useProfileTheme } from '../theme/useProfileTheme';
import { MessageCircle, Repeat, Send } from 'lucide-react';

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

  const handleChat = async () => {
    await sendMessage(chatMessage, ({ draftId, uiAction, type }) => {
      openDraftModal({ draftId, uiAction, type });
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
