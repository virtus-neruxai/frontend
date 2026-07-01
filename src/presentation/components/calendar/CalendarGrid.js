import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';

const renderEventContent = (eventInfo) => {
  const { status, progress, taskKind, completedToday } = eventInfo.event.extendedProps;
  const start = eventInfo.event.start;
  const end = eventInfo.event.end;
  const durationMin = start && end ? (end - start) / 60000 : 60;
  const isShort = durationMin < 30;

  return (
    <div className={`flex items-center overflow-hidden w-full ${isShort ? 'px-1 gap-1' : 'px-1.5 gap-1.5'}`}>
      <span className={`truncate font-medium leading-tight ${isShort ? 'text-[10px]' : 'text-xs'} ${status === 'failed' ? 'line-through opacity-80' : ''}`}>
        {eventInfo.event.title}
      </span>
      {!isShort && taskKind === 'routine' && completedToday && (
        <span className="text-[11px] text-[hsl(var(--success))] shrink-0">✓</span>
      )}
      {!isShort && taskKind !== 'routine' && progress > 0 && progress < 100 && (
        <span className="text-[10px] opacity-70 shrink-0">{progress}%</span>
      )}
    </div>
  );
};

export function CalendarGrid({
  calendarRef,
  initialView,
  events,
  loading,
  onDateClick,
  onEventClick,
  onEventDrop,
  onEventResize,
  onDatesSet,
  currentScrollTime,
}) {
  const isTimeView = initialView === 'timeGridDay' || initialView === 'timeGridWeek';

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando calendario...</div>
      </div>
    );
  }

  return (
    <FullCalendar
      ref={calendarRef}
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
      initialView={initialView}
      headerToolbar={false}
      events={events}
      eventContent={renderEventContent}
      dateClick={onDateClick}
      eventClick={onEventClick}
      eventDrop={onEventDrop}
      eventResize={onEventResize}
      datesSet={onDatesSet}
      editable={true}
      droppable={true}
      selectable={true}
      selectMirror={true}
      dayMaxEvents={6}
      eventOrder="isRecurring,start,-duration,allDay,title"
      eventOrderStrict={true}
      weekends={true}
      // timeGrid needs a bounded height to create the internal scroller
      // where scrollTime is applied.
      height={isTimeView ? 700 : 'auto'}
      contentHeight={isTimeView ? undefined : 'auto'}
      aspectRatio={isTimeView ? undefined : 1.8}
      firstDay={1}
      locale="es"
      scrollTime={currentScrollTime || "08:00:00"}
      slotMinTime="00:00:00"
      slotMaxTime="24:00:00"
      slotDuration="00:30:00"
      eventMinHeight={20}
      nowIndicator={true}
      scrollTimeReset={true}
      buttonText={{
        today: 'Hoy',
        month: 'Mes',
        week: 'Semana',
        day: 'Día'
      }}
      allDayText="Todo el día"
      noEventsText="No hay tareas"
    />
  );
}
