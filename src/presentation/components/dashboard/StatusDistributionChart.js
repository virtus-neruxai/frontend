import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import { TASK_STATUS_COLORS } from '../../../theme/semanticTokens';
import { ProfileEmptyState } from '../profile-theme/ProfileEmptyState';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover text-popover-foreground p-3 rounded-lg shadow-lg border">
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.payload.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function StatusDistributionChart({ summary }) {
  const pieData = summary ? [
    { name: 'Completadas', value: summary.completed, color: TASK_STATUS_COLORS.done },
    { name: 'En Progreso', value: summary.in_progress, color: TASK_STATUS_COLORS.in_progress },
    { name: 'Pendientes', value: summary.todo, color: TASK_STATUS_COLORS.todo },
    { name: 'Bloqueadas', value: summary.blocked, color: TASK_STATUS_COLORS.blocked }
  ].filter(d => d.value > 0) : [];

  return (
    <Card data-testid="status-pie-chart">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Distribución por Estado
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pieData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <ProfileEmptyState
            icon={PieChartIcon}
            title="No hay datos disponibles"
            description="Completa tareas para ver la distribución por estado."
            compact
            className="h-64"
          />
        )}
      </CardContent>
    </Card>
  );
}
