/**
 * The health goal: prose the product never parses, plus the dimensions that
 * decide which missing measurement gets asked for first.
 *
 * The failure worth guarding is drift towards a target. A field that accepted a
 * number, a default goal offered to a new account, or a saved statement the UI
 * started measuring against would each turn a declared direction into a score —
 * which is the one thing this surface is built not to keep.
 */
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HealthGoalSettings from '../components/health/HealthGoalSettings';
import { useHealthGoal } from '../presentation/viewmodels/useHealthGoal';
import { healthGoalApi } from '../lib/api';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock('../lib/api', () => ({
  healthGoalApi: { get: vi.fn(), set: vi.fn(), clear: vi.fn() },
}));

const GOAL = {
  id: 'health_goal:demo',
  user_id: 'demo',
  statement: 'Reducir grasa corporal conservando masa muscular',
  tracked_dimensions: ['composition', 'activity'],
  created_at: '2026-08-20T10:00:00+00:00',
  updated_at: '2026-08-20T10:00:00+00:00',
  revision: 2,
};

beforeEach(() => {
  vi.clearAllMocks();
  healthGoalApi.get.mockResolvedValue({ data: null });
});

describe('useHealthGoal', () => {
  test('no declared goal is null, not an error state', async () => {
    const { result } = renderHook(() => useHealthGoal());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.goal).toBeNull();
  });

  test('saving sends the revision it loaded, so a stale tab conflicts', async () => {
    healthGoalApi.get.mockResolvedValue({ data: GOAL });
    healthGoalApi.set.mockResolvedValue({ data: { ...GOAL, revision: 3 } });

    const { result } = renderHook(() => useHealthGoal());
    await waitFor(() => expect(result.current.goal?.revision).toBe(2));
    await act(async () => { await result.current.save('Otra cosa', ['recovery']); });

    expect(healthGoalApi.set).toHaveBeenCalledWith({
      statement: 'Otra cosa',
      tracked_dimensions: ['recovery'],
      expected_revision: 2,
    });
  });

  test('a first save from a client that never loaded one claims no revision', async () => {
    healthGoalApi.set.mockResolvedValue({ data: GOAL });
    const { result } = renderHook(() => useHealthGoal());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.save('Primera', []); });

    expect(healthGoalApi.set).toHaveBeenCalledWith(
      expect.objectContaining({ expected_revision: null }),
    );
  });

  test('a 409 reloads instead of retrying over whatever was written elsewhere', async () => {
    healthGoalApi.get.mockResolvedValue({ data: GOAL });
    healthGoalApi.set.mockRejectedValue({ response: { status: 409 } });

    const { result } = renderHook(() => useHealthGoal());
    await waitFor(() => expect(result.current.goal?.revision).toBe(2));
    healthGoalApi.get.mockClear();

    await act(async () => { await result.current.save('Tercera', []); });

    expect(healthGoalApi.get).toHaveBeenCalledTimes(1);
    expect(healthGoalApi.set).toHaveBeenCalledTimes(1);
  });
});

describe('HealthGoalSettings', () => {
  test('a new account is invited to declare one, never given a default', async () => {
    render(<HealthGoalSettings />);
    await waitFor(() => expect(screen.getByTestId('health-goal')).toBeInTheDocument());

    expect(screen.getByText(/Aún no has declarado ninguno/i)).toBeInTheDocument();
    expect(screen.getByTestId('health-goal-edit')).toHaveTextContent('Declarar objetivo');
  });

  test('an existing goal is shown verbatim with the dimensions it tracks', async () => {
    healthGoalApi.get.mockResolvedValue({ data: GOAL });
    render(<HealthGoalSettings />);

    await waitFor(() => expect(screen.getByText(GOAL.statement)).toBeInTheDocument());
    // Awaited too, not asserted directly: the statement and the tracked list
    // arrive from the same fetch but paint on separate commits under load, so
    // a bare assertion here fails intermittently in a full run and passes
    // alone — which reads as a broken component rather than a racy test.
    await waitFor(() =>
      expect(screen.getByText(/Composición · Actividad/)).toBeInTheDocument());
  });

  test('the form carries no field for a number, a date or a progress bar', async () => {
    render(<HealthGoalSettings />);
    await waitFor(() => expect(screen.getByTestId('health-goal-edit')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('health-goal-edit'));

    expect(screen.getByTestId('health-goal-form')).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(document.querySelector('input[type="number"]')).toBeNull();
    expect(document.querySelector('input[type="date"]')).toBeNull();
    // El seguimiento sí lee el objetivo, así que el copy ya no puede prometer
    // que nadie lo mira — lo que sigue prohibido es puntuarlo.
    expect(screen.getByText(/no es una meta que se puntúe/i)).toBeInTheDocument();
  });

  test('saving sends the statement and the checked dimensions', async () => {
    healthGoalApi.set.mockResolvedValue({ data: GOAL });
    render(<HealthGoalSettings />);
    await waitFor(() => expect(screen.getByTestId('health-goal-edit')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('health-goal-edit'));

    await userEvent.type(screen.getByLabelText(/hacia dónde vas/i), 'Dormir mejor');
    await userEvent.click(screen.getByTestId('health-goal-dimension-recovery'));
    await userEvent.click(screen.getByTestId('health-goal-save'));

    await waitFor(() => expect(healthGoalApi.set).toHaveBeenCalledWith(
      expect.objectContaining({
        statement: 'Dormir mejor',
        tracked_dimensions: ['recovery'],
      }),
    ));
  });

  test('checking no dimension is a valid goal, not an incomplete form', async () => {
    healthGoalApi.set.mockResolvedValue({ data: GOAL });
    render(<HealthGoalSettings />);
    await waitFor(() => expect(screen.getByTestId('health-goal-edit')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('health-goal-edit'));

    await userEvent.type(screen.getByLabelText(/hacia dónde vas/i), 'Estar mejor');
    expect(screen.getByTestId('health-goal-save')).not.toBeDisabled();

    await userEvent.click(screen.getByTestId('health-goal-save'));
    await waitFor(() => expect(healthGoalApi.set).toHaveBeenCalledWith(
      expect.objectContaining({ tracked_dimensions: [] }),
    ));
  });

  test('an empty statement cannot be saved', async () => {
    render(<HealthGoalSettings />);
    await waitFor(() => expect(screen.getByTestId('health-goal-edit')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('health-goal-edit'));

    expect(screen.getByTestId('health-goal-save')).toBeDisabled();
  });
});
