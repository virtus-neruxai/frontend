import { act, renderHook, waitFor } from '@testing-library/react';

const apiMocks = vi.hoisted(() => ({
  statsApi: {
    getSummary: vi.fn(), getTimeseries: vi.fn(), getEvolution: vi.fn(),
    getFrictions: vi.fn(), acknowledgeFriction: vi.fn(),
    getEmotionalPatterns: vi.fn(), acknowledgeEmotionalPattern: vi.fn(),
  },
  characterApi: { getStatsInfo: vi.fn() },
  tasksApi: { getAll: vi.fn() },
  missionsApi: { getAll: vi.fn() },
  profileApi: { getMissionLenses: vi.fn() },
  behaviorsApi: { list: vi.fn(), recordApplication: vi.fn(), setStatus: vi.fn() },
  healthPracticesApi: { list: vi.fn(), recordApplication: vi.fn(), setStatus: vi.fn() },
  healthReportApi: { getPositiveSignals: vi.fn() },
}));

vi.mock('../lib/api', () => apiMocks);

import { useDashboard } from '../presentation/viewmodels/useDashboard';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('dashboard_range', '7');

  apiMocks.statsApi.getSummary.mockResolvedValue({ data: {} });
  apiMocks.statsApi.getTimeseries.mockResolvedValue({ data: [] });
  apiMocks.statsApi.getEvolution.mockResolvedValue({ data: { history: [] } });
  apiMocks.statsApi.getFrictions.mockResolvedValue({ data: {} });
  apiMocks.statsApi.getEmotionalPatterns.mockResolvedValue({ data: {} });
  apiMocks.characterApi.getStatsInfo.mockResolvedValue({ data: {} });
  apiMocks.tasksApi.getAll.mockResolvedValue({ data: [] });
  apiMocks.missionsApi.getAll.mockResolvedValue({ data: [] });
  apiMocks.profileApi.getMissionLenses.mockResolvedValue({ data: null });
  apiMocks.behaviorsApi.list.mockResolvedValue({ data: { behaviors: [] } });
  apiMocks.healthPracticesApi.list.mockResolvedValue({ data: { practices: [], applications: [] } });
  apiMocks.healthReportApi.getPositiveSignals.mockImplementation((days) => Promise.resolve({
    data: { days, total: 0, signals: [] },
  }));
});

test('loads the positive signal snapshot with the global Dashboard range', async () => {
  const { result } = renderHook(() => useDashboard('stoic'));

  await waitFor(() => expect(apiMocks.healthReportApi.getPositiveSignals).toHaveBeenCalledWith(7));
  await waitFor(() => expect(result.current.positiveHealthSignals).toEqual({
    days: 7, total: 0, signals: [],
  }));

  act(() => result.current.setRange('90'));

  await waitFor(() => expect(apiMocks.healthReportApi.getPositiveSignals).toHaveBeenCalledWith(90));
  await waitFor(() => expect(result.current.positiveHealthSignals).toEqual({
    days: 90, total: 0, signals: [],
  }));
});

test('keeps a signal failure local and exposes retry without breaking Dashboard data', async () => {
  apiMocks.healthReportApi.getPositiveSignals.mockRejectedValueOnce(new Error('offline'));
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const { result } = renderHook(() => useDashboard('stoic'));

  await waitFor(() => expect(result.current.positiveHealthSignalsError).toMatch(/no se pudieron cargar/i));
  expect(result.current.summary).toEqual({});

  await act(async () => result.current.refreshPositiveHealthSignals());
  await waitFor(() => expect(result.current.positiveHealthSignals).toEqual({
    days: 7, total: 0, signals: [],
  }));
  expect(result.current.positiveHealthSignalsError).toBe('');
  consoleSpy.mockRestore();
});
