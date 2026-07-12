import { useCallback, useState } from 'react';
import { bodyCheckinsApi } from '../../lib/api';
import { toast } from 'sonner';

// Fecha lógica local del usuario (el check-in es "del día" en su zona horaria).
export const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const buildBodyCheckinRange = (days) => {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - (parseInt(days, 10) - 1));
  const iso = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { fromDate: iso(from), toDate: iso(to) };
};

/**
 * Estado del Check-in corporal — unidad independiente del Diario.
 *
 * status: 'loading' | 'empty' | 'saved_locked' | 'error'
 * Una vez guardado, el registro del día queda bloqueado (no editable) hasta
 * el día siguiente. Los fallos aquí nunca deben bloquear el Diario: este hook
 * no comparte estado ni payloads con reflections.
 */
export const useBodyCheckin = () => {
  const [status, setStatus] = useState('loading');
  const [todayCheckin, setTodayCheckin] = useState(null);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState(null);
  const [summaryDays, setSummaryDays] = useState(7);
  const [history, setHistory] = useState([]);
  const [evolution, setEvolution] = useState([]);
  const [evolutionLoading, setEvolutionLoading] = useState(false);

  const loadToday = useCallback(async () => {
    try {
      const response = await bodyCheckinsApi.getByDate(localToday());
      setTodayCheckin(response.data);
      setStatus('saved_locked');
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        setTodayCheckin(null);
        setStatus('empty');
      } else {
        console.error('Error loading body checkin:', error);
        setStatus('error');
      }
      return null;
    }
  }, []);

  const loadSummary = useCallback(async (days = 7) => {
    try {
      const response = await bodyCheckinsApi.getSummary(days);
      setSummary(response.data);
      setSummaryDays(days);
    } catch (error) {
      console.error('Error loading body checkin summary:', error);
    }
  }, []);

  const loadHistory = useCallback(async (days = 30) => {
    try {
      const { fromDate, toDate } = buildBodyCheckinRange(days);
      const response = await bodyCheckinsApi.getRange({ from_date: fromDate, to_date: toDate });
      setHistory(response.data?.items || []);
    } catch (error) {
      console.error('Error loading body checkin history:', error);
    }
  }, []);

  const loadEvolution = useCallback(async (params = {}) => {
    setEvolutionLoading(true);
    try {
      const response = await bodyCheckinsApi.getEvolution(params);
      setEvolution(response.data?.history || []);
    } catch (error) {
      console.error('Error loading body checkin evolution:', error);
    } finally {
      setEvolutionLoading(false);
    }
  }, []);

  const save = useCallback(async (payload) => {
    setSaving(true);
    try {
      const response = await bodyCheckinsApi.save(localToday(), payload);
      setTodayCheckin(response.data);
      setStatus('saved_locked');
      toast.success('Check-in corporal registrado. Queda bloqueado hasta mañana.');
      return response.data;
    } catch (error) {
      if (error.response?.status === 409) {
        // Ya existe (otra pestaña/dispositivo): recuperar y bloquear.
        toast.info('Ya habías registrado el check-in de hoy.');
        return await loadToday();
      }
      const detail = error.response?.data?.detail;
      toast.error(
        detail === 'empty_checkin'
          ? 'Añade al menos una métrica o una nota.'
          : 'No se pudo guardar el check-in corporal.'
      );
      // El fallo del check-in no bloquea nada más: seguimos en modo registro.
      setStatus('empty');
      return null;
    } finally {
      setSaving(false);
    }
  }, [loadToday]);

  return {
    status,
    todayCheckin,
    mentorOutcome: todayCheckin?.mentor_outcome || null,
    saving,
    summary,
    summaryDays,
    history,
    evolution,
    evolutionLoading,
    loadToday,
    loadSummary,
    loadHistory,
    loadEvolution,
    save,
  };
};
