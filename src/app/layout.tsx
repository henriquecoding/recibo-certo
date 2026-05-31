import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import MotionProvider from "@/components/ui/motion/MotionProvider";
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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ReciboCerto — Calculadora de Recibos Verdes 2026",
    template: "%s · ReciboCerto",
  },
  description:
    "Calcula quanto fica realmente teu após IRS, Segurança Social e IVA. Calculadora de recibos verdes com as taxas portuguesas de 2026, verificadas e com fonte. Grátis e sem registo.",
  keywords: [
    "calculadora recibos verdes",
    "recibos verdes 2026",
    "retenção na fonte",
    "IVA artigo 53",
    "segurança social trabalhador independente",
    "IRS jovem 2026",
    "calculadora trabalhador independente",
    "freelancer Portugal impostos",
  ],
  authors: [{ name: "ReciboCerto" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_PT",
    url: SITE_URL,
    siteName: "ReciboCerto",
    title: "ReciboCerto — Calculadora de Recibos Verdes 2026",
    description:
      "Sabe quanto fica realmente teu após IRS, Segurança Social e IVA. Taxas de 2026 verificadas e com fonte. Grátis.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ReciboCerto — Calculadora de Recibos Verdes 2026",
    description: "Quanto fica realmente teu após IRS, SS e IVA. Taxas de 2026 verificadas. Grátis e sem registo.",
  },
  robots: {
    index: true,
    follow: true,
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
              "(function(){try{var t=localStorage.getItem('recibocerto:theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()",
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
