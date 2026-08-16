import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../../components/ui/alert-dialog';
import TaskDraftModal from '../../../components/TaskDraftModal';
import MissionDraftModal from '../../../components/MissionDraftModal';
import CenterPanelCard from './CenterPanelCard';
import GeneralCompassCard from './GeneralCompassCard';
import FinalReflectionCard from './FinalReflectionCard';
import { useDrafts } from '../../viewmodels/useDrafts';
import { agentApi, centerApi } from '../../../lib/api';
import { getStartupRetryDelay, isRetryableStartupError } from '../../../lib/startupRetry';
import { Eye, Loader2, Orbit, Puzzle, RefreshCw, RotateCw, Scale, Split } from 'lucide-react';

const DISCLAIMER = 'Esta es una lectura reflexiva basada en tus propios registros. No es una '
  + 'medición científica, un diagnóstico ni una valoración de tu salud mental. La sincronía y '
  + 'el desfase expresan una estimación de alineación con tu misión, no sincronización neuronal.';

// §10.2: generation can end without a usable center at all — never a client-side
// error, always a message that points the user at where to build up real records.
const BLOCKED_MESSAGE = 'Todavía no hay suficiente reflexión o conversación real para construir '
  + 'tu centro. Habla con tu Mentor o escribe una reflexión y vuelve a intentarlo.';

// §5: closed contract — keys, labels, symbols and order belong to the app, never the LLM.
const PANEL_META = [
  { key: 'change', label: 'Cambio', icon: RefreshCw },
  { key: 'perspective', label: 'Perspectiva', icon: Eye },
  { key: 'cycle', label: 'Ciclo', icon: RotateCw },
  { key: 'opposition', label: 'Oposición', icon: Split },
  { key: 'integration', label: 'Integración', icon: Puzzle },
  { key: 'balance', label: 'Equilibrio', icon: Scale },
];

// §6 — "Mi centro" content, embedded as a tab of the Mentor page (moved off
// the top nav to avoid crowding it at intermediate widths). No <Layout> of
// its own: the host page owns the shell.
export default function CenterView() {
  const [center, setCenter] = useState(null);
  const [activeJobs, setActiveJobs] = useState([]);
  const [loadingCenter, setLoadingCenter] = useState(true);
  const [centerAvailable, setCenterAvailable] = useState(true);
  const [centerLoadError, setCenterLoadError] = useState(false);
  const [startingGeneration, setStartingGeneration] = useState(false);
  const [jobId, setJobId] = useState(null);
  const centerRetryTimerRef = useRef(null);
  const centerRequestControllerRef = useRef(null);
  const centerRequestSequenceRef = useRef(0);
  const activeCenterRequestRef = useRef(null);
  const centerRetryAttemptRef = useRef(0);
  const centerMountedRef = useRef(false);
  const centerHasLoadedRef = useRef(false);
  const centerUnavailableRef = useRef(false);

  const generating = startingGeneration || Boolean(jobId);

  const [pendingAction, setPendingAction] = useState(null);
  const {
    showTaskDraftModal, showMissionDraftModal, currentDraftData,
    openDraftModal, confirmTaskDraft, rejectTaskDraft,
    confirmMissionDraft, rejectMissionDraft,
    setShowTaskDraftModal, setShowMissionDraftModal,
  } = useDrafts();

  const requestAction = useCallback(async (actionType) => {
    if (!center?.final_reflection?.text) return;
    setPendingAction(actionType);
    try {
      const { data } = await agentApi.reviewHandoff(center.final_reflection.text, actionType);
      if (data.draft_id && data.ui_action) {
        openDraftModal({
          draftId: data.draft_id,
          uiAction: data.ui_action,
          type: actionType === 'mission' ? 'mission' : 'task',
        });
      } else {
        toast.info(data.response || 'No se generó una propuesta esta vez.');
      }
    } catch {
      toast.error('No se pudo abrir esa propuesta. Vuelve a intentarlo.');
    } finally {
      setPendingAction(null);
    }
  }, [center, openDraftModal]);

  // The server, not local storage, is the source of truth for an active job —
  // leaving the tab and coming back must recover it (§6.8). A "full" job can
  // be either the first generation or a full regeneration (they can never
  // run concurrently), so this resumes regardless of whether a center
  // already exists.
  const clearCenterRetry = useCallback(() => {
    if (centerRetryTimerRef.current) {
      window.clearTimeout(centerRetryTimerRef.current);
      centerRetryTimerRef.current = null;
    }
  }, []);

  const loadCenter = useCallback(async ({ resetRetry = false } = {}) => {
    if (!centerMountedRef.current || centerUnavailableRef.current || activeCenterRequestRef.current != null) {
      return;
    }
    if (resetRetry) {
      centerRetryAttemptRef.current = 0;
      clearCenterRetry();
    }

    const requestId = ++centerRequestSequenceRef.current;
    const controller = new AbortController();
    activeCenterRequestRef.current = requestId;
    centerRequestControllerRef.current = controller;

    try {
      const { data } = await centerApi.getCenter({ signal: controller.signal });
      if (!centerMountedRef.current || activeCenterRequestRef.current !== requestId) return;

      setCenter(data.center || null);
      setActiveJobs(data.active_jobs || []);
      const fullJob = (data.active_jobs || []).find((job) => job.target === 'full');
      if (fullJob) setJobId(fullJob.job_id);
      centerHasLoadedRef.current = true;
      centerUnavailableRef.current = false;
      centerRetryAttemptRef.current = 0;
      setCenterAvailable(true);
      setCenterLoadError(false);
      setLoadingCenter(false);
    } catch (error) {
      if (!centerMountedRef.current || controller.signal.aborted || activeCenterRequestRef.current !== requestId) {
        return;
      }

      if (error?.response?.status === 404) {
        // A disabled center feature deliberately responds with 404. It is not
        // a missing user center and must not offer a creation action.
        centerUnavailableRef.current = true;
        centerRetryAttemptRef.current = 0;
        setCenterAvailable(false);
        setCenterLoadError(false);
        setLoadingCenter(false);
      } else if (isRetryableStartupError(error)) {
        const delay = getStartupRetryDelay(centerRetryAttemptRef.current);
        centerRetryAttemptRef.current += 1;
        setCenterLoadError(false);
        if (!centerHasLoadedRef.current) setLoadingCenter(true);
        centerRetryTimerRef.current = window.setTimeout(() => {
          centerRetryTimerRef.current = null;
          loadCenter();
        }, delay);
      } else {
        setCenterLoadError(true);
        setLoadingCenter(false);
      }
    } finally {
      if (activeCenterRequestRef.current === requestId) {
        activeCenterRequestRef.current = null;
        centerRequestControllerRef.current = null;
      }
    }
  }, [clearCenterRetry]);

  const handleAnnotationSaved = useCallback((updatedPanel) => {
    // §6.7/§9.1: saving a note never recalculates the Brújula itself, but the
    // server always flags the alignment stale — mirror that locally so the
    // "Pendiente de incorporar tus notas" badge doesn't wait for a full reload.
    setCenter((current) => (current ? {
      ...current,
      panels: current.panels.map((p) => (p.key === updatedPanel.key ? updatedPanel : p)),
      alignment: { ...current.alignment, needs_refresh: true },
    } : current));
  }, []);

  useEffect(() => {
    centerMountedRef.current = true;
    const retryOnReconnect = () => {
      if (!centerUnavailableRef.current) loadCenter({ resetRetry: true });
    };
    window.addEventListener('focus', retryOnReconnect);
    window.addEventListener('online', retryOnReconnect);
    loadCenter();

    return () => {
      centerMountedRef.current = false;
      clearCenterRetry();
      activeCenterRequestRef.current = null;
      centerRequestControllerRef.current?.abort();
      centerRequestControllerRef.current = null;
      window.removeEventListener('focus', retryOnReconnect);
      window.removeEventListener('online', retryOnReconnect);
    };
  }, [clearCenterRetry, loadCenter]);

  const generate = useCallback(async () => {
    setStartingGeneration(true);
    try {
      const { data } = await centerApi.generateCenter();
      setJobId(data.job_id);
    } catch (e) {
      if (e?.response?.status === 409) {
        loadCenter();
      } else {
        toast.error('No se pudo crear tu centro. Vuelve a intentarlo.');
      }
    } finally {
      setStartingGeneration(false);
    }
  }, [loadCenter]);

  // Reuses the same jobId/generating state as `generate` — a "full" job is
  // mutually exclusive with itself server-side, so there is never a case
  // where both would be in flight at once.
  const regenerateCenter = useCallback(async () => {
    setStartingGeneration(true);
    try {
      const { data } = await centerApi.regenerateCenter();
      setJobId(data.job_id);
    } catch (e) {
      if (e?.response?.status === 404) {
        loadCenter();
      } else {
        toast.error('No se pudo regenerar tu centro. Vuelve a intentarlo.');
      }
    } finally {
      setStartingGeneration(false);
    }
  }, [loadCenter]);

  useEffect(() => {
    if (!jobId) return undefined;

    let disposed = false;
    const finish = () => {
      if (!disposed) setJobId(null);
    };
    const poll = async () => {
      try {
        const { data } = await centerApi.getCenterJob(jobId);
        if (disposed || data.status === 'queued' || data.status === 'running') return;

        finish();
        if (data.status === 'completed') {
          await loadCenter();
          toast.success('Tu centro está listo');
        } else if (data.status === 'blocked') {
          toast.info(data.error || BLOCKED_MESSAGE);
        } else if (data.status === 'stale') {
          toast.info('Tu centro cambió mientras se generaba. Vuelve a intentarlo.');
        } else {
          toast.error(data.error || 'No se pudo crear tu centro. Vuelve a intentarlo.');
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
  }, [jobId, loadCenter]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <p className="text-sm text-muted-foreground">{DISCLAIMER}</p>

      {loadingCenter && (
        <Card>
          <CardContent
            className="flex items-center gap-3 pt-6 text-sm text-muted-foreground"
            aria-live="polite"
          >
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Cargando tu centro…
          </CardContent>
        </Card>
      )}

      {!loadingCenter && generating && (
        <Card>
          <CardContent
            className="flex items-center gap-3 pt-6 text-sm text-muted-foreground"
            aria-live="polite"
          >
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Tu centro se está generando en segundo plano. Puedes navegar con normalidad.
          </CardContent>
        </Card>
      )}

      {!loadingCenter && !centerAvailable && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground" aria-live="polite">
            Mi centro no está disponible en este momento.
          </CardContent>
        </Card>
      )}

      {!loadingCenter && centerAvailable && centerLoadError && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6 text-sm text-muted-foreground" role="alert">
            <span>No se pudo cargar tu centro. Comprueba tu conexión y vuelve a intentarlo.</span>
            <Button variant="outline" size="sm" onClick={() => loadCenter({ resetRetry: true })}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reintentar
            </Button>
          </CardContent>
        </Card>
      )}

      {!loadingCenter && centerAvailable && !centerLoadError && !generating && !center && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
            <Orbit className="h-10 w-10 text-primary" />
            <p className="text-muted-foreground">
              Aún no tienes un centro. Se construye a partir de tus reflexiones y conversaciones
              reales — nada se rellena con generalidades.
            </p>
            <Button onClick={generate}>
              <Orbit className="mr-2 h-4 w-4" /> Crear mi centro
            </Button>
            <p className="text-xs text-muted-foreground">
              ¿Todavía no tienes registros? Empieza en{' '}
              <Link to="/mentor" className="underline">Mentor</Link>.
            </p>
          </CardContent>
        </Card>
      )}

      {!loadingCenter && centerAvailable && !centerLoadError && !generating && center && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Última actualización: {(center.updated_at || '').slice(0, 16).replace('T', ' ')}.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Regenerar centro completo
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Regenerar tu centro completo?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se generarán de nuevo las seis lecturas, la Brújula y la reflexión final a partir
                    de tus registros actuales. Las notas que hayas guardado en los paneles se
                    perderán. Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={regenerateCenter}
                  >
                    Regenerar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <GeneralCompassCard
            alignment={center.alignment}
            bodyContextSummary={center.body_context_summary}
            missionLensRefs={center.mission_lens_refs}
            contributingProfiles={center.contributing_profiles}
            centerSummary={center.center_summary}
          />
          <div className="grid gap-4 md:grid-cols-2">
            {PANEL_META.map(({ key, label, icon }) => {
              const panel = center.panels.find((p) => p.key === key);
              if (!panel) return null;
              const activeJob = activeJobs.find((job) => job.target === key);
              return (
                <CenterPanelCard
                  key={key}
                  label={label}
                  icon={icon}
                  panel={panel}
                  initialJobId={activeJob?.job_id || null}
                  onAnnotationSaved={handleAnnotationSaved}
                  onReloadCenter={loadCenter}
                />
              );
            })}
          </div>
          {center.final_reflection?.text && (
            <FinalReflectionCard
              text={center.final_reflection.text}
              onAction={requestAction}
              pendingAction={pendingAction}
            />
          )}
        </>
      )}

      <TaskDraftModal
        isOpen={showTaskDraftModal}
        onClose={() => setShowTaskDraftModal(false)}
        draftData={currentDraftData}
        onConfirm={(editedData) => confirmTaskDraft(editedData)}
        onReject={rejectTaskDraft}
      />
      <MissionDraftModal
        isOpen={showMissionDraftModal}
        onClose={() => setShowMissionDraftModal(false)}
        draftData={currentDraftData}
        onConfirm={(editedData) => confirmMissionDraft(editedData)}
        onReject={rejectMissionDraft}
      />
    </div>
  );
}
