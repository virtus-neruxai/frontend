import { useState, useEffect } from 'react';
import { Sun, CalendarDays, CalendarRange, Flame } from 'lucide-react';
import { challengesApi } from '../../../lib/api';

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-muted rounded ${className}`} />;
}

const TYPES = [
  { key: 'daily', label: 'Desafío diario', icon: Sun, color: 'text-[hsl(var(--info))]', bg: 'bg-[hsl(var(--info-soft))]' },
  { key: 'weekly', label: 'Desafío semanal', icon: CalendarDays, color: 'text-primary', bg: 'bg-primary/10' },
  { key: 'monthly', label: 'Desafío mensual', icon: CalendarRange, color: 'text-[hsl(var(--virtus-secondary))]', bg: 'bg-secondary' },
];

export function ChallengesCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    challengesApi
      .dashboard()
      .then((res) => setData(res.data || {}))
      .catch(() => setData({}))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && data && !data.daily && !data.weekly && !data.monthly) {
    return null;
  }

  return (
    <div
      className="rounded-[8px] border bg-card p-5"
      data-testid="challenges-card"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TYPES.map((type) => {
          const Icon = type.icon;
          const challenge = data?.[type.key];
          const metrics = challenge?.metrics || {};
          return (
            <div key={type.key} className="flex gap-3">
              <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full ${type.bg} flex items-center justify-center`}>
                <Icon size={16} className={type.color} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{type.label}</p>
                {loading ? (
                  <Skeleton className="h-4 w-32" />
                ) : challenge ? (
                  <>
                    <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                      {challenge.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-[hsl(var(--success))] rounded-full"
                          style={{ width: `${Math.min(100, metrics.completion_rate || 0)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">{metrics.completion_rate || 0}%</span>
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                        <Flame size={12} className="text-primary" />
                        {metrics.streak || 0}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin desafío activo</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
