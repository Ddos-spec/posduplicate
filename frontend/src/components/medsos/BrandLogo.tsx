import type { ReactNode } from 'react';
import {
  siBluesky,
  siFacebook,
  siGoogleads,
  siInstagram,
  siMeta,
  siPinterest,
  siReddit,
  siShopee,
  siSnapchat,
  siTiktok,
  siThreads,
  siWhatsapp,
  siX,
  siYoutube,
  type SimpleIcon,
} from 'simple-icons';

export type BrandKey =
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'youtube'
  | 'shopee'
  | 'lazada'
  | 'tokopedia'
  | 'whatsapp'
  | 'linkedin'
  | 'threads'
  | 'bluesky'
  | 'pinterest'
  | 'reddit'
  | 'x'
  | 'metaads'
  | 'googleads'
  | 'linkedinads'
  | 'pinterestads'
  | 'tiktokads'
  | 'xads'
  | 'googlebusiness'
  | 'snapchat';

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
  threads: siThreads,
  bluesky: siBluesky,
  pinterest: siPinterest,
  reddit: siReddit,
  x: siX,
  metaads: siMeta,
  googleads: siGoogleads,
  pinterestads: siPinterest,
  tiktokads: siTiktok,
  xads: siX,
  snapchat: siSnapchat,
};

const brandStyles: Record<BrandKey, { bg: string; fg?: string }> = {
  instagram: { bg: '#E4405F' },
  facebook: { bg: '#1877F2' },
  tiktok: { bg: '#111111', fg: '#FFFFFF' },
  youtube: { bg: '#FF0000' },
  shopee: { bg: '#EE4D2D' },
  lazada: { bg: '#EF4823' },
  tokopedia: { bg: '#42B549' },
  whatsapp: { bg: '#25D366' },
  linkedin: { bg: '#0A66C2', fg: '#FFFFFF' },
  threads: { bg: '#101010', fg: '#FFFFFF' },
  bluesky: { bg: '#0285FF', fg: '#FFFFFF' },
  pinterest: { bg: '#E60023', fg: '#FFFFFF' },
  reddit: { bg: '#FF4500', fg: '#FFFFFF' },
  x: { bg: '#111111', fg: '#FFFFFF' },
  metaads: { bg: '#1877F2', fg: '#FFFFFF' },
  googleads: { bg: '#FFFFFF' },
  linkedinads: { bg: '#0A66C2', fg: '#FFFFFF' },
  pinterestads: { bg: '#E60023', fg: '#FFFFFF' },
  tiktokads: { bg: '#111111', fg: '#FFFFFF' },
  xads: { bg: '#111111', fg: '#FFFFFF' },
  googlebusiness: { bg: '#FFFFFF' },
  snapchat: { bg: '#FFFC00', fg: '#111111' },
};

function renderInner(brand: BrandKey, size: number): ReactNode {
  if (brand === 'tokopedia') {
    // Tokopedia owl mascot (Toped) - white on green bg
    return (
      <svg viewBox="0 0 40 40" width={size * 0.72} height={size * 0.72} aria-hidden="true" className="block">
        {/* ear tufts */}
        <polygon points="11,4 14,12 8,11" fill="#FFFFFF" opacity="0.9" />
        <polygon points="29,4 26,12 32,11" fill="#FFFFFF" opacity="0.9" />
        {/* head */}
        <ellipse cx="20" cy="22" rx="14" ry="13" fill="#FFFFFF" opacity="0.95" />
        {/* left eye ring */}
        <circle cx="13.5" cy="19" r="5.5" fill="#42B549" />
        <circle cx="13.5" cy="19" r="3.8" fill="#FFFFFF" />
        <circle cx="14" cy="18.5" r="2" fill="#1a3d20" />
        <circle cx="14.7" cy="17.7" r="0.7" fill="#FFFFFF" />
        {/* right eye ring */}
        <circle cx="26.5" cy="19" r="5.5" fill="#42B549" />
        <circle cx="26.5" cy="19" r="3.8" fill="#FFFFFF" />
        <circle cx="27" cy="18.5" r="2" fill="#1a3d20" />
        <circle cx="27.7" cy="17.7" r="0.7" fill="#FFFFFF" />
        {/* beak */}
        <path d="M18 25 L20 28.5 L22 25 Q20 26.5 18 25Z" fill="#F5A623" />
      </svg>
    );
  }

  if (brand === 'lazada') {
    // Lazada — white bold "L" on orange-red bg
    return (
      <svg viewBox="0 0 28 28" width={size * 0.6} height={size * 0.6} aria-hidden="true" className="block">
        <path fill="#FFFFFF" d="M4 3 h6 v17 h14 v5 H4 Z" />
      </svg>
    );
  }

  if (brand === 'googleads') {
    return (
      <svg viewBox="0 0 24 24" width={size * 0.7} height={size * 0.7} aria-hidden="true" className="block">
        <path fill="#4285F4" d="M10.75 3.5a3 3 0 0 1 4.07 1.1l4.61 7.98a3 3 0 1 1-5.2 3l-4.62-7.99a3 3 0 0 1 1.14-4.08Z" />
        <path fill="#34A853" d="M9.18 7.53a3 3 0 0 1 1.1 4.09l-4.5 7.77H1.7l5-8.66a3 3 0 0 1 2.48-3.2Z" opacity="0.95" />
        <circle cx="6.1" cy="18.15" r="3.1" fill="#FBBC04" />
      </svg>
    );
  }

  if (brand === 'linkedin' || brand === 'linkedinads') {
    return (
      <span
        className="block font-black lowercase"
        style={{ color: '#FFFFFF', fontSize: size * 0.42, lineHeight: 1 }}
      >
        in
      </span>
    );
  }

  if (brand === 'googlebusiness') {
    return (
      <span
        className="block font-black"
        style={{ color: '#1A73E8', fontSize: size * 0.42, lineHeight: 1 }}
      >
        G
      </span>
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
  if (value.includes('lazada')) return 'lazada';
  if (value.includes('tokopedia')) return 'tokopedia';
  if (value.includes('whatsapp')) return 'whatsapp';
  if (value.includes('linkedin ads')) return 'linkedinads';
  if (value.includes('linkedin')) return 'linkedin';
  if (value.includes('threads')) return 'threads';
  if (value.includes('bluesky')) return 'bluesky';
  if (value.includes('pinterest ads')) return 'pinterestads';
  if (value.includes('pinterest')) return 'pinterest';
  if (value.includes('reddit')) return 'reddit';
  if (value.includes('google business')) return 'googlebusiness';
  if (value.includes('google ads')) return 'googleads';
  if (value.includes('meta ads')) return 'metaads';
  if (value.includes('tiktok ads')) return 'tiktokads';
  if (value.includes('x ads')) return 'xads';
  if (value.includes('twitter')) return 'x';
  if (value === 'x') return 'x';
  if (value.includes('snapchat')) return 'snapchat';

  return 'instagram';
}
