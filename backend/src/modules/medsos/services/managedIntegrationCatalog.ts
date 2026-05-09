export type ManagedIntegrationSlug = 'social-hub' | 'marketplace-hub' | 'meta-ads-hub';

export type ManagedIntegrationCategory = 'social' | 'marketplace' | 'ads';

export type ManagedChannelBrand =
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'youtube'
  | 'shopee'
  | 'tokopedia'
  | 'lazada'
  | 'whatsapp';

export interface ManagedChannelDefinition {
  brand: ManagedChannelBrand;
  label: string;
}

export interface ManagedIntegrationDefinition {
  slug: ManagedIntegrationSlug;
  integrationType: string;
  category: ManagedIntegrationCategory;
  name: string;
  description: string;
  providerName: string;
  providerKey: string;
  launchMode: 'hosted_link' | 'manual_reference';
  billingNote: string;
  dashboardFeeNote: string;
  supportedChannels: ManagedChannelDefinition[];
  capabilities: string[];
  setupChecklist: string[];
  requiredUserActions: string[];
  vendorPortalUrl?: string;
  vendorPortalLabel?: string;
  pricingSummary?: string;
  recommendedPlan?: string;
  pricingUrl?: string;
  docsUrl?: string;
  supportUrl?: string;
  launchUrl?: string;
  webhookSecret?: string;
}

const socialLaunchUrl = process.env.MCS_SOCIAL_CONNECT_URL;
const socialProviderName = process.env.MCS_SOCIAL_PROVIDER_NAME || 'WA Inbox';
const socialPricingUrl = process.env.MCS_SOCIAL_PRICING_URL || '';
const socialDocsUrl = process.env.MCS_SOCIAL_DOCS_URL || '';
const socialSupportUrl = process.env.MCS_SOCIAL_SUPPORT_URL || '';
const socialPortalUrl = process.env.MCS_SOCIAL_VENDOR_PORTAL_URL || 'https://customerservicecrm.vercel.app';
const socialPortalLabel = process.env.MCS_SOCIAL_VENDOR_PORTAL_LABEL || 'Buka inbox';

const marketplaceLaunchUrl = process.env.MCS_MARKETPLACE_CONNECT_URL;
const marketplaceProviderName = process.env.MCS_MARKETPLACE_PROVIDER_NAME || 'Marketplace Chat Engine';
const marketplacePricingUrl = process.env.MCS_MARKETPLACE_PRICING_URL || '';
const marketplaceDocsUrl = process.env.MCS_MARKETPLACE_DOCS_URL || '';
const marketplaceSupportUrl = process.env.MCS_MARKETPLACE_SUPPORT_URL || '';
const marketplacePortalUrl = process.env.MCS_MARKETPLACE_VENDOR_PORTAL_URL || '';
const marketplacePortalLabel = process.env.MCS_MARKETPLACE_VENDOR_PORTAL_LABEL || 'Lihat status aktivasi';

const adsLaunchUrl = process.env.MCS_META_ADS_CONNECT_URL;
const adsProviderName = process.env.MCS_META_ADS_PROVIDER_NAME || 'Meta';
const adsPricingUrl = process.env.MCS_META_ADS_PRICING_URL || '';
const adsDocsUrl = process.env.MCS_META_ADS_DOCS_URL || 'https://developers.facebook.com/docs/marketing-apis/';
const adsSupportUrl = process.env.MCS_META_ADS_SUPPORT_URL || 'https://www.facebook.com/business/help';
const adsPortalUrl = process.env.MCS_META_ADS_VENDOR_PORTAL_URL || 'https://ads.facebook.com';
const adsPortalLabel = process.env.MCS_META_ADS_VENDOR_PORTAL_LABEL || 'Buka ads workspace';

export const managedIntegrationsCatalog: Record<ManagedIntegrationSlug, ManagedIntegrationDefinition> = {
  'social-hub': {
    slug: 'social-hub',
    integrationType: 'managed_social_hub',
    category: 'social',
    name: 'WA Inbox',
    description: 'Chat inbox berbasis WhatsApp — sambungkan workspace inbox agar pesan masuk, statistik, dan eskalasi dapat dipantau langsung dari dashboard.',
    providerName: socialProviderName,
    providerKey: 'wa_crm',
    launchMode: socialLaunchUrl ? 'hosted_link' : 'manual_reference',
    launchUrl: socialLaunchUrl,
    vendorPortalUrl: socialPortalUrl || undefined,
    vendorPortalLabel: socialPortalLabel,
    pricingSummary: undefined,
    recommendedPlan: undefined,
    pricingUrl: socialPricingUrl || undefined,
    docsUrl: socialDocsUrl || undefined,
    supportUrl: socialSupportUrl || undefined,
    webhookSecret: process.env.MCS_SOCIAL_WEBHOOK_SECRET,
    billingNote: 'Biaya operasional inbox mengikuti workspace yang aktif. MyCommerSocial tetap menjadi command center dan routing layer.',
    dashboardFeeNote: 'Rp300.000/bulan untuk dashboard orchestration, stats, dan eskalasi.',
    supportedChannels: [
      { brand: 'whatsapp', label: 'WhatsApp Inbox' },
    ],
    capabilities: ['unified WA inbox', 'live chat stats', 'eskalasi alert', 'blast campaign', 'lead tracking'],
    setupChecklist: [
      'Pastikan workspace inbox sudah aktif dan siap dipakai.',
      'Salin API key workspace dari panel admin yang mengelola inbox.',
      'Masukkan API key tenant ke form finalisasi di dashboard ini.',
      'Dashboard akan langsung membaca statistik dan chat aktif dari workspace inbox.',
    ],
    requiredUserActions: ['Aktifkan workspace inbox', 'Salin API key', 'Isi API key di form'],
  },
  'marketplace-hub': {
    slug: 'marketplace-hub',
    integrationType: 'managed_marketplace_hub',
    category: 'marketplace',
    name: 'Marketplace Chat Hub',
    description: 'Hubungkan toko marketplace yang sudah aktif agar semua chat buyer masuk ke satu inbox AI. Fokus v1 adalah chat marketplace lintas channel, bukan operasi stok dan order penuh.',
    providerName: marketplaceProviderName,
    providerKey: 'marketplace_chat_engine',
    launchMode: marketplaceLaunchUrl ? 'hosted_link' : 'manual_reference',
    launchUrl: marketplaceLaunchUrl,
    vendorPortalUrl: marketplacePortalUrl,
    vendorPortalLabel: marketplacePortalLabel,
    pricingSummary: 'Gunakan workspace marketplace chat yang sudah aktif, lalu arahkan seluruh percakapan buyer ke MyCommerSocial sebagai AI command center.',
    recommendedPlan: 'Workspace marketplace chat aktif',
    pricingUrl: marketplacePricingUrl,
    docsUrl: marketplaceDocsUrl,
    supportUrl: marketplaceSupportUrl,
    webhookSecret: process.env.MCS_MARKETPLACE_WEBHOOK_SECRET,
    billingNote: 'Biaya engine marketplace chat mengikuti workspace yang aktif. MyCommerSocial tetap menjadi dashboard utama, layer AI, dan orkestrasi balasan.',
    dashboardFeeNote: 'Rp300.000/bulan untuk inbox AI, workflow tim, dan orkestrasi webhook ke engine marketplace chat.',
    supportedChannels: [
      { brand: 'shopee', label: 'Shopee' },
      { brand: 'tokopedia', label: 'Tokopedia' },
      { brand: 'tiktok', label: 'TikTok Shop' },
    ],
    capabilities: ['marketplace chat sync', 'AI auto-reply bridge', 'handover ke agent', 'channel orchestration', 'session webhook orchestration'],
    setupChecklist: [
      'Pastikan klien sudah punya toko marketplace yang aktif.',
      'Siapkan credential workspace chat marketplace dari panel internal aktivasi.',
      'Aktifkan channel marketplace yang dibutuhkan di workspace chat.',
      'Tempel webhook URL MyCommerSocial ke pengaturan inbound message workspace marketplace.',
      'Lengkapi credential internal agar setiap pesan dapat diarahkan ke AI dan agent yang tepat.',
    ],
    requiredUserActions: ['Hubungkan toko marketplace yang sudah aktif', 'Simpan workspace marketplace', 'Tunggu aktivasi oleh tim onboarding'],
  },
  'meta-ads-hub': {
    slug: 'meta-ads-hub',
    integrationType: 'managed_meta_ads_hub',
    category: 'ads',
    name: 'Meta Ads',
    description: 'Hubungkan langsung ke Meta Business — login Facebook, pilih Ad Account, selesai. Campaign stats, spend, dan leads tampil di dashboard tanpa setup manual.',
    providerName: adsProviderName,
    providerKey: 'meta',
    launchMode: adsLaunchUrl ? 'hosted_link' : 'manual_reference',
    launchUrl: adsLaunchUrl,
    vendorPortalUrl: adsPortalUrl,
    vendorPortalLabel: adsPortalLabel,
    pricingSummary: undefined,
    recommendedPlan: undefined,
    pricingUrl: adsPricingUrl || undefined,
    docsUrl: adsDocsUrl || undefined,
    supportUrl: adsSupportUrl || undefined,
    webhookSecret: process.env.MCS_META_ADS_WEBHOOK_SECRET,
    billingNote: 'Spend iklan mengikuti account ads yang aktif. MyCommerSocial hanya menjadi command center.',
    dashboardFeeNote: 'Rp300.000/bulan untuk command center, alert pacing, dan lead orchestration.',
    supportedChannels: [
      { brand: 'facebook', label: 'Facebook Ads' },
      { brand: 'instagram', label: 'Instagram Ads' },
    ],
    capabilities: ['account health', 'campaign snapshot', 'budget pacing', 'lead sync', 'creative workflow'],
    setupChecklist: [
      'Klik Connect — akan diarahkan ke login Meta.',
      'Login dengan akun Facebook yang punya Business Manager.',
      'Pilih Ad Account yang ingin diintegrasikan lalu klik Continue.',
      'Dashboard otomatis menampilkan data campaign.',
    ],
    requiredUserActions: ['Login Facebook', 'Pilih Ad Account', 'Approve permission'],
  },
};

export const managedIntegrationOrder: ManagedIntegrationSlug[] = [
  'social-hub',
  'marketplace-hub',
  'meta-ads-hub',
];

export function getManagedIntegrationDefinition(slug: string): ManagedIntegrationDefinition | null {
  if (!slug || !(slug in managedIntegrationsCatalog)) {
    return null;
  }

  return managedIntegrationsCatalog[slug as ManagedIntegrationSlug];
}
