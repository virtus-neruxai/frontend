import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskModal from '../components/TaskModal';
import { tasksApi, missionsApi, reflectionsApi } from '../lib/api';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('../lib/api', () => ({
  tasksApi: {
    patch: vi.fn(),
    delete: vi.fn(),
    markRoutineToday: vi.fn(),
  },
  missionsApi: {
    getAll: vi.fn(),
    complete: vi.fn(),
  },
  reflectionsApi: {
    getAll: vi.fn(),
    create: vi.fn(),
  },
}));

beforeAll(() => {
  if (!window.HTMLElement.prototype.hasPointerCapture) {
    window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  }
  if (!window.HTMLElement.prototype.setPointerCapture) {
    window.HTMLElement.prototype.setPointerCapture = vi.fn();
  }
  if (!window.HTMLElement.prototype.releasePointerCapture) {
    window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  }
  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  }
  if (!window.ResizeObserver) {
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

describe('TaskModal reflection failure handling', () => {
  const task = {
    id: 'task-1',
    title: 'Enviar informe',
    description: 'Cerrar el informe semanal',
    domain: 'Trabajo',
    task_kind: 'task',
    status: 'todo',
    is_complete: false,
    progress_percent: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    reflectionsApi.getAll.mockResolvedValue({ data: [] });
    reflectionsApi.create.mockRejectedValue(new Error('reflection failed'));
    tasksApi.patch.mockResolvedValue({ data: { ...task, status: 'done', is_complete: true } });
    tasksApi.markRoutineToday.mockResolvedValue({ data: {} });
    missionsApi.getAll.mockResolvedValue({ data: [] });
  });

  test('keeps the reflection text and emotion when saving fails, then retries both', async () => {
    const onSaved = vi.fn();

    render(
      <TaskModal
        open
        onClose={vi.fn()}
        task={task}
        onSaved={onSaved}
        onDeleted={vi.fn()}
      />
    );

    const textarea = await screen.findByTestId('task-completion-reflection-input');
    fireEvent.change(textarea, { target: { value: 'Me costó empezar, pero lo terminé.' } });
    fireEvent.click(screen.getByRole('button', { name: '😔 Difícil' }));
    fireEvent.click(screen.getByRole('button', { name: '😰 Ansiedad' }));
    fireEvent.click(screen.getByTestId('task-mark-done-btn'));

    await waitFor(() => expect(reflectionsApi.create).toHaveBeenCalledTimes(1));

    expect(tasksApi.patch).toHaveBeenCalledWith('task-1', {
      is_complete: true,
      progress_percent: 100,
      status: 'done',
    });
    expect(onSaved).not.toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalledWith('Los cambios se guardaron, pero no se pudo guardar la reflexión');
    expect(screen.getByTestId('task-completion-reflection-input')).toHaveValue('Me costó empezar, pero lo terminé.');
    expect(screen.getByTestId('task-reflection-retry-btn')).toBeInTheDocument();
    expect(reflectionsApi.create).toHaveBeenLastCalledWith(expect.objectContaining({
      emotion_snapshot: {
        polarity: 'negative',
        emotion: 'Ansiedad',
        intensity: 3,
        note: null,
      },
    }));

    reflectionsApi.create.mockResolvedValue({
      data: {
        id: 'task-reflection-1',
        reflection_type: 'task',
        task_id: 'task-1',
        content: 'Me costó empezar, pero lo terminé.',
      },
    });
    fireEvent.click(screen.getByTestId('task-reflection-retry-btn'));

    await waitFor(() => expect(reflectionsApi.create).toHaveBeenCalledTimes(2));
    expect(reflectionsApi.create).toHaveBeenLastCalledWith(expect.objectContaining({
      content: 'Me costó empezar, pero lo terminé.',
      reflection_type: 'task',
      task_id: 'task-1',
      emotion_snapshot: {
        polarity: 'negative',
        emotion: 'Ansiedad',
        intensity: 3,
        note: null,
      },
    }));
    await waitFor(() => expect(screen.getByTestId('task-completion-reflection-input')).toHaveValue(''));
    expect(screen.queryByRole('button', { name: '😰 Ansiedad' })).not.toBeInTheDocument();
  });

  test('does not create a reflection when only an emotion is selected', async () => {
    const onSaved = vi.fn();

    render(
      <TaskModal
        open
        onClose={vi.fn()}
        task={task}
        onSaved={onSaved}
        onDeleted={vi.fn()}
      />
    );

    await screen.findByTestId('task-completion-reflection-input');
    fireEvent.click(screen.getByRole('button', { name: '😊 Positiva' }));
    fireEvent.click(screen.getByRole('button', { name: '😄 Alegría' }));
    fireEvent.click(screen.getByTestId('task-mark-done-btn'));

    expect(await screen.findByTestId('emotion-discard-alert')).toBeInTheDocument();
    expect(tasksApi.patch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Completar sin emoción' }));

    await waitFor(() => expect(tasksApi.patch).toHaveBeenCalledTimes(1));
    expect(reflectionsApi.create).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
  });

  test('requires confirmation before closing with an emotion and no reflection', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <TaskModal
        open
        onClose={onClose}
        task={task}
        onSaved={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    await screen.findByTestId('task-completion-reflection-input');
    await user.click(screen.getByRole('button', { name: '😔 Difícil' }));
    await user.click(screen.getByRole('button', { name: '😢 Tristeza' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(await screen.findByText('Emoción sin reflexión')).toBeInTheDocument();
    expect(screen.getByText(/Para registrar correctamente tu emoción/)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Seguir escribiendo' }));
    await waitFor(() => expect(screen.queryByTestId('emotion-discard-alert')).not.toBeInTheDocument());
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '😢 Tristeza' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('task-completion-reflection-input')).toHaveFocus());

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByTestId('emotion-discard-alert')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.click(await screen.findByRole('button', { name: 'Salir sin guardar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('deletes a task without asking for a deletion reason', async () => {
    const onDeleted = vi.fn();
    const promptSpy = vi.spyOn(window, 'prompt').mockImplementation(() => 'unused');
    tasksApi.delete.mockResolvedValue({});

    render(
      <TaskModal
        open
        onClose={vi.fn()}
        task={task}
        onSaved={vi.fn()}
        onDeleted={onDeleted}
      />
    );

    const deleteButton = await screen.findByTestId('task-delete-btn');
    fireEvent.click(deleteButton);
    fireEvent.click(deleteButton);

    await waitFor(() => expect(tasksApi.delete).toHaveBeenCalledWith('task-1'));
    expect(promptSpy).not.toHaveBeenCalled();
    expect(onDeleted).toHaveBeenCalled();

    promptSpy.mockRestore();
  });

  test('completes a routine with a daily routine reflection payload', async () => {
    const routine = {
      id: 'routine-1',
      title: 'Leer',
      description: 'Leer 10 minutos',
      domain: 'Aprendizaje',
      task_kind: 'routine',
      status: 'in_progress',
      is_complete: false,
      progress_percent: 100,
      routine_completed_dates: [],
    };
    reflectionsApi.create.mockResolvedValue({
      data: {
        id: 'routine-reflection:routine-1:2026-06-26',
        reflection_type: 'routine',
        routine_id: 'routine-1',
        routine_occurrence_date: '2026-06-26',
        content: 'Hoy fui constante.',
        created_at: '2026-06-26T08:00:00+00:00',
      },
    });
    const onSaved = vi.fn();

    render(
      <TaskModal
        open
        onClose={vi.fn()}
        task={routine}
        occurrenceDate="2026-06-26T09:00:00"
        onSaved={onSaved}
        onDeleted={vi.fn()}
      />
    );

    await waitFor(() => expect(reflectionsApi.getAll).toHaveBeenCalledWith({
      reflection_type: 'routine',
      routine_id: 'routine-1',
      routine_occurrence_date: '2026-06-26',
    }));
    fireEvent.click(await screen.findByTestId('task-mark-done-btn'));
    fireEvent.change(await screen.findByTestId('routine-completion-reflection-input'), {
      target: { value: 'Hoy fui constante.' },
    });
    const routineDialog = screen.getByTestId('routine-complete-dialog');
    fireEvent.click(within(routineDialog).getByRole('button', { name: '😊 Positiva' }));
    fireEvent.click(within(routineDialog).getByRole('button', { name: '🙏 Gratitud' }));
    fireEvent.change(within(routineDialog).getByRole('slider'), { target: { value: '5' } });
    fireEvent.click(screen.getByTestId('routine-complete-confirm-btn'));

    await waitFor(() => expect(tasksApi.markRoutineToday).toHaveBeenCalledTimes(1));
    expect(tasksApi.markRoutineToday).toHaveBeenCalledWith('routine-1', expect.objectContaining({
      date: '2026-06-26',
    }));
    expect(reflectionsApi.create).toHaveBeenCalledWith(expect.objectContaining({
      content: 'Hoy fui constante.',
      reflection_type: 'routine',
      routine_id: 'routine-1',
      routine_occurrence_date: '2026-06-26',
      source_item_title: 'Leer',
      source_prompt: 'Leer 10 minutos',
      emotion_snapshot: {
        polarity: 'positive',
        emotion: 'Gratitud',
        intensity: 5,
        note: null,
      },
    }));
    expect(reflectionsApi.create.mock.calls[0][0]).not.toHaveProperty('task_id');
    expect(onSaved).toHaveBeenCalled();
  });

  test('adds another reflection when a completed routine day already has one', async () => {
    const routine = {
      id: 'routine-1',
      title: 'Leer',
      description: 'Leer 10 minutos',
      domain: 'Aprendizaje',
      task_kind: 'routine',
      status: 'in_progress',
      is_complete: false,
      progress_percent: 100,
      routine_completed_dates: ['2026-06-26'],
    };
    reflectionsApi.getAll.mockResolvedValue({
      data: [{
        id: 'routine-reflection:routine-1:2026-06-26',
        reflection_type: 'routine',
        routine_id: 'routine-1',
        routine_occurrence_date: '2026-06-26',
        content: 'Ya escribí esta reflexión.',
        created_at: '2026-06-26T08:00:00+00:00',
      }],
    });
    reflectionsApi.create.mockResolvedValue({
      data: {
        id: 'new-routine-reflection',
        reflection_type: 'routine',
        routine_id: 'routine-1',
        routine_occurrence_date: '2026-06-26',
        content: 'Segundo comentario del día.',
        created_at: '2026-06-26T10:00:00+00:00',
      },
    });

    render(
      <TaskModal
        open
        onClose={vi.fn()}
        task={routine}
        occurrenceDate="2026-06-26T09:00:00"
        onSaved={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    fireEvent.click(await screen.findByTestId('task-mark-done-btn'));
    fireEvent.change(await screen.findByTestId('routine-completion-reflection-input'), {
      target: { value: 'Segundo comentario del día.' },
    });
    fireEvent.click(screen.getByTestId('routine-complete-confirm-btn'));

    await waitFor(() => expect(reflectionsApi.create).toHaveBeenCalledWith(expect.objectContaining({
      content: 'Segundo comentario del día.',
      reflection_type: 'routine',
      routine_id: 'routine-1',
      routine_occurrence_date: '2026-06-26',
    })));
    expect(screen.queryByTestId('routine-completion-reflection-readonly')).not.toBeInTheDocument();
  });

  test('saves a comment from routine editing without marking the occurrence done', async () => {
    const routine = {
      id: 'routine-1',
      title: 'Leer',
      description: 'Leer 10 minutos',
      domain: 'Aprendizaje',
      task_kind: 'routine',
      status: 'in_progress',
      is_complete: false,
      progress_percent: 100,
      date_start: '2026-06-26T09:00:00+00:00',
      date_end: '2026-06-26T09:10:00+00:00',
      recurrence_rule: { type: 'daily', interval: 1 },
      routine_completed_dates: [],
    };
    reflectionsApi.create.mockResolvedValue({
      data: {
        id: 'routine-comment-1',
        reflection_type: 'routine',
        routine_id: 'routine-1',
        routine_occurrence_date: '2026-06-26',
        content: 'Hoy no pude hacerla porque dormí mal.',
        created_at: '2026-06-26T20:00:00+00:00',
      },
    });

    render(
      <TaskModal
        open
        onClose={vi.fn()}
        task={routine}
        occurrenceDate="2026-06-26T09:00:00"
        onSaved={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    fireEvent.change(await screen.findByTestId('task-completion-reflection-input'), {
      target: { value: 'Hoy no pude hacerla porque dormí mal.' },
    });
    fireEvent.click(screen.getByTestId('task-save-btn'));

    await waitFor(() => expect(reflectionsApi.create).toHaveBeenCalledWith(expect.objectContaining({
      content: 'Hoy no pude hacerla porque dormí mal.',
      reflection_type: 'routine',
      routine_id: 'routine-1',
      routine_occurrence_date: '2026-06-26',
    })));
    expect(reflectionsApi.create.mock.calls[0][0]).not.toHaveProperty('emotion_snapshot');
    expect(tasksApi.markRoutineToday).not.toHaveBeenCalled();
  });

  test('disables routine comments for future occurrences', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const futureIso = tomorrow.toISOString();
    const routine = {
      ...task,
      id: 'routine-future',
      task_kind: 'routine',
      status: 'in_progress',
      is_complete: false,
      date_start: futureIso,
      date_end: new Date(tomorrow.getTime() + 10 * 60 * 1000).toISOString(),
      recurrence_rule: { type: 'daily', interval: 1 },
      routine_completed_dates: [],
    };

    render(
      <TaskModal
        open
        onClose={vi.fn()}
        task={routine}
        occurrenceDate={futureIso}
        onSaved={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    expect(await screen.findByTestId('task-completion-reflection-input')).toBeDisabled();
    expect(screen.getByRole('button', { name: '😊 Positiva' })).toBeDisabled();
    expect(screen.getByTestId('routine-future-reflection-help')).toBeInTheDocument();
    expect(screen.queryByTestId('task-mark-done-btn')).not.toBeInTheDocument();
  });

  test('saves emotion and linked ids for a linked mission reflection', async () => {
    const linkedTask = {
      ...task,
      linked_mission_id: 'mission-1',
    };
    missionsApi.getAll.mockResolvedValue({
      data: [{
        id: 'mission-1',
        title: 'Cerrar la semana',
        description: 'Finalizar el informe',
        status: 'active',
      }],
    });
    missionsApi.complete.mockResolvedValue({ data: {} });
    reflectionsApi.create.mockResolvedValue({
      data: {
        id: 'mission-reflection-1',
        reflection_type: 'mission',
        mission_id: 'mission-1',
        task_id: 'task-1',
        content: 'Me siento satisfecho con el cierre.',
      },
    });

    render(
      <TaskModal
        open
        onClose={vi.fn()}
        task={linkedTask}
        onSaved={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    fireEvent.change(await screen.findByTestId('task-completion-reflection-input'), {
      target: { value: 'Me siento satisfecho con el cierre.' },
    });
    fireEvent.click(screen.getByRole('button', { name: '😐 Neutra' }));
    fireEvent.click(screen.getByRole('button', { name: '🧠 Concentración' }));
    fireEvent.click(screen.getByTestId('task-complete-mission-btn'));

    await waitFor(() => expect(reflectionsApi.create).toHaveBeenCalledWith(expect.objectContaining({
      content: 'Me siento satisfecho con el cierre.',
      reflection_type: 'mission',
      task_id: 'task-1',
      mission_id: 'mission-1',
      emotion_snapshot: {
        polarity: 'neutral',
        emotion: 'Concentración',
        intensity: 3,
        note: null,
      },
    })));
  });

  test('allows adding a reflection to a task reopened after completion', async () => {
    const closedTask = {
      ...task,
      status: 'done',
      is_complete: true,
      progress_percent: 100,
      date_start: '2026-06-26T08:00:00+00:00',
      date_end: '2026-06-26T08:15:00+00:00',
    };
    reflectionsApi.create.mockResolvedValue({
      data: {
        id: 'late-task-reflection',
        reflection_type: 'task',
        task_id: 'task-1',
        content: 'Al terminar vi que podía haber empezado antes.',
      },
    });

    render(
      <TaskModal
        open
        onClose={vi.fn()}
        task={closedTask}
        onSaved={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    fireEvent.change(await screen.findByTestId('task-completion-reflection-input'), {
      target: { value: 'Al terminar vi que podía haber empezado antes.' },
    });
    fireEvent.click(screen.getByRole('button', { name: '😐 Neutra' }));
    fireEvent.click(screen.getByRole('button', { name: '🧠 Concentración' }));
    fireEvent.click(screen.getByTestId('task-save-btn'));

    await waitFor(() => expect(reflectionsApi.create).toHaveBeenCalledWith(expect.objectContaining({
      content: 'Al terminar vi que podía haber empezado antes.',
      reflection_type: 'task',
      task_id: 'task-1',
      emotion_snapshot: {
        polarity: 'neutral',
        emotion: 'Concentración',
        intensity: 3,
        note: null,
      },
    })));
    expect(screen.queryByTestId('task-mark-done-btn')).not.toBeInTheDocument();
  });

  test('allows adding a reflection to a linked mission reopened after completion', async () => {
    const closedLinkedTask = {
      ...task,
      linked_mission_id: 'mission-1',
      status: 'done',
      is_complete: true,
      progress_percent: 100,
      date_start: '2026-06-26T08:00:00+00:00',
      date_end: '2026-06-26T08:15:00+00:00',
    };
    missionsApi.getAll.mockResolvedValue({
      data: [{
        id: 'mission-1',
        title: 'Cerrar la semana',
        description: 'Finalizar el informe',
        status: 'done',
      }],
    });
    reflectionsApi.create.mockResolvedValue({
      data: {
        id: 'late-mission-reflection',
        reflection_type: 'mission',
        mission_id: 'mission-1',
        task_id: 'task-1',
        content: 'El cierre me dio claridad.',
      },
    });

    render(
      <TaskModal
        open
        onClose={vi.fn()}
        task={closedLinkedTask}
        onSaved={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    fireEvent.change(await screen.findByTestId('task-completion-reflection-input'), {
      target: { value: 'El cierre me dio claridad.' },
    });
    fireEvent.click(screen.getByTestId('task-save-btn'));

    await waitFor(() => expect(reflectionsApi.create).toHaveBeenCalledWith(expect.objectContaining({
      content: 'El cierre me dio claridad.',
      reflection_type: 'mission',
      task_id: 'task-1',
      mission_id: 'mission-1',
    })));
    expect(screen.queryByTestId('task-complete-mission-btn')).not.toBeInTheDocument();
  });

  test('shows the emotion badge for a stored item reflection', async () => {
    const calmTask = {
      ...task,
      prompt_profile: 'calm',
    };
    reflectionsApi.getAll.mockResolvedValue({
      data: [{
        id: 'task-reflection-1',
        reflection_type: 'task',
        task_id: 'task-1',
        prompt_profile: 'spiritual',
        content: 'Fue un cierre difícil.',
        created_at: '2026-06-26T08:00:00+00:00',
        emotion_snapshot: {
          polarity: 'negative',
          emotion: 'Tristeza',
          intensity: 5,
          note: null,
        },
      }],
    });

    render(
      <TaskModal
        open
        onClose={vi.fn()}
        task={calmTask}
        onSaved={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    expect(await screen.findByText('Tristeza · 5/5')).toBeInTheDocument();
    expect(reflectionsApi.getAll).toHaveBeenCalledWith({
      reflection_type: 'task',
      task_id: 'task-1',
    });
  });
});
