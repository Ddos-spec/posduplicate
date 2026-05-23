import { CircleHelp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type FieldHelpProps = {
  title: string;
  description: string;
  howToUse?: string;
};

export default function FieldHelp({ title, description, howToUse }: FieldHelpProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const usageGuide =
    howToUse ||
    'Klik atau buka bagian ini, baca ringkasan yang tampil, lalu isi atau jalankan aksi sesuai konteks fitur tersebut sebelum menyimpan perubahan.';

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const ariaText = `${title}. Ini apa: ${description}. Cara pakai: ${usageGuide}`;

  return (
    <span ref={rootRef} className="relative inline-flex items-center align-middle">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full transition focus:outline-none ${
          open ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-200 dark:ring-blue-400/30' : 'text-slate-400 hover:text-blue-500 focus:text-blue-500'
        }`}
        title={ariaText}
        aria-label={ariaText}
        aria-expanded={open}
      >
        <CircleHelp size={14} />
      </button>

      <span className={`absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 rounded-2xl bg-slate-900 px-3 py-3 text-left text-[11px] font-normal leading-relaxed text-white shadow-2xl ring-1 ring-white/10 transition ${open ? 'visible opacity-100' : 'pointer-events-none invisible opacity-0'}`}>
        <span className="block font-semibold">{title}</span>
        <span className="mt-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-blue-200">Ini apa</span>
        <span className="mt-1 block text-slate-200">{description}</span>
        <span className="mt-3 block text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200">Cara pakai</span>
        <span className="mt-1 block text-slate-200">{usageGuide}</span>
      </span>
    </span>
  );
}
