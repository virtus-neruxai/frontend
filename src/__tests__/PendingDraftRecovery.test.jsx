/**
 * A draft outlives the tab that received it: it sits in Redis for
 * REDIS_DRAFT_TTL (1h) regardless of what the browser remembers. Only the
 * page's in-memory `pendingDraft` was lost on reload — this is the recovery
 * that reads it back on mount, for both mentors. Both live inside
 * `MentorPage` — "Mentor <perfil>" and "Mentor Salud" are sibling tabs, same
 * shape, each with its own chat/session/drafts — so the health case below
 * switches tabs rather than rendering a separate page.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MentorPage from '../pages/MentorPage';
import { agentApi, healthAgentApi } from '../lib/api';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock('../lib/api', () => ({
  agentApi: {
    chat: vi.fn(),
    getPendingDrafts: vi.fn().mockResolvedValue({ data: { drafts: [] } }),
  },
  healthAgentApi: {
    chat: vi.fn(),
    getInteractions: vi.fn().mockResolvedValue({ data: { interactions: [] } }),
    getPendingDrafts: vi.fn().mockResolvedValue({ data: { drafts: [] } }),
  },
  healthConversationsApi: { getAll: vi.fn().mockResolvedValue({ data: [] }), getById: vi.fn() },
  conversationsApi: { getAll: vi.fn().mockResolvedValue({ data: [] }), getById: vi.fn() },
  statsApi: { getFrictionLabels: vi.fn() },
  draftTypeFromAction: (action) => {
    if (action === 'SHOW_MISSION_CONFIRMATION_MODAL') return 'mission';
    if (action === 'SHOW_PROJECT_CONFIRMATION_MODAL') return 'project';
    return 'task';
  },
}));

vi.mock('../components/Layout', () => ({
  default: function MockLayout({ children }) {
    return <div>{children}</div>;
  },
}));

vi.mock('../components/chat/ConversationHistory', async () => {
  const React = await import('react');
  return {
    default: React.forwardRef(function MockConversationHistory(_props, ref) {
      React.useImperativeHandle(ref, () => ({ refresh: vi.fn() }));
      return <div data-testid="conversation-history" />;
    }),
  };
});

vi.mock('../components/TaskDraftModal', () => ({ default: () => null }));
vi.mock('../components/MissionDraftModal', () => ({ default: () => null }));
vi.mock('../components/ProjectDraftModal', () => ({ default: () => null }));
vi.mock('../presentation/components/profile-theme/ProfileHeroCard', () => ({
  ProfileHeroCard: ({ title }) => <div data-testid="profile-hero">{title}</div>,
}));
vi.mock('../theme/useProfileTheme', () => ({
  useProfileTheme: () => ({ theme: { name: 'Estoico' }, persistedProfileId: 'stoic' }),
}));

vi.mock('../presentation/viewmodels/useDrafts', () => ({
  useDrafts: () => ({
    showTaskDraftModal: false,
    showMissionDraftModal: false,
    showProjectDraftModal: false,
    currentDraftData: null,
    openDraftModal: vi.fn(),
    confirmTaskDraft: vi.fn(),
    rejectTaskDraft: vi.fn(),
    confirmMissionDraft: vi.fn(),
    rejectMissionDraft: vi.fn(),
    confirmProjectDraft: vi.fn(),
    rejectProjectDraft: vi.fn(),
    setShowTaskDraftModal: vi.fn(),
    setShowMissionDraftModal: vi.fn(),
    setShowProjectDraftModal: vi.fn(),
  }),
}));

const liveDraft = (overrides = {}) => ({
  draft_id: 'david:s1:abcd1234',
  draft_type: 'task',
  surface: 'general',
  expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  ui_action: {
    action: 'SHOW_TASK_CONFIRMATION_MODAL',
    draft_id: 'david:s1:abcd1234',
    data: { title: 'Fuerza tren superior' },
    metadata: { expires_in_seconds: 1800 },
  },
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  agentApi.getPendingDrafts.mockResolvedValue({ data: { drafts: [] } });
  healthAgentApi.getPendingDrafts.mockResolvedValue({ data: { drafts: [] } });
  healthAgentApi.getInteractions.mockResolvedValue({ data: { interactions: [] } });
});

describe('general Mentor recovers a pending draft on load', () => {
  test('shows the pending-draft card when one is found', async () => {
    agentApi.getPendingDrafts.mockResolvedValue({ data: { drafts: [liveDraft()] } });

    render(<MentorPage />);

    await waitFor(() => {
      expect(screen.getByText(/Tu mentor te propone una/i)).toBeInTheDocument();
    });
  });

  test('stays quiet when there is nothing pending', async () => {
    render(<MentorPage />);

    await waitFor(() => {
      expect(agentApi.getPendingDrafts).toHaveBeenCalled();
    });
    expect(screen.queryByText(/Tu mentor te propone una/i)).not.toBeInTheDocument();
  });

  test('an already-expired draft is not resurrected', async () => {
    agentApi.getPendingDrafts.mockResolvedValue({
      data: { drafts: [liveDraft({ expires_at: new Date(Date.now() - 1000).toISOString() })] },
    });

    render(<MentorPage />);

    await waitFor(() => {
      expect(agentApi.getPendingDrafts).toHaveBeenCalled();
    });
    expect(screen.queryByText(/Tu mentor te propone una/i)).not.toBeInTheDocument();
  });

  test('a lookup failure does not crash the page', async () => {
    agentApi.getPendingDrafts.mockRejectedValue(new Error('network down'));

    render(<MentorPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Pregunta a tu mentor...')).toBeInTheDocument();
    });
  });
});

describe('Health Mentor recovers a pending draft on load, isolated from the general one', () => {
  test('shows the pending-draft card from its own endpoint', async () => {
    healthAgentApi.getPendingDrafts.mockResolvedValue({
      data: { drafts: [liveDraft({ surface: 'health' })] },
    });

    render(<MentorPage />);
    // Radix Tabs activates on the primary-pointer down event, not on the
    // synthetic `click` event alone.
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Mentor Salud/i }), { button: 0 });

    await waitFor(() => {
      expect(screen.getByText(/Tu mentor te propone una/i)).toBeInTheDocument();
    });
  });

  test('a general-Mentor draft never surfaces on the health tab', async () => {
    // The general endpoint is mocked to return something; switching to the
    // health tab unmounts "Mentor <perfil>"'s content entirely (Radix Tabs
    // does not keep inactive panels mounted), so its draft card cannot leak
    // into what "Mentor Salud" renders.
    agentApi.getPendingDrafts.mockResolvedValue({ data: { drafts: [liveDraft()] } });

    render(<MentorPage />);
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Mentor Salud/i }), { button: 0 });

    await waitFor(() => {
      expect(healthAgentApi.getPendingDrafts).toHaveBeenCalled();
    });
    expect(screen.queryByText(/Tu mentor te propone una/i)).not.toBeInTheDocument();
  });
});
