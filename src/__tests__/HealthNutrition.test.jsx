import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NutritionEntryForm from '../components/health/NutritionEntryForm';
import NutritionTab from '../components/health/NutritionTab';
import PortionInput from '../components/health/PortionInput';
import { useHealthLibrary } from '../presentation/viewmodels/useHealthLibrary';
import { useNutritionRecords } from '../presentation/viewmodels/useNutritionRecords';
import {
  parsePortionInput,
  resolvePortionBaseAmount,
} from '../lib/healthRecords';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock('../presentation/viewmodels/useNutritionRecords', () => ({
  useNutritionRecords: vi.fn(),
}));

vi.mock('../presentation/viewmodels/useHealthLibrary', () => ({
  useHealthLibrary: vi.fn(),
}));

vi.mock('../components/health/HealthTemplateBrowser', () => ({
  default: () => <div data-testid="nutrition-template-browser" />,
}));

function libraryState() {
  return {
    entries: [],
    groups: [],
    loading: false,
    saving: false,
    reload: vi.fn().mockResolvedValue(undefined),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
}

function nutritionState(overrides = {}) {
  return {
    mealsForDay: [],
    history: [],
    tasks: [],
    loading: false,
    saving: false,
    summaryLoading: false,
    daySummary: null,
    save: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    linkTask: vi.fn(),
    unlinkTask: vi.fn(),
    reloadSummary: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useHealthLibrary.mockImplementation(() => libraryState());
  useNutritionRecords.mockReturnValue(nutritionState());
});

test('registra una comida manual con varios alimentos como un único payload estructurado', async () => {
  const onSubmit = vi.fn().mockResolvedValue({ id: 'meal-1' });
  render(<NutritionEntryForm onSubmit={onSubmit} onCancel={vi.fn()} />);

  fireEvent.click(screen.getByRole('button', { name: /siguiente/i }));
  fireEvent.click(screen.getByTestId('nutrition-add-food'));
  fireEvent.change(screen.getByLabelText('Alimento'), { target: { value: 'Avena' } });
  fireEvent.change(screen.getByLabelText('Cantidad y unidad'), { target: { value: '80 g' } });

  fireEvent.click(screen.getByTestId('nutrition-add-food'));
  const foodInputs = screen.getAllByLabelText('Alimento');
  const portionInputs = screen.getAllByLabelText('Cantidad y unidad');
  fireEvent.change(foodInputs[1], { target: { value: 'Yogur natural' } });
  fireEvent.change(portionInputs[1], { target: { value: '250 ml' } });

  fireEvent.click(screen.getByRole('button', { name: /siguiente/i }));
  fireEvent.click(screen.getByTestId('nutrition-save'));

  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  const submission = onSubmit.mock.calls[0][0];
  expect(submission.payload).toMatchObject({
    activity_type: 'nutrition',
    details: {
      kind: 'nutrition',
      meal_type: 'breakfast',
      foods: [
        { label: 'Avena', quantity: 80, unit: 'g', grams: 80 },
        { label: 'Yogur natural', quantity: 250, unit: 'ml', grams: null },
      ],
    },
  });
  expect(submission.saveAsTemplate).toBeNull();
});

test('un nutriente ausente se muestra como ausencia y nunca como cero', () => {
  useNutritionRecords.mockReturnValue(nutritionState({
    daySummary: {
      date: '2026-08-27',
      has_nutrition: true,
      nutrition_totals: {
        energy_kcal: 420,
        protein_g: null,
        carbs_g: 51,
        sugars_g: null,
        fat_g: 13,
        saturated_fat_g: null,
        fiber_g: null,
        sodium_mg: null,
      },
    },
  }));

  render(<NutritionTab />);

  expect(screen.getByTestId('nutrition-total-energy_kcal')).toHaveTextContent('420 kcal');
  expect(screen.getByTestId('nutrition-total-protein_g')).toHaveTextContent('—');
  expect(screen.queryByText(/^0 g$/)).not.toBeInTheDocument();
});

test('permite escribir una coma decimal sin borrar el valor transitorio', () => {
  function Harness() {
    const [portion, setPortion] = useState({
      quantity: null,
      unit: '',
      grams: null,
      nutrient_basis_unit: 'g',
    });
    return <PortionInput id="portion-decimal" portion={portion} onChange={(changes) => setPortion((value) => ({ ...value, ...changes }))} />;
  }

  render(<Harness />);
  const input = screen.getByLabelText('Cantidad y unidad');
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: '1' } });
  fireEvent.change(input, { target: { value: '1,' } });
  expect(input).toHaveValue('1,');
  fireEvent.change(input, { target: { value: '1,5' } });
  expect(input).toHaveValue('1,5');
  fireEvent.change(input, { target: { value: '1,5 kg' } });
  expect(input).toHaveValue('1,5 kg');
  fireEvent.blur(input);
  expect(input).toHaveValue('1500 g');
});

test('refleja aliases métricos y no inventa densidad para unidades domésticas o volumen', () => {
  expect(parsePortionInput('1,5 kg.')).toEqual({ quantity: 1500, unit: 'g' });
  expect(parsePortionInput('2 l')).toEqual({ quantity: 2000, unit: 'ml' });
  expect(resolvePortionBaseAmount(250, 'ml', 'g', [])).toBeNull();
  expect(resolvePortionBaseAmount(2, 'taza', 'g', [])).toBeNull();
  expect(resolvePortionBaseAmount(2, 'taza', 'g', [{ name: 'taza', grams: 120 }])).toBe(240);
  expect(resolvePortionBaseAmount(1, 'l', 'ml', [])).toBe(1000);
});
