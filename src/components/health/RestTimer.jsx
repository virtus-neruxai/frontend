import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';

function renderTime(seconds) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

export default function RestTimer({ initialSeconds = 60 }) {
  const initial = Number.isFinite(Number(initialSeconds)) ? Number(initialSeconds) : 60;
  const [remaining, setRemaining] = useState(initial);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!running) return undefined;
    intervalRef.current = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          setRunning(false);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(intervalRef.current);
  }, [running]);

  useEffect(() => {
    if (!running) setRemaining(initial);
  }, [initial]); // Reset when a different set's configured rest is shown.

  return (
    <div className="flex items-center gap-1.5" aria-label="Temporizador de descanso">
      <span className="min-w-12 font-mono text-sm" aria-live="polite">{renderTime(remaining)}</span>
      <Button type="button" size="icon" variant="outline" className="h-7 w-7" title={running ? 'Pausar' : 'Iniciar'} onClick={() => setRunning((value) => !value)}>
        {running ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
      </Button>
      <Button type="button" size="icon" variant="ghost" className="h-7 w-7" title="Reiniciar" onClick={() => { setRunning(false); setRemaining(initial); }}>
        <RotateCcw className="w-3 h-3" />
      </Button>
    </div>
  );
}

