import { BrandLogo, type BrandKey } from './BrandLogo';

type PlatformBadgeProps = {
  label: string;
  brand?: BrandKey;
  size?: number;
  className?: string;
  tone?: string;
};

function getInitials(label: string) {
  return label
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '•';
}

export function PlatformBadge({
  label,
  brand,
  size = 40,
  className = '',
  tone = 'bg-slate-100 text-slate-700',
}: PlatformBadgeProps) {
  if (brand) {
    return <BrandLogo brand={brand} size={size} className={className} withRing />;
  }

  return (
    <div
      className={`inline-flex items-center justify-center rounded-2xl font-bold ${tone} ${className}`.trim()}
      style={{ width: size, height: size }}
      aria-label={label}
      title={label}
    >
      <span style={{ fontSize: Math.max(12, Math.round(size * 0.34)) }}>{getInitials(label)}</span>
    </div>
  );
}
