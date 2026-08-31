import { useState } from 'react';
import { CalendarDays, Plus, Utensils } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import HealthActivityList from './HealthActivityList';
import HealthTemplateBrowser from './HealthTemplateBrowser';
import NutritionEntryForm from './NutritionEntryForm';
import { useNutritionRecords } from '../../presentation/viewmodels/useNutritionRecords';
import { useHealthLibrary } from '../../presentation/viewmodels/useHealthLibrary';
import {
  MEAL_TYPE_LABELS,
  NUTRIENT_FIELDS,
  dateTimeForSelectedDay,
  formatHealthValue,
  localDateKey,
} from '../../lib/healthRecords';

// `partialFields` only ever arrives for a day: a meal's total covers the meal
// or it is not published at all. A day is a list of meals, so a figure there
// can be a real sum that still leaves a record out, and the tile has to say so
// rather than passing for the whole day.
function NutritionTotals({ totals, partialFields = [], compact = false }) {
  const fields = compact
    ? NUTRIENT_FIELDS.filter(([field]) => ['energy_kcal', 'protein_g', 'carbs_g', 'fat_g'].includes(field))
    : NUTRIENT_FIELDS;
  return (
    <div className={`grid gap-2 ${compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 md:grid-cols-4'}`}>
      {fields.map(([field, label, unit]) => {
        const partial = partialFields.includes(field);
        return (
          <div key={field} className="rounded-md bg-muted/50 px-2 py-1.5">
            <p className="text-[11px] text-muted-foreground">{label}</p>
            <p className="text-sm font-medium" data-testid={`nutrition-total-${field}`}>
              {partial && totals?.[field] != null ? '≥ ' : ''}
              {formatHealthValue(totals?.[field], unit)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function NutritionDetails({ activity }) {
  const details = activity.details;
  if (details?.kind !== 'nutrition') return null;
  return (
    <div className="space-y-2 pt-1">
      <p className="text-xs text-muted-foreground">
        {MEAL_TYPE_LABELS[details.meal_type] || details.meal_type} · {details.foods?.length || 0} alimentos
      </p>
      <NutritionTotals totals={details.totals} compact />
    </div>
  );
}

export default function NutritionTab() {
  const [selectedDate, setSelectedDate] = useState(() => localDateKey());
  const [composer, setComposer] = useState(null);
  const records = useNutritionRecords(selectedDate);
  const foods = useHealthLibrary('foods');
  const templates = useHealthLibrary('templates', 'nutrition');
  const history = records.history.filter((entry) => localDateKey(entry.observed_at) !== selectedDate);

  const closeComposer = () => setComposer(null);
  const openNew = () => setComposer({ key: `new-${Date.now()}`, template: null });
  const openTemplate = (template) => setComposer({ key: `template-${template.id}-${Date.now()}`, template });

  const submitNew = async (submission) => {
    const result = await records.save(submission);
    if (result.record) {
      closeComposer();
      await Promise.all([foods.reload(), templates.reload()]);
    }
    return result.record;
  };

  const renderEditor = ({ activity, onCancel, onSaved }) => (
    <NutritionEntryForm
      key={`${activity.id}-${activity.revision}`}
      activity={activity}
      foods={foods.entries}
      suggestedGroups={templates.groups}
      allowSaveAsTemplate={false}
      saving={records.saving}
      onCancel={onCancel}
      onSubmit={async ({ payload }) => {
        const updated = await records.update(activity.id, payload);
        if (updated) {
          onSaved();
          await foods.reload();
        }
        return updated;
      }}
    />
  );

  return (
    <div className="space-y-6" data-testid="nutrition-tab">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <Label htmlFor="nutrition-selected-date">Día</Label>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            <Input
              id="nutrition-selected-date"
              type="date"
              className="w-auto"
              value={selectedDate}
              onChange={(event) => {
                setSelectedDate(event.target.value);
                closeComposer();
              }}
            />
          </div>
        </div>
        {!composer && (
          <Button onClick={openNew} data-testid="nutrition-new">
            <Plus className="w-4 h-4 mr-1" /> Registrar comida
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
        <NutritionEntryForm
          key={`${composer.key}-${selectedDate}`}
          template={composer.template}
          observedAt={dateTimeForSelectedDay(selectedDate)}
          foods={foods.entries}
          suggestedGroups={templates.groups}
          saving={records.saving}
          onSubmit={submitNew}
          onCancel={closeComposer}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Utensils className="w-4 h-4" /> Totales del día
          </CardTitle>
        </CardHeader>
        <CardContent>
          {records.summaryLoading ? (
            <p className="text-sm text-muted-foreground">Cargando totales...</p>
          ) : records.daySummary?.has_nutrition ? (
            <>
              <NutritionTotals
                totals={records.daySummary.nutrition_totals}
                partialFields={records.daySummary.nutrition_totals_partial_fields || []}
              />
              {(records.daySummary.nutrition_totals_partial_fields || []).length > 0 && (
                <p className="pt-2 text-xs text-muted-foreground">
                  Los valores con ≥ suman solo las comidas que tienen ese dato. Alguna
                  comida del día no lo trae, así que el total real es mayor.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sin datos para este día.</p>
          )}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h3 className="font-semibold">Comidas del día</h3>
        <HealthActivityList
          activities={records.mealsForDay}
          tasks={records.tasks}
          loading={records.loading}
          saving={records.saving}
          allowCreate={false}
          emptyMessage="No hay comidas registradas para este día."
          onUpdate={records.update}
          onDelete={records.remove}
          onLinkTask={records.linkTask}
          onUnlinkTask={records.unlinkTask}
          renderDetails={(activity) => <NutritionDetails activity={activity} />}
          renderEditor={renderEditor}
        />
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Historial reciente</h3>
        <HealthActivityList
          activities={history}
          tasks={records.tasks}
          loading={records.loading}
          saving={records.saving}
          allowCreate={false}
          emptyMessage="No hay más comidas en el historial reciente."
          onUpdate={records.update}
          onDelete={records.remove}
          onLinkTask={records.linkTask}
          onUnlinkTask={records.unlinkTask}
          renderDetails={(activity) => <NutritionDetails activity={activity} />}
          renderEditor={renderEditor}
        />
      </section>
    </div>
  );
}
