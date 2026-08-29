import { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, RefreshCw, Sparkles } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';

const INITIAL_VISIBLE = 5;

const EVIDENCE_TIER_STYLE = {
  general: { label: 'General', className: 'text-muted-foreground border-border' },
  isolated: { label: 'Puntual', className: 'text-muted-foreground border-border' },
  repeated: { label: 'Repetido', className: 'text-foreground border-input' },
  supported: { label: 'Respaldado', className: 'text-primary border-primary/40 bg-primary/5' },
  user_flagged: { label: 'Confirmado por ti', className: 'text-primary border-primary/40 bg-primary/10' },
};

const SOURCE_TYPE_LABEL = {
  activity: 'actividad',
  task: 'tarea',
  note: 'nota',
  checkin: 'check-in corporal',
  practice_application: 'práctica realizada',
  reflection: 'reflexión',
};

function formatDate(value) {
  const day = String(value || '').slice(0, 10);
  if (!day) return '';
  const parsed = new Date(`${day}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function reportPeriod(signal) {
  const start = formatDate(signal.period_start);
  const end = formatDate(signal.period_end);
  if (start && end) return `${start} – ${end}`;
  return end || start;
}

function EvidenceBadge({ tier }) {
  const style = EVIDENCE_TIER_STYLE[tier] || EVIDENCE_TIER_STYLE.general;
  return <Badge variant="outline" className={style.className}>{style.label}</Badge>;
}

function LoadingPanel() {
  return (
    <section
      className="rounded-[8px] border bg-card p-5"
      data-testid="positive-health-signals-loading"
      aria-label="Cargando señales positivas de salud"
    >
      <div className="h-5 w-72 max-w-full animate-pulse rounded bg-muted" />
      <div className="mt-4 space-y-3">
        <div className="h-20 animate-pulse rounded bg-muted" />
        <div className="h-20 animate-pulse rounded bg-muted" />
      </div>
    </section>
  );
}

export function PositiveHealthSignalsPanel({ data, loading, error, onRetry }) {
  const [expanded, setExpanded] = useState(false);

  if (loading) return <LoadingPanel />;

  if (error) {
    return (
      <section className="rounded-[8px] border bg-card p-5" data-testid="positive-health-signals-error">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <Sparkles size={16} className="text-muted-foreground" />
          Lo que tu propia historia también demuestra
        </h3>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed p-3">
          <p className="flex items-center gap-2 text-sm text-muted-foreground" role="alert">
            <AlertCircle size={15} /> {error}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs text-foreground hover:bg-muted"
          >
            <RefreshCw size={12} /> Reintentar
          </button>
        </div>
      </section>
    );
  }

  const signals = data?.signals || [];
  if (signals.length === 0) return null;

  const visibleSignals = expanded ? signals : signals.slice(0, INITIAL_VISIBLE);
  const hiddenCount = Math.max(0, signals.length - INITIAL_VISIBLE);

  return (
    <section className="rounded-[8px] border bg-card p-5" data-testid="positive-health-signals-panel">
      <h3 className="flex items-center gap-2 text-base font-semibold">
        <Sparkles size={16} className="text-muted-foreground" />
        Lo que tu propia historia también demuestra
      </h3>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">
        Señales de tus informes con evidencia en los últimos {data?.days || 30} días.
      </p>

      <div className="divide-y divide-border">
        {visibleSignals.map((signal) => {
          const evidenceDates = (signal.dates || []).map(formatDate).filter(Boolean);
          const sources = (signal.source_types || [])
            .map((source) => SOURCE_TYPE_LABEL[source] || source)
            .join(', ');
          const period = reportPeriod(signal);
          const createdAt = formatDate(signal.source_report_created_at);

          return (
            <article key={signal.signal_key} className="py-3 first:pt-0 last:pb-0">
              <p className="text-sm text-foreground">{signal.claim}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                <EvidenceBadge tier={signal.evidence_tier} />
                <span>{signal.citation_count} {signal.citation_count === 1 ? 'cita' : 'citas'}</span>
                {sources && <span>Origen: {sources}</span>}
                {evidenceDates.length > 0 ? (
                  <span>Fechas: {evidenceDates.join(', ')}</span>
                ) : signal.date_basis === 'report_period' ? (
                  <span>Fechas no disponibles en este informe histórico</span>
                ) : null}
              </div>
              {(period || createdAt) && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {period && <>Periodo: {period}</>}
                  {period && createdAt && <> · </>}
                  {createdAt && <>Informe del {createdAt}</>}
                </p>
              )}
            </article>
          );
        })}
      </div>

      {hiddenCount > 0 && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? 'Ver menos' : `Ver todas (${signals.length})`}
        </button>
      )}
    </section>
  );
}
