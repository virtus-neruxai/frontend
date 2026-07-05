export const TASK_DOMAIN_OPTIONS = [
  'Personal',
  'Propósito',
  'Mental',
  'Hábitos',
  'Salud',
  'Relaciones',
  'Social',
  'Trabajo',
  'Finanzas',
  'Aprendizaje',
  'Hogar',
  'Ocio',
  'Otro',
];

const fold = (value) => String(value || '')
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('es');

const DOMAIN_BY_FOLDED_NAME = new Map(
  TASK_DOMAIN_OPTIONS.map((domain) => [fold(domain), domain])
);

export function normalizeTaskDomain(value, fallback = 'Otro') {
  return DOMAIN_BY_FOLDED_NAME.get(fold(value)) || fallback;
}
