export function calculateReflectionKPIsForProfile(reflections = [], statsInfo = {}) {
  if (!reflections || reflections.length === 0) {
    return {
      totalReflections: 0,
      pointsGained: 0,
      pointsLost: 0,
      netBalance: 0,
    };
  }

  const activeStatKeys = Object.keys(statsInfo || {});
  const scopedReflections = activeStatKeys.length === 0
    ? reflections
    : reflections.filter((reflection) => {
        const statChanges = reflection?.stat_changes || {};
        return Object.keys(statChanges).some((stat) => activeStatKeys.includes(stat));
      });

  let gained = 0;
  let lost = 0;

  scopedReflections.forEach((reflection) => {
    const statChanges = reflection?.stat_changes || {};
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
    totalReflections: scopedReflections.length,
    pointsGained: gained,
    pointsLost: lost,
    netBalance: gained - lost,
  };
}
