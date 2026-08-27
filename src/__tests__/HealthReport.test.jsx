/**
 * The health report: its background job survives a reload (own storage key,
 * never the general report's — see useHealthReport.js), and a source that
 * failed to answer has to read differently from a source that was simply
 * empty (data_quality.degraded_sources).
 */
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { useHealthReport } from '../presentation/viewmodels/useHealthReport';
import HealthReportView from '../components/health/HealthReportView';
import { healthReportApi } from '../lib/api';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock('../lib/api', () => ({
  healthReportApi: {
    generateReport: vi.fn(),
    getReportJob: vi.fn(),
    getReports: vi.fn(),
    getReport: vi.fn(),
  },
}));

const STORAGE_KEY = 'virtus.reasoning.active-health-report-job';

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  healthReportApi.getReportJob.mockResolvedValue({ data: { status: 'queued' } });
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
