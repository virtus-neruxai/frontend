import { act, render, screen } from '@testing-library/react';
import CenterView from '../presentation/components/reasoning/CenterView';
import { centerApi } from '../lib/api';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

vi.mock('../lib/api', () => ({
  agentApi: { reviewHandoff: vi.fn() },
  centerApi: { getCenter: vi.fn(), generateCenter: vi.fn(), regenerateCenter: vi.fn(), getCenterJob: vi.fn() },
}));

vi.mock('../presentation/viewmodels/useDrafts', () => ({
  useDrafts: () => ({
    showTaskDraftModal: false,
    showMissionDraftModal: false,
    currentDraftData: null,
    openDraftModal: vi.fn(),
    confirmTaskDraft: vi.fn(),
    rejectTaskDraft: vi.fn(),
    confirmMissionDraft: vi.fn(),
    rejectMissionDraft: vi.fn(),
    setShowTaskDraftModal: vi.fn(),
    setShowMissionDraftModal: vi.fn(),
  }),
}));

vi.mock('../presentation/components/reasoning/GeneralCompassCard', () => ({
  default: () => <div data-testid="general-compass" />,
}));

vi.mock('../presentation/components/reasoning/CenterPanelCard', () => ({
  default: () => null,
}));

vi.mock('../presentation/components/reasoning/FinalReflectionCard', () => ({
  default: () => null,
}));

vi.mock('../components/TaskDraftModal', () => ({ default: () => null }));
vi.mock('../components/MissionDraftModal', () => ({ default: () => null }));

describe('CenterView recovery after service startup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('keeps loading after a transient error and shows the server center after retrying', async () => {
    centerApi.getCenter
      .mockRejectedValueOnce({ response: { status: 503 } })
      .mockResolvedValueOnce({
        data: {
          center: { updated_at: '2026-08-16T09:30:00', panels: [] },
          active_jobs: [],
        },
      });

    render(<CenterView />);
    await act(async () => {});

    expect(screen.getByText('Cargando tu centro…')).toBeInTheDocument();
    expect(screen.queryByText(/Aún no tienes un centro/)).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(centerApi.getCenter).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/Última actualización: 2026-08-16 09:30/)).toBeInTheDocument();
  });

  test('treats a 404 as feature unavailability without a creation CTA or retry loop', async () => {
    centerApi.getCenter.mockRejectedValue({ response: { status: 404 } });

    render(<CenterView />);
    await act(async () => {});
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(screen.getByText('Mi centro no está disponible en este momento.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Crear mi centro/i })).not.toBeInTheDocument();
    expect(centerApi.getCenter).toHaveBeenCalledTimes(1);
  });

  test('cancels a scheduled retry when the view unmounts', async () => {
    centerApi.getCenter.mockRejectedValue({ response: { status: 503 } });

    const { unmount } = render(<CenterView />);
    await act(async () => {});
    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(centerApi.getCenter).toHaveBeenCalledTimes(1);
  });
});
