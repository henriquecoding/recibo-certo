"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A BARRA DE SECÇÕES — a primeira linha do cabeçalho de secretária
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ SÃO ATALHOS, E O DESENHO TEM DE DIZER ISSO                           │
//  │                                                                     │
//  │ Guias, Quiz, Contabilistas e Planos estavam na barra principal e     │
//  │ saíram de lá quando ela passou a levar os cinco pilares. Estavam a   │
//  │ ser destinos de primeiro nível ao lado da tarefa, e não são: são o   │
//  │ resto do produto.                                                    │
//  │                                                                     │
//  │ Voltam — mas um nível acima, e com o peso visual desse nível: texto  │
//  │ pequeno, sem ícone, sem pastilha, na cor da prosa secundária. A      │
//  │ cápsula por baixo é que tem ícones, forma e a cor da marca. Duas     │
//  │ filas de ligações com o mesmo peso seriam duas navegações            │
//  │ principais, que é o problema que a reestruturação foi resolver.      │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ «SUGESTÕES» É UMA ACÇÃO E FICA NO FIM, DEPOIS DE UMA RÉGUA           │
//  │                                                                     │
//  │ Os quatro primeiros levam a uma página; este abre uma caixa de       │
//  │ escrita e não muda de rota. Pô-lo na fila sem separação ensinava     │
//  │ que era mais um destino — e a pessoa que lhe toca à espera de uma    │
//  │ página fica com um formulário. A régua é o sinal de que a natureza   │
//  │ muda ali.                                                            │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Megaphone } from "@/components/ui/Icons";
import { SECOES_TOPO, hrefAtivo } from "@/lib/navegacao";
import { abrirFeedback } from "@/components/feedback/abrir";
import { medirNavegacao } from "@/lib/busca/medicao";

/*
 * O rank não vem do TAMANHO — vem do peso e do contentor.
 *
 * A bandeja por baixo tem o mesmo corpo de letra. O que a separa desta fila
 * é estar dentro de um contentor recuado, com o pilar aceso em relevo.
 * Estas são ligações soltas, de peso normal, sobre o cartão. A diferença de
 * superfície lê-se de relance; um pixel de diferença de tamanho não.
 */
const BASE =
  "focus-marca flex min-h-[40px] items-center whitespace-nowrap rounded-xl px-2.5 text-sm no-underline transition-colors";

export default function BarraSecoes() {
  const pathname = usePathname();
  const aceso = hrefAtivo(pathname);

  return (
    <nav aria-label="Secções" className="flex min-w-0 items-center gap-0.5">
      {SECOES_TOPO.map((secao) => {
        const ativo = aceso === secao.href;
        return (
          <Link
            key={secao.href}
            href={secao.href}
            // `page` e não `true`: o item aceso É a página onde se está.
            aria-current={ativo ? "page" : undefined}
            onClick={() => medirNavegacao(secao.id ?? secao.href, "secretaria")}
            className={`${BASE} ${
              ativo
                ? // Dois sinais e não só a cor: peso e cor. A cápsula por
                  // baixo é que pode dar-se ao luxo da pastilha.
                  "font-semibold text-brand-dark dark:text-brand"
                : "text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
            }`}
          >
            {secao.label}
          </Link>
        );
      })}

      <span aria-hidden className="mx-2 h-5 w-px flex-shrink-0 bg-stone-200 dark:bg-stone-700" />

      <button
        type="button"
        onClick={() => abrirFeedback({ area: pathname })}
        className={`${BASE} gap-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200`}
      >
        <Megaphone size={15} className="flex-shrink-0 text-stone-400 dark:text-stone-500" />
        Sugestões
      </button>
    </nav>
  );
}
