import { useMemo } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { BrandLogo, resolveBrandKey } from '../../components/medsos/BrandLogo';
import {
  buyerQueue,
  catalogIssues,
  channelConnections,
  marketIssues,
  marketplaceOrders,
  marketplacePreferences,
  promoCenter,
} from '../../data/omnichannelMock';
import {
  ArrowUpRight,
  Boxes,
  CircleAlert,
  ClipboardList,
  MessageCircleMore,
  PackageCheck,
  RefreshCcw,
  ShieldAlert,
  Store,
  WalletCards,
} from 'lucide-react';

export default function MarketplaceControl() {
  const { isDark } = useThemeStore();
  const marketplaces = channelConnections.filter((item) => item.kind === 'marketplace');

  const summary = useMemo(() => ({
    stores: marketplaces.length,
    riskOrders: marketplaceOrders.filter((order) => order.status === 'late' || order.status === 'refund_risk').length,
    priceMismatch: catalogIssues.filter((issue) => issue.issue.toLowerCase().includes('harga') || issue.issue.toLowerCase().includes('promo')).length,
    buyerChats: buyerQueue.length,
  }), [marketplaces]);

  const riskTone = {
    high: 'bg-red-100 text-red-600',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-emerald-100 text-emerald-600',
  } as const;

  return (
    <div className="space-y-6">
      <div className={`rounded-3xl border p-6 md:p-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className={`text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Marketplace Command Center</h1>
            <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Order queue, buyer chat, catalog health, issue center, promo center, dan sync status sudah dibentuk supaya modul ini terasa seperti command center operasional.
            </p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700">
            <RefreshCcw size={16} />
            Sync Preview
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
          <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Active stores</p>
          <p className="mt-2 text-3xl font-bold">{summary.stores}</p>
          <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Shopee & Tokopedia siap dipantau</p>
        </div>
        <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
          <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Risk orders</p>
          <p className="mt-2 text-3xl font-bold">{summary.riskOrders}</p>
          <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>late shipment + refund risk</p>
        </div>
        <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
          <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Price mismatch</p>
          <p className="mt-2 text-3xl font-bold">{summary.priceMismatch}</p>
          <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>SKU perlu sinkron promo / harga</p>
        </div>
        <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
          <p className={`text-xs uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Buyer chats</p>
          <p className="mt-2 text-3xl font-bold">{summary.buyerChats}</p>
          <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>queue buyer yang harus dibalas</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {marketplaces.map((channel) => (
          <div key={channel.id} className={`rounded-2xl border p-5 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <BrandLogo brand={resolveBrandKey(channel.name)} size={48} className="rounded-2xl px-1" withRing />
                <div>
                  <h3 className="font-semibold">{channel.name}</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{channel.handle}</p>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-1 rounded-full ${channel.status === 'healthy' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-700'}`}>
                {channel.status}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-5 text-sm">
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Order hari ini</p>
                <p className="font-bold">{channel.ordersToday}</p>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Unread</p>
                <p className="font-bold">{channel.unread}</p>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Resp.</p>
                <p className="font-bold">{channel.responseTime}</p>
              </div>
            </div>
            <div className={`mt-4 rounded-xl p-3 ${isDark ? 'bg-slate-900/40' : 'bg-gray-50'}`}>
              <p className="text-sm font-semibold">Sync status</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{channel.syncStatus}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-[1.15fr_0.85fr] gap-6">
        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Order Queue</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Late shipment, refund risk, dan order baru yang butuh handling cepat.</p>
            </div>
            <ClipboardList size={18} className="text-orange-500" />
          </div>
          <div className="space-y-3">
            {marketplaceOrders.map((order) => (
              <div key={order.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <BrandLogo brand={resolveBrandKey(order.channel)} size={24} className="rounded-lg px-1" withRing />
                      <p className="font-semibold">{order.id}</p>
                      <span className={`text-[10px] px-2 py-1 rounded-full ${order.status === 'late' || order.status === 'refund_risk' ? 'bg-red-100 text-red-600' : order.status === 'new' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {order.status}
                      </span>
                    </div>
                    <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{order.customer} • {order.channel}</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{order.issue}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm md:text-right">
                    <div>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Nilai</p>
                      <p className="font-semibold">{order.amount}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>SLA</p>
                      <p className="font-semibold">{order.sla}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Buyer Chat Queue</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Antrian buyer chat yang akan hidup berdampingan dengan unified inbox.</p>
            </div>
            <MessageCircleMore size={18} className="text-blue-500" />
          </div>
          <div className="space-y-3">
            {buyerQueue.map((chat) => (
              <div key={chat.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <BrandLogo brand={resolveBrandKey(chat.marketplace)} size={20} className="rounded-md px-1" withRing />
                      <p className="font-semibold text-sm">{chat.customer}</p>
                    </div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{chat.marketplace} • {chat.topic}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full ${riskTone[chat.risk]}`}>{chat.risk}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>assignee {chat.assignee}</span>
                  <span className="font-semibold text-blue-500">SLA {chat.sla}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.05fr_0.95fr] gap-6">
        <div className="space-y-6">
          <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Catalog Health</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Price mismatch, stok buffer, dan gap asset yang bikin conversion bocor.</p>
              </div>
              <Boxes size={18} className="text-emerald-500" />
            </div>
            <div className="space-y-3">
              {catalogIssues.map((issue) => (
                <div key={issue.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{issue.title}</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{issue.sku} • owner {issue.owner}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full ${issue.severity === 'critical' ? 'bg-red-100 text-red-600' : issue.severity === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-600'}`}>
                      {issue.severity}
                    </span>
                  </div>
                  <p className={`text-sm mt-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{issue.issue}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Promo Center</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Panel promo aktif, budget, dan tujuan kampanye marketplace.</p>
              </div>
              <WalletCards size={18} className="text-purple-500" />
            </div>
            <div className="space-y-3">
              {promoCenter.map((promo) => (
                <div key={promo.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm">{promo.title}</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{promo.marketplace} • goal {promo.goal}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full ${promo.status.includes('ready') ? 'bg-emerald-100 text-emerald-600' : promo.status.includes('draft') ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-600'}`}>
                      {promo.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>budget</span>
                    <span className="font-semibold">{promo.budget}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Issue Center</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Late shipment, cancellation risk, dan refund risk yang perlu dimonitor.</p>
              </div>
              <ShieldAlert size={18} className="text-red-500" />
            </div>
            <div className="space-y-3">
              {marketIssues.map((issue) => (
                <div key={issue.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-semibold text-sm">{issue.title}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{issue.channel}</p>
                    </div>
                    <CircleAlert size={16} className="text-red-500" />
                  </div>
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{issue.reason}</p>
                  <p className={`text-xs mt-2 ${isDark ? 'text-red-300' : 'text-red-600'}`}>{issue.impact}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Marketplace Policies</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Setting ringkas untuk sync, refund playbook, dan stock buffer.</p>
              </div>
              <Store size={18} className="text-blue-500" />
            </div>
            <div className="space-y-3">
              {marketplacePreferences.map((pref) => (
                <div key={pref.label} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                  <p className="font-semibold text-sm">{pref.label}</p>
                  <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{pref.value}</p>
                  <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{pref.helper}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center gap-2 mb-4">
              <PackageCheck size={18} className="text-blue-500" />
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Quick Actions</h3>
            </div>
            <div className="space-y-3">
              {[
                'Push stok ke semua channel',
                'Mass update banner payday',
                'Review chat refund risk',
                'Audit SKU tanpa foto utama',
              ].map((item) => (
                <button
                  key={item}
                  className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium ${isDark ? 'border-slate-700 bg-slate-900/40 hover:bg-slate-900/80' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'}`}
                >
                  {item}
                  <ArrowUpRight size={16} className="text-blue-500" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
