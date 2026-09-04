import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Plus, Trash2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import AiCaptureBox from './AiCaptureBox';
import FoodNameInput from './FoodNameInput';
import NutrientFields from './NutrientFields';
import PortionInput from './PortionInput';
import SaveHealthTemplateFields, { EMPTY_TEMPLATE_CHOICE } from './SaveHealthTemplateFields';
import {
  MEAL_TYPE_LABELS,
  cloneHealthValue,
  formatDateTimeLocal,
  optionalNumber,
  toObservedAt,
} from '../../lib/healthRecords';

function emptyFood() {
  return {
    label: '',
    food_key: null,
    quantity: null,
    unit: 'g',
    grams: null,
    quantity_origin: 'explicit',
    nutrients_per_100: null,
    nutrient_basis_unit: 'g',
    nutrient_source: null,
    assumptions: [],
    household_units: [],
  };
}

function initialFood(food, libraryFoods) {
  const libraryFood = libraryFoods.find((entry) => (
    (food.food_key && [entry.food_key, entry.id].includes(food.food_key)) || entry.label === food.label
  ));
  return {
    ...emptyFood(),
    ...cloneHealthValue(food),
    household_units: libraryFood?.household_units || [],
  };
}

// `quantity_origin` travels as it stands rather than as a fixed 'explicit':
// it is what tells the server whether this meal was typed or proposed, and the
// server derives `capture_method` from it. Everything the person typed by hand
// still starts and stays 'explicit'.
export function nutritionFoodPayload(food) {
  const nutrients = food.nutrients_per_100;
  return {
    label: food.label.trim(),
    food_key: food.food_key || null,
    quantity: food.quantity,
    unit: food.unit,
    grams: food.grams || null,
    quantity_origin: food.quantity_origin || 'explicit',
    nutrients_per_100: nutrients || null,
    nutrient_basis_unit: food.nutrient_basis_unit || 'g',
    nutrient_source: nutrients ? (food.nutrient_source || { source: 'manual' }) : null,
    assumptions: food.assumptions || [],
  };
}

// A number the person corrects is still a number the model put there first, so
// the record says 'user_adjusted' rather than pretending it was typed cold.
function editedFood(food, changes) {
  const merged = { ...food, ...changes };
  return food.quantity_origin === 'llm_estimated'
    ? { ...merged, quantity_origin: 'user_adjusted' }
    : merged;
}

function draftFood(food) {
  const nutrients = food.nutrients_per_100 || null;
  return {
    ...emptyFood(),
    label: food.label || '',
    food_key: food.food_key || null,
    quantity: optionalNumber(food.quantity),
    unit: food.unit || 'g',
    quantity_origin: food.quantity_origin || 'llm_estimated',
    nutrients_per_100: nutrients,
    nutrient_basis_unit: food.nutrient_basis_unit || 'g',
    // The model is the weakest of the four nutrient sources and says so. A
    // figure it guessed must not read like one the person looked up.
    nutrient_source: nutrients ? { source: 'llm_estimated' } : null,
    assumptions: food.assumptions || [],
  };
}

function StepIndicator({ step }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-label={`Paso ${step} de 3`}>
      {['Comida y hora', 'Alimentos', 'Revisión'].map((label, index) => (
        <div key={label} className="flex items-center gap-1.5">
          <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${step === index + 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            {index + 1}
          </span>
          <span className="hidden sm:inline">{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function NutritionEntryForm({
  activity = null,
  template = null,
  observedAt = null,
  foods: libraryFoods = [],
  suggestedGroups = [],
  allowSaveAsTemplate = true,
  saving = false,
  onSubmit,
  onCancel,
}) {
  const initialDetails = activity?.details || template?.details || {};
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(() => ({
    title: activity?.title || template?.title || MEAL_TYPE_LABELS[initialDetails.meal_type] || 'Comida',
    note: activity?.note || '',
    observed_at: formatDateTimeLocal(activity?.observed_at || observedAt),
    meal_type: initialDetails.meal_type || 'breakfast',
    foods: (initialDetails.foods || []).map((food) => initialFood(food, libraryFoods)),
  }));
  const [templateChoice, setTemplateChoice] = useState(EMPTY_TEMPLATE_CHOICE);

  const validFoods = useMemo(() => form.foods.filter((food) => (
    food.label.trim() && food.quantity != null && food.quantity > 0 && food.unit
  )), [form.foods]);

  // Named, because `validFoods` silently drops them. The warning below used to
  // appear only when *nothing* was valid, so a meal with one complete food and
  // three without a portion saved as one food and said nothing about the rest.
  const droppedFoods = useMemo(() => form.foods.filter((food) => (
    food.label.trim() && !(food.quantity != null && food.quantity > 0 && food.unit)
  )).map((food) => food.label.trim()), [form.foods]);

  const updateFood = (index, changes) => setForm((current) => ({
    ...current,
    foods: current.foods.map((food, foodIndex) => (
      foodIndex === index ? editedFood(food, changes) : food
    )),
  }));

  // The draft replaces meal type, title and foods together, because those are
  // the three things one sentence decides. Date and hour are only touched when
  // the text actually said one.
  const applyDraft = (draft) => {
    setForm((current) => ({
      ...current,
      meal_type: draft.meal_type || current.meal_type,
      title: draft.title || current.title,
      note: draft.note || current.note,
      observed_at: /^\d{2}:\d{2}$/.test(draft.observed_time || '')
        ? `${current.observed_at.slice(0, 10)}T${draft.observed_time}`
        : current.observed_at,
      // Through `initialFood` so a food the model matched in the library
      // arrives with the person's own household measures: without them the
      // portion field cannot convert «1 taza» to grams and the meal loses
      // its totals.
      foods: (draft.foods || []).map((food) => initialFood(draftFood(food), libraryFoods)),
    }));
    if ((draft.foods || []).length > 0) setStep(2);
  };

  const submit = async () => {
    const iso = toObservedAt(form.observed_at);
    if (!iso || !form.title.trim() || validFoods.length === 0) return;
    if (allowSaveAsTemplate && templateChoice.enabled && !templateChoice.title.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        payload: {
          activity_type: 'nutrition',
          title: form.title.trim(),
          note: form.note.trim(),
          observed_at: iso,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          details: {
            kind: 'nutrition',
            meal_type: form.meal_type,
            foods: validFoods.map(nutritionFoodPayload),
          },
        },
        templateId: template?.id || null,
        saveAsTemplate: allowSaveAsTemplate && templateChoice.enabled
          ? { title: templateChoice.title, groups: templateChoice.groups }
          : null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onCancel(); }}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto"
        data-testid="nutrition-entry-form"
      >
      <DialogHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <DialogTitle className="text-base">
            {activity ? 'Editar comida' : template ? `Usar plantilla: ${template.title}` : 'Registrar comida'}
          </DialogTitle>
          <StepIndicator step={step} />
        </div>
        {template && (
          <DialogDescription>
            Revisa la fecha, la hora y las cantidades antes de guardar el nuevo registro.
          </DialogDescription>
        )}
      </DialogHeader>
      <div className="space-y-4">
        {/* Above the steps, not inside step 1: applying a draft jumps straight to
            the food list, and the panel explaining which fields were left blank
            has to still be on screen when the person arrives to fill them. */}
        {!activity && !template && step < 3 && (
          <AiCaptureBox surface="nutrition" onApply={applyDraft} disabled={saving || submitting} />
        )}

        {step === 1 && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nutrition-meal-type">Tipo de comida</Label>
                <Select value={form.meal_type} onValueChange={(meal_type) => setForm((value) => ({ ...value, meal_type }))}>
                  <SelectTrigger id="nutrition-meal-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(MEAL_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nutrition-observed-at">Fecha y hora</Label>
                <Input
                  id="nutrition-observed-at"
                  type="datetime-local"
                  value={form.observed_at}
                  onChange={(event) => setForm((value) => ({ ...value, observed_at: event.target.value }))}
                  data-testid="nutrition-observed-at"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nutrition-title">Título</Label>
              <Input
                id="nutrition-title"
                value={form.title}
                onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))}
                maxLength={200}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nutrition-note">Nota (opcional)</Label>
              <Textarea
                id="nutrition-note"
                value={form.note}
                onChange={(event) => setForm((value) => ({ ...value, note: event.target.value }))}
                rows={3}
                maxLength={2000}
              />
            </div>
          </>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {form.foods.map((food, index) => (
              <Card key={`${index}-${food.food_key || 'manual'}`} className="bg-muted/20">
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="grid flex-1 gap-3 sm:grid-cols-2">
                      <FoodNameInput
                        id={`nutrition-food-${index}`}
                        value={food.label}
                        foods={libraryFoods}
                        onChange={(changes) => updateFood(index, changes)}
                      />
                      <PortionInput
                        id={`nutrition-portion-${index}`}
                        portion={food}
                        householdUnits={food.household_units}
                        onChange={(changes) => updateFood(index, changes)}
                      />
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      title="Quitar alimento"
                      onClick={() => setForm((value) => ({
                        ...value,
                        foods: value.foods.filter((_, foodIndex) => foodIndex !== index),
                      }))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <NutrientFields
                    idPrefix={`nutrition-nutrients-${index}`}
                    nutrients={food.nutrients_per_100}
                    basisUnit={food.nutrient_basis_unit}
                    onBasisUnitChange={(nutrient_basis_unit) => updateFood(index, {
                      nutrient_basis_unit,
                      grams: null,
                    })}
                    onNutrientsChange={(nutrients_per_100) => updateFood(index, { nutrients_per_100 })}
                  />
                </CardContent>
              </Card>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => setForm((value) => ({ ...value, foods: [...value.foods, emptyFood()] }))}
              data-testid="nutrition-add-food"
            >
              <Plus className="w-4 h-4 mr-1" /> Añadir alimento
            </Button>
            {form.foods.length > 0 && validFoods.length === 0 && (
              <p className="text-xs text-destructive">Indica el nombre, la cantidad y la unidad de al menos un alimento.</p>
            )}
            {validFoods.length > 0 && droppedFoods.length > 0 && (
              <p className="text-xs text-destructive" data-testid="nutrition-dropped-foods">
                {droppedFoods.length === 1
                  ? `«${droppedFoods[0]}» no se guardará: le falta la cantidad o la unidad.`
                  : `No se guardarán ${droppedFoods.map((label) => `«${label}»`).join(', ')}: les falta la cantidad o la unidad.`}
              </p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{MEAL_TYPE_LABELS[form.meal_type]}</Badge>
                <span className="text-sm font-medium">{form.title}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {validFoods.length} alimentos
                {droppedFoods.length > 0 && ` · ${droppedFoods.length} sin cantidad, que no se guardarán`}
              </p>
              <ul className="space-y-1 text-sm">
                {validFoods.map((food, index) => (
                  <li key={`${food.label}-${index}`}>{food.label} · {food.quantity} {food.unit}</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">Los totales se calcularán al guardar.</p>
            </div>
            {allowSaveAsTemplate && (
              <SaveHealthTemplateFields
                value={templateChoice}
                suggestedGroups={suggestedGroups}
                onChange={(next) => setTemplateChoice({
                  ...next,
                  title: next.enabled && !next.title ? form.title : next.title,
                })}
              />
            )}
          </div>
        )}
      </div>
      <div className="flex justify-between gap-2 pt-2">
        <div>
          {step > 1 && (
            <Button type="button" variant="outline" onClick={() => setStep((value) => value - 1)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Atrás
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
          {step < 3 ? (
            <Button
              type="button"
              onClick={() => setStep((value) => value + 1)}
              disabled={(step === 1 && (!form.title.trim() || !toObservedAt(form.observed_at))) || (step === 2 && validFoods.length === 0)}
            >
              Siguiente <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={submit}
              disabled={saving || submitting || (allowSaveAsTemplate && templateChoice.enabled && !templateChoice.title.trim())}
              data-testid="nutrition-save"
            >
              {saving || submitting ? 'Guardando...' : activity ? 'Guardar cambios' : 'Guardar comida'}
            </Button>
          )}
        </div>
      </div>
      </DialogContent>
    </Dialog>
  );
}
