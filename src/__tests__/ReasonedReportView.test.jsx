import { fireEvent, render, screen, within } from '@testing-library/react';
import ReasonedReportView, { stripEvidenceIds } from '../presentation/components/reasoning/ReasonedReportView';

const fullReport = {
  schema_version: '2',
  main_reading: 'Tasa de finalización muy baja (11.8%) con 16 tareas pendientes.',
  operational_risk: 'Backlog alto: 16 en todo, 4 vencidas.',
  priority: 'Reducir frentes abiertos antes de abrir ninguno nuevo.',
  interpretation: 'Es probable que la acumulación alimente la meta difusa.',
  action_today: {
    instruction: 'Elige una tarea vencida y decide qué hacer con ella.',
    rationale: 'Saturación clara: fricción repetida 17 veces.',
    estimated_minutes: 15,
    suggested_task: { title: 'Revisar tarea vencida', description: 'Decidir cerrar o reprogramar.' },
  },
  evidence: [
    {
      claim: "La fricción 'unclear_goal' aparece de forma recurrente.",
      dates: ['2026-07-04', '2026-07-09'],
      source_types: ['mentor_conversation', 'routine_reflection'],
    },
  ],
  causal_analysis: {
    observed_facts: ['La tasa de completado es 11.8% (4 de 34).'],
    detected_patterns: ['Repetición sostenida de unclear_goal.'],
    possible_causes: [
      { hypothesis: 'La falta de claridad reduce la finalización.', confidence: 0.55 },
    ],
    contradictions: ['Alta gratitud junto a fricción persistente.'],
    recommended_focus: ['Observar si unclear_goal baja al reducir tareas.'],
    risk_of_wrong_interpretation: ['El 91% de eventos no tiene emoción registrada.'],
  },
  emotional_analysis: {
    window_days: 14,
    sample_size: 9,
    average_intensity: 3.33,
    dominant_emotions: ['Cansancio leve', 'Gratitud'],
    pattern_refs: [
      { pattern_key: 'pk1', label: 'Señal de Gratitud', pattern_status: 'weak_signal', count: 2, avg_intensity: 4.5 },
    ],
    recurring_emotional_notes: ['El 10 de julio cierra con gratitud alta.'],
  },
  metrics: {
    window_days: 14,
    tasks: { total: 34, completed: 4, in_progress: 12, todo: 16, blocked: 0, overdue: 4, completion_rate: 11.8 },
    top_frictions: [
      { friction: 'unclear_goal', count: 17 },
      { friction: 'avoidance_loop', count: 5 },
    ],
  },
  body_signals: {
    window_days: 14,
    sample_size: 3,
    sample_status: 'trend_weak',
    avg_sleep_hours: 6.5,
    avg_energy: 2.5,
    avg_stress: 3.5,
    avg_fatigue: 3.0,
    exercise_days: 1,
    top_signals: [{ signal: 'low_energy', count: 2 }],
    trends: { energy: 'down', stress: 'stable', sleep: 'insufficient' },
  },
};

describe('ReasonedReportView', () => {
  it('renders the structured panels of a V2 report', () => {
    render(<ReasonedReportView report={fullReport} />);
    expect(screen.getByText('Hechos observados')).toBeInTheDocument();
    expect(screen.getByText('Riesgo operativo')).toBeInTheDocument();
    expect(screen.getByText('Patrones detectados')).toBeInTheDocument();
    expect(screen.getByText('Posibles causas')).toBeInTheDocument();
    expect(screen.getByText('Evidencias')).toBeInTheDocument();
    expect(screen.getByText('Lectura emocional')).toBeInTheDocument();
  });

  it('renders the deterministic KPI tiles and friction chips', () => {
    render(<ReasonedReportView report={fullReport} />);
    expect(screen.getByText('Métricas del periodo')).toBeInTheDocument();
    // Task KPI tiles from get_task_stats.
    expect(screen.getByText('Tasa de completado')).toBeInTheDocument();
    expect(screen.getByText('En progreso')).toBeInTheDocument();
    expect(screen.getByText('Vencidas')).toBeInTheDocument();
    // 11.8% shows both as a tile value and emphasized in the prose above it.
    expect(screen.getAllByText('11.8%').length).toBeGreaterThanOrEqual(1);
    // Friction keys are shown with their human label + count.
    expect(screen.getByText(/Meta poco clara/)).toBeInTheDocument();
    expect(screen.getByText('×17')).toBeInTheDocument();
    expect(screen.getByText(/Evitación inicial/)).toBeInTheDocument();
  });

  it('renders the emotional pattern table with count and intensity', () => {
    render(<ReasonedReportView report={fullReport} />);
    const table = screen.getByRole('table');
    expect(within(table).getByText('Señal de Gratitud')).toBeInTheDocument();
    expect(within(table).getByText('×2')).toBeInTheDocument();
    expect(within(table).getByText('4.5/5')).toBeInTheDocument();
    expect(within(table).getByText('Señal inicial')).toBeInTheDocument();
  });

  it('surfaces objective figures as emphasized text', () => {
    render(<ReasonedReportView report={fullReport} />);
    // Numbers embedded in prose are wrapped in <strong> so they stand out.
    const strongs = document.querySelectorAll('strong');
    const values = Array.from(strongs).map((n) => n.textContent);
    expect(values).toContain('11.8%');
    expect(values).toContain('17');
  });

  it('renders the body signals panel with averages, signals and trend', () => {
    render(<ReasonedReportView report={fullReport} />);
    expect(screen.getByText('Lectura corporal')).toBeInTheDocument();
    expect(screen.getByText('6.5h')).toBeInTheDocument();
    expect(screen.getByText('2.5/5')).toBeInTheDocument();
    expect(screen.getByText(/Energía baja/)).toBeInTheDocument();
    // "×2" also appears in the emotional pattern table (pattern_refs count) —
    // assert at least one match instead of a single unique node.
    expect(screen.getAllByText('×2').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Energía: A la baja/)).toBeInTheDocument();
  });

  it('hides the body signals panel when there are no check-ins', () => {
    render(<ReasonedReportView report={{
      ...fullReport,
      body_signals: { sample_size: 0, sample_status: 'no_data', top_signals: [], trends: {} },
    }} />);
    expect(screen.queryByText('Lectura corporal')).not.toBeInTheDocument();
  });

  it('shows the confidence for each possible cause', () => {
    render(<ReasonedReportView report={fullReport} />);
    expect(screen.getByText(/Media · 55%/)).toBeInTheDocument();
  });

  it('wires action_today into onConvertToTask with the instruction as title', () => {
    const onConvertToTask = vi.fn();
    render(<ReasonedReportView report={fullReport} onConvertToTask={onConvertToTask} />);
    fireEvent.click(screen.getByRole('button', { name: /Convertir en tarea/i }));
    expect(onConvertToTask).toHaveBeenCalledWith(expect.objectContaining({
      title: fullReport.action_today.instruction,
      suggested_task: fullReport.action_today.suggested_task,
    }));
  });

  it('hides empty sections instead of rendering blank boxes', () => {
    render(<ReasonedReportView report={{ schema_version: '2', main_reading: 'Solo lectura.' }} />);
    expect(screen.getByText('Solo lectura.')).toBeInTheDocument();
    expect(screen.queryByText('Evidencias')).not.toBeInTheDocument();
    expect(screen.queryByText('Lectura emocional')).not.toBeInTheDocument();
    expect(screen.queryByText('Lectura corporal')).not.toBeInTheDocument();
    expect(screen.queryByText('Riesgo operativo')).not.toBeInTheDocument();
    expect(screen.queryByText('Métricas del periodo')).not.toBeInTheDocument();
  });

  it('renders nothing when there is no report', () => {
    const { container } = render(<ReasonedReportView report={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  // Reports generated before report_agent sanitized its prose still carry inline
  // evidence ids, so the view has to clean them when opened from history.
  describe('stripEvidenceIds', () => {
    it('drops a parenthetical citation but keeps the rest of the sentence', () => {
      expect(stripEvidenceIds(
        'Patrón de apertura sin cierre: se crean tareas nuevas '
        + '(task:fa191445-0001, task:14310844-0002, etc.) '
        + 'mientras el backlog previo permanece sin avanzar.',
      )).toBe(
        'Patrón de apertura sin cierre: se crean tareas nuevas '
        + 'mientras el backlog previo permanece sin avanzar.',
      );
    });

    it('drops a trailing clause that only existed to cite ids', () => {
      expect(stripEvidenceIds(
        'Patrón de evitación recurrente en rutinas de bienestar y en la reflexión final, '
        + 'respaldado por routine_reflection:0e30321f..., routine_reflection:813f48d7... '
        + 'y journal_reflection:2026-07-11T09:19:50.535768+00:00.',
      )).toBe('Patrón de evitación recurrente en rutinas de bienestar y en la reflexión final.');
    });

    it('leaves clean prose untouched', () => {
      const clean = 'La tasa de completado es del 11.8% y hay 4 tareas vencidas.';
      expect(stripEvidenceIds(clean)).toBe(clean);
    });
  });

  it('never shows raw evidence ids in a stored report', () => {
    render(<ReasonedReportView report={{
      ...fullReport,
      causal_analysis: {
        ...fullReport.causal_analysis,
        detected_patterns: ['Acumulación sin cierre, respaldado por task:fa191445-0001 y task:14310844-0002.'],
      },
    }} />);
    expect(document.body.textContent).not.toMatch(/task:|routine_reflection:|journal_reflection:/);
    expect(screen.getByText(/Acumulación sin cierre\./)).toBeInTheDocument();
  });
});
