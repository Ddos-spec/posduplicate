import { useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { BrandLogo, resolveBrandKey } from '../../components/medsos/BrandLogo';
import { CalendarClock, CheckCircle2, Image as ImageIcon, MessageSquareQuote, Send, ShoppingBag, Sparkles } from 'lucide-react';

export default function CreatePost() {
  const { isDark } = useThemeStore();
  const [caption, setCaption] = useState('');
  const [platform, setPlatform] = useState<'instagram' | 'tiktok' | 'shopee' | 'tokopedia'>('instagram');

  return (
    <div className="h-[calc(100vh-100px)] grid lg:grid-cols-2 gap-6">
      <div className={`p-6 rounded-2xl border flex flex-col ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="mb-6">
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-3 ${isDark ? 'bg-blue-500/20 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>
            <Sparkles size={14} />
            Composer mockup
          </div>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Buat campaign / postingan baru</h2>
          <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Frontend-only composer untuk social post, promo marketplace, dan broadcast ops.</p>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button 
            onClick={() => setPlatform('instagram')}
            className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${
              platform === 'instagram' 
                ? 'border-purple-500 bg-purple-50 text-purple-700' 
                : isDark ? 'border-slate-600 text-gray-400' : 'border-gray-200 text-gray-500'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <BrandLogo brand="instagram" size={22} className="rounded-lg" />
              <span>Instagram Feed</span>
            </div>
          </button>
          <button 
            onClick={() => setPlatform('tiktok')}
            className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${
              platform === 'tiktok' 
                ? 'border-black bg-gray-100 text-black' 
                : isDark ? 'border-slate-600 text-gray-400' : 'border-gray-200 text-gray-500'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <BrandLogo brand="tiktok" size={22} className="rounded-lg" />
              <span>TikTok / Reels</span>
            </div>
          </button>
          <button 
            onClick={() => setPlatform('shopee')}
            className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${
              platform === 'shopee'
                ? 'border-orange-500 bg-orange-50 text-orange-700'
                : isDark ? 'border-slate-600 text-gray-400' : 'border-gray-200 text-gray-500'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <BrandLogo brand="shopee" size={22} className="rounded-lg" />
              <span>Shopee Campaign</span>
            </div>
          </button>
          <button 
            onClick={() => setPlatform('tokopedia')}
            className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${
              platform === 'tokopedia'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : isDark ? 'border-slate-600 text-gray-400' : 'border-gray-200 text-gray-500'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <BrandLogo brand="tokopedia" size={22} className="rounded-lg px-1" withRing />
              <span>Tokopedia Broadcast</span>
            </div>
          </button>
        </div>

        <div className={`border-2 border-dashed rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer transition-colors mb-6 ${
          isDark ? 'border-slate-600 hover:border-slate-500 bg-slate-700/30' : 'border-gray-300 hover:border-blue-400 bg-gray-50'
        }`}>
          <ImageIcon className={`w-10 h-10 mb-2 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
          <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Drag & drop aset hero / thumbnail / promo card</p>
          <p className="text-xs text-gray-400 mt-1">Semuanya masih dummy, tapi layout finalnya sudah dipoles</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className={`rounded-xl p-4 border ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <CalendarClock size={16} className="text-blue-500" />
              <p className="font-semibold text-sm">Jadwal Publish</p>
            </div>
            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Rabu, 07 Mei 2026 • 19:00 WIB</p>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Slot terbaik berdasarkan mock insight engagement</p>
          </div>
          <div className={`rounded-xl p-4 border ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquareQuote size={16} className="text-purple-500" />
              <p className="font-semibold text-sm">Objective</p>
            </div>
            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Awareness + reply conversion ke WhatsApp sales</p>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>CTA, offer, dan audience masih mock</p>
          </div>
        </div>

        <div className="flex-1 relative">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Tulis caption, broadcast, atau buyer message template..."
            className={`w-full h-full p-4 rounded-xl border resize-none outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900'
            }`}
          />
        </div>

        <div className={`mt-4 rounded-xl p-4 border ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-blue-50'}`}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <p className="font-semibold text-sm">Checklist sebelum publish</p>
          </div>
          <div className="grid md:grid-cols-2 gap-2 text-sm">
            <p>• Visual hero sudah aman untuk semua rasio</p>
            <p>• CTA mengarah ke channel yang benar</p>
            <p>• Tone copy sesuai persona brand</p>
            <p>• Promo marketplace sinkron dengan banner</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button className={`px-6 py-3 rounded-xl font-bold border ${isDark ? 'border-slate-600 text-gray-300' : 'border-gray-200 text-gray-600'}`}>
            Save Draft
          </button>
          <button className="px-6 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2">
            <Send size={18} /> Queue Campaign
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center bg-gray-100 dark:bg-slate-900 rounded-2xl border dark:border-slate-800 p-8">
        <div className="w-[320px] h-[640px] bg-black rounded-[40px] p-3 shadow-2xl border-4 border-gray-800 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-xl z-20"></div>
          
          <div className="w-full h-full bg-white rounded-[32px] overflow-hidden relative flex flex-col">
            <div className="h-14 border-b flex items-center px-4 justify-between bg-white z-10">
              <div className="flex items-center gap-2">
                <BrandLogo
                  brand={resolveBrandKey(platform)}
                  size={24}
                  className="rounded-lg px-1"
                  withRing
                />
                <span className="font-bold text-sm">
                  {platform === 'instagram' ? 'Instagram' : platform === 'tiktok' ? 'TikTok' : platform === 'shopee' ? 'Shopee' : 'Tokopedia'}
                </span>
              </div>
              {platform === 'shopee' || platform === 'tokopedia' ? <ShoppingBag size={18} className="text-gray-500" /> : <div className="w-6 h-6 rounded-full bg-gray-200"></div>}
            </div>

            <div className={`w-full ${platform === 'instagram' ? 'aspect-square' : 'flex-1'} bg-gray-200 flex items-center justify-center text-gray-400`}>
              <ImageIcon size={48} />
            </div>

            <div className="p-3 bg-white flex-1 overflow-y-auto">
              {platform === 'shopee' || platform === 'tokopedia' ? (
                <>
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 mb-3">
                    <p className="text-xs font-semibold text-orange-700">Voucher Payday</p>
                    <p className="text-[11px] text-orange-600">Diskon 15% + gratis ongkir</p>
                  </div>
                  <p className="text-xs text-gray-800 font-semibold mb-1">Broadcast Preview</p>
                  <p className="text-xs text-gray-700">
                    {caption || 'Halo kak, stok seasonal blend sudah ready. Bisa checkout hari ini untuk bonus sample pack.'}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex gap-3 mb-2">
                    <HeartIcon /> <ChatIcon /> <ShareIcon />
                  </div>
                  <p className="text-xs text-gray-800">
                    <span className="font-bold mr-1">my_awesome_brand</span>
                    {caption || 'Caption preview akan muncul di sini. Hamba buatkan tampilannya terasa seperti app sungguhan.'}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-2">2 hours ago</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const HeartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-800">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>
);
const ChatIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-800">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
  </svg>
);
const ShareIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-800">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);
