import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-[#E4E4E7]">
        <p className="text-sm font-medium text-[#18181B] mb-1">{label}</p>
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
  return (
    <Card className="border-[#E4E4E7]" data-testid="timeseries-chart">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Actividad en el Tiempo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeseries}>
              <defs>
                <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" vertical={false} />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#71717A', fontSize: 11 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getDate()}/${date.getMonth() + 1}`;
                }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#71717A', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={36}
                formatter={(value) => (
                  <span className="text-sm text-[#71717A]">
                    {value === 'created' ? 'Creadas' : 'Completadas'}
                  </span>
                )}
              />
              <Area 
                type="monotone" 
                dataKey="created" 
                name="created"
                stroke="#F97316" 
                fillOpacity={1} 
                fill="url(#colorCreated)" 
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="completed" 
                name="completed"
                stroke="#22C55E" 
                fillOpacity={1} 
                fill="url(#colorCompleted)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
