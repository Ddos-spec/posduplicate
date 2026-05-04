import { PlugZap } from 'lucide-react';

interface Props {
  isDark: boolean;
  title: string;
  description: string;
  integration: string;
  onSetup: () => void;
}

export function IntegrationEmptyState({ isDark, title, description, integration, onSetup }: Props) {
  return (
    <div className={`rounded-3xl border p-10 flex flex-col items-center text-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-sm'}`}>
      <div className={`rounded-2xl p-4 mb-5 ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
        <PlugZap size={36} className="text-blue-500" />
      </div>
      <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
      <p className={`text-sm max-w-md mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{description}</p>
      <button
        onClick={onSetup}
        className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 font-semibold"
      >
        <PlugZap size={18} />
        Setup {integration}
      </button>
    </div>
  );
}
