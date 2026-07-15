import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ConversationHistory from '../components/chat/ConversationHistory';
import { conversationsApi } from '../lib/api';

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
});
