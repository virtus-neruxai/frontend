/**
 * Recorded health activity — the CRUD hook and the list it feeds.
 *
 * Two structural promises this fixes: linking a task to a record is always an
 * explicit, separate write onto the task (never something `create` does on
 * its own — see backend/routes/health_activities.py's "never creates a task"
 * docstring), and a sparse history renders only what exists, with nothing
 * standing in for the days that have no row.
 */
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { useHealthActivities } from '../presentation/viewmodels/useHealthActivities';
import HealthActivityList from '../components/health/HealthActivityList';
import { healthActivitiesApi, tasksApi } from '../lib/api';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock('../lib/api', () => ({
  healthActivitiesApi: {
    getAll: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  tasksApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    patch: vi.fn(),
  },
}));

const activity = (overrides = {}) => ({
  id: 'act-1',
  activity_type: 'training',
  title: 'Entreno de pierna',
  note: '',
  observed_at: '2026-08-20T10:00:00+00:00',
  linked_task_count: 0,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  healthActivitiesApi.getAll.mockResolvedValue({ data: [] });
  tasksApi.getAll.mockResolvedValue({ data: [] });
});

describe('useHealthActivities', () => {
  test('creating a record never creates a task or a draft', async () => {
    healthActivitiesApi.create.mockResolvedValue({ data: activity() });
    const { result } = renderHook(() => useHealthActivities());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.create({ activity_type: 'training', title: 'Entreno de pierna' });
    });

    expect(healthActivitiesApi.create).toHaveBeenCalledTimes(1);
    expect(tasksApi.create).not.toHaveBeenCalled();
    expect(tasksApi.patch).not.toHaveBeenCalled();
  });

  test('linking a task is a separate, explicit call naming both ids', async () => {
    tasksApi.getAll.mockResolvedValue({ data: [{ id: 'task-1', title: 'Rutina de piernas' }] });
    healthActivitiesApi.getAll.mockResolvedValue({ data: [activity()] });
    tasksApi.patch.mockResolvedValue({
      data: { id: 'task-1', title: 'Rutina de piernas', health_activity_id: 'act-1', health_activity_type: 'training' },
    });

    const { result } = renderHook(() => useHealthActivities());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Nothing links on its own after load.
    expect(tasksApi.patch).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.linkTask(activity(), 'task-1');
    });

    expect(tasksApi.patch).toHaveBeenCalledWith('task-1', {
      health_activity_id: 'act-1',
      health_activity_type: 'training',
    });
  });

  test('unlinking clears both fields on the task explicitly', async () => {
    tasksApi.patch.mockResolvedValue({
      data: { id: 'task-1', title: 'Rutina de piernas', health_activity_id: null, health_activity_type: null },
    });
    const { result } = renderHook(() => useHealthActivities());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.unlinkTask({ id: 'task-1', health_activity_id: 'act-1' });
    });

    expect(tasksApi.patch).toHaveBeenCalledWith('task-1', {
      health_activity_id: null,
      health_activity_type: null,
    });
  });
});

describe('HealthActivityList', () => {
  test('a sparse history renders exactly what was recorded, no zero-filled gaps', () => {
    // Two records five days apart — nothing should render for the three
    // days with no row, and no "0" performance figure should appear either.
    const activities = [
      activity({ id: 'act-1', title: 'Entreno de pierna', observed_at: '2026-08-20T10:00:00+00:00' }),
      activity({ id: 'act-2', title: 'Comida', activity_type: 'nutrition', observed_at: '2026-08-15T09:00:00+00:00' }),
    ];

    render(
      <HealthActivityList
        activities={activities}
        tasks={[]}
        loading={false}
        saving={false}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onLinkTask={vi.fn()}
        onUnlinkTask={vi.fn()}
      />
    );

    expect(screen.getAllByTestId(/^health-activity-row-/)).toHaveLength(2);
    expect(screen.getByText('Entreno de pierna')).toBeInTheDocument();
    expect(screen.getByText('Comida')).toBeInTheDocument();
    // No synthetic "no observado" / zero-count row for the unrecorded days.
    expect(screen.queryByText(/no observad/i)).not.toBeInTheDocument();
  });

  test('empty history reads as "nothing recorded yet", not as zero', () => {
    render(
      <HealthActivityList
        activities={[]}
        tasks={[]}
        loading={false}
        saving={false}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onLinkTask={vi.fn()}
        onUnlinkTask={vi.fn()}
      />
    );

    expect(screen.getByText(/Todavía no has registrado ninguna actividad/)).toBeInTheDocument();
    expect(screen.queryByText(/^0$/)).not.toBeInTheDocument();
  });

  test('linking reuses the same "Activos" picker as Tareas/Calendario, filters included', async () => {
    const onLinkTask = vi.fn();
    const tasks = [
      { id: 'task-1', title: 'Rutina de piernas', status: 'todo', date_start: '2026-08-21T09:00:00+00:00' },
      { id: 'task-2', title: 'Ya enlazada', status: 'todo', health_activity_id: 'act-1' },
    ];

    render(
      <HealthActivityList
        activities={[activity()]}
        tasks={tasks}
        loading={false}
        saving={false}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onLinkTask={onLinkTask}
        onUnlinkTask={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('health-activity-link-open-act-1'));

    // The dialog is ActiveItemsPanel, not a bare dropdown: its type filter is there.
    expect(await screen.findByText('Activos')).toBeInTheDocument();
    expect(screen.getByText('Rutina de piernas')).toBeInTheDocument();
    // Already-linked tasks aren't offered again.
    expect(screen.queryByText('Ya enlazada')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Rutina de piernas'));

    expect(onLinkTask).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'act-1' }),
      'task-1'
    );
  });
});
