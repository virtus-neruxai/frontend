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

export default function CalendarPageRefactored() {
  const {
    view,
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
    currentScrollTime,
    viewMap,
  } = useCalendar();

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

            <Button
              onClick={openCreateModal}
              className="font-medium"
              data-testid="create-task-btn"
            >
              <Plus className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
              Nueva Tarea
            </Button>
            <Button
              onClick={openCreateRoutineModal}
              variant="secondary"
              className="font-medium"
              data-testid="create-routine-btn"
            >
              <Plus className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
              Crear rutina
            </Button>
          </div>
        </div>

        {/* Calendar */}
        <div className="flex-1 rounded-[8px] border bg-card p-4 overflow-visible min-h-[600px]">
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
            currentScrollTime={currentScrollTime}
          />
        </div>

        {/* Legend */}
        <StatusLegend />

        {/* Task Modal */}
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
