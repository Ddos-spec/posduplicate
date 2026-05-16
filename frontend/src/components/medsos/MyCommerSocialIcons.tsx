import type { ReactNode, SVGProps } from 'react';

export type McsIconProps = {
  size?: number;
  className?: string;
};

type BaseIconProps = McsIconProps & {
  viewBox?: string;
  children: ReactNode;
};

function BaseIcon({
  size = 20,
  className = '',
  viewBox = '0 0 24 24',
  children,
}: BaseIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function StrokePath(props: SVGProps<SVGPathElement>) {
  return <path stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props} />;
}

function StrokeCircle(props: SVGProps<SVGCircleElement>) {
  return <circle stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props} />;
}

function SoftFill(props: SVGProps<SVGPathElement>) {
  return <path fill="currentColor" fillOpacity={0.14} {...props} />;
}

function SoftRect(props: SVGProps<SVGRectElement>) {
  return <rect fill="currentColor" fillOpacity={0.12} {...props} />;
}

export function McsOverviewIcon({ size = 20, className = '' }: McsIconProps) {
  return (
    <BaseIcon size={size} className={className}>
      <SoftRect x="3.5" y="4" width="7.5" height="7.5" rx="2.2" />
      <SoftRect x="13" y="4" width="7.5" height="5.2" rx="2.2" />
      <SoftRect x="13" y="11.2" width="7.5" height="8.8" rx="2.2" />
      <SoftRect x="3.5" y="13.4" width="7.5" height="6.6" rx="2.2" />
      <StrokePath d="M6.3 7.75h2.3" />
      <StrokePath d="M15.8 6.7h1.9" />
      <StrokePath d="M15.8 14.9h2.1" />
      <StrokePath d="M6.2 16.7h2.5" />
    </BaseIcon>
  );
}

export function McsConnectionsIcon({ size = 20, className = '' }: McsIconProps) {
  return (
    <BaseIcon size={size} className={className}>
      <SoftRect x="5" y="4" width="6.2" height="7.4" rx="2.4" />
      <SoftRect x="12.8" y="12.2" width="6.2" height="7.4" rx="2.4" />
      <StrokePath d="M8.1 11.4v2.1c0 1.4 1.1 2.5 2.5 2.5h2.2" />
      <StrokePath d="M8.1 8.6V6.9" />
      <StrokePath d="M15.9 17.2v-1.7" />
      <StrokePath d="M7.1 6.8h2" />
      <StrokePath d="M14.9 17.1h2" />
      <StrokeCircle cx="17.7" cy="6.5" r="2.1" />
    </BaseIcon>
  );
}

export function McsPlannerIcon({ size = 20, className = '' }: McsIconProps) {
  return (
    <BaseIcon size={size} className={className}>
      <SoftRect x="4" y="5" width="16" height="15" rx="3.4" />
      <StrokePath d="M7.5 3.8v3.1" />
      <StrokePath d="M16.5 3.8v3.1" />
      <StrokePath d="M4.8 9.2h14.4" />
      <SoftFill d="M12 12.2l.88 1.8 1.99.28-1.43 1.39.34 1.95L12 16.6l-1.78 1.02.34-1.95-1.43-1.39 1.99-.28.88-1.8Z" />
      <StrokePath d="M12 12.2l.88 1.8 1.99.28-1.43 1.39.34 1.95L12 16.6l-1.78 1.02.34-1.95-1.43-1.39 1.99-.28.88-1.8Z" />
    </BaseIcon>
  );
}

export function McsInboxIcon({ size = 20, className = '' }: McsIconProps) {
  return (
    <BaseIcon size={size} className={className}>
      <SoftFill d="M12.2 4.3c4.02 0 7.3 2.63 7.3 5.89 0 3.27-3.28 5.9-7.3 5.9-.68 0-1.35-.08-1.98-.24L6.55 18l1.06-2.8c-1.62-1.1-2.61-2.79-2.61-5.01 0-3.26 3.28-5.89 7.2-5.89Z" />
      <StrokePath d="M12.2 4.3c4.02 0 7.3 2.63 7.3 5.89 0 3.27-3.28 5.9-7.3 5.9-.68 0-1.35-.08-1.98-.24L6.55 18l1.06-2.8c-1.62-1.1-2.61-2.79-2.61-5.01 0-3.26 3.28-5.89 7.2-5.89Z" />
      <StrokeCircle cx="10.1" cy="10.2" r="0.55" />
      <StrokeCircle cx="13.1" cy="10.2" r="0.55" />
      <StrokeCircle cx="16.1" cy="10.2" r="0.55" />
      <SoftRect x="15.5" y="13.6" width="4.3" height="4.3" rx="2.15" />
      <StrokePath d="M16.9 15.7h1.5" />
    </BaseIcon>
  );
}

export function McsSocialIcon({ size = 20, className = '' }: McsIconProps) {
  return (
    <BaseIcon size={size} className={className}>
      <SoftRect x="4.2" y="5" width="9.8" height="8.6" rx="3.1" />
      <SoftRect x="10" y="8.2" width="9.8" height="8.6" rx="3.1" />
      <StrokePath d="M7.2 13.6 8 11.9" />
      <StrokePath d="M15.7 16.8 16.6 14.9" />
      <StrokePath d="M14.6 9.5c.66-.7 1.72-.7 2.38 0l.17.18.17-.18c.66-.7 1.72-.7 2.38 0 .66.69.66 1.81 0 2.5l-2.55 2.52-2.55-2.52c-.66-.69-.66-1.81 0-2.5Z" />
    </BaseIcon>
  );
}

export function McsMarketplaceIcon({ size = 20, className = '' }: McsIconProps) {
  return (
    <BaseIcon size={size} className={className}>
      <SoftRect x="5" y="7.2" width="10.6" height="11.2" rx="2.8" />
      <SoftRect x="13.6" y="5.2" width="5.4" height="7.8" rx="2.2" />
      <StrokePath d="M8 9.5V8.6c0-2 1.62-3.6 3.62-3.6s3.63 1.6 3.63 3.6v.9" />
      <StrokePath d="M7.7 11.4h7.1" />
      <StrokeCircle cx="10.1" cy="14.7" r="0.55" />
      <StrokeCircle cx="13.1" cy="14.7" r="0.55" />
    </BaseIcon>
  );
}

export function McsAdsIcon({ size = 20, className = '' }: McsIconProps) {
  return (
    <BaseIcon size={size} className={className}>
      <SoftRect x="5" y="12.6" width="6.2" height="5.8" rx="2.2" />
      <SoftFill d="M7 8.3c2.65-.27 5.04-1.7 6.55-3.93.54-.79 1.75-.38 1.75.59v10.1c0 .97-1.2 1.38-1.75.59-1.51-2.23-3.9-3.66-6.55-3.93V8.3Z" />
      <StrokePath d="M7 8.3c2.65-.27 5.04-1.7 6.55-3.93.54-.79 1.75-.38 1.75.59v10.1c0 .97-1.2 1.38-1.75.59-1.51-2.23-3.9-3.66-6.55-3.93V8.3Z" />
      <StrokePath d="M17.5 8.1c1.06.63 1.77 1.78 1.77 3.1s-.71 2.47-1.77 3.1" />
      <StrokePath d="M6.4 13.3v3.5" />
    </BaseIcon>
  );
}

export function McsCrmIcon({ size = 20, className = '' }: McsIconProps) {
  return (
    <BaseIcon size={size} className={className}>
      <SoftRect x="9.2" y="4.2" width="5.6" height="4.7" rx="2.2" />
      <SoftRect x="3.5" y="14.1" width="5.4" height="5.1" rx="2.2" />
      <SoftRect x="15.1" y="14.1" width="5.4" height="5.1" rx="2.2" />
      <StrokePath d="M12 9v2.3" />
      <StrokePath d="M6.2 14.1v-1.3c0-.83.67-1.5 1.5-1.5H16.3c.83 0 1.5.67 1.5 1.5v1.3" />
      <StrokePath d="M5.4 16.6h1.6" />
      <StrokePath d="M17 16.6h1.6" />
      <StrokeCircle cx="12" cy="16.6" r="2.2" />
      <StrokePath d="M10.9 16.6 11.7 17.4 13.2 15.9" />
    </BaseIcon>
  );
}

export function McsAnalyticsIcon({ size = 20, className = '' }: McsIconProps) {
  return (
    <BaseIcon size={size} className={className}>
      <SoftRect x="4.5" y="13.4" width="3.2" height="5.6" rx="1.4" />
      <SoftRect x="9.2" y="10.6" width="3.2" height="8.4" rx="1.4" />
      <SoftRect x="13.9" y="7.6" width="3.2" height="11.4" rx="1.4" />
      <StrokePath d="M4 18.9h16" />
      <StrokePath d="M5.9 9.8 9 7.6l3 2.1 4.1-4.2" />
      <StrokePath d="M14.9 5.5h2.8v2.8" />
    </BaseIcon>
  );
}

export function McsTeamIcon({ size = 20, className = '' }: McsIconProps) {
  return (
    <BaseIcon size={size} className={className}>
      <SoftRect x="3.8" y="13.1" width="5" height="5.6" rx="2.2" />
      <SoftRect x="15.2" y="13.1" width="5" height="5.6" rx="2.2" />
      <SoftRect x="8.5" y="11.2" width="7" height="8.1" rx="2.6" />
      <StrokeCircle cx="7.2" cy="9" r="1.9" />
      <StrokeCircle cx="12" cy="7.6" r="2.2" />
      <StrokeCircle cx="16.8" cy="9" r="1.9" />
      <StrokePath d="M10.5 15.3 11.6 16.4 13.7 14.3" />
    </BaseIcon>
  );
}

export function McsSettingsIcon({ size = 20, className = '' }: McsIconProps) {
  return (
    <BaseIcon size={size} className={className}>
      <SoftFill d="M12 4.4c.65 0 1.18.46 1.3 1.09l.18.9c.19.07.38.15.56.24l.8-.39c.57-.28 1.26-.15 1.68.31l.77.84c.41.45.48 1.12.17 1.64l-.44.74c.08.2.15.4.21.61l.96.18c.64.12 1.11.66 1.11 1.29v1.08c0 .63-.47 1.17-1.11 1.29l-.96.18c-.06.21-.13.41-.21.61l.44.74c.31.52.24 1.19-.17 1.64l-.77.84c-.42.46-1.11.59-1.68.31l-.8-.39c-.18.09-.37.17-.56.24l-.18.9A1.32 1.32 0 0 1 12 19.6h-1.08c-.65 0-1.18-.46-1.3-1.09l-.18-.9a5.3 5.3 0 0 1-.56-.24l-.8.39c-.57.28-1.26.15-1.68-.31l-.77-.84a1.33 1.33 0 0 1-.17-1.64l.44-.74c-.08-.2-.15-.4-.21-.61l-.96-.18A1.32 1.32 0 0 1 3.6 12v-1.08c0-.63.47-1.17 1.11-1.29l.96-.18c.06-.21.13-.41.21-.61l-.44-.74a1.33 1.33 0 0 1 .17-1.64l.77-.84c.42-.46 1.11-.59 1.68-.31l.8.39c.18-.09.37-.17.56-.24l.18-.9c.12-.63.65-1.09 1.3-1.09H12Z" />
      <StrokePath d="M12 4.4c.65 0 1.18.46 1.3 1.09l.18.9c.19.07.38.15.56.24l.8-.39c.57-.28 1.26-.15 1.68.31l.77.84c.41.45.48 1.12.17 1.64l-.44.74c.08.2.15.4.21.61l.96.18c.64.12 1.11.66 1.11 1.29v1.08c0 .63-.47 1.17-1.11 1.29l-.96.18c-.06.21-.13.41-.21.61l.44.74c.31.52.24 1.19-.17 1.64l-.77.84c-.42.46-1.11.59-1.68.31l-.8-.39c-.18.09-.37.17-.56.24l-.18.9A1.32 1.32 0 0 1 12 19.6h-1.08c-.65 0-1.18-.46-1.3-1.09l-.18-.9a5.3 5.3 0 0 1-.56-.24l-.8.39c-.57.28-1.26.15-1.68-.31l-.77-.84a1.33 1.33 0 0 1-.17-1.64l.44-.74c-.08-.2-.15-.4-.21-.61l-.96-.18A1.32 1.32 0 0 1 3.6 12v-1.08c0-.63.47-1.17 1.11-1.29l.96-.18c.06-.21.13-.41.21-.61l-.44-.74a1.33 1.33 0 0 1 .17-1.64l.77-.84c.42-.46 1.11-.59 1.68-.31l.8.39c.18-.09.37-.17.56-.24l.18-.9c.12-.63.65-1.09 1.3-1.09H12Z" />
      <StrokeCircle cx="12" cy="12" r="2.55" />
    </BaseIcon>
  );
}
