/**
 * ConversationHistory renders whichever feed it is given.
 *
 * The health surface reuses this component rather than growing a second copy,
 * so the failure worth guarding is silent: if the injected `api` were ignored
 * and the default used instead, the health page would quietly display the
 * general Mentor's conversations — the exact leak the two surfaces exist to
 * prevent, and one that looks perfectly fine on screen.
 */
import { render, screen, waitFor } from '@testing-library/react';
import ConversationHistory from '../components/chat/ConversationHistory';
import { conversationsApi, statsApi } from '../lib/api';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock('../lib/api', () => ({
  conversationsApi: { getAll: vi.fn(), getById: vi.fn() },
  statsApi: { getFrictionLabels: vi.fn() },
}));

vi.mock('../theme/useProfileTheme', () => ({
  useProfileTheme: () => ({ persistedProfileId: 'calm', isProfileSynced: true }),
}));

const healthApi = { getAll: vi.fn(), getById: vi.fn() };

const conversation = (sessionId, preview) => ({
  session_id: sessionId,
  last_message_at: '2026-08-24T10:00:00Z',
  preview,
  message_count: 2,
});

beforeEach(() => {
  vi.clearAllMocks();
  statsApi.getFrictionLabels.mockResolvedValue({ data: { labels: {} } });
  conversationsApi.getAll.mockResolvedValue({ data: [conversation('g1', 'conversación general')] });
  conversationsApi.getById.mockResolvedValue({ data: { session_id: 'g1', messages: [] } });
  healthApi.getAll.mockResolvedValue({ data: [conversation('h1', 'conversación de salud')] });
  healthApi.getById.mockResolvedValue({ data: { session_id: 'h1', messages: [] } });
});

describe('injected feed', () => {
  it('renders the injected source, not the default one', async () => {
    render(<ConversationHistory api={healthApi} profileScoped={false} onSelectConversation={vi.fn()} />);

    await waitFor(() => expect(healthApi.getAll).toHaveBeenCalled());
    expect(conversationsApi.getAll).not.toHaveBeenCalled();
    expect(await screen.findByText(/conversación de salud/)).toBeInTheDocument();
  });

  it('omits prompt_profile when the feed is not profile-scoped', async () => {
    render(<ConversationHistory api={healthApi} profileScoped={false} onSelectConversation={vi.fn()} />);

    await waitFor(() => expect(healthApi.getAll).toHaveBeenCalled());
    expect(healthApi.getAll).toHaveBeenCalledWith({});
  });

  it('still filters by profile for the general Mentor', async () => {
    render(<ConversationHistory onSelectConversation={vi.fn()} />);

    await waitFor(() => expect(conversationsApi.getAll).toHaveBeenCalled());
    expect(conversationsApi.getAll).toHaveBeenCalledWith({ prompt_profile: 'calm' });
  });

  it('does not refetch in a loop on re-render', async () => {
    // listParams is built inside the component and feeds the fetch callbacks'
    // dependency arrays; unmemoized it would re-create them every render.
    const { rerender } = render(
      <ConversationHistory api={healthApi} profileScoped={false} onSelectConversation={vi.fn()} />
    );
    await waitFor(() => expect(healthApi.getAll).toHaveBeenCalledTimes(1));

    rerender(<ConversationHistory api={healthApi} profileScoped={false} onSelectConversation={vi.fn()} />);
    rerender(<ConversationHistory api={healthApi} profileScoped={false} onSelectConversation={vi.fn()} />);

    expect(healthApi.getAll).toHaveBeenCalledTimes(1);
  });
});

describe('empty state', () => {
  it('uses the supplied label instead of naming a mentor profile', async () => {
    healthApi.getAll.mockResolvedValue({ data: [] });
    render(
      <ConversationHistory
        api={healthApi}
        profileScoped={false}
        emptyLabel="Todavía no tienes conversaciones de salud."
        onSelectConversation={vi.fn()}
      />
    );

    expect(await screen.findByText(/Todavía no tienes conversaciones de salud/)).toBeInTheDocument();
    expect(screen.queryByText(/cambia de perfil/)).not.toBeInTheDocument();
  });

  it('keeps the profile-aware wording for the general Mentor', async () => {
    conversationsApi.getAll.mockResolvedValue({ data: [] });
    render(<ConversationHistory onSelectConversation={vi.fn()} />);

    expect(await screen.findByText(/cambia de perfil/)).toBeInTheDocument();
  });
});
