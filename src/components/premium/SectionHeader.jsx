export function SectionHeader({ title, action }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-xl text-foreground">{title}</h2>
      {action}
    </div>
  );
}
