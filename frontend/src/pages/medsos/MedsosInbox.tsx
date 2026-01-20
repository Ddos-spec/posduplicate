import { useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { Search, Send, Instagram, Facebook, MessageCircle, MoreVertical, Paperclip, Smile } from 'lucide-react';

const MOCK_CHATS = [
  { id: 1, user: 'budi_kuliner', msg: 'Min, cabangnya buka jam berapa?', time: '10:30', unread: 2, platform: 'ig' },
  { id: 2, user: 'siti.aminah', msg: 'Harga promo masih berlaku?', time: '09:15', unread: 0, platform: 'fb' },
  { id: 3, user: '081234567890', msg: 'Saya mau order katering buat besok.', time: 'Yesterday', unread: 0, platform: 'wa' },
];

const MOCK_MESSAGES = [
  { id: 1, text: 'Halo min, mau tanya dong.', sender: 'user', time: '10:28' },
  { id: 2, text: 'Halo kak, boleh. Mau tanya apa?', sender: 'me', time: '10:29' },
  { id: 3, text: 'Min, cabangnya buka jam berapa?', sender: 'user', time: '10:30' },
];

export default function MedsosInbox() {
  const { isDark } = useThemeStore();
  const [selectedChat, setSelectedChat] = useState(MOCK_CHATS[0]);
  const [reply, setReply] = useState('');

  return (
    <div className={`h-[calc(100vh-100px)] flex rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
      
      {/* Sidebar List Chat */}
      <div className={`w-80 border-r flex flex-col ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="p-4 border-b dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari pesan..." 
              className={`w-full pl-9 pr-4 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {MOCK_CHATS.map(chat => (
            <div 
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className={`p-4 flex items-start gap-3 cursor-pointer border-b dark:border-slate-700 transition-colors ${
                selectedChat.id === chat.id 
                  ? isDark ? 'bg-slate-700' : 'bg-blue-50' 
                  : isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                  chat.platform === 'ig' ? 'bg-purple-500' : chat.platform === 'wa' ? 'bg-green-500' : 'bg-blue-600'
                }`}>
                  {chat.user.charAt(0).toUpperCase()}
                </div>
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 flex items-center justify-center ${isDark ? 'border-slate-800' : 'border-white'} ${
                  chat.platform === 'ig' ? 'bg-white text-purple-600' : chat.platform === 'wa' ? 'bg-white text-green-500' : 'bg-white text-blue-600'
                }`}>
                  {chat.platform === 'ig' && <Instagram size={10} />}
                  {chat.platform === 'fb' && <Facebook size={10} />}
                  {chat.platform === 'wa' && <MessageCircle size={10} />}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h4 className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{chat.user}</h4>
                  <span className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{chat.time}</span>
                </div>
                <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{chat.msg}</p>
              </div>
              
              {chat.unread > 0 && (
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {chat.unread}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className={`h-16 px-6 border-b flex items-center justify-between ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
              selectedChat.platform === 'ig' ? 'bg-purple-500' : selectedChat.platform === 'wa' ? 'bg-green-500' : 'bg-blue-600'
            }`}>
              {selectedChat.user.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{selectedChat.user}</h3>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Via {selectedChat.platform === 'ig' ? 'Instagram DM' : 'Facebook Messenger'}</p>
            </div>
          </div>
          <button className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500`}>
            <MoreVertical size={20} />
          </button>
        </div>

        {/* Chat Messages */}
        <div className={`flex-1 p-6 overflow-y-auto ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
          {MOCK_MESSAGES.map(msg => (
            <div key={msg.id} className={`flex mb-4 ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] p-3 rounded-xl text-sm ${
                msg.sender === 'me' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : isDark ? 'bg-slate-700 text-white rounded-tl-none' : 'bg-white text-gray-800 shadow-sm rounded-tl-none'
              }`}>
                {msg.text}
                <p className={`text-[10px] mt-1 text-right ${msg.sender === 'me' ? 'text-blue-200' : 'text-gray-400'}`}>{msg.time}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Chat Input */}
        <div className={`p-4 border-t ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <div className={`flex items-center gap-2 rounded-xl border px-2 py-2 ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
            <button className="p-2 text-gray-400 hover:text-gray-600"><Paperclip size={20} /></button>
            <input 
              type="text" 
              placeholder="Ketik balasan..." 
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              className={`flex-1 bg-transparent outline-none text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}
            />
            <button className="p-2 text-gray-400 hover:text-gray-600"><Smile size={20} /></button>
            <button className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
