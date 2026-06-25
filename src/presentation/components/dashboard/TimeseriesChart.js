import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';
import { CHART_SURFACE, SEMANTIC_COLORS } from '../../../theme/semanticTokens';
import { ProfileEmptyState } from '../profile-theme/ProfileEmptyState';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover text-popover-foreground p-3 rounded-lg shadow-lg border">
        <p className="text-sm font-medium text-foreground mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name === 'created' ? 'Creadas' : 'Completadas'}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function TimeseriesChart({ timeseries }) {
  const hasTimeseriesData = (timeseries || []).some(
    (item) => Number(item.created || 0) > 0 || Number(item.completed || 0) > 0
  );

  return (
    <Card data-testid="timeseries-chart">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
          Actividad en el Tiempo
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasTimeseriesData ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeseries}>
                <defs>
                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SEMANTIC_COLORS.success} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={SEMANTIC_COLORS.success} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_SURFACE.grid} vertical={false} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: CHART_SURFACE.tick, fontSize: 11 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: CHART_SURFACE.tick, fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={36}
                  formatter={(value) => (
                    <span className="text-sm text-muted-foreground">
                      {value === 'created' ? 'Creadas' : 'Completadas'}
                    </span>
                  )}
                />
                <Area 
                  type="monotone" 
                  dataKey="created" 
                  name="created"
                  stroke="hsl(var(--primary))" 
                  fillOpacity={1} 
                  fill="url(#colorCreated)" 
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="completed" 
                  name="completed"
                  stroke={SEMANTIC_COLORS.success} 
                  fillOpacity={1} 
                  fill="url(#colorCompleted)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <ProfileEmptyState
            icon={Activity}
            title="No hay actividad todavía"
            description="Crea o completa tareas para ver la actividad en el tiempo."
            compact
            className="h-72"
          />
        )}
      </CardContent>
    </Card>
  );
}
