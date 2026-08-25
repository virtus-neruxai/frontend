/**
 * The health surface is a separate layer that happens to share services.
 *
 * These fix the four structural promises the web side owes: its own endpoint,
 * its own session key with no profile suffix, two toggles instead of three, and
 * a conversation that never surfaces in the general Mentor's history.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { useHealthChat } from '../presentation/viewmodels/useHealthChat';
import { healthAgentApi } from '../lib/api';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock('../lib/api', () => ({
  healthAgentApi: {
    chat: vi.fn(),
    getInteractions: vi.fn(),
  },
  healthConversationsApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
  },
  conversationsApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
  },
  agentApi: {
    chat: vi.fn(),
    confirmDraft: vi.fn(),
  },
  statsApi: {
    getFrictionLabels: vi.fn(),
  },
}));

const HEALTH_KEY = 'agent_session_id_health';

const okResponse = (overrides = {}) => ({
  data: {
    response: 'Vamos por partes.',
    session_id: 's-health',
    metadata: { risk_level: 'GREEN', personalization_enabled: false },
    ...overrides,
  },
});

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  healthAgentApi.chat.mockResolvedValue(okResponse());
});

// ── session key ─────────────────────────────────────────────────────────────

describe('health session key', () => {
  it('uses its own key, separate from the general Mentor', async () => {
    const { result } = renderHook(() => useHealthChat());
    await waitFor(() => expect(result.current.sessionId).toBeTruthy());

    expect(localStorage.getItem(HEALTH_KEY)).toBe(result.current.sessionId);
  });

  it('carries no profile suffix', async () => {
    const { result } = renderHook(() => useHealthChat());
    await waitFor(() => expect(result.current.sessionId).toBeTruthy());

    const keys = Object.keys(localStorage);
    for (const profile of ['stoic', 'calm', 'spiritual', 'performance', 'student']) {
      expect(keys).not.toContain(`${HEALTH_KEY}_${profile}`);
    }
  });

  it('does not touch the general Mentor session', async () => {
    localStorage.setItem('agent_session_id_stoic', 'general-session');
    const { result } = renderHook(() => useHealthChat());
    await waitFor(() => expect(result.current.sessionId).toBeTruthy());

    expect(localStorage.getItem('agent_session_id_stoic')).toBe('general-session');
    expect(result.current.sessionId).not.toBe('general-session');
  });

  it('reuses the stored session instead of starting a new one', async () => {
    localStorage.setItem(HEALTH_KEY, 'existing-health-session');
    const { result } = renderHook(() => useHealthChat());

    await waitFor(() => expect(result.current.sessionId).toBe('existing-health-session'));
  });

  it('survives a re-render, so switching voice keeps the conversation', async () => {
    // The general hook re-initializes on profile change and clears the thread.
    // Here that would drop every answered slot — the repetition the rules forbid.
    const { result, rerender } = renderHook(() => useHealthChat());
    await waitFor(() => expect(result.current.sessionId).toBeTruthy());
    const first = result.current.sessionId;

    rerender();

    expect(result.current.sessionId).toBe(first);
  });
});

// ── the endpoint ────────────────────────────────────────────────────────────

describe('health endpoint', () => {
  it('sends the turn to the health API, never the general one', async () => {
    const { result } = renderHook(() => useHealthChat());
    await waitFor(() => expect(result.current.sessionId).toBeTruthy());

    await act(async () => {
      await result.current.sendMessage('me duele la rodilla');
    });

    expect(healthAgentApi.chat).toHaveBeenCalledTimes(1);
  });

  it('never sends a data-app toggle', async () => {
    // The backend answers 422 to `user_data_qa`, so the hook must have no way
    // to produce it: the argument list simply does not include one.
    const { result } = renderHook(() => useHealthChat());
    await waitFor(() => expect(result.current.sessionId).toBeTruthy());

    await act(async () => {
      await result.current.sendMessage('cuántas sesiones llevo');
    });

    const args = healthAgentApi.chat.mock.calls[0];
    expect(args).toHaveLength(4); // message, sessionId, deepReasoning, projectPlan
    expect(result.current).not.toHaveProperty('userDataQa');
    expect(result.current).not.toHaveProperty('setUserDataQa');
  });
});

// ── toggles ─────────────────────────────────────────────────────────────────

describe('toggles', () => {
  it('exposes exactly Razonar and Modo plan', () => {
    const { result } = renderHook(() => useHealthChat());

    expect(result.current.deepReasoning).toBe(false);
    expect(result.current.projectPlan).toBe(false);
    expect(result.current.setUserDataQa).toBeUndefined();
  });

  it('keeps the two mutually exclusive', () => {
    const { result } = renderHook(() => useHealthChat());

    act(() => result.current.setDeepReasoning(true));
    expect(result.current.deepReasoning).toBe(true);

    act(() => result.current.setProjectPlan(true));
    expect(result.current.projectPlan).toBe(true);
    expect(result.current.deepReasoning).toBe(false);
  });

  it('forwards the active toggle to the API', async () => {
    const { result } = renderHook(() => useHealthChat());
    await waitFor(() => expect(result.current.sessionId).toBeTruthy());

    act(() => result.current.setProjectPlan(true));
    await act(async () => {
      await result.current.sendMessage('quiero preparar una media maratón');
    });

    const [, , deepReasoning, projectPlan] = healthAgentApi.chat.mock.calls[0];
    expect(deepReasoning).toBe(false);
    expect(projectPlan).toBe(true);
  });
});

// ── drafts ──────────────────────────────────────────────────────────────────

describe('drafts', () => {
  it('does not raise a modal on plain advice', async () => {
    const onDraft = vi.fn();
    const { result } = renderHook(() => useHealthChat());
    await waitFor(() => expect(result.current.sessionId).toBeTruthy());

    await act(async () => {
      await result.current.sendMessage('¿cuánta proteína necesito?', onDraft);
    });

    expect(onDraft).not.toHaveBeenCalled();
  });

  it('maps a task draft', async () => {
    healthAgentApi.chat.mockResolvedValue(okResponse({
      draft_id: 'd1',
      ui_action: { action: 'SHOW_TASK_CONFIRMATION_MODAL' },
    }));
    const onDraft = vi.fn();
    const { result } = renderHook(() => useHealthChat());
    await waitFor(() => expect(result.current.sessionId).toBeTruthy());

    await act(async () => {
      await result.current.sendMessage('proponme una rutina para correr', onDraft);
    });

    expect(onDraft).toHaveBeenCalledWith(
      expect.objectContaining({ draftId: 'd1', type: 'task' }),
    );
  });

  it('maps a project draft', async () => {
    healthAgentApi.chat.mockResolvedValue(okResponse({
      draft_id: 'd2',
      ui_action: { action: 'SHOW_PROJECT_CONFIRMATION_MODAL' },
    }));
    const onDraft = vi.fn();
    const { result } = renderHook(() => useHealthChat());
    await waitFor(() => expect(result.current.sessionId).toBeTruthy());

    await act(async () => {
      await result.current.sendMessage('plan de 6 meses', onDraft);
    });

    expect(onDraft).toHaveBeenCalledWith(
      expect.objectContaining({ draftId: 'd2', type: 'project' }),
    );
  });
});

// ── reset ───────────────────────────────────────────────────────────────────

describe('reset', () => {
  it('shows the backend confirmation instead of the discarded placeholder text', async () => {
    // The backend short-circuits reset before the graph runs, so the response
    // is a real confirmation, not a mentor reply to invented text — that reply
    // is what the old design threw away with setChatResponse('').
    healthAgentApi.chat.mockResolvedValueOnce(okResponse({
      response: 'He olvidado lo que hablamos en esta conversación. Puedes seguir cuando quieras.',
      metadata: { reset: true },
    }));
    const { result } = renderHook(() => useHealthChat());
    await waitFor(() => expect(result.current.sessionId).toBeTruthy());

    await act(async () => {
      await result.current.resetSession();
    });

    expect(result.current.chatResponse).toBe(
      'He olvidado lo que hablamos en esta conversación. Puedes seguir cuando quieras.',
    );
  });

  it('clears the slots without changing the session', async () => {
    const { result } = renderHook(() => useHealthChat());
    await waitFor(() => expect(result.current.sessionId).toBeTruthy());
    const before = result.current.sessionId;

    await act(async () => {
      await result.current.resetSession();
    });

    const [, sessionId, , , reset] = healthAgentApi.chat.mock.calls[0];
    expect(sessionId).toBe(before);
    expect(reset).toBe(true);
    expect(result.current.sessionId).toBe(before);
  });

  it('leaves the general Mentor session untouched', async () => {
    localStorage.setItem('agent_session_id_stoic', 'general-session');
    const { result } = renderHook(() => useHealthChat());
    await waitFor(() => expect(result.current.sessionId).toBeTruthy());

    await act(async () => {
      await result.current.resetSession();
    });

    expect(localStorage.getItem('agent_session_id_stoic')).toBe('general-session');
  });
});


// ── browsing an existing conversation ───────────────────────────────────────

describe('conversation selection', () => {
  it('redirects future turns into the chosen conversation', async () => {
    const { result } = renderHook(() => useHealthChat());
    await waitFor(() => expect(result.current.sessionId).toBeTruthy());

    act(() => result.current.selectConversation('older-health-session'));

    expect(result.current.sessionId).toBe('older-health-session');
    expect(localStorage.getItem(HEALTH_KEY)).toBe('older-health-session');
  });

  it('starts a genuinely new thread instead of reusing the old id', async () => {
    localStorage.setItem(HEALTH_KEY, 'previous-session');
    const { result } = renderHook(() => useHealthChat());
    await waitFor(() => expect(result.current.sessionId).toBe('previous-session'));

    act(() => result.current.startNewConversation());

    expect(result.current.sessionId).not.toBe('previous-session');
    expect(localStorage.getItem(HEALTH_KEY)).toBe(result.current.sessionId);
  });
});
