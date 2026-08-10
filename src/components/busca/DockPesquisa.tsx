"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { m, AnimatePresence } from "motion/react";
import { Keyboard, Search } from "@/components/ui/Icons";
import { CATEGORIAS, categoriaPorContexto } from "@/lib/busca";
import { CONSULTA_SECRETARIA, useAtalhoBusca, useMotorBusca } from "./motor";
import { AbasCategorias, CampoBusca, ChipsFiltro, CorpoResultados, RodapeBusca } from "./partes";

/**
 * A barra de pesquisa do cabeçalho — que EXPANDE, e não abre uma janela.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ PORQUE ISTO NÃO É O MODAL QUE JÁ EXISTIA                                 │
 * │                                                                         │
 * │ No telemóvel a pesquisa é uma folha modal, e é a decisão certa: em 360px │
 * │ não há «ao lado», o teclado virtual come metade do ecrã e o conteúdo tem │
 * │ de crescer para cima a partir da zona do polegar.                        │
 * │                                                                         │
 * │ No computador o mesmo modal estava errado, e por uma razão concreta: a   │
 * │ barra vive no cabeçalho, e ao clicar nela aparecia uma caixa NOUTRO      │
 * │ SÍTIO — centrada no ecrã, com um véu escuro a apagar a página. Isso      │
 * │ lê-se como «apareceu uma janela», não como «o campo cresceu», e quem não │
 * │ reparasse no ✕ ficava com a sensação de estar preso.                     │
 * │                                                                         │
 * │ Aqui o painel abre ANCORADO à barra, imediatamente por baixo, sem véu e  │
 * │ sem prender o foco: o resto da página continua legível e clicável, e     │
 * │ clicar fora fecha. É o mesmo objecto a ficar maior.                      │
 * │                                                                         │
 * │ O que se perde ao deixar de ser modal — Escape, clique fora, saída por   │
 * │ Tab — está reimplementado aqui de forma explícita. É o padrão de         │
 * │ combobox não-modal do WAI-ARIA.                                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
export function DockPesquisa({ inputId }: { inputId?: string }) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const gerado = useId();
  const idCampo = inputId ?? `${gerado}-busca`;

  const fechar = useCallback(() => setAberto(false), []);
  const abrir = useCallback(() => setAberto(true), []);

  useAtalhoBusca({ ativaQuando: CONSULTA_SECRETARIA, aberto, abrir, fechar });

  // Mudar de página fecha — um painel que sobrevive à navegação fica a tapar
  // a página onde a pessoa acabou de aterrar.
  useEffect(() => {
    setAberto(false);
  }, [pathname]);

  /**
   * ┌─────────────────────────────────────────────────────────────────────────┐
   * │ A BARRA FECHADA SEGUE A ROTA, E NUNCA A ÚLTIMA PESQUISA                  │
   * │                                                                         │
   * │ O texto de sugestão vem do âmbito que a rota actual implica: em `/guias` │
   * │ diz «IVA, Segurança Social, IRS Jovem…»; em `classificar-atividade` diz  │
   * │ «Designer, médico, programador…». Guardar aqui o último âmbito ESCOLHIDO │
   * │ dentro do painel deixaria a barra fechada a prometer um corpus que já    │
   * │ não é o da página — e navegar para outro lado não a soltava.             │
   * │                                                                         │
   * │ Fechada, a barra fala da página onde se está. O âmbito escolhido dentro  │
   * │ do painel é estado do painel, e morre com ele.                           │
   * └─────────────────────────────────────────────────────────────────────────┘
   */
  const categoriaDaRota = categoriaPorContexto(pathname ?? "/");
  const sugestao = CATEGORIAS.find((c) => c.id === categoriaDaRota)?.placeholder ?? "Pesquisar…";

  return (
    <div className="relative h-[var(--rc-dock-h)] w-full">
      {aberto ? (
        <PainelExpandido idCampo={idCampo} aoFechar={fechar} />
      ) : (
        <BarraFechada idCampo={idCampo} sugestao={sugestao} aoAbrir={abrir} />
      )}
    </div>
  );
}

/**
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ É UMA LIGAÇÃO, E ISSO É PROGRESSIVE ENHANCEMENT A SÉRIO                  │
 * │                                                                         │
 * │ O gatilho anterior era um `<button>`, e um botão sem JavaScript é um     │
 * │ adorno: quem chegue antes do chunk carregar — rede móvel má, extensão a  │
 * │ bloquear, erro de rede — carrega e não acontece nada.                    │
 * │                                                                         │
 * │ Uma ligação resolve os três casos com um só elemento: sem JavaScript     │
 * │ navega para o índice completo de ferramentas, que é um destino honesto   │
 * │ para quem queria procurar; com JavaScript o clique normal é interceptado │
 * │ e abre o painel; e `⌘+clique` continua a abrir o índice noutro           │
 * │ separador, coisa que um `<button>` nunca poderia fazer.                  │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
function BarraFechada({
  idCampo,
  sugestao,
  aoAbrir,
}: {
  idCampo: string;
  sugestao: string;
  aoAbrir: () => void;
}) {
  return (
    <Link
      href="/ferramentas"
      id={idCampo}
      aria-label="Pesquisar ferramentas, guias e atividades"
      aria-keyshortcuts="Control+K Meta+K"
      onClick={(e) => {
        // `⌘/Ctrl/Shift/Alt + clique` e o botão do meio pertencem ao browser:
        // são as formas de abrir noutro separador, e interceptá-las seria
        // roubar à pessoa uma coisa que ela pediu explicitamente.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        aoAbrir();
      }}
      className="group flex h-[var(--rc-dock-h)] w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white/90 pl-4 pr-2 text-left no-underline shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-brand/40 hover:shadow-lift focus-visible:border-brand/50 dark:border-stone-700 dark:bg-stone-900/70 dark:hover:border-brand/40"
    >
      <Search size={17} className="flex-shrink-0 text-stone-400 transition-colors group-hover:text-brand" />
      <span className="min-w-0 flex-1 truncate text-sm text-stone-400 dark:text-stone-500">{sugestao}</span>
      <span className="hidden flex-shrink-0 items-center gap-0.5 rounded-md border border-stone-200 px-1.5 py-0.5 text-[10px] font-semibold text-stone-400 xl:inline-flex dark:border-stone-700">
        <Keyboard size={11} /> K
      </span>
      <span
        aria-hidden
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand text-white transition-colors group-hover:bg-brand-dark"
      >
        <Search size={16} />
      </span>
    </Link>
  );
}

/**
 * O painel aberto: a mesma barra, mais alta, com os resultados por baixo.
 *
 * Monta o motor — é por isso que só existe quando aberto. Sem esta separação,
 * cada página do site pagaria o índice de pesquisa e o reducer de uma pesquisa
 * que ninguém abriu.
 */
function PainelExpandido({ idCampo, aoFechar }: { idCampo: string; aoFechar: () => void }) {
  const caixa = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const motor = useMotorBusca({ aoFechar });

  const { reiniciar } = motor;
  useEffect(() => {
    reiniciar();
    input.current?.focus();
  }, [reiniciar]);

  /**
   * Fechar por clique fora e por Escape.
   *
   * Num diálogo modal o navegador trata disto. Aqui é explícito — e
   * `pointerdown` em vez de `click` porque um clique que começa DENTRO e acaba
   * fora (ao seleccionar texto, por exemplo) não deve fechar o painel.
   */
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!caixa.current?.contains(e.target as Node)) aoFechar();
    };
    const onTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        aoFechar();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onTecla);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onTecla);
    };
  }, [aoFechar]);

  return (
    <AnimatePresence>
      <m.div
        ref={caixa}
        key="painel"
        /**
         * ┌───────────────────────────────────────────────────────────────────┐
         * │ SÓ OPACIDADE — E NENHUMA TRANSFORMAÇÃO, NEM PARA CENTRAR           │
         * │                                                                   │
         * │ A posição vive toda em `.rc-dock-painel`, no CSS, e centra por     │
         * │ aritmética (`left: calc(50% - largura/2)`). Aqui não entra         │
         * │ `x`, `y` nem `scale`, e isso é deliberado:                         │
         * │                                                                   │
         * │  · uma transformação de entrada COMPÕE-SE com a que centrasse o    │
         * │    painel, e o resultado é ele aparecer deslocado antes de saltar  │
         * │    para o sítio — um defeito que só se vê em movimento, nunca      │
         * │    numa captura de ecrã;                                           │
         * │  · o painel abre exactamente por cima da barra fechada, com a      │
         * │    mesma primeira linha. Qualquer escala ou deslocamento moveria   │
         * │    o campo debaixo do cursor de quem acabou de clicar nele.         │
         * │                                                                   │
         * │ POSIÇÃO é do layout, ENTRADA é da animação. Enquanto não           │
         * │ escreverem na mesma propriedade, não há como uma partir a outra.   │
         * │                                                                   │
         * │ `opacity` é composta na GPU, sem layout nem repintura. E o         │
         * │ `MotionConfig reducedMotion="user"` da app trata do resto.         │
         * └───────────────────────────────────────────────────────────────────┘
         */
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.16 }}
        // Sair do painel com Tab fecha-o. Sem isto ficava um painel aberto por
        // trás do foco, a tapar conteúdo que a pessoa já não está a usar.
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) aoFechar();
        }}
        // Marcador estável de invariância: as auditorias contam quantos motores
        // existem, e a resposta tem de ser sempre um. Não é estilo nem dado.
        data-busca-painel="aberto"
        className="rc-dock-painel flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-float ring-1 ring-black/5 dark:border-stone-700 dark:bg-stone-900 dark:ring-white/5"
      >
        <div className="border-b border-stone-100 dark:border-stone-800">
          <CampoBusca motor={motor} inputRef={input} id={idCampo} aoFechar={aoFechar} compacto />
        </div>

        <div className="border-b border-stone-100 dark:border-stone-800">
          <AbasCategorias motor={motor} inputRef={input} variante="secretaria" />
        </div>

        <ChipsFiltro motor={motor} inputRef={input} />

        {/* `min-h-0` é o que permite ao filho rolar dentro de um flex column:
            sem isso o conteúdo empurra a caixa e o painel cresce sem fim. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <CorpoResultados motor={motor} colunas={6} />
        </div>

        <RodapeBusca motor={motor} />
      </m.div>
    </AnimatePresence>
  );
}
