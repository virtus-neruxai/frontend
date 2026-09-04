import { useState } from 'react';
import { CalendarDays, Plus, Utensils } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import HealthActivityList from './HealthActivityList';
import HealthHistoryDateFilter from './HealthHistoryDateFilter';
import HealthTemplateBrowser from './HealthTemplateBrowser';
import NutritionEntryForm from './NutritionEntryForm';
import { useNutritionRecords } from '../../presentation/viewmodels/useNutritionRecords';
import { useHealthLibrary } from '../../presentation/viewmodels/useHealthLibrary';
import {
  NUTRIENT_FIELDS,
  dateTimeForSelectedDay,
  formatHealthValue,
  localDateKey,
} from '../../lib/healthRecords';

// `partialFields` only ever arrives for a day: a meal's total covers the meal
// or it is not published at all. A day is a list of meals, so a figure there
// can be a real sum that still leaves a record out, and the tile has to say so
// rather than passing for the whole day.
//
// This is the one place a period sum survived. Everywhere else the window
// aggregates became means per record, because "≥928 kcal in four days" measured
// how much got logged rather than how someone ate. A *day* total is different:
// it is what this card exists to show, and a mean per meal here would answer a
// question nobody asked. So the sum stays and only the `≥` went — the caveat
// below says the same thing in words.
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
              {formatHealthValue(totals?.[field], unit)}
            </p>
            {partial && totals?.[field] != null && (
              <p className="text-[10px] text-muted-foreground/80">falta alguna comida</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// The card is already titled with the meal (see `title`, which defaults to
// the meal type), so this only adds what the title does not say: the meal's
// own totals — strictly all-or-nothing, unlike the day's.
function NutritionDetails({ activity }) {
  const details = activity.details;
  if (details?.kind !== 'nutrition') return null;
  if (!details.totals) {
    return (
      <p className="pt-1 text-xs text-muted-foreground">
        Sin total (algún alimento sin nutrientes)
      </p>
    );
  }
  return (
    <div className="pt-1">
      <NutritionTotals totals={details.totals} compact />
    </div>
  );
}

export default function NutritionTab() {
  const [selectedDate, setSelectedDate] = useState(() => localDateKey());
  const [composer, setComposer] = useState(null);
  const [historyDate, setHistoryDate] = useState('');
  const records = useNutritionRecords(selectedDate);
  const foods = useHealthLibrary('foods');
  const templates = useHealthLibrary('templates', 'nutrition');
  const history = records.history
    .filter((entry) => localDateKey(entry.observed_at) !== selectedDate)
    .filter((entry) => !historyDate || localDateKey(entry.observed_at) === historyDate);

  const closeComposer = () => setComposer(null);
  const openNew = () => setComposer({ key: `new-${Date.now()}`, template: null, activity: null });
  const openTemplate = (template) => setComposer({ key: `template-${template.id}-${Date.now()}`, template, activity: null });
  const openEdit = (activity) => setComposer({ key: `edit-${activity.id}`, template: null, activity });

  const submitComposer = async ({ payload, templateId, saveAsTemplate }) => {
    if (composer.activity) {
      const updated = await records.update(composer.activity.id, payload);
      if (updated) {
        closeComposer();
        await foods.reload();
      }
      return updated;
    }
    const result = await records.save({ payload, templateId, saveAsTemplate });
    if (result.record) {
      closeComposer();
      await Promise.all([foods.reload(), templates.reload()]);
    }
    return result.record;
  };

  return (
    <div className="space-y-6" data-testid="nutrition-tab">
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
                  Alguna comida del día no trae ese dato, así que suma solo las que sí
                  lo tienen: el total real es mayor.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sin datos para este día.</p>
          )}
        </CardContent>
      </Card>

      <HealthTemplateBrowser
        templates={templates.entries}
        groups={templates.groups}
        loading={templates.loading}
        onUse={openTemplate}
        onUpdate={templates.update}
        onRemove={templates.remove}
      />

      <Button onClick={openNew} data-testid="nutrition-new">
        <Plus className="w-4 h-4 mr-1" /> Registrar comida
      </Button>

      {composer && (
        <NutritionEntryForm
          key={composer.activity ? `${composer.activity.id}-${composer.activity.revision}` : `${composer.key}-${selectedDate}`}
          activity={composer.activity}
          template={composer.template}
          observedAt={dateTimeForSelectedDay(selectedDate)}
          foods={foods.entries}
          suggestedGroups={templates.groups}
          allowSaveAsTemplate={!composer.activity}
          saving={records.saving}
          onSubmit={submitComposer}
          onCancel={closeComposer}
        />
      )}

      <section className="space-y-3">
        <h3 className="font-semibold">Comidas del día</h3>
        <HealthActivityList
          activities={records.mealsForDay}
          tasks={records.tasks}
          loading={records.loading}
          saving={records.saving}
          allowCreate={false}
          compact
          emptyMessage="No hay comidas registradas para este día."
          onUpdate={records.update}
          onDelete={records.remove}
          onLinkTask={records.linkTask}
          onUnlinkTask={records.unlinkTask}
          renderDetails={(activity) => <NutritionDetails activity={activity} />}
          onEditRequest={openEdit}
        />
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-semibold">Historial reciente</h3>
          <HealthHistoryDateFilter value={historyDate} onChange={setHistoryDate} id="nutrition-history-date" />
        </div>
        <HealthActivityList
          activities={history}
          tasks={records.tasks}
          loading={records.loading}
          saving={records.saving}
          allowCreate={false}
          compact
          emptyMessage="No hay más comidas en el historial reciente."
          onUpdate={records.update}
          onDelete={records.remove}
          onLinkTask={records.linkTask}
          onUnlinkTask={records.unlinkTask}
          renderDetails={(activity) => <NutritionDetails activity={activity} />}
          onEditRequest={openEdit}
        />
      </section>
    </div>
  );
}
