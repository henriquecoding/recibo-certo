"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A LINHA DA MARCA — a terceira e última do chrome inferior
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ ESTEVE NO TOPO, E ERA UM QUARTO SÍTIO PARA OLHAR                     │
//  │                                                                     │
//  │ A marca, o menu e o «Começar» viviam numa barra em fluxo no topo da  │
//  │ página, enquanto a pesquisa e os cinco pilares viviam fixos em       │
//  │ baixo. Num telemóvel isso reparte o chrome por duas pontas do ecrã:  │
//  │ o polegar trabalha em baixo e a identidade e a acção estavam a um    │
//  │ scroll de distância, no sítio onde a mão não chega.                   │
//  │                                                                     │
//  │ Passa a ser a última linha da MESMA superfície de baixo. As três     │
//  │ ficam empilhadas, na ordem em que se usam: procurar, ir, e —         │
//  │ colada ao fundo, na zona do polegar — a acção.                       │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ NÃO TEM GUARDAS DE ROTA PRÓPRIAS, E É DE PROPÓSITO                   │
//  │                                                                     │
//  │ Tinha-as enquanto era montada pelo `layout.tsx`, ao lado do          │
//  │ conteúdo. Agora é filha do `ChromeMobile`, que já decide por todas   │
//  │ — /dashboard, /admin e uma pergunta do quiz a contar tempo. Repetir  │
//  │ a decisão em dois sítios é a forma de as pôr a divergir: bastava     │
//  │ acrescentar uma rota a uma das listas.                                │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo, ArrowRight, Menu as MenuIcon } from "@/components/ui/Icons";
import { useAuth } from "@/lib/supabase/auth";

const MenuCompleto = dynamic(
  () => import("@/components/navegacao/MenuCompletoIntencao"),
  { ssr: false },
);

const prepararMenuCompleto = () =>
  import("@/components/navegacao/MenuCompletoIntencao");

const ACAO =
  "focus-marca inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-xl bg-brand px-3.5 text-sm font-semibold text-white no-underline shadow-glow";

export default function ChromeMobileMarca() {
  const pathname = usePathname();
  const { user, disponivel, abrirModal } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const [menuMontado, setMenuMontado] = useState(false);
  const abrirMenu = useCallback(() => {
    setMenuMontado(true);
    setMenuAberto(true);
  }, []);

  return (
    <>
      {/* `max-[359px]:px-2` — abaixo dos 360 px que o projeto assume como
          chão, a marca mais os dois botões não cabem e o documento ganhava
          scroll horizontal em TODAS as páginas. A variante para-nos aos 359:
          aos 360 e acima o espaçamento fica exatamente como está. */}
      <div className="flex h-[var(--rc-barra-marca)] items-center justify-between gap-2 border-t border-stone-100 px-3 max-[359px]:px-2 dark:border-stone-800">
        <Link
          href="/"
          aria-label="Recibo Certo — início"
          className="focus-marca -ml-1 flex min-h-[36px] flex-shrink-0 items-center rounded-xl px-1"
        >
          <Logo small />
        </Link>

        <div className="flex flex-shrink-0 items-center gap-1.5">
          {/* ┌───────────────────────────────────────────────────────────┐
              │ O TEMA NÃO ESTÁ AQUI, E A TROCA FOI MEDIDA                │
              │                                                           │
              │ A 360 px esta linha tem ~330 px úteis e a marca mais a    │
              │ acção já ocupam ~280. O tema (36 px) e o menu (36 px) não │
              │ cabiam os dois. Entra o menu, porque é o único caminho    │
              │ para os guias, o quiz, os planos, os contabilistas e a    │
              │ conta — os cinco lugares da barra acima são os pilares. O │
              │ tema vai para o CABEÇALHO da folha, visível no instante   │
              │ em que ela abre. Um toque a mais, zero procura.            │
              └───────────────────────────────────────────────────────────┘ */}
          <button
            type="button"
            data-menu-gatilho="movel"
            aria-haspopup="dialog"
            aria-expanded={menuAberto}
            onPointerEnter={prepararMenuCompleto}
            onPointerDown={prepararMenuCompleto}
            onFocus={prepararMenuCompleto}
            onClick={abrirMenu}
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
            <Link href="/dashboard" className={ACAO}>
              Painel
              <ArrowRight size={13} aria-hidden />
            </Link>
          ) : disponivel ? (
            <button type="button" onClick={() => abrirModal("criar")} className={ACAO}>
              Começar
              <ArrowRight size={13} aria-hidden />
            </button>
          ) : (
            <Link href="/dashboard" className={ACAO}>
              Começar
              <ArrowRight size={13} aria-hidden />
            </Link>
          )}
        </div>
      </div>

      {/* A MESMA folha que a cápsula do computador abre — um componente,
          duas geometrias. Ver o quadro em `MenuCompleto.tsx`. */}
      {menuMontado ? (
        <MenuCompleto
          aberto={menuAberto}
          aoFechar={() => setMenuAberto(false)}
          superficie="movel"
        />
      ) : null}
    </>
  );
}
