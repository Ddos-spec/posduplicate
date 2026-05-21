export const OMNIPILOT_BRAND_NAME = 'OmniPilot AI';
export const OMNIPILOT_APK_FILENAME = 'omnipilot-ai-latest.apk';
export const OMNIPILOT_APK_PATH = `/downloads/${OMNIPILOT_APK_FILENAME}`;

interface OmnipilotMarkProps {
  size?: number;
  className?: string;
}

export function OmnipilotMark({ size = 40, className = '' }: OmnipilotMarkProps) {
  return (
    <img
      src="/branding/omnipilot-mark.svg"
      alt={OMNIPILOT_BRAND_NAME}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size }}
      loading="eager"
    />
  );
}

interface OmnipilotBrandProps {
  className?: string;
  markSize?: number;
  titleClassName?: string;
  subtitleClassName?: string;
  subtitle?: string;
  showSubtitle?: boolean;
}

export default function OmnipilotBrand({
  className = '',
  markSize = 44,
  titleClassName = '',
  subtitleClassName = '',
  subtitle = 'AI Command Center',
  showSubtitle = true,
}: OmnipilotBrandProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <OmnipilotMark size={markSize} className="shrink-0" />
      <div className="min-w-0">
        <span className={`block leading-none font-bold ${titleClassName}`.trim()}>{OMNIPILOT_BRAND_NAME}</span>
        {showSubtitle ? (
          <span className={`mt-1 block text-[11px] font-semibold uppercase tracking-[0.22em] ${subtitleClassName}`.trim()}>
            {subtitle}
          </span>
        ) : null}
      </div>
    </div>
  );
}
