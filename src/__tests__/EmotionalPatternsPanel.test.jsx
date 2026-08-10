import { fireEvent, render, screen, within } from '@testing-library/react';
import { EmotionalPatternsPanel } from '../presentation/components/dashboard/EmotionalPatternsPanel';

const activePattern = {
  pattern_key: 'recurring_emotion_in_context:frustracion:trabajo',
  pattern_type: 'recurring_emotion_in_context',
  emotion: 'frustracion',
  emotion_label: 'Frustración',
  emoji: '😤',
  polarity: 'negative',
  label: 'Frustración recurrente en Trabajo',
  count: 4,
  avg_intensity: 3.5,
  pattern_status: 'active',
  is_weak_signal: false,
  sample_warning: null,
  related_signals: [],
  user_confirmed: null,
  user_working: null,
  user_progress: null,
  user_notes: null,
  resolved_at: null,
};

const weakPositivePattern = {
  pattern_key: 'recurring_emotion_in_context:calma:salud',
  pattern_type: 'recurring_emotion_in_context',
  emotion: 'calma',
  emotion_label: 'Calma',
  emoji: '😌',
  polarity: 'positive',
  label: 'Señal de Calma en Salud',
  count: 2,
  avg_intensity: 4.0,
  pattern_status: 'weak_signal',
  is_weak_signal: true,
  sample_warning: 'Muestra pequeña: se ha detectado 2 veces en esta ventana.',
  related_signals: ['Coincide con Evitación inicial'],
  user_confirmed: null,
  user_working: null,
  user_progress: null,
  user_notes: null,
  resolved_at: null,
};

const timelineEvent = {
  id: 'r1',
  source_type: 'journal_reflection',
  created_at: '2026-07-05T10:00:00+00:00',
  emotion: 'frustracion',
  emotion_label: 'Frustración',
  emoji: '😤',
  polarity: 'negative',
  intensity: 4,
  domain: 'Trabajo',
  friction: null,
  title: null,
  excerpt: 'Me costó empezar de nuevo.',
  note_excerpt: null,
  pattern_keys: ['recurring_emotion_in_context:frustracion:trabajo'],
};

function baseData(overrides = {}) {
  return {
    summary: {
      top_pattern_label: 'Frustración recurrente en Trabajo',
      dominant_emotions: [{ emotion: 'frustracion', emotion_label: 'Frustración', emoji: '😤', count: 4 }],
      average_intensity: 3.5,
      pattern_events: 4,
      is_stale: false,
      last_refreshed_at: '2026-07-05T12:00:00+00:00',
      ...overrides.summary,
    },
    by_pattern: overrides.by_pattern ?? [activePattern],
    resolved_patterns: overrides.resolved_patterns ?? [],
    timeline: overrides.timeline ?? [timelineEvent],
  };
}

beforeAll(() => {
  // Radix Slider (used by the acknowledge dialog) needs ResizeObserver in jsdom.
  if (!window.ResizeObserver) {
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

describe('EmotionalPatternsPanel', () => {
  test('renders an active pattern chip with emoji, label, count and status badge', () => {
    render(<EmotionalPatternsPanel data={baseData()} loading={false} onAcknowledge={vi.fn()} />);

    expect(screen.getByTestId('emotional-patterns-panel')).toBeInTheDocument();
    expect(screen.getAllByText(/Frustración recurrente en Trabajo/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Activo').length).toBeGreaterThan(0);
    const chipButton = screen.getByTitle('Filtrar evidencias por este patrón');
    expect(chipButton.textContent).toContain('×4');
  });

  test('renders "Presente" (success styling) for an active positive pattern, never "Activo"', () => {
    const positiveActive = { ...activePattern, polarity: 'positive', pattern_status: 'active', label: 'Calma recurrente en Salud' };
    render(<EmotionalPatternsPanel data={baseData({ by_pattern: [positiveActive] })} loading={false} onAcknowledge={vi.fn()} />);

    expect(screen.getAllByText('Presente').length).toBeGreaterThan(0);
    expect(screen.queryByText('Activo')).not.toBeInTheDocument();
    const positiveGroup = screen.getByTestId(
      'emotional-pattern-group-recurring_emotion_in_context:frustracion:trabajo'
    );
    expect(positiveGroup).toHaveClass(
      'border-[hsl(var(--success))]/50',
      'bg-[hsl(var(--success-soft))]'
    );

    fireEvent.click(within(positiveGroup).getByRole('button', { name: /Calma recurrente en Salud/i }));
    expect(screen.getByText(/Me costó empezar de nuevo/).closest('.my-2')).toHaveClass(
      'bg-[hsl(var(--success))]/10'
    );
  });

  test('reads a fading emotion as good news only when the emotion is a negative one', () => {
    const negativeEasing = { ...activePattern, polarity: 'negative', pattern_status: 'easing' };
    const { unmount } = render(
      <EmotionalPatternsPanel data={baseData({ by_pattern: [negativeEasing] })} loading={false} onAcknowledge={vi.fn()} />
    );
    expect(screen.getAllByText('Mejorando').length).toBeGreaterThan(0);
    unmount();

    // Same direction, opposite meaning: a positive emotion losing intensity is
    // something fading, not something improving.
    const positiveEasing = { ...activePattern, polarity: 'positive', pattern_status: 'easing', label: 'Calma recurrente en Salud' };
    render(
      <EmotionalPatternsPanel data={baseData({ by_pattern: [positiveEasing] })} loading={false} onAcknowledge={vi.fn()} />
    );
    expect(screen.getAllByText('Se está apagando').length).toBeGreaterThan(0);
    expect(screen.queryByText('Mejorando')).not.toBeInTheDocument();
  });

  test('reads a growing emotion as a relapse only when the emotion is a negative one', () => {
    const negativeRising = { ...activePattern, polarity: 'negative', pattern_status: 'intensifying' };
    const { unmount } = render(
      <EmotionalPatternsPanel data={baseData({ by_pattern: [negativeRising] })} loading={false} onAcknowledge={vi.fn()} />
    );
    expect(screen.getAllByText('Se intensifica').length).toBeGreaterThan(0);
    unmount();

    const positiveRising = { ...activePattern, polarity: 'positive', pattern_status: 'intensifying', label: 'Calma recurrente en Salud' };
    render(
      <EmotionalPatternsPanel data={baseData({ by_pattern: [positiveRising] })} loading={false} onAcknowledge={vi.fn()} />
    );
    expect(screen.getAllByText('Creciendo').length).toBeGreaterThan(0);
    expect(screen.queryByText('Se intensifica')).not.toBeInTheDocument();
  });

  test('falls back to a neutral badge for a status written before the trend rule', () => {
    // Snapshots persist pattern_status for up to 24h, so a cached "improving"
    // must not be rendered as a red "Activo".
    const legacy = { ...activePattern, polarity: 'negative', pattern_status: 'improving' };
    render(<EmotionalPatternsPanel data={baseData({ by_pattern: [legacy] })} loading={false} onAcknowledge={vi.fn()} />);

    expect(screen.getAllByText('Señal inicial').length).toBeGreaterThan(0);
    expect(screen.queryByText('Activo')).not.toBeInTheDocument();
  });

  test('renders a weak-signal pattern with prudent label, sample_warning tooltip, and related_signals note', () => {
    render(
      <EmotionalPatternsPanel
        data={baseData({ by_pattern: [weakPositivePattern], timeline: [] })}
        loading={false}
        onAcknowledge={vi.fn()}
      />
    );

    expect(screen.getAllByText(/Señal de Calma en Salud/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Señal inicial').length).toBeGreaterThan(0);
    expect(screen.queryByText('Presente')).not.toBeInTheDocument();
    // related_signals render as secondary text inside the grouped pattern row
    expect(screen.getByText(/Coincide con Evitación inicial/)).toBeInTheDocument();
  });

  test('renders the timeline with intensity chip and note excerpt', () => {
    const eventWithNote = { ...timelineEvent, note_excerpt: 'sigo evitando empezar' };
    render(
      <EmotionalPatternsPanel
        data={baseData({ timeline: [eventWithNote] })}
        loading={false}
        onAcknowledge={vi.fn()}
      />
    );

    const group = screen.getByTestId('emotional-pattern-group-recurring_emotion_in_context:frustracion:trabajo');
    fireEvent.click(within(group).getByRole('button', { name: /Frustración recurrente en Trabajo/i }));

    expect(screen.getByText('4/5')).toBeInTheDocument();
    expect(screen.getByText(/sigo evitando empezar/)).toBeInTheDocument();
  });

  test('shows empty state when there is no data at all', () => {
    render(
      <EmotionalPatternsPanel
        data={{ summary: {}, by_pattern: [], resolved_patterns: [], timeline: [] }}
        loading={false}
        onAcknowledge={vi.fn()}
      />
    );

    expect(screen.getByText('Aún no hay patrones emocionales en este periodo.')).toBeInTheDocument();
  });

  test('shows loading skeleton', () => {
    render(<EmotionalPatternsPanel data={null} loading onAcknowledge={vi.fn()} />);
    expect(screen.getByTestId('emotional-patterns-panel')).toBeInTheDocument();
    expect(screen.queryByText('Aún no hay patrones emocionales en este periodo.')).not.toBeInTheDocument();
  });

  test('clicking a chip filters the timeline by pattern_key, and "Ver todos" clears it', () => {
    const otherEvent = { ...timelineEvent, id: 'r2', pattern_keys: ['recurring_emotion_in_context:calma:salud'] };
    render(
      <EmotionalPatternsPanel
        data={baseData({ by_pattern: [activePattern, weakPositivePattern], timeline: [timelineEvent, otherEvent] })}
        loading={false}
        onAcknowledge={vi.fn()}
      />
    );

    const chipButtons = screen.getAllByTitle('Filtrar evidencias por este patrón');
    const frustracionChip = chipButtons.find((btn) => btn.textContent.includes('Frustración'));
    fireEvent.click(frustracionChip);
    expect(screen.getAllByText(/Me costó empezar de nuevo/)).toHaveLength(1);

    fireEvent.click(screen.getByText('Ver todos'));
    expect(screen.getByTestId('emotional-pattern-group-recurring_emotion_in_context:frustracion:trabajo')).toBeInTheDocument();
    expect(screen.getByTestId('emotional-pattern-group-recurring_emotion_in_context:calma:salud')).toBeInTheDocument();
    expect(screen.queryByText('Me costó empezar de nuevo.', { exact: false })).not.toBeInTheDocument();
  });

  test('groups repeated emotional entries under one pattern and deduplicates pattern chips', () => {
    const duplicatePattern = {
      ...activePattern,
      sources: { journal_reflection: 1, chat_interaction: 1 },
    };
    const duplicatePatternCopy = {
      ...activePattern,
      sources: { journal_reflection: 1, chat_interaction: 1 },
    };
    const chatEvent = {
      ...timelineEvent,
      id: 'chat-1',
      source_type: 'chat_interaction',
      created_at: '2026-07-06T10:00:00+00:00',
      excerpt: 'Otra vez aparece frustración al hablar del trabajo.',
    };

    render(
      <EmotionalPatternsPanel
        data={baseData({
          by_pattern: [duplicatePattern, duplicatePatternCopy],
          timeline: [timelineEvent, chatEvent],
        })}
        loading={false}
        onAcknowledge={vi.fn()}
      />
    );

    const chipButtons = screen.getAllByTitle('Filtrar evidencias por este patrón');
    const patternChips = chipButtons.filter((btn) => btn.textContent.includes('Frustración recurrente en Trabajo'));
    expect(patternChips).toHaveLength(1);

    const group = screen.getByTestId('emotional-pattern-group-recurring_emotion_in_context:frustracion:trabajo');
    expect(within(group).getByText(/Frustración recurrente en Trabajo/)).toBeInTheDocument();
    expect(within(group).getByText('2 entradas')).toBeInTheDocument();
    expect(within(group).getByText('Diario (1)')).toBeInTheDocument();
    expect(within(group).getByText('Chat (1)')).toBeInTheDocument();
    expect(screen.queryByText(/Otra vez aparece frustración/)).not.toBeInTheDocument();

    fireEvent.click(within(group).getByRole('button', { name: /Frustración recurrente en Trabajo/i }));

    expect(screen.getByText(/Me costó empezar de nuevo/)).toBeInTheDocument();
    expect(screen.getByText(/Otra vez aparece frustración/)).toBeInTheDocument();
  });

  test('renders a single visual group when one reflection contributes several internal pattern keys', () => {
    const routineEvent = {
      id: 'routine-emotion-1',
      source_type: 'routine_reflection',
      created_at: '2026-07-13T10:00:00+00:00',
      emotion: 'concentracion',
      emotion_label: 'Concentración',
      emoji: '🧠',
      polarity: 'positive',
      intensity: 5,
      domain: 'Rutina',
      friction: 'unclear_goal',
      title: 'Rutina de calma',
      excerpt: 'He sentido concentración al completar la rutina.',
      note_excerpt: null,
      pattern_keys: [
        'recurring_emotion_in_context:concentracion:rutina',
        'emotion_after_routine:concentracion:rutina',
        'emotion_friction_association:concentracion:unclear_goal',
      ],
    };

    render(
      <EmotionalPatternsPanel
        data={baseData({
          summary: {
            top_pattern_label: 'Señales emocionales iniciales detectadas',
            dominant_emotions: [{ emotion: 'concentracion', emotion_label: 'Concentración', emoji: '🧠', count: 1 }],
            average_intensity: 5,
            pattern_events: 1,
            is_stale: true,
          },
          by_pattern: [],
          timeline: [routineEvent],
        })}
        loading={false}
        onAcknowledge={vi.fn()}
      />
    );

    const primaryGroup = screen.getByTestId('emotional-pattern-group-recurring_emotion_in_context:concentracion:rutina');
    expect(primaryGroup).toBeInTheDocument();
    expect(screen.queryByTestId('emotional-pattern-group-emotion_after_routine:concentracion:rutina')).not.toBeInTheDocument();
    expect(screen.queryByTestId('emotional-pattern-group-emotion_friction_association:concentracion:unclear_goal')).not.toBeInTheDocument();
    expect(within(primaryGroup).getByText('1 entrada')).toBeInTheDocument();
    expect(within(primaryGroup).getByText('Rutina (1)')).toBeInTheDocument();

    fireEvent.click(within(primaryGroup).getByRole('button', { name: /Concentración/i }));

    expect(screen.getAllByText(/He sentido concentración/)).toHaveLength(1);
  });

  test('resolved patterns render under "Patrones superados"', () => {
    const resolved = {
      pattern_key: 'recurring_emotion_in_context:calma:salud',
      label: 'Calma recurrente en Salud',
      emoji: '😌',
      count: 5,
      user_notes: 'Ya no me cuesta',
      resolved_at: '2026-07-01T00:00:00+00:00',
    };
    render(
      <EmotionalPatternsPanel
        data={baseData({ resolved_patterns: [resolved] })}
        loading={false}
        onAcknowledge={vi.fn()}
      />
    );

    expect(screen.getByText('Patrones superados')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Patrones superados'));
    expect(screen.getByText(/Calma recurrente en Salud/)).toBeInTheDocument();
    expect(screen.getByText('Ya no me cuesta')).toBeInTheDocument();
  });

  test('submitting the acknowledge dialog calls onAcknowledge with (pattern_key, payload)', async () => {
    const onAcknowledge = vi.fn().mockResolvedValue(undefined);
    render(<EmotionalPatternsPanel data={baseData()} loading={false} onAcknowledge={onAcknowledge} />);

    fireEvent.click(screen.getByTitle('Actualizar progreso'));
    fireEvent.click(screen.getByLabelText('¿Reconoces este patrón en ti?'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await vi.waitFor(() => {
      expect(onAcknowledge).toHaveBeenCalledWith(
        'recurring_emotion_in_context:frustracion:trabajo',
        { confirmed: true, working_on_it: false, progress: 1, notes: null }
      );
    });
  });

  describe('polarity columns', () => {
    const calmPattern = {
      ...activePattern,
      pattern_key: 'recurring_emotion_in_context:calma:salud',
      emotion: 'calma',
      emotion_label: 'Calma',
      emoji: '\u{1F60C}',
      polarity: 'positive',
      label: 'Calma recurrente en Salud',
    };
    const calmEvent = {
      ...timelineEvent,
      id: 'r-calma',
      emotion: 'calma',
      emotion_label: 'Calma',
      emoji: '\u{1F60C}',
      polarity: 'positive',
      excerpt: 'Me sentí en calma tras la rutina.',
      pattern_keys: ['recurring_emotion_in_context:calma:salud'],
    };

    test('splits patterns into the positive and negative columns', () => {
      render(
        <EmotionalPatternsPanel
          data={baseData({ by_pattern: [activePattern, calmPattern], timeline: [timelineEvent, calmEvent] })}
          loading={false}
          onAcknowledge={vi.fn()}
        />
      );

      const positive = screen.getByTestId('emotional-column-positive');
      const negative = screen.getByTestId('emotional-column-negative');

      expect(within(positive).getByTestId('emotional-pattern-group-recurring_emotion_in_context:calma:salud')).toBeInTheDocument();
      expect(within(negative).getByTestId('emotional-pattern-group-recurring_emotion_in_context:frustracion:trabajo')).toBeInTheDocument();
    });

    test('an unresolved polarity lands in the neutral strip, never in a judged column', () => {
      const noPolarity = { ...activePattern, polarity: undefined };
      const neutralEvent = { ...timelineEvent, polarity: undefined };
      render(
        <EmotionalPatternsPanel
          data={baseData({ by_pattern: [noPolarity, calmPattern], timeline: [neutralEvent, calmEvent] })}
          loading={false}
          onAcknowledge={vi.fn()}
        />
      );

      const negative = screen.getByTestId('emotional-column-negative');
      expect(within(negative).queryByTestId('emotional-pattern-group-recurring_emotion_in_context:frustracion:trabajo')).not.toBeInTheDocument();

      // Radix unmounts collapsed content, so it is genuinely absent until opened.
      expect(screen.queryByTestId('emotional-pattern-group-recurring_emotion_in_context:frustracion:trabajo')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Neutras/i }));
      expect(screen.getByTestId('emotional-pattern-group-recurring_emotion_in_context:frustracion:trabajo')).toBeInTheDocument();
    });

    test('a timeline-only pattern inherits its polarity from the evidence', () => {
      // Without seeding the synthesized meta, this card would silently fall
      // into the neutral strip instead of the positive column.
      render(
        <EmotionalPatternsPanel
          data={baseData({ by_pattern: [], timeline: [calmEvent] })}
          loading={false}
          onAcknowledge={vi.fn()}
        />
      );

      const positive = screen.getByTestId('emotional-column-positive');
      expect(within(positive).getByTestId('emotional-pattern-group-recurring_emotion_in_context:calma:salud')).toBeInTheDocument();
    });

    test('all-neutral data renders no columns and an already-open strip', () => {
      const neutralPattern = { ...activePattern, polarity: 'neutral' };
      const neutralEvent = { ...timelineEvent, polarity: 'neutral' };
      render(
        <EmotionalPatternsPanel
          data={baseData({ by_pattern: [neutralPattern], timeline: [neutralEvent] })}
          loading={false}
          onAcknowledge={vi.fn()}
        />
      );

      expect(screen.queryByTestId('emotional-column-positive')).not.toBeInTheDocument();
      expect(screen.queryByTestId('emotional-column-negative')).not.toBeInTheDocument();
      expect(screen.getByTestId('emotional-pattern-group-recurring_emotion_in_context:frustracion:trabajo')).toBeInTheDocument();
    });
  });
});
