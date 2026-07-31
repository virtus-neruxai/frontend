import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Target, TrendingUp, Calendar, Pencil, X, Check } from 'lucide-react';
import { formatStatLabel } from '../lib/statUtils';
import MissionDraftModal from './MissionDraftModal';

const MISSION_TYPE_LABELS = {
  daily: 'Diaria',
  weekly: 'Semanal',
  long_term: 'A Largo Plazo',
  reflection: 'Reflexión'
};

function toMissionDraftData(mission) {
  if (!mission) return null;
  return {
    data: {
      ...mission,
      addToCalendar: mission.addToCalendar !== false,
      start_date: mission.scheduled_datetime || mission.start_date,
      due_date: mission.expires_at || mission.due_date,
    },
    metadata: {
      agent_reasoning: mission.agent_reasoning,
      confidence: mission.confidence,
    },
  };
}

/**
 * Muestra TODAS las misiones propuestas por MissionEngine a la vez (hasta 3),
 * como filas Aceptar/Descartar/Editar + acciones globales — igualando el
 * comportamiento de frontend-mobile, donde el usuario ya podía ver y actuar
 * sobre las 3 propuestas simultáneamente en vez de una por una.
 */
export default function MissionProposalsModal({
  isOpen,
  onClose,
  proposals = [],
  statsInfo = {},
  onAcceptAt,
  onRejectAt,
  onAcceptAll,
  onRejectAll,
  isSubmitting = false,
}) {
  const [editingIndex, setEditingIndex] = useState(null);

  if (proposals.length === 0) return null;

  const editingDraftData = editingIndex != null ? toMissionDraftData(proposals[editingIndex]) : null;

  return (
    <>
      <Dialog open={isOpen && editingIndex === null} onOpenChange={onClose}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Misiones Propuestas ({proposals.length})
            </DialogTitle>
            <DialogDescription>
              Revisa cada propuesta: acéptala, edítala antes de aceptarla o descártala.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {proposals.map((mission, index) => (
              <div key={mission.id || mission.base_template_id || index} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{mission.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{mission.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {MISSION_TYPE_LABELS[mission.mission_type] || mission.mission_type}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {mission.estimated_minutes} min
                  </Badge>
                  {mission.scheduled_datetime && (
                    <Badge variant="outline" className="text-xs">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(mission.scheduled_datetime).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </Badge>
                  )}
                  {Object.entries(mission.stat_rewards || {}).map(([stat, reward]) => (
                    <Badge
                      key={stat}
                      variant="outline"
                      className="text-xs border-[hsl(var(--success))]/30 bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]"
                    >
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {formatStatLabel(stat, statsInfo)} +{reward}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => setEditingIndex(index)}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => onRejectAt(index)}
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Descartar
                  </Button>
                  <Button
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => onAcceptAt(index)}
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Aceptar
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" disabled={isSubmitting} onClick={onRejectAll}>
              Descartar todas
            </Button>
            <Button disabled={isSubmitting} onClick={onAcceptAll}>
              {isSubmitting ? 'Confirmando...' : 'Aceptar restantes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MissionDraftModal
        isOpen={editingIndex !== null}
        onClose={() => setEditingIndex(null)}
        draftData={editingDraftData}
        onConfirm={async (editedData) => {
          const index = editingIndex;
          setEditingIndex(null);
          await onAcceptAt(index, editedData);
        }}
        onReject={async () => {
          const index = editingIndex;
          setEditingIndex(null);
          await onRejectAt(index);
        }}
      />
    </>
  );
}
