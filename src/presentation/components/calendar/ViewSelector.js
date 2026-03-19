import { Button } from '../../../components/ui/button';
import { LayoutGrid, List, Clock } from 'lucide-react';

export function ViewSelector({ currentView, onViewChange }) {
  const base = "rounded-full transition-colors";
  const active = "bg-white dark:bg-zinc-100 shadow-sm text-[#18181B]";
  const inactive = "bg-zinc-200/70 text-[#3F3F46] hover:bg-zinc-300/70 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700";

  return (
    <div className="flex items-center gap-1 bg-[#F4F4F5] dark:bg-zinc-900 p-1 rounded-full">
      <Button
        variant={currentView === 'day' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('day')}
        className={`${base} ${currentView === 'day' ? active : inactive}`}
        data-testid="view-day-btn"
      >
        <Clock className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
        Día
      </Button>
      <Button
        variant={currentView === 'week' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('week')}
        className={`${base} ${currentView === 'week' ? active : inactive}`}
        data-testid="view-week-btn"
      >
        <List className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
        Semana
      </Button>
      <Button
        variant={currentView === 'month' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('month')}
        className={`${base} ${currentView === 'month' ? active : inactive}`}
        data-testid="view-month-btn"
      >
        <LayoutGrid className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
        Mes
      </Button>
    </div>
  );
}
