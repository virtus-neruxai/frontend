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
      color: 'text-[#3B82F6]',
      bg: 'bg-blue-50',
      border: 'border-blue-200'
    },
    {
      label: 'Puntos Ganados',
      value: `+${pointsGained}`,
      icon: TrendingUp,
      color: 'text-[#10B981]',
      bg: 'bg-green-50',
      border: 'border-green-200'
    },
    {
      label: 'Puntos Perdidos',
      value: `-${pointsLost}`,
      icon: TrendingDown,
      color: 'text-[#EF4444]',
      bg: 'bg-red-50',
      border: 'border-red-200'
    },
    {
      label: 'Balance Neto',
      value: netBalance > 0 ? `+${netBalance}` : netBalance,
      icon: Activity,
      color: netBalance >= 0 ? 'text-[#8B5CF6]' : 'text-[#EF4444]',
      bg: netBalance >= 0 ? 'bg-purple-50' : 'bg-red-50',
      border: netBalance >= 0 ? 'border-purple-200' : 'border-red-200'
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="border-[#E4E4E7] animate-pulse">
            <CardContent className="pt-6">
              <div className="h-16 bg-gray-200 rounded"></div>
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
          <Card key={index} className="border-[#E4E4E7]">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#71717A] mb-1">
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
