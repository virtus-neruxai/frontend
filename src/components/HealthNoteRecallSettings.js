import React from 'react';
import { HeartPulse } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';

/**
 * Los tres permisos del Mentor de Salud, en una tarjeta.
 *
 * Gobiernan cosas distintas y por eso se piden por separado, no por prolijidad:
 * uno decide si tu prosa sanitaria puede **indexarse** para recordarla luego,
 * otro si el Mentor puede **leer** tus registros dentro de un turno (nada de
 * eso estuvo indexado nunca), y el tercero si puede mirar las señales
 * emocionales de tu diario — el único que cruza fuera de Salud, y separado
 * justamente para poder negarse solo. "Usa mis datos" y "mira mi diario"
 * merecen respuestas distintas.
 *
 * Los tres están concedidos por defecto y cada uno se guarda por su cuenta:
 * revocar el de recuerdo purga lo indexado antes de escribir el estado nuevo,
 * y revocar cualquiera de los otros dos corta una lectura en el turno
 * siguiente sin nada que purgar. Decir que se ha borrado algo que no existía
 * sería reportar un borrado que nunca ocurrió.
 */
const SCOPES = [
  {
    scope: 'health_note_recall',
    title: 'Recordar mis notas de salud',
    description:
      'Al desactivarlo, el Mentor deja de recuperar tus notas al instante — no borra las ' +
      'notas ya guardadas, solo su capacidad de recordarlas. Puedes seguir viéndolas y ' +
      'editándolas desde la conversación de salud, y activarlo de nuevo las vuelve a hacer ' +
      'recordables.',
    testId: 'toggle-health-note-recall',
  },
  {
    scope: 'health_records_context',
    title: 'Usar mis registros al responderme',
    description:
      'Permite que el Mentor lea tu objetivo, tus comidas y entrenos registrados, tus ' +
      'medidas y tu check-in corporal mientras te responde, cuando actives "utiliza mis ' +
      'datos personales" en la conversación. Al desactivarlo responde con criterio general ' +
      'y te lo dice; tus registros siguen intactos y visibles en la app.',
    testId: 'toggle-health-records-context',
  },
  {
    scope: 'health_wellbeing_context',
    title: 'Cruzar las emociones de mi diario',
    description:
      'Permite que el Mentor de Salud vea la emoción, la intensidad y la fricción que ' +
      'anotaste en tus reflexiones — nunca el texto — para relacionar cómo te sentiste con ' +
      'lo que registraste esos días. Es el único permiso que saca información de Salud. Al ' +
      'desactivarlo pierde ese bloque y conserva el resto.',
    testId: 'toggle-health-wellbeing-context',
  },
];

export default function HealthNoteRecallSettings({
  scopes,
  loading,
  saving,
  onToggle,
  onSave,
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Cargando permisos del Mentor de Salud...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="health-note-recall-settings-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HeartPulse className="w-5 h-5" />
          Permisos del Mentor de Salud
        </CardTitle>
        <CardDescription>
          El Mentor de Salud nunca graba tus conversaciones. Estos tres permisos deciden qué
          puede recordar y qué puede leer de lo que ya has registrado tú. Están activados por
          defecto y se guardan por separado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {SCOPES.map(({ scope, title, description, testId }) => (
          <div key={scope} className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <Switch
              checked={scopes?.[scope] !== false}
              onCheckedChange={(checked) => onToggle(scope, checked)}
              data-testid={testId}
            />
          </div>
        ))}

        <div className="flex justify-end">
          <Button onClick={onSave} disabled={saving} data-testid="save-health-note-recall-btn">
            {saving ? 'Guardando...' : 'Guardar permisos'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
