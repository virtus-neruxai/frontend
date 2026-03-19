import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AddEmotionModal } from '../presentation/components/emotions/AddEmotionModal';
import { EditEmotionModal } from '../presentation/components/emotions/EditEmotionModal';
import { tasksApi } from '../lib/api';

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('../lib/api', () => ({
  tasksApi: {
    getAll: jest.fn(),
  },
}));

describe('Emotion task link modals', () => {
  beforeEach(() => {
    tasksApi.getAll.mockReset();
    tasksApi.getAll.mockResolvedValue({
      data: [
        {
          id: 'task-1',
          title: 'Bloque de estudio',
          date_start: '2025-03-15T09:00:00Z',
          all_day: false,
        },
      ],
    });
  });

  it('loads same-day tasks and submits the explicit task link from add modal', async () => {
    const onSubmit = jest.fn().mockResolvedValue(true);
    const onOpenChange = jest.fn();

    render(
      <AddEmotionModal
        open
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Positiva' }));
    fireEvent.click(screen.getByRole('button', { name: /Calma/ }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Si' }));

    const taskOption = await screen.findByTestId('emotion-task-option-task-1');
    fireEvent.click(taskOption);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(tasksApi.getAll).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          task_related: true,
          related_task_id: 'task-1',
        })
      );
    });
  });

  it('allows unlinking a task from edit modal', async () => {
    const onSubmit = jest.fn().mockResolvedValue(true);
    const onDelete = jest.fn().mockResolvedValue(true);

    render(
      <EditEmotionModal
        open
        onOpenChange={jest.fn()}
        onSubmit={onSubmit}
        onDelete={onDelete}
        entry={{
          id: 'emotion-1',
          source: 'user',
          polarity: 'neutral',
          emotion: 'Concentración',
          intensity: 3,
          note: 'Nota',
          occurred_at: '2025-03-15T10:30:00Z',
          task_related: true,
          related_task_id: 'task-1',
        }}
      />
    );

    await screen.findByTestId('emotion-task-link-section');
    fireEvent.click(screen.getByRole('button', { name: 'No' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(tasksApi.getAll).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith(
        'emotion-1',
        expect.objectContaining({
          task_related: false,
          related_task_id: null,
        })
      );
    });
  });
});
