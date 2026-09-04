import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { healthFollowupApi } from '../../lib/api';
import { apiErrorMessage } from '../../lib/quotaError';

/**
 * Seguimiento de objetivos de salud: generar, seguir el job y consultar el
 * histórico.
 *
 * La fuente de verdad del job en vuelo es **el servidor**, como en "Mi centro"
 * y a diferencia del informe de salud, que lo guarda en `sessionStorage`. Aquí
 * `GET /current` devuelve el vigente y el job activo en la misma llamada, así
 * que salir de la pestaña y volver —o abrirla en otra ventana— recupera el
 * estado real en vez del que recordaba este navegador.
 *
 * `blocked` es terminal y no es un error: significa que no hay objetivo que
 * supervisar todavía. Se informa, nunca se pinta en rojo.
 */
export const useHealthGoalFollowup = () => {
  const [followup, setFollowup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [jobId, setJobId] = useState(null);
  const [startingGeneration, setStartingGeneration] = useState(false);
  const [daysBack, setDaysBack] = useState(14);
  const mountedRef = useRef(false);

  const generating = startingGeneration || Boolean(jobId);

  const loadCurrent = useCallback(async () => {
    try {
      const { data } = await healthFollowupApi.getCurrent();
      if (!mountedRef.current) return;
      setFollowup(data.followup || null);
      if (data.followup?.days_back) setDaysBack(Number(data.followup.days_back));
      if (data.active_job?.job_id) setJobId(data.active_job.job_id);
    } catch {
      // Silencioso: un fallo de carga deja la tarjeta vacía con su botón, que
      // es lo mismo que ve alguien que aún no ha generado ninguno.
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await healthFollowupApi.list();
      setHistory(data?.followups || []);
    } catch {
      toast.error('No se pudo cargar el historial de seguimientos');
    }
  }, []);

  const openFollowup = useCallback(async (followupId) => {
    try {
      const { data } = await healthFollowupApi.get(followupId);
      setFollowup(data);
      if (data?.days_back) setDaysBack(Number(data.days_back));
      return true;
    } catch {
      toast.error('No se pudo abrir el seguimiento');
      return false;
    }
  }, []);

  const generate = useCallback(async () => {
    setStartingGeneration(true);
    try {
      const { data } = await healthFollowupApi.generate(daysBack);
      setJobId(data.job_id);
      toast.info('El seguimiento se está generando. Puedes salir de esta pestaña.');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'No se pudo generar el seguimiento. Vuelve a intentarlo.'));
    } finally {
      setStartingGeneration(false);
    }
  }, [daysBack]);

  useEffect(() => {
    mountedRef.current = true;
    loadCurrent();
    return () => { mountedRef.current = false; };
  }, [loadCurrent]);

  useEffect(() => {
    if (!jobId) return undefined;

    let disposed = false;
    const poll = async () => {
      try {
        const { data } = await healthFollowupApi.getJob(jobId);
        if (disposed || data.status === 'queued' || data.status === 'running') return;

        setJobId(null);
        if (data.status === 'blocked') {
          toast.info(data.error || 'Todavía no hay un objetivo que seguir.');
          return;
        }
        if (data.status === 'failed') {
          toast.error(data.error || 'No se pudo generar el seguimiento. Vuelve a intentarlo.');
          return;
        }
        if (data.followup_id && await openFollowup(data.followup_id)) {
          toast.success('Seguimiento generado');
        }
      } catch (error) {
        if (error?.response?.status === 404) setJobId(null);
      }
    };

    poll();
    const intervalId = window.setInterval(poll, 2500);
    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [jobId, openFollowup]);

  return {
    followup,
    loading,
    generating,
    daysBack,
    setDaysBack,
    history,
    generate,
    loadHistory,
    openFollowup,
  };
};
