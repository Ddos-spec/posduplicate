import { Camera, ShoppingBag } from 'lucide-react';

type MyCommerSocialLogoProps = {
  size?: number;
  className?: string;
};

export default function MyCommerSocialLogo({
  size = 40,
  className = '',
}: MyCommerSocialLogoProps) {
  const bagSize = Math.max(18, Math.round(size * 0.46));
  const cameraSize = Math.max(12, Math.round(size * 0.26));

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-600 text-white overflow-hidden ${className}`.trim()}
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0 opacity-20">
        <div className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white/30" />
        <div className="absolute -bottom-4 -left-4 h-10 w-10 rounded-full bg-white/15" />
      </div>

      <ShoppingBag
        size={bagSize}
        strokeWidth={2.2}
        className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.25)]"
      />

      <div className="absolute bottom-[12%] right-[10%] rounded-full bg-slate-950/25 p-1 ring-2 ring-white/30 backdrop-blur-sm">
        <Camera size={cameraSize} strokeWidth={2.3} />
      </div>
    </div>
  );
}
