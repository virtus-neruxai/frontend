import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { bodyCheckinsApiMock, agentApiMock } = vi.hoisted(() => ({
  bodyCheckinsApiMock: {
    getByDate: vi.fn(),
    getRange: vi.fn(),
    save: vi.fn(),
    getSummary: vi.fn(),
    getEvolution: vi.fn(),
  },
  agentApiMock: {
    confirmDraft: vi.fn(),
  },
}));

vi.mock('../lib/api', () => ({
  bodyCheckinsApi: bodyCheckinsApiMock,
  agentApi: agentApiMock,
  default: {},
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('../components/TaskDraftModal', () => ({
  default: ({ isOpen }) => (isOpen ? <div data-testid="task-draft-modal">task modal</div> : null),
}));

vi.mock('../components/MissionDraftModal', () => ({
  default: ({ isOpen }) => (isOpen ? <div data-testid="mission-draft-modal">mission modal</div> : null),
}));

vi.mock('../presentation/components/character/StatsHistoryChart', () => ({
  StatsHistoryChart: ({ title }) => <div data-testid="body-evolution-chart">{title}</div>,
}));

import { BodyCheckinSection } from '../presentation/components/character/bodycheckin/BodyCheckinSection';

const STATS_INFO = { disciplina: { name: 'Disciplina' } };

const EMPTY_SUMMARY = {
  range: { days: 7 },
  summary: { records: 0, top_signals: [], sample_status: 'no_data' },
  by_day: [],
};

const SAVED_CHECKIN = {
  id: 'body_checkin:demo:2026-07-12',
  checkin_date: '2026-07-12',
  sleep_hours: 7.5,
  energy_level: 3,
  stress_level: 2,
  fatigue_level: null,
  exercise_done: true,
  derived_signals: ['exercise_recorded'],
  note_analysis: { stat_changes: { disciplina: 1 }, stats_applied: true },
  mentor_outcome: {
    kind: 'comment',
    comment: 'Buen cuidado del cuerpo. Mantenlo mañana.',
    draft_id: null,
    draft_type: null,
    ui_action: null,
  },
};

function mockEmptyState() {
  bodyCheckinsApiMock.getByDate.mockRejectedValue({ response: { status: 404 } });
  bodyCheckinsApiMock.getRange.mockResolvedValue({ data: { items: [], count: 0 } });
  bodyCheckinsApiMock.getSummary.mockResolvedValue({ data: EMPTY_SUMMARY });
  bodyCheckinsApiMock.getEvolution.mockResolvedValue({ data: { history: [] } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BodyCheckinSection', () => {
  it('muestra el formulario cuando no hay check-in del dia', async () => {
    mockEmptyState();
    render(<BodyCheckinSection statsInfo={STATS_INFO} />);

    expect(await screen.findByText('Registrar check-in')).toBeInTheDocument();
    expect(screen.getByLabelText('Horas de sueño')).toBeInTheDocument();
    // Sin acciones de edicion/borrado en Caracter.
    expect(screen.queryByText(/borrar|eliminar/i)).not.toBeInTheDocument();
  });

  it('guarda con payload propio y pasa a bloqueado con salida del Mentor', async () => {
    mockEmptyState();
    bodyCheckinsApiMock.save.mockResolvedValue({ data: SAVED_CHECKIN });
    const user = userEvent.setup();

    render(<BodyCheckinSection statsInfo={STATS_INFO} />);
    await user.type(await screen.findByLabelText('Horas de sueño'), '7.5');
    await user.click(screen.getByText('Registrar check-in'));

    await waitFor(() => expect(bodyCheckinsApiMock.save).toHaveBeenCalledTimes(1));
    const [dateArg, payload] = bodyCheckinsApiMock.save.mock.calls[0];
    expect(dateArg).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(payload.sleep_hours).toBe(7.5);
    expect(payload.note).toBeNull();
    // Payload propio: jamas manda `content` de reflection.
    expect(payload).not.toHaveProperty('content');
    expect(payload).not.toHaveProperty('emotion_snapshot');

    expect(await screen.findByTestId('body-checkin-locked')).toBeInTheDocument();
    expect(screen.getByText('Registrado hoy')).toBeInTheDocument();
    expect(screen.queryByText('Registrar check-in')).not.toBeInTheDocument();
    expect(screen.getByTestId('body-checkin-mentor')).toHaveTextContent(
      'Buen cuidado del cuerpo'
    );
  });

  it('con 409 recupera el registro existente y bloquea', async () => {
    mockEmptyState();
    bodyCheckinsApiMock.save.mockRejectedValue({ response: { status: 409 } });
    const user = userEvent.setup();

    render(<BodyCheckinSection statsInfo={STATS_INFO} />);
    await user.type(await screen.findByLabelText('Horas de sueño'), '7');
    bodyCheckinsApiMock.getByDate.mockResolvedValue({ data: SAVED_CHECKIN });
    await user.click(screen.getByText('Registrar check-in'));

    expect(await screen.findByTestId('body-checkin-locked')).toBeInTheDocument();
  });

  it('carga bloqueado si ya existe check-in al montar', async () => {
    bodyCheckinsApiMock.getByDate.mockResolvedValue({ data: SAVED_CHECKIN });
    bodyCheckinsApiMock.getRange.mockResolvedValue({
      data: { items: [SAVED_CHECKIN], count: 1 },
    });
    bodyCheckinsApiMock.getSummary.mockResolvedValue({
      data: {
        range: { days: 7 },
        summary: {
          records: 1,
          avg_sleep_hours: 7.5,
          exercise_days: 1,
          top_signals: [{ signal: 'exercise_recorded', count: 1 }],
          sample_status: 'isolated',
        },
        by_day: [],
      },
    });
    bodyCheckinsApiMock.getEvolution.mockResolvedValue({ data: { history: [] } });

    render(<BodyCheckinSection statsInfo={STATS_INFO} />);

    expect(await screen.findByTestId('body-checkin-locked')).toBeInTheDocument();
    expect(screen.queryByText('Registrar check-in')).not.toBeInTheDocument();
    // KPIs desde note_analysis.stat_changes: +1 en Ganados y en Balance Neto.
    expect(screen.getByText('Registros')).toBeInTheDocument();
    expect(screen.getAllByText('+1')).toHaveLength(2);
    // Aviso de muestra baja.
    expect(await screen.findByTestId('body-low-sample-warning')).toBeInTheDocument();
  });

  it('abre el modal de tarea para un draft de rutina del Mentor', async () => {
    const draftCheckin = {
      ...SAVED_CHECKIN,
      mentor_outcome: {
        kind: 'draft',
        comment: 'Te propongo una rutina corta.',
        draft_id: 'draft_abc',
        draft_type: 'task',
        ui_action: {
          action: 'SHOW_TASK_CONFIRMATION_MODAL',
          draft_id: 'draft_abc',
          data: { title: 'Rutina corta', task_kind: 'routine' },
        },
      },
    };
    bodyCheckinsApiMock.getByDate.mockResolvedValue({ data: draftCheckin });
    bodyCheckinsApiMock.getRange.mockResolvedValue({ data: { items: [draftCheckin], count: 1 } });
    bodyCheckinsApiMock.getSummary.mockResolvedValue({ data: EMPTY_SUMMARY });
    bodyCheckinsApiMock.getEvolution.mockResolvedValue({ data: { history: [] } });
    const user = userEvent.setup();

    render(<BodyCheckinSection statsInfo={STATS_INFO} />);
    await user.click(await screen.findByText('Ver propuesta'));

    expect(screen.getByTestId('task-draft-modal')).toBeInTheDocument();
    // El draft nunca se confirma solo: no hay llamadas sin accion del usuario.
    expect(agentApiMock.confirmDraft).not.toHaveBeenCalled();
  });

  it('un error de carga muestra aviso propio sin romper la seccion', async () => {
    bodyCheckinsApiMock.getByDate.mockRejectedValue({ response: { status: 500 } });
    bodyCheckinsApiMock.getRange.mockRejectedValue(new Error('down'));
    bodyCheckinsApiMock.getSummary.mockRejectedValue(new Error('down'));
    bodyCheckinsApiMock.getEvolution.mockRejectedValue(new Error('down'));

    render(<BodyCheckinSection statsInfo={STATS_INFO} />);

    expect(await screen.findByTestId('body-checkin-error')).toBeInTheDocument();
    expect(screen.getByTestId('body-checkin-section')).toBeInTheDocument();
  });
});
