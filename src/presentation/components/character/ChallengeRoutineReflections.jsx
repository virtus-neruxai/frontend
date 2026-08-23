import { useEffect, useState } from 'react';
import { ChevronDown, MessageSquareText } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../components/ui/collapsible';
import { reflectionsApi } from '../../../lib/api';
import { formatMentorResponseText } from '../../../lib/mentorTextFormat';
import EmotionBadge from '../../../components/EmotionBadge';

const formatOccurrenceDate = (value) => {
  if (!value) return null;
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });
};

/**
 * Reflections written for the routine linked to an active challenge — same
 * data CharacterPage's "routine" reflection mode shows, scoped to one
 * routine. Collapsed by default so it doesn't dominate the challenge card;
 * renders nothing while loading or once loaded with no entries, so a fresh
 * challenge doesn't show an empty "Reflexiones" affordance.
 */
export function ChallengeRoutineReflections({ routineId }) {
  const [reflections, setReflections] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setReflections([]);
    setLoaded(false);
    if (!routineId) return;

    let cancelled = false;
    reflectionsApi
      .getAll({ reflection_type: 'routine', routine_id: routineId })
      .then((response) => {
        if (!cancelled) setReflections(Array.isArray(response.data) ? response.data : []);
      })
      .catch(() => {
        if (!cancelled) setReflections([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [routineId]);

  if (!routineId || !loaded || reflections.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-t pt-2">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <MessageSquareText size={13} />
            Reflexiones
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted text-[10px] font-semibold">
              {reflections.length}
            </span>
          </span>
          <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2 max-h-64 overflow-y-auto pr-1">
        {reflections.map((reflection) => (
          <div key={reflection.id} className="rounded-md border bg-card p-2.5">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-muted-foreground">
                {formatOccurrenceDate(reflection.routine_occurrence_date) || '—'}
              </span>
              <EmotionBadge emotionSnapshot={reflection.emotion_snapshot} className="text-[10px]" />
            </div>
            <p className="text-xs text-foreground whitespace-pre-wrap">{reflection.content}</p>
            {reflection.ai_response && (
              <div className="mt-2 p-2 bg-primary/10 border-l-2 border-primary rounded">
                <p className="text-[10px] font-semibold text-primary mb-0.5">Mentor:</p>
                <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap">
                  {formatMentorResponseText(reflection.ai_response)}
                </p>
              </div>
            )}
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
