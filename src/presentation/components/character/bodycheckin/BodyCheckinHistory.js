import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { BodyCheckinStatChanges } from './BodyCheckinStatChanges';

function metricSummary(item) {
  const parts = [];
  if (item.sleep_hours != null) parts.push(`sueño ${item.sleep_hours}h`);
  if (item.energy_level != null) parts.push(`energía ${item.energy_level}/5`);
  if (item.stress_level != null) parts.push(`estrés ${item.stress_level}/5`);
  if (item.fatigue_level != null) parts.push(`fatiga ${item.fatigue_level}/5`);
  if (item.exercise_done != null) parts.push(item.exercise_done ? 'ejercicio ✓' : 'sin ejercicio');
  return parts.join(' · ');
}

/**
 * Historial de registros corporales (solo lectura, más recientes primero).
 * No expone acciones de edición ni borrado: el check-in del día es inmutable.
 */
export function BodyCheckinHistory({ items = [], statsInfo = {} }) {
  return (
    <Card data-testid="body-checkin-history">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Historial de registros</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay check-ins corporales.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id || item.checkin_date} className="border-b border-border/50 pb-2 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.checkin_date}</span>
                  {item.note_analysis?.stat_changes && (
                    <span className="text-xs text-muted-foreground">nota analizada</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{metricSummary(item)}</p>
                {item.note && (
                  <p className="text-sm mt-1 italic text-foreground/90">&ldquo;{item.note}&rdquo;</p>
                )}
                <div className="mt-2">
                  <BodyCheckinStatChanges
                    checkin={item}
                    statsInfo={statsInfo}
                    title={null}
                    showEmpty={Boolean(item.note_analysis)}
                  />
                </div>
                {(item.derived_signals || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.derived_signals.map((signal) => (
                      <Badge key={signal} variant="outline" className="text-[10px]">
                        {signal}
                      </Badge>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
