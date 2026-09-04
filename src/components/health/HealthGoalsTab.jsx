import { useState } from 'react';
import CollapsibleSection from './CollapsibleSection';
import HealthGoalFollowupView from './HealthGoalFollowupView';
import HealthGoalSettings from './HealthGoalSettings';
import MeasurementList from './MeasurementList';
import { useMeasurementRecords } from '../../presentation/viewmodels/useMeasurementRecords';

/**
 * «Objetivos»: hacia dónde va la persona, qué dice su cuerpo y qué lee el
 * mentor de lo uno contra lo otro.
 *
 * El objetivo vivía colgando del Informe de Salud y la composición corporal
 * colgando de Entrenamiento — el primero porque el informe era lo único que lo
 * leía, la segunda porque `useWorkoutRecords` ya traía las medidas de paso. Ni
 * uno ni otro pertenecen ahí: los dos son el objetivo y su medida, y aquí están
 * juntos con el seguimiento que los relaciona.
 */
export default function HealthGoalsTab() {
  const records = useMeasurementRecords();
  // El objetivo y el seguimiento tienen cada uno su propia copia del objetivo
  // (dos hooks independientes). Este contador es el aviso de uno al otro:
  // declararlo arriba habilita el seguimiento sin recargar la página.
  const [goalVersion, setGoalVersion] = useState(0);

  return (
    <div className="space-y-6" data-testid="health-goals-tab">
      <HealthGoalSettings onChanged={() => setGoalVersion((version) => version + 1)} />

      <CollapsibleSection
        title="Composición corporal"
        description="Peso, cintura o porcentaje de grasa: lo que mide el objetivo."
        testId="goals-composition"
      >
        <MeasurementList records={records} />
      </CollapsibleSection>

      <HealthGoalFollowupView goalVersion={goalVersion} />
    </div>
  );
}
