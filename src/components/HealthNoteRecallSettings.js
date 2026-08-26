import React from 'react';
import { HeartPulse } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';

export default function HealthNoteRecallSettings({
  enabled,
  loading,
  saving,
  onToggle,
  onSave,
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Cargando memoria del Mentor de Salud...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="health-note-recall-settings-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HeartPulse className="w-5 h-5" />
          Memoria del Mentor de Salud
        </CardTitle>
        <CardDescription>
          El Mentor de Salud nunca graba tus conversaciones. Cuando te cuentas algo relevante
          (una restricción, un objetivo, una lesión), guarda una nota breve para no preguntártelo
          otra vez. Este ajuste controla si esas notas pueden recuperarse en conversaciones
          futuras — está activado por defecto.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Recordar mis notas de salud</p>
            <p className="text-xs text-muted-foreground">
              Al desactivarlo, el Mentor deja de recuperar tus notas al instante — no borra las
              notas ya guardadas, solo su capacidad de recordarlas. Puedes seguir viéndolas y
              editándolas desde la conversación de salud, y activarlo de nuevo las vuelve a hacer
              recordables.
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            data-testid="toggle-health-note-recall"
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={onSave} disabled={saving} data-testid="save-health-note-recall-btn">
            {saving ? 'Guardando...' : 'Guardar preferencia'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
