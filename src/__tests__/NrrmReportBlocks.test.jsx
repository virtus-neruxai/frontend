import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ReasonedReportView from '../presentation/components/reasoning/ReasonedReportView';
import TransformativeCompanionCard from '../presentation/components/reasoning/TransformativeCompanionCard';
import { LearnedResponsesPanel } from '../presentation/components/dashboard/LearnedResponsesPanel';

const V3_REPORT = {
  schema_version: '3',
  main_reading: 'Semana con dificultad para cerrar tareas grandes.',
  causal_analysis: {
    observed_facts: [],
    detected_patterns: ['Evitas cerrar tareas grandes.'],
    possible_causes: [
      { hypothesis: 'El siguiente paso no estaba definido.', confidence: 0.5, evidence_ids: ['task:t1'] },
    ],
    contradictions: [],
    risk_of_wrong_interpretation: [],
    recommended_focus: [],
  },
  positive_evidence: [
    {
      claim: 'Caminar precedió a un rato de calma.',
      resource_ids: ['res-1'],
      evidence_ids: [],
      dates: ['2026-07-10'],
      source_types: ['pleasant_activity'],
      confidence: 0.8,
    },
  ],
  learned_response_candidates: [
    {
      observed_response: 'Aplazas el cierre de tareas grandes.',
      activation_signals: ['Tarea sin siguiente paso claro.'],
      evidence_ids: ['task:t1', 'task:t2'],
      dates: ['2026-07-05', '2026-07-12'],
      confidence: 0.6,
    },
  ],
  data_quality: {
    sample_size: 12,
    positive_sample_size: 2,
    coverage_days: 6,
    mode: 'normal',
    degraded_sources: [],
  },
};

describe('NRRM report blocks', () => {
  it('renders the positive-evidence block with its own heading and anchors', () => {
    render(<ReasonedReportView report={V3_REPORT} />);

    expect(screen.getByText('Lo que tu propia historia también demuestra')).toBeInTheDocument();
    expect(screen.getByText(/Caminar precedió a un rato de calma/)).toBeInTheDocument();
    expect(screen.getByText('2026-07-10')).toBeInTheDocument();
  });

  it('describes detected automatic responses without diagnosing', () => {
    render(<ReasonedReportView report={V3_REPORT} />);

    expect(screen.getByText('Respuestas automáticas detectadas')).toBeInTheDocument();
    expect(screen.getByText(/Se activa ante: Tarea sin siguiente paso claro/)).toBeInTheDocument();
    expect(screen.getByText(/Son observaciones, no diagnósticos/)).toBeInTheDocument();
  });

  it('surfaces sample quality and warns when the sample is sparse', () => {
    render(<ReasonedReportView report={V3_REPORT} />);
    expect(screen.getByText('Calidad de la muestra')).toBeInTheDocument();
    expect(screen.getByText('Eventos analizados')).toBeInTheDocument();

    const sparse = { ...V3_REPORT, data_quality: { ...V3_REPORT.data_quality, mode: 'sparse_sample' } };
    render(<ReasonedReportView report={sparse} />);
    expect(screen.getByText(/Muestra escasa/)).toBeInTheDocument();
  });

  it('omits every NRRM block for a V2 report', () => {
    const v2 = { ...V3_REPORT, schema_version: '2' };
    delete v2.positive_evidence;
    delete v2.learned_response_candidates;
    delete v2.data_quality;
    render(<ReasonedReportView report={v2} />);

    expect(screen.queryByText('Lo que tu propia historia también demuestra')).toBeNull();
    expect(screen.queryByText('Respuestas automáticas detectadas')).toBeNull();
    expect(screen.queryByText('Calidad de la muestra')).toBeNull();
  });

  it('sends the literal wording shown on screen when rejecting a pattern', async () => {
    const onFeedback = vi.fn().mockResolvedValue(undefined);
    render(<ReasonedReportView report={V3_REPORT} onFeedback={onFeedback} feedbackFor={() => undefined} />);

    fireEvent.click(screen.getAllByText('Esto no me representa')[0]);

    await waitFor(() => expect(onFeedback).toHaveBeenCalled());
    expect(onFeedback.mock.calls[0][0]).toMatchObject({
      targetType: 'report_pattern',
      // Verbatim: the suppression key is derived from these exact words.
      targetText: 'Evitas cerrar tareas grandes.',
      verdict: 'rejected',
    });
  });

  it('offers undo once a judgement exists', async () => {
    const onFeedback = vi.fn().mockResolvedValue(undefined);
    const feedbackFor = (key) =>
      key === 'Evitas cerrar tareas grandes.' ? { verdict: 'rejected' } : undefined;
    render(<ReasonedReportView report={V3_REPORT} onFeedback={onFeedback} feedbackFor={feedbackFor} />);

    expect(screen.getByText(/No volverá a proponerse/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Deshacer'));

    await waitFor(() => expect(onFeedback).toHaveBeenCalled());
    expect(onFeedback.mock.calls[0][0]).toMatchObject({ verdict: null });
  });

  it('rejects a cause with its own wording', async () => {
    const onFeedback = vi.fn().mockResolvedValue(undefined);
    render(<ReasonedReportView report={V3_REPORT} onFeedback={onFeedback} feedbackFor={() => undefined} />);

    fireEvent.click(screen.getByText('La causa no es esa'));

    await waitFor(() => expect(onFeedback).toHaveBeenCalled());
    expect(onFeedback.mock.calls[0][0]).toMatchObject({
      targetType: 'report_cause',
      targetText: 'El siguiente paso no estaba definido.',
    });
  });

  it('lets the user exclude a cited resource and undo it', async () => {
    const onResourceFeedback = vi.fn().mockResolvedValue(undefined);
    render(<ReasonedReportView report={V3_REPORT} onResourceFeedback={onResourceFeedback} />);

    fireEvent.click(screen.getByText('No lo uses más'));
    await waitFor(() => expect(onResourceFeedback).toHaveBeenCalledWith('res-1', 'exclude_from_companion'));

    fireEvent.click(screen.getAllByText('Deshacer')[0]);
    await waitFor(() => expect(onResourceFeedback).toHaveBeenCalledWith('res-1', null));
  });

  it('shows only resource-level feedback for a claim, not a second content-level control', () => {
    // A positive_evidence claim always cites a resource_id, so excluding the
    // resource already stops it from being cited again. Stacking the
    // report_pattern control on top duplicated the action under near-identical
    // wording ("Esto no me ayudó" vs "Esto no fue lo que me ayudó").
    render(
      <ReasonedReportView
        report={V3_REPORT}
        onFeedback={vi.fn()}
        feedbackFor={() => undefined}
        onResourceFeedback={vi.fn()}
      />,
    );

    expect(screen.getByText('Esto no me ayudó')).toBeInTheDocument();
    expect(screen.getByText('No lo uses más')).toBeInTheDocument();
    expect(screen.queryByText('Esto no fue lo que me ayudó')).toBeNull();
  });
});

const COMPANION = {
  companion_version: '1',
  prudence_level: 'full',
  resource_mode: 'personalized',
  emotional_validation: 'Tiene sentido que esta semana te haya pesado.',
  message: 'Un mensaje personal.',
  rewrite_sections: [
    {
      stage: 'old_response',
      text: 'Aplazas el cierre de tareas grandes.',
      confidence: 0.6,
      provenance: 'model_hypothesis',
      evidence_ids: ['task:t1'],
      resource_ids: [],
    },
  ],
  proposed_alternative_response: 'Escribe el primer paso antes de cerrar el día.',
  generic_practices: [],
  refusals: [],
  audio_script: null,
};

describe('Transformative companion card', () => {
  it('offers generation before any message exists', () => {
    render(<TransformativeCompanionCard companion={null} onGenerate={vi.fn()} />);
    expect(screen.getByText('Generar mensaje')).toBeInTheDocument();
    expect(screen.getByText(/Leerlo no te compromete a nada/)).toBeInTheDocument();
  });

  it('labels model readings as hypotheses rather than facts', () => {
    render(<TransformativeCompanionCard companion={COMPANION} />);
    expect(screen.getByText(/Hipótesis · bastante plausible \(60%\)/)).toBeInTheDocument();
    expect(screen.getByText('Acompañamiento, no análisis. Escrito a partir de este informe.')).toBeInTheDocument();
  });

  it('states that adopting confirms only the behaviour', async () => {
    const onAdopt = vi.fn().mockResolvedValue(undefined);
    render(<TransformativeCompanionCard companion={COMPANION} onAdopt={onAdopt} />);

    expect(screen.getByText(/No confirma nada de lo que se dice aquí sobre ti/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Adoptar esta respuesta'));
    await waitFor(() => expect(onAdopt).toHaveBeenCalled());
  });

  it('presents generic practices as explicitly not personal', () => {
    const generic = {
      ...COMPANION,
      prudence_level: 'reduced_sparse',
      resource_mode: 'generic_fallback',
      proposed_alternative_response: null,
      rewrite_sections: [],
      generic_practices: [{ practice_id: 'name_the_emotion', text: 'Ponle nombre a la emoción.', library_version: 1 }],
    };
    render(<TransformativeCompanionCard companion={generic} />);

    expect(screen.getByText(/Esto no sale de tu historia/)).toBeInTheDocument();
    expect(screen.getByText(/Ponle nombre a la emoción/)).toBeInTheDocument();
    // Nothing generic is adoptable as a supervised behaviour.
    expect(screen.queryByText('Adoptar esta respuesta')).toBeNull();
  });

  it('lets the user reword a stage in their own words', async () => {
    const onFeedback = vi.fn().mockResolvedValue(undefined);
    render(
      <TransformativeCompanionCard
        companion={COMPANION}
        onFeedback={onFeedback}
        feedbackFor={() => undefined}
      />,
    );

    fireEvent.click(screen.getByText('Corregir'));
    fireEvent.change(screen.getByPlaceholderText('Dilo con tus palabras…'), {
      target: { value: 'No lo evito: no sé por dónde empezar.' },
    });
    fireEvent.click(screen.getByText('Guardar'));

    await waitFor(() => expect(onFeedback).toHaveBeenCalled());
    expect(onFeedback.mock.calls[0][0]).toMatchObject({
      targetType: 'companion_section',
      stage: 'old_response',
      verdict: 'corrected',
      userCorrection: 'No lo evito: no sé por dónde empezar.',
    });
  });
});

describe('Learned responses panel', () => {
  const data = {
    total: 1,
    behaviors: [
      {
        response_key: 'avoidance_loop:tarea:trabajo',
        status: 'practicing',
        alternative_response: 'Escribe el primer paso antes de cerrar el día.',
        old_response: { value: 'Aplazas el cierre.', source: 'model_hypothesis' },
        activation_signals: ['Tarea sin siguiente paso claro.'],
      },
    ],
    applications: [],
  };

  it('shows adopted behaviours without any failure framing', () => {
    render(<LearnedResponsesPanel data={data} loading={false} />);

    expect(screen.getByText('Conductas que estás practicando')).toBeInTheDocument();
    expect(screen.getByText('En práctica')).toBeInTheDocument();
    expect(screen.getByText(/Aquí solo se cuenta lo que haces, nunca lo que no/)).toBeInTheDocument();
    // No streaks, no compliance percentages, no red states.
    expect(screen.queryByText(/racha/i)).toBeNull();
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it('hides itself entirely when nothing has been adopted', () => {
    const { container } = render(<LearnedResponsesPanel data={{ behaviors: [] }} loading={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
