export type ManagedIntegrationSlug = 'social-hub' | 'marketplace-hub' | 'meta-ads-hub';

export type ManagedIntegrationCategory = 'social' | 'marketplace' | 'ads';

export type ManagedChannelBrand =
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'youtube'
  | 'shopee'
  | 'tokopedia';

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
const socialProviderName = process.env.MCS_SOCIAL_PROVIDER_NAME || 'Tapchat';
const socialPricingUrl = process.env.MCS_SOCIAL_PRICING_URL || 'https://tapchat.id/';
const socialDocsUrl = process.env.MCS_SOCIAL_DOCS_URL || 'https://tapchat.id/';
const socialSupportUrl = process.env.MCS_SOCIAL_SUPPORT_URL || 'https://tapchat.id/';
const socialPortalUrl = process.env.MCS_SOCIAL_VENDOR_PORTAL_URL || 'https://app.tapchat.id/register';
const socialPortalLabel = process.env.MCS_SOCIAL_VENDOR_PORTAL_LABEL || 'Buka portal Tapchat';

const marketplaceLaunchUrl = process.env.MCS_MARKETPLACE_CONNECT_URL;
const marketplaceProviderName = process.env.MCS_MARKETPLACE_PROVIDER_NAME || 'Jubelio';
const marketplacePricingUrl = process.env.MCS_MARKETPLACE_PRICING_URL || 'https://jubelio.com/en/pricing/';
const marketplaceDocsUrl = process.env.MCS_MARKETPLACE_DOCS_URL || 'https://docs-wms.jubelio.com/';
const marketplaceSupportUrl = process.env.MCS_MARKETPLACE_SUPPORT_URL || 'https://jubelio.com/en/api-integration/';
const marketplacePortalUrl = process.env.MCS_MARKETPLACE_VENDOR_PORTAL_URL || 'https://v2.jubelio.com/auth/register';
const marketplacePortalLabel = process.env.MCS_MARKETPLACE_VENDOR_PORTAL_LABEL || 'Buka portal Jubelio';

const adsLaunchUrl = process.env.MCS_META_ADS_CONNECT_URL;
const adsProviderName = process.env.MCS_META_ADS_PROVIDER_NAME || 'Shown';
const adsPricingUrl = process.env.MCS_META_ADS_PRICING_URL || 'https://shown.io/en/pricing';
const adsDocsUrl = process.env.MCS_META_ADS_DOCS_URL || 'https://shown.io/en/api';
const adsSupportUrl = process.env.MCS_META_ADS_SUPPORT_URL || 'https://help.shown.io/';
const adsPortalUrl = process.env.MCS_META_ADS_VENDOR_PORTAL_URL || 'https://app.shown.io/create-account?lang=en';
const adsPortalLabel = process.env.MCS_META_ADS_VENDOR_PORTAL_LABEL || 'Buka portal Shown';

export const managedIntegrationsCatalog: Record<ManagedIntegrationSlug, ManagedIntegrationDefinition> = {
  'social-hub': {
    slug: 'social-hub',
    integrationType: 'managed_social_hub',
    category: 'social',
    name: 'Social Hub',
    description: 'Social inbox dan lead capture dijalankan via Tapchat agar user cukup daftar, login, lalu approve aset sosial tanpa setup teknis.',
    providerName: socialProviderName,
    providerKey: 'tapchat',
    launchMode: socialLaunchUrl ? 'hosted_link' : 'manual_reference',
    launchUrl: socialLaunchUrl,
    vendorPortalUrl: socialPortalUrl,
    vendorPortalLabel: socialPortalLabel,
    pricingSummary: 'Tapchat Lite mulai Rp49.000/bulan untuk omnichannel chat dan lead ads sync.',
    recommendedPlan: 'Lite Rp49.000/bulan',
    pricingUrl: socialPricingUrl,
    docsUrl: socialDocsUrl,
    supportUrl: socialSupportUrl,
    webhookSecret: process.env.MCS_SOCIAL_WEBHOOK_SECRET,
    billingNote: 'Biaya Tapchat dibayar langsung oleh user. MyCommerSocial hanya menarik biaya dashboard dan workflow internal.',
    dashboardFeeNote: 'Rp300.000/bulan untuk orchestration, routing, analytics, dan war room omnichannel.',
    supportedChannels: [
      { brand: 'instagram', label: 'Instagram Business' },
      { brand: 'facebook', label: 'Facebook Page' },
      { brand: 'tiktok', label: 'TikTok Business' },
      { brand: 'youtube', label: 'YouTube Channel' },
    ],
    capabilities: ['unified inbox', 'comment + DM sync', 'content publish', 'approval workflow', 'analytics pull'],
    setupChecklist: [
      'User klik connect lalu masuk ke portal Tapchat.',
      'User login, memilih channel sosial, lalu mengaktifkan inbox/comment flow yang dibutuhkan.',
      'Backend menyimpan reference koneksi, callback, dan status health secara otomatis.',
      'Inbox, planner, dan analytics membaca data yang sudah dinormalisasi.',
    ],
    requiredUserActions: ['Daftar / login Tapchat', 'Hubungkan akun social', 'Klik allow / approve'],
  },
  'marketplace-hub': {
    slug: 'marketplace-hub',
    integrationType: 'managed_marketplace_hub',
    category: 'marketplace',
    name: 'Marketplace Hub',
    description: 'Order, katalog, stok, dan buyer chat marketplace ditarik lewat Jubelio supaya seller tinggal daftar lalu menghubungkan toko.',
    providerName: marketplaceProviderName,
    providerKey: 'jubelio',
    launchMode: marketplaceLaunchUrl ? 'hosted_link' : 'manual_reference',
    launchUrl: marketplaceLaunchUrl,
    vendorPortalUrl: marketplacePortalUrl,
    vendorPortalLabel: marketplacePortalLabel,
    pricingSummary: 'Jubelio mulai Rp150/order untuk order sync, inventory, catalog, dan chat marketplace.',
    recommendedPlan: 'Mulai Rp150/order',
    pricingUrl: marketplacePricingUrl,
    docsUrl: marketplaceDocsUrl,
    supportUrl: marketplaceSupportUrl,
    webhookSecret: process.env.MCS_MARKETPLACE_WEBHOOK_SECRET,
    billingNote: 'Biaya Jubelio dibayar langsung oleh user. MyCommerSocial hanya menjadi command center, alert, dan lapisan workflow.',
    dashboardFeeNote: 'Rp300.000/bulan hanya untuk dashboard kontrol, alert, dan workflow tim internal.',
    supportedChannels: [
      { brand: 'shopee', label: 'Shopee' },
      { brand: 'tokopedia', label: 'Tokopedia' },
    ],
    capabilities: ['buyer chat sync', 'order queue', 'catalog health', 'stock mismatch alert', 'pricing exception'],
    setupChecklist: [
      'User klik connect lalu daftar / login Jubelio.',
      'Jubelio mengelola sinkron order, inventory, token, dan retry sync marketplace.',
      'Backend menerima connection reference dan status sync untuk ditampilkan di command center.',
      'Queue pesanan dan buyer chat siap dipakai di unified inbox.',
    ],
    requiredUserActions: ['Daftar / login Jubelio', 'Hubungkan toko', 'Approve akses marketplace'],
  },
  'meta-ads-hub': {
    slug: 'meta-ads-hub',
    integrationType: 'managed_meta_ads_hub',
    category: 'ads',
    name: 'Meta Ads Hub',
    description: 'Meta Ads dibungkus lewat Shown agar user cukup membuat akun, menghubungkan ad account, lalu membaca hasilnya dari dashboard.',
    providerName: adsProviderName,
    providerKey: 'shown',
    launchMode: adsLaunchUrl ? 'hosted_link' : 'manual_reference',
    launchUrl: adsLaunchUrl,
    vendorPortalUrl: adsPortalUrl,
    vendorPortalLabel: adsPortalLabel,
    pricingSummary: 'Shown Starter $29/bulan dan 0% komisi bila user memakai ad account miliknya sendiri.',
    recommendedPlan: 'Starter $29/bulan',
    pricingUrl: adsPricingUrl,
    docsUrl: adsDocsUrl,
    supportUrl: adsSupportUrl,
    webhookSecret: process.env.MCS_META_ADS_WEBHOOK_SECRET,
    billingNote: 'Biaya Shown dan spend iklan dibayar langsung oleh user ke vendor / Meta. MyCommerSocial hanya menjadi command center.',
    dashboardFeeNote: 'Rp300.000/bulan untuk command center, alert pacing, dan lead orchestration.',
    supportedChannels: [
      { brand: 'facebook', label: 'Facebook Ads' },
      { brand: 'instagram', label: 'Instagram Ads' },
    ],
    capabilities: ['account health', 'campaign snapshot', 'budget pacing', 'lead sync', 'creative workflow'],
    setupChecklist: [
      'User klik connect lalu membuat akun Shown atau login jika sudah punya.',
      'User menghubungkan ad account Meta miliknya dan memilih destination lead yang dibutuhkan.',
      'Backend menerima reference akun, health status, dan sinkronisasi snapshot campaign.',
      'Data tampil di Meta Ads command center tanpa user mengisi technical setup.',
    ],
    requiredUserActions: ['Daftar / login Shown', 'Hubungkan ad account', 'Approve permission'],
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
