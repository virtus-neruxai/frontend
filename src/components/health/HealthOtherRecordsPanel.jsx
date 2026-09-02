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
 *
 * Es el único sitio de la app donde se puede crear un registro sin
 * estructura (`recovery`, `general_health`, `holistic`): Alimentación y
 * Entrenamiento crean con el tipo fijo a `nutrition`/`training`.
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
      onCreate={records.create}
      emptyMessage="No hay registros anteriores sin detalle estructurado."
      onUpdate={records.update}
      onDelete={records.remove}
      onLinkTask={records.linkTask}
      onUnlinkTask={records.unlinkTask}
    />
  );
}
