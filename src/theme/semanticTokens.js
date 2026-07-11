export const SEMANTIC_COLORS = {
  success: 'hsl(var(--success))',
  successSoft: 'hsl(var(--success-soft))',
  warning: 'hsl(var(--warning))',
  warningSoft: 'hsl(var(--warning-soft))',
  info: 'hsl(var(--info))',
  infoSoft: 'hsl(var(--info-soft))',
  destructive: 'hsl(var(--destructive))',
  destructiveSoft: 'hsl(var(--destructive-soft))',
  neutral: 'hsl(var(--muted-foreground))',
  neutralSoft: 'hsl(var(--muted))',
};

export const TASK_STATUS_COLORS = {
  todo: 'hsl(var(--status-todo))',
  in_progress: 'hsl(var(--status-in-progress))',
  done: 'hsl(var(--status-done))',
  blocked: 'hsl(var(--status-blocked))',
  failed: 'hsl(var(--status-failed))',
};

export const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export const CHART_SURFACE = {
  tooltipBackground: 'hsl(var(--popover))',
  tooltipBorder: 'hsl(var(--border))',
  grid: 'hsl(var(--border))',
  tick: 'hsl(var(--muted-foreground))',
};

export const KPI_TOKENS = {
  total: {
    color: 'hsl(var(--muted-foreground))',
    background: 'hsl(var(--muted))',
  },
  completed: {
    color: 'hsl(var(--success))',
    background: 'hsl(var(--success-soft))',
  },
  inProgress: {
    color: 'hsl(var(--info))',
    background: 'hsl(var(--info-soft))',
  },
  blocked: {
    color: 'hsl(var(--status-blocked))',
    background: 'hsl(var(--destructive-soft))',
  },
  overdue: {
    color: 'hsl(var(--warning))',
    background: 'hsl(var(--warning-soft))',
  },
};
