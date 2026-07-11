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

export function getDashboardMissionsInRange(missions = [], rangeDays = 30, now = new Date()) {
  const fromDate = getDashboardFromDate(rangeDays, now);
  return missions.filter((mission) => {
    const missionDate = mission.created_at || mission.scheduled_datetime || mission.start_date || mission.expires_at;
    return !missionDate || new Date(missionDate) >= fromDate;
  });
}

export function isMissionOverdue(mission = {}, now = new Date()) {
  if (['done', 'completed'].includes(mission.status) || mission.is_complete) return false;
  if (['failed', 'expired'].includes(mission.status)) return true;
  return !!mission.expires_at && new Date(mission.expires_at) < now;
}

export function mapMissionForDashboardList(mission = {}) {
  return {
    id: `mission-${mission.id}`,
    title: mission.title,
    domain: normalizeTaskDomain(mission.domain, 'Otro'),
    status: mission.status,
    date_start: mission.scheduled_datetime || mission.start_date || mission.created_at,
    date_end: mission.expires_at,
    _isMission: true,
    _linkedTaskId: mission.linked_task_id || null,
  };
}

export function getDashboardItemsByCategory({
  category,
  tasks = [],
  rangeDays = 30,
  now = new Date(),
}) {
  const inRange = getDashboardTasksInRange(tasks, rangeDays, now);

  switch (category) {
    case 'completed':
      return inRange.filter((task) => task.status === 'done' || task.is_complete);
    case 'in_progress':
      return inRange.filter((task) => task.status === 'in_progress');
    case 'blocked':
      return inRange.filter((task) => task.status === 'blocked');
    case 'overdue': {
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      return inRange.filter((task) => (
        task.task_kind !== 'routine'
        && ['in_progress', 'blocked'].includes(task.status)
        && task.date_end
        && new Date(task.date_end) < oneDayAgo
      ));
    }
    case 'total':
    default:
      return inRange;
  }
}

export function getDashboardMissionsByCategory({
  category,
  missions = [],
  rangeDays = 30,
  now = new Date(),
}) {
  const inRange = getDashboardMissionsInRange(missions, rangeDays, now);

  switch (category) {
    case 'completed':
      return inRange
        .filter((mission) => ['done', 'completed'].includes(mission.status) || mission.is_complete)
        .map(mapMissionForDashboardList);
    case 'in_progress':
      return inRange
        .filter((mission) => ['active', 'in_progress'].includes(mission.status) && !isMissionOverdue(mission, now))
        .map(mapMissionForDashboardList);
    case 'overdue':
      return inRange
        .filter((mission) => isMissionOverdue(mission, now))
        .map(mapMissionForDashboardList);
    case 'total':
    default:
      return inRange.map(mapMissionForDashboardList);
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
