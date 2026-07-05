import React from 'react';
import { Bot } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';

export default function MentorNotificationSettings({
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
          <p className="text-sm text-muted-foreground">Cargando notificaciones del Mentor...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="mentor-notification-settings-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          Notificaciones del Mentor
        </CardTitle>
        <CardDescription>
          Controla las notificaciones automáticas cuyo contenido genera el Mentor mediante IA.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Recibir notificaciones del Mentor</p>
            <p className="text-xs text-muted-foreground">
              Incluye el resumen NightlyReview y los seguimientos de reflexiones. No afecta a los avisos de tareas o misiones.
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            data-testid="toggle-mentor-notifications"
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={onSave} disabled={saving} data-testid="save-mentor-notifications-btn">
            {saving ? 'Guardando...' : 'Guardar preferencia'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
