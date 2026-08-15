import { Compass } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';

// §5.1 — exact legend that must accompany a published percentage.
const ALIGNMENT_LEGEND = 'Metáfora de alineación; no medición neuronal o clínica.';

const LENS_LABELS = {
  identity: 'Identidad',
  direction: 'Dirección',
  transcendence: 'Trascendencia',
};

/**
 * §6.4 — Brújula general. Every number here is server-computed (§9.3); this
 * component never derives a percentage on its own, only formats what the API
 * already decided to publish (or "Datos insuficientes" when it didn't).
 */
export default function GeneralCompassCard({ alignment, bodyContextSummary, missionLensRefs, contributingProfiles }) {
  // services/center_alignment.py::compute_alignment's literal is "published",
  // not "available" — kept in sync with models/api.py::CenterAlignmentResponse.
  const available = alignment?.status === 'published';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <Compass className="h-5 w-5 text-primary" aria-hidden="true" />
        <CardTitle className="text-base">Brújula general</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          {available ? (
            <>
              <span>Sincronía {alignment.synchrony_percent}%</span>
              <span className="text-muted-foreground">·</span>
              <span>Desfase {alignment.desynchrony_percent}%</span>
            </>
          ) : (
            <Badge variant="secondary">Datos insuficientes</Badge>
          )}
          <span className="text-muted-foreground">
            · Cobertura {alignment?.coverage_axes ?? 0}/{alignment?.total_axes ?? 5}
          </span>
          {alignment?.needs_refresh && (
            <Badge variant="outline" aria-live="polite">Pendiente de incorporar tus notas</Badge>
          )}
        </div>

        {missionLensRefs?.length > 0 && (
          <p className="text-muted-foreground">
            Centro: {missionLensRefs.map((lens) => LENS_LABELS[lens] || lens).join(' · ')}
          </p>
        )}

        {contributingProfiles?.length > 0 && (
          <p className="text-muted-foreground">
            Perfiles con registros en esta ventana: {contributingProfiles.join(', ')}
          </p>
        )}

        {bodyContextSummary && (
          <p className="text-muted-foreground">
            Contexto corporal: {bodyContextSummary.sample_status}
            {bodyContextSummary.top_signals?.length > 0
              ? ` — ${bodyContextSummary.top_signals.join(', ')}`
              : ''}
          </p>
        )}

        <p className="text-xs text-muted-foreground">{ALIGNMENT_LEGEND}</p>
      </CardContent>
    </Card>
  );
}
