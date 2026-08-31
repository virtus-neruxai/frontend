import { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { BodyCheckinSection } from '../../presentation/components/character/bodycheckin/BodyCheckinSection';
import HealthNotesPanel from './HealthNotesPanel';
import HealthOtherRecordsPanel from './HealthOtherRecordsPanel';
import NutritionTab from './NutritionTab';
import TrainingTab from './TrainingTab';
import { useCharacter } from '../../presentation/viewmodels/useCharacter';
import { Dumbbell, NotebookPen, Stethoscope, Utensils } from 'lucide-react';

/**
 * Content of `HealthMentorPage.js` ("Salud" in the nav, its own top-level
 * route `/health-data`) — no chat here, that lives with "Mentor <perfil>" as
 * the "Mentor Salud" tab of `MentorPage.js` (`HealthMentorChatTab.jsx`).
 * Registro corporal (1) | Alimentación (2) | Entrenamiento (3) | Notas (4,
 * con dos sub-pestañas: notas del mentor y otros registros sin estructura).
 */
export default function HealthDataTab() {
  // Only for Registro corporal: stat labels and the refresh a check-in
  // note's stat_changes needs. Its own instance, same as CharacterPage's,
  // just not shared state — this is a different page from Carácter.
  const { statsInfo, fetchCharacter, fetchStatsInfo } = useCharacter();

  useEffect(() => {
    fetchStatsInfo();
  }, [fetchStatsInfo]);

  return (
    <Tabs defaultValue="body-checkin" className="space-y-4">
      <TabsList className="grid h-auto w-full grid-cols-2 gap-1 lg:grid-cols-4">
        <TabsTrigger value="body-checkin" className="gap-1.5">
          <Stethoscope className="w-3.5 h-3.5" /> Registro corporal
        </TabsTrigger>
        <TabsTrigger value="nutrition" className="gap-1.5">
          <Utensils className="w-3.5 h-3.5" /> Alimentación
        </TabsTrigger>
        <TabsTrigger value="training" className="gap-1.5">
          <Dumbbell className="w-3.5 h-3.5" /> Entrenamiento
        </TabsTrigger>
        <TabsTrigger value="notas" className="gap-1.5">
          <NotebookPen className="w-3.5 h-3.5" /> Notas
        </TabsTrigger>
      </TabsList>

      <TabsContent value="body-checkin" className="space-y-4">
        {/* Antes vivía en la primera pestaña de Carácter; ahora abre este
            grupo de registros sanitarios independientes. */}
        <BodyCheckinSection statsInfo={statsInfo} onStatsChanged={fetchCharacter} />
      </TabsContent>

      <TabsContent value="nutrition">
        <NutritionTab />
      </TabsContent>

      <TabsContent value="training">
        <TrainingTab />
      </TabsContent>

      <TabsContent value="notas">
        {/* Notas del mentor (prosa de la conversación) y Otros registros
            (health_activities sin `details`, de cualquier tipo) son las dos
            formas de texto sin estructura de Salud — comparten pestaña por
            eso, no porque compartan dato. */}
        <Tabs defaultValue="mentor-notes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="mentor-notes">Notas del mentor</TabsTrigger>
            <TabsTrigger value="other-records">Otros registros</TabsTrigger>
          </TabsList>
          <TabsContent value="mentor-notes">
            <HealthNotesPanel />
          </TabsContent>
          <TabsContent value="other-records">
            <HealthOtherRecordsPanel />
          </TabsContent>
        </Tabs>
      </TabsContent>
    </Tabs>
  );
}
