import { fireEvent, render, screen } from '@testing-library/react';

import { PositiveHealthSignalsPanel } from '../presentation/components/dashboard/PositiveHealthSignalsPanel';

function signal(index, overrides = {}) {
  return {
    signal_key: `health-signal:${index}`,
    claim: `Señal positiva ${index}`,
    claim_type: 'fact',
    evidence_tier: 'repeated',
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

  render(<PositiveHealthSignalsPanel data={data} loading={false} error="" />);

  expect(screen.getByTestId('positive-health-signals-panel')).toHaveTextContent(
    'Lo que tu propia historia también demuestra'
  );
  expect(screen.getByText(/evidencia en los últimos 30 días/i)).toBeInTheDocument();
  expect(screen.getByText('Señal positiva 1')).toBeInTheDocument();
  expect(screen.queryByText('Señal positiva 6')).not.toBeInTheDocument();
  expect(screen.getAllByText('Repetido')).toHaveLength(5);
  expect(screen.getAllByText('2 citas')).toHaveLength(5);
  expect(screen.getAllByText(/Origen: actividad/)).toHaveLength(5);
  expect(screen.getAllByText(/Periodo:/)).toHaveLength(5);
  expect(screen.getAllByText(/Informe del/)).toHaveLength(5);

  fireEvent.click(screen.getByRole('button', { name: 'Ver todas (6)' }));
  expect(screen.getByText('Señal positiva 6')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Ver menos' })).toHaveAttribute('aria-expanded', 'true');
});

test('uses the explicit historical fallback without inventing evidence dates', () => {
  const data = {
    days: 90,
    total: 1,
    signals: [signal(1, { dates: [], source_types: [], date_basis: 'report_period' })],
  };

  render(<PositiveHealthSignalsPanel data={data} loading={false} error="" />);

  expect(screen.getByText(/Fechas no disponibles en este informe histórico/i)).toBeInTheDocument();
  expect(screen.queryByText(/Origen:/)).not.toBeInTheDocument();
});

test('renders loading, hides an empty success and offers a local retry on failure', () => {
  const onRetry = vi.fn();
  const { rerender } = render(
    <PositiveHealthSignalsPanel data={null} loading error="" onRetry={onRetry} />
  );
  expect(screen.getByTestId('positive-health-signals-loading')).toBeInTheDocument();

  rerender(<PositiveHealthSignalsPanel data={{ days: 30, total: 0, signals: [] }} loading={false} error="" />);
  expect(screen.queryByTestId('positive-health-signals-panel')).not.toBeInTheDocument();

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
