import { useState } from 'react';
import Layout from '../components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ProfileHeroCard } from '../presentation/components/profile-theme/ProfileHeroCard';
import CenterView from '../presentation/components/reasoning/CenterView';
import ReasoningReportTab from '../presentation/components/reasoning/ReasoningReportTab';
import HealthReportTab from '../components/health/HealthReportTab';
import { Brain, HeartPulse, Orbit } from 'lucide-react';

const TAB_LABELS = {
  centro: 'Mi centro',
  informe: 'Informe Razonado',
  'informe-salud': 'Informe de Salud',
};

export default function InformesPage() {
  const [activeTab, setActiveTab] = useState('centro');

  return (
    <Layout ambient>
      <div className="space-y-6" data-testid="informes-page">
        <ProfileHeroCard
          title="Informes"
          titleAs="h1"
          description="Tu centro y tus lecturas razonadas, en un mismo lugar."
          action={
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Espacio activo</p>
              <p className="font-bold text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
                {TAB_LABELS[activeTab] || TAB_LABELS.centro}
              </p>
            </div>
          }
        />

        <Tabs defaultValue="centro" className="space-y-4" onValueChange={setActiveTab}>
          <TabsList className="bg-muted p-1 rounded-full">
            <TabsTrigger value="centro" className="rounded-full data-[state=active]:bg-card">
              <Orbit className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Mi centro
            </TabsTrigger>
            <TabsTrigger value="informe" className="rounded-full data-[state=active]:bg-card">
              <Brain className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Informe razonado
            </TabsTrigger>
            <TabsTrigger value="informe-salud" className="rounded-full data-[state=active]:bg-card">
              <HeartPulse className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Informe de salud
            </TabsTrigger>
          </TabsList>

          <TabsContent value="centro" className="space-y-4">
            <CenterView />
          </TabsContent>

          <TabsContent value="informe" className="space-y-4">
            <ReasoningReportTab />
          </TabsContent>

          <TabsContent value="informe-salud" className="space-y-4">
            <HealthReportTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
