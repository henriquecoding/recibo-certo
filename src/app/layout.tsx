import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import MotionProvider from "@/components/ui/motion/MotionProvider";
import { AuthProvider } from "@/lib/supabase/auth";
import { PerfilProvider } from "@/lib/perfil";
import { SubscricaoProvider } from "@/lib/stripe/subscription";
import AuthModal from "@/components/ui/AuthModal";
import NovidadesModal from "@/components/ui/NovidadesModal";
import CookieConsent from "@/components/ui/CookieConsent";
import BuscaOverlay from "@/components/busca/BuscaGlobal";
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

const SITE_URL = "https://recibocerto.pt";

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
    default: "ReciboCerto — o teu líquido real: recibos verdes e salário 2026",
    template: "%s | ReciboCerto",
  },
  description:
    "Trabalhador independente, por conta de outrem ou futuro empresário? Vê em segundos o impacto do IRS, da Segurança Social e do IVA — e quanto fica realmente teu. Taxas de 2026 verificadas com fonte legal. Grátis, sem registo.",
  keywords: [
    "calculadora recibos verdes",
    "calcular salário líquido 2026",
    "recibo de vencimento 2026",
    "trabalhador por conta de outrem IRS",
    "recibos verdes 2026",
    "IRS trabalhador independente Portugal",
    "segurança social freelancer Portugal",
    "retenção na fonte IRS 2026",
    "isenção IVA artigo 53 2026",
    "IRS jovem 2026",
    "recibos verdes vs empresa portugal",
    "simulador IRS portugal",
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
    title: "ReciboCerto — quanto fica realmente teu, do recibo ao salário",
    description:
      "Para independentes, trabalhadores por conta de outrem e futuros empresários: o impacto do IRS, da Segurança Social e do IVA em segundos. Taxas 2026 verificadas. Grátis e sem registo.",
    // A imagem é gerada por `src/app/opengraph-image.tsx` (convenção do Next) e
    // aplicada automaticamente a todas as páginas que não definam a sua própria.
  },
  twitter: {
    card: "summary_large_image",
    title: "ReciboCerto — quanto fica realmente teu, do recibo ao salário",
    description:
      "Do recibo verde ao salário: vê quanto fica realmente teu após IRS, SS e IVA. Taxas 2026 verificadas. Grátis.",
    // Imagem via `src/app/twitter-image.tsx`.
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
            <PerfilProvider>
              <MotionProvider>
                {children}
                <ChromeMobile />
                <BuscaOverlay />
                <AuthModal />
                <NovidadesModal />
                <CookieConsent />
              </MotionProvider>
            </PerfilProvider>
          </SubscricaoProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
