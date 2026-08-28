import { useEffect, useState } from 'react';
import { Check, HeartHandshake } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { healthPracticesApi, healthReportApi } from '../../lib/api';

const DIMENSIONS = {
  activity: 'Actividad', recovery: 'Recuperación', nutrition: 'Nutrición',
  composition: 'Composición', followup: 'Seguimiento',
};
const SOURCES = {
  activity: 'actividad', task: 'tarea', note: 'nota', checkin: 'check-in corporal',
  practice_application: 'práctica realizada',
};
const EVIDENCE = {
  general: 'General', isolated: 'Puntual', repeated: 'Repetido',
  supported: 'Respaldado', user_flagged: 'Confirmado por ti',
};

function EvidenceMeta({ action }) {
  const sources = (action.source_types || []).map((source) => SOURCES[source] || source);
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <Badge variant="outline">{DIMENSIONS[action.dimension] || action.dimension}</Badge>
      <Badge variant="secondary">
        {action.origin === 'generic' ? 'Práctica general' : 'Basada en tu historia'}
      </Badge>
      {action.evidence_tier && (
        <span>Evidencia: {EVIDENCE[action.evidence_tier] || action.evidence_tier}</span>
      )}
      {sources.length > 0 && <span>Origen: {sources.join(', ')}</span>}
      {(action.dates || []).length > 0 && <span>Fechas: {action.dates.join(', ')}</span>}
    </div>
  );
}

export default function HealthPracticeCandidates({ reportId, candidates = [] }) {
  const [adopted, setAdopted] = useState({});
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!reportId || candidates.length === 0) return;
    let cancelled = false;
    healthPracticesApi.list(3650)
      .then((response) => {
        if (cancelled) return;
        const rows = response?.data?.practices || [];
        const next = {};
        rows.forEach((practice) => {
          if (practice.origin_report_id === reportId && practice.origin_action_id) {
            next[practice.origin_action_id] = practice;
          }
          // A practice is idempotent across reports. Its first provenance is
          // retained by backend, so a later report must also recognise the
          // same server-owned instruction instead of offering it as new after
          // a reload.
          candidates.forEach((action) => {
            if (
              practice.dimension === action.dimension
              && practice.instruction === action.instruction
            ) {
              next[action.action_id] = practice;
            }
          });
        });
        setAdopted(next);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [reportId, candidates]);

  if (candidates.length === 0) return null;

  const adopt = async (action) => {
    if (!reportId || adopted[action.action_id]) return;
    setSaving(action.action_id);
    setError('');
    try {
      const response = await healthReportApi.adoptAction(reportId, action.action_id);
      setAdopted((current) => ({ ...current, [action.action_id]: response.data }));
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || 'No se pudo adoptar esta práctica.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card data-testid="health-report-practices">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HeartHandshake className="h-4 w-4" /> Acciones para apoyar tu objetivo de salud
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {candidates.map((action) => {
          const isAdopted = Boolean(adopted[action.action_id]);
          return (
            <div key={action.action_id} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{action.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{action.instruction}</p>
                </div>
                <Button
                  size="sm"
                  variant={isAdopted ? 'secondary' : 'outline'}
                  disabled={!reportId || isAdopted || saving === action.action_id}
                  onClick={() => adopt(action)}
                  data-testid={`health-action-adopt-${action.action_id}`}
                >
                  {isAdopted ? <><Check className="mr-1 h-3.5 w-3.5" /> Adoptada</> :
                    saving === action.action_id ? 'Adoptando…' : 'Adoptar práctica'}
                </Button>
              </div>
              {action.goal_alignment && (
                <p className="text-xs text-muted-foreground">{action.goal_alignment}</p>
              )}
              <EvidenceMeta action={action} />
            </div>
          );
        })}
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
