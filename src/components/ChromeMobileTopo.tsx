"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O CHROME SUPERIOR — telemóvel e tablet (< lg)
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ O QUE FALTAVA NO TELEMÓVEL E EXISTIA EM TODAS AS PÁGINAS DO          │
//  │ COMPUTADOR                                                          │
//  │                                                                     │
//  │ Abaixo de `lg` o site não tinha topo NENHUM: o `Nav.tsx` é           │
//  │ `hidden lg:block` e o `ChromeMobile` vive em baixo. Três coisas que  │
//  │ no computador estão sempre à vista não tinham sítio no telemóvel:    │
//  │                                                                     │
//  │   · a MARCA — não havia um único sítio onde o produto dissesse o     │
//  │     nome, nem uma forma de voltar a casa que não fosse acertar no    │
//  │     separador «Início»;                                              │
//  │   · o TEMA — dois toques (abrir «Conta», descer até ao fim da        │
//  │     folha) contra um clique no computador;                           │
//  │   · a ACÇÃO — «Começar grátis» / «Painel» é o botão que a barra de   │
//  │     secretária tem em todas as páginas, e no telemóvel estava        │
//  │     enterrado dentro da folha de «Conta».                            │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ EM FLUXO, E NÃO FIXO — A DECISÃO QUE IMPEDE DOIS CHROMES             │
//  │                                                                     │
//  │ Fixar esta barra era o reflexo natural e teria sido o erro: com o    │
//  │ dock e a navegação em baixo (~120 px) mais 56 px fixos em cima, um   │
//  │ ecrã de 640 px passava a ter 28% de moldura permanente.              │
//  │                                                                     │
//  │ A repartição é: o que se usa a MEIO de uma tarefa fica fixo em baixo │
//  │ (pesquisa e navegação, na zona do polegar); o que se usa à CHEGADA   │
//  │ — reconhecer o produto, escolher o tema, começar — fica aqui e rola  │
//  │ com a página. Custa 56 px uma vez, no topo do documento, e zero      │
//  │ enquanto se lê.                                                     │
//  │                                                                     │
//  │ Por viver em fluxo, é montado no `layout.tsx` ANTES do `{children}`  │
//  │ (e não junto do `ChromeMobile`, que é o último elemento do corpo).   │
//  │ Também por isso não precisa de espaçador nenhum.                     │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  Não aparece no `/dashboard` nem no `/admin`, que têm chrome próprio —
//  o mesmo critério do `ChromeMobile` e do `BotaoTopo`.
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo, ArrowRight } from "@/components/ui/Icons";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useAuth } from "@/lib/supabase/auth";
import { useQuizAJogar } from "@/hooks/useQuizAJogar";

export default function ChromeMobileTopo() {
  const pathname = usePathname();
  const { user, disponivel, abrirModal } = useAuth();

  // O mesmo sinal que tira a barra e o dock do caminho durante uma pergunta.
  // Sem isto, o chrome de baixo desaparecia e este ficava — com «Começar» ao
  // lado de uma pergunta a contar tempo.
  const quizAJogar = useQuizAJogar(pathname.startsWith("/quiz-fiscal"));

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin") || quizAJogar) return null;

  return (
    <div className="border-b border-stone-200/70 bg-cream/80 backdrop-blur-xl dark:border-stone-800 dark:bg-stone-950/80 lg:hidden">
      {/* `max-w-6xl px-4 sm:px-6` é o invólucro que as páginas usam. Estava
          `max-w-[40rem]` — o do dock e o da barra, que são superfícies
          flutuantes — e no tablet a marca ficava recuada 64 px em relação ao
          título que lhe fica logo por baixo. O chrome em fluxo alinha-se com
          o CONTEÚDO; o chrome flutuante alinha-se consigo próprio. */}
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link
          href="/"
          aria-label="ReciboCerto — início"
          className="focus-marca -ml-1 flex min-h-[44px] flex-shrink-0 items-center rounded-xl px-1"
        >
          <Logo />
        </Link>

        <div className="flex flex-shrink-0 items-center gap-1.5">
          <ThemeToggle />

          {/* A mesma acção do cabeçalho de secretária, com a mesma regra:
              quem tem sessão vai para o painel; quem não tem começa. O
              rótulo é curto porque aqui divide a linha com a marca — em
              360 px «Começar Grátis» empurrava o logótipo para fora. */}
          {user ? (
            <Link
              href="/dashboard"
              className="focus-marca inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-xl bg-brand px-3.5 text-sm font-semibold text-white no-underline shadow-glow"
            >
              Painel
              <ArrowRight size={13} aria-hidden />
            </Link>
          ) : disponivel ? (
            <button
              type="button"
              onClick={() => abrirModal("criar")}
              className="focus-marca inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-xl bg-brand px-3.5 text-sm font-semibold text-white shadow-glow"
            >
              Começar
              <ArrowRight size={13} aria-hidden />
            </button>
          ) : (
            <Link
              href="/dashboard"
              className="focus-marca inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-xl bg-brand px-3.5 text-sm font-semibold text-white no-underline shadow-glow"
            >
              Começar
              <ArrowRight size={13} aria-hidden />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
