"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A CÁPSULA — a navegação principal de secretária
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ CINCO PILARES E UM «MENU», E NÃO CINCO SECÇÕES SORTIDAS              │
//  │                                                                     │
//  │ A barra tinha «Simular · Guias · Quiz · Planos · Contabilistas» —    │
//  │ um hub de ferramentas ao lado de um corpo editorial, de um jogo, de  │
//  │ uma página de preços e de um directório. Cinco coisas de naturezas   │
//  │ diferentes, todas ao mesmo nível, e nenhuma delas era a tarefa.      │
//  │                                                                     │
//  │ Agora a barra responde a uma só pergunta — «em que ponto estás?» —   │
//  │ e a ordem responde-a: descobrir → preço → recibos → salário →        │
//  │ empresa. Tudo o resto está atrás de «Menu», que é um destino         │
//  │ honesto: diz que há mais e mostra tudo de uma vez.                    │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ DOIS RÓTULOS POR PILAR, E O NOME ACESSÍVEL NUNCA É O CURTO           │
//  │                                                                     │
//  │ «Recibos verdes» não cabe numa cápsula de seis lugares abaixo de     │
//  │ `xl`. A saída fácil — encolher a letra dos seis — poria a barra a    │
//  │ parecer um nível de navegação diferente consoante a largura da       │
//  │ janela. A saída certa é ter os dois rótulos no DOM e deixar a CSS    │
//  │ trocar a PALAVRA que se vê.                                          │
//  │                                                                     │
//  │ O curto é `aria-hidden` e a âncora carrega `aria-label` com o nome   │
//  │ completo: o que um leitor de ecrã anuncia é sempre «Recibos verdes», │
//  │ em qualquer largura. Um nome acessível que depende do viewport é um  │
//  │ defeito que ninguém vê a desenvolver.                                 │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ O ESTADO ACTIVO SÃO TRÊS SINAIS, E `aria-current` COMANDA-OS         │
//  │                                                                     │
//  │ Lavagem de fundo, cor e um anel. Três, porque um deles sozinho é     │
//  │ cor — e cor sozinha falha para uma parte das pessoas e em qualquer   │
//  │ impressão. E é o `aria-current="page"` que a CSS lê, não uma classe: │
//  │ assim o DOM carrega o estado para a tecnologia de apoio e a pintura  │
//  │ segue-o, em vez de serem duas verdades a manter à mão.                │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu as MenuIcon } from "@/components/ui/Icons";
import { iconeDe } from "@/components/ferramentas/icon-map";
import { PILARES, hrefAtivo } from "@/lib/navegacao";
import { medirNavegacao } from "@/lib/busca/medicao";

/*
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ ESTES NÚMEROS FORAM MEDIDOS NO BROWSER, NÃO ESCOLHIDOS                 │
 * │                                                                       │
 * │ Com `gap-2` e `px-3 xl:px-4`, a cápsula ficava 8 px mais larga do que  │
 * │ o espaço entre a marca e as acções a 1024 px, e 17 px a 1440. E não    │
 * │ transbordava do ecrã — passava POR CIMA do logótipo e do botão, que    │
 * │ é o defeito que «cabe na janela» não apanha. Ver a verificação de      │
 * │ colisão em `smoke-nav.mjs`.                                            │
 * │                                                                       │
 * │ `gap-1.5` e `px-2.5 xl:px-3.5` devolvem ~36 px, que é folga suficiente │
 * │ nas duas larguras sem mexer no tamanho de letra — encolher a letra     │
 * │ faria a barra parecer um nível de navegação diferente conforme a       │
 * │ janela.                                                                │
 * └───────────────────────────────────────────────────────────────────────┘
 */
const ITEM =
  "focus-marca relative flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-sm font-medium no-underline transition-colors xl:px-3.5";

const INATIVO =
  "text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200";

/* A bolha do activo: fundo + cor + anel. O anel é `inset` para não somar
   largura e desalinhar os vizinhos quando o pilar aceso muda. */
const ATIVO =
  "bg-brand-light text-brand-dark ring-1 ring-inset ring-brand/70 dark:bg-brand/15 dark:text-brand dark:ring-brand/60";

export default function CapsulaNav({ aoAbrirMenu, menuAberto }: { aoAbrirMenu: () => void; menuAberto: boolean }) {
  const pathname = usePathname();
  const aceso = hrefAtivo(pathname);

  return (
    <nav aria-label="Principal" className="rc-capsula flex w-fit max-w-full items-center gap-0.5 p-1.5">
      {PILARES.map((pilar) => {
        const Icon = iconeDe(pilar.icone);
        const ativo = aceso === pilar.href;
        return (
          <Link
            key={pilar.id}
            href={pilar.href}
            aria-label={pilar.label}
            aria-current={ativo ? "page" : undefined}
            onClick={() => medirNavegacao(pilar.id, "secretaria")}
            className={`${ITEM} ${ativo ? ATIVO : INATIVO}`}
          >
            <Icon size={17} className="flex-shrink-0" />
            <span className="hidden xl:inline">{pilar.label}</span>
            <span className="xl:hidden" aria-hidden>
              {pilar.curto}
            </span>
          </Link>
        );
      })}

      {/* A régua separa o que é destino do que é «há mais». Sem ela, «Menu»
          lê-se como o sexto pilar. */}
      <span aria-hidden className="mx-0.5 h-6 w-px flex-shrink-0 bg-stone-200 dark:bg-stone-700" />

      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={menuAberto}
        onClick={aoAbrirMenu}
        className={`${ITEM} ${INATIVO}`}
      >
        <MenuIcon size={17} className="flex-shrink-0" />
        <span>Menu</span>
      </button>
    </nav>
  );
}
