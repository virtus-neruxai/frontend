import { useState } from 'react';
import { Check, Pause, Play, Plus, Sprout, Trash2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../components/ui/collapsible';
import { HealthPracticeApplicationDialog } from './HealthPracticeApplicationDialog';

const STATUS = {
  active: 'Adoptada', practicing: 'En práctica', consolidating: 'Consolidando',
  integrated: 'Integrada', paused: 'En pausa', retired: 'Retirada',
};
const USER_ACTIONS = {
  paused: { label: 'Pausar', Icon: Pause },
  integrated: { label: 'Ya es mía', Icon: Check },
  retired: { label: 'Retirar', Icon: Trash2 },
};
const RESUMABLE = new Set(['paused', 'integrated', 'retired']);

function Skeleton() {
  return <div className="h-24 animate-pulse rounded bg-muted" />;
}

function formatDate(value) {
  if (!value) return '';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function Timeline({ applications }) {
  if (applications.length === 0) return null;
  return (
    <Collapsible>
      <CollapsibleTrigger className="mt-2 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
        Ver cuándo
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-2 space-y-1.5 border-l border-border pl-3">
          {applications.map((application) => (
            <li key={application.id || application.application_date} className="text-xs text-muted-foreground">
              {formatDate(application.application_date)}
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function HealthPracticesPanel({ data, loading, onRecordApplication, onSetStatus }) {
  const [dialogPractice, setDialogPractice] = useState(null);
  const [statusError, setStatusError] = useState('');
  if (loading) {
    return (
      <div className="rounded-[8px] border bg-card p-5" data-testid="health-practices-panel">
        <Skeleton />
      </div>
    );
  }
  const practices = data?.practices || [];
  if (practices.length === 0) return null;
  const applications = data?.applications || [];
  const updateStatus = async (practiceKey, status) => {
    setStatusError('');
    try {
      await onSetStatus?.(practiceKey, status);
    } catch (requestError) {
      setStatusError(
        requestError?.response?.data?.detail
        || 'No se pudo actualizar la práctica. Puedes volver a intentarlo.'
      );
    }
  };

  return (
    <div className="rounded-[8px] border bg-card p-5" data-testid="health-practices-panel">
      <h3 className="flex items-center gap-2 text-base font-semibold">
        <Sprout size={16} className="text-muted-foreground" /> Prácticas de salud que estás practicando
      </h3>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">
        Acciones de tus informes que decidiste conservar. Aquí solo cuenta lo que registras.
      </p>
      <div className="divide-y divide-border">
        {practices.map((practice) => {
          const dates = applications
            .filter((row) => row.practice_key === practice.practice_key)
            .filter((row) => row.application_date);
          const canResume = RESUMABLE.has(practice.status);
          return (
            <div key={practice.practice_key} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h4 className="text-sm font-medium">{practice.title}</h4>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {STATUS[practice.status] || practice.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{practice.instruction}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {practice.application_count > 0
                  ? `${practice.application_count} ${practice.application_count === 1 ? 'vez' : 'veces'} registrada${practice.application_count === 1 ? '' : 's'}`
                  : 'Todavía no has registrado ninguna vez.'}
              </p>
              <Timeline applications={dates} />
              <div className="mt-2.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setDialogPractice(practice)}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/40 px-2.5 py-1 text-xs text-primary hover:bg-primary/10"
                >
                  <Plus size={11} /> Lo he hecho
                </button>
                {canResume ? (
                  <button
                    type="button"
                    onClick={() => updateStatus(practice.practice_key, 'active')}
                    className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
                  >
                    <Play size={11} /> Retomar
                  </button>
                ) : Object.entries(USER_ACTIONS).map(([status, { label, Icon }]) => (
                  <button
                    key={status}
                    type="button"
                      onClick={() => updateStatus(practice.practice_key, status)}
                    className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
                  >
                    <Icon size={11} /> {label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        No hay fallos, porcentajes ni rachas. Pausar o retirar no borra lo registrado.
      </p>
      {statusError && <p role="alert" className="mt-2 text-xs text-destructive">{statusError}</p>}
      <HealthPracticeApplicationDialog
        practice={dialogPractice}
        open={dialogPractice !== null}
        onSave={onRecordApplication}
        onClose={() => setDialogPractice(null)}
      />
    </div>
  );
}
