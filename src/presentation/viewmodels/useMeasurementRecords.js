import { useMemo } from 'react';
import { useHealthActivities } from './useHealthActivities';

/**
 * Composición corporal por su cuenta, sin pasar por Entrenamiento.
 *
 * `MeasurementList` consume un solo objeto `records`, y de los nueve campos que
 * mira solo `measurements` era propio de `useWorkoutRecords` — el resto sale
 * tal cual de `useHealthActivities`. Aquí se deriva igual (espejo de
 * `useWorkoutRecords`) sin arrastrar el `save`/`update` de entrenamiento: una
 * medida no tiene campos derivados que limpiar antes de guardar.
 */
export function useMeasurementRecords() {
  const records = useHealthActivities();

  const measurements = useMemo(
    () => records.activities.filter((entry) => entry.details?.kind === 'measurement'),
    [records.activities],
  );

  return { ...records, measurements };
}
