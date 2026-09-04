import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { healthLibraryApi } from '../../lib/api';
import { apiErrorMessage } from '../../lib/quotaError';
import { collectionItems, splitGroups } from '../../lib/healthRecords';

function sortByUse(entries) {
  return [...entries].sort((left, right) => {
    const usage = Number(right.usage_count || 0) - Number(left.usage_count || 0);
    if (usage) return usage;
    const recent = String(right.last_used_at || '').localeCompare(String(left.last_used_at || ''));
    if (recent) return recent;
    return String(left.label || left.title || '').localeCompare(
      String(right.label || right.title || ''),
      'es',
    );
  });
}

/** One viewmodel for each personal-library resource. */
export function useHealthLibrary(resource, activityType = null) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const endpoint = healthLibraryApi[resource];

  const load = useCallback(async () => {
    if (!endpoint) return;
    setLoading(true);
    try {
      const { data } = await endpoint.getAll(activityType ? { activity_type: activityType } : {});
      setEntries(sortByUse(collectionItems(data).filter((entry) => !entry.deleted_at)));
    } catch (error) {
      toast.error(apiErrorMessage(error, 'No se pudo cargar tu biblioteca de salud.'));
    } finally {
      setLoading(false);
    }
  }, [activityType, endpoint]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (payload, { quiet = false } = {}) => {
    setSaving(true);
    try {
      const { data } = await endpoint.create(payload);
      setEntries((previous) => sortByUse([data, ...previous.filter((entry) => entry.id !== data.id)]));
      if (!quiet) toast.success('Guardado en tu biblioteca');
      return data;
    } catch (error) {
      if (!quiet) toast.error(apiErrorMessage(error, 'No se pudo guardar en tu biblioteca.'));
      return null;
    } finally {
      setSaving(false);
    }
  }, [endpoint]);

  const update = useCallback(async (id, payload) => {
    setSaving(true);
    try {
      const current = entries.find((entry) => entry.id === id);
      const body = payload.expected_revision === undefined && current?.revision != null
        ? { ...payload, expected_revision: current.revision }
        : payload;
      const { data } = await endpoint.update(id, body);
      setEntries((previous) => sortByUse(previous.map((entry) => (entry.id === id ? data : entry))));
      toast.success('Biblioteca actualizada');
      return data;
    } catch (error) {
      if (error.response?.status === 409) {
        toast.error('La plantilla cambió en otra sesión. Se ha recargado la biblioteca.');
        await load();
      } else {
        toast.error(apiErrorMessage(error, 'No se pudo actualizar la biblioteca.'));
      }
      return null;
    } finally {
      setSaving(false);
    }
  }, [endpoint, entries, load]);

  const remove = useCallback(async (id) => {
    try {
      await endpoint.remove(id);
      setEntries((previous) => previous.filter((entry) => entry.id !== id));
      toast.success('Eliminado de tu biblioteca');
      return true;
    } catch (error) {
      toast.error(apiErrorMessage(error, 'No se pudo eliminar de tu biblioteca.'));
      return false;
    }
  }, [endpoint]);

  const groups = useMemo(() => {
    const values = entries.flatMap((entry) => splitGroups(entry.groups));
    return splitGroups(values).sort((left, right) => left.localeCompare(right, 'es'));
  }, [entries]);

  return { entries, groups, loading, saving, reload: load, create, update, remove };
}

