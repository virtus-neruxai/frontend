import { useState } from 'react';
import { Brain, History, Loader2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import HealthGoalSettings from './HealthGoalSettings';
import HealthReportView from './HealthReportView';
import { useHealthReport } from '../../presentation/viewmodels/useHealthReport';

const RANGE_OPTIONS = [
  { value: 7, label: 'Última semana' },
  { value: 14, label: 'Últimas 2 semanas' },
  { value: 30, label: 'Último mes' },
];

function rangeLabel(daysBack) {
  return RANGE_OPTIONS.find((o) => o.value === Number(daysBack))?.label || `Últimos ${daysBack} días`;
}

/**
 * Informe Razonado de Salud. A separate report from the general Mentor's —
 * own generation, own history, own storage — never a tab inside that one
 * (see reasoning-service/services/health_report_store.py).
 */
export default function HealthReportTab() {
  const { report, generating, daysBack, setDaysBack, history, generate, loadHistory, openReport } = useHealthReport();
  const [showHistory, setShowHistory] = useState(false);

  const toggleHistory = () => {
    const next = !showHistory;
    setShowHistory(next);
    if (next) loadHistory();
  };

  return (
    <div className="space-y-4" data-testid="health-report-tab">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Brain className="h-5 w-5" /> Informe de salud
          </h2>
          <p className="text-sm text-muted-foreground">{rangeLabel(daysBack)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={String(daysBack)} onValueChange={(v) => setDaysBack(Number(v))}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={generate} disabled={generating} data-testid="health-report-generate">
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
            Generar informe
          </Button>
          <Button variant="outline" onClick={toggleHistory}>
            <History className="mr-2 h-4 w-4" /> Historial
          </Button>
        </div>
      </div>

      {/* Above the report rather than in Ajustes: the goal only means anything
          next to the reading that measures coverage against it. */}
      <HealthGoalSettings />

      {showHistory && (
        <Card>
          <CardHeader><CardTitle className="text-base">Historial</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay informes de salud generados.</p>
            ) : (
              history.map((r) => (
                <button
                  key={r.report_id}
                  onClick={() => { openReport(r.report_id); setShowHistory(false); }}
                  className="block w-full rounded-md border p-2 text-left text-sm hover:bg-muted"
                >
                  <span className="text-muted-foreground">{(r.created_at || '').slice(0, 16).replace('T', ' ')}</span>
                  <Badge variant="secondary" className="ml-2">{rangeLabel(r.days_back)}</Badge>
                  {r.summary && <span> — {r.summary.slice(0, 90)}</span>}
                </button>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {generating && (
        <Card>
          <CardContent className="flex items-center gap-3 pt-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generando en segundo plano. Puedes navegar con normalidad; aparecerá en el historial al terminar.
          </CardContent>
        </Card>
      )}

      {report?.report_json ? (
        <HealthReportView report={report.report_json} />
      ) : !generating && (
        <Card><CardContent className="pt-6 text-center text-muted-foreground">
          Pulsa <strong>Generar informe</strong> para tu lectura razonada: {rangeLabel(daysBack).toLowerCase()}.
        </CardContent></Card>
      )}
    </div>
  );
}
