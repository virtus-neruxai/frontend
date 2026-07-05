import { normalizeTaskDomain, TASK_DOMAIN_OPTIONS } from './taskDomains';

export function getDashboardFromDate(rangeDays, now = new Date()) {
  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - Number(rangeDays || 30));
  return fromDate;
}

export function getDashboardTasksInRange(tasks = [], rangeDays = 30, now = new Date()) {
  const fromDate = getDashboardFromDate(rangeDays, now);
  return tasks.filter((task) => !task.date_start || new Date(task.date_start) >= fromDate);
}

export function getDashboardItemsByCategory({
  category,
  tasks = [],
  missions = [],
  rangeDays = 30,
  now = new Date(),
}) {
  const inRange = getDashboardTasksInRange(tasks, rangeDays, now);

  switch (category) {
    case 'completed':
      return inRange.filter((task) => task.status === 'done' || task.is_complete);
    case 'in_progress':
      return inRange.filter((task) => task.status === 'in_progress');
    case 'overdue': {
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const overdueTasks = inRange.filter((task) => (
        task.task_kind !== 'routine'
        && ['in_progress', 'blocked'].includes(task.status)
        && task.date_end
        && new Date(task.date_end) < oneDayAgo
      ));
      const overdueMissions = missions
        .filter((mission) => (
          mission.expires_at
          && new Date(mission.expires_at) < now
          && !['done', 'completed'].includes(mission.status)
          && !mission.is_complete
        ))
        .map((mission) => ({
          id: `mission-${mission.id}`,
          title: mission.title,
          domain: normalizeTaskDomain(mission.domain, 'Otro'),
          status: mission.status,
          date_end: mission.expires_at,
          _isMission: true,
          _linkedTaskId: mission.linked_task_id || null,
        }));
      return [...overdueMissions, ...overdueTasks];
    }
    case 'total':
    default:
      return inRange;
  }
}

export function getTasksByDomain(tasks = [], rangeDays = 30, now = new Date()) {
  const inRange = getDashboardTasksInRange(tasks, rangeDays, now);
  return TASK_DOMAIN_OPTIONS.map((domain) => ({
    domain,
    count: inRange.filter((task) => normalizeTaskDomain(task.domain, 'Otro') === domain).length,
  })).filter((item) => item.count > 0);
}

export function filterTasksByDomain(tasks = [], domain, rangeDays = 30, now = new Date()) {
  const normalizedDomain = normalizeTaskDomain(domain, 'Otro');
  return getDashboardTasksInRange(tasks, rangeDays, now)
    .filter((task) => normalizeTaskDomain(task.domain, 'Otro') === normalizedDomain)
    .map((task) => ({ ...task, domain: normalizedDomain }));
}
