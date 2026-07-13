import { Badge } from '../../../components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import { formatStatLabel } from '../../../lib/statUtils';
import { SEMANTIC_COLORS } from '../../../theme/semanticTokens';

export function StatRewardsChips({ rewards, statsInfo = {}, label = 'Incrementa', className = '' }) {
  const entries = Object.entries(rewards || {}).filter(([, value]) => Number(value) !== 0);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: SEMANTIC_COLORS.success }} strokeWidth={1.5} />
      {label && (
        <span className="text-xs font-medium text-muted-foreground">{label}:</span>
      )}
      <div className="flex gap-1 flex-wrap">
        {entries.map(([stat, value]) => (
          <Badge
            key={stat}
            variant="outline"
            className="text-xs"
            style={{ color: SEMANTIC_COLORS.success, borderColor: SEMANTIC_COLORS.success }}
          >
            +{value} {formatStatLabel(stat, statsInfo)}
          </Badge>
        ))}
      </div>
    </div>
  );
}
