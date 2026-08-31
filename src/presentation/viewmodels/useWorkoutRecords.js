import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { healthLibraryApi } from '../../lib/api';
import { apiErrorMessage } from '../../lib/quotaError';
import { splitGroups, stripDerivedDetails } from '../../lib/healthRecords';
import { useHealthActivities } from './useHealthActivities';

export function useWorkoutRecords() {
  const records = useHealthActivities();

  const save = useCallback(async ({ payload, templateId = null, saveAsTemplate = null }) => {
    const cleanPayload = { ...payload, details: stripDerivedDetails(payload.details) };
    let created = null;

    if (templateId) {
      try {
        const { data } = await healthLibraryApi.templates.apply(templateId, {
          activity_title: cleanPayload.title,
          observed_at: cleanPayload.observed_at,
          timezone: cleanPayload.timezone,
          note: cleanPayload.note,
          details: cleanPayload.details,
        });
        created = data;
        toast.success('Registro guardado');
        await records.reload();
      } catch (error) {
        toast.error(apiErrorMessage(error, 'No se pudo aplicar la plantilla.'));
        return { record: null, templateSaved: false };
      }
    } else {
      created = await records.create(cleanPayload);
    }

    if (!created) return { record: null, templateSaved: false };

    let templateSaved = false;
    if (saveAsTemplate?.title?.trim()) {
      try {
        await healthLibraryApi.templates.create({
          title: saveAsTemplate.title.trim(),
          groups: splitGroups(saveAsTemplate.groups),
          activity_type: 'training',
          // Persist the server-normalized exercise keys/sets, with derived
          // volume/pace removed, rather than snapshotting the client draft.
          details: stripDerivedDetails(created.details),
        });
        templateSaved = true;
        toast.success('Plantilla guardada');
      } catch (error) {
        toast.error('Registro guardado, pero no se pudo guardar la plantilla.');
      }
    }

    return { record: created, templateSaved };
  }, [records]);

  const update = useCallback((id, payload) => records.update(id, {
    ...payload,
    details: stripDerivedDetails(payload.details),
  }), [records]);

  const sessions = useMemo(
    () => records.activities.filter((entry) => ['strength', 'endurance'].includes(entry.details?.kind)),
    [records.activities],
  );
  const measurements = useMemo(
    () => records.activities.filter((entry) => entry.details?.kind === 'measurement'),
    [records.activities],
  );

  return {
    ...records,
    sessions,
    measurements,
    save,
    update,
  };
}
