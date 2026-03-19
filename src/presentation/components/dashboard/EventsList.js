import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';

const STATUS_LABELS = {
  todo: 'Pendiente',
  in_progress: 'En Progreso',
  done: 'Completada',
  blocked: 'Bloqueada'
};

export function EventsList({ 
  taskEvents, 
  eventsLoading,
  eventsDate,
  setEventsDate,
  eventType,
  setEventType,
  clearEventFilters,
  hasActiveFilters
}) {
  return (
    <Card className="border-[#E4E4E7]">
      <CardHeader>
        <CardTitle className="text-lg text-[#18181B] dark:text-white">Historial de eventos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#71717A] block mb-1">
              Filtrar por día
            </label>
            <Input
              type="date"
              value={eventsDate}
              onChange={(e) => setEventsDate(e.target.value)}
              className="h-9 w-[160px]"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#71717A] block mb-1">
              Evento
            </label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="created">Creada</SelectItem>
                <SelectItem value="scheduled">Programada</SelectItem>
                <SelectItem value="started">En progreso</SelectItem>
                <SelectItem value="progress_updated">Progreso actualizado</SelectItem>
                <SelectItem value="snoozed">Pospuesta</SelectItem>
                <SelectItem value="rescheduled">Reprogramada</SelectItem>
                <SelectItem value="missed">Fallada</SelectItem>
                <SelectItem value="completed">Completada</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearEventFilters}
              className="text-sm text-[#71717A] underline"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Events list */}
        {eventsLoading ? (
          <div className="h-40 flex items-center justify-center text-[#71717A]">
            Cargando eventos...
          </div>
        ) : taskEvents.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-[#71717A]">
            No hay eventos registrados para el filtro seleccionado.
          </div>
        ) : (
          <div className="space-y-3">
            {taskEvents.map((event) => (
              <div key={event.event_id} className="border border-[#E4E4E7] rounded-lg p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[#18181B] dark:text-white">
                      {event.snapshot?.title || 'Tarea'}
                    </p>
                    <p className="text-xs text-[#71717A]">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-xs font-semibold uppercase text-[#3B82F6]">
                    {event.event_type}
                  </span>
                </div>
                {event.reason && (
                  <p className="text-sm text-[#71717A] mt-2">
                    Motivo: {event.reason}
                  </p>
                )}
                <div className="text-xs text-[#71717A] mt-2">
                  Estado: {STATUS_LABELS[event.snapshot?.status] || event.snapshot?.status || 'N/D'} ·
                  Intentos: {event.snapshot?.attempt_count ?? 0} ·
                  Progreso: {event.snapshot?.progress_percent ?? 0}%
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
