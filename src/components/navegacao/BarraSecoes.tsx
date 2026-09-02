"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A BARRA DE SECÇÕES — a primeira linha do cabeçalho de secretária
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ SÃO ATALHOS, E O DESENHO TEM DE DIZER ISSO                           │
//  │                                                                     │
//  │ Simular, Guias, Quiz, Contabilistas e Planos estavam na barra        │
//  │ principal e saíram de lá quando ela passou a levar os cinco pilares. │
//  │ Estavam a ser destinos de primeiro nível ao lado da tarefa, e não    │
//  │ são: são o resto do produto.                                          │
//  │                                                                     │
//  │ Voltam — mas um nível acima, e com o peso visual desse nível: texto  │
//  │ pequeno, sem ícone, sem pastilha, na cor da prosa secundária. A      │
//  │ cápsula por baixo é que tem ícones, forma e a cor da marca. Duas     │
//  │ filas de ligações com o mesmo peso seriam duas navegações            │
//  │ principais, que é o problema que a reestruturação foi resolver.      │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ FICAM DOIS, E «SUGESTÕES» SAIU DAQUI                                 │
//  │                                                                     │
//  │ A fila tinha cinco destinos e uma acção. Cinco destinos ao lado de   │
//  │ cinco pilares na linha de baixo são DEZ lugares de primeiro nível a  │
//  │ disputar a mesma atenção — e nenhum deles ganha.                     │
//  │                                                                     │
//  │ Ficam os dois índices do produto (todas as ferramentas, todos os     │
//  │ guias), que é o que responde a «e o que mais existe aqui?».          │
//  │ «Contabilistas» sobe e ganha forma própria (`AtalhoApoio`) porque é  │
//  │ a única entrada que acaba com uma pessoa do outro lado; «Quiz» e     │
//  │ «Planos» descem para a folha do menu, onde continuam a existir com   │
//  │ descrição e ícone.                                                   │
//  │                                                                     │
//  │ «Sugestões» sai por não ser um destino: abre uma caixa de escrita e  │
//  │ não muda de rota. Continua a duas portas — na folha do menu e no     │
//  │ menu da conta —, que é onde se procura uma acção sobre o produto e   │
//  │ não sobre a tarefa.                                                  │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SECOES_TOPO, hrefAtivo } from "@/lib/navegacao";
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
            prefetch={false}
            key={secao.href}
            href={secao.href}
            // `page` e não `true`: o item aceso É a página onde se está.
            aria-current={ativo ? "page" : undefined}
            onClick={() => medirNavegacao(secao.id ?? secao.href, "secretaria")}
            // Dois sinais e não só a cor: peso e cor. O fundo é da FAIXA de
            // baixo — é ela que pode dar-se ao luxo da pastilha, e é nisso
            // que se lê qual das duas filas é a navegação.
            className={`${BASE} ${
              ativo
                ? "font-semibold text-brand-dark dark:text-brand"
                : "text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
            }`}
          >
            {/* `curto` quando existe, e SEM `aria-label` a repor o longo: o
                nome acessível tem de conter o texto visível (WCAG 2.5.3) e
                quem usa comando de voz diz o que lê. Ver `EntradaMenu`. */}
            {secao.curto ?? secao.label}
          </Link>
        );
      })}
    </nav>
  );
}
