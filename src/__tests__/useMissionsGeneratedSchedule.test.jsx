import { act, renderHook } from '@testing-library/react';
import { useMissions } from '../presentation/viewmodels/useMissions';
import { missionsApi } from '../lib/api';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('../lib/api', () => ({
  missionsApi: { getAll: vi.fn(), generate: vi.fn() },
  reflectionsApi: {},
  statsApi: {},
  tasksApi: {},
  notificationsApi: {},
}));

const hourOf = (mission) => new Date(mission.scheduled_datetime).getHours();

/**
 * The hour used to be positional (14 + index), so a mission the engine wrote as
 * "Noche de recuperación" was scheduled for the early afternoon. MissionEngine
 * now states the band on the draft; the positional rule is the fallback for
 * missions that fit any hour.
 */
describe('useMissions — the hour a generated mission gets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    missionsApi.getAll.mockResolvedValue({ data: [] });
  });

  test('a mission that names its moment is scheduled in that band', async () => {
    missionsApi.generate.mockResolvedValue({
      data: { drafts: [{ title: 'Noche de recuperación', preferred_time_of_day: 'evening' }] },
    });

    const { result } = renderHook(() => useMissions());
    let generated;
    await act(async () => {
      generated = await result.current.generateMissions();
    });

    expect(hourOf(generated[0])).toBe(19);
  });

  test('a mission with no stated moment keeps the positional hour', async () => {
    missionsApi.generate.mockResolvedValue({
      data: { drafts: [{ title: 'Suelta una expectativa' }, { title: 'Revisa un límite' }] },
    });

    const { result } = renderHook(() => useMissions());
    let generated;
    await act(async () => {
      generated = await result.current.generateMissions();
    });

    expect(generated.map(hourOf)).toEqual([14, 15]);
  });

  test('two missions in the same band do not stack on the same slot', async () => {
    missionsApi.generate.mockResolvedValue({
      data: {
        drafts: [
          { title: 'Cierra el día', preferred_time_of_day: 'evening' },
          { title: 'Apaga pantallas', preferred_time_of_day: 'evening' },
        ],
      },
    });

    const { result } = renderHook(() => useMissions());
    let generated;
    await act(async () => {
      generated = await result.current.generateMissions();
    });

    expect(generated.map(hourOf)).toEqual([19, 20]);
  });

  test('a band the engine never defines falls back instead of travelling on', async () => {
    missionsApi.generate.mockResolvedValue({
      data: { drafts: [{ title: 'Algo', preferred_time_of_day: 'madrugada' }] },
    });

    const { result } = renderHook(() => useMissions());
    let generated;
    await act(async () => {
      generated = await result.current.generateMissions();
    });

    expect(hourOf(generated[0])).toBe(14);
  });
});
