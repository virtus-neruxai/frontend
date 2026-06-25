import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LineChart } from 'lucide-react';
import { StatsDateRangeControls } from '../stats/StatsDateRangeControls';
import { CHART_COLORS, CHART_SURFACE } from '../../../theme/semanticTokens';
import { ProfileEmptyState } from '../profile-theme/ProfileEmptyState';

/**
 * StatsHistoryChart Component
 *
 * Displays reflection-only cumulative stat evolution with selectable date range
 *
 * @param {Object} props
 * @param {Array} props.data - Historical stats data (from /reflections/stats-history - ONLY reflections)
 * @param {string} props.range - Selected time range (7, 14, 30, 60)
 * @param {Function} props.onRangeChange - Callback when range changes
 * @param {string} props.fromDate - Range start (YYYY-MM-DD)
 * @param {string} props.toDate - Range end (YYYY-MM-DD)
 * @param {Function} props.onFromDateChange - Callback when start date changes
 * @param {Function} props.onToDateChange - Callback when end date changes
 * @param {string} props.title - Chart title
 * @param {boolean} props.loading - Loading state
 * @param {Object} props.statsInfo - Stat metadata { statKey: { name, description } } for display labels
 */
export function StatsHistoryChart({
  data = [],
  range = '30',
  onRangeChange,
  fromDate = '',
  toDate = '',
  onFromDateChange,
  onToDateChange,
  title = "Evolución de Cambios Acumulados",
  loading = false,
  statsInfo = {}
}) {
  const rangeOptions = [
    { value: '7', label: '7d' },
    { value: '14', label: '14d' },
    { value: '30', label: '30d' },
    { value: '60', label: '60d' }
  ];

  // Derive stat keys from the first data item (exclude 'date')
  const statKeys = data.length > 0
    ? Object.keys(data[0]).filter(k => k !== 'date')
    : [];

  // Transform data for Recharts format
  const chartData = data.map(item => {
    const entry = { date: new Date(item.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) };
    statKeys.forEach(key => { entry[key] = item[key] || 0; });
    return entry;
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {title}
          </CardTitle>
          <StatsDateRangeControls
            range={range}
            onRangeChange={onRangeChange}
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={onFromDateChange}
            onToDateChange={onToDateChange}
            rangeOptions={rangeOptions}
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Cargando datos...</p>
          </div>
        ) : chartData.length === 0 ? (
          <ProfileEmptyState
            icon={LineChart}
            title="No hay datos disponibles"
            description="Tus reflexiones irán mostrando cambios acumulados en esta gráfica."
            compact
            className="h-64"
          />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_SURFACE.grid} />
                <XAxis
                  dataKey="date"
                  stroke={CHART_SURFACE.tick}
                  style={{ fontSize: '12px', fontFamily: 'Manrope, sans-serif' }}
                />
                <YAxis
                  stroke={CHART_SURFACE.tick}
                  style={{ fontSize: '12px', fontFamily: 'Manrope, sans-serif' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: CHART_SURFACE.tooltipBackground,
                    border: `1px solid ${CHART_SURFACE.tooltipBorder}`,
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: 'Manrope, sans-serif'
                  }}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: '12px',
                    fontFamily: 'Manrope, sans-serif'
                  }}
                />
                {statKeys.map((key, i) => {
                  const color = CHART_COLORS[i % CHART_COLORS.length];
                  const label = statsInfo[key]?.name || key;
                  return (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={color}
                      fill={color}
                      fillOpacity={0.2}
                      strokeWidth={2}
                      name={label}
                    />
                  );
                })}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
