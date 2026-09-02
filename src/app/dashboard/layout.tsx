import type { Metadata } from "next";
import type { ReactNode } from "react";
import DashboardShellClient from "@/components/dashboard/DashboardShellClient";

/**
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ O PAINEL ESTAVA `index,follow` E A CANONICALIZAR PARA A HOMEPAGE     │
 * │                                                                     │
 * │ Não era uma fuga de dados — o que a pessoa tem cá é local ou está    │
 * │ atrás de RLS, e um robot autenticado não existe. Era uma superfície  │
 * │ de indexação incoerente: `/dashboard`, `/dashboard/precos` e         │
 * │ `/dashboard/cenarios` respondiam com o TÍTULO da homepage e          │
 * │ declaravam `/` como canonical, o que ensina aos motores de pesquisa  │
 * │ que estas rotas de trabalho pessoal são duplicados da página de      │
 * │ entrada. Herdavam-no do layout raiz sem ninguém decidir isso.        │
 * │                                                                     │
 * │ Passam a dizer o que são: páginas privadas, `noindex,nofollow`, sem  │
 * │ canonical, e com título próprio. As páginas PÚBLICAS das mesmas      │
 * │ ferramentas continuam indexáveis e com canonical próprio — são elas  │
 * │ a porta, não isto.                                                   │
 * └─────────────────────────────────────────────────────────────────────┘
 */
export const metadata: Metadata = {
  title: {
    default: "Painel",
    template: "%s | Recibo Certo",
  },
  // `null` remove o canonical herdado da raiz (que aponta para `/`).
  alternates: { canonical: null },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

/**
 * O layout do painel é servidor. Tudo o que precisa de estado — rota ativa,
 * grupos recolhíveis, menu do telemóvel, sessão — vive na ilha cliente.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Saltar a navegação é o primeiro atalho de teclado de qualquer
          página com uma sidebar de nove destinos. */}
      <a
        href="#conteudo-painel"
        className="sr-only text-sm font-semibold text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-brand focus:px-4 focus:py-2"
      >
        Saltar para o conteúdo
      </a>
      <DashboardShellClient>{children}</DashboardShellClient>
    </>
  );
}
