import Layout from '../components/Layout';
import HealthDataTab from '../components/health/HealthDataTab';
import { ProfileHeroCard } from '../presentation/components/profile-theme/ProfileHeroCard';

/**
 * Own top-level nav entry ("Salud", right of "Mentor" in Layout.js) and
 * route (`/health-data`). Registro corporal, Actividad y Notas
 * (`HealthDataTab.jsx`) — no chat here, that's the "Mentor Salud" tab of
 * `MentorPage.js` (`HealthMentorChatTab.jsx`), alongside "Mentor <perfil>".
 */
export default function HealthMentorPage() {
  return (
    <Layout ambient>
      <div className="space-y-6" data-testid="health-mentor-page">
        <ProfileHeroCard
          title="Salud"
          titleAs="h1"
          description="Registro corporal, actividad y notas del Mentor de Salud."
        />

        <HealthDataTab />
      </div>
    </Layout>
  );
}
