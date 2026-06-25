import { useState } from 'react';
import { useProfileTheme } from '../theme/useProfileTheme';

function VirtusGlyph() {
  return (
    <svg width="34" height="34" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M32 6L38 18H26L32 6Z" fill="hsl(var(--primary))" />
      <path d="M22 22H42" stroke="hsl(var(--primary))" strokeWidth="4" strokeLinecap="round" />
      <rect x="27" y="22" width="4" height="24" rx="2" fill="hsl(var(--primary))" />
      <rect x="31" y="22" width="4" height="24" rx="2" fill="hsl(var(--primary))" />
      <rect x="35" y="22" width="4" height="24" rx="2" fill="hsl(var(--primary))" />
      <path d="M13 42C16 31 20 25 25 21" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />
      <path d="M51 42C48 31 44 25 39 21" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />
      <path d="M14 48C24 56 40 56 50 48" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function VirtusBrand({ compact = false, logoSrc = `${process.env.PUBLIC_URL || ''}/assets/virtus-logo.png` }) {
  const [useFallbackGlyph, setUseFallbackGlyph] = useState(false);
  const { theme } = useProfileTheme();

  return (
    <div className="virtus-brand flex items-center gap-3">
      {useFallbackGlyph ? (
        <VirtusGlyph />
      ) : (
        <img
          src={logoSrc}
          alt="Virtus logo"
          className="h-[34px] w-[34px] rounded-sm object-contain"
          onError={() => setUseFallbackGlyph(true)}
        />
      )}
      {!compact && (
        <div className="flex items-baseline gap-2">
          <p className="virtus-brand-word bg-gradient-to-r from-primary to-[hsl(var(--virtus-secondary))] bg-clip-text text-base font-semibold leading-none text-transparent">
            VIRTUS
          </p>
          <p className="virtus-brand-tagline text-xs">
            {theme.brandTagline || 'Disciplina • Claridad • Virtud'}
          </p>
        </div>
      )}
    </div>
  );
}
