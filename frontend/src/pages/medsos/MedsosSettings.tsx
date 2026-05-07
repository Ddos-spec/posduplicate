import { useThemeStore } from '../../store/themeStore';
import { approvalFlows, replyTemplates, routingRules, slaPolicies, teamSeats } from '../../data/omnichannelMock';
import { BellRing, MessageSquareText, PlugZap, Shield, Store, UsersRound, Workflow } from 'lucide-react';

const stackCards = [
  {
    title: 'WA Inbox',
    description: 'WhatsApp tetap lewat Customer Service CRM internal. Di Connections user cukup isi URL instance dan API key tenant.',
    icon: MessageSquareText,
  },
  {
    title: 'Social + Ads',
    description: 'Semua channel social dan ads dipusatkan ke Zernio supaya user tinggal klik Connect tanpa setup API manual.',
    icon: PlugZap,
  },
  {
    title: 'Marketplace',
    description: 'Belum diaktifkan. Akan dibuka setelah struktur partnership dan flow operasionalnya benar-benar siap.',
    icon: Store,
  },
];

export default function MedsosSettings() {
  const { isDark } = useThemeStore();

  return (
    <div className="space-y-6">
      <div className={`rounded-3xl border p-6 md:p-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="max-w-3xl">
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Settings & operating rules</h1>
          <p className={`text-sm mt-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Halaman ini menjelaskan rule bisnis yang sedang dipakai sekarang: WA lewat produk internal, social + ads lewat Zernio, dan marketplace masih ditahan dulu.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {stackCards.map((card) => (
          <div key={card.title} className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white shadow-sm'}`}>
            <div className={`inline-flex rounded-2xl p-3 ${isDark ? 'bg-slate-900 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
              <card.icon size={18} />
            </div>
            <h2 className="mt-4 font-bold text-lg">{card.title}</h2>
            <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.description}</p>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-[1.05fr_0.95fr] gap-6">
        <section className={`rounded-3xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-5">
            <Shield size={18} className="text-emerald-500" />
            <div>
              <h2 className="font-bold text-lg">SLA policies</h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Aturan respon pertama, resolusi, dan eskalasi yang dibaca tim operasional.</p>
            </div>
          </div>
          <div className="space-y-3">
            {slaPolicies.map((policy) => (
              <div key={policy.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm">{policy.channel}</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>owner {policy.owner}</p>
                  </div>
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold text-blue-700">{policy.firstResponse}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Resolution</p>
                    <p className="font-semibold">{policy.resolution}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Escalation</p>
                    <p className="font-semibold">{policy.escalation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={`rounded-3xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-5">
            <Workflow size={18} className="text-purple-500" />
            <div>
              <h2 className="font-bold text-lg">Routing & approval</h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Rule tim yang menjaga supaya channel tidak berantakan saat user mulai bertambah.</p>
            </div>
          </div>
          <div className="space-y-3">
            {routingRules.slice(0, 4).map((rule) => (
              <div key={rule.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                <p className="font-semibold text-sm">{rule.name}</p>
                <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Trigger {rule.trigger}</p>
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Action {rule.action}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid xl:grid-cols-[0.95fr_1.05fr] gap-6">
        <section className={`rounded-3xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-5">
            <UsersRound size={18} className="text-orange-500" />
            <div>
              <h2 className="font-bold text-lg">Team seats</h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Siapa yang handle inbox, siapa yang approve content, dan siapa owner campaign.</p>
            </div>
          </div>
          <div className="space-y-3">
            {teamSeats.slice(0, 5).map((member) => (
              <div key={member.id} className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
                <p className="font-semibold text-sm">{member.name}</p>
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{member.role}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={`rounded-3xl border p-6 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="grid md:grid-cols-2 gap-4">
            <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-3">
                <BellRing size={18} className="text-blue-500" />
                <h2 className="font-bold">Reply templates</h2>
              </div>
              <div className="space-y-3">
                {replyTemplates.slice(0, 3).map((template) => (
                  <div key={template.id}>
                    <p className="font-semibold text-sm">{template.title}</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{template.channel}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-3">
                <Workflow size={18} className="text-emerald-500" />
                <h2 className="font-bold">Approval flow</h2>
              </div>
              <div className="space-y-3">
                {approvalFlows.slice(0, 3).map((flow) => (
                  <div key={flow.id}>
                    <p className="font-semibold text-sm">{flow.name}</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{flow.steps.join(' → ')}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
