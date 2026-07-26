// ─────────────────────────────────────────────────────────────────────────
//  Logótipo da FIZ.
//  Marca de terceiro: os traçados e as cores são reproduzidos tal como
//  fornecidos pela FIZ e NÃO devem ser recolorizados, recortados nem
//  redesenhados. É por isso o único SVG do projeto com cores fixas — a
//  regra de usar `currentColor` aplica-se à iconografia própria, não a
//  marcas de terceiros.
//
//  O amarelo do fundo (#FAC72B) é a origem da escala `fiz-*` em
//  tailwind.config.ts, que dá coerência a todas as superfícies FIZ.
// ─────────────────────────────────────────────────────────────────────────

export const FIZ_AMARELO = "#FAC72B" as const;

interface FizLogoProps {
  size?: number;
  className?: string;
  /** Quando o logótipo é meramente decorativo (já há texto "FIZ" ao lado). */
  decorativo?: boolean;
}

export default function FizLogo({ size = 24, className = "", decorativo = false }: FizLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 2250 2250"
      xmlns="http://www.w3.org/2000/svg"
      role={decorativo ? "presentation" : "img"}
      aria-hidden={decorativo || undefined}
      aria-label={decorativo ? undefined : "FIZ"}
      className={className}
      style={{ fillRule: "evenodd", clipRule: "evenodd" }}
    >
      <path
        d="M2250,158.824L2250,2091.176C2250,2178.834 2178.834,2250 2091.176,2250L158.824,2250C71.166,2250 0,2178.834 0,2091.176L0,158.824C0,71.166 71.166,0 158.824,0L2091.176,0C2178.834,0 2250,71.166 2250,158.824Z"
        fill={FIZ_AMARELO}
      />
      <g transform="matrix(1,0,0,1,0.02141,-0.318392)">
        <path d="M669.041,1261.245L598.006,1651.809L334.105,1651.809L510.62,672.346C510.62,672.346 535.347,598.827 602.497,598.827L1009.021,598.827L966.07,839.596L743.449,839.596L708.967,1041.347L887.427,1041.347L848.71,1261.245L669.041,1261.245Z" />
        <path d="M1065.466,598.827L875.238,1651.809L1137.54,1651.809L1325.404,598.827L1065.466,598.827Z" />
        <path d="M1390.862,598.827L1349.272,837.372L1614.692,837.372L1250.211,1377.666L1201.816,1651.809L1723.583,1651.809L1768.954,1409.804L1507.314,1409.804L1868.666,869.094L1915.852,598.827L1390.862,598.827Z" />
      </g>
    </svg>
  );
}

/** Logótipo + nome, para cabeçalhos de secção FIZ. */
export function FizMarca({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <FizLogo size={size} className="rounded-[0.28em]" decorativo />
      <span className="font-semibold tracking-tight text-fiz-900">FIZ</span>
    </span>
  );
}
