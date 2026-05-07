import type { BrandKey } from '../components/medsos/BrandLogo';

export type ZernioPlatformCard = {
  id: string;
  label: string;
  kind: 'social' | 'ads';
  connectPlatform: string | null;
  accountPlatforms: string[];
  brand?: BrandKey;
  hint: string;
  requirement?: string;
  soon?: boolean;
};

export const zernioSocialPlatforms: ZernioPlatformCard[] = [
  {
    id: 'tiktok',
    label: 'TikTok',
    kind: 'social',
    connectPlatform: 'tiktok',
    accountPlatforms: ['tiktok'],
    brand: 'tiktok',
    hint: 'Posting, analytics, dan workflow konten lintas tim lewat satu profile tenant.',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    kind: 'social',
    connectPlatform: 'instagram',
    accountPlatforms: ['instagram'],
    brand: 'instagram',
    hint: 'Reels, feed, comment, dan approval flow tetap di dalam MyCommerSocial.',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    kind: 'social',
    connectPlatform: 'facebook',
    accountPlatforms: ['facebook'],
    brand: 'facebook',
    hint: 'Page connect dipakai juga untuk membuka jalur Meta Ads via Zernio.',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    kind: 'social',
    connectPlatform: 'youtube',
    accountPlatforms: ['youtube'],
    brand: 'youtube',
    hint: 'Video planning dan publishing panjang dikelola per tenant yang sama.',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    kind: 'social',
    connectPlatform: 'linkedin',
    accountPlatforms: ['linkedin'],
    brand: 'linkedin',
    hint: 'Cocok untuk brand B2B atau personal branding founder.',
  },
  {
    id: 'twitter',
    label: 'X / Twitter',
    kind: 'social',
    connectPlatform: 'twitter',
    accountPlatforms: ['twitter'],
    brand: 'x',
    hint: 'Sekali connect, account yang sama bisa dipakai lagi untuk X Ads.',
  },
  {
    id: 'threads',
    label: 'Threads',
    kind: 'social',
    connectPlatform: 'threads',
    accountPlatforms: ['threads'],
    brand: 'threads',
    hint: 'Masuk ke profile Zernio tenant yang sama dengan akun sosial lainnya.',
  },
  {
    id: 'bluesky',
    label: 'Bluesky',
    kind: 'social',
    connectPlatform: 'bluesky',
    accountPlatforms: ['bluesky'],
    brand: 'bluesky',
    hint: 'Tetap satu workspace walau channel-nya niche.',
  },
  {
    id: 'pinterest',
    label: 'Pinterest',
    kind: 'social',
    connectPlatform: 'pinterest',
    accountPlatforms: ['pinterest'],
    brand: 'pinterest',
    hint: 'Pin organik dan paid Pinterest bisa tinggal satu wadah.',
  },
  {
    id: 'reddit',
    label: 'Reddit',
    kind: 'social',
    connectPlatform: 'reddit',
    accountPlatforms: ['reddit'],
    brand: 'reddit',
    hint: 'Untuk workflow komunitas dan posting niche.',
  },
  {
    id: 'googlebusiness',
    label: 'Google Business',
    kind: 'social',
    connectPlatform: 'googlebusiness',
    accountPlatforms: ['googlebusiness'],
    brand: 'googlebusiness',
    hint: 'Aktivasi presence lokal tanpa keluar dari dashboard utama.',
  },
  {
    id: 'snapchat',
    label: 'Snapchat',
    kind: 'social',
    connectPlatform: null,
    accountPlatforms: ['snapchat'],
    brand: 'snapchat',
    hint: 'Disiapkan di roadmap Zernio, tapi belum diaktifkan di launch awal ini.',
    soon: true,
  },
];

export const zernioAdsPlatforms: ZernioPlatformCard[] = [
  {
    id: 'metaads',
    label: 'Meta Ads',
    kind: 'ads',
    connectPlatform: 'facebook',
    accountPlatforms: ['metaads'],
    brand: 'metaads',
    hint: 'Meta Ads dipusatkan ke Zernio, bukan connector terpisah lagi.',
    requirement: 'Hubungkan Facebook Page atau Instagram Business dulu agar Zernio bisa membuat workspace ads-nya.',
  },
  {
    id: 'linkedinads',
    label: 'LinkedIn Ads',
    kind: 'ads',
    connectPlatform: 'linkedin',
    accountPlatforms: ['linkedinads'],
    brand: 'linkedinads',
    hint: 'Aktifkan hanya kalau tenant memang butuh paid B2B.',
    requirement: 'Sebaiknya akun LinkedIn organik sudah terhubung lebih dulu.',
  },
  {
    id: 'pinterestads',
    label: 'Pinterest Ads',
    kind: 'ads',
    connectPlatform: 'pinterest',
    accountPlatforms: ['pinterestads'],
    brand: 'pinterestads',
    hint: 'Paid discovery dan catalog traffic tetap pakai profile tenant yang sama.',
    requirement: 'Pinterest organik sebaiknya sudah tersambung.',
  },
  {
    id: 'tiktokads',
    label: 'TikTok Ads',
    kind: 'ads',
    connectPlatform: 'tiktok',
    accountPlatforms: ['tiktokads'],
    brand: 'tiktok',
    hint: 'Bisa dipakai untuk ads-only atau dilink ke akun TikTok organik tenant.',
    requirement: 'Jika ingin Spark Ads, sambungkan akun TikTok organik tenant lebih dulu.',
  },
  {
    id: 'googleads',
    label: 'Google Ads',
    kind: 'ads',
    connectPlatform: 'googleads',
    accountPlatforms: ['googleads'],
    brand: 'googleads',
    hint: 'Search dan Display bisa tetap dikontrol dari command center yang sama.',
  },
  {
    id: 'xads',
    label: 'X Ads',
    kind: 'ads',
    connectPlatform: 'twitter',
    accountPlatforms: ['xads'],
    brand: 'xads',
    hint: 'Dipakai bila tenant butuh paid distribution di X.',
    requirement: 'X Ads membutuhkan akun X/Twitter organik yang sudah tersambung.',
  },
];

const adsAccountPlatforms = new Set(['metaads', 'googleads', 'linkedinads', 'tiktokads', 'pinterestads', 'xads']);

export function isZernioAdsAccount(platform: string) {
  return adsAccountPlatforms.has(platform.toLowerCase());
}
