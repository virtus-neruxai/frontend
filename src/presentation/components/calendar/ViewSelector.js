import { Button } from '../../../components/ui/button';
import { LayoutGrid, List, Clock } from 'lucide-react';

export function ViewSelector({ currentView, onViewChange }) {
  const base = "rounded-full transition-colors";
  const active = "bg-card shadow-sm text-foreground";
  const inactive = "bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground";

  return (
    <div className="flex items-center gap-1 bg-muted p-1 rounded-full">
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
