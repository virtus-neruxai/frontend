import { describe, expect, it } from 'vitest';
import { calculateBodyCheckinKPIs } from '../presentation/viewmodels/bodyCheckinKpiUtils';

const STATS_INFO = {
  disciplina: { name: 'Disciplina' },
  serenidad: { name: 'Serenidad' },
};

describe('calculateBodyCheckinKPIs', () => {
  it('devuelve ceros sin registros', () => {
    expect(calculateBodyCheckinKPIs([], STATS_INFO)).toEqual({
      totalCheckins: 0,
      pointsGained: 0,
      pointsLost: 0,
      netBalance: 0,
    });
  });

  it('los check-ins sin nota cuentan como registro pero no puntuan', () => {
    const checkins = [
      { checkin_date: '2026-07-10', note_analysis: null },
      { checkin_date: '2026-07-11' },
    ];
    expect(calculateBodyCheckinKPIs(checkins, STATS_INFO)).toEqual({
      totalCheckins: 2,
      pointsGained: 0,
      pointsLost: 0,
      netBalance: 0,
    });
  });

  it('suma positivos y negativos de note_analysis.stat_changes', () => {
    const checkins = [
      {
        checkin_date: '2026-07-10',
        note_analysis: { stat_changes: { disciplina: 2, serenidad: -1 } },
      },
      {
        checkin_date: '2026-07-11',
        note_analysis: { stat_changes: { disciplina: 1 } },
      },
    ];
    expect(calculateBodyCheckinKPIs(checkins, STATS_INFO)).toEqual({
      totalCheckins: 2,
      pointsGained: 3,
      pointsLost: 1,
      netBalance: 2,
    });
  });

  it('ignora stats fuera del perfil activo', () => {
    const checkins = [
      {
        checkin_date: '2026-07-11',
        note_analysis: { stat_changes: { legacy_stat: 5, disciplina: 1 } },
      },
    ];
    expect(calculateBodyCheckinKPIs(checkins, STATS_INFO)).toEqual({
      totalCheckins: 1,
      pointsGained: 1,
      pointsLost: 0,
      netBalance: 1,
    });
  });
});
