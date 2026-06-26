export function ProfileThemeBackground({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`profile-theme-background pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}
    />
  );
}
