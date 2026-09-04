import { fireEvent, render, screen } from '@testing-library/react';
import HealthReportTab from '../components/health/HealthReportTab';
import { useHealthReport } from '../presentation/viewmodels/useHealthReport';

vi.mock('../presentation/viewmodels/useHealthReport', () => ({
  useHealthReport: vi.fn(),
}));

vi.mock('../components/health/HealthReportView', () => ({ default: () => null }));

// Igual que en ReasoningReportTab.test: el mock pinta las opciones de cada
// Select, porque el filtro del historial ofrece «Todos» y el de generación no.
vi.mock('../components/ui/select', () => ({
  Select: ({ value, onValueChange, children }) => (
    <select
      data-testid="range-select"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {children}
    </select>
  ),
  SelectContent: ({ children }) => <>{children}</>,
  SelectItem: ({ value, children }) => <option value={value}>{children}</option>,
  SelectTrigger: () => null,
  SelectValue: () => null,
}));

const HISTORY = [
  { report_id: 'h-14', created_at: '2026-08-12T10:00:00+00:00', days_back: 14, summary: 'Informe de dos semanas' },
  { report_id: 'h-7', created_at: '2026-08-11T10:00:00+00:00', days_back: 7, summary: 'Informe semanal' },
];

function mountWith(overrides = {}) {
  useHealthReport.mockReturnValue({
    report: null,
    generating: false,
    daysBack: 14,
    setDaysBack: vi.fn(),
    history: HISTORY,
    generate: vi.fn(),
    loadHistory: vi.fn(),
    openReport: vi.fn(),
    ...overrides,
  });
  return render(<HealthReportTab />);
}

describe('HealthReportTab history', () => {
  beforeEach(() => vi.clearAllMocks());

  test('opens showing every report, whatever generation range is selected', () => {
    mountWith();

    fireEvent.change(screen.getByTestId('range-select'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: /historial/i }));

    expect(screen.getByText(/informe de dos semanas/i)).toBeInTheDocument();
    expect(screen.getByText(/informe semanal/i)).toBeInTheDocument();
  });

  test('the filter narrows the list, and «Todos» brings everything back', () => {
    // El bug: el historial ignoraba el filtro y salían siempre todos.
    mountWith();
    fireEvent.click(screen.getByRole('button', { name: /historial/i }));

    const historyFilter = screen.getAllByTestId('range-select')[1];
    fireEvent.change(historyFilter, { target: { value: '7' } });

    expect(screen.getByText(/informe semanal/i)).toBeInTheDocument();
    expect(screen.queryByText(/informe de dos semanas/i)).not.toBeInTheDocument();

    fireEvent.change(historyFilter, { target: { value: 'all' } });

    expect(screen.getByText(/informe de dos semanas/i)).toBeInTheDocument();
    expect(screen.getByText(/informe semanal/i)).toBeInTheDocument();
  });

  test('a range with nothing generated says so instead of listing everything', () => {
    mountWith({ history: [HISTORY[0]] });
    fireEvent.click(screen.getByRole('button', { name: /historial/i }));

    fireEvent.change(screen.getAllByTestId('range-select')[1], { target: { value: '7' } });

    expect(screen.getByText(/no hay informes para última semana/i)).toBeInTheDocument();
  });
});
