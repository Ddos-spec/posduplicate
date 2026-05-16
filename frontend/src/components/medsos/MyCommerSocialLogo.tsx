import { useId } from 'react';

type MyCommerSocialLogoProps = {
  size?: number;
  className?: string;
};

export default function MyCommerSocialLogo({
  size = 40,
  className = '',
}: MyCommerSocialLogoProps) {
  const gradientId = useId().replace(/:/g, '');
  const glowId = useId().replace(/:/g, '');

  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-[22px] shadow-[0_24px_60px_rgba(37,99,235,0.25)] ring-1 ring-white/15 ${className}`.trim()}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 96 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="12" y1="8" x2="82" y2="88" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3BA6FF" />
            <stop offset="0.54" stopColor="#346BFF" />
            <stop offset="1" stopColor="#4343E7" />
          </linearGradient>
          <radialGradient id={glowId} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(24 16) rotate(47.7263) scale(66.0112 59.6576)">
            <stop stopColor="white" stopOpacity="0.46" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="96" height="96" rx="24" fill={`url(#${gradientId})`} />
        <rect x="1.2" y="1.2" width="93.6" height="93.6" rx="22.8" stroke="rgba(255,255,255,0.16)" />
        <rect x="0" y="0" width="96" height="96" rx="24" fill={`url(#${glowId})`} />

        <circle cx="77" cy="20" r="15" fill="white" fillOpacity="0.1" />
        <circle cx="23" cy="77" r="19" fill="white" fillOpacity="0.08" />

        <path
          d="M46.5 23.5C61.92 23.5 74.5 34.52 74.5 47.95C74.5 61.39 61.92 72.4 46.5 72.4C44.03 72.4 41.62 72.12 39.36 71.59L28.6 76.72L31.96 67.59C25.99 63.13 22.5 56.21 22.5 47.95C22.5 34.52 35.01 23.5 46.5 23.5Z"
          fill="white"
          fillOpacity="0.18"
        />
        <path
          d="M46.5 23.5C61.92 23.5 74.5 34.52 74.5 47.95C74.5 61.39 61.92 72.4 46.5 72.4C44.03 72.4 41.62 72.12 39.36 71.59L28.6 76.72L31.96 67.59C25.99 63.13 22.5 56.21 22.5 47.95C22.5 34.52 35.01 23.5 46.5 23.5Z"
          stroke="white"
          strokeWidth="5"
          strokeLinejoin="round"
        />

        <path
          d="M36.2 39.25H38.73L41.18 51.3H56.55L59.55 43.18H42.72"
          stroke="white"
          strokeWidth="5.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="44.4" cy="57.2" r="2.85" fill="white" />
        <circle cx="54.2" cy="57.2" r="2.85" fill="white" />

        <g transform="translate(60.5 55.5)">
          <circle cx="12.5" cy="12.5" r="12.5" fill="#60A5FA" />
          <circle cx="12.5" cy="12.5" r="12" stroke="rgba(255,255,255,0.55)" />
          <path
            d="M18.1 15.35C18.1 18.1 15.51 20.35 12.35 20.35C11.83 20.35 11.33 20.29 10.87 20.18L8.64 21.22L9.36 19.34C8.11 18.47 7.35 17.13 7.35 15.35C7.35 12.61 9.94 10.35 13.1 10.35C16.25 10.35 18.1 12.61 18.1 15.35Z"
            fill="white"
            fillOpacity="0.24"
          />
          <path
            d="M18.1 15.35C18.1 18.1 15.51 20.35 12.35 20.35C11.83 20.35 11.33 20.29 10.87 20.18L8.64 21.22L9.36 19.34C8.11 18.47 7.35 17.13 7.35 15.35C7.35 12.61 9.94 10.35 13.1 10.35C16.25 10.35 18.1 12.61 18.1 15.35Z"
            stroke="white"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <circle cx="10.4" cy="15.35" r="1.1" fill="white" />
          <circle cx="13.2" cy="15.35" r="1.1" fill="white" />
          <circle cx="16" cy="15.35" r="1.1" fill="white" />
        </g>
      </svg>

      <div
        className="pointer-events-none absolute inset-[1px] rounded-[21px] border border-white/10"
        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)' }}
      />

      <span className="sr-only">MyCommerSocial</span>
    </div>
  );
}
