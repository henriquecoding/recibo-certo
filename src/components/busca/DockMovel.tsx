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
//  │ para si, com 44 rem. Aqui passa a ter a mesma dignidade — a linha    │
//  │ inteira, imediatamente acima da navegação.                            │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ E PARTILHA ESSA LINHA COM UMA COISA SÓ: O APOIO HUMANO               │
//  │                                                                     │
//  │ «Contabilistas» ganhou lugar próprio no cabeçalho de secretária e    │
//  │ aqui não tinha nenhum — vivia dentro da folha do «Menu», a dois      │
//  │ toques. A mesma pessoa tinha duas respostas diferentes à pergunta    │
//  │ «e se eu quiser falar com alguém?», conforme o ecrã.                 │
//  │                                                                     │
//  │ Fica ao lado do campo porque é a segunda via para a MESMA pergunta:  │
//  │ resolver sozinho, ou falar com quem sabe. Sai do ecrã com o campo    │
//  │ quando o painel abre — ali dentro o apoio já tem a sua faixa. Ver    │
//  │ `navegacao/AtalhoApoio.tsx`.                                          │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ É UMA BARRA COM PAINEL, E JÁ NÃO UM BOTÃO QUE ABRE UM MODAL          │
//  │                                                                     │
//  │ Disparava `EVENTO_BUSCA_ABRIR` e quem respondia era o `BuscaGlobal`: │
//  │ um diálogo modal com véu por cima da página, foco preso e scroll     │
//  │ bloqueado. O computador nunca fez isso — lá o painel abre ancorado   │
//  │ à barra, sem véu, e a página continua legível por trás. Eram duas    │
//  │ pesquisas com o mesmo nome e duas identidades diferentes, e a do     │
//  │ telemóvel era a que quase ninguém revia.                             │
//  │                                                                     │
//  │ Passa a ser o MESMO painel (`PainelPesquisa`, variante `movel`),     │
//  │ ancorado a esta barra e a crescer para CIMA — porque a barra vive no │
//  │ fundo do ecrã e para baixo era para fora. O contrato não modal vem   │
//  │ todo de lá: Escape fecha e devolve o foco, clicar fora fecha, o      │
//  │ `Tab` sai naturalmente, e o rodapé com as teclas passa a existir     │
//  │ também aqui.                                                        │
//  │                                                                     │
//  │ Este ficheiro fica com o que é desta superfície: a barra fechada, a  │
//  │ âncora e o registo de que existe uma barra — que é o que faz o       │
//  │ diálogo global calar-se onde há barra. Ver `motor.ts`.               │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ É UMA LIGAÇÃO — O MESMO CONTRATO DO LANÇADOR DE SECRETÁRIA           │
//  │                                                                     │
//  │ O painel entra por `next/dynamic`, portanto há uma janela real       │
//  │ entre o HTML chegar e o chunk carregar. Numa rede móvel má são       │
//  │ segundos, e um `<button>` deixaria essa pessoa a tocar numa caixa    │
//  │ que não faz nada. Sendo uma ligação para `/pesquisar` — a pesquisa   │
//  │ inteira numa página — sem JavaScript continua a haver pesquisa.      │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "@/components/ui/Icons";
import { AtalhoApoioMovel } from "@/components/navegacao/AtalhoApoio";
import { prepararIndice } from "@/lib/busca/indice";
import { CONSULTA_MOVEL, anunciarEstadoBusca, useAtalhoBusca, useRegistarLancador } from "./motor";
import { useTecladoVirtual } from "./ancoragem";

const ID_PAINEL = "rc-busca-painel-movel";
const ID_CAMPO = "rc-busca-movel";

/** A mesma fronteira do lançador de secretária: o painel é outro chunk. */
const PainelPesquisa = dynamic(() => import("./PainelPesquisa"), { ssr: false, loading: () => null });

export function DockMovel() {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);

  /**
   * Fechar devolve o foco — mas nem sempre. A regra é a mesma do lançador
   * de secretária: «quem fechou indicou destino?». Escape e o ✕ não
   * indicam; um clique fora, o `Tab` que sai e a navegação indicam.
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
    // A barra só volta a existir no commit em que o painel sai, e este
    // efeito corre depois desse commit — por isso é aqui e não no `fechar`.
    document.getElementById(ID_CAMPO)?.focus();
  }, [aberto]);

  useAtalhoBusca({ ativaQuando: CONSULTA_MOVEL, aberto, abrir, fechar: fecharComFoco });

  // Anuncia-se como barra ancorada — e só enquanto está no ecrã. Acima de
  // `lg` esta barra é `lg:hidden`: continua montada e não se vê, e
  // declarar-se presente aí calava o diálogo global em páginas que não têm
  // cabeçalho de secretária. Ver o quadro em `motor.ts`.
  useRegistarLancador(CONSULTA_MOVEL);

  // Mudar de página fecha — um painel que sobrevive à navegação fica a
  // tapar a página onde a pessoa acabou de aterrar.
  useEffect(() => {
    setAberto(false);
  }, [pathname]);

  useEffect(() => {
    anunciarEstadoBusca(aberto);
  }, [aberto]);

  /**
   * ┌───────────────────────────────────────────────────────────────────┐
   * │ O TECLADO VIRTUAL LEVANTA A ÂNCORA — E O TECTO VEM DAQUI           │
   * │                                                                   │
   * │ `position: fixed` resolve contra o viewport de LAYOUT, e esse não  │
   * │ encolhe quando o teclado abre no iOS. Sem isto, a barra e o campo  │
   * │ ficavam por baixo do teclado — a falha clássica de uma pesquisa    │
   * │ ancorada ao fundo do ecrã, e a razão de a versão anterior ter tido │
   * │ de ser um modal com a folha a seguir o `visualViewport`.           │
   * │                                                                   │
   * │ Com teclado: a âncora sobe para cima dele e o tecto do painel      │
   * │ passa a ser a altura VISÍVEL. Sem teclado: fica sobre a barra de   │
   * │ navegação e o tecto vem do CSS, que sabe exprimi-lo exactamente.   │
   * │                                                                   │
   * │ Isto vive na âncora e não no painel porque é o painel que não sabe │
   * │ onde está pousado — esteve lá e media a janela toda, deixando o    │
   * │ topo do painel fora do ecrã.                                       │
   * └───────────────────────────────────────────────────────────────────┘
   */
  const { tecladoInset, alturaVisivel } = useTecladoVirtual(aberto);

  const comTeclado = aberto && tecladoInset > 0;
  const geometria: React.CSSProperties & Record<"--rc-painel-movel-max", string | undefined> = {
    bottom: comTeclado
      ? `calc(${tecladoInset}px + var(--rc-dock-movel-ar))`
      : "calc(var(--rc-barra-h) + var(--rc-dock-movel-ar))",
    // Só com teclado. Sem ele o CSS exprime o tecto melhor do que uma
    // medição — e uma medição a mais é uma oportunidade de divergir.
    "--rc-painel-movel-max": comTeclado ? `${Math.max(220, alturaVisivel - 24)}px` : undefined,
  };

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

      {/**
       * A ÂNCORA. `relative` com altura da barra fechada: o painel é
       * posicionado contra esta caixa, em `bottom: 0`, e cresce para cima
       * sem mexer um pixel na barra que está por baixo dele.
       *
       * Sem `overflow-hidden` e sem `opacity` condicional — o painel é
       * filho desta caixa, não um irmão que a tape.
       */}
      <div className="fixed inset-x-0 z-50 px-3 transition-[bottom] duration-200 lg:hidden" style={geometria}>
        <div className="relative mx-auto h-[var(--rc-dock-movel-h)] w-full max-w-[40rem]">
          {aberto ? (
            <PainelPesquisa
              variante="movel"
              id={ID_PAINEL}
              idCampo={ID_CAMPO}
              aoFechar={fechar}
              aoFecharComFoco={fecharComFoco}
            />
          ) : (
            <div className="flex h-full w-full items-stretch gap-2">
            <Link
              href="/pesquisar"
              id={ID_CAMPO}
              // Marcador do gatilho móvel: é por aqui que o diálogo global
              // devolve o foco nos sítios onde ele ainda responde.
              data-busca-gatilho="movel"
              aria-label="Pesquisar no Recibo Certo"
              aria-expanded={false}
              aria-controls={ID_PAINEL}
              /**
               * Preparar o índice por INTENÇÃO, e não à entrada: descarregar
               * o catálogo em todas as visitas para servir quem procura numa
               * minoria delas piora exactamente as ligações que este dock
               * existe para respeitar. No telemóvel o sinal é o primeiro
               * toque, que chega antes do `click`.
               */
              onTouchStart={prepararIndice}
              onPointerEnter={prepararIndice}
              onFocus={prepararIndice}
              onClick={(e) => {
                // `⌘/Ctrl/Shift/Alt + clique` e o botão do meio pertencem ao
                // browser — são as formas de abrir noutro separador.
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                e.preventDefault();
                abrir();
              }}
              className="focus-marca group flex h-[var(--rc-dock-movel-h)] min-w-0 flex-1 items-center gap-3 rounded-2xl border border-stone-200 bg-white/95 px-4 text-left no-underline shadow-lift backdrop-blur-xl transition-[border-color,box-shadow] duration-200 hover:border-brand/40 active:border-brand/60 dark:border-stone-700 dark:bg-stone-900/95 dark:hover:border-brand/40"
            >
              <Search
                size={17}
                className="flex-shrink-0 text-stone-400 transition-colors group-hover:text-brand"
                aria-hidden
              />
              {/* A mesma frase do lançador de secretária. São a mesma
                  pesquisa: dizer «Pesquisar…» aqui e «O que precisas de
                  resolver?» lá faria parecer duas coisas diferentes a quem
                  usa o produto nos dois sítios.

                  `stone-600` e não `stone-500`: sobre o `cream` da barra o
                  500 dá 4,42:1 e a régua da WCAG AA é 4,5:1. */}
              <span className="min-w-0 flex-1 truncate text-sm text-stone-600 dark:text-stone-400">
                O que precisas de resolver?
              </span>
              {/**
               * NÃO acrescentar aqui um quadrado verde com uma lupa. É o
               * desenho óbvio para um dock de telemóvel e foi exactamente o
               * que saiu do lançador de secretária (P2-02): o mesmo ícone nas
               * duas extremidades do mesmo elemento é duas vezes o mesmo
               * significado. Lá o lado direito passou a dizer o atalho de
               * teclado; aqui não há atalho a dizer, e um lugar vazio é
               * melhor do que um repetido.
               */}
            </Link>
            <AtalhoApoioMovel />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default DockMovel;
