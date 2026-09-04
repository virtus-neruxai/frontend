import { fireEvent, render, screen } from '@testing-library/react';

import { PositiveHealthSignalsPanel } from '../presentation/components/dashboard/PositiveHealthSignalsPanel';

function signal(index, overrides = {}) {
  return {
    signal_key: `health-signal:${index}`,
    claim: `Señal positiva ${index}`,
    claim_type: 'fact',
    evidence_tier: 'repeated',
    dimensions: ['activity'],
    dates: ['2026-08-28'],
    source_types: ['activity'],
    citation_count: 2,
    date_basis: 'evidence',
    source_report_id: `report-${index}`,
    source_report_created_at: '2026-08-29T09:00:00+00:00',
    period_start: '2026-08-01T00:00:00+00:00',
    period_end: '2026-08-29T00:00:00+00:00',
    ...overrides,
  };
}

test('shows report provenance and only the first five combined signals initially', () => {
  const data = { days: 30, total: 6, signals: Array.from({ length: 6 }, (_, i) => signal(i + 1)) };
  const onRangeChange = vi.fn();

  render(
    <PositiveHealthSignalsPanel
      data={data}
      loading={false}
      error=""
      range="30"
      onRangeChange={onRangeChange}
    />
  );

  expect(screen.getByTestId('positive-health-signals-panel')).toHaveTextContent(
    'Señales positivas de Salud'
  );
  expect(screen.getByText(/evidencias favorables.*últimos 30 días/i)).toBeInTheDocument();
  expect(screen.getByTestId('positive-health-signals-panel')).toHaveClass(
    'border-primary/30', 'bg-gradient-to-br', 'shadow-sm'
  );
  expect(screen.getByText('6 señales')).toBeInTheDocument();
  expect(screen.getByText('Señal positiva 1')).toBeInTheDocument();
  expect(screen.queryByText('Señal positiva 6')).not.toBeInTheDocument();
  expect(screen.getAllByText('Actividad')).toHaveLength(5);
  expect(screen.getAllByText('Repetido')).toHaveLength(5);
  expect(screen.getAllByText(/2 evidencias · registros de salud · 28 ago 2026/)).toHaveLength(5);
  expect(screen.getAllByText(/Periodo:/)).toHaveLength(5);
  expect(screen.getAllByText(/Informe del/)).toHaveLength(5);
  expect(screen.getAllByTestId('positive-health-signal-card')).toHaveLength(5);
  expect(screen.getByTestId('positive-health-signals-range')).toHaveTextContent('Últimos 30 días');

  fireEvent.click(screen.getByTestId('positive-health-signals-range'));
  fireEvent.click(screen.getByRole('option', { name: 'Últimos 90 días' }));
  expect(onRangeChange).toHaveBeenCalledWith('90');

  fireEvent.click(screen.getByRole('button', { name: 'Ver todas (6)' }));
  expect(screen.getByText('Señal positiva 6')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Ver menos' })).toHaveAttribute('aria-expanded', 'true');
});

test('uses Salud when an otherwise valid signal has no exact historical area', () => {
  const data = {
    days: 90,
    total: 1,
    signals: [signal(1, {
      dimensions: [], source_types: [],
    })],
  };

  render(<PositiveHealthSignalsPanel data={data} loading={false} error="" />);

  expect(screen.getByText('Salud')).toBeInTheDocument();
  expect(screen.queryByText(/registros de salud/)).not.toBeInTheDocument();
});

test('shows every exact health area supplied by reasoning without inventing a signal type', () => {
  const data = {
    days: 7,
    total: 1,
    signals: [signal(1, { dimensions: ['activity', 'mental_wellbeing'] })],
  };

  render(<PositiveHealthSignalsPanel data={data} loading={false} error="" />);

  expect(screen.getByText('Actividad')).toBeInTheDocument();
  expect(screen.getByText('Bienestar mental')).toBeInTheDocument();
  expect(screen.queryByText(/patrón|acción realizada/i)).not.toBeInTheDocument();
});

test('renders loading, keeps an empty filterable panel and offers a local retry on failure', () => {
  const onRetry = vi.fn();
  const onRangeChange = vi.fn();
  const { rerender } = render(
    <PositiveHealthSignalsPanel data={null} loading error="" onRetry={onRetry} />
  );
  expect(screen.getByTestId('positive-health-signals-loading')).toBeInTheDocument();

  rerender(
    <PositiveHealthSignalsPanel
      data={{ days: 30, total: 0, signals: [] }}
      loading={false}
      error=""
      range="30"
      onRangeChange={onRangeChange}
    />
  );
  expect(screen.getByTestId('positive-health-signals-panel')).toBeInTheDocument();
  expect(screen.getByTestId('positive-health-signals-empty')).toHaveTextContent(
    /no hay señales favorables repetidas con fechas verificables/i
  );
  expect(screen.getByTestId('positive-health-signals-range')).toHaveTextContent('Últimos 30 días');

  rerender(
    <PositiveHealthSignalsPanel
      data={null}
      loading={false}
      error="No se pudieron cargar las señales de salud."
      onRetry={onRetry}
    />
  );
  expect(screen.getByRole('alert')).toHaveTextContent(/no se pudieron cargar/i);
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});

test('never renders companion, actions, raw citations or private note content', () => {
  const data = {
    days: 30,
    total: 1,
    signals: [signal(1, {
      activity_ids: ['private-activity-id'],
      note_ids: ['private-note-id'],
      note: 'Contenido privado de la nota',
      companion: 'Mensaje que no pertenece al Dashboard',
      actions: ['Crear una tarea artificial'],
    })],
  };

  render(<PositiveHealthSignalsPanel data={data} loading={false} error="" />);

  expect(screen.queryByText(/private-activity-id|private-note-id/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Contenido privado|Mensaje que no pertenece|tarea artificial/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/racha|porcentaje|recompensa/i)).not.toBeInTheDocument();
});
