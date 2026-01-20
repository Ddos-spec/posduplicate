import { useThemeStore } from '../../store/themeStore';
import { Calendar as CalendarIcon, Plus, Instagram, Facebook, Youtube } from 'lucide-react';

const SCHEDULED_POSTS = [
  { id: 1, day: 20, title: 'Promo Merdeka', platform: 'ig', time: '10:00' },
  { id: 2, day: 22, title: 'Tutorial Seduh Kopi', platform: 'yt', time: '16:00' },
  { id: 3, day: 25, title: 'Giveaway Voucher', platform: 'fb', time: '19:00' },
];

export default function ContentCalendar() {
  const { isDark } = useThemeStore();
  const daysInMonth = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Content Calendar</h1>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Jadwal posting bulan Januari 2026.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus size={18} /> Schedule Post
        </button>
      </div>

      {/* Calendar Grid */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className="grid grid-cols-7 border-b dark:border-slate-700">
          {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => (
            <div key={d} className="p-3 text-center text-sm font-bold text-gray-500">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr">
          {daysInMonth.map(day => {
            const posts = SCHEDULED_POSTS.filter(p => p.day === day);
            return (
              <div key={day} className={`min-h-[100px] p-2 border-r border-b dark:border-slate-700 relative ${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-gray-50'}`}>
                <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{day}</span>
                <div className="mt-1 space-y-1">
                  {posts.map(post => (
                    <div key={post.id} className={`text-[10px] p-1 rounded border flex items-center gap-1 cursor-pointer ${
                      post.platform === 'ig' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                      post.platform === 'yt' ? 'bg-red-100 text-red-700 border-red-200' :
                      'bg-blue-100 text-blue-700 border-blue-200'
                    }`}>
                      {post.platform === 'ig' && <Instagram size={10} />}
                      {post.platform === 'yt' && <Youtube size={10} />}
                      {post.platform === 'fb' && <Facebook size={10} />}
                      <span className="truncate">{post.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
