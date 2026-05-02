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
  pricingUrl?: string;
  docsUrl?: string;
  supportUrl?: string;
  launchUrl?: string;
  webhookSecret?: string;
}

const socialLaunchUrl = process.env.MCS_SOCIAL_CONNECT_URL;
const socialProviderName = process.env.MCS_SOCIAL_PROVIDER_NAME || 'Managed Social Connector';
const socialPricingUrl = process.env.MCS_SOCIAL_PRICING_URL;
const socialDocsUrl = process.env.MCS_SOCIAL_DOCS_URL;
const socialSupportUrl = process.env.MCS_SOCIAL_SUPPORT_URL;

const marketplaceLaunchUrl = process.env.MCS_MARKETPLACE_CONNECT_URL;
const marketplaceProviderName = process.env.MCS_MARKETPLACE_PROVIDER_NAME || 'Managed Commerce Connector';
const marketplacePricingUrl = process.env.MCS_MARKETPLACE_PRICING_URL;
const marketplaceDocsUrl = process.env.MCS_MARKETPLACE_DOCS_URL;
const marketplaceSupportUrl = process.env.MCS_MARKETPLACE_SUPPORT_URL;

const adsLaunchUrl = process.env.MCS_META_ADS_CONNECT_URL;
const adsProviderName = process.env.MCS_META_ADS_PROVIDER_NAME || 'Managed Ads Connector';
const adsPricingUrl = process.env.MCS_META_ADS_PRICING_URL;
const adsDocsUrl = process.env.MCS_META_ADS_DOCS_URL;
const adsSupportUrl = process.env.MCS_META_ADS_SUPPORT_URL;

export const managedIntegrationsCatalog: Record<ManagedIntegrationSlug, ManagedIntegrationDefinition> = {
  'social-hub': {
    slug: 'social-hub',
    integrationType: 'managed_social_hub',
    category: 'social',
    name: 'Social Hub',
    description: 'Publisher, inbox komentar/DM, dan analytics sosial dikelola lewat partner connector sehingga user tinggal login dan approve.',
    providerName: socialProviderName,
    providerKey: 'managed_social_connector',
    launchMode: socialLaunchUrl ? 'hosted_link' : 'manual_reference',
    launchUrl: socialLaunchUrl,
    pricingUrl: socialPricingUrl,
    docsUrl: socialDocsUrl,
    supportUrl: socialSupportUrl,
    webhookSecret: process.env.MCS_SOCIAL_WEBHOOK_SECRET,
    billingNote: 'Biaya konektor sosial dibayar langsung ke partner. Dashboard hanya menarik biaya workspace MyCommerSocial.',
    dashboardFeeNote: 'Rp300.000/bulan untuk dashboard orchestration, routing, analytics, dan workflow.',
    supportedChannels: [
      { brand: 'instagram', label: 'Instagram Business' },
      { brand: 'facebook', label: 'Facebook Page' },
      { brand: 'tiktok', label: 'TikTok Business' },
      { brand: 'youtube', label: 'YouTube Channel' },
    ],
    capabilities: ['unified inbox', 'comment + DM sync', 'content publish', 'approval workflow', 'analytics pull'],
    setupChecklist: [
      'User klik connect lalu login ke partner connector.',
      'User approve akun social dan memilih page/channel yang ingin diaktifkan.',
      'Backend menyimpan reference koneksi, callback, dan status health secara otomatis.',
      'Inbox, planner, dan analytics membaca data yang sudah dinormalisasi.',
    ],
    requiredUserActions: ['Login akun social', 'Pilih page/account', 'Klik allow / approve'],
  },
  'marketplace-hub': {
    slug: 'marketplace-hub',
    integrationType: 'managed_marketplace_hub',
    category: 'marketplace',
    name: 'Marketplace Hub',
    description: 'Koneksi toko marketplace dikelola partner sehingga user tidak perlu mengurus OAuth, webhook, atau sinkron katalog secara manual.',
    providerName: marketplaceProviderName,
    providerKey: 'managed_marketplace_connector',
    launchMode: marketplaceLaunchUrl ? 'hosted_link' : 'manual_reference',
    launchUrl: marketplaceLaunchUrl,
    pricingUrl: marketplacePricingUrl,
    docsUrl: marketplaceDocsUrl,
    supportUrl: marketplaceSupportUrl,
    webhookSecret: process.env.MCS_MARKETPLACE_WEBHOOK_SECRET,
    billingNote: 'Biaya connector marketplace, chat buyer, dan order sync dibayar langsung ke partner yang dipilih.',
    dashboardFeeNote: 'Rp300.000/bulan hanya untuk dashboard kontrol, alert, dan workflow tim internal.',
    supportedChannels: [
      { brand: 'shopee', label: 'Shopee' },
      { brand: 'tokopedia', label: 'Tokopedia' },
    ],
    capabilities: ['buyer chat sync', 'order queue', 'catalog health', 'stock mismatch alert', 'pricing exception'],
    setupChecklist: [
      'User klik connect lalu authorize toko ke partner connector.',
      'Partner mengelola token, refresh, webhook, dan retry sync.',
      'Backend menerima connection reference dan status sync untuk ditampilkan di command center.',
      'Queue pesanan dan buyer chat siap dipakai di unified inbox.',
    ],
    requiredUserActions: ['Login seller center', 'Pilih toko', 'Approve akses partner'],
  },
  'meta-ads-hub': {
    slug: 'meta-ads-hub',
    integrationType: 'managed_meta_ads_hub',
    category: 'ads',
    name: 'Meta Ads Hub',
    description: 'Ad account, campaign health, budget pacing, dan lead handoff diambil lewat partner ads connector agar user cukup approve account.',
    providerName: adsProviderName,
    providerKey: 'managed_ads_connector',
    launchMode: adsLaunchUrl ? 'hosted_link' : 'manual_reference',
    launchUrl: adsLaunchUrl,
    pricingUrl: adsPricingUrl,
    docsUrl: adsDocsUrl,
    supportUrl: adsSupportUrl,
    webhookSecret: process.env.MCS_META_ADS_WEBHOOK_SECRET,
    billingNote: 'Biaya ads connector dan spend iklan dibayar langsung ke provider / Meta. Dashboard hanya menjadi command center.',
    dashboardFeeNote: 'Rp300.000/bulan untuk command center, alert pacing, dan lead orchestration.',
    supportedChannels: [
      { brand: 'facebook', label: 'Facebook Ads' },
      { brand: 'instagram', label: 'Instagram Ads' },
    ],
    capabilities: ['account health', 'campaign snapshot', 'budget pacing', 'lead sync', 'creative workflow'],
    setupChecklist: [
      'User klik connect dan login ke Business Manager / partner link.',
      'User memilih ad account yang boleh dikelola dan mengaktifkan lead destination yang dibutuhkan.',
      'Backend menerima reference akun, health status, dan sinkronisasi snapshot campaign.',
      'Data tampil di Meta Ads command center tanpa user mengisi technical setup.',
    ],
    requiredUserActions: ['Login Business Manager', 'Pilih ad account', 'Approve permission'],
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

