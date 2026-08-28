/**
 * The health surface is a separate layer that happens to share services.
 *
 * These fix the four structural promises the web side owes: its own endpoint,
 * its own session key with no profile suffix, no "Datos de la app" toggle, and
 * a conversation that never surfaces in the general Mentor's history.
 *
 * The personal-data toggle added in Slice 3 is tested here too, because the
 * thing worth fixing about it is precisely that it is *not* the toggle the
 * third promise excludes.
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
  draftTypeFromAction: (action) => {
    if (action === 'SHOW_MISSION_CONFIRMATION_MODAL') return 'mission';
    if (action === 'SHOW_PROJECT_CONFIRMATION_MODAL') return 'project';
    return 'task';
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

    // Asserted on the payload rather than the argument count: the hook grew a
    // sixth argument (`use_personal_data`) and arity would have failed on a
    // change that is not the one this test is about. What must stay true is
    // that no user_data_qa can be produced at all.
    const args = healthAgentApi.chat.mock.calls[0];
    expect(args.some((arg) => arg === 'user_data_qa')).toBe(false);
    expect(result.current).not.toHaveProperty('userDataQa');
    expect(result.current).not.toHaveProperty('setUserDataQa');

    // The personal-data toggle is not that toggle renamed. It opens no Data
    // branch and selects no tools; the surface still picks its sources from the
    // domain of the question. It is off unless the person turns it on.
    expect(result.current.usePersonalData).toBe(false);
    expect(args[5]).toBe(false);
  });
});

// ── toggles ─────────────────────────────────────────────────────────────────

describe('toggles', () => {
  it('exposes Razonar, Modo plan and personal data — never "Datos de la app"', () => {
    const { result } = renderHook(() => useHealthChat());

    expect(result.current.deepReasoning).toBe(false);
    expect(result.current.projectPlan).toBe(false);
    expect(result.current.usePersonalData).toBe(false);
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

// ── "Utiliza mis datos personales" ──────────────────────────────────────────

describe('personal data toggle', () => {
  beforeEach(() => {
    localStorage.clear();
    healthAgentApi.chat.mockResolvedValue({ data: { response: 'ok', metadata: {} } });
  });

  it('is off until the person turns it on', async () => {
    // Defaulting it on would silently change every conversation already open.
    const { result } = renderHook(() => useHealthChat());
    await waitFor(() => expect(result.current.sessionId).toBeTruthy());

    expect(result.current.usePersonalData).toBe(false);
  });

  it('travels with the turn once enabled', async () => {
    const { result } = renderHook(() => useHealthChat());
    await waitFor(() => expect(result.current.sessionId).toBeTruthy());

    act(() => result.current.setUsePersonalData(true));
    await act(async () => { await result.current.sendMessage('¿cuánta proteína necesito?'); });

    expect(healthAgentApi.chat.mock.calls[0][5]).toBe(true);
  });

  it('is remembered per browser rather than per conversation', async () => {
    // It is a preference about how someone wants to be answered, not an
    // attribute of one thread. Re-enabling it in every new conversation would
    // turn a decision into a chore.
    const first = renderHook(() => useHealthChat());
    await waitFor(() => expect(first.result.current.sessionId).toBeTruthy());
    act(() => first.result.current.setUsePersonalData(true));

    const second = renderHook(() => useHealthChat());
    await waitFor(() => expect(second.result.current.usePersonalData).toBe(true));
  });

  it('composes with Razonar and with Modo plan instead of excluding them', async () => {
    // Reading your own records is a property of the answer, not a way of
    // producing one, so it is orthogonal to the two modes — which stay mutually
    // exclusive with each other.
    const { result } = renderHook(() => useHealthChat());
    await waitFor(() => expect(result.current.sessionId).toBeTruthy());

    act(() => result.current.setUsePersonalData(true));
    act(() => result.current.setDeepReasoning(true));
    expect(result.current.usePersonalData).toBe(true);
    expect(result.current.deepReasoning).toBe(true);

    act(() => result.current.setProjectPlan(true));
    expect(result.current.usePersonalData).toBe(true);
    expect(result.current.projectPlan).toBe(true);
    expect(result.current.deepReasoning).toBe(false);
  });

  it('a reset never carries the toggle', async () => {
    // A reset is a state-clearing action, not a conversational turn: it
    // short-circuits before the graph, so sending personal data with it would
    // buy tool calls for a turn that never runs.
    const { result } = renderHook(() => useHealthChat());
    await waitFor(() => expect(result.current.sessionId).toBeTruthy());

    act(() => result.current.setUsePersonalData(true));
    await act(async () => { await result.current.resetSession(); });

    const args = healthAgentApi.chat.mock.calls.at(-1);
    expect(args[4]).toBe(true);      // reset_session
    expect(args[5]).toBeUndefined(); // no personal data behind it
  });
});
