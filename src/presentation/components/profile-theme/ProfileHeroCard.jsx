import { useProfileTheme } from '@/theme/useProfileTheme';
import { Card, CardContent } from '@/components/ui/card';

export function ProfileHeroCard({ title, description, action, className = '' }) {
  const { theme } = useProfileTheme();
  const Icon = theme.icon;

  return (
    <Card className={`overflow-hidden border-primary/30 bg-primary/10 ${className}`}>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-primary text-primary-foreground">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-foreground">{title}</p>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}
