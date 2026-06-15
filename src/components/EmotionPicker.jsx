import { useState } from 'react';

const CATALOG = {
  positive: [
    { label: 'Alegría', emoji: '😄' },
    { label: 'Calma', emoji: '😌' },
    { label: 'Gratitud', emoji: '🙏' },
    { label: 'Esperanza', emoji: '🌤️' },
    { label: 'Motivación', emoji: '🔥' },
    { label: 'Confianza', emoji: '💪' },
  ],
  neutral: [
    { label: 'Concentración', emoji: '🧠' },
    { label: 'Neutralidad', emoji: '😐' },
    { label: 'Cansancio leve', emoji: '😮‍💨' },
    { label: 'Dispersión', emoji: '🌫️' },
    { label: 'Curiosidad', emoji: '🧭' },
    { label: 'Contención', emoji: '🧱' },
  ],
  negative: [
    { label: 'Tristeza', emoji: '😢' },
    { label: 'Ansiedad', emoji: '😰' },
    { label: 'Estrés', emoji: '😵‍💫' },
    { label: 'Frustración', emoji: '😤' },
    { label: 'Culpa', emoji: '😓' },
    { label: 'Desánimo', emoji: '🫥' },
  ],
};

const POLARITY_LABELS = {
  positive: '😊 Positiva',
  neutral: '😐 Neutra',
  negative: '😔 Difícil',
};

const POLARITY_STYLES = {
  positive: {
    tab: 'border-green-300 text-green-700 hover:bg-green-100',
    tabActive: 'bg-green-100 border-green-500 text-green-900 font-semibold',
    chip: 'border-green-300 text-green-700 hover:bg-green-100',
    chipActive: 'bg-green-200 border-green-500 text-green-900 font-semibold',
  },
  neutral: {
    tab: 'border-blue-300 text-blue-700 hover:bg-blue-100',
    tabActive: 'bg-blue-100 border-blue-500 text-blue-900 font-semibold',
    chip: 'border-blue-300 text-blue-700 hover:bg-blue-100',
    chipActive: 'bg-blue-200 border-blue-500 text-blue-900 font-semibold',
  },
  negative: {
    tab: 'border-red-300 text-red-700 hover:bg-red-100',
    tabActive: 'bg-red-100 border-red-500 text-red-900 font-semibold',
    chip: 'border-red-300 text-red-700 hover:bg-red-100',
    chipActive: 'bg-red-200 border-red-500 text-red-900 font-semibold',
  },
};

export default function EmotionPicker({ value, onChange }) {
  const [activePolarity, setActivePolarity] = useState(value?.polarity || null);

  const handleTogglePolarity = (polarity) => {
    if (activePolarity === polarity) {
      setActivePolarity(null);
      if (value?.polarity === polarity) onChange(null);
    } else {
      setActivePolarity(polarity);
    }
  };

  const handlePickEmotion = (polarity, label) => {
    if (value?.emotion === label && value?.polarity === polarity) {
      onChange(null);
    } else {
      onChange({ polarity, emotion: label, intensity: value?.intensity ?? 3, note: null });
    }
  };

  const handleIntensity = (e) => {
    if (!value) return;
    onChange({ ...value, intensity: parseInt(e.target.value, 10) });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        ¿Cómo te sientes? <span className="normal-case font-normal">(opcional)</span>
      </p>
      <div className="flex gap-2">
        {Object.entries(CATALOG).map(([polarity, emotions]) => {
          const styles = POLARITY_STYLES[polarity];
          const isOpen = activePolarity === polarity;
          return (
            <div key={polarity} className="flex-1">
              <button
                type="button"
                onClick={() => handleTogglePolarity(polarity)}
                className={`w-full text-xs px-2 py-1.5 rounded border transition-colors ${
                  isOpen ? styles.tabActive : styles.tab
                }`}
              >
                {POLARITY_LABELS[polarity]}
              </button>
              {isOpen && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {emotions.map(({ label, emoji }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => handlePickEmotion(polarity, label)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        value?.emotion === label && value?.polarity === polarity
                          ? styles.chipActive
                          : styles.chip
                      }`}
                    >
                      {emoji} {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {value && (
        <div className="flex items-center gap-3 pt-1">
          <span className="text-xs text-gray-500 whitespace-nowrap">Intensidad:</span>
          <input
            type="range"
            min={1}
            max={5}
            value={value.intensity}
            onChange={handleIntensity}
            className="flex-1 h-1 accent-orange-500 cursor-pointer"
          />
          <span className="text-xs font-bold text-orange-600 w-6 text-right">{value.intensity}/5</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
