import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { healthGoalApi } from '../../lib/api';

/**
 * The health goal the person declared — one live goal, or none.
 *
 * `null` is a first-class state, not a loading artefact: most accounts have
 * never declared a goal, and the UI has to be able to say so rather than show
 * an empty field that looks like something failed to load.
 *
 * `expected_revision` travels on every save, so a tab left open for a week
 * gets a 409 instead of silently replacing what was written elsewhere — the
 * same contract as a health activity PATCH.
 */
export const useHealthGoal = () => {
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await healthGoalApi.get();
      setGoal(data || null);
      return data || null;
    } catch {
      toast.error('No se pudo cargar tu objetivo de salud');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const save = useCallback(async (statement, trackedDimensions) => {
    setSaving(true);
    try {
      const { data } = await healthGoalApi.set({
        statement,
        tracked_dimensions: trackedDimensions,
        expected_revision: goal?.revision ?? null,
      });
      setGoal(data);
      return data;
    } catch (error) {
      if (error?.response?.status === 409) {
        // Someone else already moved it. Reloading is the only honest recovery:
        // retrying with the stale revision would overwrite whatever they wrote.
        toast.error('Tu objetivo cambió en otro sitio. Se ha recargado.');
        await reload();
        return null;
      }
      toast.error('No se pudo guardar el objetivo');
      return null;
    } finally {
      setSaving(false);
    }
  }, [goal, reload]);

  const clear = useCallback(async () => {
    setSaving(true);
    try {
      await healthGoalApi.clear();
      setGoal(null);
      return true;
    } catch {
      toast.error('No se pudo borrar el objetivo');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  return { goal, loading, saving, reload, save, clear };
};
