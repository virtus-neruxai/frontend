import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
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
} from '../ui/alert-dialog';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import TaskDraftModal from '../TaskDraftModal';
import { useDrafts } from '../../presentation/viewmodels/useDrafts';
import { useHealthGoal } from '../../presentation/viewmodels/useHealthGoal';
import { useHealthGoalFollowup } from '../../presentation/viewmodels/useHealthGoalFollowup';
import { agentApi } from '../../lib/api';
import { apiErrorMessage } from '../../lib/quotaError';
import {
  CalendarClock, Compass, History, Loader2, RefreshCw, Repeat, Target,
} from 'lucide-react';

const DISCLAIMER = 'Este seguimiento es una lectura de tus propios registros frente al objetivo '
  + 'que declaraste. No mide tu avance ni valora tu salud: dice qué hay registrado y qué no.';

const RANGE_OPTIONS = [
  { value: 7, label: 'Última semana' },
  { value: 14, label: 'Últimas 2 semanas' },
  { value: 30, label: 'Último mes' },
];

// Contrato cerrado: las claves, las etiquetas y el orden pertenecen a la app,
// nunca al modelo. Un panel que el servidor no devuelva simplemente no se pinta.
// Dos y no cuatro: «Cuerpo» y «Sin registro» eran paneles propios y decían lo
// que el Informe ya dice. Lo que aportaban va dentro de estos dos.
const PANEL_META = [
  { key: 'direction', label: 'Dirección', icon: Compass },
  { key: 'consistency', label: 'Constancia', icon: Repeat },
];

function rangeLabel(daysBack) {
  return RANGE_OPTIONS.find((o) => o.value === Number(daysBack))?.label || `Últimos ${daysBack} días`;
}

function PanelCard({ label, icon: Icon, panel }) {
  return (
    <Card data-testid={`followup-panel-${panel.key}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="h-4 w-4" /> {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{panel.text}</p>
      </CardContent>
    </Card>
  );
}

/**
 * El seguimiento del mentor sobre el objetivo declarado.
 *
 * Con la forma de "Mi centro" y no la del Informe: hay un vigente que se
 * regenera, el job en vuelo se recupera del servidor, y la conclusión puede
 * traer una propuesta que se convierte en tarea o rutina real pasando por el
 * borrador que la persona confirma — nada se crea sin que lo vea en un
 * formulario.
 */
export default function HealthGoalFollowupView({ goalVersion = 0 }) {
  const {
    followup, loading, generating, daysBack, setDaysBack,
    history, generate, loadHistory, openFollowup,
  } = useHealthGoalFollowup();
  const { goal, reload: reloadGoal } = useHealthGoal();
  const [showHistory, setShowHistory] = useState(false);
  const [proposing, setProposing] = useState(false);
  const {
    showTaskDraftModal, currentDraftData,
    openDraftModal, confirmTaskDraft, rejectTaskDraft, setShowTaskDraftModal,
  } = useDrafts();

  // El objetivo se edita en el bloque de arriba, que tiene su propia copia.
  useEffect(() => {
    if (goalVersion) reloadGoal();
  }, [goalVersion, reloadGoal]);

  const toggleHistory = () => {
    const next = !showHistory;
    setShowHistory(next);
    if (next) loadHistory();
  };

  const data = followup?.followup_json || null;
  const proposal = data?.proposal || null;

  // Al agente no se le manda el objeto: se le manda el texto que él mismo
  // escribió y el tipo que la persona pulsó, igual que "Mi centro". Lo que
  // vuelve es un borrador que se confirma en el formulario de siempre.
  const createFromProposal = useCallback(async () => {
    if (!proposal) return;
    setProposing(true);
    try {
      const message = [proposal.title, proposal.description, proposal.rationale]
        .filter(Boolean).join('. ');
      const { data: handoff } = await agentApi.reviewHandoff(
        message,
        proposal.task_kind === 'routine' ? 'routine' : 'task',
        { source: 'health_goal_followup', healthSurface: true },
      );
      if (handoff.draft_id && handoff.ui_action) {
        openDraftModal({ draftId: handoff.draft_id, uiAction: handoff.ui_action, type: 'task' });
      } else {
        toast.info(handoff.response || 'No se generó una propuesta esta vez.');
      }
    } catch (e) {
      toast.error(apiErrorMessage(e, 'No se pudo abrir esa propuesta. Vuelve a intentarlo.'));
    } finally {
      setProposing(false);
    }
  }, [proposal, openDraftModal]);

  const generateButton = (
    <Button onClick={generate} disabled={generating} data-testid="health-followup-generate">
      {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Target className="mr-2 h-4 w-4" />}
      Generar seguimiento
    </Button>
  );

  return (
    <div className="space-y-4" data-testid="health-followup">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <Target className="h-4 w-4" /> Seguimiento del mentor
          </h3>
          <p className="text-sm text-muted-foreground">{DISCLAIMER}</p>
        </div>
        {data && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={toggleHistory}>
              <History className="mr-1.5 h-3.5 w-3.5" /> Historial
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={generating}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Regenerar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Generar un seguimiento nuevo?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se leerá otra vez lo que has registrado en {rangeLabel(daysBack).toLowerCase()}.
                    El seguimiento actual pasa al historial y sigue accesible ahí.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={generate}>Generar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {showHistory && (
        <Card>
          <CardHeader><CardTitle className="text-base">Historial</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay seguimientos generados.</p>
            ) : (
              history.map((entry) => (
                <button
                  key={entry.followup_id}
                  onClick={() => { openFollowup(entry.followup_id); setShowHistory(false); }}
                  className="block w-full rounded-md border p-2 text-left text-sm hover:bg-muted"
                >
                  <span className="text-muted-foreground">
                    {(entry.created_at || '').slice(0, 16).replace('T', ' ')}
                  </span>
                  <Badge variant="secondary" className="ml-2">{rangeLabel(entry.days_back)}</Badge>
                  {entry.summary && <span> — {entry.summary.slice(0, 90)}</span>}
                </button>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {generating && (
        <Card>
          <CardContent
            className="flex items-center gap-3 pt-6 text-sm text-muted-foreground"
            aria-live="polite"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Se está generando en segundo plano. Puedes navegar con normalidad.
          </CardContent>
        </Card>
      )}

      {!loading && !generating && !data && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
            {goal ? (
              <>
                <p className="text-sm text-muted-foreground">
                  El mentor lee lo que has registrado y te dice qué va en la dirección
                  de tu objetivo, qué no aparece, y si le encaja proponerte algo.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Select value={String(daysBack)} onValueChange={(v) => setDaysBack(Number(v))}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RANGE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {generateButton}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Declara tu objetivo de salud aquí arriba y el mentor podrá seguirlo.
                Sin una dirección declarada no hay nada que supervisar.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {!generating && data && (
        <>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            {rangeLabel(followup.days_back)} · última actualización{' '}
            {(followup.created_at || '').slice(0, 16).replace('T', ' ')}
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {PANEL_META.map(({ key, label, icon }) => {
              const panel = (data.panels || []).find((p) => p.key === key);
              return panel ? (
                <PanelCard key={key} label={label} icon={icon} panel={panel} />
              ) : null;
            })}
          </div>

          {(data.conclusion || proposal) && (
            <Card data-testid="health-followup-conclusion">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Conclusión</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.conclusion && <p className="text-sm">{data.conclusion}</p>}
                {proposal && (
                  <div className="space-y-2 rounded-md border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{proposal.title}</p>
                      <Badge variant="secondary">
                        {proposal.task_kind === 'routine' ? 'Rutina' : 'Tarea'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{proposal.description}</p>
                    {proposal.rationale && (
                      <p className="text-xs text-muted-foreground">{proposal.rationale}</p>
                    )}
                    <Button
                      size="sm"
                      onClick={createFromProposal}
                      disabled={proposing}
                      data-testid="health-followup-propose"
                    >
                      {proposing && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                      {proposal.task_kind === 'routine' ? 'Crear rutina' : 'Crear tarea'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
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
    </div>
  );
}
