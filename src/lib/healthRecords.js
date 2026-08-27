export const MEAL_TYPE_LABELS = {
  breakfast: 'Desayuno',
  lunch: 'Comida',
  dinner: 'Cena',
  snack: 'Tentempié',
  other: 'Otro',
};

export const ENDURANCE_MODALITY_LABELS = {
  running: 'Carrera',
  cycling: 'Ciclismo',
  swimming: 'Natación',
  rowing: 'Remo',
  walking: 'Caminata',
  cardio: 'Cardio',
  yoga: 'Yoga',
  mobility: 'Movilidad / estiramientos',
  team_sport: 'Deporte de equipo',
  climbing: 'Escalada',
  martial_arts: 'Artes marciales',
  other: 'Otro',
};

export const REPETITION_UNIT_LABELS = {
  reps: 'repeticiones',
  seconds: 'segundos',
  meters: 'metros',
};

export const LOAD_UNIT_LABELS = {
  kg: 'kg',
  lb: 'lb',
  bodyweight: 'Peso corporal',
  band: 'Banda',
};

export const NUTRIENT_FIELDS = [
  ['energy_kcal', 'Energía', 'kcal'],
  ['protein_g', 'Proteína', 'g'],
  ['carbs_g', 'Carbohidratos', 'g'],
  ['sugars_g', 'Azúcares', 'g'],
  ['fat_g', 'Grasas', 'g'],
  ['saturated_fat_g', 'Grasas saturadas', 'g'],
  ['fiber_g', 'Fibra', 'g'],
  ['sodium_mg', 'Sodio', 'mg'],
];

export function optionalNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

export function inputNumber(value) {
  return value === null || value === undefined ? '' : String(value);
}

export function formatDateTimeLocal(value = null) {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function localDateKey(value = new Date()) {
  return formatDateTimeLocal(value).slice(0, 10);
}

export function dateTimeForSelectedDay(day, current = new Date()) {
  const time = formatDateTimeLocal(current).slice(11, 16) || '12:00';
  return `${day || localDateKey(current)}T${time}`;
}

export function toObservedAt(localValue) {
  const date = new Date(localValue);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function cloneHealthValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

/**
 * Server-owned aggregates never enter create/apply payloads. Keeping this
 * boundary in one helper prevents a selected template from publishing stale
 * totals after the person edits a portion or a set.
 */
export function stripDerivedDetails(details) {
  if (!details) return null;
  const clean = cloneHealthValue(details);
  if (clean.kind === 'nutrition') {
    delete clean.totals;
    delete clean.estimate_quality;
    delete clean.capture_method;
  } else if (clean.kind === 'strength') {
    delete clean.volume;
  } else if (clean.kind === 'endurance') {
    delete clean.pace;
  }
  return clean;
}

export function splitGroups(value) {
  const source = Array.isArray(value) ? value : String(value || '').split(',');
  const seen = new Set();
  return source
    .map((group) => String(group).trim())
    .filter((group) => {
      const key = group.toLocaleLowerCase('es');
      if (!group || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function collectionItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

export function parsePortionInput(value) {
  const text = String(value || '').trim().toLocaleLowerCase('es');
  const match = text.match(/^([0-9]+(?:[.,][0-9]+)?)\s*([^\d\s].*)?$/u);
  if (!match) return { quantity: null, unit: '' };
  let quantity = optionalNumber(match[1]);
  let unit = (match[2] || '').trim();
  if (['gr', 'gr.', 'gramo', 'gramos'].includes(unit)) unit = 'g';
  if (['mililitro', 'mililitros', 'ml.'].includes(unit)) unit = 'ml';
  if (['kilogramo', 'kilogramos', 'kilo', 'kilos', 'kg.'].includes(unit)) unit = 'kg';
  if (['litro', 'litros', 'l.'].includes(unit)) unit = 'l';
  if (unit === 'kg' && quantity != null) {
    quantity *= 1000;
    unit = 'g';
  }
  if (unit === 'l' && quantity != null) {
    quantity *= 1000;
    unit = 'ml';
  }
  return { quantity, unit };
}

export function resolvePortionBaseAmount(
  quantity,
  unit,
  nutrientBasisUnit = 'g',
  householdUnits = [],
) {
  const numeric = optionalNumber(quantity);
  if (numeric == null || numeric <= 0) return null;
  const normalizedUnit = String(unit || '').trim().toLocaleLowerCase('es');
  if (normalizedUnit === nutrientBasisUnit) return numeric;
  if (nutrientBasisUnit === 'g' && ['kg', 'kg.'].includes(normalizedUnit)) return numeric * 1000;
  if (nutrientBasisUnit === 'ml' && ['l', 'l.'].includes(normalizedUnit)) return numeric * 1000;
  const household = householdUnits.find(
    (entry) => entry.name?.trim().toLocaleLowerCase('es') === normalizedUnit,
  );
  // Household mappings currently express mass. They can resolve a g-based
  // nutrient snapshot, but never manufacture a volume or a g<->ml density.
  return household && nutrientBasisUnit === 'g'
    ? numeric * Number(household.grams)
    : null;
}

export function formatHealthValue(value, unit = '') {
  if (value === null || value === undefined) return '—';
  const numeric = Number(value);
  const rendered = Number.isFinite(numeric)
    ? new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(numeric)
    : String(value);
  return unit ? `${rendered} ${unit}` : rendered;
}
