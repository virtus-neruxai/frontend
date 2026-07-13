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

  test('translates raw friction keys into readable Spanish labels', () => {
    const data = {
      summary: {
        top_pattern_label: 'value_conflict',
        pattern_events: 3,
        avg_severity: 1,
      },
      by_friction: [
        { friction: 'value_conflict', label: 'value_conflict', count: 1, pattern_status: 'improving', sources: { chat_interaction: 1 } },
        { friction: 'loneliness', label: 'loneliness', count: 1, pattern_status: 'improving', sources: { journal_reflection: 1 } },
        { friction: 'dopamine_escape', label: 'dopamine_escape', count: 1, pattern_status: 'improving', sources: { task_reflection: 1 } },
      ],
      resolved_frictions: [],
      timeline: [
        {
          id: 'chat-value',
          source_type: 'chat_interaction',
          created_at: '2026-07-13T10:00:00+00:00',
          friction: 'value_conflict',
          label: 'value_conflict',
          pattern_status: 'improving',
          excerpt: 'Quiero dos cosas que chocan entre sí',
        },
        {
          id: 'journal-loneliness',
          source_type: 'journal_reflection',
          created_at: '2026-07-13T11:00:00+00:00',
          friction: 'loneliness',
          label: 'loneliness',
          pattern_status: 'improving',
          excerpt: 'Me he sentido aislado',
        },
        {
          id: 'task-dopamine',
          source_type: 'task_reflection',
          created_at: '2026-07-13T12:00:00+00:00',
          friction: 'dopamine_escape',
          label: 'dopamine_escape',
          pattern_status: 'improving',
          excerpt: 'Me fui al móvil para evitar empezar',
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

    expect(screen.getAllByText('Conflicto de valores').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Soledad o desconexión').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Escape a estímulos rápidos').length).toBeGreaterThan(0);

    expect(screen.queryByText('value_conflict')).not.toBeInTheDocument();
    expect(screen.queryByText('loneliness')).not.toBeInTheDocument();
    expect(screen.queryByText('dopamine_escape')).not.toBeInTheDocument();
  });
});
