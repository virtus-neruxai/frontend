import React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

const PROFILES = [
  {
    id: 'stoic',
    name: 'Estoico',
    emoji: '⚖️',
    description: 'Autodominio y voluntad. Marco Aurelio como mentor: claridad, ejecución y control de lo que está en tu mano.',
  },
  {
    id: 'spiritual',
    name: 'Espiritual',
    emoji: '🌿',
    description: 'Propósito y coherencia interior. Guía que conecta tus acciones con tus valores más profundos.',
  },
  {
    id: 'calm',
    name: 'Calma',
    emoji: '🌊',
    description: 'Recuperación sin presión. Para momentos de agotamiento: pasos pequeños, sin sermones de rendimiento.',
  },
  {
    id: 'performance',
    name: 'Rendimiento',
    emoji: '⚡',
    description: 'Hábitos físicos y consistencia corporal. El cuerpo como herramienta de la voluntad.',
  },
  {
    id: 'student',
    name: 'Estudiante',
    emoji: '📚',
    description: 'Aprendizaje y carrera. Deep work, estudio sistemático y progreso académico medible.',
  },
];

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
          {PROFILES.map((profile) => {
            const isSelected = currentProfile === profile.id;
            return (
              <button
                key={profile.id}
                type="button"
                onClick={() => onSelect(profile.id)}
                className={[
                  'flex items-start gap-3 rounded-lg border p-4 text-left transition-colors w-full',
                  isSelected
                    ? 'border-[#18181B] bg-[#18181B]/5 dark:border-white dark:bg-white/5'
                    : 'border-border hover:border-[#71717A] hover:bg-muted/40',
                ].join(' ')}
                data-testid={`profile-option-${profile.id}`}
              >
                <span className="text-xl leading-none mt-0.5">{profile.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={[
                    'text-sm font-semibold',
                    isSelected ? 'text-[#18181B] dark:text-white' : 'text-foreground',
                  ].join(' ')}>
                    {profile.name}
                    {isSelected && (
                      <span className="ml-2 text-xs font-normal text-[#71717A]">activo</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {profile.description}
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
