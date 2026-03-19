import React from 'react';
import { Bot } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';

export default function ProactiveSettings({
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
          <p className="text-sm text-muted-foreground">Cargando ajustes proactivos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="proactive-settings-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          Orquestador proactivo
        </CardTitle>
        <CardDescription>
          Por defecto las sugerencias quedan en borrador. Activa esta opción solo si quieres permitir que el sistema aplique cambios proactivos compatibles automáticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Permitir auto-apply proactivo</p>
            <p className="text-xs text-muted-foreground">
              Solo habilita la ejecución automática cuando el servicio la soporte y los guardrails la permitan.
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            data-testid="toggle-proactive-auto-apply"
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={onSave} disabled={saving} data-testid="save-proactive-settings-btn">
            {saving ? 'Guardando...' : 'Guardar ajuste proactivo'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
