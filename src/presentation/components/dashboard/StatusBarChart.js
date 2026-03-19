import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
        <p className="text-sm font-medium text-[#18181B]">
          {payload[0].payload.name}: {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export function StatusBarChart({ summary }) {
  const barData = summary ? [
    { name: 'Completadas', value: summary.completed, fill: STATUS_COLORS.done },
    { name: 'En Progreso', value: summary.in_progress, fill: STATUS_COLORS.in_progress },
    { name: 'Pendientes', value: summary.todo, fill: STATUS_COLORS.todo },
    { name: 'Bloqueadas', value: summary.blocked, fill: STATUS_COLORS.blocked }
  ] : [];

  return (
    <Card className="border-[#E4E4E7]" data-testid="status-bar-chart">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Tareas por Estado
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" horizontal={true} vertical={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 12 }} />
              <YAxis 
                dataKey="name" 
                type="category" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#71717A', fontSize: 12 }}
                width={100}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
