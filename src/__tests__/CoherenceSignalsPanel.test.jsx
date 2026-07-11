import { fireEvent, render, screen, within } from '@testing-library/react';
import { CoherenceSignalsPanel } from '../presentation/components/dashboard/CoherenceSignalsPanel';

const identityGap = {
  signal: 'identity_behavior_gap',
  label: 'Distancia identidad-conducta',
  description: 'Lo que dices que quieres encarnar y tu patrón reciente apuntan en direcciones distintas.',
  count: 2,
  status_counts: { drifting: 1, contradiction: 1 },
  last_seen_at: '2026-07-11T10:00:00+00:00',
};

const baseData = {
  summary: {
    total_events: 2,
    signal_events: 2,
    top_signal: 'identity_behavior_gap',
    top_signal_label: 'Distancia identidad-conducta',
    strongest_status: 'contradiction',
    strongest_status_label: 'Contradicción',
    aligned_events: 0,
    is_live: true,
  },
  by_signal: [identityGap],
  timeline: [
    {
      id: 'chat-1',
      source_type: 'mentor_interaction',
      created_at: '2026-07-11T10:00:00+00:00',
      status: 'contradiction',
      status_label: 'Contradicción',
      signals: ['identity_behavior_gap'],
      primary_signal: 'identity_behavior_gap',
      label: 'Distancia identidad-conducta',
      tension: 'Dices que quieres calma, pero tu patrón reciente se organiza desde presión externa.',
      course_correction: 'Elige una acción que exprese calma sin demostrar nada.',
      excerpt: 'Siento que hago todo para demostrar algo',
    },
    {
      id: 'chat-2',
      source_type: 'mentor_interaction',
      created_at: '2026-07-10T10:00:00+00:00',
      status: 'drifting',
      status_label: 'Deriva',
      signals: ['identity_behavior_gap'],
      primary_signal: 'identity_behavior_gap',
      label: 'Distancia identidad-conducta',
      tension: 'Tu identidad declarada no aparece en la conducta reciente.',
      course_correction: 'Haz una microacción coherente.',
      excerpt: 'Quiero ser disciplinado, pero evito decidir',
    },
  ],
};

describe('CoherenceSignalsPanel', () => {
  test('groups repeated coherence events under a single signal dropdown', () => {
    render(<CoherenceSignalsPanel data={baseData} loading={false} />);

    expect(screen.getByTestId('coherence-signals-panel')).toBeInTheDocument();
    expect(screen.getByText('Señal principal:')).toBeInTheDocument();
    expect(screen.getAllByText('Distancia identidad-conducta').length).toBeGreaterThan(0);

    const group = screen.getByTestId('coherence-signal-group-identity_behavior_gap');
    expect(within(group).getByText('2 entradas')).toBeInTheDocument();
    expect(screen.queryByText(/Dices que quieres calma/)).not.toBeInTheDocument();

    fireEvent.click(within(group).getByRole('button', { name: /Distancia identidad-conducta/i }));

    expect(screen.getByText(/Dices que quieres calma/)).toBeInTheDocument();
    expect(screen.getByText(/Quiero ser disciplinado/)).toBeInTheDocument();
  });

  test('clicking a signal chip filters entries and "Ver todos" clears it', () => {
    const other = {
      signal: 'direction_action_gap',
      label: 'Dirección sin expresión reciente',
      description: 'Hay dirección declarada, pero falta evidencia reciente de acciones que la expresen.',
      count: 1,
      status_counts: { drifting: 1 },
      last_seen_at: '2026-07-09T10:00:00+00:00',
    };
    const otherEvent = {
      ...baseData.timeline[0],
      id: 'chat-3',
      signals: ['direction_action_gap'],
      primary_signal: 'direction_action_gap',
      label: 'Dirección sin expresión reciente',
      excerpt: 'Hablo de dirección, pero mis días se dispersan',
    };

    render(
      <CoherenceSignalsPanel
        data={{
          ...baseData,
          by_signal: [identityGap, other],
          timeline: [...baseData.timeline, otherEvent],
        }}
        loading={false}
      />
    );

    const chips = screen.getAllByTitle('Filtrar evidencias por esta señal');
    const directionChip = chips.find((btn) => btn.textContent.includes('Dirección'));
    fireEvent.click(directionChip);

    expect(screen.getByTestId('coherence-signal-group-direction_action_gap')).toBeInTheDocument();
    expect(screen.queryByTestId('coherence-signal-group-identity_behavior_gap')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Ver todos'));
    expect(screen.getByTestId('coherence-signal-group-identity_behavior_gap')).toBeInTheDocument();
  });

  test('renders empty and loading states', () => {
    const { rerender } = render(<CoherenceSignalsPanel data={null} loading />);
    expect(screen.getByTestId('coherence-signals-panel')).toBeInTheDocument();
    expect(screen.queryByText('Aún no hay señales de coherencia en este periodo.')).not.toBeInTheDocument();

    rerender(<CoherenceSignalsPanel data={{ summary: {}, by_signal: [], timeline: [] }} loading={false} />);
    expect(screen.getByText('Aún no hay señales de coherencia en este periodo.')).toBeInTheDocument();
  });
});
