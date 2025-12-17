import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../../store/themeStore';

type PlaceholderPageProps = {
  title: string;
  description?: string;
  backTo?: string;
  backLabel?: string;
};

export default function PlaceholderPage({
  title,
  description = 'Halaman ini belum tersedia untuk modul ini.',
  backTo = '/accounting/dashboard',
  backLabel = 'Kembali ke Dashboard'
}: PlaceholderPageProps) {
  const { isDark } = useThemeStore();
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div
        className={`w-full max-w-xl rounded-xl border p-6 text-center ${
          isDark
            ? 'bg-slate-800 border-slate-700 text-gray-300'
            : 'bg-white border-gray-200 text-gray-600'
        }`}
      >
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h1>
        <p className="mt-2">{description}</p>
        <button
          type="button"
          onClick={() => navigate(backTo)}
          className={`mt-6 px-4 py-2 rounded-lg border transition-colors ${
            isDark
              ? 'border-slate-600 text-gray-200 hover:bg-slate-700'
              : 'border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {backLabel}
        </button>
      </div>
    </div>
  );
}
