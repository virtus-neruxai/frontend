import { render, screen } from '@testing-library/react';

const dashboardData = vi.hoisted(() => ({
  range: '30',
  setRange: vi.fn(),
  rangeOptions: [],
  loading: true,
  summary: {},
  allTasks: [],
  getTasksByCategory: vi.fn(() => []),
  getMissionsByCategory: vi.fn(() => []),
  getTasksForDomain: vi.fn(() => []),
  refreshStats: vi.fn(),
  learnedResponses: null,
  learnedResponsesLoading: false,
  healthPractices: null,
  healthPracticesLoading: false,
  positiveHealthSignals: { days: 30, total: 1, signals: [] },
  positiveHealthSignalsLoading: false,
  positiveHealthSignalsError: '',
  refreshPositiveHealthSignals: vi.fn(),
  missionLenses: null,
  missionLensesLoading: false,
}));

vi.mock('../presentation/viewmodels/useDashboard', () => ({ useDashboard: () => dashboardData }));
vi.mock('../theme/useProfileTheme', () => ({
  useProfileTheme: () => ({ theme: { name: 'Estoico' }, persistedProfileId: 'stoic' }),
}));
vi.mock('../components/Layout', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('../components/TaskModal', () => ({ default: () => null }));
vi.mock('../presentation/components/profile-theme/ProfileHeroCard', () => ({
  ProfileHeroCard: () => <div data-testid="hero" />,
}));
vi.mock('../presentation/components/dashboard/ChallengesCard', () => ({ ChallengesCard: () => null }));
vi.mock('../presentation/components/dashboard/MissionLensesPanel', () => ({ MissionLensesPanel: () => null }));
vi.mock('../presentation/components/dashboard/LearnedResponsesPanel', () => ({
  LearnedResponsesPanel: () => <div data-testid="learned-responses-stub" />,
}));
vi.mock('../presentation/components/dashboard/HealthPracticesPanel', () => ({
  HealthPracticesPanel: () => <div data-testid="health-practices-stub" />,
}));
vi.mock('../presentation/components/dashboard/PositiveHealthSignalsPanel', () => ({
  PositiveHealthSignalsPanel: () => <div data-testid="positive-health-signals-stub" />,
}));
vi.mock('../presentation/components/dashboard/TaskListDialog', () => ({ TaskListDialog: () => null }));

import DashboardPage from '../pages/DashboardPage';

test('places positive health signals below the conductas and health-practices row', () => {
  render(<DashboardPage />);

  const learned = screen.getByTestId('learned-responses-stub');
  const practices = screen.getByTestId('health-practices-stub');
  const signals = screen.getByTestId('positive-health-signals-stub');
  const pairedRow = learned.parentElement;

  expect(pairedRow).toContainElement(practices);
  expect(signals.previousElementSibling).toBe(pairedRow);
});
