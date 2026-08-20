import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { tasksApi, reflectionsApi } from '../lib/api';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import TaskDraftModal from '../components/TaskDraftModal';
import MissionDraftModal from '../components/MissionDraftModal';
import MissionProposalsModal from '../components/MissionProposalsModal';
import EmotionPicker from '../components/EmotionPicker';
import EmotionBadge from '../components/EmotionBadge';
import EmotionDiscardAlert from '../components/EmotionDiscardAlert';
import { CharacterStats } from '../presentation/components/character/CharacterStats';
import { LevelStaircase } from '../presentation/components/character/LevelStaircase';
import { MissionsList } from '../presentation/components/character/MissionsList';
import { StatsHistoryChart } from '../presentation/components/character/StatsHistoryChart';
import { ReflectionKPIs } from '../presentation/components/character/ReflectionKPIs';
import { MissionEvolutionChart } from '../presentation/components/character/MissionEvolutionChart';
import { FinishedList } from '../presentation/components/character/FinishedList';
import { BodyCheckinSection } from '../presentation/components/character/bodycheckin/BodyCheckinSection';
import { ProfileEmptyState } from '../presentation/components/profile-theme/ProfileEmptyState';
import { ProfileHeroCard } from '../presentation/components/profile-theme/ProfileHeroCard';
import { useCharacter } from '../presentation/viewmodels/useCharacter';
import { useMissions } from '../presentation/viewmodels/useMissions';
import { useDrafts } from '../presentation/viewmodels/useDrafts';
import { buildRelativeDateRange, getPersistedRange, persistRange } from '../lib/dateRangeUtils';
import { formatMentorResponseText } from '../lib/mentorTextFormat';
import { formatStatLabel } from '../lib/statUtils';
import { consumeNightlyReviewPayload } from '../lib/schedulerReview/nightlyReviewNotification';
import { consumeMentorBehaviorPayload } from '../lib/schedulerReview/mentorBehaviorNotification';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { SEMANTIC_COLORS } from '../theme/semanticTokens';
import { getProfileEmoji, getProfileName } from '../lib/profileUtils';
import { useProfileTheme } from '../theme/useProfileTheme';
import { PROFILE_THEME_IDS, PROFILE_THEMES } from '../theme/profileThemes';
import {
  Target, Scroll, HeartPulse,
  XCircle, CheckCircle2, Clock
} from 'lucide-react';

const dedupeReflections = (items = []) => {
  const map = new Map();
  items.forEach((item) => {
    const key = item?.id || `${item?.prompt_profile || 'unknown'}-${item?.created_at || ''}-${item?.content || ''}`;
    if (key) map.set(key, item);
  });
  return Array.from(map.values());
};

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
  const [searchParams, setSearchParams] = useSearchParams();
  const linkedNightlyReview = searchParams.get('nightly_review') === '1';
  const linkedMentorBehavior = searchParams.get('mentor_behavior') === '1';
  // Custom hooks for state management
  const {
    character,
    statsInfo,
    statsHistory,
    cumulativeTotals,
    reflectionKPIs,
    loading,
    historyLoading,
    justLeveledUp,
    dismissLevelUp,
    fetchCharacter,
    fetchStatsInfo,
    fetchStatsHistory,
    fetchCumulativeTotals,
    calculateReflectionKPIs
  } = useCharacter();
  const {
    missions,
    completedMissions,
    failedMissions,
    generatingMissions,
    nightlyReviewLoading,
    nightlyReviewResult,
    mentorBehaviorNotice,
    showConfirmModal,
    proposedMissions,
    showScheduleModal,
    scheduleDateTime,
    missionStatsHistory,
    missionStatsLoading,
    fetchMissions,
    fetchCompletedMissions,
    fetchFailedMissions,
    generateMissions,
    performNightlyReview,
    hydrateNightlyReviewResult,
    hydrateMentorBehaviorNotice,
    dismissMentorBehaviorNotice,
    confirmMissionAt,
    confirmAllProposedMissions,
    rejectMissionAt,
    rejectAllProposedMissions,
    confirmingMissions,
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

  const { theme, persistedProfileId } = useProfileTheme();
  const activeReflectionProfile = persistedProfileId || 'stoic';
  const profileName = theme.name;

  // Local state for reflections and mission completion
  const [reflections, setReflections] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedMission, setSelectedMission] = useState(null);
  const [reflectionText, setReflectionText] = useState('');
  const [missionReflectionText, setMissionReflectionText] = useState('');
  const [missionEmotionSnapshot, setMissionEmotionSnapshot] = useState(null);
  const [missionEmotionDiscardPrompt, setMissionEmotionDiscardPrompt] = useState(null);
  const ignoreRepeatedMissionEmotionCloseRef = useRef(false);
  const missionReflectionRef = useRef(null);
  const [isCompletingMission, setIsCompletingMission] = useState(false);
  const [selectedDate, setSelectedDate] = useState(''); // For reflection filter
  const [reflectionHistoryMode, setReflectionHistoryMode] = useState('journal');
  const [selectedReflectionProfiles, setSelectedReflectionProfiles] = useState(() => [activeReflectionProfile]);
  const lastActiveReflectionProfileRef = useRef(activeReflectionProfile);
  const [aiResponse, setAiResponse] = useState(null); // AI mentor response
  const [statChanges, setStatChanges] = useState(null); // Character stat changes
  const [dailyReflectionsCount, setDailyReflectionsCount] = useState(0); // Today's reflection count
  const [emotionSnapshot, setEmotionSnapshot] = useState(null); // Selected emotion for next reflection
  const [isSubmittingReflection, setIsSubmittingReflection] = useState(false); // Prevent duplicate reflection submits
  const reflectionSubmitLockRef = useRef(false); // Immediate lock to avoid same-tick double clicks
  const [pendingReflectionDraft, setPendingReflectionDraft] = useState(null); // Deferred draft CTA for diary flow
  const [draftNowTick, setDraftNowTick] = useState(Date.now()); // 1s ticker for TTL countdown
  
  // State for charts
  const initialStatsRange = getPersistedRange('character_stats_range');
  const initialMissionRangeValue = getPersistedRange('character_mission_range');
  const initialReflectionRange = buildRelativeDateRange(parseInt(initialStatsRange, 10));
  const initialMissionRange = buildRelativeDateRange(parseInt(initialMissionRangeValue, 10));
  const [statsRange, setStatsRange] = useState(initialStatsRange);
  const [statsFromDate, setStatsFromDate] = useState(initialReflectionRange.fromDate);
  const [statsToDate, setStatsToDate] = useState(initialReflectionRange.toDate);
  const [missionRange, setMissionRange] = useState(initialMissionRangeValue);
  const [missionFromDate, setMissionFromDate] = useState(initialMissionRange.fromDate);
  const [missionToDate, setMissionToDate] = useState(initialMissionRange.toDate);

  // 'custom' means an explicit from/to pick, not one of the day-count
  // options — nothing meaningful to restore next visit, so it's skipped.
  useEffect(() => {
    if (statsRange !== 'custom') persistRange('character_stats_range', statsRange);
  }, [statsRange]);

  useEffect(() => {
    if (missionRange !== 'custom') persistRange('character_mission_range', missionRange);
  }, [missionRange]);

  useEffect(() => {
    const previousActiveProfile = lastActiveReflectionProfileRef.current;
    setSelectedReflectionProfiles((currentProfiles) => {
      const validProfiles = currentProfiles.filter((profile) => PROFILE_THEME_IDS.includes(profile));
      if (validProfiles.length === 0) return [activeReflectionProfile];
      if (
        validProfiles.length === 1
        && validProfiles[0] === previousActiveProfile
        && previousActiveProfile !== activeReflectionProfile
      ) {
        return [activeReflectionProfile];
      }
      return validProfiles;
    });
    lastActiveReflectionProfileRef.current = activeReflectionProfile;
  }, [activeReflectionProfile]);

  const reflectionProfileFilters = useMemo(
    () => selectedReflectionProfiles.filter((profile) => PROFILE_THEME_IDS.includes(profile)),
    [selectedReflectionProfiles]
  );
  const effectiveReflectionProfiles = useMemo(
    () => (reflectionProfileFilters.length > 0 ? reflectionProfileFilters : [activeReflectionProfile]),
    [activeReflectionProfile, reflectionProfileFilters]
  );
  const allReflectionProfilesSelected = effectiveReflectionProfiles.length === PROFILE_THEME_IDS.length;
  const shouldShowReflectionProfileBadges = effectiveReflectionProfiles.length > 1;

  const reflectionProfileFilterLabel = (() => {
    if (allReflectionProfilesSelected) return 'Todos los perfiles';
    if (effectiveReflectionProfiles.length === 1) {
      return `${getProfileEmoji(effectiveReflectionProfiles[0])} ${getProfileName(effectiveReflectionProfiles[0])}`;
    }
    return `${effectiveReflectionProfiles.length} perfiles`;
  })();

  const toggleReflectionProfile = (profileId) => {
    setSelectedReflectionProfiles((currentProfiles) => {
      const currentSet = new Set(currentProfiles.filter((profile) => PROFILE_THEME_IDS.includes(profile)));
      if (currentSet.has(profileId)) {
        if (currentSet.size === 1) return currentProfiles;
        currentSet.delete(profileId);
      } else {
        currentSet.add(profileId);
      }
      return PROFILE_THEME_IDS.filter((profile) => currentSet.has(profile));
    });
  };

  const selectAllReflectionProfiles = () => {
    setSelectedReflectionProfiles([...PROFILE_THEME_IDS]);
  };

  const resetReflectionProfilesToActive = () => {
    setSelectedReflectionProfiles([activeReflectionProfile]);
  };

  const fetchReflectionsForSelectedProfiles = useCallback(async (params) => {
    const responses = await Promise.all(
      effectiveReflectionProfiles.map((promptProfile) => reflectionsApi.getAll({
        ...params,
        prompt_profile: promptProfile,
      }))
    );
    return dedupeReflections(responses.flatMap((response) => response.data || []));
  }, [effectiveReflectionProfiles]);

  const renderReflectionProfileBadge = (profileId) => {
    if (!shouldShowReflectionProfileBadges || !profileId || !PROFILE_THEMES[profileId]) return null;
    const profileTheme = PROFILE_THEMES[profileId];
    return (
      <Badge
        variant="outline"
        className="text-xs"
        style={{
          color: profileTheme.primary,
          borderColor: profileTheme.primary,
          backgroundColor: profileTheme.soft,
        }}
      >
        {getProfileEmoji(profileId)} {getProfileName(profileId)}
      </Badge>
    );
  };

  useEffect(() => {
    if (!linkedNightlyReview) return;

    const payload = consumeNightlyReviewPayload();
    if (payload) {
      const proposalStatus = payload.proposal_status || payload.context?.proposal_status || null;
      const hydratedResult = {
        review_date: payload.review_date,
        review_text: payload.review_text || payload.summary || payload.message,
        summary: payload.summary || payload.message,
        tasks_completed: payload.tasks_completed || 0,
        tasks_failed: payload.tasks_failed || 0,
        proposed_missions: payload.proposed_missions || [],
      };
      if (proposalStatus) {
        hydratedResult.proposal_status = proposalStatus;
      }
      hydrateNightlyReviewResult(hydratedResult);
    } else {
      toast.info('La revisión nocturna ya no está disponible en esta sesión.');
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('nightly_review');
    nextParams.delete('review_date');
    setSearchParams(nextParams, { replace: true });
  }, [linkedNightlyReview, hydrateNightlyReviewResult, searchParams, setSearchParams]);

  useEffect(() => {
    if (!linkedMentorBehavior) return;

    const payload = consumeMentorBehaviorPayload();
    if (payload) {
      hydrateMentorBehaviorNotice(payload);
    } else {
      toast.info('El aviso del Mentor ya no está disponible en esta sesión.');
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('mentor_behavior');
    nextParams.delete('pattern_date');
    setSearchParams(nextParams, { replace: true });
  }, [linkedMentorBehavior, hydrateMentorBehaviorNotice, searchParams, setSearchParams]);

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
        fetchFailedMissions(),
        fetchStatsHistory({ fromDate: statsFromDate, toDate: statsToDate }),
        fetchMissionEvolution({ fromDate: missionFromDate, toDate: missionToDate }),
        fetchCumulativeTotals(),
      ]);
      
      const reflectionDateParams = selectedDate ? { date: selectedDate } : {};
      const activeJournalRequest = reflectionsApi.getAll({
        ...reflectionDateParams,
        reflection_type: 'journal',
        prompt_profile: activeReflectionProfile,
      });
      const selectedJournalRequest = (
        effectiveReflectionProfiles.length === 1
        && effectiveReflectionProfiles[0] === activeReflectionProfile
      )
        ? activeJournalRequest.then((response) => dedupeReflections(response.data || []))
        : fetchReflectionsForSelectedProfiles({
            ...reflectionDateParams,
            reflection_type: 'journal',
          });
      const [activeJournalReflectionsRes, selectedJournalReflections, tasksRes] = await Promise.all([
        activeJournalRequest,
        selectedJournalRequest,
        tasksApi.getAll()
      ]);

      let displayReflections = [...selectedJournalReflections]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      if (reflectionHistoryMode === 'linked') {
        const [taskReflections, missionReflections] = await Promise.all([
          fetchReflectionsForSelectedProfiles({
            ...reflectionDateParams,
            reflection_type: 'task',
          }),
          fetchReflectionsForSelectedProfiles({
            ...reflectionDateParams,
            reflection_type: 'mission',
          }),
        ]);
        displayReflections = [
          ...taskReflections,
          ...missionReflections,
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      } else if (reflectionHistoryMode === 'routine') {
        const routineDateParams = selectedDate ? { routine_occurrence_date: selectedDate } : {};
        const routineReflections = await fetchReflectionsForSelectedProfiles({
          ...routineDateParams,
          reflection_type: 'routine',
        });
        displayReflections = routineReflections
          .sort((a, b) => String(b.routine_occurrence_date || b.created_at).localeCompare(String(a.routine_occurrence_date || a.created_at)));
      }

      setReflections(displayReflections);
      setTasks(tasksRes.data);
      
      // Calculate diary KPIs only from journal reflections.
      calculateReflectionKPIs(activeJournalReflectionsRes.data, activeStatsInfo || {});
      
      // Count today's reflections (without date filter)
      if (!selectedDate) {
        const today = new Date().toISOString().split('T')[0];
        const todayReflections = activeJournalReflectionsRes.data.filter(r =>
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
    fetchFailedMissions,
    fetchStatsHistory,
    fetchMissionEvolution,
    fetchCumulativeTotals,
    calculateReflectionKPIs,
    selectedDate,
    reflectionHistoryMode,
    statsFromDate,
    statsToDate,
    missionFromDate,
    missionToDate,
    activeReflectionProfile,
    effectiveReflectionProfiles,
    fetchReflectionsForSelectedProfiles,
  ]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const hasMissionEmotionWithoutReflection = !!missionEmotionSnapshot && !missionReflectionText.trim();

  const requestMissionEmotionDiscardConfirmation = (action, confirmLabel = 'Continuar sin guardar') => {
    if (!hasMissionEmotionWithoutReflection) {
      action();
      return;
    }
    setMissionEmotionDiscardPrompt({ action, confirmLabel });
  };

  const confirmMissionEmotionDiscard = () => {
    const pendingAction = missionEmotionDiscardPrompt?.action;
    setMissionEmotionSnapshot(null);
    setMissionEmotionDiscardPrompt(null);
    pendingAction?.();
  };

  const cancelMissionEmotionDiscard = () => {
    ignoreRepeatedMissionEmotionCloseRef.current = true;
    setMissionEmotionDiscardPrompt(null);
    setTimeout(() => {
      missionReflectionRef.current?.focus();
      setTimeout(() => {
        ignoreRepeatedMissionEmotionCloseRef.current = false;
      }, 0);
    }, 0);
  };

  const shouldIgnoreRepeatedMissionEmotionClose = () => {
    return ignoreRepeatedMissionEmotionCloseRef.current;
  };

  // Mission completion handler
  const handleCompleteMission = async (success, reason = null, skipEmotionDiscardConfirmation = false) => {
    if (!selectedMission) return;

    if (!skipEmotionDiscardConfirmation && hasMissionEmotionWithoutReflection) {
      requestMissionEmotionDiscardConfirmation(
        () => handleCompleteMission(success, reason, true),
        success ? 'Completar sin emoción' : 'Marcar fallida sin emoción',
      );
      return;
    }

    setIsCompletingMission(true);
    try {
      const missionSnapshot = selectedMission;
      const response = await completeMission(
        missionSnapshot.id,
        success,
        {
          reflection: missionReflectionText || null,
          emotionSnapshot: missionEmotionSnapshot,
          reason,
          missionContext: missionSnapshot,
        },
      );
      
      if (response.new_stats) {
        fetchCharacter();
      }
      
      setSelectedMission(null);
      setMissionReflectionText('');
      setMissionEmotionSnapshot(null);

      await fetchAllData();
    } catch (error) {
      console.error('Error completing mission:', error);
    } finally {
      setIsCompletingMission(false);
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

  // Schedule mission handler
  const handleScheduleMission = async () => {
    await scheduleMission(fetchAllData);
  };

  const getReflectionHistoryDescription = () => {
    if (reflectionHistoryMode === 'journal') return 'Entradas libres del diario';
    if (reflectionHistoryMode === 'routine') return 'Reflexiones diarias agrupadas por rutina';
    return 'Comentarios guardados desde tareas y misiones';
  };

  const getReflectionHistoryTitle = () => {
    if (reflectionHistoryMode === 'journal') return 'Entradas del diario';
    if (reflectionHistoryMode === 'routine') return 'Reflexiones de rutinas';
    return 'Reflexiones de tareas y misiones';
  };

  const getReflectionTypeLabel = (type) => {
    if (type === 'mission') return 'Misión';
    if (type === 'routine') return 'Rutina';
    if (type === 'task') return 'Tarea';
    return 'Diario';
  };

  const formatRoutineOccurrenceDate = (value) => {
    if (!value) return 'Sin fecha de rutina';
    return new Date(`${value}T00:00:00`).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const routineReflectionGroups = reflectionHistoryMode === 'routine'
    ? Object.values(reflections.reduce((acc, reflection) => {
        const key = reflection.routine_id || reflection.source_item_title || 'rutina-sin-id';
        if (!acc[key]) {
          acc[key] = {
            id: key,
            title: reflection.source_item_title || 'Rutina sin título',
            latest: reflection.routine_occurrence_date || reflection.created_at || '',
            entries: [],
          };
        }
        acc[key].entries.push(reflection);
        const effectiveDate = reflection.routine_occurrence_date || reflection.created_at || '';
        if (String(effectiveDate) > String(acc[key].latest || '')) {
          acc[key].latest = effectiveDate;
        }
        return acc;
      }, {}))
        .map((group) => ({
          ...group,
          entries: group.entries.sort((a, b) => String(b.routine_occurrence_date || b.created_at).localeCompare(String(a.routine_occurrence_date || a.created_at))),
        }))
        .sort((a, b) => String(b.latest).localeCompare(String(a.latest)))
    : [];

  const activeProfileMissionStats = useMemo(() => ({
    completed: completedMissions.length,
    failed: failedMissions.length,
  }), [completedMissions, failedMissions]);

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
              <p className="font-bold text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
                {character?.level_title}
              </p>
            </div>
          }
        />

        {/* Character Stats Component */}
        <CharacterStats
          character={character}
          statsInfo={statsInfo}
          cumulativeTotals={cumulativeTotals}
          missionTotals={activeProfileMissionStats}
        />

        {/* Level Staircase — gamified level progress */}
        <LevelStaircase
          level={character?.level || 0}
          levelTitle={character?.level_title}
          theme={theme}
          justLeveledUp={justLeveledUp}
          onAnimationEnd={dismissLevelUp}
        />

        {/* Nightly Review Result (if exists) */}
        {nightlyReviewResult && (
          <Card className="border-primary/30 bg-primary/10">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-primary mb-2">Revisión Nocturna</p>
                  <p className="text-sm text-foreground mb-2">{nightlyReviewResult.review_text || nightlyReviewResult.analysis}</p>
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

        {/* MENTOR_BEHAVIOR notice (if opened from its notification) */}
        {mentorBehaviorNotice && (
          <Card className="border-primary/30 bg-primary/10" data-testid="mentor-behavior-notice">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-primary mb-2">🧭 {mentorBehaviorNotice.title}</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{mentorBehaviorNotice.body}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={dismissMentorBehaviorNotice}>✕</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="missions" className="space-y-4">
          <TabsList className="bg-muted p-1 rounded-full">
            <TabsTrigger value="missions" className="rounded-full data-[state=active]:bg-card">
              <Target className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Misiones
            </TabsTrigger>
            <TabsTrigger value="reflection" className="rounded-full data-[state=active]:bg-card">
              <Scroll className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Diario
            </TabsTrigger>
            <TabsTrigger value="body-checkin" className="rounded-full data-[state=active]:bg-card">
              <HeartPulse className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Registro corporal
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
                  Historial {(completedMissions.length + failedMissions.length) > 0 && `(${completedMissions.length + failedMissions.length})`}
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
                    setMissionEmotionSnapshot(null);
                    setSelectedMission(mission);
                  }}
                  onScheduleMission={openScheduleModal}
                  onDeleteMission={deleteMission}
                  statsInfo={statsInfo}
                />
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                <FinishedList
                  items={[...completedMissions, ...failedMissions]
                    .map((m) => ({
                      id: m.id,
                      title: m.title,
                      subtitle: m.description || null,
                      completed_at: m.completed_at || m.updated_at,
                      status: m.status,
                    }))
                    .sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at)))}
                  emptyText="Aún no has completado ni fallado ninguna misión."
                />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Body Check-in Tab */}
          <TabsContent value="body-checkin" className="space-y-4">
            {/* Check-in corporal — unidad independiente de Misiones y Diario
                (estado, guardado, errores y drafts propios). */}
            <BodyCheckinSection statsInfo={statsInfo} onStatsChanged={fetchCharacter} />
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
              title="Evolución de Cambios Acumulados (Diario)"
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
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {formatMentorResponseText(aiResponse)}
                    </p>
                    
                    {statChanges && (() => {
                      const activeStatKeys = Object.keys(statsInfo || {});
                      const filteredChanges = Object.entries(statChanges).filter(([stat, value]) =>
                        value !== 0 && (activeStatKeys.length === 0 || activeStatKeys.includes(stat))
                      );
                      if (filteredChanges.length === 0) return null;
                      return (
                        <div className="mt-3 pt-3 border-t border-primary/20">
                          <p className="text-xs font-semibold text-primary mb-2">Cambios de Carácter:</p>
                          <div className="flex flex-wrap gap-2">
                            {filteredChanges.map(([stat, value]) => (
                              <Badge
                                key={stat}
                                className={value > 0 ? 'bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]' : 'bg-[hsl(var(--destructive-soft))] text-destructive'}
                              >
                                {formatStatLabel(stat, statsInfo)}: {value > 0 ? '+' : ''}{value}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    
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
                        {getReflectionHistoryDescription()}
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
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setReflectionHistoryMode('routine')}
                        className={reflectionHistoryMode === 'routine' ? 'border-primary text-primary bg-primary/10' : ''}
                      >
                        Rutinas
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                    <div>
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

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Filtrar por perfil:
                      </label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-between md:w-56"
                            data-testid="reflection-profile-filter-trigger"
                          >
                            <span className="truncate">{reflectionProfileFilterLabel}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                          <DropdownMenuLabel>Perfiles visibles</DropdownMenuLabel>
                          <DropdownMenuCheckboxItem
                            checked={allReflectionProfilesSelected}
                            onSelect={(event) => event.preventDefault()}
                            onCheckedChange={(checked) => {
                              if (checked) selectAllReflectionProfiles();
                              else resetReflectionProfilesToActive();
                            }}
                          >
                            Todos los perfiles
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuSeparator />
                          {PROFILE_THEME_IDS.map((profileId) => {
                            const profileTheme = PROFILE_THEMES[profileId];
                            const isChecked = effectiveReflectionProfiles.includes(profileId);
                            return (
                              <DropdownMenuCheckboxItem
                                key={profileId}
                                checked={isChecked}
                                onSelect={(event) => event.preventDefault()}
                                onCheckedChange={() => toggleReflectionProfile(profileId)}
                              >
                                <span className="mr-2">{getProfileEmoji(profileId)}</span>
                                <span>{getProfileName(profileId)}</span>
                                {profileId === activeReflectionProfile && (
                                  <span
                                    className="ml-auto text-[11px] font-medium"
                                    style={{ color: profileTheme.primary }}
                                  >
                                    activo
                                  </span>
                                )}
                              </DropdownMenuCheckboxItem>
                            );
                          })}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={resetReflectionProfilesToActive}>
                            Ver solo perfil activo
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                {/* Reflections History */}
                {reflections.length > 0 && (
                  <div className="border-t pt-6">
                    <h3 className="text-sm font-semibold text-foreground mb-4">
                      {getReflectionHistoryTitle()} ({reflections.length})
                      {selectedDate && <span className="text-muted-foreground font-normal"> - {new Date(selectedDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
                    </h3>
                    {reflectionHistoryMode === 'routine' ? (
                      <div className="space-y-5 max-h-[500px] overflow-y-auto">
                        {routineReflectionGroups.map((group) => (
                          <div key={group.id} className="rounded-lg border bg-muted/40 p-4">
                            <div className="mb-3 flex items-center justify-between gap-2">
                              <h4 className="text-sm font-semibold text-foreground">{group.title}</h4>
                              <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30 text-primary">
                                {group.entries.length}
                              </Badge>
                            </div>
                            <div className="space-y-3">
                              {group.entries.map((reflection) => (
                                <div key={reflection.id} className="rounded-md border bg-card p-3">
                                  <div className="mb-2 flex items-center justify-between gap-2">
                                    <span className="text-xs font-medium text-muted-foreground">
                                      Día de rutina: {formatRoutineOccurrenceDate(reflection.routine_occurrence_date)}
                                    </span>
                                    <div className="flex flex-wrap justify-end gap-2">
                                      <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30 text-primary">
                                        Rutina
                                      </Badge>
                                      {renderReflectionProfileBadge(reflection.prompt_profile)}
                                      <EmotionBadge emotionSnapshot={reflection.emotion_snapshot} />
                                    </div>
                                  </div>
                                  <p className="text-xs text-muted-foreground mb-2">
                                    Escrita: {new Date(reflection.created_at).toLocaleDateString('es-ES', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                  <p className="text-sm text-foreground whitespace-pre-wrap mb-3">
                                    {reflection.content}
                                  </p>
                                  {reflection.ai_response && (
                                    <div className="mt-3 p-3 bg-primary/10 border-l-4 border-primary rounded">
                                      <p className="text-xs font-semibold text-primary mb-1">Mentor:</p>
                                      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                                        {formatMentorResponseText(reflection.ai_response)}
                                      </p>
                                    </div>
                                  )}
                                  {reflection.stat_changes && (() => {
                                    const activeStatKeys = Object.keys(statsInfo || {});
                                    const filteredChanges = Object.entries(reflection.stat_changes).filter(([stat, value]) =>
                                      value !== 0 && (activeStatKeys.length === 0 || activeStatKeys.includes(stat))
                                    );
                                    if (filteredChanges.length === 0) return null;
                                    return (
                                      <div className="mt-2 flex flex-wrap gap-1">
                                        {filteredChanges.map(([stat, value]) => (
                                          <Badge
                                            key={stat}
                                            variant="outline"
                                            className={`text-xs ${value > 0 ? 'bg-[hsl(var(--success-soft))] border-[hsl(var(--success))] text-[hsl(var(--success))]' : 'bg-[hsl(var(--destructive-soft))] border-destructive text-destructive'}`}
                                          >
                                            {formatStatLabel(stat, statsInfo)}: {value > 0 ? '+' : ''}{value}
                                          </Badge>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
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
                                  {getReflectionTypeLabel(reflection.reflection_type)}
                                </Badge>
                              )}
                              {renderReflectionProfileBadge(reflection.prompt_profile)}
                              <EmotionBadge emotionSnapshot={reflection.emotion_snapshot} />
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
                              <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                                {formatMentorResponseText(reflection.ai_response)}
                              </p>
                            </div>
                          )}
                          
                          {reflection.stat_changes && (() => {
                            const activeStatKeys = Object.keys(statsInfo || {});
                            const filteredChanges = Object.entries(reflection.stat_changes).filter(([stat, value]) =>
                              value !== 0 && (activeStatKeys.length === 0 || activeStatKeys.includes(stat))
                            );
                            if (filteredChanges.length === 0) return null;
                            return (
                              <div className="mt-3 flex flex-wrap gap-1">
                                {filteredChanges.map(([stat, value]) => (
                                  <Badge
                                    key={stat}
                                    variant="outline"
                                    className={`text-xs ${value > 0 ? 'bg-[hsl(var(--success-soft))] border-[hsl(var(--success))] text-[hsl(var(--success))]' : 'bg-[hsl(var(--destructive-soft))] border-destructive text-destructive'}`}
                                  >
                                    {formatStatLabel(stat, statsInfo)}: {value > 0 ? '+' : ''}{value}
                                  </Badge>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                    )}
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
                        : reflectionHistoryMode === 'routine'
                        ? 'No hay reflexiones de rutinas guardadas'
                        : 'No hay reflexiones de tareas o misiones guardadas'
                    }
                    description="Cuando escribas o cierres tareas con reflexión, el historial aparecerá aquí."
                    compact
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        {/* Mission Completion Dialog */}
        <Dialog
          open={!!selectedMission}
          onOpenChange={(open) => {
            if (!open && !shouldIgnoreRepeatedMissionEmotionClose()) {
              requestMissionEmotionDiscardConfirmation(() => {
                setSelectedMission(null);
                setMissionReflectionText('');
                setMissionEmotionSnapshot(null);
              }, 'Salir sin guardar');
            }
          }}
        >
          <DialogContent
            onInteractOutside={(event) => {
              if (missionEmotionDiscardPrompt) event.preventDefault();
            }}
            onEscapeKeyDown={(event) => {
              if (missionEmotionDiscardPrompt) event.preventDefault();
            }}
          >
            <DialogHeader>
              <DialogTitle>Completar Misión</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm">{selectedMission?.title}</p>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Comentario o reflexión
              </label>
              <Textarea
                ref={missionReflectionRef}
                placeholder="¿Qué observaste, aprendiste o sentiste al hacer esto?"
                value={missionReflectionText}
                onChange={(e) => setMissionReflectionText(e.target.value)}
                disabled={isCompletingMission}
              />
              <EmotionPicker
                value={missionEmotionSnapshot}
                onChange={setMissionEmotionSnapshot}
                disabled={isCompletingMission}
              />
            </div>
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleCompleteMission(false)}
                disabled={isCompletingMission}
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Fallida
              </Button>
              <Button
                onClick={() => handleCompleteMission(true)}
                disabled={isCompletingMission}
                className="flex-1 bg-[hsl(var(--success))] text-white hover:bg-[hsl(var(--success)/0.9)]"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Completada
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <EmotionDiscardAlert
          open={!!missionEmotionDiscardPrompt}
          onOpenChange={(open) => {
            if (!open) setMissionEmotionDiscardPrompt(null);
          }}
          onConfirm={confirmMissionEmotionDiscard}
          onCancel={cancelMissionEmotionDiscard}
          confirmLabel={missionEmotionDiscardPrompt?.confirmLabel}
        />

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
        <MissionProposalsModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          proposals={proposedMissions}
          statsInfo={statsInfo}
          isSubmitting={confirmingMissions}
          onAcceptAt={(index, editedData) => confirmMissionAt(index, editedData, fetchAllData)}
          onRejectAt={(index) => rejectMissionAt(index)}
          onAcceptAll={() => confirmAllProposedMissions(fetchAllData)}
          onRejectAll={() => rejectAllProposedMissions()}
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
