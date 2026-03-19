export function RoutinesTable({ routines = [] }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-[#E4E4E7] dark:border-zinc-700">
      <h3 className="text-lg font-semibold mb-3">Rutinas</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-[#E4E4E7] dark:border-zinc-700">
              <th className="py-2 pr-2">Rutina</th>
              <th className="py-2 pr-2">Completion Rate</th>
              <th className="py-2 pr-2">Streak</th>
            </tr>
          </thead>
          <tbody>
            {routines.map((routine) => (
              <tr key={routine.task_id} className="border-b border-[#F4F4F5] dark:border-zinc-800">
                <td className="py-2 pr-2">{routine.title}</td>
                <td className="py-2 pr-2">{routine.routine_completion_rate ?? 0}%</td>
                <td className="py-2 pr-2">{routine.streak ?? 0}</td>
              </tr>
            ))}
            {routines.length === 0 && (
              <tr>
                <td className="py-3 text-[#71717A]" colSpan={3}>No hay rutinas registradas.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
