import { useCallback, useEffect, useState } from 'react';
import { meApi } from '../../lib/api';

/**
 * Whether the current plan allows one feature, and how much of it is left.
 *
 * Reads the same `GET /v1/me/entitlements` the Uso dialog reads. Callers use
 * it to disable a button *visibly* instead of letting the first click fail —
 * the friction is stated up front and the feature is not hidden — but the
 * server answer stays authoritative: this can be stale, so the call site still
 * has to handle a 429.
 *
 * Fails open. If entitlements cannot be read we report the feature as
 * available and let the server decide, because a blocked button on a network
 * hiccup is worse than a rejected request that explains itself.
 */
export function useFeatureQuota(feature) {
  const [usage, setUsage] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await meApi.getEntitlements();
      setUsage(data?.features?.[feature] || null);
      setPlan(data?.plan || null);
    } catch {
      setUsage(null);
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [feature]);

  useEffect(() => { load(); }, [load]);

  const known = usage != null;
  // `limit: 0` is the plan gate; `limit: null` is unlimited.
  const enabled = !known || usage.enabled !== false;
  const exhausted = known && usage.limit != null && usage.limit > 0 && usage.remaining <= 0;

  return {
    loading,
    usage,
    plan,
    enabled,
    exhausted,
    available: enabled && !exhausted,
    upgradeLimit: usage?.upgrade_limit ?? null,
    remaining: usage?.remaining ?? null,
    refresh: load,
  };
}

export default useFeatureQuota;
