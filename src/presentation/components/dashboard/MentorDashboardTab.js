import { Activity, Brain, EyeOff, Flame, RotateCcw, Sparkles, Target, Trophy } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { KPICard } from './KPICard';

const PROFILE_META = {
  stoic: {
    name: 'Estoico',
    emoji: '⚖️',
    description: 'Autodominio, claridad y ejecución sobre lo que sí depende de ti.',
  },
  spiritual: {
    name: 'Espiritual',
    emoji: '🌿',
    description: 'Coherencia interior, propósito y práctica consciente.',
  },
  calm: {
    name: 'Calma',
    emoji: '🌊',
    description: 'Recuperación sin presión, pasos pequeños y sostenibles.',
  },
  performance: {
    name: 'Rendimiento',
    emoji: '⚡',
    description: 'Consistencia física, métricas y hábitos de alto impacto.',
  },
  student: {
    name: 'Estudiante',
    emoji: '📚',
    description: 'Deep work, estudio sistemático y progreso académico medible.',
  },
};

const OBJECTIVE_STATUS_LABELS = {
  active: 'Activo',
  paused: 'Pausado',
  achieved: 'Logrado',
  hidden: 'Oculto',
};

const ITEM_STATUS_LABELS = {
  not_started: 'Sin empezar',
  proposed: 'Propuesto',
  accepted: 'Aceptado',
  active: 'Activo',
  consistent: 'Consistente',
  stalled: 'Estancado',
  achieved: 'Logrado',
  hidden: 'Oculto',
};

const EVIDENCE_LABELS = {
  episode: 'Episodios',
  task: 'Tareas',
  mission: 'Misiones',
  reflection: 'Reflexiones',
  routine: 'Rutinas',
};

const ITEM_STATUS_OPTIONS = [
  { value: 'not_started', label: 'Sin empezar' },
  { value: 'proposed', label: 'Propuesto' },
  { value: 'accepted', label: 'Aceptado' },
  { value: 'active', label: 'Activo' },
  { value: 'consistent', label: 'Consistente' },
  { value: 'stalled', label: 'Estancado' },
  { value: 'achieved', label: 'Logrado' },
];

function formatDay(value) {
  if (!value) return 'N/D';
  const date = new Date(value);
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

function formatDateTime(value) {
  if (!value) return 'Sin señales todavía';
  return new Date(value).toLocaleString();
}

function badgeClass(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'achieved' || normalized === 'consistent') {
    return 'border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]';
  }
  if (normalized === 'paused' || normalized === 'stalled') {
    return 'border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]';
  }
  if (normalized === 'hidden') {
    return 'border-[#E4E4E7] bg-[#F4F4F5] text-[#71717A]';
  }
  if (normalized === 'active') {
    return 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]';
  }
  if (normalized === 'not_started') {
    return 'border-[#E4E4E7] bg-[#FAFAFA] text-[#71717A]';
  }
  if (normalized === 'proposed' || normalized === 'accepted') {
    return 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]';
  }
  return 'border-[#FED7AA] bg-[#FFF7ED] text-[#C2410C]';
}

function MetricBar({ label, value, color }) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value || 0)));

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-[#71717A]">
        <span>{label}</span>
        <span>{safeValue}%</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-[#F4F4F5]">
        <div className="h-2 rounded-full transition-all" style={{ width: `${safeValue}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function MentorProgressChart({ data = [] }) {
  return (
    <Card className="border-[#E4E4E7]">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Serie Temporal de Progreso
        </CardTitle>
        <CardDescription>Items activos y consistentes a lo largo del periodo.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="mentorActive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="mentorConsistent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22C55E" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 11 }} tickFormatter={formatDay} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 12 }} />
              <Tooltip labelFormatter={formatDateTime} />
              <Area type="monotone" dataKey="active" stroke="#3B82F6" fill="url(#mentorActive)" strokeWidth={2} name="Activos" />
              <Area type="monotone" dataKey="consistent" stroke="#22C55E" fill="url(#mentorConsistent)" strokeWidth={2} name="Consistentes" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function MentorEpisodeChart({ data = [] }) {
  return (
    <Card className="border-[#E4E4E7]">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Serie Temporal de Episodios
        </CardTitle>
        <CardDescription>Propuestas creadas vs aceptadas en el periodo.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="mentorEpisodesCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="mentorEpisodesAccepted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 11 }} tickFormatter={formatDay} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 12 }} />
              <Tooltip labelFormatter={formatDateTime} />
              <Area type="monotone" dataKey="created" stroke="#F97316" fill="url(#mentorEpisodesCreated)" strokeWidth={2} name="Creados" />
              <Area type="monotone" dataKey="accepted" stroke="#8B5CF6" fill="url(#mentorEpisodesAccepted)" strokeWidth={2} name="Aceptados" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function MentorCoverageChart({ data = [] }) {
  const chartData = (data || []).map((item) => ({
    name: item.label,
    coverage: Math.round(item.coverage_score || 0),
  }));

  return (
    <Card className="border-[#E4E4E7]">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Cobertura por Objetivo
        </CardTitle>
        <CardDescription>Cuánto del objetivo tiene ya soporte real del mentor.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" horizontal vertical={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 12 }} />
              <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 12 }} width={140} />
              <Tooltip />
              <Bar dataKey="coverage" fill="#F97316" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function MentorEvidenceMixChart({ data = [] }) {
  const chartData = (data || []).map((item) => ({
    label: EVIDENCE_LABELS[item.source] || item.source,
    value: item.value || 0,
  }));

  return (
    <Card className="border-[#E4E4E7]">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Mezcla de Evidencia
        </CardTitle>
        <CardDescription>De dónde está sacando fuerza el mentor background.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#14B8A6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function objectiveLookup(profile) {
  const objectives = {};
  const items = {};
  (profile?.objectives || []).forEach((objective) => {
    objectives[objective.objective_key] = objective;
    (objective.items || []).forEach((item) => {
      items[item.item_key] = item;
    });
  });
  return { objectives, items };
}

export function MentorDashboardTab({
  mentorDashboard,
  mentorProfile,
  mentorLoading,
  mentorActionKey,
  onObjectivePatch,
  onItemPatch,
}) {
  if (mentorLoading && !mentorDashboard) {
    return (
      <div className="h-64 flex items-center justify-center text-[#71717A]">
        Cargando mentor background...
      </div>
    );
  }

  if (!mentorDashboard) {
    return (
      <Card className="border-[#E4E4E7]">
        <CardContent className="py-12 text-center text-[#71717A]">
          Todavía no hay datos del mentor para mostrar.
        </CardContent>
      </Card>
    );
  }

  const profileMeta = PROFILE_META[mentorDashboard.prompt_profile] || PROFILE_META.stoic;
  const { objectives: objectiveMap, items: itemMap } = objectiveLookup(mentorProfile);
  const hiddenObjectives = (mentorProfile?.objectives || []).filter((objective) => objective.hidden || objective.status === 'hidden');
  const hiddenItems = (mentorProfile?.objectives || [])
    .flatMap((objective) => objective.items || [])
    .filter((item) => item.hidden || item.status === 'hidden');
  const maxPriority = mentorDashboard?.policy?.max_active_objectives || 5;

  const isObjectiveBusy = (objectiveKey) => mentorActionKey.startsWith(`objective:${objectiveKey}:`);
  const isItemBusy = (itemKey) => mentorActionKey.startsWith(`item:${itemKey}:`);

  return (
    <div className="space-y-6">
      <Card className="border-[#E4E4E7] bg-[linear-gradient(135deg,#FFFBEB_0%,#FFFFFF_35%,#EFF6FF_100%)]">
        <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{profileMeta.emoji}</span>
              <CardTitle className="text-xl" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Mentor {profileMeta.name}
              </CardTitle>
              <Badge variant="outline" className="border-[#E4E4E7] bg-white text-[#52525B]">
                Perfil activo
              </Badge>
              {mentorLoading ? (
                <Badge variant="outline" className="border-[#DBEAFE] bg-[#EFF6FF] text-[#1D4ED8]">
                  Actualizando...
                </Badge>
              ) : null}
            </div>
            <CardDescription className="max-w-2xl text-[#52525B]">
              {profileMeta.description}
            </CardDescription>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-sm text-[#52525B]">
            <p>Objetivos activos máx: {mentorDashboard.policy?.max_active_objectives || 0}</p>
            <p>Items por objetivo máx: {mentorDashboard.policy?.max_items_per_objective || 0}</p>
            <p className="mt-1 text-xs text-[#71717A]">
              Última actualización: {formatDateTime(mentorDashboard.profile_updated_at)}
            </p>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Objetivos Activos"
          value={mentorDashboard.kpis?.active_objectives || 0}
          icon={Sparkles}
          iconColor="#8B5CF6"
          iconBg="#F3E8FF"
          testId="mentor-kpi-objectives"
        />
        <KPICard
          title="Items Cubiertos"
          value={mentorDashboard.kpis?.covered_items || 0}
          icon={Target}
          iconColor="#F97316"
          iconBg="#FFF7ED"
          testId="mentor-kpi-covered"
        />
        <KPICard
          title="Items Consistentes"
          value={mentorDashboard.kpis?.consistent_items || 0}
          icon={Flame}
          iconColor="#22C55E"
          iconBg="#DCFCE7"
          testId="mentor-kpi-consistent"
        />
        <KPICard
          title="Items Estancados"
          value={mentorDashboard.kpis?.stalled_items || 0}
          icon={Brain}
          iconColor="#EF4444"
          iconBg="#FEF2F2"
          testId="mentor-kpi-stalled"
        />
        <KPICard
          title="Aceptación"
          value={`${mentorDashboard.kpis?.proposal_acceptance_rate || 0}%`}
          subtitle={`Progreso medio: ${Math.round(mentorDashboard.kpis?.objective_progress_avg || 0)}%`}
          icon={Activity}
          iconColor="#3B82F6"
          iconBg="#DBEAFE"
          testId="mentor-kpi-acceptance"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <MentorProgressChart data={mentorDashboard.progress_timeseries || []} />
        <MentorEpisodeChart data={mentorDashboard.episode_timeseries || []} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <MentorCoverageChart data={mentorDashboard.coverage_breakdown || []} />
        <MentorEvidenceMixChart data={mentorDashboard.evidence_mix || []} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          {(mentorDashboard.objective_cards || []).map((objectiveCard) => {
            const objectiveState = objectiveMap[objectiveCard.objective_key] || {};
            const objectiveBusy = isObjectiveBusy(objectiveCard.objective_key);
            const priorityValue = objectiveState?.pinned_priority != null
              ? String(objectiveState.pinned_priority)
              : 'auto';
            const objectiveStatus = objectiveState?.status || objectiveCard.status || 'active';

            return (
              <Card key={objectiveCard.objective_key} className="border-[#E4E4E7]">
                <CardHeader className="gap-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          {objectiveState?.title || objectiveCard.title}
                        </CardTitle>
                        <Badge variant="outline" className={badgeClass(objectiveStatus)}>
                          {OBJECTIVE_STATUS_LABELS[objectiveStatus] || objectiveStatus}
                        </Badge>
                        {objectiveState?.pinned_priority != null ? (
                          <Badge variant="outline" className="border-[#DBEAFE] bg-[#EFF6FF] text-[#1D4ED8]">
                            Prioridad fijada {objectiveState.pinned_priority}
                          </Badge>
                        ) : null}
                      </div>
                      {objectiveState?.summary ? (
                        <CardDescription className="text-[#52525B]">
                          {objectiveState.summary}
                        </CardDescription>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        {(objectiveState?.domains || []).map((domain) => (
                          <Badge key={domain} variant="outline" className="border-[#E4E4E7] bg-[#FAFAFA] text-[#71717A]">
                            {domain}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={priorityValue}
                        onValueChange={(value) => onObjectivePatch(
                          objectiveCard.objective_key,
                          { pinned_priority: value === 'auto' ? null : parseInt(value, 10) },
                          `objective:${objectiveCard.objective_key}:priority`,
                        )}
                        disabled={objectiveBusy}
                      >
                        <SelectTrigger className="w-[150px] bg-white">
                          <SelectValue placeholder="Prioridad" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Prioridad auto</SelectItem>
                          {Array.from({ length: maxPriority }, (_, index) => (
                            <SelectItem key={index + 1} value={String(index + 1)}>
                              Prioridad {index + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={objectiveBusy}
                        onClick={() => onObjectivePatch(
                          objectiveCard.objective_key,
                          { status: objectiveStatus === 'paused' ? 'active' : 'paused' },
                          `objective:${objectiveCard.objective_key}:pause`,
                        )}
                      >
                        {objectiveStatus === 'paused' ? 'Reactivar' : 'Pausar'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={objectiveBusy}
                        onClick={() => onObjectivePatch(
                          objectiveCard.objective_key,
                          { status: 'achieved' },
                          `objective:${objectiveCard.objective_key}:achieved`,
                        )}
                      >
                        <Trophy className="w-4 h-4" />
                        Logrado
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={objectiveBusy}
                        onClick={() => onObjectivePatch(
                          objectiveCard.objective_key,
                          { hidden: true },
                          `objective:${objectiveCard.objective_key}:hide`,
                        )}
                      >
                        <EyeOff className="w-4 h-4" />
                        Ocultar
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <MetricBar label="Progreso" value={objectiveCard.progress_score} color="#3B82F6" />
                    <MetricBar label="Cobertura" value={objectiveCard.coverage_score} color="#F97316" />
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#71717A]">
                    <span>Siguiente gap: {objectiveCard.next_gap || 'Sin gaps pendientes visibles'}</span>
                    <span>Última señal: {formatDateTime(objectiveCard.last_signal_at)}</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {(objectiveCard.items || []).map((item) => {
                    const itemState = itemMap[item.item_key] || {};
                    const itemStatus = itemState?.status || item.status || 'not_started';
                    const itemBusy = isItemBusy(item.item_key);

                    return (
                      <div key={item.item_key} className="rounded-2xl border border-[#E4E4E7] p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-[#18181B]">{itemState?.label || item.label}</p>
                              <Badge variant="outline" className={badgeClass(itemStatus)}>
                                {ITEM_STATUS_LABELS[itemStatus] || itemStatus}
                              </Badge>
                              <Badge variant="outline" className="border-[#E4E4E7] bg-[#FAFAFA] text-[#71717A]">
                                {item.strategy_type}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <MetricBar label="Progreso" value={item.progress_score} color="#22C55E" />
                              <MetricBar label="Cobertura" value={item.coverage_score} color="#A855F7" />
                            </div>
                            <p className="text-xs text-[#71717A]">
                              Última señal: {formatDateTime(item.last_signal_at)}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Select
                              value={itemStatus}
                              onValueChange={(value) => onItemPatch(
                                item.item_key,
                                { status: value },
                                `item:${item.item_key}:status`,
                              )}
                              disabled={itemBusy}
                            >
                              <SelectTrigger className="w-[170px] bg-white">
                                <SelectValue placeholder="Estado" />
                              </SelectTrigger>
                              <SelectContent>
                                {ITEM_STATUS_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={itemBusy}
                              onClick={() => onItemPatch(
                                item.item_key,
                                { status: 'achieved' },
                                `item:${item.item_key}:achieved`,
                              )}
                            >
                              <Trophy className="w-4 h-4" />
                              Logrado
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={itemBusy}
                              onClick={() => onItemPatch(
                                item.item_key,
                                { hidden: true },
                                `item:${item.item_key}:hide`,
                              )}
                            >
                              <EyeOff className="w-4 h-4" />
                              Ocultar
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}

          {!(mentorDashboard.objective_cards || []).length ? (
            <Card className="border-[#E4E4E7]">
              <CardContent className="py-12 text-center text-[#71717A]">
                Todavía no hay objetivos visibles para este perfil. Completa más actividad o revisa el perfil del mentor.
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card className="border-[#E4E4E7]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Episodios Recientes
              </CardTitle>
              <CardDescription>Feed del razonamiento operativo ya materializado en propuestas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(mentorDashboard.recent_episodes || []).slice(0, 8).map((episode) => (
                <div key={episode.id} className="rounded-2xl border border-[#E4E4E7] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={badgeClass(episode.status)}>
                      {ITEM_STATUS_LABELS[episode.status] || OBJECTIVE_STATUS_LABELS[episode.status] || episode.status}
                    </Badge>
                    <Badge variant="outline" className="border-[#E4E4E7] bg-[#FAFAFA] text-[#71717A]">
                      {episode.proposal_family || episode.suggestion_type || 'propuesta'}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm font-medium text-[#18181B]">
                    {episode.summary || episode.message || episode.suggestion_type}
                  </p>
                  <p className="mt-1 text-xs text-[#71717A]">
                    Objetivo: {objectiveMap[episode.objective_key]?.title || 'Sin objetivo enlazado'}
                  </p>
                  <p className="mt-1 text-xs text-[#71717A]">
                    {episode.proposal_cluster || 'sin cluster'} · {formatDateTime(episode.created_at)}
                  </p>
                </div>
              ))}
              {!(mentorDashboard.recent_episodes || []).length ? (
                <p className="text-sm text-[#71717A]">
                  Todavía no hay episodios registrados para este perfil.
                </p>
              ) : null}
            </CardContent>
          </Card>

          {(hiddenObjectives.length || hiddenItems.length) ? (
            <Card className="border-[#E4E4E7]">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Elementos Ocultos
                </CardTitle>
                <CardDescription>Si ocultas algo por error, puedes restaurarlo aquí.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {hiddenObjectives.map((objective) => (
                  <div key={objective.objective_key} className="rounded-2xl border border-[#E4E4E7] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#18181B]">{objective.title}</p>
                        <p className="text-xs text-[#71717A]">Objetivo oculto</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isObjectiveBusy(objective.objective_key)}
                        onClick={() => onObjectivePatch(
                          objective.objective_key,
                          { hidden: false },
                          `objective:${objective.objective_key}:restore`,
                        )}
                      >
                        <RotateCcw className="w-4 h-4" />
                        Restaurar
                      </Button>
                    </div>
                  </div>
                ))}

                {hiddenItems.map((item) => (
                  <div key={item.item_key} className="rounded-2xl border border-[#E4E4E7] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#18181B]">{item.label}</p>
                        <p className="text-xs text-[#71717A]">Item oculto</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isItemBusy(item.item_key)}
                        onClick={() => onItemPatch(
                          item.item_key,
                          { hidden: false },
                          `item:${item.item_key}:restore`,
                        )}
                      >
                        <RotateCcw className="w-4 h-4" />
                        Restaurar
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
