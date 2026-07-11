import { Compass, Fingerprint, Quote, Sparkles, Telescope } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';

function Skeleton({ className }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

const LENS_CONFIG = {
  identity: {
    label: 'Identidad',
    description: 'Quién estás intentando llegar a ser.',
    icon: Fingerprint,
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  direction: {
    label: 'Dirección',
    description: 'Hacia dónde apunta tu energía.',
    icon: Compass,
    color: 'text-[hsl(var(--info))]',
    bg: 'bg-[hsl(var(--info-soft))]',
  },
  transcendence: {
    label: 'Trascendencia',
    description: 'Qué sentido mayor sostiene el esfuerzo.',
    icon: Sparkles,
    color: 'text-[hsl(var(--virtus-secondary))]',
    bg: 'bg-secondary',
  },
};

function formatUpdatedAt(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

function LensCard({ lens, index }) {
  const config = LENS_CONFIG[lens.lens_type] || {
    label: lens.lens_type || 'Lens',
    description: 'Lectura semántica de tu misión.',
    icon: Telescope,
    color: 'text-muted-foreground',
    bg: 'bg-muted',
  };
  const Icon = config.icon;
  const confidence = Math.round((lens.confidence || 0) * 100);

  return (
    <article
      className="rounded-lg border bg-background/60 p-4"
      data-testid={`mission-lens-${lens.lens_type || 'unknown'}-${index}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.bg}`}>
            <Icon size={16} className={config.color} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{config.label}</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
        </div>
        {confidence > 0 && (
          <Badge variant="outline" className="shrink-0 text-xs">
            {confidence}%
          </Badge>
        )}
      </div>
      <p className="text-sm leading-relaxed text-foreground">{lens.text}</p>
      {lens.source_excerpt && (
        <p className="mt-3 border-l-2 border-border pl-3 text-xs italic text-muted-foreground line-clamp-2">
          “{lens.source_excerpt}”
        </p>
      )}
    </article>
  );
}

export function MissionLensesPanel({ data, loading }) {
  if (loading) {
    return (
      <section className="rounded-[8px] border bg-card p-5" data-testid="mission-lenses-panel">
        <div className="mb-4 flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1">
            <Skeleton className="mb-2 h-5 w-40" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </section>
    );
  }

  const lenses = Array.isArray(data?.lenses) ? data.lenses : [];
  const hasStatement = Boolean(data?.mission_statement);
  if (!hasStatement && lenses.length === 0) return null;

  const updatedAt = formatUpdatedAt(data?.updated_at);

  return (
    <section className="rounded-[8px] border bg-card p-5" data-testid="mission-lenses-panel">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Telescope size={18} className="text-primary" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold">Lentes de misión</h3>
              <Badge variant="outline" className="text-xs">
                {lenses.length} {lenses.length === 1 ? 'lente' : 'lentes'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Lecturas semánticas que el Mentor usa como brújula para orientar tareas, misiones y consejo.
            </p>
          </div>
        </div>
        {updatedAt && (
          <span className="text-xs text-muted-foreground sm:pt-1">
            Actualizado: {updatedAt}
          </span>
        )}
      </div>

      {hasStatement && (
        <div className="mb-4 rounded-lg border bg-muted/30 p-3">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Quote size={13} />
            Enunciado base
          </div>
          <p className="text-sm text-foreground line-clamp-3">{data.mission_statement}</p>
        </div>
      )}

      {lenses.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {lenses.map((lens, index) => (
            <LensCard key={lens.id || `${lens.lens_type}-${index}`} lens={lens} index={index} />
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Tu misión ya está indexada, pero todavía no hay lentes semánticas extraídas.
        </p>
      )}
    </section>
  );
}
