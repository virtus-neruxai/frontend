import { Card, CardContent } from '../../../components/ui/card';

export function KPICard({ title, value, subtitle, icon: Icon, iconColor, iconBg, testId, onClick }) {
  return (
    <Card
      className={`hover:shadow-sm transition-shadow ${onClick ? 'cursor-pointer hover:ring-1 hover:ring-primary/30' : ''}`}
      data-testid={testId}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              {title}
            </p>
            <p 
              className="text-3xl font-bold" 
              style={{ 
                fontFamily: 'var(--font-heading)',
                color: iconColor 
              }}
            >
              {value}
            </p>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">
                {subtitle}
              </p>
            )}
          </div>
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: iconBg }}
          >
            <Icon className="w-6 h-6" style={{ color: iconColor }} strokeWidth={1.5} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
