import { render, screen, waitFor } from '@testing-library/react';
import ConversationHistory from '../components/chat/ConversationHistory';
import { conversationsApi, statsApi } from '../lib/api';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('../lib/api', () => ({
  conversationsApi: { getAll: vi.fn(), getById: vi.fn() },
  statsApi: { getFrictionLabels: vi.fn() },
}));

// Simulates a fresh browser context (empty localStorage): the profile starts at
// the default and only becomes authoritative once the backend resolves it.
let mockProfile = { persistedProfileId: 'stoic', isProfileSynced: false };
vi.mock('../theme/useProfileTheme', () => ({
  useProfileTheme: () => mockProfile,
}));

describe('ConversationHistory profile sync gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfile = { persistedProfileId: 'stoic', isProfileSynced: false };
    conversationsApi.getAll.mockResolvedValue({ data: [] });
    conversationsApi.getById.mockResolvedValue({ data: { messages: [] } });
    statsApi.getFrictionLabels.mockResolvedValue({ data: { labels: {} } });
  });

  test('does not query the history until the profile is resolved', async () => {
    render(<ConversationHistory activeSessionId={null} onSelectConversation={vi.fn()} />);

    // Querying here would filter by the default profile and wrongly report
    // "no conversations" for an account whose real profile is another one.
    await waitFor(() => expect(statsApi.getFrictionLabels).toHaveBeenCalled());
    expect(conversationsApi.getAll).not.toHaveBeenCalled();
  });

  test('queries with the backend-resolved profile once synced', async () => {
    const { rerender } = render(
      <ConversationHistory activeSessionId={null} onSelectConversation={vi.fn()} />
    );
    expect(conversationsApi.getAll).not.toHaveBeenCalled();

    mockProfile = { persistedProfileId: 'calm', isProfileSynced: true };
    rerender(<ConversationHistory activeSessionId={null} onSelectConversation={vi.fn()} />);

    await waitFor(() => {
      expect(conversationsApi.getAll).toHaveBeenCalledWith({ prompt_profile: 'calm' });
    });
    expect(conversationsApi.getAll).toHaveBeenCalledTimes(1);
  });

  test('names the filtered profile in the empty state', async () => {
    mockProfile = { persistedProfileId: 'calm', isProfileSynced: true };
    render(<ConversationHistory activeSessionId={null} onSelectConversation={vi.fn()} />);

    expect(await screen.findByText(/Calma/)).toBeInTheDocument();
  });
});
