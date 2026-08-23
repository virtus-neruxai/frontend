import Layout from '../components/Layout';
import TaskModal from '../components/TaskModal';
import { Button } from '../components/ui/button';
import { Plus } from 'lucide-react';
import { SectionHeader } from '../components/premium/SectionHeader';
import { useCalendar } from '../presentation/viewmodels/useCalendar';
import { CalendarNavigation } from '../presentation/components/calendar/CalendarNavigation';
import { ViewSelector } from '../presentation/components/calendar/ViewSelector';
import { CalendarGrid } from '../presentation/components/calendar/CalendarGrid';
import { StatusLegend } from '../presentation/components/calendar/StatusLegend';
import { ActiveItemsPanel } from '../presentation/components/calendar/ActiveItemsPanel';

export default function CalendarPageRefactored() {
  const {
    view,
    tasks,
    loading,
    calendarRef,
    currentTitle,
    calendarEvents,
    modalOpen,
    selectedTask,
    selectedDate,
    occurrenceDate,
    handlePrev,
    handleNext,
    handleToday,
    handleViewChange,
    handleDateClick,
    handleEventClick,
    handleEventDrop,
    handleEventResize,
    handleDatesSet,
    handleModalClose,
    handleTaskSaved,
    handleTaskDeleted,
    openCreateModal,
    openCreateRoutineModal,
    createMode,
    viewMap,
  } = useCalendar();

  const handlePanelItemClick = (item) => {
    // All items in the panel are tasks (linked tasks show with mission icon).
    // Delegate to the same handler the calendar uses → opens TaskModal.
    handleEventClick({ event: { id: item.id, extendedProps: { recurringParentId: null } } });
  };

  return (
    <Layout>
      <div className="h-full flex flex-col gap-5" data-testid="calendar-page">
        <SectionHeader title="Tareas" />

        <div className="flex items-center justify-between">
          <CalendarNavigation
            currentTitle={currentTitle}
            onPrev={handlePrev}
            onNext={handleNext}
            onToday={handleToday}
          />

          <div className="flex items-center gap-3">
            <ViewSelector currentView={view} onViewChange={handleViewChange} />

            <Button onClick={openCreateModal} className="font-medium" data-testid="create-task-btn">
              <Plus className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
              Nueva Tarea
            </Button>
            <Button onClick={openCreateRoutineModal} variant="secondary" className="font-medium" data-testid="create-routine-btn">
              <Plus className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
              Crear rutina
            </Button>
          </div>
        </div>

        {/* Calendar + Active items panel.
            items-start: each child uses its own natural height so the panel never
            forces the calendar container to grow. Panel is capped at max-h-[660px]
            (slightly under a 4-week month) so it never exceeds the calendar height. */}
        <div className="flex gap-4 items-start">
          <div className="flex-1 rounded-[8px] border bg-card p-4 overflow-visible">
            <CalendarGrid
              calendarRef={calendarRef}
              initialView={viewMap[view] || 'dayGridMonth'}
              events={calendarEvents}
              loading={loading}
              onDateClick={handleDateClick}
              onEventClick={handleEventClick}
              onEventDrop={handleEventDrop}
              onEventResize={handleEventResize}
              onDatesSet={handleDatesSet}
            />
          </div>

          <div className="w-72 shrink-0 max-h-[660px] overflow-y-auto rounded-[8px] border bg-card p-4">
            <ActiveItemsPanel tasks={tasks} onItemClick={handlePanelItemClick} />
          </div>
        </div>

        {/* Legend */}
        <StatusLegend />

        {/* Task Modal — same modal used by calendar click and panel click */}
        <TaskModal
          open={modalOpen}
          onClose={handleModalClose}
          task={selectedTask}
          initialDate={selectedDate}
          occurrenceDate={occurrenceDate}
          onSaved={handleTaskSaved}
          onDeleted={handleTaskDeleted}
          mode={createMode}
        />
      </div>
    </Layout>
  );
}
