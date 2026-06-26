const DEFAULT_STAT_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const LEGACY_STAT_COLORS = {
  autodominio: 'hsl(var(--chart-1))',
  claridad: 'hsl(var(--chart-2))',
  disciplina: 'hsl(var(--chart-3))',
  virtud: 'hsl(var(--chart-4))',
  serenidad: 'hsl(var(--chart-5))',
};

export function formatStatLabel(statKey, statsInfo = {}) {
  if (statsInfo?.[statKey]?.name) {
    return statsInfo[statKey].name;
  }

  return String(statKey || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getStatColor(statKey) {
  if (LEGACY_STAT_COLORS[statKey]) {
    return LEGACY_STAT_COLORS[statKey];
  }

  const hash = Array.from(String(statKey || '')).reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0
  );
  return DEFAULT_STAT_COLORS[hash % DEFAULT_STAT_COLORS.length];
}
