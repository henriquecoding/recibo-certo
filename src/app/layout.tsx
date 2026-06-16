import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import MotionProvider from "@/components/ui/motion/MotionProvider";
import { AuthProvider } from "@/lib/supabase/auth";
import AuthModal from "@/components/ui/AuthModal";
import NovidadesModal from "@/components/ui/NovidadesModal";
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

// Códigos de verificação de propriedade dos motores de busca. Definir como
// variáveis de ambiente (ver `.env.example` e `docs/SEO.md`). Ficam fora do
// código para não expor tokens no repositório e permitir rotação fácil.
const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const BING_SITE_VERIFICATION = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Calculadora de Recibos Verdes 2026 | ReciboCerto",
    template: "%s | ReciboCerto",
  },
  description:
    "Calcula ao segundo o que fica teu após IRS, Segurança Social e IVA. Taxas portuguesas de 2026 verificadas com fonte legal. Grátis, sem registo. Experimenta agora.",
  keywords: [
    "calculadora recibos verdes",
    "recibos verdes 2026",
    "IRS trabalhador independente Portugal",
    "segurança social freelancer Portugal",
    "retenção na fonte recibos verdes",
    "quanto pago segurança social recibos verdes",
    "isenção IVA artigo 53 2026",
    "IRS jovem 2026",
    "calculadora freelancer Portugal",
    "recibos verdes vs empresa portugal",
    "trabalhador independente impostos 2026",
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
    title: "Calculadora de Recibos Verdes 2026 — ReciboCerto",
    description:
      "Sabe exatamente o que fica teu após IRS, SS e IVA. Taxas 2026 verificadas com fonte legal. Grátis e sem registo.",
    // A imagem é gerada por `src/app/opengraph-image.tsx` (convenção do Next) e
    // aplicada automaticamente a todas as páginas que não definam a sua própria.
  },
  twitter: {
    card: "summary_large_image",
    title: "Calculadora de Recibos Verdes 2026 — ReciboCerto",
    description:
      "Quanto fica realmente teu após IRS, SS e IVA. Taxas 2026 verificadas. Grátis.",
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
          <MotionProvider>
            {children}
            <AuthModal />
            <NovidadesModal />
          </MotionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
