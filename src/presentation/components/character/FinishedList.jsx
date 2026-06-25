import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { CheckCircle2, CalendarCheck, Flame } from 'lucide-react';

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-ES', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

/**
 * Read-only list of finished items (challenges or missions) showing the
 * completion date. `items` is a normalized array of:
 *   { id, title, subtitle?, badge?, completed_at, metrics? }
 * where metrics (optional, for challenges) = { completion_rate, streak, completion_count, expected }
 */
export function FinishedList({ items, emptyText = 'Aún no hay elementos finalizados.' }) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-[#71717A]">{emptyText}</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Card key={item.id} className="border-[#E4E4E7]">
          <CardContent className="p-3 flex items-start gap-3">
            <CheckCircle2 size={18} className="text-[#22C55E] mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-[#18181B] leading-snug">{item.title}</p>
                {item.badge && (
                  <Badge variant="outline" className="text-[11px]">{item.badge}</Badge>
                )}
              </div>
              {item.subtitle && (
                <p className="text-xs text-[#71717A] mt-0.5 italic line-clamp-2">{item.subtitle}</p>
              )}
              {item.metrics && (
                <div className="flex items-center gap-3 text-xs mt-1.5">
                  <Badge variant="outline" className="font-medium">
                    {item.metrics.completion_rate ?? 0}% cumplimiento
                  </Badge>
                  <span className="flex items-center gap-1 text-[#71717A]">
                    <Flame size={13} className="text-[#F97316]" />
                    {item.metrics.streak ?? 0}
                  </span>
                  <span className="text-[#71717A]">
                    {item.metrics.completion_count ?? 0}/{item.metrics.expected ?? 0}
                  </span>
                </div>
              )}
            </div>
            <span className="flex items-center gap-1 text-xs text-[#71717A] shrink-0">
              <CalendarCheck size={13} />
              {formatDate(item.completed_at)}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
