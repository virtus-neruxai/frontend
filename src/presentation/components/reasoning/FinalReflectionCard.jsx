import { Loader2, ListTodo, Repeat, Target } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';

/**
 * §6.5 — a button here is explicit authorization to open the matching draft
 * flow, never a confirmation that anything gets created: nothing reaches
 * `items` until the user confirms the draft modal that opens afterwards.
 */
export default function FinalReflectionCard({ text, onAction, pendingAction }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reflexión final</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm">{text}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={Boolean(pendingAction)}
            onClick={() => onAction('task')}
          >
            {pendingAction === 'task'
              ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
              : <ListTodo className="mr-1 h-3.5 w-3.5" />}
            Crear tarea
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={Boolean(pendingAction)}
            onClick={() => onAction('mission')}
          >
            {pendingAction === 'mission'
              ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
              : <Target className="mr-1 h-3.5 w-3.5" />}
            Crear misión
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={Boolean(pendingAction)}
            onClick={() => onAction('routine')}
          >
            {pendingAction === 'routine'
              ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
              : <Repeat className="mr-1 h-3.5 w-3.5" />}
            Crear rutina
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
