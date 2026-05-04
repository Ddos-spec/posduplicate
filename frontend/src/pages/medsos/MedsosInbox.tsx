import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import { BrandLogo, resolveBrandKey } from '../../components/medsos/BrandLogo';
import { IntegrationEmptyState } from '../../components/medsos/IntegrationEmptyState';
import {
  conversationMessages,
  inboxFilters,
  priorityThreads,
  replyTemplates,
  teamSeats,
  threadDetails,
} from '../../data/omnichannelMock';
import {
  Bot,
  ChevronDown,
  Clock3,
  MessageSquareQuote,
  MoreVertical,
  NotebookPen,
  Paperclip,
  Search,
  Send,
  ShieldAlert,
  Smile,
  Tag,
  UserRoundCheck,
} from 'lucide-react';

export default function MedsosInbox() {
  const { isDark } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();
  const isDemo = location.pathname.startsWith('/demo');
  const [selectedChat, setSelectedChat] = useState(priorityThreads[0]);
  const [reply, setReply] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const selectedDetail = threadDetails[selectedChat.id];
  const selectedMessages = conversationMessages[selectedChat.id] ?? [];
  const assignedSeat = useMemo(
    () => teamSeats.find((member) => member.name === selectedChat.assignee),
    [selectedChat.assignee]
  );
  const filterTabs = useMemo(
    () => [...inboxFilters, { id: 'social', label: 'Social', count: 23, tone: 'slate' as const }],
    []
  );

  const toneClasses = {
    high: 'bg-red-100 text-red-600',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-emerald-100 text-emerald-600',
  } as const;

  if (!isDemo) {
    return (
      <IntegrationEmptyState
        isDark={isDark}
        title="Unified Inbox membutuhkan Tapchat"
        description="Hubungkan Social Hub (Tapchat) untuk mulai menerima pesan dari Instagram, TikTok, Facebook, dan marketplace dalam satu inbox."
        integration="Tapchat"
        onSetup={() => navigate('/medsos/connections')}
      />
    );
  }

  return (
    <div className={`h-[calc(100vh-100px)] grid lg:grid-cols-[330px_minmax(0,1fr)] xl:grid-cols-[330px_minmax(0,1fr)_340px] rounded-3xl border overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
      <aside className={`border-r flex flex-col ${isDark ? 'border-slate-700 bg-slate-850' : 'border-gray-200 bg-white'}`}>
        <div className="p-4 border-b dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className={`text-[11px] uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Unified Inbox</p>
              <h2 className="text-lg font-bold">Queue & Response Desk</h2>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isDark ? 'bg-slate-700 text-gray-200' : 'bg-blue-50 text-blue-600'}`}>
              5 SLA at risk
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className={`rounded-2xl p-3 ${isDark ? 'bg-slate-900/60' : 'bg-blue-50'}`}>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Assigned to team</p>
              <p className="text-xl font-bold">18</p>
            </div>
            <div className={`rounded-2xl p-3 ${isDark ? 'bg-slate-900/60' : 'bg-orange-50'}`}>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Urgent queue</p>
              <p className="text-xl font-bold">5</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {filterTabs.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  activeFilter === filter.id
                    ? 'bg-blue-600 text-white'
                    : isDark
                      ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari thread / buyer / order..."
              className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {['Channel', 'SLA', 'Assignee', 'Sentiment'].map((filterName) => (
              <button
                key={filterName}
                className={`px-3 py-2 rounded-xl border flex items-center justify-between ${isDark ? 'border-slate-600 bg-slate-700 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-600'}`}
              >
                <span>{filterName}</span>
                <ChevronDown size={14} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {priorityThreads.map((chat) => {
            const detail = threadDetails[chat.id];
            const isActive = selectedChat.id === chat.id;
            return (
              <button
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`w-full text-left p-4 border-b transition ${
                  isActive
                    ? isDark ? 'bg-slate-700 border-slate-600' : 'bg-blue-50 border-blue-100'
                    : isDark ? 'border-slate-700 hover:bg-slate-700/40' : 'border-gray-100 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <BrandLogo brand={resolveBrandKey(chat.channel)} size={40} className="rounded-2xl px-1" withRing />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{chat.customer}</h4>
                        <p className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{chat.channel} • {chat.subject}</p>
                      </div>
                      <span className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{chat.time}</span>
                    </div>
                    <p className={`text-xs line-clamp-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{chat.snippet}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] px-2 py-1 rounded-full ${toneClasses[chat.priority]}`}>
                        {chat.priority}
                      </span>
                      <span className={`text-[10px] px-2 py-1 rounded-full ${isDark ? 'bg-slate-800 text-gray-300' : 'bg-white text-gray-600'}`}>
                        {detail.customerTier}
                      </span>
                      <span className={`text-[10px] px-2 py-1 rounded-full ${isDark ? 'bg-slate-800 text-gray-300' : 'bg-white text-gray-600'}`}>
                        {chat.assignee}
                      </span>
                      {chat.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className={`text-[10px] px-2 py-1 rounded-full ${isDark ? 'bg-slate-800 text-gray-300' : 'bg-white text-gray-600'}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="flex flex-col min-w-0 border-r border-slate-700/40">
        <div className={`px-6 py-4 border-b flex items-center justify-between gap-4 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogo brand={resolveBrandKey(selectedChat.channel)} size={44} className="rounded-2xl px-1" withRing />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedChat.customer}</h3>
                <span className={`text-[10px] px-2 py-1 rounded-full ${toneClasses[selectedChat.priority]}`}>SLA {selectedChat.sla}</span>
                <span className={`text-[10px] px-2 py-1 rounded-full ${isDark ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{selectedDetail.customerTier}</span>
              </div>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Via {selectedChat.channel} • assignee {selectedChat.assignee} • prefer {selectedDetail.preferredChannel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className={`px-3 py-2 rounded-xl text-sm font-medium ${isDark ? 'bg-slate-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
              Assign
            </button>
            <button className={`px-3 py-2 rounded-xl text-sm font-medium ${isDark ? 'bg-slate-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
              Macro
            </button>
            <button className={`p-2 rounded-xl ${isDark ? 'bg-slate-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
              <MoreVertical size={18} />
            </button>
          </div>
        </div>

        <div className={`px-6 py-3 border-b flex flex-wrap items-center gap-2 ${isDark ? 'border-slate-700 bg-slate-900/30' : 'border-gray-100 bg-gray-50'}`}>
          {selectedChat.tags.map((tag) => (
            <span key={tag} className={`text-[11px] px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${isDark ? 'bg-slate-700 text-gray-300' : 'bg-white text-gray-600 border border-gray-200'}`}>
              <Tag size={12} /> {tag}
            </span>
          ))}
          <span className={`text-[11px] px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${isDark ? 'bg-slate-700 text-gray-300' : 'bg-white text-gray-600 border border-gray-200'}`}>
            <ShieldAlert size={12} /> Sentiment {selectedDetail.sentiment}
          </span>
        </div>

        <div className={`flex-1 overflow-y-auto px-6 py-5 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
          <div className="grid gap-4 mb-5 md:grid-cols-3">
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-100 shadow-sm'}`}>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Customer value</p>
              <p className="text-xl font-bold">{selectedDetail.lifetimeValue}</p>
            </div>
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-100 shadow-sm'}`}>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Response target</p>
              <p className="text-xl font-bold">{selectedChat.sla}</p>
            </div>
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-100 shadow-sm'}`}>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Assigned seat</p>
              <p className="text-xl font-bold">{selectedChat.assignee}</p>
            </div>
          </div>

          <div className={`mb-5 rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800/70' : 'border-orange-100 bg-orange-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert size={16} className="text-orange-500" />
              <p className="font-semibold text-sm">Thread summary</p>
            </div>
            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{selectedDetail.summary}</p>
          </div>

          <div className="space-y-4">
            {selectedMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm ${
                    msg.sender === 'me'
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : msg.sender === 'system'
                        ? isDark ? 'bg-amber-500/10 text-amber-200 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-100'
                        : isDark ? 'bg-slate-700 text-white rounded-tl-sm' : 'bg-white text-gray-800 rounded-tl-sm shadow-sm border border-gray-100'
                  }`}
                >
                  {msg.text}
                  <p className={`text-[10px] mt-2 text-right ${msg.sender === 'me' ? 'text-blue-200' : isDark ? 'text-gray-400' : 'text-gray-400'}`}>{msg.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`p-4 border-t ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedDetail.macros.map((macro) => (
              <button
                key={macro}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${isDark ? 'bg-slate-700 text-gray-200 hover:bg-slate-600' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
              >
                {macro}
              </button>
            ))}
          </div>
          <div className={`mb-3 rounded-2xl border p-3 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <NotebookPen size={15} className="text-purple-500" />
              <p className="text-sm font-semibold">Internal note</p>
            </div>
            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{selectedDetail.internalNotes[0]}</p>
          </div>
          <div className={`flex items-center gap-2 rounded-2xl border px-2 py-2 ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
            <button className="p-2 text-gray-400 hover:text-gray-600"><Paperclip size={20} /></button>
            <input
              type="text"
              placeholder="Ketik balasan / macro / resolution..."
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              className={`flex-1 bg-transparent outline-none text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}
            />
            <button className="p-2 text-gray-400 hover:text-gray-600"><Smile size={20} /></button>
            <button className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700">
              <Send size={18} />
            </button>
          </div>
        </div>
      </main>

      <aside className={`hidden xl:flex flex-col ${isDark ? 'bg-slate-850' : 'bg-gray-50/70'}`}>
        <div className={`p-5 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <h3 className="font-bold text-lg">Customer Context</h3>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Biar thread terasa seperti tiket operasional, bukan chat biasa.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className={`rounded-2xl p-4 border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center gap-3 mb-3">
              <BrandLogo brand={resolveBrandKey(selectedChat.channel)} size={42} className="rounded-2xl px-1" withRing />
              <div>
                <p className="font-semibold">{selectedChat.customer}</p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{selectedDetail.customerTier} • {selectedDetail.preferredChannel}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs`}>Lifetime value</p>
                <p className="font-semibold">{selectedDetail.lifetimeValue}</p>
              </div>
              <div>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-xs`}>Sentiment</p>
                <p className="font-semibold capitalize">{selectedDetail.sentiment}</p>
              </div>
            </div>
          </div>

          {selectedDetail.orderContext && (
            <div className={`rounded-2xl p-4 border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center gap-2 mb-3">
                <Clock3 size={16} className="text-orange-500" />
                <p className="font-semibold">Order Context</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Order</span><span className="font-semibold">{selectedDetail.orderContext.orderId}</span></div>
                <div className="flex justify-between"><span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Amount</span><span className="font-semibold">{selectedDetail.orderContext.amount}</span></div>
                <div className="flex justify-between"><span className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status</span><span className="font-semibold">{selectedDetail.orderContext.status}</span></div>
              </div>
              <p className={`text-xs mt-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{selectedDetail.orderContext.lastUpdate}</p>
            </div>
          )}

          <div className={`rounded-2xl p-4 border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center gap-2 mb-3">
              <Bot size={16} className="text-blue-500" />
              <p className="font-semibold">Template Reply / Macro</p>
            </div>
            <div className="space-y-2">
              {replyTemplates.filter((template) => template.channel.includes(selectedChat.channel) || template.channel.includes('Shopee') && selectedChat.channel === 'Shopee' || template.channel.includes('Tokopedia') && selectedChat.channel === 'Tokopedia').slice(0, 2).map((template) => (
                <div key={template.id} className={`rounded-xl p-3 ${isDark ? 'bg-slate-900/50' : 'bg-gray-50'}`}>
                  <p className="text-sm font-semibold">{template.title}</p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{template.preview}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl p-4 border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center gap-2 mb-3">
              <UserRoundCheck size={16} className="text-emerald-500" />
              <p className="font-semibold">Assign to Staff</p>
            </div>
            {assignedSeat && (
              <div className={`rounded-xl p-3 mb-3 ${isDark ? 'bg-slate-900/50' : 'bg-blue-50'}`}>
                <p className="font-semibold text-sm">{assignedSeat.name}</p>
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{assignedSeat.role} • {assignedSeat.shift}</p>
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Workload: {assignedSeat.workload}</p>
              </div>
            )}
            <div className="space-y-2">
              {teamSeats.slice(0, 3).map((member) => (
                <button key={member.id} className={`w-full text-left rounded-xl px-3 py-2 border ${isDark ? 'border-slate-700 bg-slate-900/40 hover:bg-slate-900/70' : 'border-gray-200 bg-gray-50 hover:bg-white'}`}>
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{member.role}</p>
                </button>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl p-4 border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquareQuote size={16} className="text-purple-500" />
              <p className="font-semibold">Activity Feed</p>
            </div>
            <div className="space-y-3">
              {selectedDetail.activities.map((item) => (
                <div key={item.time + item.title} className="relative pl-4">
                  <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-blue-500" />
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.description}</p>
                  <p className={`text-[10px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{item.time}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl p-4 border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
            <h4 className="font-semibold mb-3">Suggested actions</h4>
            <div className="space-y-2">
              {selectedDetail.recommendedActions.map((action) => (
                <button key={action} className={`w-full text-left rounded-xl px-3 py-2 text-sm ${isDark ? 'bg-slate-900/50 hover:bg-slate-900' : 'bg-gray-50 hover:bg-gray-100'}`}>
                  {action}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
