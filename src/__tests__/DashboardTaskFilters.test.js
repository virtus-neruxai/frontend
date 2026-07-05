import {
  filterTasksByDomain,
  getDashboardItemsByCategory,
  getTasksByDomain,
} from '../lib/dashboardTaskFilters';

const now = new Date('2026-07-05T12:00:00.000Z');

describe('Dashboard task filters', () => {
  const tasks = [
    { id: 'overdue-valid', domain: 'Trabajo', status: 'in_progress', date_start: '2026-07-01T10:00:00.000Z', date_end: '2026-07-03T10:00:00.000Z' },
    { id: 'todo-old', domain: 'Trabajo', status: 'todo', date_start: '2026-07-01T10:00:00.000Z', date_end: '2026-07-03T10:00:00.000Z' },
    { id: 'routine-old', domain: 'Habitos', status: 'in_progress', task_kind: 'routine', date_start: '2026-07-01T10:00:00.000Z', date_end: '2026-07-03T10:00:00.000Z' },
    { id: 'grace-period', domain: 'Personal', status: 'blocked', date_start: '2026-07-04T10:00:00.000Z', date_end: '2026-07-05T00:00:00.000Z' },
    { id: 'accent-domain', domain: 'Habitos', status: 'todo', date_start: '2026-07-02T10:00:00.000Z' },
    { id: 'missing-domain', status: 'todo', date_start: '2026-07-02T10:00:00.000Z' },
  ];

  test('uses the strict overdue drill-down rule', () => {
    const result = getDashboardItemsByCategory({
      category: 'overdue', tasks, missions: [], rangeDays: 30, now,
    });
    expect(result.map((item) => item.id)).toEqual(['overdue-valid']);
  });

  test('groups and drills down with the same canonical domain', () => {
    const totals = getTasksByDomain(tasks, 30, now);
    expect(totals.find((item) => item.domain === 'Trabajo').count).toBe(2);
    expect(totals.find((item) => item.domain === 'Hábitos').count).toBe(2);
    expect(totals.find((item) => item.domain === 'Otro').count).toBe(1);
    expect(filterTasksByDomain(tasks, 'Hábitos', 30, now).map((task) => task.id)).toEqual([
      'routine-old', 'accent-domain',
    ]);
  });
});
