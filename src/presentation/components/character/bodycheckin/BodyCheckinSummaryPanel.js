import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';

const LOW_SAMPLE_STATUSES = new Set(['isolated', 'initial_signal', 'trend_weak']);

const METRICS = [
  { key: 'avg_sleep_hours', label: 'Sueño medio', suffix: ' h' },
  { key: 'avg_sleep_quality', label: 'Calidad sueño', suffix: '/5' },
  { key: 'avg_energy', label: 'Energía media', suffix: '/5' },
  { key: 'avg_stress', label: 'Estrés medio', suffix: '/5' },
  { key: 'avg_fatigue', label: 'Fatiga media', suffix: '/5' },
];

/**
 * Resumen corporal 7/30 días: medias, días con ejercicio y aviso de muestra
 * baja. Lenguaje de coincidencia temporal, nunca causal ni diagnóstico.
 */
export function BodyCheckinSummaryPanel({ summary, days = 7, onDaysChange }) {
  const data = summary?.summary || {};
  const records = data.records || 0;

  return (
    <Card data-testid="body-checkin-summary">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Resumen corporal</CardTitle>
          <div className="flex gap-1">
            {[7, 30].map((option) => (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={days === option ? 'default' : 'outline'}
                onClick={() => onDaysChange?.(option)}
              >
                {option}d
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {records === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin registros corporales en esta ventana todavía.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {METRICS.map(({ key, label, suffix }) =>
                data[key] != null ? (
                  <div key={key}>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold">{data[key]}{suffix}</p>
                  </div>
                ) : null
              )}
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Días con ejercicio</p>
                <p className="text-lg font-bold">{data.exercise_days ?? 0}</p>
              </div>
            </div>
            {(data.top_signals || []).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {data.top_signals.map((signal) => (
                  <Badge key={signal.signal} variant="secondary">
                    {signal.signal} ×{signal.count}
                  </Badge>
                ))}
              </div>
            )}
            {LOW_SAMPLE_STATUSES.has(data.sample_status) && (
              <p className="text-xs text-muted-foreground" data-testid="body-low-sample-warning">
                Muestra pequeña: tómalo como una señal inicial, no como una conclusión.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
