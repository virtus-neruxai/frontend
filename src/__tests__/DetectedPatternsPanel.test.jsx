import { fireEvent, render, screen, within } from '@testing-library/react';
import { DetectedPatternsPanel } from '../presentation/components/dashboard/DetectedPatternsPanel';

const metaPocoClara = {
  friction: 'unclear_goal',
  label: 'Meta poco clara',
  count: 2,
  pattern_status: 'improving',
  sources: { routine_reflection: 1, chat_interaction: 1 },
  user_confirmed: null,
  user_progress: null,
  user_notes: null,
};

const baseData = {
  summary: {
    top_pattern_label: 'Meta poco clara',
    pattern_events: 2,
    avg_severity: 1.5,
  },
  by_friction: [metaPocoClara],
  resolved_frictions: [],
  timeline: [
    {
      id: 'routine-1',
      source_type: 'routine_reflection',
      created_at: '2026-07-10T10:00:00+00:00',
      friction: 'unclear_goal',
      label: 'Meta poco clara',
      pattern_status: 'improving',
      excerpt: 'Sigo avanzando en funcionalidades técnicas pero no tengo tan claro como venderlo',
    },
    {
      id: 'chat-1',
      source_type: 'chat_interaction',
      created_at: '2026-07-11T10:00:00+00:00',
      friction: 'unclear_goal',
      label: 'Meta poco clara',
      pattern_status: 'improving',
      excerpt: 'me acerco a Dios entonces o no?',
    },
  ],
};

describe('DetectedPatternsPanel', () => {
  test('groups repeated timeline entries under a single pattern dropdown', () => {
    render(
      <DetectedPatternsPanel
        data={baseData}
        loading={false}
        onAcknowledge={vi.fn()}
      />
    );

    const group = screen.getByTestId('detected-pattern-group-unclear_goal');
    expect(within(group).getByText('Meta poco clara')).toBeInTheDocument();
    expect(within(group).getByText('2 entradas')).toBeInTheDocument();
    expect(screen.queryByText(/Sigo avanzando en funcionalidades técnicas/)).not.toBeInTheDocument();

    fireEvent.click(within(group).getByRole('button', { name: /Meta poco clara/i }));

    expect(screen.getByText(/Sigo avanzando en funcionalidades técnicas/)).toBeInTheDocument();
    expect(screen.getByText(/me acerco a Dios entonces o no/)).toBeInTheDocument();
  });

  test('does not duplicate the same evidence when an event has primary and secondary patterns', () => {
    const data = {
      summary: {
        top_pattern_label: 'Meta poco clara',
        pattern_events: 1,
        avg_severity: 1,
      },
      by_friction: [
        metaPocoClara,
        {
          friction: 'reactivity',
          label: 'Reactividad',
          count: 1,
          pattern_status: 'improving',
          sources: { chat_interaction: 1 },
          user_confirmed: null,
          user_progress: null,
          user_notes: null,
        },
      ],
      resolved_frictions: [],
      timeline: [
        {
          id: 'chat-13',
          source_type: 'chat_interaction',
          created_at: '2026-07-13T10:00:00+00:00',
          friction: 'unclear_goal',
          secondary_friction: 'reactivity',
          label: 'Meta poco clara',
          secondary_label: 'Reactividad',
          pattern_status: 'improving',
          excerpt: 'Hoy empiezo mi enfoque para fortalecer mis hábitos',
        },
      ],
    };

    render(
      <DetectedPatternsPanel
        data={data}
        loading={false}
        onAcknowledge={vi.fn()}
      />
    );

    expect(screen.getByTestId('detected-pattern-group-unclear_goal')).toBeInTheDocument();
    expect(screen.queryByTestId('detected-pattern-group-reactivity')).not.toBeInTheDocument();

    const primaryGroup = screen.getByTestId('detected-pattern-group-unclear_goal');
    fireEvent.click(within(primaryGroup).getByRole('button', { name: /Meta poco clara/i }));
    expect(screen.getAllByText(/Hoy empiezo mi enfoque/)).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: /Reactividad/i }));
    expect(screen.getByTestId('detected-pattern-group-reactivity')).toBeInTheDocument();
    expect(screen.getAllByText(/Hoy empiezo mi enfoque/)).toHaveLength(1);
  });
});
