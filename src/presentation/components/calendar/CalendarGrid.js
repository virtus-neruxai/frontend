import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';

// Day/Week must show FIRST_VISIBLE_HOUR → 24:00 without scrolling; the
// remaining night hours stay one scroll away. The height is derived from the
// slot size so it keeps matching `.fc .fc-timegrid-slot { height: 2rem }` in
// index.css.
const FIRST_VISIBLE_HOUR = 6;
const LAST_VISIBLE_HOUR = 24;
const SLOT_HEIGHT_PX = 32; // 2rem, per index.css
const SLOTS_PER_HOUR = 2; // slotDuration 00:30
const TIME_GRID_CHROME_PX = 88; // day header + "Todo el día" row
const TIME_VIEW_HEIGHT_PX =
  (LAST_VISIBLE_HOUR - FIRST_VISIBLE_HOUR) * SLOTS_PER_HOUR * SLOT_HEIGHT_PX +
  TIME_GRID_CHROME_PX;
const FIRST_VISIBLE_TIME = `${String(FIRST_VISIBLE_HOUR).padStart(2, '0')}:00:00`;

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
}) {
  const isTimeView = initialView === 'timeGridDay' || initialView === 'timeGridWeek';

  if (loading) {
    return (
      <div
        className="h-full min-h-[480px] flex items-center justify-center"
        style={isTimeView ? { height: TIME_VIEW_HEIGHT_PX } : undefined}
      >
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
      // Day/Week get a fixed height that fits 04:00–24:00; FullCalendar keeps
      // its internal scroll for the night hours left above the window.
      height={isTimeView ? TIME_VIEW_HEIGHT_PX : 'auto'}
      contentHeight={isTimeView ? undefined : 'auto'}
      aspectRatio={isTimeView ? undefined : 1.8}
      firstDay={1}
      locale="es"
      scrollTime={FIRST_VISIBLE_TIME}
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
