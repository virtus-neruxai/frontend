import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  Target, Calendar, Trash2,
  CheckCircle2, XCircle, RefreshCw
} from 'lucide-react';
import { getProfileName, getProfileEmoji } from '../../../lib/profileUtils';
import { formatStatLabel } from '../../../lib/statUtils';

const MISSION_TYPE_LABELS = {
  daily: 'Diaria',
  character: 'Carácter',
  reflection: 'Diario'
};

/**
 * MissionCard Component
 * 
 * Displays a single mission with its details and action buttons
 * 
 * @param {Object} props
 * @param {Object} props.mission - Mission object
 * @param {Function} props.onSelect - Callback when mission is selected
 * @param {Function} props.onSchedule - Callback to schedule mission
 * @param {Function} props.onDelete - Callback to delete mission
 */
const MissionCard = ({ mission, onSelect, onSchedule, onDelete, statsInfo = {} }) => {
  const canOpenMissionDialog = !!mission.linked_task_id;

  return (
    <Card className="border-[#E4E4E7] hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div
            className={`flex-1 ${canOpenMissionDialog ? 'cursor-pointer' : 'cursor-default'}`}
            onClick={canOpenMissionDialog ? () => onSelect(mission) : undefined}
          >
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {MISSION_TYPE_LABELS[mission.mission_type]}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Dificultad: {mission.difficulty}/5
              </Badge>
              <Badge variant="outline" className="text-xs border-purple-300 text-purple-700 bg-purple-50">
                {getProfileEmoji(mission.prompt_profile || 'stoic')} {getProfileName(mission.prompt_profile || 'stoic')}
              </Badge>
            </div>
            
            <h3 className="font-semibold text-[#18181B] dark:text-white mb-1">{mission.title}</h3>
            <p className="text-sm text-[#71717A] mb-2">{mission.description}</p>
            
            {/* Rewards */}
            {mission.stat_rewards && Object.keys(mission.stat_rewards).length > 0 && (
              <div className="flex items-center gap-1 mb-2">
                <CheckCircle2 className="w-4 h-4 text-[#22C55E]" strokeWidth={1.5} />
                <div className="flex gap-1 flex-wrap">
                  {Object.entries(mission.stat_rewards).map(([stat, value]) => (
                    <Badge 
                      key={stat} 
                      variant="outline" 
                      className="text-xs text-[#22C55E] border-[#22C55E]"
                    >
                      +{value} {formatStatLabel(stat, statsInfo)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Penalties */}
            {mission.stat_penalties && Object.keys(mission.stat_penalties).length > 0 && (
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-[#EF4444]" strokeWidth={1.5} />
                <span className="text-xs font-medium text-[#EF4444]">Si fallas:</span>
                <div className="flex gap-1 flex-wrap">
                  {Object.entries(mission.stat_penalties).map(([stat, value]) => (
                    <Badge 
                      key={stat} 
                      variant="outline" 
                      className="text-xs text-[#EF4444] border-[#EF4444]"
                    >
                      -{Math.abs(Number(value) || 0)} {formatStatLabel(stat, statsInfo)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-2 ml-4">
            {!mission.linked_task_id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSchedule(mission)}
                className="rounded-full"
              >
                <Calendar className="w-3 h-3 mr-1" />
                Programar
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(mission.id)}
              disabled={!!mission.linked_task_id}
              className="rounded-full text-[#EF4444] hover:bg-[#FEF2F2] disabled:opacity-50 disabled:cursor-not-allowed"
              title={mission.linked_task_id ? "No puedes eliminar una misión programada" : "Eliminar misión"}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * MissionsList Component
 * 
 * Displays a list of missions with actions
 * 
 * @param {Object} props
 * @param {Array} props.missions - Array of mission objects
 * @param {boolean} props.generatingMissions - Whether missions are being generated
 * @param {boolean} props.nightlyReviewLoading - Whether nightly review is loading
 * @param {Function} props.onGenerateMissions - Callback to generate missions
 * @param {Function} props.onNightlyReview - Callback to perform nightly review
 * @param {Function} props.onSelectMission - Callback when mission is selected
 * @param {Function} props.onScheduleMission - Callback to schedule a mission
 * @param {Function} props.onDeleteMission - Callback to delete a mission
 */
export const MissionsList = ({
  missions,
  generatingMissions,
  nightlyReviewLoading,
  onGenerateMissions,
  onNightlyReview,
  onSelectMission,
  onScheduleMission,
  onDeleteMission,
  statsInfo = {},
}) => {
  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#18181B] dark:text-white">Misiones Activas</h2>
        <div className="flex items-center gap-2">
          <Button
            onClick={onNightlyReview}
            disabled={nightlyReviewLoading}
            variant="outline"
            className="rounded-full border-[#8B5CF6] text-[#8B5CF6] hover:bg-[#EDE9FE]"
            data-testid="nightly-review-btn"
          >
            <RefreshCw 
              className={`w-4 h-4 mr-2 ${nightlyReviewLoading ? 'animate-pulse' : ''}`} 
              strokeWidth={1.5} 
            />
            {nightlyReviewLoading ? 'Generando...' : 'Revisión Nocturna'}
          </Button>
          <Button
            onClick={onGenerateMissions}
            disabled={generatingMissions}
            className="bg-[#F97316] hover:bg-[#EA580C] text-white rounded-full"
            data-testid="generate-missions-btn"
          >
            <RefreshCw 
              className={`w-4 h-4 mr-2 ${generatingMissions ? 'animate-spin' : ''}`} 
              strokeWidth={1.5} 
            />
            {generatingMissions ? 'Generando...' : 'Generar Misiones'}
          </Button>
        </div>
      </div>

      {/* Missions List */}
      {missions.length === 0 ? (
        <Card className="border-[#E4E4E7] border-dashed">
          <CardContent className="p-8 text-center">
            <Target className="w-12 h-12 mx-auto text-[#71717A] mb-4" strokeWidth={1} />
            <p className="text-[#71717A]">No tienes misiones activas</p>
            <p className="text-sm text-[#A1A1AA]">Genera nuevas misiones para empezar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {missions.map(mission => (
            <MissionCard
              key={mission.id}
              mission={mission}
              onSelect={onSelectMission}
              onSchedule={onScheduleMission}
              onDelete={onDeleteMission}
              statsInfo={statsInfo}
            />
          ))}
        </div>
      )}
    </div>
  );
};
