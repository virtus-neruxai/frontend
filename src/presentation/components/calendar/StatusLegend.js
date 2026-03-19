const STATUS_LABELS = {
  todo: 'Pendiente',
  in_progress: 'En Progreso',
  done: 'Completada',
  blocked: 'Bloqueada',
  failed: 'Fallida'
};

export function StatusLegend() {
  return (
    <div className="flex items-center gap-6 mt-4 px-2 flex-wrap">
      {Object.entries(STATUS_LABELS).map(([status, label]) => (
        <div key={status} className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-sm status-badge ${status}`} />
          <span className="text-sm text-[#71717A]">{label}</span>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-sm bg-blue-300" />
        <span className="text-sm text-[#71717A]">Rutina</span>
      </div>
    </div>
  );
}
