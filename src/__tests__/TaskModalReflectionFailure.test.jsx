import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TaskModal from '../components/TaskModal';
import { tasksApi, missionsApi, reflectionsApi } from '../lib/api';
import { toast } from 'sonner';

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
  },
}));

jest.mock('../lib/api', () => ({
  tasksApi: {
    patch: jest.fn(),
    delete: jest.fn(),
    markRoutineToday: jest.fn(),
  },
  missionsApi: {
    getAll: jest.fn(),
    complete: jest.fn(),
  },
  reflectionsApi: {
    getAll: jest.fn(),
    create: jest.fn(),
  },
}));

beforeAll(() => {
  if (!window.HTMLElement.prototype.hasPointerCapture) {
    window.HTMLElement.prototype.hasPointerCapture = jest.fn();
  }
  if (!window.HTMLElement.prototype.setPointerCapture) {
    window.HTMLElement.prototype.setPointerCapture = jest.fn();
  }
  if (!window.HTMLElement.prototype.releasePointerCapture) {
    window.HTMLElement.prototype.releasePointerCapture = jest.fn();
  }
  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
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
    jest.clearAllMocks();
    reflectionsApi.getAll.mockResolvedValue({ data: [] });
    reflectionsApi.create.mockRejectedValue(new Error('reflection failed'));
    tasksApi.patch.mockResolvedValue({ data: { ...task, status: 'done', is_complete: true } });
    tasksApi.markRoutineToday.mockResolvedValue({ data: {} });
    missionsApi.getAll.mockResolvedValue({ data: [] });
  });

  test('keeps the reflection text visible when saving it fails after task completion', async () => {
    const onSaved = jest.fn();

    render(
      <TaskModal
        open
        onClose={jest.fn()}
        task={task}
        onSaved={onSaved}
        onDeleted={jest.fn()}
      />
    );

    const textarea = await screen.findByTestId('task-completion-reflection-input');
    fireEvent.change(textarea, { target: { value: 'Me costó empezar, pero lo terminé.' } });
    fireEvent.click(screen.getByTestId('task-mark-done-btn'));

    await waitFor(() => expect(reflectionsApi.create).toHaveBeenCalledTimes(1));

    expect(tasksApi.patch).toHaveBeenCalledWith('task-1', {
      is_complete: true,
      progress_percent: 100,
      status: 'done',
    });
    expect(onSaved).not.toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalledWith('La acción se completó, pero no se pudo guardar la reflexión');
    expect(screen.getByTestId('task-completion-reflection-input')).toHaveValue('Me costó empezar, pero lo terminé.');
    expect(screen.getByTestId('task-reflection-retry-btn')).toBeInTheDocument();
  });

  test('deletes a task without asking for a deletion reason', async () => {
    const onDeleted = jest.fn();
    const promptSpy = jest.spyOn(window, 'prompt').mockImplementation(() => 'unused');
    tasksApi.delete.mockResolvedValue({});

    render(
      <TaskModal
        open
        onClose={jest.fn()}
        task={task}
        onSaved={jest.fn()}
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
    const onSaved = jest.fn();

    render(
      <TaskModal
        open
        onClose={jest.fn()}
        task={routine}
        occurrenceDate="2026-06-26T09:00:00"
        onSaved={onSaved}
        onDeleted={jest.fn()}
      />
    );

    fireEvent.click(await screen.findByTestId('task-mark-done-btn'));
    fireEvent.change(await screen.findByTestId('routine-completion-reflection-input'), {
      target: { value: 'Hoy fui constante.' },
    });
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
    }));
    expect(reflectionsApi.create.mock.calls[0][0]).not.toHaveProperty('task_id');
    expect(onSaved).toHaveBeenCalled();
  });

  test('shows an existing routine day reflection as readonly', async () => {
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

    render(
      <TaskModal
        open
        onClose={jest.fn()}
        task={routine}
        occurrenceDate="2026-06-27T09:00:00"
        onSaved={jest.fn()}
        onDeleted={jest.fn()}
      />
    );

    fireEvent.click(await screen.findByTestId('task-mark-done-btn'));
    fireEvent.change(await screen.findByTestId('routine-completion-at-input'), {
      target: { value: '2026-06-26T09:00' },
    });

    expect(await screen.findByTestId('routine-completion-reflection-readonly')).toHaveValue('Ya escribí esta reflexión.');
    expect(screen.getByTestId('routine-complete-confirm-btn')).toBeDisabled();
  });
});
