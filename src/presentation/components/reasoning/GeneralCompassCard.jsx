import { Compass } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';

// §5.1 — exact legend that must accompany a published percentage.
const ALIGNMENT_LEGEND = 'Metáfora de alineación; no medición neuronal o clínica.';

const LENS_LABELS = {
  identity: 'identidad',
  direction: 'dirección',
  transcendence: 'trascendencia',
};

// backend/services/body_checkins/signals.py::compute_derived_signals — the
// full, closed vocabulary. Sleep quantity and quality are genuinely different
// signals (not a duplicate), so both may legitimately appear together.
const SIGNAL_PHRASES = {
  low_sleep: 'sueño escaso',
  poor_sleep_quality: 'sueño de baja calidad',
  low_energy: 'energía baja',
  high_stress: 'estrés alto',
  high_fatigue: 'fatiga alta',
  exercise_recorded: 'ejercicio registrado',
  no_exercise_recorded: 'sin ejercicio registrado',
};

// services/body_checkins/aggregates.py::_sample_status
const SAMPLE_STATUS_LABELS = {
  no_data: 'sin datos suficientes',
  isolated: 'un solo registro',
  initial_signal: 'muy pocos registros',
  trend_weak: 'pocos registros',
  weekly_basic: 'una semana de registros',
  monthly_reliable: 'un mes de registros',
};

function joinNatural(items) {
  if (items.length <= 1) return items[0] || '';
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

// §6.4 wants a warm sentence ("Centro: identidad · dirección · trascendencia"
// in the doc's own mockup is a starting point, not the ceiling) — and the
// underlying refs can carry the same lens more than once (one per
// contributing anchor), so dedup here is load-bearing, not just tidy.
function lensSummary(lensKeys) {
  const unique = [...new Set(lensKeys || [])];
  if (unique.length === 0) return null;
  const labels = unique.map((key) => LENS_LABELS[key] || key);
  return `Tu centro se apoya en ${joinNatural(labels)} — la base desde la que buscar equilibrio y calma.`;
}

function bodyContextPhrase(summary) {
  if (!summary) return null;
  const statusLabel = SAMPLE_STATUS_LABELS[summary.sample_status] || summary.sample_status;
  const signals = [...new Set(summary.top_signals || [])]
    .map((signal) => SIGNAL_PHRASES[signal] || signal.replace(/_/g, ' '));
  if (signals.length === 0) return `Contexto corporal: ${statusLabel}.`;
  return `Contexto corporal: ${joinNatural(signals)} observados (${statusLabel}).`;
}

/**
 * §6.4 — Brújula general. Every number here is server-computed (§9.3); this
 * component never derives a percentage on its own, only formats what the API
 * already decided to publish (or "Datos insuficientes" when it didn't).
 */
export default function GeneralCompassCard({
  alignment, bodyContextSummary, missionLensRefs, contributingProfiles, centerSummary,
}) {
  // services/center_alignment.py::compute_alignment's literal is "published",
  // not "available" — kept in sync with models/api.py::CenterAlignmentResponse.
  const available = alignment?.status === 'published';
  // centerSummary is the LLM's own synthesis of THIS user's declared center
  // (§9.1) — falls back to the generic lens-list sentence for a center
  // generated before this field existed, or when the model found nothing to
  // synthesize (no declared center).
  const summaryText = centerSummary?.text || lensSummary(missionLensRefs);
  const bodyText = bodyContextPhrase(bodyContextSummary);

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

        {summaryText && <p className="text-muted-foreground">{summaryText}</p>}

        {contributingProfiles?.length > 0 && (
          <p className="text-muted-foreground">
            Perfiles con registros en esta ventana: {contributingProfiles.join(', ')}
          </p>
        )}

        {bodyText && <p className="text-muted-foreground">{bodyText}</p>}

        <p className="text-xs text-muted-foreground">{ALIGNMENT_LEGEND}</p>
      </CardContent>
    </Card>
  );
}
