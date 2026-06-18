// Ícones SVG do sistema. Sem emojis — todos os pictogramas são vetoriais,
// herdam a cor via `currentColor` e escalam por `size`.
import type { ReactNode } from "react";

interface IconProps {
  size?: number;
  className?: string;
}

function svgProps(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    className,
    "aria-hidden": true,
    focusable: false,
  } as const;
}

export function CheckTrend({ size = 14, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M3 17l6-6 4 4 7-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowRight({ size = 14, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Cookie({ size = 16, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path
        d="M12 3a9 9 0 1 0 9 9 3.4 3.4 0 0 1-4.1-4.1A3.4 3.4 0 0 1 12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="13" r="1" fill="currentColor" />
      <circle cx="13" cy="16" r="1" fill="currentColor" />
      <circle cx="15.5" cy="11" r="1" fill="currentColor" />
    </svg>
  );
}

export function Plus({ size = 12, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Check({ size = 12, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M5 12l4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Selos de confiança (cadeado, escudo, bandeira) ──────────
export function Lock({ size = 14, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 11V8a4 4 0 118 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ShieldCheck({ size = 14, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Flag({ size = 14, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M5 21V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 4h11l-2 3.5L16 11H5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function Warning({ size = 12, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M12 8v5M12 16.5v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 3l9 16H3l9-16z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Ícones de funcionalidades ───────────────────────────────
export function BellAlert({ size = 22, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10 19a2 2 0 004 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Wallet({ size = 22, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <rect x="3" y="6" width="18" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16.5" cy="14.5" r="1.3" fill="currentColor" />
    </svg>
  );
}

export function ChartProjection({ size = 22, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M4 20V4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M4 20h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7 16l4-5 3 2 5-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function History({ size = 22, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M4 12a8 8 0 108-8 8 8 0 00-6 2.7L4 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 5v4h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Export({ size = 22, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M12 15V4M8 8l4-4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 14v4a2 2 0 002 2h10a2 2 0 002-2v-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Clock({ size = 22, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LayoutGrid({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function Receipt({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21V3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 8h6M9 12h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Calendar({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Calculator({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <rect x="5" y="3" width="14" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 7h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Pencil({ size = 15, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M4 20h4l10-10a2.8 2.8 0 00-4-4L4 16v4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M13.5 6.5l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Trash({ size = 16, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Scale({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M12 3v18M7 21h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5 7h14l3 7a4 4 0 01-8 0l3-7M5 7l-3 7a4 4 0 008 0L5 7M5 7l7-1.5L19 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function User({ size = 16, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 20a7 7 0 0114 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function ArrowLeft({ size = 14, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M19 12H6M11 6l-5 6 5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Close({ size = 14, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Menu({ size = 20, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Search({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Sparkle({ size = 14, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function Rocket({ size = 14, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M12 2C7 2 4 7 4 12c0 1 .2 2 .5 3L8 17.5C9 17.8 10 18 11 18h2c1 0 2-.2 3-.5L19.5 15c.3-1 .5-2 .5-3 0-5-3-10-8-10z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 18l-2 4M17 18l2 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// ─── Ícones de parceiros ─────────────────────────────────────
export function Bank({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M3 21h18M3 10h18M12 3l9 7H3l9-7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M7 10v7M12 10v7M17 10v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Building({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M3 21V8l9-5 9 5v13" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 21v-5h6v5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="8" y="9.5" width="2" height="2" rx="0.4" fill="currentColor" />
      <rect x="14" y="9.5" width="2" height="2" rx="0.4" fill="currentColor" />
      <rect x="8" y="13.5" width="2" height="2" rx="0.4" fill="currentColor" />
      <rect x="14" y="13.5" width="2" height="2" rx="0.4" fill="currentColor" />
    </svg>
  );
}

export function FileSign({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V8l-6-5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 3v5h5M8 12h8M8 16h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function MapPin({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function Info({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 11v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="7.8" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function Minus({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Crosshair({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 1.5v3M12 19.5v3M22.5 12h-3M4.5 12h-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Move({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path
        d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Heart({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M12 21C5.5 17.4 3 13.5 3 10a5 5 0 0110-1 1 1 0 002 0 5 5 0 0110 1c0 3.5-2.5 7.4-9 11z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function Invoice({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V8l-6-5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 11h8M8 14h5M8 17h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Laptop({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <rect x="2" y="4" width="20" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2 17h20l1.5 3H0.5L2 17z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 9h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function ShoppingBag({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M6 2l2 4h8l2-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="6" width="18" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 11a3 3 0 006 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Home({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M3 10.5L12 3l9 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 8.5V20a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Briefcase({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <rect x="2" y="8" width="20" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 8V6a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M2 14h20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 14v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function PenLine({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M12 20h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Megaphone({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M3 11v2a6 6 0 006 6h1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 5.5C21 5.5 17 8 12 8H7a4 4 0 000 8h5c5 0 9 2.5 9 2.5V5.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function Monitor({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <rect x="2" y="3" width="20" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Smartphone({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <rect x="5" y="2" width="14" height="20" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 18h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Eye({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function EyeOff({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M10.73 10.73A2 2 0 0013.27 13.27M3 3l18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GripVertical({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <circle cx="9" cy="6" r="1.2" fill="currentColor" />
      <circle cx="15" cy="6" r="1.2" fill="currentColor" />
      <circle cx="9" cy="12" r="1.2" fill="currentColor" />
      <circle cx="15" cy="12" r="1.2" fill="currentColor" />
      <circle cx="9" cy="18" r="1.2" fill="currentColor" />
      <circle cx="15" cy="18" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function GoogleAds({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <circle cx="17.5" cy="6.5" r="3.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="6.5" cy="17.5" r="3.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.19 5.19l13.62 13.62" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function ImageIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <rect x="3" y="3" width="18" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Link({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Copy({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Mail({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <rect x="2" y="4" width="20" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2 7l10 7 10-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ExternalLink({ size = 14, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronRight({ size = 16, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronDown({ size = 16, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Swap({ size = 14, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M7 4L3 8l4 4M3 8h12M17 20l4-4-4-4M21 16H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronUp({ size = 16, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Filter({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Pagamentos ─────────────────────────────────────────────
export function MBWayIcon({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden focusable={false}>
      <rect x="3" y="2" width="18" height="20" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 17h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 8l2 4 2-4 2 4 2-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MultibancoIcon({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden focusable={false}>
      <rect x="2" y="4" width="20" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2 9h20" stroke="currentColor" strokeWidth="1.6" />
      <rect x="5" y="13" width="5" height="3" rx="0.8" stroke="currentColor" strokeWidth="1.4" />
      <path d="M14 14h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function Spinner({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`animate-spin ${className ?? ""}`} aria-hidden focusable={false}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path d="M12 2a10 10 0 019.5 6.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ─── Gamificação / engagement ───────────────────────────────
// Path idêntico ao Lucide "Flame" — stroke currentColor como todos os outros ícones
export function Fire({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path
        d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PaperClip({ size = 20, className }: IconProps) {
  const h = Math.round(size * 2.6);
  return (
    <svg width={size} height={h} viewBox="0 0 20 52" fill="none" className={className} aria-hidden focusable={false}>
      <path d="M15 11C15 5 5 5 5 11L5 38C5 47 15 47 15 38L15 21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M10 11L10 38C10 43 15 43 15 38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Lightbulb({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M9 18h6M10 21h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 2a7 7 0 00-4 12.7V16h8v-1.3A7 7 0 0012 2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Star({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function Zap({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Settings({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Trophy({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M6 4h12v6a6 6 0 01-12 0V4z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 7H2a2 2 0 001.5 2M20 7h2a2 2 0 01-1.5 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 16v4M8 20h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Coin({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7v1M12 16v1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 10a3 3 0 015 2.24c0 1.56-1 2.76-3 3.76" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Target({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function BookOpen({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M2 4a2 2 0 012-2h7v18H4a2 2 0 01-2-2V4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M22 4a2 2 0 00-2-2h-7v18h7a2 2 0 002-2V4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M11 4v14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function SkipForward({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <polygon points="5,4 15,12 5,20" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
      <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Repeat({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M17 1l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 11V9a4 4 0 014-4h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 23l-4-4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 13v2a4 4 0 01-4 4H3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Shield({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function Volume({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
      <path d="M15.54 8.46a5 5 0 010 7.07" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M19.07 4.93a10 10 0 010 14.14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function VolumeOff({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
      <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Keyboard({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <rect x="2" y="5" width="20" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M10 13h.01M14 13h.01M18 13h.01M8 17h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function RotateCcw({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M3 12a9 9 0 109-9H3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 3v6h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LogOut({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="16,17 21,12 16,7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Award({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <circle cx="12" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Gauge({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 12L8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 16.5a6 6 0 0110 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function BarChart2({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <rect x="18" y="3" width="4" height="18" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="10" y="8" width="4" height="13" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="2" y="13" width="4" height="8" rx="1" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function Google({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M21.805 10.023H12.18v3.955h5.52c-.237 1.28-1.024 2.362-2.183 3.087v2.566h3.536c2.07-1.906 3.265-4.716 3.265-8.036 0-.524-.047-1.03-.13-1.523l-.383-.05z" stroke="none" fill="currentColor" />
      <path d="M12.18 22c2.77 0 5.095-.917 6.793-2.492l-3.536-2.566c-.918.616-2.094.98-3.257.98-2.505 0-4.626-1.69-5.384-3.966H3.146v2.634A10.003 10.003 0 0012.18 22z" stroke="none" fill="currentColor" opacity=".8" />
      <path d="M6.796 13.956A6.025 6.025 0 016.48 12c0-.679.117-1.34.316-1.956V7.41H3.146A10.003 10.003 0 002 12c0 1.614.386 3.14 1.146 4.59l3.65-2.634z" stroke="none" fill="currentColor" opacity=".6" />
      <path d="M12.18 6.078c1.413 0 2.68.487 3.677 1.44l2.759-2.76C16.942 3.178 14.79 2.18 12.18 2.18A10.003 10.003 0 003.146 7.41l3.65 2.634c.758-2.277 2.879-3.966 5.384-3.966z" stroke="none" fill="currentColor" opacity=".7" />
    </svg>
  );
}

export function GitHub({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" stroke="none" fill="currentColor" />
    </svg>
  );
}

export function Linkedin({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" stroke="none" fill="currentColor" />
    </svg>
  );
}

// ─── Marca do ícone (V2) ────────────────────────────────────
export function LogoMark({ size = 28, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 500 500" fill="none" className={className} aria-hidden focusable={false}>
      <path d="M401.84 287.26V79.76c0-3.85-1.53-7.54-4.25-10.26a14.52 14.52 0 00-10.26-4.26H97.87L401.84 287.26z" fill="#0F3F25" transform="matrix(1,0,0,-1,0,500)"/>
      <path d="M104.23 46.99c-6.15-4.6-14.37-5.33-21.24-1.89-6.87 3.44-11.2 10.46-11.2 18.14 0 97.06 0 335.09 0 335.09 0 15.6 6.2 30.56 17.23 41.59 11.03 11.03 25.99 17.23 41.6 17.23h273.98c6.26 0 12.27-2.49 16.7-6.92 4.43-4.43 6.92-10.44 6.92-16.7V297.57c0-5.39-2.54-10.47-6.86-13.69C381.92 254.42 183.21 105.99 104.23 46.99z" fill="#05815F" transform="matrix(1,0,0,-1,0,500)"/>
      <path d="M133.27 50.54c-1.45-1.09-2.05-2.99-1.47-4.71.57-1.72 2.19-2.89 4-2.89h58.37c2.13 0 4.21.63 5.98 1.81 25.89 17.21 228.06 151.57 228.06 151.57v61.85c0 2.51-1.42 4.81-3.67 5.94-2.25 1.12-4.94.88-6.95-.62C370.35 228.09 179.54 85.19 133.27 50.54z" fill="#0E6740" transform="matrix(1,0,0,-1,0,500)"/>
      <path d="M428.21 383.42v23.69s-220.96-104.97-241.78-114.86c-.97-.46-2.12-.37-3 .24-8.51 5.83-52.79 36.16-77.01 52.76-2.43 1.67-5.65 1.64-7.25-.08-1.6-1.15-2.67-3.18-1.88-6.02 10.67-38.41 34.93-125.74 43.75-157.52.74-2.67 2.76-4.8 5.38-5.69 2.63-.89 5.52-.44 7.73 1.22 50.19 37.83 275.67 213.09 275.67 213.09z" fill="#EAF7EB" transform="matrix(1,0,0,-1,0,500)"/>
    </svg>
  );
}

// ─── Logótipo (marca de palavra) ─────────────────────────────
export function Logo({ small = false }: { small?: boolean }): ReactNode {
  const sz = small ? 24 : 28;
  const text = small ? "text-sm" : "text-[1.1rem]";
  return (
    <div className="flex items-center gap-2">
      <LogoMark size={sz} />
      <span className={`font-display font-semibold text-stone-800 dark:text-stone-100 ${text}`}>
        Recibo<span className="text-brand">Certo</span>
      </span>
    </div>
  );
}
