import { Badge } from '../../../../components/ui/badge';
import { formatStatLabel } from '../../../../lib/statUtils';

export function getBodyCheckinStatChanges(checkin) {
  const changes = checkin?.note_analysis?.stat_changes || {};
  return Object.entries(changes)
    .map(([stat, value]) => [stat, Number(value)])
    .filter(([, value]) => Number.isFinite(value) && value !== 0);
}

export function BodyCheckinStatChanges({
  checkin,
  statsInfo = {},
  title = 'Evolución de stats',
  showEmpty = false,
}) {
  const changes = getBodyCheckinStatChanges(checkin);

  if (changes.length === 0) {
    if (!showEmpty) return null;
    return (
      <div className="space-y-1" data-testid="body-checkin-stat-changes-empty">
        {title && <p className="text-xs font-medium text-muted-foreground">{title}</p>}
        <p className="text-xs text-muted-foreground">Sin cambios de stats.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1" data-testid="body-checkin-stat-changes">
      {title && <p className="text-xs font-medium text-muted-foreground">{title}</p>}
      <div className="flex flex-wrap gap-1">
        {changes.map(([stat, value]) => {
          const isPositive = value > 0;
          return (
            <Badge
              key={stat}
              variant="outline"
              className={
                isPositive
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
              }
            >
              {formatStatLabel(stat, statsInfo)} {isPositive ? '+' : ''}
              {value}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
