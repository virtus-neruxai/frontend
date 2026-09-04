import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { healthReportApi } from '../../lib/api';
import { apiErrorMessage } from '../../lib/quotaError';

// Own storage key, deliberately not shared with the general report's
// REPORT_JOB_STORAGE_KEY (ReasoningReportTab.jsx) — the two jobs live in
// separate job stores and recovering one must never resurface the other.
const HEALTH_REPORT_JOB_STORAGE_KEY = 'virtus.reasoning.active-health-report-job';

function readPendingJobId() {
  try {
    return window.sessionStorage.getItem(HEALTH_REPORT_JOB_STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistPendingJobId(jobId) {
  try {
    window.sessionStorage.setItem(HEALTH_REPORT_JOB_STORAGE_KEY, jobId);
  } catch {
    // The report keeps running server-side even if browser storage is blocked.
  }
}

function clearPendingJobId() {
  try {
    window.sessionStorage.removeItem(HEALTH_REPORT_JOB_STORAGE_KEY);
  } catch {
    // Nothing else depends on this beyond the local progress indicator.
  }
}

/**
 * Informe Razonado de Salud — generate, poll the background job, recover it
 * after a reload, browse history. Mirrors ReasoningReportTab's job pattern;
 * does not reuse `reasoningApi` because the health report has its own
 * endpoints, job store and history (never a section of the general report).
 */
export const useHealthReport = () => {
  const [report, setReport] = useState(null);
  const [startingGeneration, setStartingGeneration] = useState(false);
  const [reportJobId, setReportJobId] = useState(readPendingJobId);
  const [history, setHistory] = useState([]);
  const [daysBack, setDaysBack] = useState(14);

  const generating = startingGeneration || Boolean(reportJobId);

  const openReport = useCallback(async (reportId) => {
    try {
      const { data } = await healthReportApi.getReport(reportId);
      setReport(data);
      setDaysBack(Number(data.days_back || 14));
      return true;
    } catch {
      toast.error('No se pudo abrir el informe');
      return false;
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await healthReportApi.getReports();
      setHistory(data?.reports || []);
    } catch {
      toast.error('No se pudo cargar el historial de informes de salud');
    }
  }, []);

  const generate = useCallback(async () => {
    setStartingGeneration(true);
    try {
      const { data } = await healthReportApi.generateReport(daysBack);
      setReportJobId(data.job_id);
      persistPendingJobId(data.job_id);
      toast.info('El informe de salud se está generando. Puedes salir de esta pestaña.');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'No se pudo generar el informe. Vuelve a intentarlo.'));
    } finally {
      setStartingGeneration(false);
    }
  }, [daysBack]);

  useEffect(() => {
    if (!reportJobId) return undefined;

    let disposed = false;
    const finish = () => {
      clearPendingJobId();
      if (!disposed) setReportJobId(null);
    };
    const poll = async () => {
      try {
        const { data } = await healthReportApi.getReportJob(reportJobId);
        if (disposed || data.status === 'queued' || data.status === 'running') return;

        finish();
        if (data.status === 'failed') {
          toast.error(data.error || 'No se pudo generar el informe de salud. Vuelve a intentarlo.');
          return;
        }
        if (data.report_id && await openReport(data.report_id)) {
          toast.success('Informe de salud generado');
          loadHistory();
        }
      } catch (error) {
        if (error?.response?.status === 404) finish();
      }
    };

    poll();
    const intervalId = window.setInterval(poll, 2500);
    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [reportJobId, openReport, loadHistory]);

  return {
    report,
    generating,
    reportJobId,
    daysBack,
    setDaysBack,
    history,
    generate,
    loadHistory,
    openReport,
  };
};
