import { useProfileTheme } from '@/theme/useProfileTheme';

export function ProfileIndicator({ className = '' }) {
  const { theme } = useProfileTheme();
  const Icon = theme.icon;

  return (
    <div
      className={`profile-themed-surface inline-flex h-9 items-center gap-2 overflow-hidden rounded-[8px] border border-primary/40 px-2.5 text-xs font-semibold text-foreground shadow-sm ${className}`}
      data-testid="profile-indicator"
      title={`Perfil activo: ${theme.name}`}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] bg-primary text-primary-foreground">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
      </span>
      <span className="hidden sm:inline">{theme.name}</span>
    </div>
  );
}
