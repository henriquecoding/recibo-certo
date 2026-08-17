"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O DOCK DE PESQUISA DO TELEMÓVEL — sempre à vista, na zona do polegar
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ PORQUE A PESQUISA VOLTA A SER UMA SUPERFÍCIE E NÃO UM DOS CINCO      │
//  │ LUGARES DA BARRA                                                     │
//  │                                                                     │
//  │ Foi um lugar da barra durante um tempo, e a troca tinha uma razão    │
//  │ boa: cinco ícones sem rótulo eram cinco adivinhas, e dar-lhes nome   │
//  │ resolveu isso. Mas resolveu à custa da coisa errada. A pesquisa não  │
//  │ é um DESTINO — é a forma de chegar a qualquer um dos outros: 123     │
//  │ atividades, dez ferramentas, cerca de 167 guias e mais de 1 600      │
//  │ perguntas. Enterrá-la atrás de uma lupa de 20 px, ao lado de         │
//  │ «Guias» e «Quiz», punha o mecanismo de acesso ao mesmo nível de duas │
//  │ das páginas a que ele dá acesso.                                     │
//  │                                                                     │
//  │ No computador isto nunca esteve em causa: a barra tem uma LINHA só   │
//  │ para si, com 44 rem. Aqui passa a ter a mesma dignidade — largura    │
//  │ inteira, imediatamente acima da navegação — e o lugar que vaga na    │
//  │ barra vai para «Contabilistas», que é um destino a sério e era a     │
//  │ única entrada da barra de secretária sem par no telemóvel.           │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ ACIMA DA BARRA, E NÃO DENTRO DELA                                    │
//  │                                                                     │
//  │ Um sexto lugar na barra punha os alvos abaixo do mínimo de toque em  │
//  │ 360 px (60 px cada, e os rótulos deixavam de caber). Acima dela o    │
//  │ dock tem os 360 px todos, fica na mesma zona do polegar e não        │
//  │ disputa espaço com nada.                                             │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ É UMA LIGAÇÃO — O MESMO CONTRATO DO LANÇADOR DE SECRETÁRIA           │
//  │                                                                     │
//  │ O diálogo entra por `next/dynamic`, portanto há uma janela real      │
//  │ entre o HTML chegar e o chunk carregar. Numa rede móvel má são       │
//  │ segundos, e um `<button>` deixaria essa pessoa a tocar numa caixa    │
//  │ que não faz nada. Sendo uma ligação para `/pesquisar` — a pesquisa   │
//  │ inteira numa página — sem JavaScript continua a haver pesquisa.      │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

import Link from "next/link";
import { Search } from "@/components/ui/Icons";
import { prepararIndice } from "@/lib/busca/indice";
import { EVENTO_BUSCA_ABRIR, useBuscaAberta } from "./motor";

export function DockMovel() {
  const buscaAberta = useBuscaAberta();

  return (
    <>
      {/**
       * O véu por baixo do chrome.
       *
       * O dock e a barra são duas superfícies opacas com 8 px de ar entre
       * elas, e por essa fresta passava a página a rolar: uma linha de texto
       * cortada ao meio, sempre no mesmo sítio do ecrã. Não é um defeito que
       * parta nada — é a diferença entre um chrome que assenta na página e
       * dois rectângulos pousados por cima dela.
       *
       * Um gradiente e não um bloco opaco: por cima do dock o conteúdo tem
       * de continuar a ver-se, senão a página parece acabar antes do fim.
       */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-[calc(var(--rc-chrome-movel)+2rem)] bg-gradient-to-t from-cream via-cream/85 to-transparent dark:from-stone-950 dark:via-stone-950/85 lg:hidden"
      />

      <div
      /**
       * ┌───────────────────────────────────────────────────────────────┐
       * │ AQUI NÃO PODE HAVER UM `inert` PRÓPRIO — E CUSTOU UM DEFEITO   │
       * │                                                               │
       * │ O reflexo é marcar este dock como inerte enquanto o diálogo    │
       * │ está por cima dele. Estava escrito assim, e partia a devolução │
       * │ do foco: ao fechar com Escape, o `SuperficieModal` levanta o   │
       * │ `inert` dos irmãos e SÓ DEPOIS chama `focus()` no gatilho —    │
       * │ mas o `inert` deste dock é outro, vem de um evento de janela e │
       * │ só desaparece no render seguinte. O `focus()` apanhava-o ainda │
       * │ inerte, um elemento inerte recusa foco em silêncio, e quem     │
       * │ fechava a pesquisa com o teclado recomeçava a tabulação no     │
       * │ `<body>`.                                                     │
       * │                                                               │
       * │ Não é preciso: o `SuperficieModal` marca TODOS os filhos do    │
       * │ `<body>` como inertes, e este dock está lá dentro. Já está     │
       * │ coberto, com a ordem certa. O que fica aqui é a opacidade, que │
       * │ é decisão visual desta superfície e não mexe com o foco.       │
       * └───────────────────────────────────────────────────────────────┘
       */
      className={`fixed inset-x-0 z-50 px-3 transition-opacity duration-200 lg:hidden ${
        buscaAberta ? "opacity-0" : "opacity-100"
      }`}
      style={{ bottom: "calc(var(--rc-barra-h) + var(--rc-dock-movel-ar))" }}
    >
      <Link
        href="/pesquisar"
        // O diálogo devolve-lhe o foco ao fechar — ver `focoDeRegresso` em
        // `BuscaGlobal.tsx`. Era o botão da barra que o tinha; mudou de
        // superfície com a pesquisa.
        data-busca-gatilho="movel"
        aria-label="Pesquisar no ReciboCerto"
        aria-haspopup="dialog"
        aria-expanded={buscaAberta}
        /**
         * Preparar o índice por INTENÇÃO, e não à entrada: descarregar o
         * catálogo em todas as visitas para servir quem procura numa
         * minoria delas piora exactamente as ligações que este dock existe
         * para respeitar. No telemóvel o sinal é o primeiro toque, que
         * chega antes do `click`.
         */
        onTouchStart={prepararIndice}
        onPointerEnter={prepararIndice}
        onFocus={prepararIndice}
        onClick={(e) => {
          // `⌘/Ctrl/Shift/Alt + clique` e o botão do meio pertencem ao
          // browser — são as formas de abrir noutro separador.
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          window.dispatchEvent(new Event(EVENTO_BUSCA_ABRIR));
        }}
        className="focus-marca group mx-auto flex h-[var(--rc-dock-movel-h)] w-full max-w-[40rem] items-center gap-3 rounded-2xl border border-stone-200 bg-white/95 px-4 text-left no-underline shadow-lift backdrop-blur-xl transition-[border-color,box-shadow] duration-200 hover:border-brand/40 active:border-brand/60 dark:border-stone-700 dark:bg-stone-900/95 dark:hover:border-brand/40"
      >
        <Search
          size={17}
          className="flex-shrink-0 text-stone-400 transition-colors group-hover:text-brand"
          aria-hidden
        />
        {/* A mesma frase do lançador de secretária. São a mesma pesquisa: dizer
            «Pesquisar…» aqui e «O que precisas de resolver?» lá faria parecer
            duas coisas diferentes a quem usa o produto nos dois sítios. */}
        {/* `stone-600` pela mesma razão da barra: sobre branco, o 500 fica em
            4,7:1 e sobre o `cream` da barra em 4,42 — e esta frase é o único
            texto do dock. Vale a pena o passo a mais. */}
        <span className="min-w-0 flex-1 truncate text-sm text-stone-600 dark:text-stone-400">
          O que precisas de resolver?
        </span>
        {/**
         * NÃO acrescentar aqui um quadrado verde com uma lupa. É o desenho
         * óbvio para um dock de telemóvel e foi exactamente o que saiu do
         * lançador de secretária (P2-02): o mesmo ícone nas duas
         * extremidades do mesmo elemento é duas vezes o mesmo significado.
         * Lá o lado direito passou a dizer o atalho de teclado; aqui não há
         * atalho a dizer, e um lugar vazio é melhor do que um repetido.
         * O que diz «isto responde ao toque» é a elevação e a borda, que
         * mudam com o estado — não um segundo ícone.
         */}
      </Link>
      </div>
    </>
  );
}

export default DockMovel;
