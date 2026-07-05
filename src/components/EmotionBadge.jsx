import { Badge } from './ui/badge';

const POLARITY_STYLES = {
  positive: 'bg-[hsl(var(--success-soft))] border-[hsl(var(--success))] text-[hsl(var(--success))]',
  neutral: 'bg-[hsl(var(--info-soft))] border-[hsl(var(--info))] text-[hsl(var(--info))]',
  negative: 'bg-[hsl(var(--destructive-soft))] border-destructive text-destructive',
};

export default function EmotionBadge({ emotionSnapshot, className = '' }) {
  if (!emotionSnapshot?.emotion || !emotionSnapshot?.intensity) return null;

  const polarityStyle = POLARITY_STYLES[emotionSnapshot.polarity] || POLARITY_STYLES.neutral;

  return (
    <Badge
      variant="outline"
      className={`text-xs ${polarityStyle} ${className}`.trim()}
    >
      {emotionSnapshot.emotion} · {emotionSnapshot.intensity}/5
    </Badge>
  );
}
