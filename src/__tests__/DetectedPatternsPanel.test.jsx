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
    expect(within(group).getByText('1 entrada · 2 evidencias')).toBeInTheDocument();
    expect(screen.queryByText(/Sigo avanzando en funcionalidades técnicas/)).not.toBeInTheDocument();

    fireEvent.click(within(group).getByRole('button', { name: /Meta poco clara/i }));

    expect(screen.getByText(/Sigo avanzando en funcionalidades técnicas/)).toBeInTheDocument();
    expect(screen.getByText(/me acerco a Dios entonces o no/)).toBeInTheDocument();
  });

  test('groups related evidence once inside each pattern entry', () => {
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
    expect(screen.getByTestId('detected-pattern-group-reactivity')).toBeInTheDocument();

    const primaryGroup = screen.getByTestId('detected-pattern-group-unclear_goal');
    fireEvent.click(within(primaryGroup).getByRole('button', { name: /Meta poco clara/i }));
    expect(within(primaryGroup).getAllByText(/Hoy empiezo mi enfoque/)).toHaveLength(1);

    const secondaryGroup = screen.getByTestId('detected-pattern-group-reactivity');
    fireEvent.click(within(secondaryGroup).getByRole('button', { name: /Reactividad/i }));
    expect(within(secondaryGroup).getAllByText(/Hoy empiezo mi enfoque/)).toHaveLength(1);
  });

  test('renders the Spanish labels supplied by the backend', () => {
    const data = {
      summary: {
        top_pattern_label: 'Conflicto de valores',
        pattern_events: 3,
        avg_severity: 1,
      },
      by_friction: [
        { friction: 'value_conflict', label: 'Conflicto de valores', count: 1, pattern_status: 'improving', sources: { chat_interaction: 1 } },
        { friction: 'loneliness', label: 'Soledad o desconexión', count: 1, pattern_status: 'improving', sources: { journal_reflection: 1 } },
        { friction: 'dopamine_escape', label: 'Escape a estímulos rápidos', count: 1, pattern_status: 'improving', sources: { task_reflection: 1 } },
      ],
      resolved_frictions: [],
      timeline: [
        {
          id: 'chat-value',
          source_type: 'chat_interaction',
          created_at: '2026-07-13T10:00:00+00:00',
          friction: 'value_conflict',
          label: 'Conflicto de valores',
          pattern_status: 'improving',
          excerpt: 'Quiero dos cosas que chocan entre sí',
        },
        {
          id: 'journal-loneliness',
          source_type: 'journal_reflection',
          created_at: '2026-07-13T11:00:00+00:00',
          friction: 'loneliness',
          label: 'Soledad o desconexión',
          pattern_status: 'improving',
          excerpt: 'Me he sentido aislado',
        },
        {
          id: 'task-dopamine',
          source_type: 'task_reflection',
          created_at: '2026-07-13T12:00:00+00:00',
          friction: 'dopamine_escape',
          label: 'Escape a estímulos rápidos',
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

  });

  test('does not translate friction taxonomy locally', () => {
    render(
      <DetectedPatternsPanel
        loading={false}
        range="7"
        onRangeChange={vi.fn()}
        onAcknowledge={vi.fn()}
        data={{
          summary: { pattern_events: 2 },
          by_friction: [
            { friction: 'ego_reactivity', label: 'Reactividad defensiva', count: 1, pattern_status: 'active', sources: { journal_reflection: 1 } },
            { friction: 'external_dependency', label: 'Dependencia de factores externos', count: 1, pattern_status: 'improving', sources: { journal_reflection: 1 } },
          ],
          timeline: [],
          resolved_frictions: [],
        }}
      />
    );

    expect(screen.getAllByText('Reactividad defensiva').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Dependencia de factores externos').length).toBeGreaterThan(0);
  });

  test('shows the pattern trend on the card and per-evidence intensity inside', () => {
    const data = {
      summary: { pattern_events: 2, avg_severity: 2 },
      by_friction: [{
        friction: 'overload',
        label: 'Saturación',
        count: 2,
        pattern_status: 'relapse_signal',
        sources: { chat_interaction: 2 },
      }],
      resolved_frictions: [],
      timeline: [
        {
          id: 'chat-worse',
          source_type: 'chat_interaction',
          created_at: '2026-07-15T10:00:00+00:00',
          friction: 'overload',
          label: 'Saturación',
          severity_label: 'Intensa',
          excerpt: 'Evidencia reciente',
        },
        {
          id: 'chat-earlier',
          source_type: 'chat_interaction',
          created_at: '2026-07-10T10:00:00+00:00',
          friction: 'overload',
          label: 'Saturación',
          severity_label: 'Leve',
          excerpt: 'Evidencia anterior',
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

    const group = screen.getByTestId('detected-pattern-group-overload');
    expect(within(group).getByText('Reaparece')).toBeInTheDocument();

    fireEvent.click(within(group).getByRole('button', { name: /Saturación/i }));
    expect(within(group).getByText('Intensa')).toBeInTheDocument();
    expect(within(group).getByText('Leve')).toBeInTheDocument();
    // Each row shows how strong that evidence was, never a direction — one
    // event cannot trend, and labelling it made every row read "Activo".
    expect(within(group).queryByText('Activo')).not.toBeInTheDocument();
    expect(within(group).queryByText('Mejorando')).not.toBeInTheDocument();
  });

  test('uses a neutral badge when no pattern trend has been calculated', () => {
    const data = {
      summary: { pattern_events: 1, avg_severity: 1 },
      by_friction: [{
        friction: 'rumination_loop',
        label: 'Rumiación recurrente',
        count: 1,
        sources: { chat_interaction: 1 },
      }],
      resolved_frictions: [],
      timeline: [{
        id: 'chat-neutral',
        source_type: 'chat_interaction',
        created_at: '2026-07-15T10:00:00+00:00',
        friction: 'rumination_loop',
        label: 'Rumiación recurrente',
        excerpt: 'Una pregunta logística',
      }],
    };

    render(
      <DetectedPatternsPanel
        data={data}
        loading={false}
        onAcknowledge={vi.fn()}
      />
    );

    // Scoped to the card: with nothing trending, the untrended section trigger
    // carries the same wording, so an unscoped query is ambiguous.
    const group = screen.getByTestId('detected-pattern-group-rumination_loop');
    expect(within(group).getByText('Sin tendencia')).toBeInTheDocument();
    expect(screen.queryByText('Mejorando')).not.toBeInTheDocument();
  });

  test('groups primary and secondary evidence under one pattern entry', () => {
    const data = {
      summary: { pattern_events: 3, avg_severity: 1 },
      by_friction: [{
        friction: 'rumination_loop',
        label: 'Rumiación recurrente',
        count: 3,
        pattern_status: 'active',
        sources: { chat_interaction: 3 },
      }],
      resolved_frictions: [],
      timeline: [
        {
          id: 'chat-primary',
          source_type: 'chat_interaction',
          created_at: '2026-07-15T10:00:00+00:00',
          friction: 'rumination_loop',
          label: 'Rumiación recurrente',
          pattern_status: 'active',
          excerpt: 'Primera evidencia de rumiación',
        },
        {
          id: 'chat-secondary-1',
          source_type: 'chat_interaction',
          created_at: '2026-07-15T11:00:00+00:00',
          friction: 'low_energy',
          secondary_friction: 'rumination_loop',
          label: 'Baja energía',
          secondary_label: 'Rumiación recurrente',
          pattern_status: 'active',
          excerpt: 'Segunda evidencia relacionada',
        },
        {
          id: 'chat-secondary-2',
          source_type: 'chat_interaction',
          created_at: '2026-07-15T12:00:00+00:00',
          friction: 'reactivity',
          secondary_friction: 'rumination_loop',
          label: 'Reactividad',
          secondary_label: 'Rumiación recurrente',
          pattern_status: 'active',
          excerpt: 'Tercera evidencia relacionada',
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

    const group = screen.getByTestId('detected-pattern-group-rumination_loop');
    expect(within(group).getByText('1 entrada · 3 evidencias')).toBeInTheDocument();
    expect(within(group).getByText('Chat (3)')).toBeInTheDocument();
    expect(screen.queryByText(/apariciones/)).not.toBeInTheDocument();

    fireEvent.click(within(group).getByRole('button', { name: /Rumiación recurrente/i }));
    expect(within(group).getByText(/Primera evidencia de rumiación/)).toBeInTheDocument();
    expect(within(group).getByText(/Segunda evidencia relacionada/)).toBeInTheDocument();
    expect(within(group).getByText(/Tercera evidencia relacionada/)).toBeInTheDocument();
    expect(within(group).queryByText(/secundaria/i)).not.toBeInTheDocument();
  });

  describe('trend columns', () => {
    const evidence = (friction, id, label) => ({
      id,
      source_type: 'chat_interaction',
      created_at: '2026-07-15T10:00:00+00:00',
      friction,
      label,
      severity_label: 'Moderada',
      excerpt: `Evidencia de ${label}`,
    });

    const trendData = {
      summary: { pattern_events: 4, avg_severity: 2 },
      by_friction: [
        { friction: 'overload', label: 'Saturación', count: 1, pattern_status: 'active', sources: { chat_interaction: 1 } },
        { friction: 'reactivity', label: 'Reactividad', count: 1, pattern_status: 'relapse_signal', sources: { chat_interaction: 1 } },
        { friction: 'low_energy', label: 'Energía baja', count: 1, pattern_status: 'improving', sources: { chat_interaction: 1 } },
        { friction: 'loneliness', label: 'Soledad o desconexión', count: 1, pattern_status: 'resolved_signal', sources: { chat_interaction: 1 } },
      ],
      resolved_frictions: [],
      timeline: [
        evidence('overload', 'e1', 'Saturación'),
        evidence('reactivity', 'e2', 'Reactividad'),
        evidence('low_energy', 'e3', 'Energía baja'),
        evidence('loneliness', 'e4', 'Soledad o desconexión'),
      ],
    };

    test('splits patterns into the attention and improving columns by trend', () => {
      render(<DetectedPatternsPanel data={trendData} loading={false} onAcknowledge={vi.fn()} />);

      const attention = screen.getByTestId('friction-column-attention');
      const improving = screen.getByTestId('friction-column-improving');

      expect(within(attention).getByTestId('detected-pattern-group-overload')).toBeInTheDocument();
      expect(within(attention).getByTestId('detected-pattern-group-reactivity')).toBeInTheDocument();
      expect(within(improving).getByTestId('detected-pattern-group-low_energy')).toBeInTheDocument();
      expect(within(improving).getByTestId('detected-pattern-group-loneliness')).toBeInTheDocument();
    });

    test('an empty column still renders with its explanation', () => {
      const onlyAttention = {
        ...trendData,
        by_friction: [trendData.by_friction[0]],
        timeline: [trendData.timeline[0]],
      };
      render(<DetectedPatternsPanel data={onlyAttention} loading={false} onAcknowledge={vi.fn()} />);

      const improving = screen.getByTestId('friction-column-improving');
      // "Nothing is getting better yet" is information, not a hole to hide.
      expect(within(improving).getByText('Todavía ninguno está bajando de intensidad.')).toBeInTheDocument();
    });

    test('untrended patterns stay out of the DOM until the section is opened', () => {
      const mixed = {
        ...trendData,
        by_friction: [...trendData.by_friction, { friction: 'procrastination', label: 'Procrastinación', count: 1, pattern_status: 'unknown', sources: { chat_interaction: 1 } }],
        timeline: [...trendData.timeline, evidence('procrastination', 'e5', 'Procrastinación')],
      };
      render(<DetectedPatternsPanel data={mixed} loading={false} onAcknowledge={vi.fn()} />);

      // Radix unmounts collapsed content, so this is genuinely absent.
      expect(screen.queryByTestId('detected-pattern-group-procrastination')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Sin tendencia/i }));
      expect(screen.getByTestId('detected-pattern-group-procrastination')).toBeInTheDocument();
    });

    test('all-untrended data renders no columns and an already-open section', () => {
      // The demo profile's real state: several patterns, one evidence each.
      const untrendedOnly = {
        summary: { pattern_events: 2, avg_severity: 1 },
        by_friction: [
          { friction: 'overload', label: 'Saturación', count: 1, pattern_status: 'unknown', sources: { chat_interaction: 1 } },
          { friction: 'procrastination', label: 'Procrastinación', count: 1, pattern_status: 'unknown', sources: { chat_interaction: 1 } },
        ],
        resolved_frictions: [],
        timeline: [evidence('overload', 'e1', 'Saturación'), evidence('procrastination', 'e2', 'Procrastinación')],
      };
      render(<DetectedPatternsPanel data={untrendedOnly} loading={false} onAcknowledge={vi.fn()} />);

      expect(screen.queryByTestId('friction-column-attention')).not.toBeInTheDocument();
      expect(screen.queryByTestId('friction-column-improving')).not.toBeInTheDocument();
      // Degrades to the flat list rather than two empty boxes.
      expect(screen.getByTestId('detected-pattern-group-overload')).toBeInTheDocument();
      expect(screen.getByTestId('detected-pattern-group-procrastination')).toBeInTheDocument();
    });

    test('selecting a chip leaves focus mode without columns', () => {
      render(<DetectedPatternsPanel data={trendData} loading={false} onAcknowledge={vi.fn()} />);

      // The chip and the card trigger share an accessible name, so pick the chip.
      const chips = screen.getAllByTitle('Filtrar evidencias por este patrón');
      fireEvent.click(chips.find((chip) => chip.textContent.includes('Saturación')));

      expect(screen.queryByTestId('friction-column-attention')).not.toBeInTheDocument();
      expect(screen.queryByTestId('friction-column-improving')).not.toBeInTheDocument();
      const group = screen.getByTestId('detected-pattern-group-overload');
      expect(within(group).getByText(/Evidencia de Saturación/)).toBeInTheDocument();
    });
  });
});
