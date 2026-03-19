export function StatRow({ label, value, percent = 0 }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{value}</span>
      </div>
      <div className="h-2 rounded bg-muted/30">
        <div
          className="h-2 rounded bg-primary"
          style={{ width: `${Math.max(0, Math.min(100, percent))}%`, transition: 'width 300ms ease-out' }}
        />
      </div>
    </div>
  );
}
