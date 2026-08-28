/**
 * The health report: its background job survives a reload (own storage key,
 * never the general report's — see useHealthReport.js), and a source that
 * failed to answer has to read differently from a source that was simply
 * empty (data_quality.degraded_sources).
 */
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { useHealthReport } from '../presentation/viewmodels/useHealthReport';
import HealthReportView from '../components/health/HealthReportView';
import { healthPracticesApi, healthReportApi } from '../lib/api';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock('../lib/api', () => ({
  healthReportApi: {
    generateReport: vi.fn(),
    getReportJob: vi.fn(),
    getReports: vi.fn(),
    getReport: vi.fn(),
    askQuestion: vi.fn(),
    getCompanion: vi.fn(),
    generateCompanion: vi.fn(),
    adoptAction: vi.fn(),
    adoptRelation: vi.fn(),
  },
  healthPracticesApi: { list: vi.fn() },
}));

const STORAGE_KEY = 'virtus.reasoning.active-health-report-job';

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  healthReportApi.getReportJob.mockResolvedValue({ data: { status: 'queued' } });
  healthReportApi.getCompanion.mockRejectedValue({ response: { status: 404 } });
  healthPracticesApi.list.mockResolvedValue({ data: { practices: [], applications: [] } });
});

describe('useHealthReport job recovery', () => {
  test('a pending job in sessionStorage is picked up and polled on mount, without calling generate', async () => {
    window.sessionStorage.setItem(STORAGE_KEY, 'job-123');
    healthReportApi.getReportJob.mockResolvedValue({
      data: { job_id: 'job-123', status: 'completed', report_id: 'report-1' },
    });
    healthReportApi.getReport.mockResolvedValue({
      data: { id: 'report-1', days_back: 14, report_json: { schema_version: '1', summary: 'ok' } },
    });

    const { result } = renderHook(() => useHealthReport());

    expect(result.current.reportJobId).toBe('job-123');
    expect(healthReportApi.generateReport).not.toHaveBeenCalled();

    await waitFor(() => expect(healthReportApi.getReportJob).toHaveBeenCalledWith('job-123'));
    await waitFor(() => expect(result.current.report?.id).toBe('report-1'));

    // The job is cleared from storage once it resolves, general report's key untouched.
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  test('generating a report writes its own storage key, distinct from the general report', async () => {
    healthReportApi.generateReport.mockResolvedValue({ data: { job_id: 'job-456' } });
    const { result } = renderHook(() => useHealthReport());

    await act(async () => { await result.current.generate(); });

    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe('job-456');
    expect(window.sessionStorage.getItem('virtus.reasoning.active-report-job')).toBeNull();
  });
});

describe('HealthReportView schema 1', () => {
  test('a report generated before schema 2 still opens', () => {
    // History is never migrated — a report is a record of a reading taken on a
    // date, and rewriting it would change what it said. So the old renderer
    // stays for as long as an old report exists.
    render(
      <HealthReportView
        report={{
          schema_version: '1',
          summary: 'Poco que contar todavía.',
          observed: ['Tres sesiones registradas.'],
          execution: {},
          observations: [],
          open_questions: [],
          cautions: [],
          data_quality: {
            window_days: 14,
            active_days: 2,
            activities: 2,
            health_tasks: 0,
            notes: 0,
            sparse_sample: true,
            degraded_sources: [{ source: 'get_health_notes', reason: 'unavailable' }],
          },
        }}
      />
    );

    expect(screen.getByTestId('health-report-view-v1')).toBeInTheDocument();
    expect(screen.getByText('Tres sesiones registradas.')).toBeInTheDocument();
    expect(screen.getByText(/no respondió al generar este informe/i)).toBeInTheDocument();
    expect(screen.getByText(/Todavía hay poco registrado/i)).toBeInTheDocument();
  });

  test('no completion percentage is ever rendered', () => {
    render(
      <HealthReportView
        report={{
          schema_version: '1',
          summary: '',
          observed: [],
          execution: { tasks_observed: 2, tasks_unobserved: 3, tasks_scheduled_ahead: 1 },
          observations: [],
          open_questions: [],
          cautions: [],
          data_quality: { window_days: 14, active_days: 2, activities: 2, health_tasks: 5, notes: 0, sparse_sample: false, degraded_sources: [] },
        }}
      />
    );

    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
});

function v2(overrides = {}) {
  return {
    schema_version: '2',
    main_reading: 'La muestra es todavía limitada.',
    dimension_readings: [],
    dimensions: [
      { dimension: 'activity', sample_status: 'trend_weak', records: 4, active_days: 4 },
      { dimension: 'recovery', sample_status: 'isolated', records: 1, active_days: 1 },
      { dimension: 'nutrition', sample_status: 'no_data', records: 0, active_days: 0 },
      { dimension: 'composition', sample_status: 'no_data', records: 0, active_days: 0 },
      { dimension: 'followup', sample_status: 'initial_signal', records: 2, active_days: 2 },
    ],
    coverage_matrix: { dates: [], rows: [] },
    goal: null,
    training_load: null,
    nutrition_load: null,
    trends: [],
    comparison: null,
    execution: {},
    adherence: [],
    consistency: [],
    positive_signals: [],
    practice_candidates: [],
    observations: [],
    hypotheses: [],
    cautions: [],
    information_gaps: [],
    next_best_action: '',
    data_quality: {
      window_days: 14, active_days: 4, activities: 4, health_tasks: 2, notes: 1,
      body_checkins: 1, sparse_sample: false, previous_window_comparable: false,
      degraded_sources: [],
    },
    ...overrides,
  };
}

describe('HealthReportView schema 2', () => {
  test('the final next-action card answers about this report in place', async () => {
    healthReportApi.askQuestion.mockResolvedValue({
      data: { response: 'El informe no permite concluir más allá de esos dos registros.' },
    });
    render(<HealthReportView reportId="health-report-1" report={v2({
      next_best_action: 'Registrar el descanso cuando lo conozcas.',
    })} />);

    const actionCard = screen.getByTestId('health-report-next-action');
    const qualityCard = screen.getByText('Calidad del dato').closest('[class*="border"]');
    expect(qualityCard.compareDocumentPosition(actionCard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Preguntar al Mentor/i })).not.toBeInTheDocument();

    fireEvent.change(screen.getByTestId('health-report-question-input'), {
      target: { value: '¿Qué significa esta lectura?' },
    });
    fireEvent.click(screen.getByTestId('health-report-question-send'));

    await waitFor(() => expect(healthReportApi.askQuestion).toHaveBeenCalledWith(
      'health-report-1',
      { message: '¿Qué significa esta lectura?', history: [] },
    ));
    expect(await screen.findByText(/El informe no permite concluir/i)).toBeInTheDocument();
  });

  test('the V2 extension keeps history, actions, companion, quality and next action in order', async () => {
    render(<HealthReportView reportId="health-report-1" report={v2({
      positive_signals: [{
        claim: 'Varias comidas comparten una estructura que ya conoces.',
        claim_type: 'fact', evidence_tier: 'repeated', activity_ids: ['a1'],
        task_ids: [], note_ids: [], checkin_ids: [], practice_application_ids: [],
        dates: ['2026-08-25'], source_types: ['activity'],
      }],
      practice_candidates: [{
        action_id: 'action-1', title: 'Reutilizar una comida',
        instruction: 'Guárdala con un título para seleccionarla otra vez.',
        dimension: 'nutrition', origin: 'personalized', evidence_tier: 'repeated',
        goal_alignment: 'Apoya tu objetivo sin medir progreso.', citation_ids: ['a1'],
        dates: ['2026-08-25'], source_types: ['activity'],
      }],
      health_safety_snapshot: { level: 'GREEN', categories: [], references: [] },
      next_best_action: 'Registrar el descanso cuando lo conozcas.',
    })} />);

    const view = screen.getByTestId('health-report-view');
    const positions = [
      'health-report-positive', 'health-report-practices', 'health-report-companion',
      'health-report-next-action',
    ].map((id) => Array.from(view.children).indexOf(screen.getByTestId(id)));
    const quality = screen.getByText('Calidad del dato').closest('[class*="border"]');
    const qualityPosition = Array.from(view.children).indexOf(quality);
    expect(positions[0]).toBeLessThan(positions[1]);
    expect(positions[1]).toBeLessThan(positions[2]);
    expect(positions[2]).toBeLessThan(qualityPosition);
    expect(qualityPosition).toBeLessThan(positions[3]);
    expect(screen.getByText('Lo que tu propia historia también demuestra')).toBeInTheDocument();
    expect(screen.getAllByText(/Origen: actividad/i)).toHaveLength(2);
    await waitFor(() => expect(healthPracticesApi.list).toHaveBeenCalledWith(3650));
  });

  test('adopting an action uses its immutable id and updates the card immediately', async () => {
    healthReportApi.adoptAction.mockResolvedValue({
      data: { practice_key: 'nutrition:key', status: 'active' },
    });
    render(<HealthReportView reportId="health-report-1" report={v2({
      practice_candidates: [{
        action_id: 'action-1', title: 'Reutilizar una comida', instruction: 'Guárdala.',
        dimension: 'nutrition', origin: 'generic', evidence_tier: 'general',
      }],
    })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Adoptar práctica' }));
    await waitFor(() => expect(healthReportApi.adoptAction).toHaveBeenCalledWith(
      'health-report-1', 'action-1'
    ));
    expect(await screen.findByRole('button', { name: /Adoptada/i })).toBeDisabled();
  });

  test('an idempotent practice adopted from an earlier report stays adopted after reload', async () => {
    healthPracticesApi.list.mockResolvedValue({ data: { practices: [{
      practice_key: 'nutrition:key', origin_report_id: 'older-report',
      origin_action_id: 'older-action', dimension: 'nutrition',
      instruction: 'Guárdala con un título.', status: 'practicing',
    }], applications: [] } });
    render(<HealthReportView reportId="health-report-1" report={v2({
      practice_candidates: [{
        action_id: 'action-1', title: 'Reutilizar una comida',
        instruction: 'Guárdala con un título.', dimension: 'nutrition',
        origin: 'generic', evidence_tier: 'general',
      }],
    })} />);
    expect(await screen.findByRole('button', { name: /Adoptada/i })).toBeDisabled();
    expect(healthReportApi.adoptAction).not.toHaveBeenCalled();
  });

  test('the health companion is generated on demand and rendered in place', async () => {
    healthReportApi.getCompanion.mockRejectedValue({ response: { status: 404 } });
    healthReportApi.generateCompanion.mockResolvedValue({ data: { companion: {
      message: 'Tu historia ya contiene un apoyo concreto.',
      action_contexts: [{ action_id: 'action-1', context: 'Puedes recuperarla cuando encaje.' }],
    } } });
    render(<HealthReportView reportId="health-report-1" report={v2({
      practice_candidates: [{
        action_id: 'action-1', title: 'Reutilizar una comida', instruction: 'Guárdala.',
        dimension: 'nutrition', origin: 'generic', evidence_tier: 'general',
      }],
      health_safety_snapshot: { level: 'GREEN', categories: [], references: [] },
    })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Generar mensaje' }));
    expect(await screen.findByText('Tu historia ya contiene un apoyo concreto.')).toBeInTheDocument();
    expect(screen.getByText('Puedes recuperarla cuando encaje.')).toBeInTheDocument();
  });

  test('historical V2 without a safety snapshot renders no retrospective companion', () => {
    render(<HealthReportView reportId="old" report={v2()} />);
    expect(screen.queryByTestId('health-report-companion')).not.toBeInTheDocument();
  });

  test('a dimension with no data says so instead of showing a zero', () => {
    render(<HealthReportView report={v2()} />);

    const nutrition = screen.getByTestId('health-dimension-nutrition');
    expect(nutrition).toHaveTextContent('Sin datos');
    expect(nutrition).not.toHaveTextContent('0 registros');
  });

  test('an absent nutrient renders as an absence and never as zero', () => {
    render(<HealthReportView report={v2({
      nutrition_load: {
        meals: 3, days_with_meals: 2, incomplete_meals: 1,
        energy_kcal: 1450, protein_g: null, carbs_g: null, fat_g: null, fiber_g: null,
      },
    })} />);

    const section = screen.getByTestId('health-report-nutrition');
    // Spanish takes no thousands separator below 10 000, and the builder's
    // block formats the same way so prose and figures cannot disagree.
    expect(section).toHaveTextContent('1450 kcal');
    expect(section).toHaveTextContent('—');
    expect(section).not.toHaveTextContent(/\b0 g\b/);
  });

  test('a training total left incomplete is a dash, with the reason beside it', () => {
    render(<HealthReportView report={v2({
      training_load: {
        sessions: 3, strength_sessions: 2, endurance_sessions: 0, untyped_sessions: 1,
        duration_seconds: 5400, energy_expenditure_kcal: null, total_sets: null,
        total_repetitions: null, load_volume_kg: null, distance_m: null,
        avg_perceived_exertion: 7, sessions_with_pain: 0,
      },
    })} />);

    const section = screen.getByTestId('health-report-activity');
    expect(section).toHaveTextContent('90 min');
    expect(section).toHaveTextContent(/sin detalle estructurado/i);
  });

  test('an incomparable previous period shows both figures and no percentage', () => {
    render(<HealthReportView report={v2({
      comparison: {
        previous_start: '', previous_end: '', comparable: false,
        rows: [{
          label: 'Sesiones de entrenamiento', current: 4, previous: 3,
          unit: '', direction: 'unknown', comparable: false, change_pct: null,
        }],
      },
    })} />);

    const section = screen.getByTestId('health-report-comparison');
    expect(section).toHaveTextContent('sin comparar');
    expect(section).not.toHaveTextContent('%');
  });

  test('a comparable period earns its direction and percentage', () => {
    render(<HealthReportView report={v2({
      data_quality: { ...v2().data_quality, previous_window_comparable: true },
      comparison: {
        previous_start: '', previous_end: '', comparable: true,
        rows: [{
          label: 'Minutos de entrenamiento', current: 180, previous: 130,
          unit: 'min', direction: 'up', comparable: true, change_pct: 38.5,
        }],
      },
    })} />);

    expect(screen.getByTestId('health-report-comparison')).toHaveTextContent('+38,5 %');
  });

  test('the coverage matrix renders one cell per day per signal', () => {
    render(<HealthReportView report={v2({
      coverage_matrix: {
        dates: ['2026-08-24', '2026-08-25', '2026-08-26'],
        rows: [
          { signal: 'activity', days: [false, true, true] },
          { signal: 'sleep', days: [true, false, false] },
        ],
      },
    })} />);

    expect(screen.getByTestId('health-coverage-activity')).toBeInTheDocument();
    expect(screen.getByTestId('health-coverage-sleep')).toBeInTheDocument();
    expect(
      screen.getByTestId('health-coverage-sleep').querySelectorAll('[aria-label]'),
    ).toHaveLength(3);
  });

  test('adherence shows two numbers and never their quotient', () => {
    render(<HealthReportView report={v2({
      adherence: [{
        task_id: 't1', title: 'Caminar 30 min', kind: 'routine', task_kind: 'activity',
        occurrences_observed: 3, occurrences_expected: 11, state: 'no_record',
      }],
      training_load: {
        sessions: 1, strength_sessions: 1, endurance_sessions: 0, untyped_sessions: 0,
        duration_seconds: null, energy_expenditure_kcal: null, total_sets: null,
        total_repetitions: null, load_volume_kg: null, distance_m: null,
        avg_perceived_exertion: null, sessions_with_pain: 0,
      },
    })} />);

    const section = screen.getByTestId('health-report-activity');
    expect(section).toHaveTextContent('3 de 11');
    expect(section).not.toHaveTextContent('27%');
    expect(section).not.toHaveTextContent('%');
  });

  test('a hypothesis is shown with what would confirm it', () => {
    render(<HealthReportView report={v2({
      hypotheses: [{
        statement: 'Merecería observarse si la energía se mantiene',
        what_would_confirm: 'Registrar energía tras cada sesión',
        evidence_tier: 'isolated',
        activity_ids: ['a1'], task_ids: [], note_ids: [], checkin_ids: [],
      }],
    })} />);

    const section = screen.getByTestId('health-report-hypotheses');
    expect(section).toHaveTextContent('Merecería observarse');
    expect(section).toHaveTextContent(/Qué lo confirmaría/i);
    expect(section).toHaveTextContent('Registrar energía tras cada sesión');
  });

  test('cautions render highest priority first', () => {
    render(<HealthReportView report={v2({
      cautions: [
        { text: 'Pendiente la analítica', priority: 'pending', note_ids: [], task_ids: [] },
        { text: 'Conviene valorarlo con un profesional', priority: 'high', note_ids: [], task_ids: [] },
        { text: 'Se mencionó caída del cabello', priority: 'review', note_ids: [], task_ids: [] },
      ],
    })} />);

    const section = screen.getByTestId('health-report-followup');
    expect(section.textContent.indexOf('Prioridad alta'))
      .toBeLessThan(section.textContent.indexOf('A revisar'));
    expect(section.textContent.indexOf('A revisar'))
      .toBeLessThan(section.textContent.indexOf('Pendiente'));
  });

  test('the information gaps keep the order they arrive in', () => {
    render(<HealthReportView report={v2({
      information_gaps: [
        { dimension: 'recovery', what_to_record: 'Energía tras entrenar', effort: '5 segundos' },
        { dimension: 'composition', what_to_record: 'Peso', effort: '10 segundos' },
      ],
    })} />);

    const section = screen.getByTestId('health-report-gaps');
    expect(section.textContent.indexOf('Energía tras entrenar'))
      .toBeLessThan(section.textContent.indexOf('Peso'));
  });

  test('a single next action is offered, not a list of habits', () => {
    render(<HealthReportView report={v2({
      next_best_action: 'Registra sueño y energía después de cada entrenamiento.',
    })} />);

    expect(screen.getByTestId('health-report-next-action'))
      .toHaveTextContent('Registra sueño y energía');
  });

  test('a consistency finding offers to close the gap instead of blaming', () => {
    render(<HealthReportView report={v2({
      consistency: [{
        task_id: 't1', title: 'Entreno de pierna', date: '2026-08-26', activity_type: 'training',
      }],
    })} />);

    const section = screen.getByTestId('health-report-consistency');
    expect(section).toHaveTextContent('Entreno de pierna');
    expect(section).toHaveTextContent('Registrar');
    expect(section.textContent).not.toMatch(/incumpl|fallaste/i);
  });

  test('an empty report renders nothing it cannot stand on', () => {
    render(<HealthReportView report={v2({ main_reading: '', dimensions: [] })} />);

    expect(screen.queryByTestId('health-report-main-reading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('health-report-dimensions')).not.toBeInTheDocument();
    expect(screen.queryByTestId('health-report-activity')).not.toBeInTheDocument();
    expect(screen.getByTestId('health-report-view')).toBeInTheDocument();
  });
});

// ── Sixth dimension, relations and synchrony ────────────────────────────────
//
// All three arrived additively, still under schema_version "2". The first test
// below is the one that matters most: a report written before them has to
// render exactly as it did, because a version branch was deliberately not
// bought to describe a document nobody would read differently.

const WELLBEING = {
  reflections_with_emotion: 4,
  reflections_total: 9,
  active_days: 4,
  window_days: 14,
  sample_status: 'trend_weak',
  dominant_emotions: [
    { emotion: 'frustración', count: 3, polarity: 'negative' },
    { emotion: 'calma', count: 1, polarity: 'positive' },
  ],
  average_intensity: 3.5,
  active_patterns: [
    { pattern_key: 'evitacion_vespertina', label: 'Evitación por la tarde', count: 3, status: 'active' },
  ],
};

const RELATION = {
  relation_id: 'relation:r1:a1',
  kind: 'temporal',
  evidence_tier: 'repeated',
  dimension: 'activity',
  reflection_ids: ['r1'],
  activity_ids: ['a1'],
  note_ids: [],
  task_ids: [],
  pattern_keys: [],
  pattern_labels: [],
  recurrent: false,
  dates: ['2026-08-24'],
  day_distance: 0,
  semantic_score: null,
  emotion: 'frustración',
  polarity: 'negative',
  friction: null,
  intensity: 4,
  friction_severity: null,
  related_title: 'Entreno de pierna',
  related_domain: 'training',
};

describe('HealthReportView · bienestar mental', () => {
  test('a report written before these fields still renders', () => {
    // The whole reason the version stayed at "2". Every new field is optional
    // or defaults to empty, so an older document falls through to the defaults.
    render(<HealthReportView report={v2()} />);

    expect(screen.getByTestId('health-report-view')).toBeInTheDocument();
    expect(screen.queryByTestId('health-report-wellbeing')).not.toBeInTheDocument();
    expect(screen.queryByTestId('health-report-relations')).not.toBeInTheDocument();
    expect(screen.queryByTestId('health-report-synchrony')).not.toBeInTheDocument();
  });

  test('coverage is published as the fraction it is', () => {
    render(<HealthReportView report={v2({ mental_wellbeing: WELLBEING })} />);
    expect(screen.getByTestId('health-wellbeing-coverage'))
      .toHaveTextContent('4 de 9 reflexiones registraron cómo te sentías');
  });

  test('a withheld denominator publishes the numerator alone', () => {
    // It is withheld when the two sources were read over different windows.
    // "4 de 2" would invite arithmetic on something that is not a ratio.
    render(<HealthReportView report={v2({
      mental_wellbeing: { ...WELLBEING, reflections_total: null },
    })} />);

    expect(screen.getByTestId('health-wellbeing-coverage'))
      .toHaveTextContent('4 reflexiones con emoción registrada');
    expect(screen.getByTestId('health-wellbeing-coverage')).not.toHaveTextContent('de 9');
  });

  test('the mean intensity is labelled a mean and shows no direction', () => {
    // HLD invariant 22: polarity and intensity may never become a score, and an
    // arrow over a fortnight of feelings is that score with the number removed.
    render(<HealthReportView report={v2({ mental_wellbeing: WELLBEING })} />);

    expect(screen.getByText(/no una trayectoria/)).toBeInTheDocument();
  });

  test('a day without a reflection is unreadable, never neutral', () => {
    render(<HealthReportView report={v2({ mental_wellbeing: WELLBEING })} />);
    expect(screen.getByText(/nunca un día neutro/)).toBeInTheDocument();
  });

  test('patterns are quoted from the journal and not recounted here', () => {
    // HLD invariant 21 forbids a second pattern detector inside health.
    render(<HealthReportView report={v2({ mental_wellbeing: WELLBEING })} />);
    expect(screen.getByText('Evitación por la tarde')).toBeInTheDocument();
    expect(screen.getByText(/ya tienes activos en tu diario/)).toBeInTheDocument();
  });

  test('the sixth dimension enters the grid and the coverage matrix', () => {
    render(<HealthReportView report={v2({
      dimensions: [
        ...v2().dimensions,
        { dimension: 'mental_wellbeing', sample_status: 'trend_weak', records: 4, active_days: 4 },
      ],
      coverage_matrix: {
        dates: ['2026-08-24'],
        rows: [{ signal: 'wellbeing', days: [true] }],
      },
    })} />);

    expect(screen.getByTestId('health-dimension-mental_wellbeing')).toHaveTextContent('Bienestar mental');
    expect(screen.getByTestId('health-coverage-wellbeing')).toHaveTextContent('Diario');
  });
});

describe('HealthReportView · relaciones observadas', () => {
  test('a relation is proposed and the person adopts it', async () => {
    healthReportApi.adoptRelation.mockResolvedValue({ data: { note_id: 'n1', created: true } });
    render(<HealthReportView reportId="report-1" report={v2({ relations: [RELATION] })} />);

    const button = screen.getByTestId('health-relation-adopt-relation:r1:a1');
    fireEvent.click(button);

    await waitFor(() => expect(button).toHaveTextContent('Guardada'));
    // The browser sends the pair and no prose: the note text is composed
    // server-side from the immutable relation it stored.
    expect(healthReportApi.adoptRelation).toHaveBeenCalledWith('report-1', 'relation:r1:a1');
    expect(button).toBeDisabled();
  });

  test('a coincidence is worded as a coincidence', () => {
    render(<HealthReportView reportId="report-1" report={v2({ relations: [RELATION] })} />);
    expect(screen.getByText(/Coincidir no es causar/)).toBeInTheDocument();
    expect(screen.getByText('Coincidió en el tiempo')).toBeInTheDocument();
    expect(screen.getByText(/eso es todo lo que se sabe/)).toBeInTheDocument();
  });

  test('a linked relation is worded more strongly than a temporal one', () => {
    render(<HealthReportView reportId="report-1" report={v2({
      relations: [{ ...RELATION, kind: 'linked' }],
    })} />);
    expect(screen.getByText('Lo escribiste sobre eso')).toBeInTheDocument();
  });

  test('a semantic-only relation cannot be saved as a note', () => {
    // The backend answers 409, and offering the button anyway would let the
    // weakest thing in the report become the most durable thing in the system.
    render(<HealthReportView reportId="report-1" report={v2({
      relations: [{ ...RELATION, kind: 'semantic' }],
    })} />);

    expect(screen.getByTestId('health-relation-relation:r1:a1')).toBeInTheDocument();
    expect(screen.queryByTestId('health-relation-adopt-relation:r1:a1')).not.toBeInTheDocument();
    expect(screen.getByText(/únicamente propone algo que observar/)).toBeInTheDocument();
  });

  test('a single event is never presented as a pattern', () => {
    render(<HealthReportView reportId="report-1" report={v2({ relations: [RELATION] })} />);
    expect(screen.queryByText('Se ha repetido')).not.toBeInTheDocument();

    render(<HealthReportView reportId="report-1" report={v2({
      relations: [{ ...RELATION, recurrent: true }],
    })} />);
    expect(screen.getByText('Se ha repetido')).toBeInTheDocument();
  });

  test('a failed adoption says so and leaves the button usable', () => {
    healthReportApi.adoptRelation.mockRejectedValue({
      response: { data: { detail: 'relation_not_adoptable' } },
    });
    render(<HealthReportView reportId="report-1" report={v2({ relations: [RELATION] })} />);

    fireEvent.click(screen.getByTestId('health-relation-adopt-relation:r1:a1'));
    return waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('relation_not_adoptable'));
  });
});

describe('HealthReportView · sincronía', () => {
  test('it is framed as being about the plan, not about the person', () => {
    render(<HealthReportView report={v2({
      synchrony_reading: 'Los días que entrenaste por la tarde fueron los que peor te sentaron.',
    })} />);

    expect(screen.getByTestId('health-report-synchrony'))
      .toHaveTextContent('Los días que entrenaste por la tarde');
    expect(screen.getByText(/sobre el diseño del plan, no sobre ti/)).toBeInTheDocument();
  });
});
