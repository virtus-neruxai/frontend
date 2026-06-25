import { useState, useEffect, useCallback, useRef } from 'react';
import { tasksApi, reflectionsApi } from '../lib/api';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import TaskDraftModal from '../components/TaskDraftModal';
import MissionDraftModal from '../components/MissionDraftModal';
import EmotionPicker from '../components/EmotionPicker';
import ConversationHistory from '../components/chat/ConversationHistory';
import { CharacterStats } from '../presentation/components/character/CharacterStats';
import { MissionsList } from '../presentation/components/character/MissionsList';
import { StatsHistoryChart } from '../presentation/components/character/StatsHistoryChart';
import { ReflectionKPIs } from '../presentation/components/character/ReflectionKPIs';
import { MissionEvolutionChart } from '../presentation/components/character/MissionEvolutionChart';
import { ChallengesTab } from '../presentation/components/character/ChallengesTab';
import { FinishedList } from '../presentation/components/character/FinishedList';
import { ProfileEmptyState } from '../presentation/components/profile-theme/ProfileEmptyState';
import { ProfileHeroCard } from '../presentation/components/profile-theme/ProfileHeroCard';
import { useCharacter } from '../presentation/viewmodels/useCharacter';
import { useMissions } from '../presentation/viewmodels/useMissions';
import { useAgentChat } from '../presentation/viewmodels/useAgentChat';
import { useDrafts } from '../presentation/viewmodels/useDrafts';
import { buildRelativeDateRange } from '../lib/dateRangeUtils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { SEMANTIC_COLORS } from '../theme/semanticTokens';
import { useProfileTheme } from '../theme/useProfileTheme';
import {
  Target, Scroll, MessageCircle, Send,
  XCircle, CheckCircle2, AlertTriangle, Clock, Repeat
} from 'lucide-react';

/**
 * CharacterPage - Refactored Version
 * 
 * This is a refactored version of CharacterPage that demonstrates:
 * - Separation of concerns using custom hooks
 * - Smaller, reusable components
 * - Cleaner code structure (from 1,474 → ~250 lines)
 * 
 * Architecture:
 * - useCharacter: Character state management
 * - useMissions: Missions state management
 * - useAgentChat: Agent chat interactions
 * - useDrafts: Draft confirmations (tasks + missions)
 * - CharacterStats: Stats display component
 * - MissionsList: Missions display component
 * 
 * This structure is designed for easy migration to:
 * - Android (Kotlin + Jetpack Compose)
 * - iOS (Swift + SwiftUI)
 * 
 * See MOBILE-MIGRATION.md for conversion guide
 */
export default function CharacterPageRefactored() {
  // Custom hooks for state management
  const {
    character,
    statsInfo,
    statsHistory,
    reflectionKPIs,
    loading,
    historyLoading,
    fetchCharacter,
    fetchStatsInfo,
    fetchStatsHistory,
    calculateReflectionKPIs
  } = useCharacter();
  const {
    missions,
    completedMissions,
    generatingMissions,
    nightlyReviewLoading,
    nightlyReviewResult,
    showConfirmModal,
    proposedMissions,
    showScheduleModal,
    scheduleDateTime,
    missionStatsHistory,
    missionStatsLoading,
    fetchMissions,
    fetchCompletedMissions,
    generateMissions,
    performNightlyReview,
    confirmMissions,
    rejectProposedMission,
    completeMission,
    deleteMission,
    scheduleMission,
    openScheduleModal,
    fetchMissionEvolution,
    setShowConfirmModal,
    setShowScheduleModal,
    setScheduleDateTime,
  } = useMissions();
  
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
  
  // Ref for refreshing conversation history after sending messages
  const conversationHistoryRef = useRef();

  const { theme } = useProfileTheme();
  const profileName = theme.name;

  // Local state for reflections and mission completion
  const [reflections, setReflections] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedMission, setSelectedMission] = useState(null);
  const [reflectionText, setReflectionText] = useState('');
  const [missionReflectionText, setMissionReflectionText] = useState('');
  const [activeTab, setActiveTab] = useState('missions');
  const [selectedDate, setSelectedDate] = useState(''); // For reflection filter
  const [reflectionHistoryMode, setReflectionHistoryMode] = useState('journal');
  const [aiResponse, setAiResponse] = useState(null); // AI mentor response
  const [statChanges, setStatChanges] = useState(null); // Character stat changes
  const [dailyReflectionsCount, setDailyReflectionsCount] = useState(0); // Today's reflection count
  const [emotionSnapshot, setEmotionSnapshot] = useState(null); // Selected emotion for next reflection
  const [isSubmittingReflection, setIsSubmittingReflection] = useState(false); // Prevent duplicate reflection submits
  const reflectionSubmitLockRef = useRef(false); // Immediate lock to avoid same-tick double clicks
  const [pendingReflectionDraft, setPendingReflectionDraft] = useState(null); // Deferred draft CTA for diary flow
  const [draftNowTick, setDraftNowTick] = useState(Date.now()); // 1s ticker for TTL countdown
  
  // State for charts
  const initialReflectionRange = buildRelativeDateRange(30);
  const initialMissionRange = buildRelativeDateRange(30);
  const [statsRange, setStatsRange] = useState('30');
  const [statsFromDate, setStatsFromDate] = useState(initialReflectionRange.fromDate);
  const [statsToDate, setStatsToDate] = useState(initialReflectionRange.toDate);
  const [missionRange, setMissionRange] = useState('30');
  const [missionFromDate, setMissionFromDate] = useState(initialMissionRange.fromDate);
  const [missionToDate, setMissionToDate] = useState(initialMissionRange.toDate);

  useEffect(() => {
    if (!pendingReflectionDraft) return undefined;
    const id = setInterval(() => setDraftNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [pendingReflectionDraft]);

  useEffect(() => {
    if (!pendingReflectionDraft) return;
    if (Date.now() >= pendingReflectionDraft.expiresAt) {
      setPendingReflectionDraft(null);
      toast.info('La propuesta del mentor ha expirado');
    }
  }, [pendingReflectionDraft, draftNowTick]);

  const formatPendingDraftType = (type) => {
    if (type === 'task') return 'tarea';
    if (type === 'mission') return 'misión';
    return 'propuesta';
  };

  const getPendingDraftTimeLabel = () => {
    if (!pendingReflectionDraft) return '';
    const remainingMs = Math.max(0, pendingReflectionDraft.expiresAt - draftNowTick);
    const remainingSec = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(remainingSec / 60);
    const seconds = remainingSec % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  // Fetch all data on mount
  const fetchAllData = useCallback(async () => {
    try {
      const [, activeStatsInfo] = await Promise.all([
        fetchCharacter(),
        fetchStatsInfo(),
        fetchMissions(),
        fetchCompletedMissions(),
        fetchStatsHistory({ fromDate: statsFromDate, toDate: statsToDate }),
        fetchMissionEvolution({ fromDate: missionFromDate, toDate: missionToDate }),
      ]);
      
      const reflectionDateParams = selectedDate ? { date: selectedDate } : {};
      const [journalReflectionsRes, tasksRes] = await Promise.all([
        reflectionsApi.getAll({ ...reflectionDateParams, reflection_type: 'journal' }),
        tasksApi.getAll()
      ]);

      let displayReflections = journalReflectionsRes.data;
      if (reflectionHistoryMode === 'linked') {
        const [taskReflectionsRes, missionReflectionsRes] = await Promise.all([
          reflectionsApi.getAll({ ...reflectionDateParams, reflection_type: 'task' }),
          reflectionsApi.getAll({ ...reflectionDateParams, reflection_type: 'mission' }),
        ]);
        displayReflections = [
          ...(taskReflectionsRes.data || []),
          ...(missionReflectionsRes.data || []),
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }

      setReflections(displayReflections);
      setTasks(tasksRes.data);
      
      // Calculate diary KPIs only from journal reflections.
      calculateReflectionKPIs(journalReflectionsRes.data, activeStatsInfo || {});
      
      // Count today's reflections (without date filter)
      if (!selectedDate) {
        const today = new Date().toISOString().split('T')[0];
        const todayReflections = journalReflectionsRes.data.filter(r =>
          r.created_at.split('T')[0] === today
        );
        setDailyReflectionsCount(todayReflections.length);
      }
    } catch (error) {
      toast.error('Error al cargar datos');
    }
  }, [
    fetchCharacter,
    fetchStatsInfo,
    fetchMissions,
    fetchCompletedMissions,
    fetchStatsHistory,
    fetchMissionEvolution,
    calculateReflectionKPIs,
    selectedDate,
    reflectionHistoryMode,
    statsFromDate,
    statsToDate,
    missionFromDate,
    missionToDate,
  ]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Mission completion handler
  const handleCompleteMission = async (success, reason = null) => {
    if (!selectedMission) return;
    
    try {
      const missionSnapshot = selectedMission;
      const response = await completeMission(
        missionSnapshot.id,
        success,
        missionReflectionText || null,
        reason,
        missionSnapshot
      );
      
      if (response.new_stats) {
        fetchCharacter();
      }
      
      setSelectedMission(null);
      setMissionReflectionText('');

      await fetchAllData();
    } catch (error) {
      console.error('Error completing mission:', error);
    }
  };

  // Reflection submission handler
  const handleSubmitReflection = async () => {
    if (!reflectionText.trim() || reflectionSubmitLockRef.current) return;
    reflectionSubmitLockRef.current = true;
    setIsSubmittingReflection(true);
    const submittedReflection = reflectionText.trim();
    // A new reflection starts a new proposal lifecycle in this tab.
    setPendingReflectionDraft(null);
    
    try {
      const response = await reflectionsApi.create({ content: reflectionText, emotion_snapshot: emotionSnapshot || undefined });
      const responseData = response.data;
      
      // Show AI response and stat changes
      setAiResponse(responseData.ai_response);
      setStatChanges(responseData.stat_changes);

      // If diary reflection triggered agent handoff with draft, open confirmation modal
      if (responseData?.draft_id && responseData?.ui_action?.action) {
        const actionTypeMap = {
          SHOW_TASK_CONFIRMATION_MODAL: 'task',
          SHOW_MISSION_CONFIRMATION_MODAL: 'mission',
        };
        const draftType = actionTypeMap[responseData.ui_action.action];
        if (draftType) {
          const expiresInSeconds = responseData?.ui_action?.metadata?.expires_in_seconds ?? 3600;
          setPendingReflectionDraft({
            draftId: responseData.draft_id,
            uiAction: responseData.ui_action,
            type: draftType,
            expiresAt: Date.now() + expiresInSeconds * 1000,
            sourceReflectionPreview: submittedReflection.slice(0, 120),
          });
          toast.success('Reflexión guardada. Tienes una propuesta del mentor pendiente de abrir.');
        } else {
          toast.success('Reflexión guardada y analizada');
        }
      } else {
        // Explicitly clear any previous pending proposal if this reflection produced none.
        setPendingReflectionDraft(null);
        toast.success('Reflexión guardada y analizada');
      }
      
      setReflectionText('');
      setEmotionSnapshot(null);

      // Refresh character stats (reflections may update stats)
      await fetchCharacter();
      
      // Refresh reflections list and stats
      await fetchAllData();
    } catch (error) {
      console.error('Error saving reflection:', error);
      toast.error(error.response?.data?.detail || 'Error al guardar la reflexión');
    } finally {
      reflectionSubmitLockRef.current = false;
      setIsSubmittingReflection(false);
    }
  };
  
  // Chart handlers
  const handleStatsRangeChange = useCallback((newRange) => {
    const nextRange = buildRelativeDateRange(parseInt(newRange, 10));
    setStatsRange(newRange);
    setStatsFromDate(nextRange.fromDate);
    setStatsToDate(nextRange.toDate);
  }, []);

  const handleStatsFromDateChange = useCallback((newDate) => {
    setStatsRange('custom');
    setStatsFromDate(newDate);
  }, []);

  const handleStatsToDateChange = useCallback((newDate) => {
    setStatsRange('custom');
    setStatsToDate(newDate);
  }, []);

  const handleMissionRangeChange = useCallback((newRange) => {
    const nextRange = buildRelativeDateRange(parseInt(newRange, 10));
    setMissionRange(newRange);
    setMissionFromDate(nextRange.fromDate);
    setMissionToDate(nextRange.toDate);
  }, []);

  const handleMissionFromDateChange = useCallback((newDate) => {
    setMissionRange('custom');
    setMissionFromDate(newDate);
  }, []);

  const handleMissionToDateChange = useCallback((newDate) => {
    setMissionRange('custom');
    setMissionToDate(newDate);
  }, []);

  // Chat with agent handler
  const handleChat = async () => {
    await sendMessage(chatMessage, ({ draftId, uiAction, type }) => {
      openDraftModal({ draftId, uiAction, type });
    });
    
    // Refresh conversation history after sending message
    if (conversationHistoryRef.current) {
      conversationHistoryRef.current.refresh();
    }
  };

  // Schedule mission handler
  const handleScheduleMission = async () => {
    await scheduleMission(fetchAllData);
  };

  const currentGeneratedMission = proposedMissions[0] || null;
  const generatedMissionDraftData = currentGeneratedMission ? {
    data: {
      ...currentGeneratedMission,
      addToCalendar: currentGeneratedMission.addToCalendar !== false,
      start_date: currentGeneratedMission.scheduled_datetime || currentGeneratedMission.start_date,
      due_date: currentGeneratedMission.expires_at || currentGeneratedMission.due_date,
    },
    metadata: {
      agent_reasoning: currentGeneratedMission.agent_reasoning,
      confidence: currentGeneratedMission.confidence,
    },
  } : null;

  if (loading) {
    return (
      <Layout ambient>
        <div className="h-96 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Cargando tu personaje...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout ambient>
      <div className="space-y-6" data-testid="character-page">
        <ProfileHeroCard
          title={`Carácter · ${profileName}`}
          titleAs="h1"
          description="Desarrolla tu virtud a través de la acción coherente."
          action={
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Nivel {character?.level}</p>
              <p className="font-bold text-primary" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {character?.level_title}
              </p>
            </div>
          }
        />

        {/* Character Stats Component */}
        <CharacterStats character={character} statsInfo={statsInfo} />

        {/* Nightly Review Result (if exists) */}
        {nightlyReviewResult && (
          <Card className="border-primary/30 bg-primary/10">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-primary mb-2">Revisión Nocturna</p>
                  <p className="text-sm text-foreground mb-2">{nightlyReviewResult.analysis}</p>
                  <div className="flex gap-4 text-sm">
                    <span style={{ color: SEMANTIC_COLORS.success }}>✓ {nightlyReviewResult.tasks_completed} completadas</span>
                    <span style={{ color: SEMANTIC_COLORS.destructive }}>✗ {nightlyReviewResult.tasks_failed} fallidas</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowConfirmModal(false)}>✕</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="missions" className="space-y-4" onValueChange={setActiveTab}>
          <TabsList className="bg-muted p-1 rounded-full">
            <TabsTrigger value="missions" className="rounded-full data-[state=active]:bg-card">
              <Target className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Misiones
            </TabsTrigger>
            <TabsTrigger value="challenges" className="rounded-full data-[state=active]:bg-card">
              <Repeat className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Desafíos
            </TabsTrigger>
            <TabsTrigger value="reflection" className="rounded-full data-[state=active]:bg-card">
              <Scroll className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Diario
            </TabsTrigger>
            <TabsTrigger value="agent" className="rounded-full data-[state=active]:bg-card">
              <MessageCircle className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Mentor {profileName}
            </TabsTrigger>
          </TabsList>

          {/* Missions Tab */}
          <TabsContent value="missions" className="space-y-4">
            {/* Mission Evolution Chart */}
            <MissionEvolutionChart
              data={missionStatsHistory}
              range={missionRange}
              onRangeChange={handleMissionRangeChange}
              fromDate={missionFromDate}
              toDate={missionToDate}
              onFromDateChange={handleMissionFromDateChange}
              onToDateChange={handleMissionToDateChange}
              loading={missionStatsLoading}
              statsInfo={statsInfo}
            />

            {/* Active / History sub-tabs */}
            <Tabs defaultValue="active" className="space-y-4">
              <TabsList className="bg-muted p-1 rounded-full">
                <TabsTrigger value="active" className="rounded-full data-[state=active]:bg-card">
                  Activas
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-full data-[state=active]:bg-card">
                  Historial {completedMissions.length > 0 && `(${completedMissions.length})`}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="space-y-4">
                <MissionsList
                  missions={missions}
                  generatingMissions={generatingMissions}
                  nightlyReviewLoading={nightlyReviewLoading}
                  onGenerateMissions={generateMissions}
                  onNightlyReview={performNightlyReview}
                  onSelectMission={(mission) => {
                    setMissionReflectionText('');
                    setSelectedMission(mission);
                  }}
                  onScheduleMission={openScheduleModal}
                  onDeleteMission={deleteMission}
                  statsInfo={statsInfo}
                />
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                <FinishedList
                  items={completedMissions.map((m) => ({
                    id: m.id,
                    title: m.title,
                    subtitle: m.description || null,
                    completed_at: m.completed_at || m.updated_at,
                  }))}
                  emptyText="Aún no has completado ninguna misión."
                />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Challenges Tab */}
          <TabsContent value="challenges" className="space-y-4">
            <ChallengesTab />
          </TabsContent>

          {/* Reflection Tab */}
          <TabsContent value="reflection" className="space-y-4">
            {/* Reflection KPIs */}
            <ReflectionKPIs
              totalReflections={reflectionKPIs.totalReflections}
              pointsGained={reflectionKPIs.pointsGained}
              pointsLost={reflectionKPIs.pointsLost}
              netBalance={reflectionKPIs.netBalance}
              loading={loading}
            />
            
            {/* Stats History Chart */}
            <StatsHistoryChart
              data={statsHistory}
              range={statsRange}
              onRangeChange={handleStatsRangeChange}
              fromDate={statsFromDate}
              toDate={statsToDate}
              onFromDateChange={handleStatsFromDateChange}
              onToDateChange={handleStatsToDateChange}
              loading={historyLoading}
              statsInfo={statsInfo}
            />
            
            {/* Reflection Input Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Diario</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* AI Mentor Response (if exists) */}
                {aiResponse && (
                  <div className="p-4 bg-primary/10 border border-primary/25 rounded-lg">
                    <p className="text-sm font-semibold text-primary mb-2">Respuesta del Mentor:</p>
                    <p className="text-sm text-foreground">{aiResponse}</p>
                    
                    {statChanges && (
                      <div className="mt-3 pt-3 border-t border-primary/20">
                        <p className="text-xs font-semibold text-primary mb-2">Cambios de Carácter:</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(statChanges).map(([stat, value]) => (
                            value !== 0 && (
                              <Badge 
                                key={stat}
                                className={value > 0 ? 'bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]' : 'bg-[hsl(var(--destructive-soft))] text-destructive'}
                              >
                                {stat}: {value > 0 ? '+' : ''}{value}
                              </Badge>
                            )
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <button
                      onClick={() => { setAiResponse(null); setStatChanges(null); }}
                      className="mt-3 text-xs text-primary hover:opacity-80"
                    >
                      Cerrar
                    </button>
                  </div>
                )}

                {/* New Reflection */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">Nueva Reflexión</label>
                    <Badge
                      variant="outline"
                      className="bg-[hsl(var(--info-soft))] border-[hsl(var(--info))] text-[hsl(var(--info))]"
                    >
                      {dailyReflectionsCount} reflexiones hoy
                    </Badge>
                  </div>
                  <Textarea
                    placeholder="¿Qué has aprendido hoy?..."
                    value={reflectionText}
                    onChange={(e) => setReflectionText(e.target.value)}
                    disabled={isSubmittingReflection}
                    className="min-h-[120px] mb-3"
                  />
                  <div className="mb-4">
                    <EmotionPicker value={emotionSnapshot} onChange={setEmotionSnapshot} />
                  </div>
                  <Button
                    onClick={handleSubmitReflection}
                    disabled={!reflectionText.trim() || isSubmittingReflection}
                    className="rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingReflection ? 'Enviando...' : 'Guardar Entrada'}
                  </Button>
                </div>

                {pendingReflectionDraft && (
                  <div className="p-4 border border-[hsl(var(--warning))] bg-[hsl(var(--warning-soft))] rounded-lg">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Tu mentor te propone una {formatPendingDraftType(pendingReflectionDraft.type)}
                        </p>
                        {pendingReflectionDraft.sourceReflectionPreview && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            Basado en: "{pendingReflectionDraft.sourceReflectionPreview}"
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Puedes abrirla, editarla y confirmarla cuando quieras dentro del TTL.
                        </p>
                      </div>
                      <Badge variant="outline" className="text-foreground border-[hsl(var(--warning))] bg-background">
                        <Clock className="w-3 h-3 mr-1" />
                        {getPendingDraftTimeLabel()}
                      </Badge>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        className="bg-primary text-primary-foreground hover:bg-[hsl(var(--primary)/0.9)]"
                        onClick={() => {
                          openDraftModal({
                            draftId: pendingReflectionDraft.draftId,
                            uiAction: pendingReflectionDraft.uiAction,
                            type: pendingReflectionDraft.type,
                          });
                          setPendingReflectionDraft(null);
                        }}
                      >
                        Abrir propuesta
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPendingReflectionDraft(null)}
                      >
                        Cerrar aviso
                      </Button>
                    </div>
                  </div>
                )}

                {/* Date Filter */}
                <div className="border-t pt-4">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Historial de Reflexiones
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {reflectionHistoryMode === 'journal'
                          ? 'Entradas libres del diario'
                          : 'Comentarios guardados desde tareas y misiones'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setReflectionHistoryMode('journal')}
                        className={reflectionHistoryMode === 'journal' ? 'border-primary text-primary bg-primary/10' : ''}
                      >
                        Diario
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setReflectionHistoryMode('linked')}
                        className={reflectionHistoryMode === 'linked' ? 'border-primary text-primary bg-primary/10' : ''}
                      >
                        Tareas y misiones
                      </Button>
                    </div>
                  </div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Filtrar por fecha:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="flex-1 px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    {selectedDate && (
                      <Button
                        variant="outline"
                        onClick={() => setSelectedDate('')}
                        size="sm"
                      >
                        Ver Todas
                      </Button>
                    )}
                  </div>
                </div>

                {/* Reflections History */}
                {reflections.length > 0 && (
                  <div className="border-t pt-6">
                    <h3 className="text-sm font-semibold text-foreground mb-4">
                      {reflectionHistoryMode === 'journal' ? 'Entradas del diario' : 'Reflexiones de tareas y misiones'} ({reflections.length})
                      {selectedDate && <span className="text-muted-foreground font-normal"> - {new Date(selectedDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
                    </h3>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto">
                      {reflections.map((reflection) => (
                        <div
                          key={reflection.id}
                          className="p-4 bg-muted/50 rounded-lg border"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-xs text-muted-foreground">
                              {new Date(reflection.created_at).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <div className="flex flex-wrap justify-end gap-2">
                              {reflectionHistoryMode === 'linked' && (
                                <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30 text-primary">
                                  {reflection.reflection_type === 'mission' ? 'Misión' : 'Tarea'}
                                </Badge>
                              )}
                              {reflection.emotion_snapshot && (
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    reflection.emotion_snapshot.polarity === 'positive'
                                      ? 'bg-[hsl(var(--success-soft))] border-[hsl(var(--success))] text-[hsl(var(--success))]'
                                      : reflection.emotion_snapshot.polarity === 'negative'
                                      ? 'bg-[hsl(var(--destructive-soft))] border-destructive text-destructive'
                                      : 'bg-[hsl(var(--info-soft))] border-[hsl(var(--info))] text-[hsl(var(--info))]'
                                  }`}
                                >
                                  {reflection.emotion_snapshot.emotion} · {reflection.emotion_snapshot.intensity}/5
                                </Badge>
                              )}
                            </div>
                          </div>

                          {reflectionHistoryMode === 'linked' && reflection.source_item_title && (
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Origen: {reflection.source_item_title}
                            </p>
                          )}
                          
                          <p className="text-sm text-foreground whitespace-pre-wrap mb-3">
                            {reflection.content}
                          </p>
                          
                          {reflection.ai_response && (
                            <div className="mt-3 p-3 bg-primary/10 border-l-4 border-primary rounded">
                              <p className="text-xs font-semibold text-primary mb-1">Mentor:</p>
                              <p className="text-xs text-foreground">{reflection.ai_response}</p>
                            </div>
                          )}
                          
                          {reflection.stat_changes && Object.keys(reflection.stat_changes).length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1">
                              {Object.entries(reflection.stat_changes).map(([stat, value]) => (
                                value !== 0 && (
                                  <Badge 
                                    key={stat}
                                    variant="outline"
                                    className={`text-xs ${value > 0 ? 'bg-[hsl(var(--success-soft))] border-[hsl(var(--success))] text-[hsl(var(--success))]' : 'bg-[hsl(var(--destructive-soft))] border-destructive text-destructive'}`}
                                  >
                                    {stat}: {value > 0 ? '+' : ''}{value}
                                  </Badge>
                                )
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {reflections.length === 0 && (
                  <ProfileEmptyState
                    icon={Scroll}
                    title={
                      selectedDate
                        ? 'No hay reflexiones para esta fecha'
                        : reflectionHistoryMode === 'journal'
                        ? 'No hay reflexiones guardadas'
                        : 'No hay reflexiones de tareas o misiones guardadas'
                    }
                    description="Cuando escribas o cierres tareas con reflexión, el historial aparecerá aquí."
                    compact
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Agent Chat Tab */}
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

                {/* Conversation History */}
                <ConversationHistory 
                  ref={conversationHistoryRef}
                  activeSessionId={sessionId}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Mission Completion Dialog */}
        <Dialog
          open={!!selectedMission}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedMission(null);
              setMissionReflectionText('');
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Completar Misión</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm">{selectedMission?.title}</p>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Comentario o reflexión
              </label>
              <Textarea
                placeholder="¿Qué observaste, aprendiste o sentiste al hacer esto?"
                value={missionReflectionText}
                onChange={(e) => setMissionReflectionText(e.target.value)}
              />
            </div>
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleCompleteMission(false)}
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Fallida
              </Button>
              <Button
                onClick={() => handleCompleteMission(true)}
                className="flex-1 bg-[hsl(var(--success))] text-white hover:bg-[hsl(var(--success)/0.9)]"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Completada
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Schedule Mission Dialog */}
        <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Programar Misión</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Fecha y hora</label>
                <input
                  type="datetime-local"
                  value={scheduleDateTime}
                  onChange={(e) => setScheduleDateTime(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowScheduleModal(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleScheduleMission}
                className="bg-primary text-primary-foreground hover:bg-[hsl(var(--primary)/0.9)]"
              >
                Programar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Draft Modals */}
        <MissionDraftModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          draftData={generatedMissionDraftData}
          onConfirm={(editedData) => confirmMissions(editedData, fetchAllData)}
          onReject={rejectProposedMission}
        />

        <TaskDraftModal
          isOpen={showTaskDraftModal}
          onClose={() => setShowTaskDraftModal(false)}
          draftData={currentDraftData}
          onConfirm={(editedData) => confirmTaskDraft(editedData, fetchAllData)}
          onReject={rejectTaskDraft}
        />

        <MissionDraftModal
          isOpen={showMissionDraftModal}
          onClose={() => setShowMissionDraftModal(false)}
          draftData={currentDraftData}
          onConfirm={(editedData) => confirmMissionDraft(editedData, fetchAllData)}
          onReject={rejectMissionDraft}
        />
      </div>
    </Layout>
  );
}
