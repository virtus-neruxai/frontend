export const EMOTION_CATALOG = {
  positive: [
    { label: 'Alegría', emoji: '😄' },
    { label: 'Calma', emoji: '😌' },
    { label: 'Gratitud', emoji: '🙏' },
    { label: 'Esperanza', emoji: '🌤️' },
    { label: 'Motivación', emoji: '🔥' },
    { label: 'Confianza', emoji: '💪' },
    { label: 'Orgullo', emoji: '🏅' },
    { label: 'Satisfacción', emoji: '✅' },
    { label: 'Alivio', emoji: '😮‍💨' },
    { label: 'Amor', emoji: '❤️' },
    { label: 'Conexión', emoji: '🤝' },
    { label: 'Interés', emoji: '🔎' },
  ],
  neutral: [
    { label: 'Concentración', emoji: '🧠' },
    { label: 'Neutralidad', emoji: '😐' },
    { label: 'Cansancio leve', emoji: '😮‍💨' },
    { label: 'Monotonía', emoji: '🫥' },
    { label: 'Tensión leve', emoji: '😬' },
    { label: 'Dispersión', emoji: '🌫️' },
    { label: 'Curiosidad', emoji: '🧭' },
    { label: 'Contención', emoji: '🧱' },
  ],
  negative: [
    { label: 'Tristeza', emoji: '😢' },
    { label: 'Ansiedad', emoji: '😰' },
    { label: 'Estrés', emoji: '😵‍💫' },
    { label: 'Miedo', emoji: '😨' },
    { label: 'Enfado', emoji: '😠' },
    { label: 'Frustración', emoji: '😤' },
    { label: 'Culpa', emoji: '😓' },
    { label: 'Vergüenza', emoji: '😳' },
    { label: 'Decepción', emoji: '😞' },
    { label: 'Soledad', emoji: '😔' },
    { label: 'Inseguridad', emoji: '😬' },
    { label: 'Desánimo', emoji: '🫥' },
  ],
};

export const EMOTION_EMOJI_MAP = Object.values(EMOTION_CATALOG)
  .flat()
  .reduce((acc, entry) => {
    acc[entry.label] = entry.emoji;
    return acc;
  }, {});

export const EMOTION_POLARITY_MAP = Object.entries(EMOTION_CATALOG)
  .flatMap(([polarity, entries]) => entries.map((entry) => [entry.label, polarity]))
  .reduce((acc, [label, polarity]) => {
    acc[label] = polarity;
    return acc;
  }, {});
