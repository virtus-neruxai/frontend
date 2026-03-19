export const PROFILE_NAMES = {
  stoic: 'Estoico',
  spiritual: 'Espiritual',
  calm: 'Calma',
  performance: 'Rendimiento',
  student: 'Estudiante',
};

export const PROFILE_EMOJIS = {
  stoic: '⚖️',
  spiritual: '🌿',
  calm: '🌊',
  performance: '⚡',
  student: '📚',
};

export const getProfileName = (profile) => PROFILE_NAMES[profile] || 'Estoico';
export const getProfileEmoji = (profile) => PROFILE_EMOJIS[profile] || '⚖️';
