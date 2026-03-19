import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const STATUS_COLORS = {
  todo: '#71717A',
  in_progress: '#3B82F6',
  done: '#22C55E',
  blocked: '#EF4444'
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-[#E4E4E7]">
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
    { name: 'Completadas', value: summary.completed, color: STATUS_COLORS.done },
    { name: 'En Progreso', value: summary.in_progress, color: STATUS_COLORS.in_progress },
    { name: 'Pendientes', value: summary.todo, color: STATUS_COLORS.todo },
    { name: 'Bloqueadas', value: summary.blocked, color: STATUS_COLORS.blocked }
  ].filter(d => d.value > 0) : [];

  return (
    <Card className="border-[#E4E4E7]" data-testid="status-pie-chart">
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
                  formatter={(value) => <span className="text-sm text-[#71717A]">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-[#71717A]">
            No hay datos disponibles
          </div>
        )}
      </CardContent>
    </Card>
  );
}
