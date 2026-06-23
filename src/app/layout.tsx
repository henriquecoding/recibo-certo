import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Playfair_Display, DM_Sans } from "next/font/google";
import MotionProvider from "@/components/ui/motion/MotionProvider";
import { AuthProvider } from "@/lib/supabase/auth";
import { PerfilProvider } from "@/lib/perfil";
import { SubscricaoProvider } from "@/lib/stripe/subscription";
import DeferredOverlays from "@/components/ui/DeferredOverlays";
import ChromeMobile from "@/components/ChromeMobile";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

// Host canónico servido: o apex (recibocerto.pt) faz 307 para o www, por isso
// a metadata aponta para o www — assim a og:image e o canonical da homepage
// resolvem direto, sem o salto de redirecionamento.
const SITE_URL = "https://www.recibocerto.pt";

// Códigos de verificação de propriedade dos motores de busca.
// O token do Google é PÚBLICO (aparece no <head> para o Search Console
// validar) — fica embebido como omissão para a verificação não depender da
// configuração de ambientes na Vercel. A env var, se definida, tem precedência.
const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
  "i_bvY0e1N1qrkR7hX_XYz-KiWQMr1oHbM3J3GfaT_r0";
const BING_SITE_VERIFICATION = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:
      "Simulador de IRS, Recibos Verdes, Salário e Empresa 2026 | ReciboCerto",
    template: "%s | ReciboCerto",
  },
  description:
    "O copiloto fiscal de quem trabalha em Portugal: simula o IRS anual, recibos verdes, salário líquido e abrir empresa. IRS, Segurança Social e IVA com taxas de 2026 verificadas com fonte legal. Guias, ferramentas e quiz. Grátis, sem registo.",
  keywords: [
    "calculadora recibos verdes 2026",
    "calcular salário líquido 2026",
    "recibo de vencimento 2026",
    "simulador empresa unipessoal portugal",
    "trabalhador por conta de outrem IRS",
    "recibos verdes 2026",
    "IRS trabalhador independente Portugal",
    "segurança social freelancer Portugal",
    "retenção na fonte IRS 2026",
    "isenção IVA artigo 53 2026",
    "IRS jovem 2026",
    "recibos verdes vs empresa portugal",
    "simulador IRS portugal",
    "copiloto fiscal portugal",
    "guia trabalhador independente 2026",
    "ato isolado portugal 2026",
    "comparar regime simplificado e empresa",
    "classificar atividade CIRS portugal",
  ],
  authors: [{ name: "ReciboCerto", url: SITE_URL }],
  creator: "ReciboCerto",
  publisher: "ReciboCerto",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_PT",
    url: SITE_URL,
    siteName: "ReciboCerto",
    title:
      "ReciboCerto — Simuladores de IRS, Recibos Verdes, Salário e Empresa 2026",
    description:
      "O copiloto fiscal de quem trabalha em Portugal. Simula IRS, recibos verdes, salário líquido e empresa — Segurança Social e IVA com taxas 2026 verificadas. Grátis.",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "ReciboCerto — Simuladores de IRS, Recibos Verdes, Salário e Empresa 2026",
    description:
      "Copiloto fiscal em Portugal: simula IRS, recibos verdes, salário líquido e empresa. IRS, SS e IVA com taxas 2026. Guias e ferramentas grátis.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    ...(GOOGLE_SITE_VERIFICATION ? { google: GOOGLE_SITE_VERIFICATION } : {}),
    ...(BING_SITE_VERIFICATION
      ? { other: { "msvalidate.01": BING_SITE_VERIFICATION } }
      : {}),
  },
  category: "finance",
};

export const viewport: Viewport = {
  themeColor: "#1D9E75",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT" className={`${dmSans.variable} ${playfair.variable}`} suppressHydrationWarning>
      <head>
        {/* Aplica o tema antes da pintura (evita flash). Lê a preferência
            guardada ou a do sistema. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{if(localStorage.getItem('recibocerto:theme')==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})()",
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <AuthProvider>
          <SubscricaoProvider>
            <Suspense>
              <PerfilProvider>
                <MotionProvider>
                  {children}
                  <ChromeMobile />
                  <DeferredOverlays />
                </MotionProvider>
              </PerfilProvider>
            </Suspense>
          </SubscricaoProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
