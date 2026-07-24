import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { HeartPulse, Lock } from 'lucide-react';
import TaskDraftModal from '../../../../components/TaskDraftModal';
import MissionDraftModal from '../../../../components/MissionDraftModal';
import { StatsHistoryChart } from '../StatsHistoryChart';
import { useBodyCheckin, buildBodyCheckinRange } from '../../../viewmodels/useBodyCheckin';
import { useDrafts } from '../../../viewmodels/useDrafts';
import { calculateBodyCheckinKPIs } from '../../../viewmodels/bodyCheckinKpiUtils';
import { BodyCheckinForm } from './BodyCheckinForm';
import { BodyCheckinKPIs } from './BodyCheckinKPIs';
import { BodyCheckinMentorBlock } from './BodyCheckinMentorBlock';
import { BodyCheckinSummaryPanel } from './BodyCheckinSummaryPanel';
import { BodyCheckinHistory } from './BodyCheckinHistory';
import { BodyCheckinStatChanges } from './BodyCheckinStatChanges';

const DRAFT_TYPE_BY_ACTION = {
  SHOW_TASK_CONFIRMATION_MODAL: 'task',
  SHOW_MISSION_CONFIRMATION_MODAL: 'mission',
};

/**
 * Check-in corporal — unidad visual independiente del Diario, en la primera
 * pestaña de Caracter. Estado, guardado y errores propios: si el check-in
 * falla, el Diario no se ve afectado (y viceversa). Instancia PROPIA de
 * useDrafts para que confirmar una propuesta del Mentor aquí no interfiera
 * con los drafts del Diario.
 *
 * onStatsChanged: el check-in tiene su propio hook/estado (useBodyCheckin),
 * separado del useCharacter() de CharacterPage — sin este callback, un stat
 * aplicado aquí no se reflejaba en el panel de Estadísticas hasta recargar.
 */
export function BodyCheckinSection({ statsInfo = {}, onStatsChanged }) {
  const checkin = useBodyCheckin();
  const drafts = useDrafts();
  const [evolutionRange, setEvolutionRange] = useState('30');

  const rangeDates = useMemo(
    () => buildBodyCheckinRange(evolutionRange),
    [evolutionRange]
  );

  const refreshData = useCallback(() => {
    checkin.loadSummary(checkin.summaryDays);
    checkin.loadHistory(30);
    checkin.loadEvolution({ from_date: rangeDates.fromDate, to_date: rangeDates.toDate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeDates.fromDate, rangeDates.toDate]);

  useEffect(() => {
    checkin.loadToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleSave = async (payload) => {
    const saved = await checkin.save(payload);
    if (saved) {
      refreshData();
      if (saved.note_analysis?.stats_applied) {
        onStatsChanged?.();
      }
    }
  };

  const handleOpenDraft = () => {
    const outcome = checkin.mentorOutcome;
    if (!outcome?.draft_id || !outcome?.ui_action) return;
    const type = DRAFT_TYPE_BY_ACTION[outcome.ui_action.action];
    if (type) {
      drafts.openDraftModal({
        draftId: outcome.draft_id,
        uiAction: outcome.ui_action,
        type,
      });
    }
  };

  const kpis = calculateBodyCheckinKPIs(checkin.history, statsInfo);
  const locked = checkin.status === 'saved_locked';

  return (
    <div className="space-y-4" data-testid="body-checkin-section">
      <BodyCheckinKPIs
        totalCheckins={kpis.totalCheckins}
        pointsGained={kpis.pointsGained}
        pointsLost={kpis.pointsLost}
        netBalance={kpis.netBalance}
        loading={checkin.status === 'loading'}
      />

      <StatsHistoryChart
        title="Evolución — Check-in corporal"
        data={checkin.evolution}
        range={evolutionRange}
        onRangeChange={setEvolutionRange}
        fromDate={rangeDates.fromDate}
        toDate={rangeDates.toDate}
        loading={checkin.evolutionLoading}
        statsInfo={statsInfo}
      />

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-primary" strokeWidth={1.5} />
              Check-in corporal
            </CardTitle>
            {locked && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Lock className="w-3 h-3" strokeWidth={1.5} />
                Registrado hoy
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {checkin.status === 'error' && (
            <p className="text-sm text-destructive" data-testid="body-checkin-error">
              No se pudo cargar el check-in corporal. El Diario sigue disponible.
            </p>
          )}
          {checkin.status === 'empty' && (
            <BodyCheckinForm onSubmit={handleSave} saving={checkin.saving} />
          )}
          {locked && checkin.todayCheckin && (
            <div className="space-y-2" data-testid="body-checkin-locked">
              <p className="text-sm text-muted-foreground">
                Check-in de hoy registrado. Se desbloquea mañana.
              </p>
              <p className="text-sm">
                {[
                  checkin.todayCheckin.sleep_hours != null && `sueño ${checkin.todayCheckin.sleep_hours}h`,
                  checkin.todayCheckin.energy_level != null && `energía ${checkin.todayCheckin.energy_level}/5`,
                  checkin.todayCheckin.stress_level != null && `estrés ${checkin.todayCheckin.stress_level}/5`,
                  checkin.todayCheckin.fatigue_level != null && `fatiga ${checkin.todayCheckin.fatigue_level}/5`,
                  checkin.todayCheckin.exercise_done != null &&
                    (checkin.todayCheckin.exercise_done ? 'ejercicio ✓' : 'sin ejercicio'),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              {(checkin.todayCheckin.derived_signals || []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {checkin.todayCheckin.derived_signals.map((signal) => (
                    <Badge key={signal} variant="outline" className="text-[10px]">
                      {signal}
                    </Badge>
                  ))}
                </div>
              )}
              <BodyCheckinStatChanges
                checkin={checkin.todayCheckin}
                statsInfo={statsInfo}
                showEmpty={Boolean(checkin.todayCheckin.note_analysis)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <BodyCheckinMentorBlock mentorOutcome={checkin.mentorOutcome} onOpenDraft={handleOpenDraft} />

      <BodyCheckinSummaryPanel
        summary={checkin.summary}
        days={checkin.summaryDays}
        onDaysChange={(days) => checkin.loadSummary(days)}
      />

      <BodyCheckinHistory items={checkin.history} statsInfo={statsInfo} />

      {/* Modales propios: confirmar aquí no toca el estado de drafts del Diario. */}
      <TaskDraftModal
        isOpen={drafts.showTaskDraftModal}
        onClose={() => drafts.setShowTaskDraftModal(false)}
        draftData={drafts.currentDraftData}
        onConfirm={(editedData) => drafts.confirmTaskDraft(editedData, refreshData)}
        onReject={drafts.rejectTaskDraft}
      />
      <MissionDraftModal
        isOpen={drafts.showMissionDraftModal}
        onClose={() => drafts.setShowMissionDraftModal(false)}
        draftData={drafts.currentDraftData}
        onConfirm={(editedData) => drafts.confirmMissionDraft(editedData, refreshData)}
        onReject={drafts.rejectMissionDraft}
      />
    </div>
  );
}
