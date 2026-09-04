// Los rangos de los informes (Razonado, de Salud y Seguimiento) y el filtro de
// su historial. Vivía copiado en cada pestaña, con la misma tabla de opciones y
// la misma función de etiqueta escritas tres veces.
//
// El filtro del historial es una cosa distinta del rango con el que se genera:
// abrir el historial enseña TODO lo generado, y solo al elegir un rango se
// recorta. Por eso `HISTORY_ALL` es el valor por defecto y no un rango más.

export const REPORT_RANGE_OPTIONS = [
  { value: 7, label: 'Última semana' },
  { value: 14, label: 'Últimas 2 semanas' },
  { value: 30, label: 'Último mes' },
];

export const HISTORY_ALL = 'all';

export const HISTORY_RANGE_OPTIONS = [
  { value: HISTORY_ALL, label: 'Todos' },
  ...REPORT_RANGE_OPTIONS,
];

export function reportRangeLabel(daysBack) {
  const numeric = Number(daysBack) || 14;
  return (
    REPORT_RANGE_OPTIONS.find((option) => option.value === numeric)?.label
    || `Últimos ${numeric} días`
  );
}

export function historyRangeLabel(value) {
  return value === HISTORY_ALL ? 'Todos' : reportRangeLabel(value);
}

/** `HISTORY_ALL` deja pasar todo; un rango deja solo los informes de ese rango. */
export function filterHistoryByRange(items, value) {
  if (value === HISTORY_ALL) return items;
  const numeric = Number(value);
  return items.filter((item) => (Number(item.days_back) || 14) === numeric);
}
