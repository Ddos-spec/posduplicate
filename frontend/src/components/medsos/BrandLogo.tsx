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
  lazada: { bg: '#FFFFFF' },
  tokopedia: { bg: '#FFFFFF' },
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
    return (
      <svg viewBox="0 0 24 24" width={size * 0.68} height={size * 0.68} aria-hidden="true" className="block">
        <path
          fill="#42B549"
          d="M12 3c-4.97 0-9 3.925-9 8.75 0 1.46.372 2.838 1.032 4.05.515.947.968 1.608 1.968 2.61V21h2.78l1.05-1.368c.378.072.768.118 1.17.118 5.523 0 10-4.03 10-9S17.523 3 12 3z"
        />
        <circle cx="8.45" cy="10.9" r="2.65" fill="#FFFFFF" />
        <circle cx="15.55" cy="10.9" r="2.65" fill="#FFFFFF" />
        <circle cx="8.45" cy="10.9" r="1.05" fill="#1F2937" />
        <circle cx="15.55" cy="10.9" r="1.05" fill="#1F2937" />
        <path fill="#F59E0B" d="M12 12.2 10.65 14h2.7z" />
      </svg>
    );
  }

  if (brand === 'lazada') {
    return (
      <svg viewBox="0 0 24 24" width={size * 0.7} height={size * 0.7} aria-hidden="true" className="block">
        <defs>
          <linearGradient id="lazadaPrimary" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#FF7A00" />
            <stop offset="100%" stopColor="#FF4D6D" />
          </linearGradient>
          <linearGradient id="lazadaAccent" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#6D28D9" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
        </defs>
        <path fill="url(#lazadaPrimary)" d="M12 4.2 19.6 8.4v7.2L12 19.8 4.4 15.6V8.4z" />
        <path fill="url(#lazadaAccent)" d="m12 8.1 4.1 2.24v3.32L12 15.9l-4.1-2.24v-3.32z" />
        <path fill="#FFFFFF" fillOpacity="0.88" d="m12 8.1 2.98 1.63L12 12.55 9.02 9.73z" />
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
