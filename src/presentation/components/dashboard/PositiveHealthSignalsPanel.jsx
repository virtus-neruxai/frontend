import { useState } from 'react';
import {
  AlertCircle, Brain, ChevronDown, ChevronUp, ClipboardCheck, Dumbbell,
  HeartPulse, Moon, RefreshCw, Ruler, Sparkles, Utensils,
} from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../../components/ui/select';

const INITIAL_VISIBLE = 5;
const DEFAULT_RANGE_OPTIONS = [
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
];

const EVIDENCE_TIER_STYLE = {
  general: {
    label: 'General', description: 'Lectura general sin evidencia personal suficiente.',
    className: 'text-muted-foreground border-border',
  },
  isolated: {
    label: 'Puntual', description: 'Señal inicial: menos de cuatro registros o menos de tres fechas.',
    className: 'text-muted-foreground border-border',
  },
  repeated: {
    label: 'Repetido', description: 'Aparece en cuatro o más registros distribuidos en al menos tres fechas.',
    className: 'text-foreground border-input',
  },
  supported: {
    label: 'Respaldado', description: 'La repetición también está apoyada por una nota compatible.',
    className: 'text-primary border-primary/40 bg-primary/5',
  },
  user_flagged: {
    label: 'Confirmado por ti', description: 'La evidencia incluye una nota escrita o confirmada por ti.',
    className: 'text-primary border-primary/40 bg-primary/10',
  },
};

const SOURCE_TYPE_LABEL = {
  activity: 'registros de salud',
  task: 'tareas',
  note: 'notas',
  checkin: 'check-ins corporales',
  practice_application: 'prácticas realizadas',
  reflection: 'reflexiones',
};

const AREA_CONFIG = {
  activity: {
    label: 'Actividad', Icon: Dumbbell,
    className: 'border-primary/30 bg-primary/10 text-primary',
  },
  recovery: {
    label: 'Recuperación', Icon: Moon,
    className: 'border-[hsl(var(--info))]/30 bg-[hsl(var(--info-soft))] text-[hsl(var(--info))]',
  },
  nutrition: {
    label: 'Nutrición', Icon: Utensils,
    className: 'border-secondary-foreground/20 bg-secondary text-secondary-foreground',
  },
  composition: {
    label: 'Composición', Icon: Ruler,
    className: 'border-border bg-muted text-foreground',
  },
  mental_wellbeing: {
    label: 'Bienestar mental', Icon: Brain,
    className: 'border-primary/20 bg-primary/5 text-primary',
  },
  followup: {
    label: 'Seguimiento', Icon: ClipboardCheck,
    className: 'border-border bg-muted text-muted-foreground',
  },
};

const GENERIC_AREA = {
  label: 'Salud', Icon: HeartPulse,
  className: 'border-border bg-muted text-muted-foreground',
};

const PANEL_CLASS = 'rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm';

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
  return (
    <Badge variant="outline" className={style.className} title={style.description}>
      {style.label}
    </Badge>
  );
}

function joinHuman(values) {
  if (values.length <= 1) return values[0] || '';
  return `${values.slice(0, -1).join(', ')} y ${values.at(-1)}`;
}

function formatEvidenceDates(values) {
  const parsed = values
    .map((value) => String(value || '').slice(0, 10))
    .map((value) => ({ raw: value, date: new Date(`${value}T00:00:00`) }))
    .filter(({ date: parsedDate }) => !Number.isNaN(parsedDate.getTime()));
  if (parsed.length === 0) return '';

  const monthYears = new Set(parsed.map(({ date: parsedDate }) => (
    `${parsedDate.getFullYear()}-${parsedDate.getMonth()}`
  )));
  if (monthYears.size === 1) {
    const reference = parsed[0].date;
    const month = reference.toLocaleDateString('es-ES', { month: 'short' });
    return `${joinHuman(parsed.map(({ date: parsedDate }) => String(parsedDate.getDate())))} ${month} ${reference.getFullYear()}`;
  }
  return joinHuman(parsed.map(({ raw }) => formatDate(raw)));
}

function AreaBadges({ dimensions }) {
  const configured = (dimensions || [])
    .map((dimension) => AREA_CONFIG[dimension])
    .filter(Boolean);
  const areas = configured.length > 0 ? configured : [GENERIC_AREA];
  return areas.map(({ label, Icon, className }) => (
    <Badge key={label} variant="outline" className={`gap-1 ${className}`}>
      <Icon size={11} aria-hidden="true" /> {label}
    </Badge>
  ));
}

function RangeSelector({ range, rangeOptions, onRangeChange }) {
  if (!onRangeChange) return null;
  return (
    <Select value={range} onValueChange={onRangeChange}>
      <SelectTrigger
        className="h-8 w-40 rounded-full bg-background/80 text-xs"
        data-testid="positive-health-signals-range"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {rangeOptions.map((option) => (
          <SelectItem key={option.value} value={option.value} className="text-xs">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function LoadingPanel() {
  return (
    <section
      className={PANEL_CLASS}
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

export function PositiveHealthSignalsPanel({
  data,
  loading,
  error,
  range = String(data?.days || 7),
  rangeOptions = DEFAULT_RANGE_OPTIONS,
  onRangeChange,
  onRetry,
}) {
  const [expanded, setExpanded] = useState(false);

  if (loading) return <LoadingPanel />;

  if (error) {
    return (
      <section className={PANEL_CLASS} data-testid="positive-health-signals-error">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Sparkles size={18} />
            </div>
            <h3 className="text-base font-semibold">Lo que tu propia historia también demuestra</h3>
          </div>
          <RangeSelector
            range={range}
            rangeOptions={rangeOptions}
            onRangeChange={onRangeChange}
          />
        </div>
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
  const visibleSignals = expanded ? signals : signals.slice(0, INITIAL_VISIBLE);
  const hiddenCount = Math.max(0, signals.length - INITIAL_VISIBLE);

  return (
    <section className={PANEL_CLASS} data-testid="positive-health-signals-panel">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Sparkles size={19} />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Lo que tu propia historia también demuestra</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Evidencias favorables repetidas que aparecen en tus informes de los últimos {range} días.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {signals.length > 0 && (
            <Badge variant="outline" className="w-fit border-primary/30 bg-background/70 text-primary">
              {signals.length} {signals.length === 1 ? 'señal' : 'señales'}
            </Badge>
          )}
          <RangeSelector
            range={range}
            rangeOptions={rangeOptions}
            onRangeChange={onRangeChange}
          />
        </div>
      </div>

      {signals.length === 0 ? (
        <p
          className="rounded-lg border border-dashed border-primary/20 bg-background/50 px-4 py-6 text-center text-sm text-muted-foreground"
          data-testid="positive-health-signals-empty"
        >
          Aún no hay señales favorables repetidas con fechas verificables en este periodo.
        </p>
      ) : (
      <div className="grid gap-3 md:grid-cols-2">
        {visibleSignals.map((signal) => {
          const evidenceDates = formatEvidenceDates(signal.dates || []);
          const sources = (signal.source_types || [])
            .map((source) => SOURCE_TYPE_LABEL[source] || source)
            .filter(Boolean);
          const period = reportPeriod(signal);
          const createdAt = formatDate(signal.source_report_created_at);
          const evidenceParts = [
            `${signal.citation_count} ${signal.citation_count === 1 ? 'evidencia' : 'evidencias'}`,
            joinHuman(sources),
            evidenceDates,
          ].filter(Boolean);

          return (
            <article
              key={signal.signal_key}
              className="rounded-lg border border-border/80 bg-background/80 p-4 shadow-sm"
              data-testid="positive-health-signal-card"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  <AreaBadges dimensions={signal.dimensions} />
                </div>
                <EvidenceBadge tier={signal.evidence_tier} />
              </div>
              <p className="mt-3 text-sm font-medium leading-relaxed text-foreground">
                {signal.claim}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {evidenceParts.join(' · ')}
              </p>
              {(period || createdAt) && (
                <p className="mt-2 border-t border-border/70 pt-2 text-xs text-muted-foreground">
                  {createdAt && <>Informe del {createdAt}</>}
                  {createdAt && period && <> · </>}
                  {period && <>Periodo: {period}</>}
                </p>
              )}
            </article>
          );
        })}
      </div>
      )}

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
