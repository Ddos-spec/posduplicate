import { useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { Image as ImageIcon, Smile, Hash, Send } from 'lucide-react';

export default function CreatePost() {
  const { isDark } = useThemeStore();
  const [caption, setCaption] = useState('');
  const [platform, setPlatform] = useState<'ig' | 'tiktok'>('ig');

  return (
    <div className="h-[calc(100vh-100px)] grid lg:grid-cols-2 gap-6">
      {/* Editor Column */}
      <div className={`p-6 rounded-2xl border flex flex-col ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <h2 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Create New Post</h2>
        
        {/* Platform Selector */}
        <div className="flex gap-3 mb-6">
          <button 
            onClick={() => setPlatform('ig')}
            className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${
              platform === 'ig' 
                ? 'border-purple-500 bg-purple-50 text-purple-700' 
                : isDark ? 'border-slate-600 text-gray-400' : 'border-gray-200 text-gray-500'
            }`}
          >
            Instagram Feed
          </button>
          <button 
            onClick={() => setPlatform('tiktok')}
            className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${
              platform === 'tiktok' 
                ? 'border-black bg-gray-100 text-black' 
                : isDark ? 'border-slate-600 text-gray-400' : 'border-gray-200 text-gray-500'
            }`}
          >
            TikTok / Reels
          </button>
        </div>

        {/* Upload Area */}
        <div className={`border-2 border-dashed rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer transition-colors mb-6 ${
          isDark ? 'border-slate-600 hover:border-slate-500 bg-slate-700/30' : 'border-gray-300 hover:border-blue-400 bg-gray-50'
        }`}>
          <ImageIcon className={`w-10 h-10 mb-2 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
          <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Drag & Drop foto/video disini</p>
          <p className="text-xs text-gray-400 mt-1">atau klik untuk browse</p>
        </div>

        {/* Caption Area */}
        <div className="flex-1 relative">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Tulis caption menarik..."
            className={`w-full h-full p-4 rounded-xl border resize-none outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900'
            }`}
          />
          <div className="absolute bottom-4 right-4 flex gap-2">
            <button className="p-2 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg text-gray-500">
              <Smile size={20} />
            </button>
            <button className="p-2 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg text-gray-500">
              <Hash size={20} />
            </button>
          </div>
        </div>

        {/* Action */}
        <div className="flex justify-end gap-3 mt-6">
          <button className={`px-6 py-3 rounded-xl font-bold border ${isDark ? 'border-slate-600 text-gray-300' : 'border-gray-200 text-gray-600'}`}>
            Save Draft
          </button>
          <button className="px-6 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2">
            <Send size={18} /> Post Now
          </button>
        </div>
      </div>

      {/* Preview Column */}
      <div className="flex items-center justify-center bg-gray-100 dark:bg-slate-900 rounded-2xl border dark:border-slate-800 p-8">
        {/* Phone Frame */}
        <div className="w-[320px] h-[640px] bg-black rounded-[40px] p-3 shadow-2xl border-4 border-gray-800 relative overflow-hidden">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-xl z-20"></div>
          
          {/* Screen Content */}
          <div className="w-full h-full bg-white rounded-[32px] overflow-hidden relative flex flex-col">
            
            {/* Header */}
            <div className="h-14 border-b flex items-center px-4 justify-between bg-white z-10">
              <span className="font-bold text-sm">
                {platform === 'ig' ? 'Instagram' : 'TikTok'}
              </span>
              <div className="w-6 h-6 rounded-full bg-gray-200"></div>
            </div>

            {/* Content Placeholder */}
            <div className={`w-full ${platform === 'ig' ? 'aspect-square' : 'flex-1'} bg-gray-200 flex items-center justify-center text-gray-400`}>
              <ImageIcon size={48} />
            </div>

            {/* Footer / Caption Preview */}
            <div className="p-3 bg-white flex-1 overflow-y-auto">
              <div className="flex gap-3 mb-2">
                <HeartIcon /> <ChatIcon /> <ShareIcon />
              </div>
              <p className="text-xs text-gray-800">
                <span className="font-bold mr-1">my_awesome_brand</span>
                {caption || "Caption preview will appear here..."}
              </p>
              <p className="text-[10px] text-gray-400 mt-2">2 hours ago</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// Simple Icon Components for Preview
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
