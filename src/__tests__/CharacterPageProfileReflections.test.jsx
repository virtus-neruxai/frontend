import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import CharacterPage from '../pages/CharacterPage';
import { reflectionsApi } from '../lib/api';

const mocks = vi.hoisted(() => ({
  fetchCharacter: vi.fn().mockResolvedValue({}),
  fetchStatsInfo: vi.fn().mockResolvedValue({ presencia: { label: 'Presencia' } }),
  fetchStatsHistory: vi.fn().mockResolvedValue([]),
  fetchCumulativeTotals: vi.fn().mockResolvedValue({}),
  fetchMissions: vi.fn().mockResolvedValue([]),
  fetchCompletedMissions: vi.fn().mockResolvedValue([]),
  fetchFailedMissions: vi.fn().mockResolvedValue([]),
  fetchMissionEvolution: vi.fn().mockResolvedValue([]),
  calculateReflectionKPIs: vi.fn(),
  openDraftModal: vi.fn(),
  hydrateNightlyReviewResult: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('../lib/api', () => ({
  reflectionsApi: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    create: vi.fn(),
  },
  tasksApi: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
  },
  agentApi: {},
}));

vi.mock('../theme/useProfileTheme', () => ({
  useProfileTheme: () => ({
    theme: { name: 'Espiritual' },
    persistedProfileId: 'spiritual',
  }),
}));

vi.mock('../presentation/viewmodels/useCharacter', () => ({
  useCharacter: () => ({
    character: {},
    statsInfo: {},
    statsHistory: [],
    reflectionKPIs: { totalReflections: 0, pointsGained: 0, pointsLost: 0, netBalance: 0 },
    loading: false,
    historyLoading: false,
    justLeveledUp: false,
    dismissLevelUp: vi.fn(),
    fetchCharacter: mocks.fetchCharacter,
    fetchStatsInfo: mocks.fetchStatsInfo,
    fetchStatsHistory: mocks.fetchStatsHistory,
    fetchCumulativeTotals: mocks.fetchCumulativeTotals,
    calculateReflectionKPIs: mocks.calculateReflectionKPIs,
  }),
}));

vi.mock('../presentation/viewmodels/useMissions', () => ({
  useMissions: () => ({
    missions: [],
    completedMissions: [],
    failedMissions: [],
    generatingMissions: false,
    nightlyReviewLoading: false,
    nightlyReviewResult: null,
    showConfirmModal: false,
    proposedMissions: [],
    confirmingMissions: false,
    showScheduleModal: false,
    scheduleDateTime: '',
    missionStatsHistory: [],
    missionStatsLoading: false,
    fetchMissions: mocks.fetchMissions,
    fetchCompletedMissions: mocks.fetchCompletedMissions,
    fetchFailedMissions: mocks.fetchFailedMissions,
    generateMissions: vi.fn(),
    performNightlyReview: vi.fn(),
    hydrateNightlyReviewResult: mocks.hydrateNightlyReviewResult,
    confirmMissionAt: vi.fn(),
    confirmAllProposedMissions: vi.fn(),
    rejectMissionAt: vi.fn(),
    rejectAllProposedMissions: vi.fn(),
    completeMission: vi.fn(),
    deleteMission: vi.fn(),
    scheduleMission: vi.fn(),
    openScheduleModal: vi.fn(),
    fetchMissionEvolution: mocks.fetchMissionEvolution,
    setShowConfirmModal: vi.fn(),
    setShowScheduleModal: vi.fn(),
    setScheduleDateTime: vi.fn(),
  }),
}));

vi.mock('../presentation/viewmodels/useDrafts', () => ({
  useDrafts: () => ({
    showTaskDraftModal: false,
    showMissionDraftModal: false,
    currentDraftData: null,
    openDraftModal: mocks.openDraftModal,
    confirmTaskDraft: vi.fn(),
    rejectTaskDraft: vi.fn(),
    confirmMissionDraft: vi.fn(),
    rejectMissionDraft: vi.fn(),
    setShowTaskDraftModal: vi.fn(),
    setShowMissionDraftModal: vi.fn(),
  }),
}));

vi.mock('../components/Layout', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('../components/TaskDraftModal', () => ({ default: () => null }));
vi.mock('../components/MissionDraftModal', () => ({ default: () => null }));
vi.mock('../presentation/components/character/CharacterStats', () => ({ CharacterStats: () => null }));
vi.mock('../presentation/components/character/LevelStaircase', () => ({ LevelStaircase: () => null }));
vi.mock('../presentation/components/character/MissionsList', () => ({ MissionsList: () => null }));
vi.mock('../presentation/components/character/StatsHistoryChart', () => ({ StatsHistoryChart: () => null }));
vi.mock('../presentation/components/character/ReflectionKPIs', () => ({ ReflectionKPIs: () => null }));
vi.mock('../presentation/components/character/MissionEvolutionChart', () => ({ MissionEvolutionChart: () => null }));
vi.mock('../presentation/components/character/FinishedList', () => ({ FinishedList: () => null }));
vi.mock('../presentation/components/profile-theme/ProfileEmptyState', () => ({ ProfileEmptyState: () => null }));
vi.mock('../presentation/components/profile-theme/ProfileHeroCard', () => ({ ProfileHeroCard: () => null }));

const renderCharacterPage = (initialEntries = ['/character']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <CharacterPage />
    </MemoryRouter>
  );

describe('CharacterPage reflection profile filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    reflectionsApi.getAll.mockResolvedValue({ data: [] });
  });

  test('queries every Diary history mode using the persisted active profile', async () => {
    const user = userEvent.setup();
    renderCharacterPage();

    await waitFor(() => expect(reflectionsApi.getAll).toHaveBeenCalledWith({
      reflection_type: 'journal',
      prompt_profile: 'spiritual',
    }));

    await user.click(screen.getByRole('tab', { name: 'Diario' }));
    await user.click(await screen.findByRole('button', { name: 'Tareas y misiones' }));

    await waitFor(() => {
      expect(reflectionsApi.getAll).toHaveBeenCalledWith({
        reflection_type: 'task',
        prompt_profile: 'spiritual',
      });
      expect(reflectionsApi.getAll).toHaveBeenCalledWith({
        reflection_type: 'mission',
        prompt_profile: 'spiritual',
      });
    });

    await user.click(screen.getByRole('button', { name: 'Rutinas' }));
    await waitFor(() => expect(reflectionsApi.getAll).toHaveBeenCalledWith({
      reflection_type: 'routine',
      prompt_profile: 'spiritual',
    }));
  });

  test('allows selecting multiple profiles for Diary history', async () => {
    const user = userEvent.setup();
    renderCharacterPage();

    await waitFor(() => expect(reflectionsApi.getAll).toHaveBeenCalledWith({
      reflection_type: 'journal',
      prompt_profile: 'spiritual',
    }));

    await user.click(screen.getByRole('tab', { name: 'Diario' }));
    await user.click(screen.getByTestId('reflection-profile-filter-trigger'));
    await user.click(await screen.findByRole('menuitemcheckbox', { name: /Calma/ }));

    await waitFor(() => {
      expect(reflectionsApi.getAll).toHaveBeenCalledWith({
        reflection_type: 'journal',
        prompt_profile: 'spiritual',
      });
      expect(reflectionsApi.getAll).toHaveBeenCalledWith({
        reflection_type: 'journal',
        prompt_profile: 'calm',
      });
    });

    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Tareas y misiones' }));

    await waitFor(() => {
      expect(reflectionsApi.getAll).toHaveBeenCalledWith({
        reflection_type: 'task',
        prompt_profile: 'spiritual',
      });
      expect(reflectionsApi.getAll).toHaveBeenCalledWith({
        reflection_type: 'task',
        prompt_profile: 'calm',
      });
      expect(reflectionsApi.getAll).toHaveBeenCalledWith({
        reflection_type: 'mission',
        prompt_profile: 'spiritual',
      });
      expect(reflectionsApi.getAll).toHaveBeenCalledWith({
        reflection_type: 'mission',
        prompt_profile: 'calm',
      });
    });
  });

  test('hydrates a linked scheduled NightlyReview from the query string', async () => {
    sessionStorage.setItem(
      'nightly_review_notification_payload',
      JSON.stringify({
        review_date: '2026-07-05',
        summary: 'Cerraste dos tareas y detectaste un patrón importante.',
        tasks_completed: 2,
        tasks_failed: 1,
        proposed_missions: [
          { title: 'Misión nocturna', description: 'Revisar el patrón importante.' },
        ],
      })
    );

    renderCharacterPage(['/character?nightly_review=1&review_date=2026-07-05']);

    await waitFor(() => {
      expect(mocks.hydrateNightlyReviewResult).toHaveBeenCalledWith({
        review_date: '2026-07-05',
        review_text: 'Cerraste dos tareas y detectaste un patrón importante.',
        summary: 'Cerraste dos tareas y detectaste un patrón importante.',
        tasks_completed: 2,
        tasks_failed: 1,
        proposed_missions: [
          { title: 'Misión nocturna', description: 'Revisar el patrón importante.' },
        ],
      });
    });
  });
});
