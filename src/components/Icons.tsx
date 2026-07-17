import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function IconBase({ size = 18, children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {children}
    </svg>
  );
}

export function GaugeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.8 18.2a8 8 0 1 1 14.4 0" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="m12 14 3.2-4.1" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <circle cx="12" cy="14" fill="currentColor" r="1.3" />
    </IconBase>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" width="7" x="3" y="3" />
      <rect height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" width="7" x="14" y="3" />
      <rect height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" width="7" x="3" y="14" />
      <rect height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" width="7" x="14" y="14" />
    </IconBase>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m15.5 15.5 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </IconBase>
  );
}

export function HistoryIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.2 8.4A8 8 0 1 1 4 14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M4 4v4.8h4.8M12 7.8v4.5l3 1.8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </IconBase>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M19 13.7v-3.4l-2-.5a7 7 0 0 0-.7-1.7l1-1.8-2.4-2.4-1.8 1a7 7 0 0 0-1.7-.7l-.5-2H7.5l-.5 2a7 7 0 0 0-1.7.7l-1.8-1L1.1 6.3l1 1.8a7 7 0 0 0-.7 1.7l-2 .5v3.4l2 .5a7 7 0 0 0 .7 1.7l-1 1.8 2.4 2.4 1.8-1a7 7 0 0 0 1.7.7l.5 2h3.4l.5-2a7 7 0 0 0 1.7-.7l1.8 1 2.4-2.4-1-1.8a7 7 0 0 0 .7-1.7l2-.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" transform="translate(1.5 -.1) scale(.88)" />
    </IconBase>
  );
}

export function ServerIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" width="18" x="3" y="3" />
      <rect height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" width="18" x="3" y="15" />
      <circle cx="7" cy="6" fill="currentColor" r="1" />
      <circle cx="7" cy="18" fill="currentColor" r="1" />
      <path d="M11 6h6M11 18h6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </IconBase>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.5 12h17M12 3c2.3 2.5 3.5 5.5 3.5 9S14.3 18.5 12 21c-2.3-2.5-3.5-5.5-3.5-9S9.7 5.5 12 3Z" stroke="currentColor" strokeWidth="1.5" />
    </IconBase>
  );
}

export function ZapIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M13.3 2.8 5.5 13h6l-.8 8.2L18.5 11h-6l.8-8.2Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </IconBase>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m5 12.5 4.2 4.2L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </IconBase>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </IconBase>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </IconBase>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M19 7.5A8 8 0 1 0 20 14M19 3v4.5h-4.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </IconBase>
  );
}

export function ChevronIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m8 10 4 4 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </IconBase>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </IconBase>
  );
}

export function LogoMark({ size = 34, ...props }: IconProps) {
  return (
    <svg aria-hidden="true" height={size} viewBox="0 0 40 40" width={size} {...props}>
      <defs>
        <linearGradient id="logo-gradient" x1="4" x2="36" y1="4" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#77F2BD" />
          <stop offset="1" stopColor="#34D399" />
        </linearGradient>
      </defs>
      <rect fill="#13251F" height="40" rx="12" width="40" />
      <circle cx="20" cy="20" fill="none" r="11.5" stroke="url(#logo-gradient)" strokeWidth="2" />
      <circle cx="20" cy="20" fill="none" opacity=".55" r="6.5" stroke="url(#logo-gradient)" strokeWidth="1.6" />
      <path d="M20 20 29 13" stroke="url(#logo-gradient)" strokeLinecap="round" strokeWidth="2.3" />
      <circle cx="20" cy="20" fill="#77F2BD" r="2.2" />
    </svg>
  );
}
