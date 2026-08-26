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

describe('HealthReportView', () => {
  test('a degraded source is declared on screen, distinct from an empty one', () => {
    render(
      <HealthReportView
        report={{
          schema_version: '1',
          summary: 'Poco que contar todavía.',
          observed: [],
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
