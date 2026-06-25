import { useProfileTheme } from '@/theme/useProfileTheme';
import { cn } from '@/lib/utils';

export function ProfileEmptyState({
  icon: IconOverride,
  title,
  description,
  action,
  compact = false,
  className = '',
  testId,
}) {
  const { theme } = useProfileTheme();
  const Icon = IconOverride || theme.icon;

  return (
    <div
      data-testid={testId}
      className={cn(
        'profile-themed-surface flex flex-col items-center justify-center rounded-[8px] border border-primary/25 bg-primary/10 text-center',
        compact ? 'gap-2 p-4' : 'gap-3 p-6',
        className
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-[8px] bg-primary text-primary-foreground',
          compact ? 'h-9 w-9' : 'h-11 w-11'
        )}
      >
        <Icon className={compact ? 'h-4 w-4' : 'h-5 w-5'} strokeWidth={1.7} />
      </div>
      <div className="max-w-md">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
