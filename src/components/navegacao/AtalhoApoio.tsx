"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O APOIO HUMANO NO TOPO — e não mais uma ligação na fila
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ PORQUE «CONTABILISTAS» SAIU DA FILA E GANHOU FORMA PRÓPRIA           │
//  │                                                                     │
//  │ Estava entre «Quiz Fiscal» e «Planos», com o mesmo peso, na mesma    │
//  │ cor e no mesmo tamanho. E é a única entrada do cabeçalho inteiro que │
//  │ acaba com uma PESSOA do outro lado — todas as outras acabam num      │
//  │ ecrã. Um produto que vende tranquilidade não pode esconder o apoio   │
//  │ humano no meio de uma lista de destinos.                             │
//  │                                                                     │
//  │ Fica ao centro, com um ícone em círculo, um nome e uma linha que diz │
//  │ o que se lá vai fazer. Não é um botão de acção (não tem             │
//  │ preenchimento de marca): a acção principal do cabeçalho continua a   │
//  │ ser uma só, à direita. É um destino com estatuto.                    │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  O destino DERIVA de `SECOES` — a mesma lista que a folha do menu e o
//  rodapé leem. Escrever `/contabilistas` à mão aqui era abrir a porta a
//  duas navegações a discordarem, que é o defeito que `navegacao.ts`
//  existe para tornar impossível.
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Briefcase } from "@/components/ui/Icons";
import { SECOES, hrefAtivo } from "@/lib/navegacao";
import { medirNavegacao } from "@/lib/busca/medicao";

const APOIO = SECOES.find((s) => s.id === "contabilistas");

export default function AtalhoApoio() {
  const pathname = usePathname();
  if (!APOIO) return null;

  const ativo = hrefAtivo(pathname) === APOIO.href;

  return (
    <Link
      prefetch={false}
      href={APOIO.href}
      aria-current={ativo ? "page" : undefined}
      onClick={() => medirNavegacao(APOIO.id ?? APOIO.href, "secretaria")}
      className={`focus-marca group flex min-h-[44px] flex-shrink-0 items-center gap-2.5 rounded-2xl border px-3 py-1.5 no-underline transition-colors ${
        ativo
          ? "border-brand/40 bg-brand-light/60 dark:border-brand/40 dark:bg-brand/10"
          : "border-stone-200 hover:border-brand/40 hover:bg-stone-50 dark:border-stone-700 dark:hover:border-brand/40 dark:hover:bg-stone-800/60"
      }`}
    >
      <span
        aria-hidden
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-brand/30 text-brand transition-colors group-hover:border-brand/60"
      >
        <Briefcase size={16} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold leading-tight text-stone-800 dark:text-stone-100">
          {APOIO.label}
        </span>
        <span className="flex items-center gap-1 text-xs leading-tight text-stone-500 dark:text-stone-400">
          Encontrar apoio
          <ArrowRight size={11} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </span>
    </Link>
  );
}

/**
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ A MESMA ENTRADA NO TELEMÓVEL — E PORQUE NÃO ERA SÓ «ESTÁ NO MENU»    │
 * │                                                                     │
 * │ No telemóvel o apoio humano vivia só dentro da folha do «Menu»: dois │
 * │ toques e uma lista para atravessar. No computador passou a estar à   │
 * │ vista, ao centro do cabeçalho. A mesma pessoa, no mesmo produto, com │
 * │ duas respostas diferentes à pergunta «e se eu quiser falar com       │
 * │ alguém?» — que é exactamente o defeito que `navegacao.ts` existe     │
 * │ para tornar impossível, só que aplicado a uma entrada em vez de a    │
 * │ uma lista.                                                           │
 * │                                                                     │
 * │ Fica ao lado do campo de pesquisa, na zona do polegar, porque é ali  │
 * │ que se responde à mesma pergunta pelas duas vias: procurar sozinho,  │
 * │ ou falar com quem sabe.                                              │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * COM RÓTULO, e não uma mala sozinha. A regra é a mesma que a barra dos
 * cinco pilares aplica a si própria: um ícone isolado obriga a adivinhar,
 * e adivinhar o que está do outro lado de um botão é o oposto do que esta
 * entrada promete. Por isso também não leva `aria-label` a repor um nome
 * diferente do que se lê — WCAG 2.5.3, o mesmo cuidado de `BarraSecoes`.
 *
 * O rótulo é o `curto` da secção («Apoio»), que vem da fonte e não daqui:
 * escrever a abreviatura neste ficheiro era pô-la a divergir do dia em que
 * alguém mudasse o nome da secção. Ver a nota em `navegacao.ts`.
 */
export function AtalhoApoioMovel() {
  const pathname = usePathname();
  if (!APOIO) return null;

  const ativo = hrefAtivo(pathname) === APOIO.href;

  return (
    <Link
      prefetch={false}
      href={APOIO.href}
      aria-current={ativo ? "page" : undefined}
      onClick={() => medirNavegacao(APOIO.id ?? APOIO.href, "movel")}
      className={`focus-marca flex h-[var(--rc-dock-movel-h)] flex-shrink-0 items-center gap-1.5 rounded-2xl border px-2.5 no-underline shadow-lift backdrop-blur-xl transition-colors ${
        ativo
          ? "border-brand/40 bg-brand-light text-brand-dark dark:border-brand/40 dark:bg-brand/15 dark:text-brand"
          : "border-stone-200 bg-white/95 text-stone-700 active:border-brand/60 dark:border-stone-700 dark:bg-stone-900/95 dark:text-stone-300"
      }`}
    >
      <Briefcase size={15} className="flex-shrink-0 text-brand" aria-hidden />
      <span className="texto-mini font-semibold leading-none">{APOIO.curto ?? APOIO.label}</span>
    </Link>
  );
}
