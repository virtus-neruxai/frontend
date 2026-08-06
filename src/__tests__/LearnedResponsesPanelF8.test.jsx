import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LearnedResponsesPanel } from '../presentation/components/dashboard/LearnedResponsesPanel';
import { LearnedResponseReviews } from '../components/NotificationPanel';
import { statsApi } from '../lib/api';

vi.mock('../lib/api', () => ({
  statsApi: { getFrictionLabels: vi.fn() },
  behaviorsApi: {},
  tasksApi: {},
  missionsApi: {},
  characterApi: {},
  profileApi: {},
  reflectionsApi: {},
}));

const BEHAVIOR = {
  response_key: 'avoidance_loop:tarea:trabajo',
  status: 'practicing',
  alternative_response: 'Escribe el primer paso antes de cerrar el día.',
  old_response: { value: 'Aplazas el cierre.', source: 'model_hypothesis' },
  activation_signals: ['Tarea sin siguiente paso claro.'],
  application_count: 3,
  distinct_trigger_count: 2,
  last_applied_at: '2026-08-04T18:00:00+00:00',
};

const APPLICATIONS = [
  {
    id: 'app-1',
    response_key: 'avoidance_loop:tarea:trabajo',
    applied_at: '2026-08-04T18:00:00+00:00',
    trigger_category: 'avoidance_loop',
    trigger_note: 'Informe grande sin abrir',
    outcome: 'better',
  },
  {
    id: 'app-2',
    response_key: 'avoidance_loop:tarea:trabajo',
    applied_at: '2026-08-01T09:00:00+00:00',
    trigger_category: 'overload',
    trigger_note: null,
    outcome: null,
  },
  {
    id: 'app-3',
    response_key: 'otra:conducta:otro',
    applied_at: '2026-08-02T09:00:00+00:00',
    trigger_category: 'overload',
  },
];

function renderPanel(overrides = {}) {
  const props = {
    data: { total: 1, behaviors: [BEHAVIOR], applications: APPLICATIONS },
    loading: false,
    onRecordApplication: vi.fn(),
    onSetStatus: vi.fn(),
    ...overrides,
  };
  return { ...render(<LearnedResponsesPanel {...props} />), props };
}

beforeEach(() => {
  statsApi.getFrictionLabels.mockResolvedValue({
    data: { labels: { avoidance_loop: 'Evitación inicial', overload: 'Saturación', none: 'Sin fricción detectada' } },
  });
});

describe('Behaviours panel — aggregates and timeline (§13.2)', () => {
  it('counts applications and never anything else', () => {
    renderPanel();

    expect(screen.getByText('3 veces')).toBeInTheDocument();
    expect(screen.getByText(/en 2 situaciones distintas/)).toBeInTheDocument();
    // The rule that governs this panel: applications only. No streaks, no
    // percentages, no failures, no denominator.
    expect(screen.queryByText(/racha/i)).toBeNull();
    expect(screen.queryByText(/%/)).toBeNull();
    expect(screen.queryByText(/fallad|omitid|incumpl/i)).toBeNull();
    expect(screen.queryByText(/\bde\s+\d+\b/)).toBeNull();
  });

  it('reads no applications as "no data", never as a setback', () => {
    renderPanel({
      data: {
        behaviors: [{ ...BEHAVIOR, application_count: 0, distinct_trigger_count: 0, last_applied_at: null }],
        applications: [],
      },
    });

    expect(screen.getByText(/Todavía no has registrado ninguna vez/)).toBeInTheDocument();
    expect(screen.queryByText(/perdid|retroces|has dejado/i)).toBeNull();
  });

  it('shows the moment and the cause of each application, scoped to its behaviour', () => {
    renderPanel();

    fireEvent.click(screen.getByText('Ver cuándo'));

    expect(screen.getByText(/Informe grande sin abrir/)).toBeInTheDocument();
    expect(screen.getByText(/Mejor que antes/)).toBeInTheDocument();
    // app-3 belongs to another behaviour and must not leak into this timeline.
    const timeline = screen.getByText(/Informe grande sin abrir/).closest('ul');
    expect(timeline.querySelectorAll('li')).toHaveLength(2);
  });
});

describe('Behaviours panel — the lifecycle the user owns (§8.5)', () => {
  it('offers pause, integrate and retire, and never the derived states', () => {
    renderPanel();

    expect(screen.getByText('Pausar')).toBeInTheDocument();
    expect(screen.getByText('Ya es mía')).toBeInTheDocument();
    expect(screen.getByText('Retirar')).toBeInTheDocument();
    expect(screen.queryByText(/^En práctica$/i, { selector: 'button' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Consolidando/ })).toBeNull();
  });

  it('sends the status the user chose', () => {
    const { props } = renderPanel();

    fireEvent.click(screen.getByText('Pausar'));

    expect(props.onSetStatus).toHaveBeenCalledWith('avoidance_loop:tarea:trabajo', 'paused');
  });

  it('offers to resume a paused behaviour instead of the pause controls', () => {
    const { props } = renderPanel({
      data: { behaviors: [{ ...BEHAVIOR, status: 'paused' }], applications: [] },
    });

    expect(screen.queryByText('Pausar')).toBeNull();
    fireEvent.click(screen.getByText('Retomar'));

    expect(props.onSetStatus).toHaveBeenCalledWith('avoidance_loop:tarea:trabajo', 'active');
  });

  it('still lets a paused behaviour record an application', () => {
    renderPanel({ data: { behaviors: [{ ...BEHAVIOR, status: 'paused' }], applications: [] } });

    // The application is a fact the user reports; pausing silences supervision,
    // it does not make the fact unrecordable.
    expect(screen.getByText('Lo he hecho')).toBeInTheDocument();
  });

  it('says out loud that pausing does not erase history', () => {
    renderPanel();
    expect(screen.getByText(/no borra nada de lo que ya registraste/)).toBeInTheDocument();
  });
});

describe('Behaviours panel — registering an application (§8.6)', () => {
  it('only asks for the trigger, and treats the rest as optional', async () => {
    renderPanel();

    fireEvent.click(screen.getByText('Lo he hecho'));

    await waitFor(() => expect(screen.getByTestId('application-dialog')).toBeInTheDocument());
    expect(screen.getByText('¿Ante qué apareció?')).toBeInTheDocument();
    expect(screen.getByText(/Qué pasó/)).toBeInTheDocument();
    expect(screen.getByText(/Cómo te fue/)).toBeInTheDocument();
    // Nothing in the outcome options frames a moment as a failure.
    expect(screen.getByText('Me costó')).toBeInTheDocument();
    expect(screen.queryByText(/mal|fracas|fallé/i)).toBeNull();
    expect(screen.getByText(/Esto no puntúa nada/)).toBeInTheDocument();
  });

  it('records with the defaults when the user just confirms', async () => {
    const { props } = renderPanel();

    fireEvent.click(screen.getByText('Lo he hecho'));
    await waitFor(() => expect(screen.getByTestId('application-dialog')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Registrar'));

    await waitFor(() =>
      expect(props.onRecordApplication).toHaveBeenCalledWith('avoidance_loop:tarea:trabajo', {
        trigger_category: 'unspecified',
        trigger_note: null,
        outcome: null,
      })
    );
  });

  it('still works when the friction labels cannot be fetched', async () => {
    statsApi.getFrictionLabels.mockRejectedValue(new Error('offline'));
    renderPanel();

    fireEvent.click(screen.getByText('Lo he hecho'));

    await waitFor(() => expect(screen.getByTestId('application-dialog')).toBeInTheDocument());
    expect(screen.getByText('Registrar')).toBeInTheDocument();
  });
});

describe('Behaviour reviews inside the nightly notification (F8 §14.3)', () => {
  const reviews = [
    {
      response_key: 'avoidance_loop:tarea:trabajo',
      alternative_response: 'Escribe el primer paso antes de cerrar el día.',
      question: '¿Has tenido ocasión de probarlo? Sin prisa.',
      reason: 'contextual',
      action: 'open_behaviors_panel',
    },
  ];

  it('asks, and opens the panel instead of acting from the notification', async () => {
    const onOpenPanel = vi.fn();
    render(<LearnedResponseReviews reviews={reviews} onOpenPanel={onOpenPanel} />);

    expect(screen.getByText('¿Has tenido ocasión de probarlo? Sin prisa.')).toBeInTheDocument();
    // No one-tap register/pause here: acting happens in the panel.
    expect(screen.queryByText(/Registrar|Pausar/)).toBeNull();

    fireEvent.click(screen.getByText('Ver mis conductas →'));
    await waitFor(() => expect(onOpenPanel).toHaveBeenCalled());
  });

  it('never tells the user what the system thinks it detected', () => {
    render(<LearnedResponseReviews reviews={reviews} onOpenPanel={vi.fn()} />);

    // A contextual review renders exactly like a scheduled one on purpose.
    expect(screen.queryByText(/detectad|hemos visto|parece que estás/i)).toBeNull();
    expect(screen.queryByText(/contextual/i)).toBeNull();
  });

  it('renders nothing when there is nothing to ask', () => {
    const { container } = render(<LearnedResponseReviews reviews={[]} onOpenPanel={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
