import type { ReactNode } from 'react';
import {
  siFacebook,
  siInstagram,
  siShopee,
  siTiktok,
  siWhatsapp,
  siYoutube,
  type SimpleIcon,
} from 'simple-icons';

export type BrandKey =
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'youtube'
  | 'shopee'
  | 'tokopedia'
  | 'whatsapp';

type BrandLogoProps = {
  brand: BrandKey;
  size?: number;
  className?: string;
  withRing?: boolean;
};

const iconMap: Partial<Record<BrandKey, SimpleIcon>> = {
  instagram: siInstagram,
  facebook: siFacebook,
  tiktok: siTiktok,
  youtube: siYoutube,
  shopee: siShopee,
  whatsapp: siWhatsapp,
};

const brandStyles: Record<BrandKey, { bg: string; fg?: string }> = {
  instagram: { bg: '#E4405F' },
  facebook: { bg: '#1877F2' },
  tiktok: { bg: '#111111', fg: '#FFFFFF' },
  youtube: { bg: '#FF0000' },
  shopee: { bg: '#EE4D2D' },
  tokopedia: { bg: '#FFFFFF' },
  whatsapp: { bg: '#25D366' },
};

function renderInner(brand: BrandKey, size: number): ReactNode {
  if (brand === 'tokopedia') {
    return (
      <img
        src="/assets/brands/tokopedia.svg"
        alt="Tokopedia"
        className="block"
        style={{ height: size * 0.46, width: 'auto', maxWidth: size * 1.8 }}
      />
    );
  }

  const icon = iconMap[brand];
  if (!icon) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size * 0.56}
      height={size * 0.56}
      aria-hidden="true"
      className="block"
    >
      <path fill={brandStyles[brand].fg ?? '#FFFFFF'} d={icon.path} />
    </svg>
  );
}

export function BrandLogo({
  brand,
  size = 40,
  className = '',
  withRing = false,
}: BrandLogoProps) {
  const style = brandStyles[brand];

  return (
    <div
      className={`inline-flex items-center justify-center rounded-2xl overflow-hidden ${withRing ? 'ring-1 ring-black/5' : ''} ${className}`.trim()}
      style={{
        width: size,
        height: size,
        backgroundColor: style.bg,
      }}
    >
      {renderInner(brand, size)}
    </div>
  );
}

export function resolveBrandKey(input: string): BrandKey {
  const value = input.toLowerCase();

  if (value.includes('instagram')) return 'instagram';
  if (value.includes('facebook')) return 'facebook';
  if (value.includes('tiktok')) return 'tiktok';
  if (value.includes('youtube')) return 'youtube';
  if (value.includes('shopee')) return 'shopee';
  if (value.includes('tokopedia')) return 'tokopedia';
  if (value.includes('whatsapp')) return 'whatsapp';

  return 'instagram';
}
