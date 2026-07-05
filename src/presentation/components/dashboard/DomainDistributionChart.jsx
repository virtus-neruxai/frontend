import { BarChart3 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { CHART_COLORS, CHART_SURFACE } from '../../../theme/semanticTokens';
import { ProfileEmptyState } from '../profile-theme/ProfileEmptyState';

function DomainTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg">
      <p className="text-sm font-medium">{item.domain}: {item.count}</p>
      <p className="text-xs text-muted-foreground">Pulsa para ver las tareas</p>
    </div>
  );
}

export function DomainDistributionChart({ data = [], onDomainClick }) {
  return (
    <Card data-testid="domain-distribution-chart">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg" style={{ fontFamily: 'var(--font-heading)' }}>
          Tareas totales por dominio
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <ProfileEmptyState
            icon={BarChart3}
            title="No hay dominios para mostrar"
            description="Las tareas del periodo seleccionado aparecerán agrupadas aquí."
            compact
            className="h-64"
          />
        ) : (
          <>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 48 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_SURFACE.grid} vertical={false} />
                  <XAxis
                    dataKey="domain"
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                    height={70}
                    tick={{ fill: CHART_SURFACE.tick, fontSize: 11 }}
                  />
                  <YAxis allowDecimals={false} tick={{ fill: CHART_SURFACE.tick, fontSize: 12 }} />
                  <Tooltip content={<DomainTooltip />} />
                  <Bar
                    dataKey="count"
                    name="Tareas"
                    fill={CHART_COLORS[0]}
                    radius={[4, 4, 0, 0]}
                    cursor="pointer"
                    onClick={(item) => onDomainClick?.(item?.domain || item?.payload?.domain)}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap gap-2" aria-label="Totales por dominio">
              {data.map((item, index) => (
                <button
                  key={item.domain}
                  type="button"
                  onClick={() => onDomainClick?.(item.domain)}
                  className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs hover:bg-muted"
                  data-testid={`domain-total-${item.domain}`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                  <span>{item.domain}</span>
                  <span className="font-bold text-foreground">{item.count}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
