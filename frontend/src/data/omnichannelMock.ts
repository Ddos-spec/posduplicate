export type OmniStat = {
  label: string;
  value: string;
  delta: string;
  tone: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  helper: string;
};

export type ChannelConnection = {
  id: string;
  name: string;
  kind: 'social' | 'marketplace';
  handle: string;
  status: 'healthy' | 'warning' | 'offline';
  responseTime: string;
  unread: number;
  healthScore: number;
  followers?: string;
  ordersToday?: number;
  syncStatus?: string;
};

export type PriorityThread = {
  id: number;
  customer: string;
  channel: string;
  kind: 'social' | 'marketplace';
  inboxType: 'comment' | 'dm' | 'buyer_chat' | 'review';
  subject: string;
  snippet: string;
  time: string;
  unread: number;
  priority: 'high' | 'medium' | 'low';
  assignee: string;
  tags: string[];
  sla: string;
};

export type PipelineCard = {
  id: number;
  title: string;
  channel: string;
  stage: 'brief' | 'design' | 'approval' | 'scheduled' | 'live';
  owner: string;
  publishAt: string;
  objective: string;
};

export type ScheduleEvent = {
  id: number;
  date: string;
  time: string;
  title: string;
  channel: string;
  format: string;
  owner: string;
  status: 'ready' | 'review' | 'scheduled';
};

export type MarketplaceOrder = {
  id: string;
  channel: string;
  customer: string;
  status: 'new' | 'packed' | 'late' | 'refund_risk';
  amount: string;
  sla: string;
  issue: string;
};

export type AutomationRule = {
  id: number;
  name: string;
  description: string;
  enabled: boolean;
  coverage: string;
};

export type InboxFilterChip = {
  id: string;
  label: string;
  count: number;
  tone: 'blue' | 'purple' | 'orange' | 'green' | 'slate';
};

export type ConversationMessage = {
  id: number;
  sender: 'user' | 'me' | 'system';
  text: string;
  time: string;
};

export type ThreadDetail = {
  threadId: number;
  sentiment: 'negative' | 'neutral' | 'positive';
  customerTier: 'VIP' | 'Returning' | 'New';
  preferredChannel: string;
  lifetimeValue: string;
  summary: string;
  orderContext?: {
    orderId: string;
    amount: string;
    status: string;
    lastUpdate: string;
  };
  recommendedActions: string[];
  macros: string[];
  internalNotes: string[];
  activities: Array<{
    time: string;
    title: string;
    description: string;
  }>;
};

export type WorkspaceHealthCard = {
  label: string;
  value: string;
  helper: string;
};

export type ChannelSetting = {
  id: string;
  name: string;
  brand: 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'shopee' | 'tokopedia' | 'whatsapp';
  status: 'active' | 'draft' | 'warning';
  owner: string;
  syncMode: string;
  replyWindow: string;
  publishApproval: boolean;
  useUnifiedInbox: boolean;
};

export type SlaPolicy = {
  id: number;
  channel: string;
  firstResponse: string;
  resolution: string;
  escalation: string;
  owner: string;
};

export type RoutingRule = {
  id: number;
  name: string;
  trigger: string;
  action: string;
  fallback: string;
  active: boolean;
};

export type ReplyTemplate = {
  id: number;
  title: string;
  category: 'promo' | 'complaint' | 'reservation' | 'marketplace';
  channel: string;
  preview: string;
};

export type TeamSeat = {
  id: number;
  name: string;
  role: string;
  shift: string;
  channels: string[];
  workload: string;
};

export type ApprovalFlow = {
  id: number;
  name: string;
  scope: string;
  steps: string[];
  sla: string;
};

export type NotificationDestination = {
  id: number;
  name: string;
  target: string;
  event: string;
  active: boolean;
};

export type MarketplacePreference = {
  label: string;
  value: string;
  helper: string;
};

export const omniStats: OmniStat[] = [
  { label: 'Pesan Belum Dijawab', value: '42', delta: '-18%', tone: 'blue', helper: 'lintas DM, komentar, buyer chat' },
  { label: 'Konten Siap Publish', value: '17', delta: '+6', tone: 'purple', helper: 'sudah lolos review minggu ini' },
  { label: 'GMV Marketplace', value: 'Rp48,2jt', delta: '+12,4%', tone: 'green', helper: 'akumulasi 7 hari terakhir' },
  { label: 'SLA Terancam', value: '5', delta: '2 urgent', tone: 'orange', helper: 'butuh tindak lanjut < 30 menit' },
];

export const channelConnections: ChannelConnection[] = [
  {
    id: 'ig',
    name: 'Instagram',
    kind: 'social',
    handle: '@ares.coffee',
    status: 'healthy',
    responseTime: '11 mnt',
    unread: 8,
    healthScore: 94,
    followers: '24.8K',
  },
  {
    id: 'tt',
    name: 'TikTok',
    kind: 'social',
    handle: '@aresbrew',
    status: 'warning',
    responseTime: '28 mnt',
    unread: 6,
    healthScore: 78,
    followers: '18.1K',
  },
  {
    id: 'fb',
    name: 'Facebook Page',
    kind: 'social',
    handle: 'Ares Coffee Official',
    status: 'healthy',
    responseTime: '15 mnt',
    unread: 4,
    healthScore: 88,
    followers: '9.4K',
  },
  {
    id: 'sp',
    name: 'Shopee',
    kind: 'marketplace',
    handle: 'Ares Official Store',
    status: 'healthy',
    responseTime: '7 mnt',
    unread: 12,
    healthScore: 92,
    ordersToday: 34,
    syncStatus: 'stok sinkron 2 menit lalu',
  },
  {
    id: 'tk',
    name: 'Tokopedia',
    kind: 'marketplace',
    handle: 'Ares Goods',
    status: 'warning',
    responseTime: '21 mnt',
    unread: 5,
    healthScore: 81,
    ordersToday: 19,
    syncStatus: '3 SKU perlu sinkron harga',
  },
];

export const priorityThreads: PriorityThread[] = [
  {
    id: 1,
    customer: 'ratna.daily',
    channel: 'Instagram',
    kind: 'social',
    inboxType: 'dm',
    subject: 'Tanya promo bundling',
    snippet: 'Kalau beli 3 botol cold brew hari ini masih dapat diskon ongkir kah?',
    time: '2 menit lalu',
    unread: 2,
    priority: 'high',
    assignee: 'Nisa',
    tags: ['lead panas', 'promo'],
    sla: '08:15',
  },
  {
    id: 2,
    customer: 'Pembeli #TK-1902',
    channel: 'Tokopedia',
    kind: 'marketplace',
    inboxType: 'buyer_chat',
    subject: 'Komplain packing',
    snippet: 'Minta kirim ulang gelas promo, barang sampai tapi tutupnya pecah.',
    time: '7 menit lalu',
    unread: 1,
    priority: 'high',
    assignee: 'Damar',
    tags: ['refund risk', 'packing'],
    sla: '07:42',
  },
  {
    id: 3,
    customer: 'dian.fnb',
    channel: 'Facebook',
    kind: 'social',
    inboxType: 'comment',
    subject: 'Pertanyaan cabang',
    snippet: 'Cabang BSD bisa reservasi untuk 20 orang hari Sabtu?',
    time: '15 menit lalu',
    unread: 3,
    priority: 'medium',
    assignee: 'Alya',
    tags: ['reservasi', 'outlet'],
    sla: '16:10',
  },
  {
    id: 4,
    customer: 'Pembeli #SP-8831',
    channel: 'Shopee',
    kind: 'marketplace',
    inboxType: 'review',
    subject: 'Review bintang 2',
    snippet: 'Rasa oke tapi kurir agak lama. Tolong follow up voucher apology.',
    time: '34 menit lalu',
    unread: 1,
    priority: 'medium',
    assignee: 'Nisa',
    tags: ['review negatif', 'voucher'],
    sla: '14:32',
  },
];

export const campaignPipeline: PipelineCard[] = [
  {
    id: 1,
    title: 'Launching Summer Berry Latte',
    channel: 'Instagram + TikTok',
    stage: 'design',
    owner: 'Tim Creative',
    publishAt: 'Senin, 10:00',
    objective: 'Awareness produk baru',
  },
  {
    id: 2,
    title: 'Flash Sale Payday Shopee',
    channel: 'Shopee',
    stage: 'approval',
    owner: 'Marketplace Ops',
    publishAt: 'Rabu, 19:00',
    objective: 'Booster GMV akhir bulan',
  },
  {
    id: 3,
    title: 'KOL recap weekend',
    channel: 'Instagram Reels',
    stage: 'scheduled',
    owner: 'Raka',
    publishAt: 'Jumat, 18:30',
    objective: 'Social proof & engagement',
  },
  {
    id: 4,
    title: 'Voucher recovery review 1-2★',
    channel: 'Tokopedia',
    stage: 'live',
    owner: 'CS Marketplace',
    publishAt: 'Otomatis aktif',
    objective: 'Menekan refund & churn',
  },
];

export const scheduleEvents: ScheduleEvent[] = [
  { id: 1, date: '05 Mei', time: '09:00', title: 'Story teaser menu baru', channel: 'Instagram Story', format: 'Story', owner: 'Nisa', status: 'ready' },
  { id: 2, date: '05 Mei', time: '13:00', title: 'Live voucher checkout', channel: 'Shopee Live', format: 'Live', owner: 'Damar', status: 'review' },
  { id: 3, date: '06 Mei', time: '11:30', title: 'UGC repost pelanggan', channel: 'TikTok', format: 'Video', owner: 'Raka', status: 'scheduled' },
  { id: 4, date: '06 Mei', time: '16:00', title: 'Reply sprint jam sibuk', channel: 'Unified Inbox', format: 'Ops', owner: 'Alya', status: 'scheduled' },
  { id: 5, date: '07 Mei', time: '19:00', title: 'Campaign payday bundle', channel: 'Tokopedia + Shopee', format: 'Campaign', owner: 'Damar', status: 'review' },
];

export const marketplaceOrders: MarketplaceOrder[] = [
  { id: 'SP-2291', channel: 'Shopee', customer: 'Fajar D.', status: 'late', amount: 'Rp438.000', sla: '14 menit lagi', issue: 'label belum dicetak' },
  { id: 'TK-1902', channel: 'Tokopedia', customer: 'Mia L.', status: 'refund_risk', amount: 'Rp212.000', sla: 'follow up sekarang', issue: 'komplain packing' },
  { id: 'SP-2280', channel: 'Shopee', customer: 'Gita P.', status: 'packed', amount: 'Rp164.000', sla: 'aman', issue: 'menunggu pickup' },
  { id: 'TK-1888', channel: 'Tokopedia', customer: 'Andra K.', status: 'new', amount: 'Rp89.000', sla: '52 menit', issue: 'perlu konfirmasi varian' },
];

export const automationRules: AutomationRule[] = [
  { id: 1, name: 'Auto-tag Buyer Chat', description: 'Buyer chat dengan kata “rusak”, “pecah”, atau “refund” otomatis jadi prioritas tinggi.', enabled: true, coverage: 'Marketplace CS' },
  { id: 2, name: 'After-hours Reply', description: 'DM dan komentar setelah jam 22:00 mendapat balasan awal + estimasi follow up.', enabled: true, coverage: 'Social Inbox' },
  { id: 3, name: 'Escalate Viral Comment', description: 'Komentar dengan engagement > 50 dalam 20 menit dinaikkan ke supervisor.', enabled: false, coverage: 'Community Management' },
  { id: 4, name: 'Auto-send Apology Voucher', description: 'Review 1-2 bintang dengan kata “late”, “rusak”, atau “pecah” memicu voucher recovery draft.', enabled: true, coverage: 'Marketplace Retention' },
];

export const weeklyReach = [
  { day: 'Sen', reach: 8200, inbox: 12, orders: 18 },
  { day: 'Sel', reach: 9100, inbox: 14, orders: 24 },
  { day: 'Rab', reach: 13300, inbox: 19, orders: 31 },
  { day: 'Kam', reach: 12100, inbox: 16, orders: 27 },
  { day: 'Jum', reach: 15600, inbox: 22, orders: 36 },
  { day: 'Sab', reach: 21400, inbox: 29, orders: 41 },
  { day: 'Min', reach: 18700, inbox: 24, orders: 35 },
];

export const channelPerformance = [
  { channel: 'Instagram', engagement: 5.8, conversion: 2.1, responseRate: 96, revenue: 6.3 },
  { channel: 'TikTok', engagement: 7.2, conversion: 1.6, responseRate: 88, revenue: 4.1 },
  { channel: 'Shopee', engagement: 0, conversion: 8.3, responseRate: 98, revenue: 24.5 },
  { channel: 'Tokopedia', engagement: 0, conversion: 6.9, responseRate: 91, revenue: 13.3 },
];

export const contentBuckets = [
  {
    title: 'Butuh Brief Final',
    stage: 'brief',
    items: [
      'Promo bundling office hour',
      'FAQ catering corporate',
    ],
  },
  {
    title: 'Sedang Produksi',
    stage: 'design',
    items: [
      'Reels behind the bar',
      'Thumbnail Shopee Live payday',
    ],
  },
  {
    title: 'Menunggu Approval',
    stage: 'approval',
    items: [
      'Copy TikTok voucher',
      'Visual menu seasonal',
    ],
  },
  {
    title: 'Siap Publish',
    stage: 'scheduled',
    items: [
      'UGC repost pelanggan',
      'Story outlet BSD',
      'Promo bundle 3 botol',
    ],
  },
];

export const inboxFilters: InboxFilterChip[] = [
  { id: 'all', label: 'All Queue', count: 42, tone: 'blue' },
  { id: 'assigned', label: 'Assigned', count: 18, tone: 'purple' },
  { id: 'unread', label: 'Unread', count: 14, tone: 'green' },
  { id: 'urgent', label: 'Urgent', count: 5, tone: 'orange' },
  { id: 'marketplace', label: 'Marketplace', count: 19, tone: 'slate' },
];

export const conversationMessages: Record<number, ConversationMessage[]> = {
  1: [
    { id: 1, sender: 'user', text: 'Halo admin, saya lihat promo bundling di story tadi.', time: '10:28' },
    { id: 2, sender: 'me', text: 'Halo kak, betul. Untuk 3 botol cold brew ada diskon 15% hari ini.', time: '10:29' },
    { id: 3, sender: 'user', text: 'Kalau beli 3 botol cold brew hari ini masih dapat diskon ongkir kah?', time: '10:30' },
    { id: 4, sender: 'system', text: 'Intent terdeteksi: promo inquiry + warm lead.', time: '10:31' },
  ],
  2: [
    { id: 1, sender: 'user', text: 'Barang datang, tapi tutup gelas promo pecah.', time: '09:52' },
    { id: 2, sender: 'system', text: 'Order TK-1902 ditandai refund risk dan diarahkan ke Damar.', time: '09:53' },
    { id: 3, sender: 'me', text: 'Mohon maaf ya kak, kami bantu proses solusi tercepat untuk item pengganti.', time: '09:55' },
    { id: 4, sender: 'user', text: 'Kalau bisa kirim ulang, saya butuh untuk hadiah sore ini.', time: '09:57' },
  ],
  3: [
    { id: 1, sender: 'user', text: 'Cabang BSD bisa reservasi untuk 20 orang hari Sabtu?', time: '09:02' },
    { id: 2, sender: 'me', text: 'Bisa kak, saya cek slot dan minimum spend dulu ya.', time: '09:05' },
    { id: 3, sender: 'system', text: 'Thread diberi tag reservation & outlet inquiry.', time: '09:06' },
  ],
  4: [
    { id: 1, sender: 'system', text: 'Review 2★ masuk dari Shopee. Auto-rule recovery draft aktif.', time: '08:41' },
    { id: 2, sender: 'me', text: 'Terima kasih atas masukannya kak. Kami siapkan voucher permintaan maaf.', time: '08:49' },
    { id: 3, sender: 'user', text: 'Oke, saya tunggu ya. Semoga pengiriman selanjutnya lebih cepat.', time: '08:53' },
  ],
};

export const threadDetails: Record<number, ThreadDetail> = {
  1: {
    threadId: 1,
    sentiment: 'positive',
    customerTier: 'Returning',
    preferredChannel: 'Instagram DM',
    lifetimeValue: 'Rp1,8jt',
    summary: 'Lead hangat dari story promo. Potensi closing ke paket langganan cold brew mingguan.',
    recommendedActions: ['Kirim link katalog bundle', 'Tawarkan add-on ongkir', 'Tag sebagai warm lead untuk follow up besok'],
    macros: ['Balasan promo bundling', 'Upsell paket mingguan', 'CTA ke WhatsApp sales'],
    internalNotes: ['Sering engage saat campaign weekend', 'Pernah checkout via link bio bulan lalu'],
    activities: [
      { time: '10:31', title: 'Intent detected', description: 'Promo inquiry masuk ke segment warm lead.' },
      { time: '09:55', title: 'Campaign source', description: 'Masuk dari story “Bundle Office Hour”.' },
      { time: 'Kemarin', title: 'Customer action', description: 'Menyimpan postingan promo kopi literan.' },
    ],
  },
  2: {
    threadId: 2,
    sentiment: 'negative',
    customerTier: 'VIP',
    preferredChannel: 'Tokopedia Chat',
    lifetimeValue: 'Rp4,7jt',
    summary: 'Keluhan packing rusak dari pembeli bernilai tinggi. Butuh recovery cepat agar tidak jadi refund penuh.',
    orderContext: {
      orderId: 'TK-1902',
      amount: 'Rp212.000',
      status: 'Shipment issue',
      lastUpdate: '09:53 • auto-tag refund risk',
    },
    recommendedActions: ['Kirim solusi replacement same day', 'Tawarkan voucher apology Rp25k', 'Escalate ke ops packing jika customer menolak'],
    macros: ['Template minta maaf packing', 'Recovery voucher', 'Escalate ke supervisor marketplace'],
    internalNotes: ['Customer repeat order 6x dalam 2 bulan', 'Jangan arahkan ke cancel sebelum menawarkan replacement'],
    activities: [
      { time: '09:53', title: 'Rule triggered', description: 'Auto-tag “refund risk” dan assign ke Damar.' },
      { time: '09:50', title: 'Order update', description: 'Order delivered, issue reported 2 menit setelah diterima.' },
      { time: 'Kemarin', title: 'Prep status', description: 'Packing delay 18 menit dari SLA internal.' },
    ],
  },
  3: {
    threadId: 3,
    sentiment: 'neutral',
    customerTier: 'New',
    preferredChannel: 'Facebook Comment',
    lifetimeValue: 'Belum ada transaksi',
    summary: 'Inquiry reservasi grup. Potensi pindah ke sales catering atau reservation desk.',
    recommendedActions: ['Pindahkan ke DM', 'Kirim paket reservasi', 'Escalate ke outlet BSD lead'],
    macros: ['Template reservasi group', 'Follow up ke outlet', 'Share PDF menu reservasi'],
    internalNotes: ['Butuh respon cepat sebelum sore untuk konfirmasi slot'],
    activities: [
      { time: '09:06', title: 'Thread tagged', description: 'Reservation + outlet inquiry.' },
      { time: '09:04', title: 'Visibility risk', description: 'Komentar publik berpotensi memicu pertanyaan serupa.' },
    ],
  },
  4: {
    threadId: 4,
    sentiment: 'negative',
    customerTier: 'Returning',
    preferredChannel: 'Shopee Review',
    lifetimeValue: 'Rp1,2jt',
    summary: 'Review 2 bintang. Fokus utama: recovery sentiment dan mencegah churn.',
    orderContext: {
      orderId: 'SP-8831',
      amount: 'Rp164.000',
      status: 'Delivered',
      lastUpdate: '08:41 • review auto-imported',
    },
    recommendedActions: ['Kirim voucher permintaan maaf', 'Minta detail kendala pengiriman', 'Trigger task ke logistic QC'],
    macros: ['Response review 2★', 'Voucher recovery', 'Checklist logistic feedback'],
    internalNotes: ['Customer pernah kasih review bagus 3 minggu lalu'],
    activities: [
      { time: '08:41', title: 'Review imported', description: 'Automation membuat draft response + voucher.' },
      { time: '08:30', title: 'Delivery status', description: 'Order marked complete oleh kurir.' },
    ],
  },
};

export const workspaceHealth: WorkspaceHealthCard[] = [
  { label: 'Connected Channels', value: '5 / 6', helper: '1 channel masih draft sebelum launch' },
  { label: 'Automation Live', value: '12', helper: '4 rule untuk social, 8 rule untuk marketplace' },
  { label: 'Team Coverage', value: '08 seat', helper: 'CS, community, creative, supervisor' },
  { label: 'Approval Flow', value: '3 jalur', helper: 'konten, voucher, price sync exception' },
];

export const channelSettings: ChannelSetting[] = [
  { id: 'ig', name: 'Instagram', brand: 'instagram', status: 'active', owner: 'Nisa', syncMode: 'realtime webhook', replyWindow: '15 menit', publishApproval: true, useUnifiedInbox: true },
  { id: 'fb', name: 'Facebook', brand: 'facebook', status: 'active', owner: 'Alya', syncMode: '15 menit pull', replyWindow: '20 menit', publishApproval: true, useUnifiedInbox: true },
  { id: 'tt', name: 'TikTok', brand: 'tiktok', status: 'warning', owner: 'Raka', syncMode: '30 menit pull', replyWindow: '25 menit', publishApproval: true, useUnifiedInbox: true },
  { id: 'wa', name: 'WhatsApp Sales', brand: 'whatsapp', status: 'active', owner: 'Sales Desk', syncMode: 'custom bridge', replyWindow: '5 menit', publishApproval: false, useUnifiedInbox: true },
  { id: 'sp', name: 'Shopee', brand: 'shopee', status: 'active', owner: 'Damar', syncMode: 'realtime webhook', replyWindow: '10 menit', publishApproval: false, useUnifiedInbox: true },
  { id: 'tk', name: 'Tokopedia', brand: 'tokopedia', status: 'warning', owner: 'Damar', syncMode: '10 menit polling', replyWindow: '12 menit', publishApproval: false, useUnifiedInbox: true },
];

export const slaPolicies: SlaPolicy[] = [
  { id: 1, channel: 'Instagram / Facebook comment', firstResponse: '15 menit', resolution: '4 jam', escalation: 'Supervisor Community', owner: 'Community Team' },
  { id: 2, channel: 'Instagram / TikTok DM', firstResponse: '10 menit', resolution: '2 jam', escalation: 'Growth Lead', owner: 'Social CS' },
  { id: 3, channel: 'Shopee / Tokopedia buyer chat', firstResponse: '8 menit', resolution: '60 menit', escalation: 'Marketplace Lead', owner: 'Marketplace CS' },
  { id: 4, channel: 'Review 1-2★', firstResponse: '5 menit', resolution: '30 menit', escalation: 'Retention Supervisor', owner: 'Retention Squad' },
];

export const routingRules: RoutingRule[] = [
  { id: 1, name: 'Buyer chat refund risk', trigger: 'kata: rusak/pecah/refund', action: 'assign ke Damar + priority high', fallback: 'supervisor marketplace', active: true },
  { id: 2, name: 'Reservasi grup > 15 pax', trigger: 'komentar/DM berisi reservasi besar', action: 'tag outlet inquiry + lempar ke Alya', fallback: 'owner outlet', active: true },
  { id: 3, name: 'Lead dari campaign high value', trigger: 'masuk dari CTA story premium', action: 'tag warm lead + kirim macro sales', fallback: 'sales desk', active: true },
  { id: 4, name: 'Sentimen viral', trigger: 'engagement > 50 dalam 20 menit', action: 'lock thread + escalate supervisor', fallback: 'owner brand', active: false },
];

export const replyTemplates: ReplyTemplate[] = [
  { id: 1, title: 'Promo bundling response', category: 'promo', channel: 'Instagram / TikTok', preview: 'Halo kak, untuk promo bundling hari ini masih aktif sampai jam 18:00...' },
  { id: 2, title: 'Packing complaint recovery', category: 'complaint', channel: 'Shopee / Tokopedia', preview: 'Mohon maaf atas kendalanya kak, kami siap bantu replacement / voucher...' },
  { id: 3, title: 'Reservasi grup 20 pax', category: 'reservation', channel: 'Facebook / WhatsApp', preview: 'Tentu bisa kak, kami bantu cek slot dan minimum spend untuk cabang terkait...' },
  { id: 4, title: 'Review 2★ apology', category: 'marketplace', channel: 'Shopee review', preview: 'Terima kasih atas feedback-nya kak. Kami mohon maaf dan sudah siapkan recovery...' },
];

export const teamSeats: TeamSeat[] = [
  { id: 1, name: 'Nisa', role: 'Community & Lead Handling', shift: '09:00 - 18:00', channels: ['Instagram', 'TikTok'], workload: '11 thread aktif' },
  { id: 2, name: 'Damar', role: 'Marketplace Ops', shift: '08:00 - 17:00', channels: ['Shopee', 'Tokopedia'], workload: '14 thread + 7 order issue' },
  { id: 3, name: 'Alya', role: 'Reservation / Social CS', shift: '10:00 - 19:00', channels: ['Facebook', 'WhatsApp'], workload: '8 thread aktif' },
  { id: 4, name: 'Raka', role: 'Creative & Scheduling', shift: '09:00 - 18:00', channels: ['Instagram', 'TikTok', 'YouTube'], workload: '5 campaign in review' },
];

export const approvalFlows: ApprovalFlow[] = [
  { id: 1, name: 'Campaign Publish Approval', scope: 'Konten high reach / paid support', steps: ['Creator submit', 'Brand Lead review', 'Owner final approve'], sla: 'maks 4 jam' },
  { id: 2, name: 'Voucher Recovery', scope: 'Kompensasi > Rp25.000', steps: ['CS draft', 'Marketplace Lead approve'], sla: 'maks 20 menit' },
  { id: 3, name: 'Price Sync Exception', scope: 'Perubahan harga channel > 10%', steps: ['Ops request', 'Finance check', 'Owner approve'], sla: 'maks 1 hari kerja' },
];

export const notificationDestinations: NotificationDestination[] = [
  { id: 1, name: 'Slack #omnichannel-alert', target: 'Slack', event: 'SLA breach + channel warning', active: true },
  { id: 2, name: 'WhatsApp Supervisor', target: 'WhatsApp', event: 'Refund risk / sentiment high risk', active: true },
  { id: 3, name: 'Email Owner', target: 'Email', event: 'Approval bottleneck > 2 jam', active: false },
];

export const marketplacePreferences: MarketplacePreference[] = [
  { label: 'Sync harga', value: 'Manual approve for exceptions', helper: 'perubahan >10% wajib approval' },
  { label: 'Stok buffer', value: '5 unit / SKU hero', helper: 'untuk mencegah oversell saat campaign' },
  { label: 'Refund playbook', value: 'Voucher > replacement > partial refund', helper: 'urutan rekomendasi untuk CS' },
  { label: 'Import cadence', value: 'Realtime + fallback polling 10 menit', helper: 'khusus Tokopedia masih hybrid' },
];

export type DashboardAlert = {
  id: number;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  owner: string;
};

export type AttentionItem = {
  id: number;
  title: string;
  type: string;
  due: string;
  owner: string;
  status: string;
};

export type TeamActivity = {
  id: number;
  actor: string;
  action: string;
  target: string;
  time: string;
};

export type QuickAction = {
  id: number;
  label: string;
  detail: string;
};

export type PlannerCard = {
  id: number;
  title: string;
  stage: 'idea' | 'draft' | 'design' | 'review' | 'scheduled' | 'published';
  goal: 'awareness' | 'conversion' | 'retention';
  owner: string;
  reviewer: string;
  deadline: string;
  channels: string[];
  updatedBy: string;
};

export type CampaignBrief = {
  id: number;
  title: string;
  objective: string;
  audience: string;
  owner: string;
  reviewer: string;
  deadline: string;
  approvalState: string;
  channels: string[];
  assets: string[];
  checklist: Array<{ label: string; done: boolean }>;
  comments: Array<{ author: string; text: string; time: string }>;
  updatedBy: string;
};

export type BuyerQueueItem = {
  id: number;
  marketplace: string;
  customer: string;
  topic: string;
  sla: string;
  assignee: string;
  risk: 'low' | 'medium' | 'high';
};

export type CatalogIssue = {
  id: number;
  sku: string;
  title: string;
  issue: string;
  severity: 'warning' | 'critical' | 'info';
  owner: string;
};

export type PromoCenterItem = {
  id: number;
  title: string;
  marketplace: string;
  status: string;
  budget: string;
  goal: string;
};

export type MarketIssue = {
  id: number;
  title: string;
  channel: string;
  reason: string;
  impact: string;
};

export type BestPostingWindow = {
  id: number;
  channel: string;
  time: string;
  confidence: string;
  note: string;
};

export const dashboardAlerts: DashboardAlert[] = [
  { id: 1, severity: 'critical', title: 'Tokopedia refund risk naik', description: '3 thread high-risk dalam 45 menit terakhir. 1 menunggu approval voucher.', owner: 'Damar' },
  { id: 2, severity: 'warning', title: 'TikTok response melambat', description: 'Median first response naik jadi 28 menit setelah jam makan siang.', owner: 'Nisa' },
  { id: 3, severity: 'info', title: 'Campaign launch siap publish', description: 'Summer Berry Latte sudah lolos review visual dan tinggal final approval.', owner: 'Raka' },
];

export const attentionItems: AttentionItem[] = [
  { id: 1, title: 'Approve voucher recovery untuk TK-1902', type: 'Marketplace exception', due: '10 menit lagi', owner: 'Supervisor', status: 'waiting approval' },
  { id: 2, title: 'Balas lead premium dari Instagram story', type: 'Hot lead', due: 'sekarang', owner: 'Nisa', status: 'unhandled' },
  { id: 3, title: 'Final review campaign payday', type: 'Content approval', due: 'hari ini 16:00', owner: 'Raka', status: 'in review' },
  { id: 4, title: 'Sinkron harga 3 SKU Tokopedia', type: 'Catalog issue', due: 'hari ini 18:00', owner: 'Damar', status: 'draft fix' },
];

export const teamActivityFeed: TeamActivity[] = [
  { id: 1, actor: 'Nisa', action: 'assign thread', target: 'Lead Instagram → Sales Desk', time: '2 menit lalu' },
  { id: 2, actor: 'Damar', action: 'escalate issue', target: 'Packing complaint TK-1902', time: '7 menit lalu' },
  { id: 3, actor: 'Raka', action: 'submit review', target: 'Campaign Summer Berry Latte', time: '19 menit lalu' },
  { id: 4, actor: 'Alya', action: 'internal note', target: 'Reservasi cabang BSD 20 pax', time: '26 menit lalu' },
];

export const quickActions: QuickAction[] = [
  { id: 1, label: 'Mass assign urgent queue', detail: 'bagi thread high-risk berdasarkan channel owner' },
  { id: 2, label: 'Open campaign review board', detail: 'lihat semua konten yang menunggu approval' },
  { id: 3, label: 'Run marketplace exception scan', detail: 'cek refund risk, SLA breach, dan price mismatch' },
  { id: 4, label: 'Broadcast macro update', detail: 'update template reply untuk promo baru' },
];

export const plannerCards: PlannerCard[] = [
  { id: 101, title: 'Campaign Mother’s Day bundle', stage: 'idea', goal: 'conversion', owner: 'Raka', reviewer: 'Brand Lead', deadline: '06 Mei', channels: ['Instagram', 'Shopee'], updatedBy: 'Raka • 12 menit lalu' },
  { id: 102, title: 'FAQ reservation carousel', stage: 'draft', goal: 'retention', owner: 'Alya', reviewer: 'Nisa', deadline: '05 Mei', channels: ['Instagram', 'Facebook'], updatedBy: 'Alya • 8 menit lalu' },
  { id: 103, title: 'Summer Berry Latte hero visual', stage: 'design', goal: 'awareness', owner: 'Creative Team', reviewer: 'Raka', deadline: 'Hari ini', channels: ['Instagram', 'TikTok'], updatedBy: 'Dito • 3 menit lalu' },
  { id: 104, title: 'Payday Shopee push banner', stage: 'review', goal: 'conversion', owner: 'Marketplace Ops', reviewer: 'Owner', deadline: 'Hari ini 16:00', channels: ['Shopee'], updatedBy: 'Damar • 15 menit lalu' },
  { id: 105, title: 'UGC repost pelanggan loyal', stage: 'scheduled', goal: 'retention', owner: 'Nisa', reviewer: 'Brand Lead', deadline: '07 Mei', channels: ['TikTok', 'Instagram'], updatedBy: 'Nisa • kemarin' },
  { id: 106, title: 'Weekend KOL recap', stage: 'published', goal: 'awareness', owner: 'Raka', reviewer: 'Brand Lead', deadline: 'Done', channels: ['Instagram'], updatedBy: 'Raka • 1 hari lalu' },
];

export const campaignBriefs: Record<number, CampaignBrief> = {
  101: {
    id: 101,
    title: 'Campaign Mother’s Day bundle',
    objective: 'Dorong conversion untuk gift bundle + cross-sell cold brew liter.',
    audience: 'Female 24-38, repeat buyer + gift buyer.',
    owner: 'Raka',
    reviewer: 'Brand Lead',
    deadline: '06 Mei • 15:00',
    approvalState: 'Menunggu brief final',
    channels: ['Instagram Feed', 'Instagram Story', 'Shopee Banner'],
    assets: ['KV hero 1:1', 'Story vertical', 'Voucher badge', 'Caption CTA'],
    checklist: [
      { label: 'Goal campaign sudah jelas', done: true },
      { label: 'Offer sinkron dengan marketplace', done: false },
      { label: 'Visual hero sudah ada 2 opsi', done: false },
      { label: 'Approval owner dijadwalkan', done: true },
    ],
    comments: [
      { author: 'Brand Lead', text: 'Pastikan copy tidak terlalu generik, tonjolkan gifting angle.', time: '11 menit lalu' },
      { author: 'Damar', text: 'Voucher Shopee bisa dipakai kalau margin bundle tidak lewat threshold.', time: '27 menit lalu' },
    ],
    updatedBy: 'Raka • 12 menit lalu',
  },
  102: {
    id: 102,
    title: 'FAQ reservation carousel',
    objective: 'Kurangi pertanyaan repetitif di DM/comment dan arahkan ke WA reservation.',
    audience: 'Prospek reservasi grup dan corporate small event.',
    owner: 'Alya',
    reviewer: 'Nisa',
    deadline: '05 Mei • 18:00',
    approvalState: 'Draft copy aktif',
    channels: ['Instagram Carousel', 'Facebook Post'],
    assets: ['6 slide FAQ', 'WA CTA', 'Reservation highlights'],
    checklist: [
      { label: 'FAQ per outlet sudah dicek', done: true },
      { label: 'Template WA follow up siap', done: true },
      { label: 'Review legal promo reservasi', done: false },
    ],
    comments: [
      { author: 'Nisa', text: 'Bagian minimum spend perlu disederhanakan.', time: '8 menit lalu' },
    ],
    updatedBy: 'Alya • 8 menit lalu',
  },
  103: {
    id: 103,
    title: 'Summer Berry Latte hero visual',
    objective: 'Bikin hero visual untuk launch awareness minggu depan.',
    audience: 'Young professionals + trend seekers.',
    owner: 'Creative Team',
    reviewer: 'Raka',
    deadline: 'Hari ini • 14:00',
    approvalState: 'Design revision 2',
    channels: ['Instagram', 'TikTok', 'In-store screen'],
    assets: ['Hero render', 'Price tag', 'Motion teaser'],
    checklist: [
      { label: '3D render sudah final', done: true },
      { label: 'Price overlay approved finance', done: false },
      { label: 'Vertical crop aman untuk TikTok', done: true },
    ],
    comments: [
      { author: 'Owner', text: 'Warnanya enak, tapi tambahkan cue seasonal yang lebih terasa.', time: '3 menit lalu' },
    ],
    updatedBy: 'Dito • 3 menit lalu',
  },
  104: {
    id: 104,
    title: 'Payday Shopee push banner',
    objective: 'Dorong GMV 2x saat payday campaign.',
    audience: 'Marketplace repeat buyer & voucher hunter.',
    owner: 'Marketplace Ops',
    reviewer: 'Owner',
    deadline: 'Hari ini • 16:00',
    approvalState: 'Menunggu final approve',
    channels: ['Shopee Home Banner', 'Shopee Live Cover'],
    assets: ['Banner 16:9', 'Voucher tag', 'CTA copy'],
    checklist: [
      { label: 'Price sync aman', done: false },
      { label: 'Stok buffer valid', done: false },
      { label: 'Budget promo approved', done: true },
    ],
    comments: [
      { author: 'Damar', text: 'Masih ada 3 SKU mismatch, jangan publish sebelum sinkron.', time: '15 menit lalu' },
    ],
    updatedBy: 'Damar • 15 menit lalu',
  },
};

export const buyerQueue: BuyerQueueItem[] = [
  { id: 1, marketplace: 'Tokopedia', customer: 'Mia L.', topic: 'Packing rusak / replacement', sla: '7 menit', assignee: 'Damar', risk: 'high' },
  { id: 2, marketplace: 'Shopee', customer: 'Gita P.', topic: 'Tracking terlambat', sla: '14 menit', assignee: 'Nisa', risk: 'medium' },
  { id: 3, marketplace: 'Shopee', customer: 'Arif K.', topic: 'Tanya stok bundle hadiah', sla: '21 menit', assignee: 'Sales Desk', risk: 'low' },
  { id: 4, marketplace: 'Tokopedia', customer: 'Tari S.', topic: 'Request invoice corporate', sla: '11 menit', assignee: 'Alya', risk: 'medium' },
];

export const catalogIssues: CatalogIssue[] = [
  { id: 1, sku: 'CB-001', title: 'Cold Brew Liter', issue: 'Harga Tokopedia belum ikut promo bundle', severity: 'critical', owner: 'Damar' },
  { id: 2, sku: 'GFT-201', title: 'Gift Box Mother’s Day', issue: 'Foto utama belum ada versi marketplace', severity: 'warning', owner: 'Creative Team' },
  { id: 3, sku: 'MUG-009', title: 'Mug seasonal', issue: 'Buffer stok tinggal 3 unit', severity: 'warning', owner: 'Ops Warehouse' },
  { id: 4, sku: 'LAT-777', title: 'Summer Berry Latte', issue: 'Belum publish ke semua channel', severity: 'info', owner: 'Raka' },
];

export const promoCenter: PromoCenterItem[] = [
  { id: 1, title: 'Shopee Payday 5.5', marketplace: 'Shopee', status: 'ready to launch', budget: 'Rp2,5jt', goal: 'GMV + new buyer' },
  { id: 2, title: 'Tokopedia voucher recovery', marketplace: 'Tokopedia', status: 'always on', budget: 'Rp750rb', goal: 'retention' },
  { id: 3, title: 'Live shopping cold brew', marketplace: 'Shopee', status: 'draft setup', budget: 'Rp1,2jt', goal: 'traffic + conversion' },
];

export const marketIssues: MarketIssue[] = [
  { id: 1, title: 'Late shipment cluster', channel: 'Shopee', reason: 'pickup overload jam 14:00', impact: '7 order berpotensi breach' },
  { id: 2, title: 'Cancellation risk', channel: 'Tokopedia', reason: 'stok gift box hampir habis', impact: '2 order premium terancam cancel' },
  { id: 3, title: 'Price mismatch', channel: 'Tokopedia', reason: 'promo bundle belum sinkron', impact: 'conversion drop + komplain buyer' },
];

export const bestPostingWindows: BestPostingWindow[] = [
  { id: 1, channel: 'Instagram Reels', time: '11:30 - 12:30', confidence: 'High', note: 'reach + save rate tertinggi 30 hari terakhir' },
  { id: 2, channel: 'TikTok', time: '19:00 - 21:00', confidence: 'High', note: 'completion rate naik saat jam pulang kerja' },
  { id: 3, channel: 'Facebook', time: '08:00 - 09:00', confidence: 'Medium', note: 'baik untuk inquiry reservasi & office crowd' },
  { id: 4, channel: 'Shopee campaign push', time: '12:00 & 20:00', confidence: 'High', note: 'checkout spike di dua slot ini' },
];

export const replySpeedTrend = [
  { day: 'Sen', social: 14, marketplace: 9 },
  { day: 'Sel', social: 13, marketplace: 8 },
  { day: 'Rab', social: 11, marketplace: 8 },
  { day: 'Kam', social: 16, marketplace: 10 },
  { day: 'Jum', social: 18, marketplace: 11 },
  { day: 'Sab', social: 21, marketplace: 13 },
  { day: 'Min', social: 17, marketplace: 10 },
];

export const sentimentTrend = [
  { week: 'W1', positive: 62, neutral: 28, negative: 10 },
  { week: 'W2', positive: 58, neutral: 29, negative: 13 },
  { week: 'W3', positive: 65, neutral: 24, negative: 11 },
  { week: 'W4', positive: 68, neutral: 23, negative: 9 },
];

export const contentTypePerformance = [
  { type: 'Reels', engagement: 7.8, conversion: 2.4, saves: 410 },
  { type: 'Carousel', engagement: 5.6, conversion: 1.7, saves: 290 },
  { type: 'Story CTA', engagement: 4.2, conversion: 3.1, saves: 0 },
  { type: 'Live commerce', engagement: 8.4, conversion: 4.9, saves: 0 },
];

export const slaCompliance = [
  { channel: 'Instagram', compliance: 96 },
  { channel: 'TikTok', compliance: 84 },
  { channel: 'Shopee', compliance: 98 },
  { channel: 'Tokopedia', compliance: 91 },
  { channel: 'Facebook', compliance: 94 },
];

export type MetaAdsKpi = {
  label: string;
  value: string;
  delta: string;
  helper: string;
};

export type MetaAdsCampaign = {
  id: number;
  campaign: string;
  objective: string;
  status: 'active' | 'learning' | 'review' | 'scaling';
  spend: string;
  roas: string;
  cpl: string;
  owner: string;
  approval: string;
};

export type MetaAdsCreative = {
  id: number;
  name: string;
  format: string;
  placements: string[];
  ctr: string;
  hookRate: string;
  winner: boolean;
};

export type MetaAudienceCluster = {
  id: number;
  name: string;
  source: string;
  size: string;
  cpa: string;
  quality: 'high' | 'medium' | 'watch';
};

export type MetaAdsAlert = {
  id: number;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
};

export type MetaBudgetPacing = {
  id: number;
  campaign: string;
  spendRate: string;
  cap: string;
  status: 'under pacing' | 'on track' | 'over pacing';
};

export const metaAdsKpis: MetaAdsKpi[] = [
  { label: 'Spend 7 Hari', value: 'Rp14,8jt', delta: '+12%', helper: 'gabungan campaign prospecting + retargeting' },
  { label: 'ROAS', value: '4.7x', delta: '+0.6', helper: 'di atas target blended 4.0x' },
  { label: 'Qualified Leads', value: '328', delta: '+18%', helper: 'lead masuk ke WA & DM dari Meta Ads' },
  { label: 'Cost per Lead', value: 'Rp45.200', delta: '-9%', helper: 'lebih efisien dari minggu lalu' },
];

export const metaAdsTrend = [
  { day: 'Sen', spend: 1800000, revenue: 7100000, leads: 38 },
  { day: 'Sel', spend: 1950000, revenue: 7560000, leads: 42 },
  { day: 'Rab', spend: 2100000, revenue: 9030000, leads: 47 },
  { day: 'Kam', spend: 2050000, revenue: 8610000, leads: 44 },
  { day: 'Jum', spend: 2280000, revenue: 10100000, leads: 54 },
  { day: 'Sab', spend: 2470000, revenue: 11300000, leads: 58 },
  { day: 'Min', spend: 2150000, revenue: 9640000, leads: 45 },
];

export const metaAdsCampaigns: MetaAdsCampaign[] = [
  { id: 1, campaign: 'Cold Brew Lookalike 2%', objective: 'Conversions', status: 'active', spend: 'Rp4,2jt', roas: '5.2x', cpl: 'Rp39k', owner: 'Nisa', approval: 'approved' },
  { id: 2, campaign: 'Mother’s Day Gift Bundle', objective: 'Sales', status: 'learning', spend: 'Rp3,4jt', roas: '3.9x', cpl: 'Rp48k', owner: 'Raka', approval: 'live learning' },
  { id: 3, campaign: 'Retargeting Engagers 30D', objective: 'Leads', status: 'scaling', spend: 'Rp2,8jt', roas: '6.1x', cpl: 'Rp28k', owner: 'Alya', approval: 'ready to scale' },
  { id: 4, campaign: 'Outlet BSD Reservation Leads', objective: 'Messages', status: 'review', spend: 'Rp1,6jt', roas: '2.7x', cpl: 'Rp61k', owner: 'Damar', approval: 'creative refresh needed' },
];

export const metaAdsCreatives: MetaAdsCreative[] = [
  { id: 1, name: 'UGC Cold Brew Hook', format: 'Reels 9:16', placements: ['Instagram Reels', 'Facebook Reels'], ctr: '2.9%', hookRate: '34%', winner: true },
  { id: 2, name: 'Gift Bundle Carousel', format: 'Carousel 4:5', placements: ['Instagram Feed', 'Facebook Feed'], ctr: '1.8%', hookRate: '22%', winner: false },
  { id: 3, name: 'Reservation Testimonial', format: 'Story CTA', placements: ['Instagram Story'], ctr: '2.4%', hookRate: '27%', winner: true },
];

export const metaAudienceClusters: MetaAudienceCluster[] = [
  { id: 1, name: 'Lookalike buyers 2%', source: 'High-value customer seed', size: '1.8 jt', cpa: 'Rp39k', quality: 'high' },
  { id: 2, name: 'Warm engagers 30D', source: 'IG + FB engagers', size: '86 rb', cpa: 'Rp28k', quality: 'high' },
  { id: 3, name: 'Broad coffee interest', source: 'Interest stack', size: '4.2 jt', cpa: 'Rp55k', quality: 'medium' },
  { id: 4, name: 'Outlet reservation test', source: 'Geo + event intent', size: '420 rb', cpa: 'Rp61k', quality: 'watch' },
];

export const metaAdsAlerts: MetaAdsAlert[] = [
  { id: 1, severity: 'critical', title: 'BSD reservation CPA naik', description: 'Creative testimonial fatigue. CPA sudah 18% di atas target.' },
  { id: 2, severity: 'warning', title: 'Gift bundle masih learning limited', description: 'Audience overlap dengan retargeting terlalu tinggi.' },
  { id: 3, severity: 'info', title: 'Cold brew UGC layak diduplikasi', description: 'CTR dan ROAS paling tinggi 3 hari berturut-turut.' },
];

export const metaBudgetPacing: MetaBudgetPacing[] = [
  { id: 1, campaign: 'Cold Brew Lookalike 2%', spendRate: '92%', cap: 'Rp600k / hari', status: 'on track' },
  { id: 2, campaign: 'Mother’s Day Gift Bundle', spendRate: '74%', cap: 'Rp480k / hari', status: 'under pacing' },
  { id: 3, campaign: 'Retargeting Engagers 30D', spendRate: '108%', cap: 'Rp350k / hari', status: 'over pacing' },
];

export const metaAdsFunnel = [
  { stage: 'Impressions', value: 428000 },
  { stage: 'Clicks', value: 12640 },
  { stage: 'Landing Views', value: 8730 },
  { stage: 'Leads', value: 328 },
  { stage: 'Purchases', value: 112 },
];

export type MetaLeadDestination = {
  id: number;
  destination: string;
  leads: number;
  qualified: number;
  response: string;
  note: string;
};

export type MetaPlacementPulse = {
  id: number;
  placement: string;
  ctr: string;
  cpc: string;
  roas: string;
  note: string;
};

export type MetaAdsApprovalItem = {
  id: number;
  title: string;
  asset: string;
  owner: string;
  reviewer: string;
  due: string;
  status: 'ready' | 'review' | 'blocked';
  note: string;
};

export type MetaAdsAccountHealth = {
  id: number;
  label: string;
  value: string;
  helper: string;
  status: 'healthy' | 'watch' | 'warning';
};

export type MetaAdsAutomationBridge = {
  id: number;
  title: string;
  description: string;
  status: 'live' | 'watch' | 'draft';
};

export const metaLeadDestinations: MetaLeadDestination[] = [
  { id: 1, destination: 'WhatsApp CS', leads: 124, qualified: 72, response: '6 mnt', note: 'Click-to-chat paling cepat dikonversi ke closing manual.' },
  { id: 2, destination: 'Instagram DM', leads: 98, qualified: 41, response: '11 mnt', note: 'Banyak pertanyaan promo dan bundling sebelum checkout.' },
  { id: 3, destination: 'Landing Page', leads: 74, qualified: 55, response: 'n/a', note: 'Dipakai untuk form campaign bundle dan lead capture.' },
  { id: 4, destination: 'Outlet Reservation', leads: 32, qualified: 19, response: '14 mnt', note: 'Lead geo-target untuk event dan reservasi cabang BSD.' },
];

export const metaPlacementPulse: MetaPlacementPulse[] = [
  { id: 1, placement: 'Instagram Reels', ctr: '2.9%', cpc: 'Rp1.8k', roas: '5.4x', note: 'UGC hook masih jadi pembunuh utama untuk prospecting.' },
  { id: 2, placement: 'Instagram Story', ctr: '2.4%', cpc: 'Rp1.4k', roas: '4.6x', note: 'Paling cocok untuk CTA reservasi dan chat intent tinggi.' },
  { id: 3, placement: 'Facebook Feed', ctr: '1.8%', cpc: 'Rp2.1k', roas: '3.7x', note: 'Masih cukup kuat untuk audience umur 30+ dan corporate.' },
  { id: 4, placement: 'Facebook Reels', ctr: '2.1%', cpc: 'Rp1.9k', roas: '4.2x', note: 'Cocok untuk daur ulang creative winner tanpa biaya tinggi.' },
];

export const metaAdsApprovalQueue: MetaAdsApprovalItem[] = [
  { id: 1, title: 'Mother’s Day carousel refresh', asset: 'Creative set B', owner: 'Raka', reviewer: 'Brand Lead', due: '13:30', status: 'review', note: 'Angle gifting perlu diperkuat sebelum scale budget.' },
  { id: 2, title: 'BSD reservation testimonial cutdown', asset: 'Story CTA 15s', owner: 'Dito', reviewer: 'Damar', due: '14:10', status: 'blocked', note: 'Menunggu testimonial legal clearance dari outlet.' },
  { id: 3, title: 'Cold brew UGC duplication pack', asset: 'Reels + FB variant', owner: 'Nisa', reviewer: 'Owner', due: '16:00', status: 'ready', note: 'Sudah lolos QA dan siap dipakai untuk scale retargeting.' },
];

export const metaAdsAccountHealth: MetaAdsAccountHealth[] = [
  { id: 1, label: 'Pixel events', value: 'Healthy', helper: 'Purchase + lead event firing 99.2% 24 jam terakhir.', status: 'healthy' },
  { id: 2, label: 'CAPI sync', value: 'Watch', helper: 'Ada 2 batch delay pagi tadi, tapi queue sudah normal kembali.', status: 'watch' },
  { id: 3, label: 'Lead routing', value: 'Live', helper: 'WA CS dan Instagram DM otomatis di-tag ke unified inbox.', status: 'healthy' },
  { id: 4, label: 'Spend guardrails', value: '2 active rules', helper: 'Auto-warning saat CPL naik >20% dari baseline.', status: 'healthy' },
];

export const metaAdsAutomationBridge: MetaAdsAutomationBridge[] = [
  { id: 1, title: 'Lead form → Unified Inbox', description: 'Lead dari Meta form masuk ke queue sales dengan auto-tag per campaign.', status: 'live' },
  { id: 2, title: 'Comment ad → Community queue', description: 'Komentar iklan yang mengandung intent beli diarahkan ke social CS.', status: 'live' },
  { id: 3, title: 'Low ROAS → Budget review', description: 'Campaign di bawah guardrail otomatis masuk approval board.', status: 'watch' },
  { id: 4, title: 'Creative winner → Duplicate brief', description: 'Creative terbaik bisa langsung dibuatkan brief adaptasi channel lain.', status: 'draft' },
];
