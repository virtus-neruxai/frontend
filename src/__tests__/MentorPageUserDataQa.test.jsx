import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MentorPage from '../pages/MentorPage';
import { agentApi } from '../lib/api';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('../lib/api', () => ({
  agentApi: {
    chat: vi.fn(),
    getPendingDrafts: vi.fn().mockResolvedValue({ data: { drafts: [] } }),
  },
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

vi.mock('../theme/useProfileTheme', () => ({
  useProfileTheme: () => ({
    theme: { name: 'Estoico' },
    persistedProfileId: 'stoic',
  }),
}));

describe('MentorPage USER_DATA_QA toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    agentApi.chat.mockResolvedValue({
      data: {
        response: 'Respuesta QA',
        draft_id: null,
        ui_action: null,
        session_id: 'session-1',
        metadata: {
          mode: 'USER_DATA_QA',
          user_data_qa: {
            tool_calling_active: true,
            sources_used: ['get_tasks'],
          },
        },
      },
    });
  });

  test('QA and Razonar switches are mutually exclusive and QA flag reaches chat payload', async () => {
    render(<MentorPage />);

    await waitFor(() => {
      expect(window.localStorage.getItem('agent_session_id_stoic')).toBeTruthy();
    });

    const qaToggle = screen.getByTestId('user-data-qa-toggle');
    const reasoningToggle = screen.getByTestId('deep-reasoning-toggle');

    fireEvent.click(qaToggle);
    expect(reasoningToggle).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Pregunta a tu mentor...'), {
      target: { value: 'Que tareas tengo pendientes?' },
    });
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));

    await waitFor(() => {
      expect(agentApi.chat).toHaveBeenCalledWith(
        'Que tareas tengo pendientes?',
        expect.any(String),
        false,
        true,
        false,
      );
    });
  });

  test('Razonar disables the QA switch', async () => {
    render(<MentorPage />);

    const qaToggle = screen.getByTestId('user-data-qa-toggle');
    const reasoningToggle = screen.getByTestId('deep-reasoning-toggle');

    fireEvent.click(reasoningToggle);

    expect(qaToggle).toBeDisabled();
  });

  test('pending draft disables QA switch', async () => {
    agentApi.chat.mockResolvedValueOnce({
      data: {
        response: 'Te propongo una tarea',
        draft_id: 'draft-1',
        ui_action: {
          action: 'SHOW_TASK_CONFIRMATION_MODAL',
          metadata: { expires_in_seconds: 3600 },
        },
        session_id: 'session-1',
        metadata: { mode: 'TASK' },
      },
    });

    render(<MentorPage />);

    fireEvent.change(screen.getByPlaceholderText('Pregunta a tu mentor...'), {
      target: { value: 'Crea una tarea' },
    });
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));

    await waitFor(() => {
      expect(screen.getByTestId('user-data-qa-toggle')).toBeDisabled();
    });
  });
});
