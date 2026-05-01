import { useId } from 'react';

type MyMedsosLogoProps = {
  size?: number;
  className?: string;
};

export default function MyMedsosLogo({
  size = 40,
  className = '',
}: MyMedsosLogoProps) {
  const id = useId().replace(/:/g, '');
  const gradientId = `mymedsos-bg-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      aria-label="MyMedsos logo"
      role="img"
      className={className}
    >
      <defs>
        <linearGradient id={gradientId} x1="32" y1="18" x2="224" y2="238" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#32B8FF" />
          <stop offset="100%" stopColor="#2E63FF" />
        </linearGradient>
      </defs>

      <rect width="256" height="256" rx="52" fill={`url(#${gradientId})`} />

      <g opacity="0.14" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round">
        <path d="M202 12l10 10" />
        <path d="M212 12l16 16" />
        <path d="M222 12l22 22" />
        <path d="M232 12l12 12" />

        <path d="M12 202l10 10" />
        <path d="M12 212l16 16" />
        <path d="M12 222l22 22" />
        <path d="M12 232l12 12" />
      </g>

      <path
        d="M95 92l33-34 33 34c4 4 4 10 0 14l-8 8H103l-8-8c-4-4-4-10 0-14Z"
        fill="#FFFFFF"
      />

      <path
        d="M79 171c0-30 7-57 21-74 7-9 15-15 28-22"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="28"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M177 171c0-30-7-57-21-74-7-9-15-15-28-22"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="28"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
