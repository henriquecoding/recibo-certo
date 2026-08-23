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

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo, ArrowRight, Menu as MenuIcon } from "@/components/ui/Icons";
import MenuCompleto from "@/components/navegacao/MenuCompleto";
import { useAuth } from "@/lib/supabase/auth";
import { useQuizAJogar } from "@/hooks/useQuizAJogar";

export default function ChromeMobileTopo() {
  const pathname = usePathname();
  const { user, disponivel, abrirModal } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);

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
      {/* `max-[359px]:px-3` — abaixo dos 360 px que o projeto assume como
          chão, a marca mais o botão não cabem nos 288 px de conteúdo e o
          documento ganhava 2 px de scroll horizontal em TODAS as páginas.
          Oito pixels de folga resolvem-no onde o problema existe, e a
          variante para-nos aos 359: aos 360 e acima o alinhamento com o
          conteúdo (`px-4`) fica exatamente como estava. */}
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 max-[359px]:px-3 sm:px-6">
        <Link
          href="/"
          aria-label="ReciboCerto — início"
          className="focus-marca -ml-1 flex min-h-[44px] flex-shrink-0 items-center rounded-xl px-1"
        >
          <Logo />
        </Link>

        <div className="flex flex-shrink-0 items-center gap-1.5">
          {/* ┌───────────────────────────────────────────────────────────┐
              │ O TEMA SAI DAQUI E O «MENU» ENTRA — E É UMA TROCA, NÃO    │
              │ UMA PERDA                                                 │
              │                                                           │
              │ A 360 px esta linha tem 328 px úteis, e a marca mais a    │
              │ acção já ocupam ~300. Não cabem os dois: medido, o tema   │
              │ (36 px) mais o menu (36 px) mais os intervalos punham a   │
              │ linha em ~350 px, ou seja, scroll horizontal em TODAS as  │
              │ páginas — que é inegociável neste projeto.                 │
              │                                                           │
              │ Entra o menu porque é agora o único caminho para os       │
              │ guias, o quiz, os planos, os contabilistas e a conta: a   │
              │ barra de baixo passou a ser os cinco pilares. O tema      │
              │ passa para o CABEÇALHO da folha — visível no instante em  │
              │ que ela abre, sem rolar nada. Um toque a mais, zero       │
              │ procura.                                                  │
              └───────────────────────────────────────────────────────────┘ */}
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={menuAberto}
            onClick={() => setMenuAberto(true)}
            className="focus-marca flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition-colors hover:border-stone-300 hover:text-stone-800 dark:border-stone-700 dark:hover:border-stone-600 dark:hover:text-stone-200"
          >
            <MenuIcon size={18} />
            <span className="sr-only">Menu</span>
          </button>

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

      {/* A MESMA folha que a cápsula do computador abre — um componente,
          duas geometrias. Ver o quadro em `MenuCompleto.tsx`. */}
      <MenuCompleto aberto={menuAberto} aoFechar={() => setMenuAberto(false)} superficie="movel" />
    </div>
  );
}
