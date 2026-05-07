import { CircleHelp } from 'lucide-react';

type FieldHelpProps = {
  title: string;
  description: string;
};

export default function FieldHelp({ title, description }: FieldHelpProps) {
  return (
    <span className="relative inline-flex items-center group align-middle">
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:text-blue-500 focus:outline-none focus:text-blue-500"
        title={`${title}: ${description}`}
        aria-label={`${title}: ${description}`}
      >
        <CircleHelp size={14} />
      </button>

      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-64 -translate-x-1/2 rounded-xl bg-slate-900 px-3 py-2 text-left text-[11px] font-normal leading-relaxed text-white shadow-xl group-hover:block group-focus-within:block">
        <span className="block font-semibold">{title}</span>
        <span className="mt-1 block text-slate-200">{description}</span>
      </span>
    </span>
  );
}
