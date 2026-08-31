import { useState } from 'react';
import { ChevronDown, Dumbbell, Plus } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import HealthActivityList from './HealthActivityList';
import HealthTemplateBrowser from './HealthTemplateBrowser';
import MeasurementList from './MeasurementList';
import WorkoutSessionForm from './WorkoutSessionForm';
import { useHealthLibrary } from '../../presentation/viewmodels/useHealthLibrary';
import { useWorkoutRecords } from '../../presentation/viewmodels/useWorkoutRecords';
import {
  ENDURANCE_MODALITY_LABELS,
  formatHealthValue,
} from '../../lib/healthRecords';

function durationLabel(seconds) {
  if (seconds === null || seconds === undefined) return null;
  return formatHealthValue(Number(seconds) / 60, 'min');
}

function TrainingDetails({ activity }) {
  const details = activity.details;
  if (details?.kind === 'strength') {
    return (
      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-muted-foreground">
        <span>{details.exercises?.length || 0} ejercicios</span>
        {details.volume?.total_sets !== null && details.volume?.total_sets !== undefined && (
          <><span aria-hidden="true">·</span><span>{formatHealthValue(details.volume.total_sets)} series</span></>
        )}
        {details.volume?.load_volume_kg !== null && details.volume?.load_volume_kg !== undefined && (
          <><span aria-hidden="true">·</span><span>{formatHealthValue(details.volume.load_volume_kg, 'kg')} de volumen</span></>
        )}
        {durationLabel(details.duration_seconds) && (
          <><span aria-hidden="true">·</span><span>{durationLabel(details.duration_seconds)}</span></>
        )}
        {details.energy_expenditure_kcal !== null && details.energy_expenditure_kcal !== undefined && (
          <><span aria-hidden="true">·</span><span>{formatHealthValue(details.energy_expenditure_kcal, 'kcal')}</span></>
        )}
        {details.pain_or_discomfort === true && <Badge variant="outline">Molestia registrada</Badge>}
      </div>
    );
  }

  if (details?.kind === 'endurance') {
    return (
      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-muted-foreground">
        <span>{ENDURANCE_MODALITY_LABELS[details.modality] || details.modality}</span>
        {details.distance_m !== null && details.distance_m !== undefined && (
          <><span aria-hidden="true">·</span><span>{formatHealthValue(Number(details.distance_m) / 1000, 'km')}</span></>
        )}
        {durationLabel(details.duration_seconds) && (
          <><span aria-hidden="true">·</span><span>{durationLabel(details.duration_seconds)}</span></>
        )}
        {details.pace?.seconds_per_km !== null && details.pace?.seconds_per_km !== undefined && (
          <><span aria-hidden="true">·</span><span>{formatHealthValue(details.pace.seconds_per_km, 's/km')}</span></>
        )}
        {details.energy_expenditure_kcal !== null && details.energy_expenditure_kcal !== undefined && (
          <><span aria-hidden="true">·</span><span>{formatHealthValue(details.energy_expenditure_kcal, 'kcal')}</span></>
        )}
        {details.pain_or_discomfort === true && <Badge variant="outline">Molestia registrada</Badge>}
      </div>
    );
  }

  return null;
}

function CollapsibleSection({ title, description, children, testId }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border" data-testid={testId}>
      <CollapsibleTrigger asChild>
        <Button type="button" variant="ghost" className="h-auto w-full justify-between gap-3 p-4 text-left">
          <span>
            <span className="block font-semibold text-foreground">{title}</span>
            <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{description}</span>
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function TrainingTab() {
  const [composer, setComposer] = useState(null);
  const records = useWorkoutRecords();
  const exercises = useHealthLibrary('exercises');
  const templates = useHealthLibrary('templates', 'training');

  const closeComposer = () => setComposer(null);
  const openNew = () => setComposer({ key: `new-${Date.now()}`, template: null });
  const openTemplate = (template) => setComposer({
    key: `template-${template.id}-${Date.now()}`,
    template,
  });

  const submitNew = async (submission) => {
    const result = await records.save(submission);
    if (result.record) {
      closeComposer();
      await Promise.all([exercises.reload(), templates.reload()]);
    }
    return result.record;
  };

  const renderEditor = ({ activity, onCancel, onSaved }) => (
    <WorkoutSessionForm
      key={`${activity.id}-${activity.revision}`}
      activity={activity}
      exercises={exercises.entries}
      suggestedGroups={templates.groups}
      allowSaveAsTemplate={false}
      saving={records.saving}
      onCancel={onCancel}
      onSubmit={async ({ payload }) => {
        const updated = await records.update(activity.id, payload);
        if (updated) {
          onSaved();
          await exercises.reload();
        }
        return updated;
      }}
    />
  );

  return (
    <div className="space-y-6" data-testid="training-tab">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold">Sesiones de entrenamiento</h2>
          <p className="text-sm text-muted-foreground">
            Registra fuerza o resistencia con los datos que conozcas; las cifras opcionales no se estiman.
          </p>
        </div>
        {!composer && (
          <Button type="button" onClick={openNew} data-testid="training-new">
            <Plus className="mr-1 h-4 w-4" /> Registrar entrenamiento
          </Button>
        )}
      </div>

      <HealthTemplateBrowser
        templates={templates.entries}
        groups={templates.groups}
        loading={templates.loading}
        onUse={openTemplate}
        onUpdate={templates.update}
        onRemove={templates.remove}
      />

      {composer && (
        <WorkoutSessionForm
          key={composer.key}
          template={composer.template}
          exercises={exercises.entries}
          suggestedGroups={templates.groups}
          saving={records.saving}
          onSubmit={submitNew}
          onCancel={closeComposer}
        />
      )}

      <section className="space-y-3" aria-labelledby="training-history-title">
        <h3 id="training-history-title" className="font-semibold flex items-center gap-2">
          <Dumbbell className="h-4 w-4" /> Historial reciente
        </h3>
        <HealthActivityList
          activities={records.sessions}
          tasks={records.tasks}
          loading={records.loading}
          saving={records.saving}
          allowCreate={false}
          emptyMessage="Todavía no has registrado sesiones de entrenamiento."
          onUpdate={records.update}
          onDelete={records.remove}
          onLinkTask={records.linkTask}
          onUnlinkTask={records.unlinkTask}
          renderDetails={(activity) => <TrainingDetails activity={activity} />}
          renderEditor={renderEditor}
        />
      </section>

      <CollapsibleSection
        title="Composición corporal"
        description="Bloque avanzado para medidas como peso, cintura o porcentaje de grasa."
        testId="training-composition"
      >
        <MeasurementList records={records} />
      </CollapsibleSection>
    </div>
  );
}
