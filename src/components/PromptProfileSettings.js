import React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { PROFILE_THEME_IDS, PROFILE_THEMES } from '../theme/profileThemes';

const PROFILE_DESCRIPTIONS = {
  stoic: 'Autodominio y voluntad. Claridad, ejecucion y control de lo que esta en tu mano.',
  spiritual: 'Proposito y coherencia interior. Conecta tus acciones con tus valores mas profundos.',
  calm: 'Recuperacion sin presion. Pasos pequenos, sin sermones de rendimiento.',
  performance: 'Habitos fisicos y consistencia corporal. El cuerpo como herramienta de accion.',
  student: 'Aprendizaje y carrera. Deep work, estudio sistematico y progreso medible.',
};

export default function PromptProfileSettings({
  currentProfile,
  loading,
  saving,
  onSelect,
  onSave,
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Cargando perfil del mentor...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="prompt-profile-settings-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Perfil del mentor
        </CardTitle>
        <CardDescription>
          Elige cómo quieres que el agente te guíe. Cada perfil adapta el tono y el enfoque de todos los consejos, tareas y misiones.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {PROFILE_THEME_IDS.map((profileId) => {
            const profile = PROFILE_THEMES[profileId];
            const Icon = profile.icon;
            const isSelected = currentProfile === profile.id;
            return (
              <button
                key={profile.id}
                type="button"
                onClick={() => onSelect(profile.id)}
                className={[
                  'flex items-start gap-3 rounded-lg border p-4 text-left transition-colors w-full',
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.18)]'
                    : 'border-border hover:border-primary/50 hover:bg-muted/40',
                ].join(' ')}
                data-testid={`profile-option-${profile.id}`}
              >
                <span
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border"
                  style={{
                    color: profile.primary,
                    backgroundColor: profile.soft,
                    borderColor: profile.primary,
                  }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className={[
                    'text-sm font-semibold',
                    isSelected ? 'text-foreground' : 'text-foreground',
                  ].join(' ')}>
                    {profile.name}
                    {isSelected && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">activo</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {PROFILE_DESCRIPTIONS[profile.id]}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <Button
          onClick={onSave}
          disabled={saving}
          className="w-full"
          data-testid="save-prompt-profile-btn"
        >
          {saving ? 'Guardando...' : 'Guardar perfil'}
        </Button>
      </CardContent>
    </Card>
  );
}
