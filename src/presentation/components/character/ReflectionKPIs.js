import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { TrendingUp, TrendingDown, Scroll, Activity } from 'lucide-react';

/**
 * ReflectionKPIs Component
 * 
 * Displays KPI summary for reflections:
 * - Total reflections
 * - Points gained
 * - Points lost
 * - Net balance
 * 
 * @param {Object} props
 * @param {number} props.totalReflections - Total number of reflections
 * @param {number} props.pointsGained - Total points gained
 * @param {number} props.pointsLost - Total points lost (as positive number)
 * @param {number} props.netBalance - Net balance (gained - lost)
 * @param {boolean} props.loading - Loading state
 */
export function ReflectionKPIs({ 
  totalReflections = 0,
  pointsGained = 0,
  pointsLost = 0,
  netBalance = 0,
  loading = false
}) {
  const kpis = [
    {
      label: 'Reflexiones',
      value: totalReflections,
      icon: Scroll,
      color: 'text-[hsl(var(--info))]',
      bg: 'bg-[hsl(var(--info-soft))]',
      border: 'border-[hsl(var(--info))]'
    },
    {
      label: 'Puntos Ganados',
      value: `+${pointsGained}`,
      icon: TrendingUp,
      color: 'text-[hsl(var(--success))]',
      bg: 'bg-[hsl(var(--success-soft))]',
      border: 'border-[hsl(var(--success))]'
    },
    {
      label: 'Puntos Perdidos',
      value: `-${pointsLost}`,
      icon: TrendingDown,
      color: 'text-destructive',
      bg: 'bg-[hsl(var(--destructive-soft))]',
      border: 'border-destructive/25'
    },
    {
      label: 'Balance Neto',
      value: netBalance > 0 ? `+${netBalance}` : netBalance,
      icon: Activity,
      color: netBalance >= 0 ? 'text-primary' : 'text-destructive',
      bg: netBalance >= 0 ? 'bg-primary/10' : 'bg-[hsl(var(--destructive-soft))]',
      border: netBalance >= 0 ? 'border-primary/25' : 'border-destructive/25'
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-16 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon;
        return (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    {kpi.label}
                  </p>
                  <p className={`text-2xl font-bold ${kpi.color}`}>
                    {kpi.value}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${kpi.bg} border ${kpi.border}`}>
                  <Icon className={`w-5 h-5 ${kpi.color}`} strokeWidth={2} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
