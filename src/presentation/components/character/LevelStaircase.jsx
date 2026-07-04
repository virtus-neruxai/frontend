import { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';

const LEVEL_STEPS = Array.from({ length: 11 }, (_, i) => i * 10);

export function LevelStaircase({ level = 0, levelTitle, theme, justLeveledUp, onAnimationEnd }) {
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!justLeveledUp) return undefined;
    timeoutRef.current = setTimeout(() => {
      onAnimationEnd?.();
    }, 700);
    return () => clearTimeout(timeoutRef.current);
  }, [justLeveledUp, onAnimationEnd]);

  const currentStep = Math.min(10, Math.max(0, Math.round(level / 10)));
  const Icon = theme?.icon;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-bold text-foreground">Escalera de Nivel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-1 h-32">
          {LEVEL_STEPS.map((stepValue, i) => {
            const isCurrent = i === currentStep;
            const isPast = i < currentStep;
            const stepColor = isCurrent ? theme?.primary : isPast ? theme?.soft : 'hsl(var(--muted))';

            return (
              <div key={stepValue} className="flex-1 flex flex-col items-center justify-end gap-1">
                {isCurrent && Icon && (
                  <Icon
                    className={`w-5 h-5 mb-1 transition-transform duration-500 ${justLeveledUp ? 'animate-bounce' : ''}`}
                    style={{ color: theme?.primary }}
                    strokeWidth={1.5}
                  />
                )}
                <div
                  className="w-full rounded-t-md transition-all duration-500"
                  style={{ height: `${16 + i * 9}px`, backgroundColor: stepColor }}
                />
                <span className="text-[10px] text-muted-foreground">{stepValue}</span>
              </div>
            );
          })}
        </div>
        {levelTitle && (
          <p className="text-center text-sm font-medium text-muted-foreground mt-3">
            {levelTitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
