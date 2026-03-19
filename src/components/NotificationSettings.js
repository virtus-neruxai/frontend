import React from 'react';
import { Bell, Moon, Volume2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, value) => value);

const formatHour = (hour) => `${String(hour).padStart(2, '0')}:00`;

export default function NotificationSettings({
  settings,
  loading,
  saving,
  onToggle,
  onPriorityToggle,
  onDndHourChange,
  onSave,
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Cargando configuración...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="notification-settings-card">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notificaciones
          </CardTitle>
          <CardDescription>Controla qué alertas recibes y cuándo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Activar notificaciones</p>
              <p className="text-xs text-muted-foreground">Desactiva todas las notificaciones en tiempo real.</p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => onToggle('enabled', checked)}
              data-testid="toggle-notifications-enabled"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-start gap-2">
              <Volume2 className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Sonido</p>
                <p className="text-xs text-muted-foreground">Reproduce audio al recibir una notificación.</p>
              </div>
            </div>
            <Switch
              checked={settings.sound_enabled}
              onCheckedChange={(checked) => onToggle('sound_enabled', checked)}
              disabled={!settings.enabled}
              data-testid="toggle-sound-enabled"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prioridades</CardTitle>
          <CardDescription>Selecciona qué niveles quieres recibir.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {['urgent', 'high', 'medium', 'low'].map((priority) => (
            <div className="flex items-center justify-between" key={priority}>
              <p className="text-sm font-medium capitalize">{priority}</p>
              <Switch
                checked={Boolean(settings.priority_preferences?.[priority])}
                onCheckedChange={(checked) => onPriorityToggle(priority, checked)}
                disabled={!settings.enabled}
                data-testid={`toggle-priority-${priority}`}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="w-5 h-5" />
            No molestar (DND)
          </CardTitle>
          <CardDescription>Bloquea notificaciones dentro de la franja configurada.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Activar DND</p>
            <Switch
              checked={Boolean(settings.do_not_disturb?.enabled)}
              onCheckedChange={(checked) => onToggle('do_not_disturb.enabled', checked)}
              disabled={!settings.enabled}
              data-testid="toggle-dnd-enabled"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Desde</label>
              <select
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={settings.do_not_disturb?.start_hour ?? 22}
                onChange={(event) => onDndHourChange('start_hour', Number(event.target.value))}
                disabled={!settings.enabled || !settings.do_not_disturb?.enabled}
                data-testid="dnd-start-hour"
              >
                {HOUR_OPTIONS.map((hour) => (
                  <option key={`start-${hour}`} value={hour}>{formatHour(hour)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Hasta</label>
              <select
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={settings.do_not_disturb?.end_hour ?? 8}
                onChange={(event) => onDndHourChange('end_hour', Number(event.target.value))}
                disabled={!settings.enabled || !settings.do_not_disturb?.enabled}
                data-testid="dnd-end-hour"
              >
                {HOUR_OPTIONS.map((hour) => (
                  <option key={`end-${hour}`} value={hour}>{formatHour(hour)}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving} data-testid="save-notification-settings">
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </Button>
      </div>
    </div>
  );
}
