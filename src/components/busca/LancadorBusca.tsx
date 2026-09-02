"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O LANÇADOR — leve por contrato
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ O QUE ESTE FICHEIRO NÃO PODE IMPORTAR, E PORQUÊ (P1-02 / H-09)       │
//  │                                                                     │
//  │ Isto vive no cabeçalho, logo no bundle inicial de todas as páginas   │
//  │ públicas. Uma importação estática do controlador traria o índice, e  │
//  │ o índice traria `fiscal-data.ts` — que foi exactamente o que a       │
//  │ auditoria encontrou: um comentário a prometer carregamento diferido  │
//  │ e uma cadeia de imports a contrariá-lo.                              │
//  │                                                                     │
//  │ A fronteira é `next/dynamic`, e é REAL: o painel é outro chunk, e o  │
//  │ índice é um JSON pedido por `fetch`. O que fica aqui é o que se vê   │
//  │ antes de alguém decidir procurar.                                    │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ É UMA LIGAÇÃO, E ISSO É PROGRESSIVE ENHANCEMENT A SÉRIO              │
//  │                                                                     │
//  │ Um `<button>` sem JavaScript é um adorno: quem chegue antes do chunk │
//  │ carregar — rede móvel má, extensão a bloquear, erro de rede — carrega│
//  │ e não acontece nada. Uma ligação resolve os três casos com um só     │
//  │ elemento: sem JavaScript navega para `/pesquisar`, que é a pesquisa  │
//  │ inteira numa página; com JavaScript o clique normal abre o painel; e │
//  │ `⌘+clique` continua a abrir noutro separador.                        │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "@/components/ui/Icons";
import { prepararIndice } from "@/lib/busca/indice";
import {
  CONSULTA_SECRETARIA,
  anunciarEstadoBusca,
  useAtalhoBusca,
  useAtalhoDoSistema,
  useRegistarLancador,
} from "./motor";

const ID_PAINEL = "rc-busca-painel";

/**
 * A fronteira dinâmica. `ssr: false` porque o painel só existe depois de
 * um gesto — renderizá-lo no servidor seria enviar markup que ninguém vê.
 */
const PainelPesquisa = dynamic(() => import("./PainelPesquisa"), { ssr: false, loading: () => null });

export function LancadorBusca({ inputId }: { inputId?: string }) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const gerado = useId();
  const idCampo = inputId ?? `${gerado}-busca`;
  const atalho = useAtalhoDoSistema();

  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ FECHAR TEM DE DEVOLVER O FOCO — MAS NEM SEMPRE                       │
   * │                                                                     │
   * │ Sem isto, fechar com Escape deixava o foco no `<body>`: quem navega  │
   * │ por teclado recomeçava a tabulação no topo do documento.             │
   * │                                                                     │
   * │ Mas não é «devolver sempre»: um clique FORA do painel já disse para  │
   * │ onde a pessoa queria ir, e roubar-lhe o foco de volta desfazia       │
   * │ exactamente o que ela acabou de fazer. A regra é «quem fechou        │
   * │ indicou destino?» — Escape e o ✕ não indicam; um clique fora, o Tab  │
   * │ que sai e a navegação indicam.                                       │
   * └─────────────────────────────────────────────────────────────────────┘
   */
  const devolverFoco = useRef(false);

  const fechar = useCallback((opcoes?: { restaurarFoco?: boolean }) => {
    devolverFoco.current = opcoes?.restaurarFoco ?? false;
    setAberto(false);
  }, []);

  const fecharComFoco = useCallback(() => fechar({ restaurarFoco: true }), [fechar]);
  const abrir = useCallback(() => setAberto(true), []);

  useEffect(() => {
    if (aberto || !devolverFoco.current) return;
    devolverFoco.current = false;
    // A barra só volta a existir no commit em que o painel sai, e este efeito
    // corre depois desse commit — por isso é aqui e não no `fechar`.
    document.getElementById(idCampo)?.focus();
  }, [aberto, idCampo]);

  useAtalhoBusca({ ativaQuando: CONSULTA_SECRETARIA, aberto, abrir, fechar: fecharComFoco });

  // Anuncia-se como barra ancorada — e só enquanto está no ecrã. Abaixo de
  // `lg` este cabeçalho é `hidden`: continua montado e não se vê, e quem
  // manda aí é o dock do telemóvel. Ver o quadro em `motor.ts`.
  useRegistarLancador(CONSULTA_SECRETARIA);

  // Mudar de página fecha — um painel que sobrevive à navegação fica a tapar
  // a página onde a pessoa acabou de aterrar.
  useEffect(() => {
    setAberto(false);
  }, [pathname]);

  useEffect(() => {
    anunciarEstadoBusca(aberto);
  }, [aberto]);

  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ O PAINEL DEIXOU DE FLUTUAR POR CIMA DO CARTÃO — É O CARTÃO           │
   * │                                                                     │
   * │ Era `position:absolute` com forma própria: cantos, contorno, sombra  │
   * │ e um anel — um segundo cartão a nascer de dentro do primeiro, com    │
   * │ dois milímetros de desalinhamento a denunciá-lo em qualquer captura  │
   * │ de ecrã. Duas superfícies com forma própria, uma dentro da outra, a  │
   * │ dizerem as duas «eu é que sou o contentor».                          │
   * │                                                                     │
   * │ Passa a crescer EM FLUXO dentro do cartão do cabeçalho, que é o que  │
   * │ o desenho aprovado mostra: uma só superfície, da marca até à linha   │
   * │ das teclas. Não empurra a página — o cabeçalho é `fixed` e o         │
   * │ espaçador reserva sempre a mesma altura —, e o corpo do painel rola  │
   * │ por dentro quando não cabe.                                          │
   * └─────────────────────────────────────────────────────────────────────┘
   */
  return (
    <div className="w-full">
      {aberto ? (
        <PainelPesquisa id={ID_PAINEL} idCampo={idCampo} aoFechar={fechar} aoFecharComFoco={fecharComFoco} />
      ) : (
        <Link
          href="/pesquisar"
          id={idCampo}
          aria-label="Pesquisar no Recibo Certo"
          aria-expanded={false}
          aria-controls={ID_PAINEL}
          aria-keyshortcuts="Control+K Meta+K"
          /**
           * Preparar o índice por INTENÇÃO — rato por cima, foco de teclado
           * ou primeiro toque. É o meio-termo do ponto §14: uma pesquisa
           * «instantânea» que descarrega o catálogo antes de qualquer sinal
           * piora todas as visitas para servir uma minoria.
           */
          onPointerEnter={prepararIndice}
          onFocus={prepararIndice}
          onTouchStart={prepararIndice}
          onClick={(e) => {
            // `⌘/Ctrl/Shift/Alt + clique` e o botão do meio pertencem ao
            // browser: são as formas de abrir noutro separador, e
            // interceptá-las seria roubar uma coisa pedida de propósito.
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            e.preventDefault();
            abrir();
          }}
          className="focus-marca group flex h-[var(--rc-dock-h)] w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white pl-2.5 pr-2.5 text-left no-underline transition-[border-color,box-shadow] duration-200 hover:border-brand/40 hover:shadow-sm dark:border-stone-700 dark:bg-stone-900 dark:hover:border-brand/40"
        >
          {/**
           * UMA lupa, e não duas. A barra tinha o ícone à esquerda e um
           * quadrado verde com o MESMO ícone à direita — duas vezes o mesmo
           * significado a ocupar as duas extremidades do elemento central do
           * cabeçalho (P2-02). O lado direito passa a dizer o atalho, que é
           * informação que ainda não estava em lado nenhum.
           *
           * A lupa vive num quadrado com contorno — a mesma forma que ela
           * tem com o painel aberto. Sem ele, o ícone saltava de sítio no
           * instante em que a barra virava campo, que é o único instante em
           * que ninguém devia reparar em nada.
           */}
          <span
            aria-hidden
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-stone-200 text-stone-400 transition-colors group-hover:border-brand/40 group-hover:text-brand dark:border-stone-700"
          >
            <Search size={16} />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-stone-500 dark:text-stone-400">
            O que precisas de resolver?
          </span>
          {atalho && (
            <span
              aria-hidden
              className="hidden flex-shrink-0 items-center rounded-lg bg-stone-100 px-2 py-1 text-[11px] font-semibold text-stone-500 xl:inline-flex dark:bg-stone-800 dark:text-stone-400"
            >
              {atalho}
            </span>
          )}
        </Link>
      )}
    </div>
  );
}

export default LancadorBusca;
