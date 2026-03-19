import { calculateReflectionKPIsForProfile } from '../presentation/viewmodels/reflectionKpiUtils';

describe('calculateReflectionKPIsForProfile', () => {
  test('filters legacy reflections from other profiles out of KPI totals', () => {
    const reflections = [
      {
        stat_changes: {
          autodominio: 2,
          claridad: -1,
        },
      },
      {
        stat_changes: {
          potencia: 3,
          recuperacion: -2,
        },
      },
      {
        stat_changes: {
          constancia_fisica: 1,
        },
      },
    ];
    const statsInfo = {
      potencia: { name: 'Potencia' },
      resistencia: { name: 'Resistencia' },
      movilidad: { name: 'Movilidad' },
      recuperacion: { name: 'Recuperacion' },
      constancia_fisica: { name: 'Constancia Fisica' },
    };

    expect(calculateReflectionKPIsForProfile(reflections, statsInfo)).toEqual({
      totalReflections: 2,
      pointsGained: 4,
      pointsLost: 2,
      netBalance: 2,
    });
  });

  test('keeps previous behavior when statsInfo is unavailable', () => {
    const reflections = [
      { stat_changes: { autodominio: 2 } },
      { stat_changes: { potencia: -1 } },
    ];

    expect(calculateReflectionKPIsForProfile(reflections, {})).toEqual({
      totalReflections: 2,
      pointsGained: 2,
      pointsLost: 1,
      netBalance: 1,
    });
  });
});
