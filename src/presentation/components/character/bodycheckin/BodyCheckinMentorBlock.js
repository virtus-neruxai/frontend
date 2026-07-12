import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Sparkles } from 'lucide-react';
import { formatMentorResponseText } from '../../../../lib/mentorTextFormat';

/**
 * Salida del Mentor tras registrar el check-in corporal (mentor_outcome).
 * kind="comment" → comentario breve; kind="draft" → propuesta confirmable
 * (tarea/rutina/misión) que se abre con el flujo de drafts existente.
 */
export function BodyCheckinMentorBlock({ mentorOutcome, onOpenDraft }) {
  if (!mentorOutcome) return null;

  return (
    <Card data-testid="body-checkin-mentor">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" strokeWidth={1.5} />
          Respuesta del Mentor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {mentorOutcome.comment && (
          <p className="text-sm whitespace-pre-line text-muted-foreground">
            {formatMentorResponseText(mentorOutcome.comment)}
          </p>
        )}
        {mentorOutcome.kind === 'draft' && mentorOutcome.draft_id && (
          <Button size="sm" onClick={onOpenDraft}>
            Ver propuesta
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
