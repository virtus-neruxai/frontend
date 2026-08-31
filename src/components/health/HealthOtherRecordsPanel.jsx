import { useMemo } from 'react';
import HealthActivityList from './HealthActivityList';
import { useHealthActivities } from '../../presentation/viewmodels/useHealthActivities';

/**
 * Registros de `health_activities` guardados sin forma estructurada
 * (`details: null`) — de cualquier `activity_type`, no solo de Entrenamiento,
 * que es de donde salió esta pestaña originalmente. Vive en Notas junto a las
 * notas del mentor porque las dos cosas son prosa sin estructura; los
 * registros con forma (comida, sesión, medida) tienen su propia pestaña.
 *
 * Autocontenido a propósito: no comparte estado con Alimentación ni
 * Entrenamiento, igual que `HealthNotesPanel`.
 */
export default function HealthOtherRecordsPanel() {
  const records = useHealthActivities();

  const otherRecords = useMemo(
    () => records.activities.filter((entry) => entry.details == null),
    [records.activities],
  );

  return (
    <HealthActivityList
      activities={otherRecords}
      tasks={records.tasks}
      loading={records.loading}
      saving={records.saving}
      allowCreate={false}
      emptyMessage="No hay registros anteriores sin detalle estructurado."
      onUpdate={records.update}
      onDelete={records.remove}
      onLinkTask={records.linkTask}
      onUnlinkTask={records.unlinkTask}
    />
  );
}
