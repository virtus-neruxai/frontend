// Puntos del Check-in corporal: SOLO note_analysis.stat_changes puntúa.
// Las métricas corporales nunca generan puntos; sin nota analizada, todo a 0.
export function calculateBodyCheckinKPIs(checkins = [], statsInfo = {}) {
  const activeStatKeys = Object.keys(statsInfo || {});

  let gained = 0;
  let lost = 0;

  (checkins || []).forEach((checkin) => {
    const statChanges = checkin?.note_analysis?.stat_changes || {};
    Object.entries(statChanges).forEach(([stat, value]) => {
      if (activeStatKeys.length > 0 && !activeStatKeys.includes(stat)) {
        return;
      }
      if (value > 0) {
        gained += value;
      } else if (value < 0) {
        lost += Math.abs(value);
      }
    });
  });

  return {
    totalCheckins: (checkins || []).length,
    pointsGained: gained,
    pointsLost: lost,
    netBalance: gained - lost,
  };
}
