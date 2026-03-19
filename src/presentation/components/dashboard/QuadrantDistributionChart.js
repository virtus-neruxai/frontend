import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * QuadrantDistributionChart Component
 *
 * Displays daily standalone task distribution across Covey quadrants (Q1-Q4).
 *
 * @param {Object} props
 * @param {Object|null} props.distribution - API response from /analytics/quadrant-distribution
 * @param {string} props.range - Selected time range (7, 14, 30, 60)
 * @param {Function} props.onRangeChange - Callback when range changes
 * @param {boolean} props.loading - Loading state
 */
export function QuadrantDistributionChart({
  distribution = null,
  range = '30',
  onRangeChange,
  loading = false,
}) {
  const rangeOptions = [
    { value: '7', label: '7d' },
    { value: '14', label: '14d' },
    { value: '30', label: '30d' },
    { value: '60', label: '60d' },
  ];

  const chartData = (distribution?.timeseries || []).map((item) => ({
    date: new Date(item.date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    }),
    Q1: item.Q1 || 0,
    Q2: item.Q2 || 0,
    Q3: item.Q3 || 0,
    Q4: item.Q4 || 0,
  }));

  // Keep the same visual language as TotalStatsEvolutionChart.
  const QUADRANT_COLORS = {
    Q1: '#3B82F6', // blue
    Q2: '#10B981', // green
    Q3: '#F59E0B', // amber
    Q4: '#8B5CF6', // purple
  };

  const QUADRANT_LABELS = {
    Q1: 'Q1 - Urgente e importante',
    Q2: 'Q2 - Importante y no urgente',
    Q3: 'Q3 - No importante y urgente',
    Q4: 'Q4 - No urgente y no importante',
  };

  return (
    <Card className="border-[#E4E4E7]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Distribución de Tareas por Cuadrantes (Covey)
          </CardTitle>
          <div className="flex gap-1">
            {rangeOptions.map((option) => (
              <Button
                key={option.value}
                variant={range === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => onRangeChange && onRangeChange(option.value)}
                className="h-7 px-2 text-xs rounded-full"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-sm text-[#71717A]">Cargando datos...</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-sm text-[#71717A]">No hay datos disponibles</p>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                <XAxis
                  dataKey="date"
                  stroke="#71717A"
                  style={{ fontSize: '12px', fontFamily: 'Manrope, sans-serif' }}
                />
                <YAxis
                  stroke="#71717A"
                  style={{ fontSize: '12px', fontFamily: 'Manrope, sans-serif' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E4E4E7',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: 'Manrope, sans-serif',
                  }}
                />
                <Legend
                  formatter={(value) => QUADRANT_LABELS[value] || value}
                  wrapperStyle={{
                    fontSize: '12px',
                    fontFamily: 'Manrope, sans-serif',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="Q1"
                  stroke={QUADRANT_COLORS.Q1}
                  fill={QUADRANT_COLORS.Q1}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="Q2"
                  stroke={QUADRANT_COLORS.Q2}
                  fill={QUADRANT_COLORS.Q2}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="Q3"
                  stroke={QUADRANT_COLORS.Q3}
                  fill={QUADRANT_COLORS.Q3}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="Q4"
                  stroke={QUADRANT_COLORS.Q4}
                  fill={QUADRANT_COLORS.Q4}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
