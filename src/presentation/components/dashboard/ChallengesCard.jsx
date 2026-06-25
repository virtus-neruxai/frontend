import { useState, useEffect } from 'react';
import { Sun, CalendarDays, CalendarRange, Flame } from 'lucide-react';
import { challengesApi } from '../../../lib/api';

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-[#F4F4F5] dark:bg-[#3F3F46] rounded ${className}`} />;
}

const TYPES = [
  { key: 'daily', label: 'Desafío diario', icon: Sun, color: 'text-[#3B82F6]', bg: 'bg-[#EFF6FF] dark:bg-[#1E3A5F]' },
  { key: 'weekly', label: 'Desafío semanal', icon: CalendarDays, color: 'text-[#8B5CF6]', bg: 'bg-[#F5F3FF] dark:bg-[#3B2F5F]' },
  { key: 'monthly', label: 'Desafío mensual', icon: CalendarRange, color: 'text-[#6366F1]', bg: 'bg-[#EEF2FF] dark:bg-[#312E5F]' },
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
      className="rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#18181B] p-5"
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
                <p className="text-xs font-semibold text-[#71717A] uppercase tracking-wide mb-1">{type.label}</p>
                {loading ? (
                  <Skeleton className="h-4 w-32" />
                ) : challenge ? (
                  <>
                    <p className="text-sm font-semibold text-[#18181B] dark:text-white leading-snug line-clamp-2">
                      {challenge.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-[#F4F4F5] dark:bg-[#3F3F46] overflow-hidden">
                        <div
                          className="h-full bg-[#22C55E] rounded-full"
                          style={{ width: `${Math.min(100, metrics.completion_rate || 0)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-[#71717A]">{metrics.completion_rate || 0}%</span>
                      <span className="flex items-center gap-0.5 text-xs text-[#71717A]">
                        <Flame size={12} className="text-[#F97316]" />
                        {metrics.streak || 0}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[#71717A]">Sin desafío activo</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
