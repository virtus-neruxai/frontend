import { useState, useEffect } from 'react';
import { Target, Compass, Zap } from 'lucide-react';
import { missionsApi, tasksApi, profileApi } from '../../../lib/api';

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-[#F4F4F5] dark:bg-[#3F3F46] rounded ${className}`} />;
}

export function NorthStarCard() {
  const [mission, setMission] = useState(null);
  const [northStar, setNorthStar] = useState(null);
  const [todayTask, setTodayTask] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date();
        const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        const [missionsRes, tasksRes, profileRes] = await Promise.allSettled([
          missionsApi.getAll({ status: 'active' }),
          tasksApi.getAll({ from_date: todayStart, to_date: todayEnd }),
          profileApi.getProfile(),
        ]);

        if (missionsRes.status === 'fulfilled') {
          const active = missionsRes.value.data?.[0] || null;
          setMission(active);
        }

        if (tasksRes.status === 'fulfilled') {
          const tasks = tasksRes.value.data || [];
          const pending = tasks.find(t => !t.is_complete && t.status !== 'failed');
          setTodayTask(pending || null);
        }

        if (profileRes.status === 'fulfilled') {
          const raw = profileRes.value.data?.raw_answers || {};
          setNorthStar(raw.q_north_success_today || raw.q_north_success_3y || null);
        }
      } catch (_) {
        // silently degrade
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (!loading && !mission && !northStar && !todayTask) {
    return null;
  }

  return (
    <div
      className="rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#18181B] p-5"
      data-testid="north-star-card"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Mission in focus */}
        <div className="flex gap-3">
          <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-[#FFF7ED] dark:bg-[#431407] flex items-center justify-center">
            <Target size={16} className="text-[#F97316]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#71717A] uppercase tracking-wide mb-1">Misión activa</p>
            {loading ? (
              <>
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-48" />
              </>
            ) : mission ? (
              <>
                <p className="text-sm font-semibold text-[#18181B] dark:text-white leading-snug">
                  {mission.title}
                </p>
                <p className="text-xs text-[#71717A] mt-0.5 line-clamp-2">{mission.description}</p>
              </>
            ) : (
              <p className="text-sm text-[#71717A]">Sin misión activa</p>
            )}
          </div>
        </div>

        {/* North star */}
        <div className="flex gap-3">
          <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-[#EFF6FF] dark:bg-[#1E3A5F] flex items-center justify-center">
            <Compass size={16} className="text-[#3B82F6]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#71717A] uppercase tracking-wide mb-1">Estrella norte</p>
            {loading ? (
              <Skeleton className="h-4 w-40" />
            ) : northStar ? (
              <p className="text-sm text-[#18181B] dark:text-white line-clamp-3 leading-snug">{northStar}</p>
            ) : (
              <p className="text-sm text-[#71717A]">Completa tu perfil</p>
            )}
          </div>
        </div>

        {/* Action of the day */}
        <div className="flex gap-3">
          <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-[#F0FDF4] dark:bg-[#14532D] flex items-center justify-center">
            <Zap size={16} className="text-[#22C55E]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#71717A] uppercase tracking-wide mb-1">Acción del día</p>
            {loading ? (
              <Skeleton className="h-4 w-36" />
            ) : todayTask ? (
              <>
                <p className="text-sm font-semibold text-[#18181B] dark:text-white leading-snug">
                  {todayTask.title}
                </p>
                {todayTask.date_start && (
                  <p className="text-xs text-[#71717A] mt-0.5">
                    {new Date(todayTask.date_start).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-[#71717A]">Sin tareas para hoy</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
