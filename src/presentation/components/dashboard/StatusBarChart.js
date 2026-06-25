import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { CHART_SURFACE, TASK_STATUS_COLORS } from '../../../theme/semanticTokens';
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

export function StatusBarChart({ summary }) {
  const barData = summary ? [
    { name: 'Completadas', value: summary.completed, fill: TASK_STATUS_COLORS.done },
    { name: 'En Progreso', value: summary.in_progress, fill: TASK_STATUS_COLORS.in_progress },
    { name: 'Pendientes', value: summary.todo, fill: TASK_STATUS_COLORS.todo },
    { name: 'Bloqueadas', value: summary.blocked, fill: TASK_STATUS_COLORS.blocked }
  ] : [];
  const hasBarData = barData.some((item) => Number(item.value || 0) > 0);

  return (
    <Card data-testid="status-bar-chart">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
          Tareas por Estado
        </CardTitle>
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
