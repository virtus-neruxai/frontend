import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';
import { formatStatLabel, getStatColor } from '../../../lib/statUtils';
import { StatsDateRangeControls } from '../stats/StatsDateRangeControls';
import { CHART_SURFACE } from '../../../theme/semanticTokens';
import { ProfileEmptyState } from '../profile-theme/ProfileEmptyState';

export function getMissionEvolutionStatKeys(history = [], statsInfo = {}) {
  const discoveredStatKeys = Array.from(
    history.reduce((keys, row) => {
      Object.keys(row || {}).forEach((stat) => {
        if (stat !== 'date') {
          keys.add(stat);
        }
      });
      return keys;
    }, new Set())
  );

  const activeStatKeys = Object.keys(statsInfo || {});
  if (activeStatKeys.length === 0) {
    return discoveredStatKeys;
  }

  return activeStatKeys.filter((stat) => discoveredStatKeys.includes(stat));
}

export function processMissionEventsData(history, orderedStatKeys) {
  if (!history || history.length === 0 || orderedStatKeys.length === 0) {
    return [];
  }

  return history.map((item) => {
    const entry = {
      date: new Date(item.date).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
      }),
    };

    orderedStatKeys.forEach((stat) => {
      entry[stat] = item[stat] || 0;
    });

    return entry;
  });
}

/**
 * MissionEvolutionChart Component
 * 
 * Displays evolution of mission stat changes over a selectable date range
 * 
 * @param {Object} props
 * @param {Array} props.data - Mission-only cumulative stats history (from /stats/evolution?source=missions)
 * @param {string} props.range - Selected time range (7, 14, 30, 60)
 * @param {Function} props.onRangeChange - Callback when range changes
 * @param {string} props.fromDate - Range start (YYYY-MM-DD)
 * @param {string} props.toDate - Range end (YYYY-MM-DD)
 * @param {Function} props.onFromDateChange - Callback when start date changes
 * @param {Function} props.onToDateChange - Callback when end date changes
 * @param {boolean} props.loading - Loading state
 */
export function MissionEvolutionChart({ 
  data = [],
  range = '30',
  onRangeChange,
  fromDate = '',
  toDate = '',
  onFromDateChange,
  onToDateChange,
  loading = false,
  statsInfo = {},
}) {
  const rangeOptions = [
    { value: '7', label: '7d' },
    { value: '14', label: '14d' },
    { value: '30', label: '30d' },
    { value: '60', label: '60d' }
  ];

  const statKeys = getMissionEvolutionStatKeys(data, statsInfo);
  const chartData = processMissionEventsData(data, statKeys);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Evolución de Cambios Acumulados (Misiones)
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
            icon={Activity}
            title="No hay datos de misiones en este rango"
            description="Completa misiones para medir su impacto en tus stats."
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
                  style={{ fontSize: '10px', fontFamily: 'Manrope, sans-serif' }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
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
                {statKeys.map((statKey) => {
                  const color = getStatColor(statKey);
                  return (
                    <Area 
                      key={statKey}
                      type="monotone" 
                      dataKey={statKey} 
                      stroke={color}
                      fill={color}
                      fillOpacity={0.2}
                      strokeWidth={2}
                      name={formatStatLabel(statKey, statsInfo)}
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
