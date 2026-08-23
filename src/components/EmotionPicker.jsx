import { useEffect, useState } from 'react';
import { emotionsApi } from '../lib/api';

const EMPTY_CATALOG = { positive: [], neutral: [], negative: [] };

const POLARITY_LABELS = {
  positive: '😊 Positiva',
  neutral: '😐 Neutra',
  negative: '😔 Difícil',
};

const POLARITY_STYLES = {
  positive: {
    tab: 'border-[hsl(var(--success))] text-[hsl(var(--success))] hover:bg-[hsl(var(--success-soft))]',
    tabActive: 'bg-[hsl(var(--success-soft))] border-[hsl(var(--success))] text-[hsl(var(--success))] font-semibold',
    chip: 'border-[hsl(var(--success))] text-[hsl(var(--success))] hover:bg-[hsl(var(--success-soft))]',
    chipActive: 'bg-[hsl(var(--success-soft))] border-[hsl(var(--success))] text-[hsl(var(--success))] font-semibold',
  },
  neutral: {
    tab: 'border-[hsl(var(--info))] text-[hsl(var(--info))] hover:bg-[hsl(var(--info-soft))]',
    tabActive: 'bg-[hsl(var(--info-soft))] border-[hsl(var(--info))] text-[hsl(var(--info))] font-semibold',
    chip: 'border-[hsl(var(--info))] text-[hsl(var(--info))] hover:bg-[hsl(var(--info-soft))]',
    chipActive: 'bg-[hsl(var(--info-soft))] border-[hsl(var(--info))] text-[hsl(var(--info))] font-semibold',
  },
  negative: {
    tab: 'border-destructive text-destructive hover:bg-[hsl(var(--destructive-soft))]',
    tabActive: 'bg-[hsl(var(--destructive-soft))] border-destructive text-destructive font-semibold',
    chip: 'border-destructive text-destructive hover:bg-[hsl(var(--destructive-soft))]',
    chipActive: 'bg-[hsl(var(--destructive-soft))] border-destructive text-destructive font-semibold',
  },
};

export default function EmotionPicker({ value, onChange, disabled = false }) {
  const [activePolarity, setActivePolarity] = useState(value?.polarity || null);
  const [catalog, setCatalog] = useState(EMPTY_CATALOG);

  useEffect(() => {
    setActivePolarity(value?.polarity || null);
  }, [value?.polarity]);

  useEffect(() => {
    let cancelled = false;
    emotionsApi
      .getCatalog()
      .then(({ data }) => {
        if (!cancelled && data?.catalog) setCatalog(data.catalog);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleTogglePolarity = (polarity) => {
    if (disabled) return;
    if (activePolarity === polarity) {
      setActivePolarity(null);
      if (value?.polarity === polarity) onChange(null);
    } else {
      setActivePolarity(polarity);
    }
  };

  const handlePickEmotion = (polarity, label) => {
    if (disabled) return;
    if (value?.emotion === label && value?.polarity === polarity) {
      onChange(null);
    } else {
      onChange({ polarity, emotion: label, intensity: value?.intensity ?? 3 });
    }
  };

  const handleIntensity = (e) => {
    if (!value || disabled) return;
    onChange({ ...value, intensity: parseInt(e.target.value, 10) });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        ¿Cómo te sientes? <span className="normal-case font-normal">(opcional)</span>
      </p>
      <div className="flex gap-2">
        {Object.entries(catalog).map(([polarity, emotions]) => {
          const styles = POLARITY_STYLES[polarity];
          const isOpen = activePolarity === polarity;
          return (
            <div key={polarity} className="flex-1">
              <button
                type="button"
                onClick={() => handleTogglePolarity(polarity)}
                disabled={disabled}
                className={`w-full text-xs px-2 py-1.5 rounded border transition-colors ${
                  isOpen ? styles.tabActive : styles.tab
                } disabled:cursor-not-allowed disabled:opacity-50`}
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
                      disabled={disabled}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${
                        value?.emotion === label && value?.polarity === polarity
                          ? styles.chipActive
                          : styles.chip
                      } disabled:cursor-not-allowed disabled:opacity-50`}
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
          <span className="text-xs text-muted-foreground whitespace-nowrap">Intensidad:</span>
          <input
            type="range"
            min={1}
            max={5}
            value={value.intensity}
            onChange={handleIntensity}
            disabled={disabled}
            className="flex-1 h-1 accent-[hsl(var(--primary))] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span className="text-xs font-bold text-primary w-6 text-right">{value.intensity}/5</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            className="text-xs text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
