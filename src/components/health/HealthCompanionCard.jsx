import { useEffect, useMemo, useState } from 'react';
import { MessageCircleHeart } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { healthReportApi } from '../../lib/api';

export default function HealthCompanionCard({ reportId, report }) {
  const [companion, setCompanion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const actionTitles = useMemo(() => Object.fromEntries(
    (report?.practice_candidates || []).map((action) => [action.action_id, action.title])
  ), [report]);

  const snapshot = report?.health_safety_snapshot;
  const eligible = Boolean(reportId && snapshot?.level && snapshot.level !== 'RED');

  useEffect(() => {
    if (!eligible) return;
    let cancelled = false;
    healthReportApi.getCompanion(reportId)
      .then((response) => !cancelled && setCompanion(response.data?.companion || null))
      .catch((requestError) => {
        if (!cancelled && requestError?.response?.status !== 404) {
          setError('No se pudo recuperar el mensaje guardado.');
        }
      });
    return () => { cancelled = true; };
  }, [eligible, reportId]);

  if (!eligible) return null;

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await healthReportApi.generateCompanion(reportId);
      setCompanion(response.data?.companion || null);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || 'No se pudo generar el mensaje para ti.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card data-testid="health-report-companion">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircleHeart className="h-4 w-4" /> Un mensaje para ti
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {companion ? (
          <>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {companion.message}
            </p>
            {(companion.action_contexts || []).map((context) => (
              <div key={context.action_id} className="rounded-lg border border-border p-3">
                <p className="text-xs font-medium text-foreground">
                  {actionTitles[context.action_id] || 'Acción del informe'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{context.context}</p>
              </div>
            ))}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Puedes generar un mensaje breve que conecte las señales y acciones ya presentes en este informe.
          </p>
        )}
        <Button variant="outline" size="sm" onClick={generate} disabled={loading}>
          {loading ? 'Generando…' : companion ? 'Regenerar mensaje' : 'Generar mensaje'}
        </Button>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
