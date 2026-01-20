import { useThemeStore } from '../../store/themeStore';
import {
  Heart, MessageCircle, Share2, TrendingUp, Users, Eye
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';

const ENGAGEMENT_DATA = [
  { day: 'Senin', likes: 120, comments: 45 },
  { day: 'Selasa', likes: 150, comments: 55 },
  { day: 'Rabu', likes: 180, comments: 60 },
  { day: 'Kamis', likes: 220, comments: 80 },
  { day: 'Jumat', likes: 300, comments: 120 },
  { day: 'Sabtu', likes: 450, comments: 200 },
  { day: 'Minggu', likes: 400, comments: 150 },
];

const RECENT_COMMENTS = [
  { id: 1, user: 'budi_kuliner', text: 'Min, cabangnya buka jam berapa?', platform: 'Instagram', time: '5m ago' },
  { id: 2, user: 'siti.aminah', text: 'Promo buy 1 get 1 masih ada gak?', platform: 'Facebook', time: '12m ago' },
  { id: 3, user: 'foodie_jkt', text: 'Enak banget kopinya! Wajib coba guys.', platform: 'TikTok', time: '1h ago' },
];

export default function MedsosDashboard() {
  const { isDark } = useThemeStore();

  const stats = [
    { label: 'Total Followers', value: '12.5K', icon: Users, color: 'blue', grow: '+120' },
    { label: 'Engagement Rate', value: '4.8%', icon: Heart, color: 'red', grow: '+0.5%' },
    { label: 'Reach (7d)', value: '45.2K', icon: Eye, color: 'purple', grow: '+15%' },
    { label: 'Messages', value: '18', icon: MessageCircle, color: 'green', grow: 'New' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Social Media Overview</h1>
        <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Pantau performa konten di semua platform.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex justify-between items-start mb-2">
              <div className={`p-2 rounded-lg ${
                stat.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                stat.color === 'red' ? 'bg-red-100 text-red-600' :
                stat.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                'bg-green-100 text-green-600'
              }`}>
                <stat.icon size={20} />
              </div>
              <span className="text-xs font-bold text-green-500 bg-green-100 px-2 py-1 rounded-full">{stat.grow}</span>
            </div>
            <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stat.value}</h3>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className={`lg:col-span-2 p-6 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <h3 className={`font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Engagement Mingguan</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ENGAGEMENT_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: isDark ? '#94a3b8' : '#64748b'}} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderRadius: '8px', border: 'none' }}
                />
                <Bar dataKey="likes" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Likes" />
                <Bar dataKey="comments" fill="#ef4444" radius={[4, 4, 0, 0]} name="Comments" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Comments */}
        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
          <h3 className={`font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Komentar Terbaru</h3>
          <div className="space-y-4">
            {RECENT_COMMENTS.map((comment) => (
              <div key={comment.id} className={`p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                <div className="flex justify-between items-start mb-1">
                  <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>@{comment.user}</span>
                  <span className="text-[10px] text-gray-400">{comment.time}</span>
                </div>
                <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'} line-clamp-2`}>"{comment.text}"</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded ${
                    comment.platform === 'Instagram' ? 'bg-purple-100 text-purple-600' :
                    comment.platform === 'Facebook' ? 'bg-blue-100 text-blue-600' :
                    'bg-black text-white'
                  }`}>
                    {comment.platform}
                  </span>
                  <button className="text-[10px] font-bold text-blue-500 hover:underline">Reply</button>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 py-2 text-sm text-blue-500 font-medium hover:bg-blue-50 rounded-lg transition-colors">
            Lihat Semua Inbox
          </button>
        </div>
      </div>
    </div>
  );
}
