import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import ReasoningReportPage from '../pages/ReasoningReportPage';
import { reasoningApi } from '../lib/api';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('../lib/api', () => ({
  reasoningApi: {
    generateReport: vi.fn(),
    getReports: vi.fn(),
    getReport: vi.fn(),
    chat: vi.fn(),
  },
  tasksApi: { create: vi.fn() },
}));

vi.mock('../components/Layout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('../components/TaskDraftModal', () => ({
  default: () => null,
}));

vi.mock('../presentation/components/reasoning/ReasonedReportView', () => ({
  default: ({ report }) => <div data-testid="reasoned-report-view">{report?.main_reading}</div>,
}));

vi.mock('../theme/useProfileTheme', () => ({
  useProfileTheme: () => ({ theme: { name: 'Estoico' } }),
}));

vi.mock('../components/ui/select', () => ({
  Select: ({ value, onValueChange }) => (
    <select
      data-testid="range-select"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      <option value="1">Diario</option>
      <option value="7">Última semana</option>
      <option value="14">Últimas 2 semanas</option>
      <option value="30">Último mes</option>
    </select>
  ),
  SelectContent: ({ children }) => <>{children}</>,
  SelectItem: ({ children }) => <>{children}</>,
  SelectTrigger: ({ children }) => <>{children}</>,
  SelectValue: () => null,
}));

describe('ReasoningReportPage range selector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reasoningApi.generateReport.mockResolvedValue({
      data: {
        report_id: 'report-14',
        days_back: 14,
        mode: 'GENERATE_REPORT',
        schema_version: '2',
        report_json: { schema_version: '2', main_reading: 'Lectura 14' },
      },
    });
    reasoningApi.getReports.mockResolvedValue({
      data: {
        reports: [
          {
            report_id: 'report-14',
            created_at: '2026-07-12T10:00:00+00:00',
            prompt_profile: 'stoic',
            days_back: 14,
            summary: 'Informe de dos semanas',
          },
          {
            report_id: 'report-7',
            created_at: '2026-07-11T10:00:00+00:00',
            prompt_profile: 'stoic',
            days_back: 7,
            summary: 'Informe semanal',
          },
        ],
      },
    });
  });

  test('default range is 14 and selected range is sent when generating', async () => {
    render(<ReasoningReportPage />);

    fireEvent.click(screen.getByRole('button', { name: /generar informe/i }));
    await waitFor(() => expect(reasoningApi.generateReport).toHaveBeenCalledWith(14));

    fireEvent.change(screen.getByTestId('range-select'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: /generar informe/i }));
    await waitFor(() => expect(reasoningApi.generateReport).toHaveBeenLastCalledWith(7));
  });

  test('history is filtered by selected report range', async () => {
    render(<ReasoningReportPage />);

    fireEvent.click(screen.getByRole('button', { name: /historial/i }));
    expect(await screen.findByText(/informe de dos semanas/i)).toBeInTheDocument();
    expect(screen.queryByText(/informe semanal/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getAllByTestId('range-select')[0], { target: { value: '7' } });

    expect(await screen.findByText(/informe semanal/i)).toBeInTheDocument();
    expect(screen.queryByText(/informe de dos semanas/i)).not.toBeInTheDocument();
  });

  test('a failed generation surfaces a retryable error and stores nothing', async () => {
    // The backend persists nothing on failure (502), so the page must not show
    // a report — the always-visible "Generar informe" button is the retry.
    reasoningApi.generateReport.mockRejectedValue(new Error('502'));

    render(<ReasoningReportPage />);
    fireEvent.click(screen.getByRole('button', { name: /generar informe/i }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'No se pudo generar el informe. Vuelve a intentarlo.'
      )
    );
    expect(toast.success).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /generar informe/i }));
    await waitFor(() => expect(reasoningApi.generateReport).toHaveBeenCalledTimes(2));
    expect(reasoningApi.generateReport).toHaveBeenLastCalledWith(14);
  });
});
