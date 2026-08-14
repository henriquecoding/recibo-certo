import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Playfair_Display, DM_Sans } from "next/font/google";
import MotionProvider from "@/components/ui/motion/MotionProvider";
import { AuthProvider } from "@/lib/supabase/auth";
import { PerfilProvider } from "@/lib/perfil";
import { SubscricaoProvider } from "@/lib/stripe/subscription";
import DeferredOverlays from "@/components/ui/DeferredOverlays";
import { CoordenadorOverlays } from "@/components/overlays/CoordenadorOverlays";
import { AvisosProvider } from "@/components/ui/Avisos";
import { ConfirmacaoProvider } from "@/components/ui/Confirmar";
import ChromeMobile from "@/components/ChromeMobile";
import BotaoTopo from "@/components/ui/BotaoTopo";
import FeedbackModal from "@/components/feedback/FeedbackModal";
import Medicao from "@/components/Medicao";
// Importado pelo efeito colateral: `assertChangelogIntegrity()` corre ao
// carregar o módulo e faz o build falhar se `APP_VERSION` e a entrada mais
// recente do CHANGELOG divergirem. Antes essa garantia vinha de graça, porque
// o `NovidadesModal` importava o changelog estaticamente; agora que o carrega
// sob demanda (para não o mandar para o bundle do cliente), a verificação
// precisa desta âncora no servidor — o layout da raiz é avaliado em todos os
// builds e o conteúdo NÃO segue para o browser a partir daqui.
import "@/lib/changelog";
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
    // A pesquisa convencional permanece plenamente visível. A reserva contra
    // treino e extração de IA vive nas políticas separadas de crawler/TDM,
    // sem sacrificar snippets, imagens ou vídeos nos resultados de pesquisa.
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-video-preview": -1,
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
        {/* Reserva de direitos TDM também dentro do HTML. O cabeçalho HTTP e
            /.well-known/tdmrep.json declaram a mesma decisão. */}
        <meta name="tdm-reservation" content="1" />
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
                  {/* O coordenador de overlays envolve tudo o que pode abrir
                      uma superfície por cima da página. A invariante que
                      entrega — nunca mais de um `aria-modal` activo — só se
                      consegue garantir de um sítio que os veja a todos.
                      Ver `components/overlays/CoordenadorOverlays.tsx`. */}
                  <CoordenadorOverlays>
                    {/* A camada de feedback: os avisos respondem a cada
                        ação, as confirmações perguntam antes do que não se
                        desfaz. Vivem dentro do coordenador porque a
                        confirmação é `aria-modal` e tem de disputar a vaga
                        com os outros — ver `ui/Confirmar.tsx`. */}
                    <AvisosProvider>
                      <ConfirmacaoProvider>
                        {children}
                        <ChromeMobile />
                        {/* Voltar ao topo — global em todo o site público;
                            esconde-se sozinho no /dashboard e no /admin. */}
                        <BotaoTopo />
                        <FeedbackModal />
                        <Medicao />
                        <DeferredOverlays />
                      </ConfirmacaoProvider>
                    </AvisosProvider>
                  </CoordenadorOverlays>
                </MotionProvider>
              </PerfilProvider>
            </Suspense>
          </SubscricaoProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
