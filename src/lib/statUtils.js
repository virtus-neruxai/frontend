const DEFAULT_STAT_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#06B6D4',
  '#EC4899',
  '#14B8A6',
  '#F97316',
];

const LEGACY_STAT_COLORS = {
  autodominio: '#F97316',
  claridad: '#3B82F6',
  disciplina: '#8B5CF6',
  virtud: '#EC4899',
  serenidad: '#22C55E',
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
