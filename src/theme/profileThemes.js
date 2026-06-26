import { BookOpen, Dumbbell, Flame, Trees, Waves } from 'lucide-react';

export const PROFILE_THEME_IDS = ['stoic', 'calm', 'spiritual', 'performance', 'student'];

export const PROFILE_THEMES = {
  stoic: {
    id: 'stoic',
    styleName: 'Forja',
    name: 'Estoico',
    tagline: 'Convierte la presión en carácter.',
    brandTagline: 'Disciplina • Claridad • Virtud',
    primary: '#C6A75E',
    secondary: '#8B2F1F',
    soft: 'rgba(198, 167, 94, 0.12)',
    icon: Flame,
    motifs: ['column', 'laurel', 'ember'],
  },
  calm: {
    id: 'calm',
    styleName: 'Flujo',
    name: 'Calma',
    tagline: 'Vuelve al centro antes de actuar.',
    brandTagline: 'Respira • Observa • Avanza',
    primary: '#2F80ED',
    secondary: '#174A7C',
    soft: 'rgba(47, 128, 237, 0.10)',
    icon: Waves,
    motifs: ['water', 'ripple', 'breath'],
  },
  spiritual: {
    id: 'spiritual',
    styleName: 'Raiz',
    name: 'Espiritual',
    tagline: 'Alinea tu vida con tus valores.',
    brandTagline: 'Raiz • Valores • Proposito',
    primary: '#2F6B4F',
    secondary: '#8AA66A',
    soft: 'rgba(47, 107, 79, 0.12)',
    icon: Trees,
    motifs: ['leaf', 'wind', 'forest'],
  },
  performance: {
    id: 'performance',
    styleName: 'Pulso',
    name: 'Rendimiento',
    tagline: 'Energia dirigida. Accion medible.',
    brandTagline: 'Energia • Ritmo • Accion',
    primary: '#E0702F',
    secondary: '#9C3F1B',
    soft: 'rgba(224, 112, 47, 0.12)',
    icon: Dumbbell,
    motifs: ['pulse', 'strength', 'spark'],
  },
  student: {
    id: 'student',
    styleName: 'Lumen',
    name: 'Estudiante',
    tagline: 'Aprende hoy lo que sostendra tu futuro.',
    brandTagline: 'Lectura • Metodo • Futuro',
    primary: '#D8B56D',
    secondary: '#5D78A6',
    soft: 'rgba(216, 181, 109, 0.12)',
    icon: BookOpen,
    motifs: ['book', 'light', 'paper'],
  },
};

export const DEFAULT_PROFILE_THEME_ID = 'stoic';
