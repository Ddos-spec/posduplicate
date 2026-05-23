import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';
import { BrandLogo, resolveBrandKey } from '../../components/medsos/BrandLogo';
import AdvancedContentStudio from '../../components/medsos/AdvancedContentStudio';
import FieldHelp from '../../components/medsos/FieldHelp';
import { CalendarClock, Image as ImageIcon, Loader2, Send, UploadCloud, Camera, Sparkles, Wand2, PlaySquare, Bot, ArrowRight } from 'lucide-react';
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
  const workflowChips = useMemo(() => ([
    { label: 'Copy Lab', note: 'Hook, angle, CTA' },
    { label: 'Campaign Blueprint', note: 'Offer + audience + funnel' },
    { label: 'Copilot', note: 'Brainstorm cepat' },
    { label: 'Pilot Config', note: 'Provider, model, endpoint' },
  ]), []);

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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className={`rounded-[32px] p-6 md:p-8 ${isDark ? 'bg-[#111318] ring-1 ring-white/10' : 'bg-white border border-gray-100 shadow-sm'}`}>
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600 bg-blue-50 dark:bg-blue-500/15 dark:text-blue-200">
              <Wand2 size={14} />
              CRM &amp; Automation · Create Content
            </div>
            <div className="flex items-start gap-2">
              <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {activeModeCard.title} untuk pilot yang mau ngulik foto dan video dari satu dashboard
              </h1>
              <FieldHelp
                title="Create Content cockpit"
                description="Ini adalah workspace untuk meracik brief konten, prompt, storyboard, dan output final sebelum dipublish."
                howToUse="Pilih dulu lane Photo atau Video, racik output di studio kiri, lalu pakai panel kanan untuk upload media, isi caption, dan publish atau schedule."
              />
            </div>
            <p className={`mt-2 text-sm leading-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Biar konfigurasi banyak tetap waras, halaman ini dijadikan satu cockpit: pilih engine foto/video, racik prompt, atur provider, lalu lempar ke publish bridge atau planner tanpa pindah tool.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {modeCards.map((item) => {
                const isActive = item.id === activeMode;
                const Icon = item.icon;
                const toneClass = item.accent === 'violet'
                  ? isActive
                    ? isDark ? 'border-violet-400/40 bg-violet-500/10 shadow-lg shadow-violet-500/10' : 'border-violet-200 bg-violet-50 shadow-sm'
                    : isDark ? 'border-white/10 bg-slate-900/70 hover:border-violet-400/20 hover:bg-slate-900' : 'border-slate-200 bg-slate-50 hover:border-violet-200 hover:bg-white'
                  : isActive
                    ? isDark ? 'border-blue-400/40 bg-blue-500/10 shadow-lg shadow-blue-500/10' : 'border-blue-200 bg-blue-50 shadow-sm'
                    : isDark ? 'border-white/10 bg-slate-900/70 hover:border-blue-400/20 hover:bg-slate-900' : 'border-slate-200 bg-slate-50 hover:border-blue-200 hover:bg-white';
                const iconTone = item.accent === 'violet'
                  ? (isActive ? 'bg-violet-600 text-white' : isDark ? 'bg-slate-800 text-violet-300' : 'bg-white text-violet-600 shadow-sm')
                  : (isActive ? 'bg-blue-600 text-white' : isDark ? 'bg-slate-800 text-blue-300' : 'bg-white text-blue-600 shadow-sm');
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(item.path)}
                    className={`rounded-[24px] border p-4 text-left transition-all ${toneClass}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`rounded-2xl p-3 ${iconTone}`}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold">{item.title}</p>
                          <FieldHelp
                            title={item.title}
                            description={item.id === 'photo' ? 'Lane ini fokus ke visual statis seperti hero image, katalog, key visual, dan image prompt.' : 'Lane ini fokus ke video pendek seperti reels, hook 3 detik, storyboard, motion board, dan CTA visual.'}
                            howToUse={item.id === 'photo' ? 'Pakai kalau targetmu butuh gambar/foto. Isi visual brief, style, dan negative prompt, lalu hasilnya lempar ke tim desain atau image generator.' : 'Pakai kalau targetmu butuh video. Isi ide video, motion, platform, dan durasi, lalu hasilnya pakai sebagai storyboard untuk editor atau generator video.'}
                          />
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${item.accent === 'violet' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-300' : 'bg-blue-500/10 text-blue-600 dark:text-blue-300'}`}>
                            {item.badge}
                          </span>
                          {isActive ? (
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                              Active lane
                            </span>
                          ) : null}
                        </div>
                        <p className={`mt-1 text-xs leading-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.description}</p>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{item.helper}</p>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${isDark ? 'bg-white/5 text-slate-300' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>
                            {item.detail}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {workflowChips.map((chip) => (
                <div key={chip.label} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${isDark ? 'bg-slate-900 text-slate-300 ring-1 ring-white/10' : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'}`}>
                  {chip.label}
                  <span className={`ml-2 font-normal ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{chip.note}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-3 xl:w-[320px]">
            <div className={`rounded-[24px] p-4 text-sm ${isDark ? 'bg-slate-900/70 text-slate-300 ring-1 ring-white/10' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em]">Single cockpit</p>
                <FieldHelp
                  title="Single cockpit"
                  description="Panel ini menjelaskan bahwa semua konfigurasi besar sengaja ditaruh di satu halaman supaya pilot tidak pindah-pindah tool."
                  howToUse="Pakai studio kiri untuk generate output. Pakai lane kanan untuk eksekusi publish. Kalau butuh revisi, bolak-baliknya tetap di halaman yang sama."
                />
              </div>
              <p className="mt-2 leading-6">Studio di kiri dipakai buat ngeracik brief, prompt, storyboard, dan blueprint. Panel kanan dipakai untuk publish, schedule, dan lempar ke workflow tim.</p>
            </div>
            <div className={`rounded-[24px] p-4 ${isDark ? 'bg-slate-950/80 ring-1 ring-white/10' : 'bg-slate-50 border border-slate-100'}`}>
              <div className="flex items-center gap-2">
                <Bot size={16} className="text-purple-500" />
                <p className="text-sm font-bold">Pilot workflow</p>
                <FieldHelp
                  title="Pilot workflow"
                  description="Ini urutan kerja paling aman supaya user tidak asal generate tanpa arah."
                  howToUse="Mulai dari brief, refine prompt dan style, baru kirim ke planner atau publish. Kalau output jelek, balik ke step 1 atau 2, bukan langsung publish."
                />
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-2xl px-3 py-2.5 bg-white/70 dark:bg-white/5">
                  <span>1. Generate brief</span>
                  <ArrowRight size={14} className="opacity-60" />
                </div>
                <div className="flex items-center justify-between rounded-2xl px-3 py-2.5 bg-white/70 dark:bg-white/5">
                  <span>2. Refine prompt & style</span>
                  <ArrowRight size={14} className="opacity-60" />
                </div>
                <div className="flex items-center justify-between rounded-2xl px-3 py-2.5 bg-white/70 dark:bg-white/5">
                  <span>3. Kirim ke planner / publish</span>
                  <ArrowRight size={14} className="opacity-60" />
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate(plannerPath)}
                className={`mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold ${isDark ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'}`}
              >
                Buka planner
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.18fr)_minmax(380px,0.82fr)]">
        <AdvancedContentStudio
          isDark={isDark}
          onApplyToComposer={handleApplyStudioText}
          preferredTab={preferredStudioTab}
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
              Panel kanan ini sengaja jadi execution lane. Studio di kiri fokus untuk racik prompt dan output; panel ini fokus buat publish, schedule, dan preview final.
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

          <div className={`rounded-[24px] border-2 border-dashed p-5 transition-colors relative overflow-hidden ${
            isDark ? 'border-slate-600 bg-slate-700/30' : 'border-gray-300 bg-gray-50'
          }`}>
            {mediaPreview ? (
              <img src={mediaPreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-20" />
            ) : null}
            <div className="relative z-10 flex flex-col items-center text-center">
              <ImageIcon className="w-10 h-10 mb-2 text-gray-400" />
              <div className="mb-3 flex items-center gap-2">
                <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Media Upload</p>
                <FieldHelp
                  title="Media Upload"
                  description="Bagian ini dipakai untuk menyiapkan file gambar atau video yang akan dipasangkan dengan caption sebelum publish."
                  howToUse="Klik Get Upload Link kalau file berasal dari luar, atau buka kamera kalau lewat aplikasi mobile. Setelah media siap, cek preview kecil di bawah sebelum publish."
                />
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button onClick={handleGenerateUploadLink} className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded-xl text-sm font-semibold hover:bg-blue-200 transition">
                  <UploadCloud size={16} /> Get Upload Link
                </button>
                {Capacitor.isNativePlatform() && (
                  <button onClick={handleTakePicture} className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 rounded-xl text-sm font-semibold hover:bg-indigo-200 transition">
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
              <FieldHelp
                title="Caption / message"
                description="Area ini adalah composer final yang akan dikirim ke channel tujuan."
                howToUse="Kalau output dari studio sudah cocok, klik tombol pakai ke composer. Setelah itu cek lagi secara manual sebelum save draft, schedule, atau publish."
              />
              <button
                onClick={() => setAiPrompt('')}
                className="text-[10px] font-bold text-blue-500 uppercase hover:underline"
              >
                Clear
              </button>
            </div>

            <div className={`mb-4 p-4 rounded-2xl border-2 border-dashed ${isDark ? 'bg-white/5 ring-1 ring-white/10' : 'border-blue-100 bg-blue-50/50'}`}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-purple-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Quick AI Caption</span>
                <FieldHelp
                  title="Quick AI Caption"
                  description="Generator cepat ini dipakai saat user butuh draft caption singkat tanpa masuk ke studio penuh."
                  howToUse="Isi instruksi sederhana, klik Generate, lalu pakai hasilnya sebagai draft awal. Kalau butuh hasil lebih dalam, balik ke Copy Lab di studio kiri."
                />
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
                  <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Preview kecil ini cukup buat cek rasa final tanpa makan ruang terlalu banyak.</p>
                </div>
              <div className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'bg-white/5 text-slate-300' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>
                {activeMode === 'video' ? 'Video lane' : 'Photo lane'}
              </div>
            </div>
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
