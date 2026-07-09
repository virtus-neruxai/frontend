import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { CHART_SURFACE, TASK_STATUS_COLORS } from '../../../theme/semanticTokens';
import { PROFILE_THEME_IDS, PROFILE_THEMES } from '../../../theme/profileThemes';
import { ProfileEmptyState } from '../profile-theme/ProfileEmptyState';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover text-popover-foreground p-3 rounded-lg shadow-lg border">
        <p className="text-sm font-medium text-foreground">
          {payload[0].payload.name}: {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export function StatusBarChart({ summary, profile, onProfileChange }) {
  const barData = summary ? [
    { name: 'Completadas', value: summary.completed, fill: TASK_STATUS_COLORS.done },
    { name: 'En Progreso', value: summary.in_progress, fill: TASK_STATUS_COLORS.in_progress },
    { name: 'Pendientes', value: summary.todo, fill: TASK_STATUS_COLORS.todo },
    { name: 'Bloqueadas', value: summary.blocked, fill: TASK_STATUS_COLORS.blocked }
  ] : [];
  const hasBarData = barData.some((item) => Number(item.value || 0) > 0);
  const profileName = PROFILE_THEMES[profile]?.name || '';

  return (
    <Card data-testid="status-bar-chart">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
            Tareas por Estado{profileName ? ` del perfil ${profileName}` : ''}
          </CardTitle>
          {onProfileChange && (
            <Select value={profile || ''} onValueChange={onProfileChange}>
              <SelectTrigger className="w-40 rounded-full" data-testid="status-bar-profile-selector">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROFILE_THEME_IDS.map((id) => (
                  <SelectItem key={id} value={id}>
                    {PROFILE_THEMES[id].name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {hasBarData ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_SURFACE.grid} horizontal={true} vertical={false} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: CHART_SURFACE.tick, fontSize: 12 }} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: CHART_SURFACE.tick, fontSize: 12 }}
                  width={100}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <ProfileEmptyState
            icon={BarChart3}
            title="No hay tareas por estado"
            description="Cuando tengas tareas, esta vista mostrará su distribución."
            compact
            className="h-64"
          />
        )}
      </CardContent>
    </Card>
  );
}
