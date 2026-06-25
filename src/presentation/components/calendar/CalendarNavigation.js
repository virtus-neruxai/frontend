import { Button } from '../../../components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function CalendarNavigation({ currentTitle, onPrev, onNext, onToday }) {
  return (
    <div className="flex items-center gap-4">
      <h1 
        className="text-2xl font-bold text-foreground" 
        style={{ fontFamily: 'var(--font-heading)' }}
        data-testid="calendar-title"
      >
        {currentTitle}
      </h1>
      <div className="flex items-center gap-1">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={onPrev}
          className="rounded-full"
          data-testid="calendar-prev-btn"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
        </Button>
        <Button 
          variant="outline" 
          onClick={onToday}
          className="rounded-full px-4"
          data-testid="calendar-today-btn"
        >
          Hoy
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={onNext}
          className="rounded-full"
          data-testid="calendar-next-btn"
        >
          <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
}
