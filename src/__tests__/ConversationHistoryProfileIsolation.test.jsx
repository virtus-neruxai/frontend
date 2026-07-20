import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ConversationHistory from '../components/chat/ConversationHistory';
import { conversationsApi, statsApi } from '../lib/api';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('../lib/api', () => ({
  conversationsApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    delete: vi.fn(),
  },
  statsApi: {
    getFrictionLabels: vi.fn(),
  },
}));

vi.mock('../theme/useProfileTheme', () => ({
  useProfileTheme: () => ({ persistedProfileId: 'student' }),
}));

describe('ConversationHistory profile isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    conversationsApi.getAll.mockResolvedValue({
      data: [{
        session_id: 'student-session',
        last_message_at: '2026-07-15T16:00:00Z',
        preview: 'Conversación de estudiante',
        message_count: 2,
      }],
    });
    conversationsApi.getById.mockResolvedValue({
      data: { session_id: 'student-session', messages: [] },
    });
    statsApi.getFrictionLabels.mockResolvedValue({ data: { labels: {} } });
  });

  test('uses the active profile for both conversation list and detail', async () => {
    render(
      <ConversationHistory
        activeSessionId={null}
        onSelectConversation={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(conversationsApi.getAll).toHaveBeenCalledWith({ prompt_profile: 'student' });
    });

    fireEvent.click(screen.getByText('Conversación de estudiante'));

    await waitFor(() => {
      expect(conversationsApi.getById).toHaveBeenCalledWith(
        'student-session',
        { prompt_profile: 'student' }
      );
    });
  });

  test('shows the Spanish friction label instead of the internal code', async () => {
    statsApi.getFrictionLabels.mockResolvedValue({
      data: { labels: { value_conflict: 'Conflicto de valores' } },
    });
    conversationsApi.getById.mockResolvedValue({
      data: {
        session_id: 'student-session',
        messages: [{
          role: 'assistant',
          message: 'Podemos mirar qué valores entran en tensión.',
          timestamp: '2026-07-15T16:00:00Z',
          friction: 'value_conflict',
          mode: 'MOTIVATION',
        }],
      },
    });

    render(
      <ConversationHistory
        activeSessionId={null}
        onSelectConversation={vi.fn()}
      />
    );

    fireEvent.click(await screen.findByText('Conversación de estudiante'));

    expect(await screen.findByText('Conflicto de valores')).toBeInTheDocument();
    expect(screen.queryByText('value_conflict')).not.toBeInTheDocument();
  });
});
