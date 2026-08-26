import { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { BodyCheckinSection } from '../../presentation/components/character/bodycheckin/BodyCheckinSection';
import HealthActivityTab from './HealthActivityTab';
import HealthNotesPanel from './HealthNotesPanel';
import { useCharacter } from '../../presentation/viewmodels/useCharacter';
import { Activity, NotebookPen, Stethoscope } from 'lucide-react';

/**
 * Content of `HealthMentorPage.js` ("Salud" in the nav, its own top-level
 * route `/health-data`) — no chat here, that lives with "Mentor <perfil>" as
 * the "Mentor Salud" tab of `MentorPage.js` (`HealthMentorChatTab.jsx`).
 * Registro corporal (1) | Actividad (2) | Notas (3).
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
      <TabsList>
        <TabsTrigger value="body-checkin" className="gap-1.5">
          <Stethoscope className="w-3.5 h-3.5" /> Registro corporal
        </TabsTrigger>
        <TabsTrigger value="actividad" className="gap-1.5">
          <Activity className="w-3.5 h-3.5" /> Actividad
        </TabsTrigger>
        <TabsTrigger value="notas" className="gap-1.5">
          <NotebookPen className="w-3.5 h-3.5" /> Notas
        </TabsTrigger>
      </TabsList>

      <TabsContent value="body-checkin" className="space-y-4">
        {/* Antes vivía en la primera pestaña de Carácter; ahora en la
            primera de este grupo, junto a Actividad y Notas. */}
        <BodyCheckinSection statsInfo={statsInfo} onStatsChanged={fetchCharacter} />
      </TabsContent>

      <TabsContent value="actividad">
        <HealthActivityTab />
      </TabsContent>

      <TabsContent value="notas">
        <HealthNotesPanel />
      </TabsContent>
    </Tabs>
  );
}
