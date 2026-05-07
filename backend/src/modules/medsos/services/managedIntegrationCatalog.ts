export type ManagedIntegrationSlug = 'social-hub' | 'marketplace-hub' | 'meta-ads-hub';

export type ManagedIntegrationCategory = 'social' | 'marketplace' | 'ads';

export type ManagedChannelBrand =
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'youtube'
  | 'shopee'
  | 'tokopedia'
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
const socialProviderName = process.env.MCS_SOCIAL_PROVIDER_NAME || 'WA CRM';
const socialPricingUrl = process.env.MCS_SOCIAL_PRICING_URL || '';
const socialDocsUrl = process.env.MCS_SOCIAL_DOCS_URL || '';
const socialSupportUrl = process.env.MCS_SOCIAL_SUPPORT_URL || '';
const socialPortalUrl = process.env.MCS_SOCIAL_VENDOR_PORTAL_URL || '';
const socialPortalLabel = process.env.MCS_SOCIAL_VENDOR_PORTAL_LABEL || 'Buka WA CRM';

const marketplaceLaunchUrl = process.env.MCS_MARKETPLACE_CONNECT_URL;
const marketplaceProviderName = process.env.MCS_MARKETPLACE_PROVIDER_NAME || 'Jubelio';
const marketplacePricingUrl = process.env.MCS_MARKETPLACE_PRICING_URL || 'https://jubelio.com/en/pricing/';
const marketplaceDocsUrl = process.env.MCS_MARKETPLACE_DOCS_URL || 'https://docs-wms.jubelio.com/';
const marketplaceSupportUrl = process.env.MCS_MARKETPLACE_SUPPORT_URL || 'https://jubelio.com/en/api-integration/';
const marketplacePortalUrl = process.env.MCS_MARKETPLACE_VENDOR_PORTAL_URL || 'https://v2.jubelio.com/auth/register';
const marketplacePortalLabel = process.env.MCS_MARKETPLACE_VENDOR_PORTAL_LABEL || 'Buka portal Jubelio';

const adsLaunchUrl = process.env.MCS_META_ADS_CONNECT_URL;
const adsProviderName = process.env.MCS_META_ADS_PROVIDER_NAME || 'Meta';
const adsPricingUrl = process.env.MCS_META_ADS_PRICING_URL || '';
const adsDocsUrl = process.env.MCS_META_ADS_DOCS_URL || 'https://developers.facebook.com/docs/marketing-apis/';
const adsSupportUrl = process.env.MCS_META_ADS_SUPPORT_URL || 'https://www.facebook.com/business/help';
const adsPortalUrl = process.env.MCS_META_ADS_VENDOR_PORTAL_URL || 'https://ads.facebook.com';
const adsPortalLabel = process.env.MCS_META_ADS_VENDOR_PORTAL_LABEL || 'Buka Meta Ads Manager';

export const managedIntegrationsCatalog: Record<ManagedIntegrationSlug, ManagedIntegrationDefinition> = {
  'social-hub': {
    slug: 'social-hub',
    integrationType: 'managed_social_hub',
    category: 'social',
    name: 'WA Inbox',
    description: 'Chat inbox berbasis WhatsApp — sambungkan Customer Service CRM untuk sinkronkan pesan masuk, stats, dan eskalasi langsung dari dashboard.',
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
    billingNote: 'Biaya hosting CRM ditanggung sendiri. MyCommerSocial hanya menjadi command center dan routing layer.',
    dashboardFeeNote: 'Rp300.000/bulan untuk dashboard orchestration, stats, dan eskalasi.',
    supportedChannels: [
      { brand: 'whatsapp', label: 'WhatsApp Inbox' },
    ],
    capabilities: ['unified WA inbox', 'live chat stats', 'eskalasi alert', 'blast campaign', 'lead tracking'],
    setupChecklist: [
      'Pastikan instance Customer Service CRM sudah berjalan dan aktif.',
      'Salin API key tenant dari panel admin CRM (Settings → API Key).',
      'Masukkan API key tenant ke form finalisasi di dashboard ini.',
      'Dashboard akan langsung membaca stats dan chat aktif dari CRM.',
    ],
    requiredUserActions: ['Jalankan instance CRM', 'Salin API key', 'Isi API key di form'],
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
    billingNote: 'Spend iklan dibayar langsung ke Meta. Tidak ada biaya third-party — MyCommerSocial hanya menjadi command center.',
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
