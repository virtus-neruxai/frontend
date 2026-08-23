import { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Loader2 } from 'lucide-react';
import { meApi } from '../../../lib/api';
import { FEATURE_LABELS, PLAN_LABELS, PERIOD_LABELS } from '../../../lib/quotaError';

const formatCycleDate = (isoString) => {
  if (!isoString) return null;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
};

const humanizeFeatureKey = (key) =>
  key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const featureLabel = (key) => {
  const [, noun] = FEATURE_LABELS[key] || [];
  return noun
    ? noun.charAt(0).toUpperCase() + noun.slice(1)
    : humanizeFeatureKey(key);
};

// FeatureUsageResponse only carries `upgrade_limit` (a number), not a plan
// id — the ladder is fixed, so the "next" plan is derivable from the user's
// current one without the backend needing to repeat it on every feature row.
const NEXT_PLAN = { free: 'plus', plus: 'pro' };

/**
 * Urgent-first, then "not on this plan" (upsell), then unlimited last — a
 * usage screen's job is triage, not an alphabetical inventory.
 */
const sortKey = (feature) => {
  if (feature.limit === null || feature.limit === undefined) return [2, 0];
  if (feature.limit === 0) return [1, 0];
  const fraction = feature.limit > 0 ? (feature.remaining ?? 0) / feature.limit : 0;
  return [0, fraction];
};

const orderFeatures = (features) => {
  const entries = Object.values(features || {});
  const quota = entries
    .filter((f) => f.enforcement !== 'scheduler')
    .sort((a, b) => {
      const [tierA, fractionA] = sortKey(a);
      const [tierB, fractionB] = sortKey(b);
      return tierA !== tierB ? tierA - tierB : fractionA - fractionB;
    });
  const scheduler = entries.filter((f) => f.enforcement === 'scheduler');
  return { quota, scheduler };
};

function QuotaFeatureRow({ feature, plan }) {
  const label = featureLabel(feature.feature);

  if (feature.limit === null || feature.limit === undefined) {
    return (
      <div className="flex items-center justify-between py-2 border-b last:border-0">
        <span className="text-sm text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">Ilimitado</span>
      </div>
    );
  }

  if (feature.limit === 0) {
    // Only claim an upgrade helps when the next plan actually raises the
    // limit — `upgrade_limit` is the only signal the backend sends for that.
    const upgrade = feature.upgrade_limit ? PLAN_LABELS[NEXT_PLAN[plan]] : null;
    return (
      <div className="py-2 border-b last:border-0 opacity-60">
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">{label}</span>
          <span className="text-xs text-muted-foreground">No disponible</span>
        </div>
        {upgrade && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Disponible en el plan {upgrade}.
          </p>
        )}
      </div>
    );
  }

  const pct = feature.limit > 0 ? Math.min(100, (feature.used / feature.limit) * 100) : 0;
  const when = PERIOD_LABELS[feature.period] || 'en este periodo';
  const resets = formatCycleDate(feature.resets_at);

  return (
    <div className="py-2 border-b last:border-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">
          {feature.used} / {feature.limit} · {when}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${pct}%` }}
        />
      </div>
      {resets && (
        <p className="text-xs text-muted-foreground mt-1">Se renueva el {resets}.</p>
      )}
    </div>
  );
}

function SchedulerFeatureRow({ feature }) {
  const label = featureLabel(feature.feature);
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-sm text-foreground">{label}</span>
      <span className="text-xs text-muted-foreground">
        {feature.enabled ? 'Incluido en tu plan' : 'No incluido en tu plan'}
      </span>
    </div>
  );
}

export function UsageDialog({ open, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await meApi.getEntitlements();
      setData(response.data);
    } catch (err) {
      setError('No se pudo cargar tu uso. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const { quota, scheduler } = orderFeatures(data?.features);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80dvh] overflow-y-auto" data-testid="usage-dialog">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle style={{ fontFamily: 'var(--font-heading)' }}>Uso</DialogTitle>
            {data && (
              <Badge variant="secondary" className="text-xs">
                {PLAN_LABELS[data.plan] || data.plan}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground motion-reduce:animate-none" />
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={load}>
              Reintentar
            </Button>
          </div>
        )}

        {!loading && !error && data && (
          <div className="flex flex-col gap-4 mt-1">
            {(data.cycle_start || data.cycle_end) && (
              <p className="text-xs text-muted-foreground">
                Ciclo: {formatCycleDate(data.cycle_start)} – {formatCycleDate(data.cycle_end)}
              </p>
            )}

            {quota.length > 0 && (
              <div>
                {quota.map((feature) => (
                  <QuotaFeatureRow key={feature.feature} feature={feature} plan={data.plan} />
                ))}
              </div>
            )}

            {scheduler.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">
                  Automatizaciones
                </p>
                {scheduler.map((feature) => (
                  <SchedulerFeatureRow key={feature.feature} feature={feature} />
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
