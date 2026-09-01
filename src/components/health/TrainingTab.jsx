import { useState } from 'react';
import { Dumbbell, Plus } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import CollapsibleSection from './CollapsibleSection';
import HealthActivityList from './HealthActivityList';
import HealthHistoryDateFilter from './HealthHistoryDateFilter';
import HealthTemplateBrowser from './HealthTemplateBrowser';
import MeasurementList from './MeasurementList';
import WorkoutSessionForm from './WorkoutSessionForm';
import { useHealthLibrary } from '../../presentation/viewmodels/useHealthLibrary';
import { useWorkoutRecords } from '../../presentation/viewmodels/useWorkoutRecords';
import {
  ENDURANCE_MODALITY_LABELS,
  formatHealthValue,
  localDateKey,
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

export default function TrainingTab() {
  const [composer, setComposer] = useState(null);
  const [historyDate, setHistoryDate] = useState('');
  const records = useWorkoutRecords();
  const exercises = useHealthLibrary('exercises');
  const templates = useHealthLibrary('templates', 'training');
  const sessions = records.sessions.filter((entry) => (
    !historyDate || localDateKey(entry.observed_at) === historyDate
  ));

  const closeComposer = () => setComposer(null);
  const openNew = () => setComposer({ key: `new-${Date.now()}`, template: null, activity: null });
  const openTemplate = (template) => setComposer({
    key: `template-${template.id}-${Date.now()}`,
    template,
    activity: null,
  });
  const openEdit = (activity) => setComposer({ key: `edit-${activity.id}`, template: null, activity });

  const submitComposer = async ({ payload, templateId, saveAsTemplate }) => {
    if (composer.activity) {
      const updated = await records.update(composer.activity.id, payload);
      if (updated) {
        closeComposer();
        await exercises.reload();
      }
      return updated;
    }
    const result = await records.save({ payload, templateId, saveAsTemplate });
    if (result.record) {
      closeComposer();
      await Promise.all([exercises.reload(), templates.reload()]);
    }
    return result.record;
  };

  return (
    <div className="space-y-6" data-testid="training-tab">
      <div>
        <h2 className="font-semibold">Sesiones de entrenamiento</h2>
        <p className="text-sm text-muted-foreground">
          Registra fuerza o resistencia con los datos que conozcas; las cifras opcionales no se estiman.
        </p>
      </div>

      <HealthTemplateBrowser
        templates={templates.entries}
        groups={templates.groups}
        loading={templates.loading}
        onUse={openTemplate}
        onUpdate={templates.update}
        onRemove={templates.remove}
      />

      <Button type="button" onClick={openNew} data-testid="training-new">
        <Plus className="mr-1 h-4 w-4" /> Registrar entrenamiento
      </Button>

      {composer && (
        <WorkoutSessionForm
          key={composer.activity ? `${composer.activity.id}-${composer.activity.revision}` : composer.key}
          activity={composer.activity}
          template={composer.template}
          exercises={exercises.entries}
          suggestedGroups={templates.groups}
          allowSaveAsTemplate={!composer.activity}
          saving={records.saving}
          onSubmit={submitComposer}
          onCancel={closeComposer}
        />
      )}

      <section className="space-y-3" aria-labelledby="training-history-title">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 id="training-history-title" className="font-semibold flex items-center gap-2">
            <Dumbbell className="h-4 w-4" /> Historial reciente
          </h3>
          <HealthHistoryDateFilter value={historyDate} onChange={setHistoryDate} id="training-history-date" />
        </div>
        <HealthActivityList
          activities={sessions}
          tasks={records.tasks}
          loading={records.loading}
          saving={records.saving}
          allowCreate={false}
          compact
          emptyMessage="Todavía no has registrado sesiones de entrenamiento."
          onUpdate={records.update}
          onDelete={records.remove}
          onLinkTask={records.linkTask}
          onUnlinkTask={records.unlinkTask}
          renderDetails={(activity) => <TrainingDetails activity={activity} />}
          onEditRequest={openEdit}
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
