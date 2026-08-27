import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { healthActivitiesApi, healthLibraryApi } from '../../lib/api';
import { apiErrorMessage } from '../../lib/quotaError';
import {
  localDateKey,
  splitGroups,
  stripDerivedDetails,
} from '../../lib/healthRecords';
import { useHealthActivities } from './useHealthActivities';

function daysBefore(day, amount) {
  const date = new Date(`${day}T12:00:00`);
  date.setDate(date.getDate() - amount);
  return localDateKey(date);
}

export function useNutritionRecords(selectedDate) {
  const records = useHealthActivities({
    fromDate: daysBefore(selectedDate, 29),
    toDate: selectedDate,
    activityType: 'nutrition',
  });
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const { data } = await healthActivitiesApi.getSummary({
        from_date: selectedDate,
        to_date: selectedDate,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setSummary(data);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'No se pudieron cargar los totales del día.'));
    } finally {
      setSummaryLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

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
          activity_type: 'nutrition',
          // Snapshot the canonical response: it carries server-resolved grams
          // and owned food keys. The submitted draft is not authoritative.
          details: stripDerivedDetails(created.details),
        });
        templateSaved = true;
        toast.success('Plantilla guardada');
      } catch (error) {
        toast.error('Registro guardado, pero no se pudo guardar la plantilla.');
      }
    }

    await loadSummary();
    return { record: created, templateSaved };
  }, [loadSummary, records]);

  const update = useCallback(async (id, payload) => {
    const result = await records.update(id, {
      ...payload,
      details: stripDerivedDetails(payload.details),
    });
    if (result) await loadSummary();
    return result;
  }, [loadSummary, records]);

  const remove = useCallback(async (id) => {
    await records.remove(id);
    await loadSummary();
  }, [loadSummary, records]);

  const mealsForDay = useMemo(
    () => records.activities.filter((entry) => localDateKey(entry.observed_at) === selectedDate),
    [records.activities, selectedDate],
  );

  const daySummary = useMemo(
    () => summary?.days?.find((day) => day.date === selectedDate) || null,
    [selectedDate, summary],
  );

  return {
    ...records,
    mealsForDay,
    history: records.activities,
    summary,
    daySummary,
    summaryLoading,
    save,
    update,
    remove,
    reloadSummary: loadSummary,
  };
}
