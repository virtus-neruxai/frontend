import {
  getMissionEvolutionStatKeys,
  processMissionEventsData,
} from '../presentation/components/character/MissionEvolutionChart';
import { combineTotalStatsData } from '../presentation/components/dashboard/TotalStatsEvolutionChart';

function isoDaysAgo(daysAgo, hour = 9) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

describe('stat chart helpers', () => {
  test('mission evolution filters legacy stats outside the active profile', () => {
    const history = [
      {
        date: isoDaysAgo(2, 9).split('T')[0],
        autodominio: 3,
        claridad: 1,
      },
      {
        date: isoDaysAgo(1, 10).split('T')[0],
        potencia: 2,
        recuperacion: 1,
      },
    ];
    const statsInfo = {
      potencia: { name: 'Potencia' },
      resistencia: { name: 'Resistencia' },
      movilidad: { name: 'Movilidad' },
      recuperacion: { name: 'Recuperacion' },
      constancia_fisica: { name: 'Constancia Fisica' },
    };

    const statKeys = getMissionEvolutionStatKeys(history, statsInfo);
    const data = processMissionEventsData(history, statKeys);

    expect(statKeys).toEqual(['potencia', 'recuperacion']);
    expect(data.at(-1)).toMatchObject({ potencia: 2, recuperacion: 1 });
    expect(data.at(-1).autodominio).toBeUndefined();
  });

  test('total stats chart ignores legacy stats outside the active profile', () => {
    const history = [
      {
        date: isoDaysAgo(1).split('T')[0],
        potencia: 4,
        resistencia: 1,
        movilidad: 0,
        recuperacion: 2,
        constancia_fisica: 3,
        autodominio: 8,
      },
    ];
    const statsInfo = {
      potencia: { name: 'Potencia' },
      resistencia: { name: 'Resistencia' },
      movilidad: { name: 'Movilidad' },
      recuperacion: { name: 'Recuperacion' },
      constancia_fisica: { name: 'Constancia Fisica' },
    };

    const data = combineTotalStatsData(history, statsInfo);

    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      potencia: 4,
      resistencia: 1,
      movilidad: 0,
      recuperacion: 2,
      constancia_fisica: 3,
    });
    expect(data[0].autodominio).toBeUndefined();
  });
});
