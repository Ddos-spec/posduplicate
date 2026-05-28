import { useState, useEffect, useMemo, useRef, type ChangeEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import { BrandLogo, resolveBrandKey } from '../../components/medsos/BrandLogo';
import AdvancedContentStudio from '../../components/medsos/AdvancedContentStudio';
import FieldHelp from '../../components/medsos/FieldHelp';
import { CalendarClock, Image as ImageIcon, Loader2, Send, UploadCloud, Sparkles, PlaySquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { createZernioPost, getZernioAccounts, generateZernioUploadLink, generateAiCaption, type ZernioAccount } from '../../services/medsosPostsService';
import { Camera as CapacitorCamera, CameraResultType } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export default function CreatePost() {
  const { isDark } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { mode } = useParams<{ mode?: string }>();
  const isDemo = location.pathname.startsWith('/demo');
  const basePath = isDemo ? '/demo/medsos' : '/medsos';
  const plannerPath = `${basePath}/crm/planner`;
  const photoPath = `${basePath}/crm/content/photo`;
  const videoPath = `${basePath}/crm/content/video`;
  const activeMode = mode === 'video' ? 'video' : 'photo';
  const preferredStudioTab = activeMode === 'video' ? 'video' : 'image';
  const [caption, setCaption] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<ZernioAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [uploadLink, setUploadLink] = useState<string | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingAi, setGeneratingAi] = useState(false);
  const [showQuickCaption, setShowQuickCaption] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [mediaLabel, setMediaLabel] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const modeCards = useMemo(() => ([
    {
      id: 'photo',
      title: 'Photo Engine',
      description: 'Atur visual brief, style, angle, negative prompt, dan output foto iklan dari satu cockpit.',
      helper: 'Hero image, key visual, thumbnail, katalog, creative test.',
      path: photoPath,
      icon: ImageIcon,
      badge: 'Visual lane',
      accent: 'blue',
      detail: 'Still, product, key visual',
    },
    {
      id: 'video',
      title: 'Video Engine',
      description: 'Bangun storyboard, beat sheet, camera motion, dan CTA visual untuk short-form video.',
      helper: 'Reels, TikTok, hook 3 detik, UGC brief, motion ads.',
      path: videoPath,
      icon: PlaySquare,
      badge: 'Motion lane',
      accent: 'violet',
      detail: 'Storyboard, hook, CTA',
    },
  ] as const), [photoPath, videoPath]);
  const handleGenerateAi = async () => {
    if (!aiPrompt.trim()) { toast.error('Isi instruksi caption dulu'); return; }
    setGeneratingAi(true);
    try {
      const res = await generateAiCaption(aiPrompt);
      setCaption(res);
      toast.success('Caption berhasil dibuat!');
    } catch (err: any) {
      toast.error(err.message || 'Gagal generate caption');
    } finally {
      setGeneratingAi(false);
    }
  };

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
      setUploadLink(data.uploadUrl || 'https://upload.omnipilot.ai/dummy'); // fallback if missing
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

  const handlePickLocalMedia = () => {
    fileInputRef.current?.click();
  };

  const handleLocalMediaChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) {
        toast.error('Gagal membaca media lokal.');
        return;
      }
      setMediaPreview(dataUrl);
      setMediaLabel(file.name);
      toast.success('Media lokal berhasil dipilih.');
    };
    reader.onerror = () => toast.error('Gagal membaca media lokal.');
    reader.readAsDataURL(file);
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
      navigate(plannerPath);
    } catch {
      toast.error('Gagal memproses post');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyStudioText = (value: string) => {
    setCaption(value);
    toast.success('Output studio dipindahkan ke composer.');
  };

  const activeModeCard = modeCards.find((item) => item.id === activeMode) ?? modeCards[0];

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleLocalMediaChange}
      />
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.18fr)_minmax(380px,0.82fr)]">
        <AdvancedContentStudio
          isDark={isDark}
          onApplyToComposer={handleApplyStudioText}
          preferredTab={preferredStudioTab}
          mediaPreview={mediaPreview}
          mediaLabel={mediaLabel}
          onPickMedia={handlePickLocalMedia}
          onOpenCamera={handleTakePicture}
          canUseCamera={Capacitor.isNativePlatform()}
        />

        <div className={`self-start 2xl:sticky 2xl:top-24 rounded-[32px] border p-6 flex flex-col gap-5 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Planner &amp; Publish Bridge</h2>
              <FieldHelp
                title="Quick publish bridge"
                description="Gunakan panel ini untuk mengirim caption final, upload media, lalu publish atau schedule ke channel tujuan."
                howToUse="Setelah studio kiri menghasilkan output, pilih akun tujuan, siapkan media, isi jadwal bila perlu, lalu gunakan save draft, schedule, atau publish now sesuai kebutuhan."
              />
            </div>
            <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Panel kanan sengaja dibuat sesingkat mungkin: pilih akun, siapkan media, isi caption, lalu publish atau schedule.
            </p>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <p className="text-sm font-semibold">Pilih Akun Tujuan</p>
              <FieldHelp
                title="Pilih Akun Tujuan"
                description="Bagian ini dipakai untuk menentukan akun sosial mana yang akan menerima caption, media, atau jadwal publish dari panel ini."
                howToUse="Centang satu atau beberapa akun tujuan lebih dulu. Setelah itu upload media, isi caption, lalu pilih save draft, schedule, atau publish sekarang."
              />
            </div>
            {loadingAccounts ? (
              <div className="flex items-center justify-center rounded-2xl border border-dashed p-6"><Loader2 className="animate-spin text-blue-500" /></div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {accounts.filter(a => !a.platform.includes('ads')).map(account => {
                  const isSelected = selectedAccounts.has(account.id);
                  return (
                    <button
                      key={account.id}
                      onClick={() => toggleAccount(account.id)}
                      className={`flex flex-col items-center justify-center gap-2 rounded-2xl border p-3 transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 shadow-sm'
                          : isDark ? 'border-slate-700 text-gray-400 hover:border-slate-500' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <BrandLogo brand={resolveBrandKey(account.platform)} size={24} className="rounded-md" />
                      <span className="text-xs font-semibold truncate w-full text-center">{account.displayName}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className={`rounded-[24px] border p-4 ${isDark ? 'bg-slate-900/50 ring-1 ring-white/10' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <p className="text-sm font-semibold">Media terpasang</p>
                  <FieldHelp
                    title="Media terpasang"
                    description="Bagian ini menunjukkan file referensi/utama yang sedang dipakai untuk konten ini."
                    howToUse="Idealnya pilih media dari panel generator kiri. Di sini user tinggal cek apakah file yang terpasang sudah benar sebelum publish."
                  />
                </div>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {mediaLabel || (mediaPreview ? 'Media siap dipakai' : 'Belum ada media dipilih')}
                </p>
              </div>
              <button
                type="button"
                onClick={handlePickLocalMedia}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
              >
                <UploadCloud size={14} />
                {mediaPreview ? 'Ganti media' : 'Pilih media'}
              </button>
            </div>
            {mediaPreview ? (
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white/70 dark:border-white/10 dark:bg-white/5">
                <img src={mediaPreview} alt="Media preview" className="h-40 w-full object-cover" />
              </div>
            ) : null}
            {uploadLink ? (
              <a href={uploadLink} target="_blank" rel="noreferrer" className="mt-3 block text-xs text-blue-500 underline break-all">
                Upload link cadangan: {uploadLink}
              </a>
            ) : (
              <button
                type="button"
                onClick={handleGenerateUploadLink}
                className="mt-3 text-xs font-semibold text-blue-500 hover:underline"
              >
                Butuh upload link cadangan?
              </button>
            )}
          </div>

          <div className={`rounded-[24px] p-4 border ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-gray-100 bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <CalendarClock size={16} className="text-blue-500" />
              <p className="font-semibold text-sm">Jadwal Publish</p>
              <FieldHelp
                title="Jadwal Publish"
                description="Field ini dipakai kalau konten tidak mau diposting sekarang, tapi dimasukkan ke jadwal planner."
                howToUse="Isi tanggal dan jam target. Lalu klik Schedule. Kalau mau live sekarang, kosongkan jadwal lalu pakai Publish Now."
              />
            </div>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className={`w-full rounded-xl px-3 py-2 border text-sm ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
            />
          </div>

          <div className="min-h-[150px]">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-sm font-semibold">Caption / message</p>
              <div className="flex items-center gap-2">
                <FieldHelp
                  title="Caption / message"
                  description="Area ini adalah composer final yang akan dikirim ke channel tujuan."
                  howToUse="Kalau output dari studio sudah cocok, klik tombol pakai ke composer. Setelah itu cek lagi secara manual sebelum save draft, schedule, atau publish."
                />
                <button
                  onClick={() => setShowQuickCaption((current) => !current)}
                  className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase transition ${isDark ? 'bg-white/5 text-slate-200 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {showQuickCaption ? 'Tutup AI cepat' : 'AI cepat'}
                </button>
              </div>
            </div>

            {showQuickCaption ? (
              <div className={`mb-4 p-4 rounded-2xl border-2 border-dashed ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-blue-100 bg-blue-50/50'}`}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-purple-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Quick AI Caption</span>
                    <FieldHelp
                      title="Quick AI Caption"
                      description="Generator cepat ini dipakai saat user butuh draft caption singkat tanpa masuk ke studio penuh."
                      howToUse="Isi instruksi sederhana, klik Generate, lalu pakai hasilnya sebagai draft awal. Kalau butuh hasil lebih dalam, balik ke Copy Lab di studio kiri."
                    />
                  </div>
                  <button
                    onClick={() => setAiPrompt('')}
                    className="text-[10px] font-bold text-blue-500 uppercase hover:underline"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    placeholder="Tulis instruksi... (misal: Bikin caption promo diskon 50%)"
                    className={`flex-1 px-3 py-2 rounded-xl text-xs border ${isDark ? 'bg-[#111318] ring-1 ring-white/10 text-white' : 'bg-white border-gray-200'}`}
                  />
                  <button
                    onClick={handleGenerateAi}
                    disabled={generatingAi || !aiPrompt.trim()}
                    className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {generatingAi ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Generate
                  </button>
                </div>
              </div>
            ) : null}

            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Tulis caption..."
              className={`w-full min-h-[220px] p-4 rounded-2xl border resize-y outline-none focus:ring-2 focus:ring-blue-500 ${
                isDark ? 'bg-slate-700 border-slate-600 text-white placeholder-gray-400' : 'bg-gray-50 border-gray-200 text-gray-900'
              }`}
            />
          </div>

          <div className={`rounded-[28px] p-5 ${isDark ? 'bg-slate-950/70 ring-1 ring-white/10' : 'bg-slate-50 border border-slate-100'}`}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold">Preview mobile</p>
                  <FieldHelp
                    title="Preview mobile"
                    description="Preview ini dipakai untuk mengecek rasa akhir konten di layar ponsel tanpa buka tool lain."
                    howToUse="Cek apakah caption terlalu panjang, gambar terasa pas, dan flow konten enak dibaca. Ini preview cepat, bukan simulasi semua platform 100% akurat."
                  />
                </div>
                  <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Buka hanya saat perlu cek rasa final.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMobilePreview((current) => !current)}
                  className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50'}`}
                >
                  {showMobilePreview ? 'Sembunyikan preview' : 'Lihat preview'}
                </button>
            </div>
            {showMobilePreview ? (
              <div className="flex items-center justify-center">
                <div className="w-[240px] h-[470px] bg-black rounded-[34px] p-2.5 shadow-2xl border-4 border-gray-800 relative overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-b-xl z-20"></div>
                  <div className="w-full h-full bg-white rounded-[26px] overflow-hidden relative flex flex-col">
                    <div className="h-12 border-b flex items-center px-3 justify-between bg-white z-10">
                      <div className="flex items-center gap-2">
                        <BrandLogo brand="instagram" size={20} className="rounded-lg px-1" withRing />
                        <span className="font-bold text-xs">Preview</span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">{activeModeCard.title}</span>
                    </div>

                    <div className="w-full aspect-square bg-gray-200 flex items-center justify-center text-gray-400 relative overflow-hidden">
                      {mediaPreview ? (
                        <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={42} />
                      )}
                    </div>

                    <div className="p-3 bg-white flex-1 overflow-y-auto">
                      <p className="text-[11px] text-gray-800 whitespace-pre-wrap leading-5">
                        <span className="font-bold mr-1">my_brand</span>
                        {caption || 'Caption preview...'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap justify-end gap-3">
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
              className="px-5 py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> Publish Now</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
