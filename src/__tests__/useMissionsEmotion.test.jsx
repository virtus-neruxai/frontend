import { act, renderHook } from '@testing-library/react';
import { useMissions } from '../presentation/viewmodels/useMissions';
import { missionsApi, reflectionsApi } from '../lib/api';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../lib/api', () => ({
  missionsApi: {
    getAll: vi.fn(),
    complete: vi.fn(),
  },
  reflectionsApi: {
    create: vi.fn(),
  },
  statsApi: {},
  tasksApi: {},
}));

describe('useMissions completion reflections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    missionsApi.getAll.mockResolvedValue({ data: [] });
    missionsApi.complete.mockResolvedValue({ data: { new_stats: { discipline: 1 } } });
    reflectionsApi.create.mockResolvedValue({ data: { id: 'reflection-1' } });
  });

  test('persists the structured emotion for an independent mission reflection', async () => {
    const { result } = renderHook(() => useMissions());
    const emotionSnapshot = {
      polarity: 'positive',
      emotion: 'Confianza',
      intensity: 4,
    };

    await act(async () => {
      await result.current.completeMission('mission-1', true, {
        reflection: 'La terminé con más seguridad.',
        emotionSnapshot,
        reason: null,
        missionContext: {
          title: 'Dar el primer paso',
          description: 'Completar una acción concreta',
          linked_task_id: 'task-1',
        },
      });
    });

    expect(missionsApi.complete).toHaveBeenCalledWith('mission-1', { success: true, reason: null });
    expect(reflectionsApi.create).toHaveBeenCalledWith({
      content: 'La terminé con más seguridad.',
      reflection_type: 'mission',
      mission_id: 'mission-1',
      task_id: 'task-1',
      source_item_title: 'Dar el primer paso',
      source_prompt: 'Completar una acción concreta',
      emotion_snapshot: emotionSnapshot,
    });
  });

  test('does not create a reflection when an emotion has no text', async () => {
    const { result } = renderHook(() => useMissions());

    await act(async () => {
      await result.current.completeMission('mission-1', true, {
        reflection: '   ',
        emotionSnapshot: {
          polarity: 'negative',
          emotion: 'Frustración',
          intensity: 4,
        },
        missionContext: { title: 'Misión sin comentario' },
      });
    });

    expect(missionsApi.complete).toHaveBeenCalledTimes(1);
    expect(reflectionsApi.create).not.toHaveBeenCalled();
  });
});
