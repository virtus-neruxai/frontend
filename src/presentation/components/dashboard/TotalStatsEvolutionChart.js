import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';
import { StatsDateRangeControls } from '../stats/StatsDateRangeControls';
import { CHART_COLORS, CHART_SURFACE } from '../../../theme/semanticTokens';
import { PROFILE_THEME_IDS, PROFILE_THEMES } from '../../../theme/profileThemes';
import { ProfileEmptyState } from '../profile-theme/ProfileEmptyState';

export function combineTotalStatsData(history = [], statsInfo = {}) {
  const activeStatKeys = Object.keys(statsInfo || {});
  const fallbackHistoryKeys = Array.from(
    history.reduce((keys, item) => {
      Object.keys(item || {}).forEach((key) => {
        if (key !== 'date') {
          keys.add(key);
        }
      });
      return keys;
    }, new Set())
  );
  const statKeys = activeStatKeys.length > 0 ? activeStatKeys : fallbackHistoryKeys;

  if (statKeys.length === 0) {
    return [];
  }

  return history.map((item) => {
    const entry = {
      date: new Date(item.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    };
    statKeys.forEach((stat) => {
      entry[stat] = item[stat] || 0;
    });
    return entry;
  });
}

/**
 * TotalStatsEvolutionChart Component
 *
 * Displays total stat evolution for the selected profile.
 *
 * @param {Object} props
 * @param {Array} props.data - Total cumulative stats history (from /stats/evolution?source=all)
 * @param {string} props.range - Selected time range (7, 14, 30, 60)
 * @param {Function} props.onRangeChange - Callback when range changes
 * @param {string} props.fromDate - Range start (YYYY-MM-DD)
 * @param {string} props.toDate - Range end (YYYY-MM-DD)
 * @param {Function} props.onFromDateChange - Callback when start date changes
 * @param {Function} props.onToDateChange - Callback when end date changes
 * @param {boolean} props.loading - Loading state
 * @param {Object} props.statsInfo - Stat metadata { statKey: { name, description } } for display labels
 */
export function TotalStatsEvolutionChart({
  data = [],
  range = '30',
  onRangeChange,
  fromDate = '',
  toDate = '',
  onFromDateChange,
  onToDateChange,
  loading = false,
  statsInfo = {},
  profile,
  onProfileChange,
}) {
  const rangeOptions = [
    { value: '7', label: '7d' },
    { value: '14', label: '14d' },
    { value: '30', label: '30d' },
    { value: '60', label: '60d' }
  ];
  const chartData = combineTotalStatsData(data, statsInfo);
  const statKeys = chartData.length > 0 ? Object.keys(chartData[0]).filter(k => k !== 'date') : [];
  const profileName = PROFILE_THEMES[profile]?.name || '';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
            Evolución Total de Stats{profileName ? ` por perfil ${profileName}` : ''}
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {onProfileChange && (
              <Select value={profile || ''} onValueChange={onProfileChange}>
                <SelectTrigger className="w-40 rounded-full" data-testid="evolution-profile-selector">
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
            title="No hay datos disponibles"
            description="Tus acciones y registros empezarán a dibujar tu evolución aquí."
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
                  style={{ fontSize: '12px', fontFamily: 'var(--font-ui)' }}
                />
                <YAxis 
                  stroke={CHART_SURFACE.tick}
                  style={{ fontSize: '12px', fontFamily: 'var(--font-ui)' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: CHART_SURFACE.tooltipBackground,
                    border: `1px solid ${CHART_SURFACE.tooltipBorder}`,
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-ui)'
                  }}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: '12px',
                    fontFamily: 'var(--font-ui)'
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
