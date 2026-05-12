import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import { BrandLogo, resolveBrandKey } from '../../components/medsos/BrandLogo';
import FieldHelp from '../../components/medsos/FieldHelp';
import { CalendarClock, Image as ImageIcon, Loader2, Send, UploadCloud, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { createZernioPost, getZernioAccounts, generateZernioUploadLink, type ZernioAccount } from '../../services/medsosPostsService';
import { Camera as CapacitorCamera, CameraResultType } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export default function CreatePost() {
  const { isDark } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();
  const isDemo = location.pathname.startsWith('/demo');
  const [caption, setCaption] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<ZernioAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [uploadLink, setUploadLink] = useState<string | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!isDemo) {
      setLoadingAccounts(true);
      getZernioAccounts()
        .then(accs => setAccounts(accs))
        .catch(() => toast.error('Gagal memuat akun sosial'))
        .finally(() => setLoadingAccounts(false));
    } else {
      setAccounts([
        { id: '1', platform: 'instagram', username: 'demo', displayName: 'Demo IG', profileUrl: null, isActive: true },
        { id: '2', platform: 'facebook', username: 'demo', displayName: 'Demo FB', profileUrl: null, isActive: true },
      ]);
    }
  }, [isDemo]);

  const toggleAccount = (id: string) => {
    const next = new Set(selectedAccounts);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedAccounts(next);
  };

  const handleGenerateUploadLink = async () => {
    try {
      const data = await generateZernioUploadLink();
      setUploadLink(data.uploadUrl || 'https://upload.zernio.com/dummy'); // fallback if missing
      toast.success('Upload link generated!');
    } catch {
      toast.error('Gagal membuat upload link');
    }
  };

  const handleTakePicture = async () => {
    if (!Capacitor.isNativePlatform()) {
      toast.error('Kamera hanya tersedia di aplikasi mobile (Android/iOS)');
      return;
    }
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl
      });
      setMediaPreview(image.dataUrl ?? null);
      toast.success('Foto berhasil diambil!');
    } catch (e) {
      console.error(e);
      toast.error('Gagal mengambil foto');
    }
  };

  const submitPost = async (isDraft: boolean, publishNow: boolean) => {
    if (isDemo) { toast.success('Berhasil (demo)'); return; }
    if (!caption.trim()) { toast.error('Caption tidak boleh kosong'); return; }
    if (selectedAccounts.size === 0) { toast.error('Pilih minimal 1 akun'); return; }
    
    setSaving(true);
    try {
      await createZernioPost({
        text: caption,
        socialAccountIds: Array.from(selectedAccounts),
        isDraft,
        publishNow,
        scheduledAt: scheduledAt || undefined,
        mediaUrls: mediaPreview ? ['data-url-placeholder'] : [], // In reality, you'd upload this blob first using the Zernio upload flow
      });
      toast.success(publishNow ? 'Post dipublish' : isDraft ? 'Draft disimpan' : 'Post dijadwalkan');
      navigate('/medsos/calendar');
    } catch {
      toast.error('Gagal memproses post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-100px)] grid xl:grid-cols-2 gap-6">
      <div className={`p-6 rounded-2xl border flex flex-col ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Omnichannel Post Composer</h2>
            <FieldHelp title="Composer post" description="Buat, jadwalkan, atau publish langsung ke berbagai platform lewat dashboard terpadu." />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <p className="text-sm font-semibold">Pilih Akun Tujuan</p>
        </div>
        
        {loadingAccounts ? (
          <div className="flex items-center justify-center p-4"><Loader2 className="animate-spin text-blue-500" /></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {accounts.filter(a => !a.platform.includes('ads')).map(account => {
              const isSelected = selectedAccounts.has(account.id);
              return (
                <button 
                  key={account.id}
                  onClick={() => toggleAccount(account.id)}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300' 
                      : isDark ? 'border-slate-600 text-gray-400' : 'border-gray-200 text-gray-500'
                  }`}
                >
                  <BrandLogo brand={resolveBrandKey(account.platform)} size={24} className="rounded-md" />
                  <span className="text-xs font-semibold truncate w-full text-center">{account.displayName}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-colors mb-6 relative overflow-hidden ${
          isDark ? 'border-slate-600 bg-slate-700/30' : 'border-gray-300 bg-gray-50'
        }`}>
          {mediaPreview ? (
            <img src={mediaPreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-50" />
          ) : null}
          <div className="z-10 flex flex-col items-center">
            <ImageIcon className={`w-10 h-10 mb-2 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
            <p className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Media Upload</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button onClick={handleGenerateUploadLink} className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded-lg text-sm font-semibold hover:bg-blue-200 transition">
                <UploadCloud size={16} /> Get Upload Link
              </button>
              {Capacitor.isNativePlatform() && (
                <button onClick={handleTakePicture} className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 rounded-lg text-sm font-semibold hover:bg-indigo-200 transition">
                  <Camera size={16} /> Buka Kamera
                </button>
              )}
            </div>
            {uploadLink && (
               <a href={uploadLink} target="_blank" rel="noreferrer" className="mt-3 text-xs text-blue-500 underline break-all text-center">
                 {uploadLink}
               </a>
            )}
          </div>
        </div>

        <div className="mb-4">
          <div className={`rounded-xl p-4 border ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-gray-100 bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <CalendarClock size={16} className="text-blue-500" />
              <p className="font-semibold text-sm">Jadwal Publish</p>
            </div>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className={`w-full rounded-lg px-3 py-2 border text-sm ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
            />
          </div>
        </div>

        <div className="flex-1 min-h-[150px] relative">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm font-semibold">Caption / message</p>
          </div>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Tulis caption..."
            className={`w-full h-full p-4 rounded-xl border resize-none outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900'
            }`}
          />
        </div>

        <div className="flex flex-wrap justify-end gap-3 mt-6">
          <button
            onClick={() => submitPost(true, false)}
            disabled={saving}
            className={`px-5 py-2.5 rounded-xl font-bold border disabled:opacity-60 ${isDark ? 'border-slate-600 text-gray-300' : 'border-gray-200 text-gray-600'}`}
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : 'Save Draft'}
          </button>
          <button
            onClick={() => submitPost(false, false)}
            disabled={saving || !scheduledAt}
            className="px-5 py-2.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : 'Schedule'}
          </button>
          <button
            onClick={() => submitPost(false, true)}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> Publish Now</>}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center bg-gray-100 dark:bg-slate-900 rounded-2xl border dark:border-slate-800 p-8 h-full">
        <div className="w-[320px] h-[640px] bg-black rounded-[40px] p-3 shadow-2xl border-4 border-gray-800 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-xl z-20"></div>
          
          <div className="w-full h-full bg-white rounded-[32px] overflow-hidden relative flex flex-col">
            <div className="h-14 border-b flex items-center px-4 justify-between bg-white z-10">
              <div className="flex items-center gap-2">
                <BrandLogo
                  brand="instagram"
                  size={24}
                  className="rounded-lg px-1"
                  withRing
                />
                <span className="font-bold text-sm">Preview</span>
              </div>
            </div>

            <div className={`w-full aspect-square bg-gray-200 flex items-center justify-center text-gray-400 relative overflow-hidden`}>
              {mediaPreview ? (
                <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={48} />
              )}
            </div>

            <div className="p-3 bg-white flex-1 overflow-y-auto">
              <p className="text-xs text-gray-800 whitespace-pre-wrap">
                <span className="font-bold mr-1">my_brand</span>
                {caption || 'Caption preview...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
