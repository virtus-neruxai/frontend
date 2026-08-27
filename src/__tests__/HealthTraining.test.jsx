import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ExerciseSetLogger from '../components/health/ExerciseSetLogger';
import WorkoutSessionForm from '../components/health/WorkoutSessionForm';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

const recordedSet = {
  repetitions: 8,
  repetitions_unit: 'reps',
  load: 50,
  load_unit: 'kg',
  rir: 2,
  rest_seconds: 90,
  note: '',
};

test('«Serie» repite la anterior para registrar la siguiente de un toque', () => {
  function Harness() {
    const [sets, setSets] = useState([recordedSet]);
    return <ExerciseSetLogger sets={sets} onChange={setSets} />;
  }

  render(<Harness />);
  fireEvent.click(screen.getByTestId('exercise-add-set'));

  expect(screen.getByTestId('exercise-set-repetitions-1')).toHaveValue(8);
  expect(screen.getByTestId('exercise-set-load-1')).toHaveValue(50);
  expect(screen.getAllByText('2')).not.toHaveLength(0);
});

test('una serie con repeticiones cero y sin carga sigue vacía y no habilita el guardado', () => {
  render(<WorkoutSessionForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

  fireEvent.click(screen.getByTestId('workout-add-exercise'));
  fireEvent.change(screen.getByLabelText('Ejercicio'), { target: { value: 'Sentadilla' } });
  fireEvent.click(screen.getByTestId('exercise-add-set'));
  fireEvent.change(screen.getByTestId('workout-exercise-0-set-repetitions-0'), {
    target: { value: '0' },
  });

  expect(screen.getByText('Esta serie vacía no se guardará.')).toBeInTheDocument();
  expect(screen.getByTestId('workout-save')).toBeDisabled();

  fireEvent.change(screen.getByTestId('workout-exercise-0-set-repetitions-0'), {
    target: { value: '8' },
  });
  expect(screen.getByTestId('workout-save')).toBeEnabled();
});

test('normaliza duración y distancia no positivas como ausencia antes del POST', async () => {
  const onSubmit = vi.fn().mockResolvedValue({ id: 'run-1' });
  const activity = {
    id: 'run-1',
    revision: 2,
    activity_type: 'training',
    title: 'Carrera suave',
    note: '',
    observed_at: '2026-08-27T08:00:00+02:00',
    details: {
      kind: 'endurance',
      modality: 'running',
      distance_m: 5000,
      duration_seconds: 1800,
      elevation_gain_m: null,
      avg_heart_rate: null,
      energy_expenditure_kcal: null,
      perceived_exertion: null,
      pain_or_discomfort: null,
      pace: { seconds_per_km: 360, km_h: 10 },
    },
  };

  render(
    <WorkoutSessionForm
      activity={activity}
      allowSaveAsTemplate={false}
      onSubmit={onSubmit}
      onCancel={vi.fn()}
    />,
  );

  fireEvent.change(screen.getByLabelText('Distancia (km)'), { target: { value: '0' } });
  fireEvent.change(screen.getByLabelText('Duración (min)'), { target: { value: '0' } });
  fireEvent.click(screen.getByTestId('workout-save'));

  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  expect(onSubmit.mock.calls[0][0].payload.details).toMatchObject({
    kind: 'endurance',
    distance_m: null,
    duration_seconds: null,
  });
});

test('cada ejercicio genera ids propios y la captura no celebra récords ni rachas', () => {
  const { container } = render(<WorkoutSessionForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

  fireEvent.click(screen.getByTestId('workout-add-exercise'));
  fireEvent.click(screen.getByTestId('workout-add-exercise'));
  screen.getAllByTestId('exercise-add-set').forEach((button) => fireEvent.click(button));

  const quantityInputs = screen.getAllByLabelText('Cantidad');
  expect(quantityInputs).toHaveLength(2);
  expect(quantityInputs[0].id).not.toBe(quantityInputs[1].id);
  expect(container).not.toHaveTextContent(/nuevo récord|racha|confeti/i);
});
