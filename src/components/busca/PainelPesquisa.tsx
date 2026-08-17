"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O PAINEL DA PESQUISA — uma REGIÃO, não um diálogo, nas duas superfícies
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ PORQUE AQUI NÃO HÁ `aria-modal` — E NO TELEMÓVEL TAMBÉM DEIXOU DE    │
//  │ HAVER (P0-03)                                                        │
//  │                                                                     │
//  │ O painel abre ancorado à barra, sem véu e sem prender o foco: o      │
//  │ resto da página continua legível e clicável, e clicar fora fecha.    │
//  │ Isso é uma região não modal — e declarar `aria-modal="true"` seria   │
//  │ mentir ao leitor de ecrã sobre uma página que continua a existir.    │
//  │                                                                     │
//  │ O telemóvel era a excepção: tinha um diálogo à parte, com véu, foco  │
//  │ preso e scroll bloqueado. A justificação era o teclado virtual, e a  │
//  │ resposta certa a esse problema não era um modal — era ancorar a      │
//  │ barra ao fundo do ecrã e deixar o painel crescer para cima, que é o  │
//  │ que a variante `movel` faz. Uma superfície a menos com um contrato   │
//  │ de acessibilidade próprio para manter em dia.                        │
//  │                                                                     │
//  │ Também não é uma combobox. A versão anterior dizia sê-lo em          │
//  │ comentário e o DOM não tinha `role="combobox"`, `aria-expanded`,     │
//  │ `aria-controls`, `aria-autocomplete` nem selecção activa anunciada;  │
//  │ `ArrowDown` não movia nada e `Enter` abria um resultado que ninguém  │
//  │ via qual era. Um padrão meio implementado é pior do que nenhum.      │
//  │                                                                     │
//  │ O contrato passa a ser o simples e verdadeiro: um formulário de      │
//  │ pesquisa, uma lista de LIGAÇÕES e um `role="status"` que anuncia     │
//  │ quantas são. Tudo isto o browser já sabe fazer.                       │
//  └─────────────────────────────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useRef } from "react";
import { m, AnimatePresence } from "motion/react";
import { useOverlay } from "@/components/overlays/CoordenadorOverlays";
import { TETO_DIALOGO, TETO_POPOVER } from "@/lib/busca/pontuar";
import { focarPrimeiroResultado, useVoltarAoCampo } from "./motor";
import { ChipsIntencao, CorpoResultados, EstadoAcessivel, FormularioBusca, RodapeBusca } from "./partes";
import { useControladorBusca } from "./useControladorBusca";

/**
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ DUAS VARIANTES, UM PAINEL — E O QUE ISSO SIGNIFICA                       │
 * │                                                                         │
 * │ A do telemóvel esteve noutro ficheiro e era um DIÁLOGO MODAL: véu por    │
 * │ cima da página, foco preso, scroll bloqueado, sem o rodapé com as        │
 * │ teclas. Duas superfícies com o mesmo nome, dois desenhos diferentes e    │
 * │ dois contratos de acessibilidade — e a do telemóvel era a que quase      │
 * │ ninguém revia.                                                          │
 * │                                                                         │
 * │ O que muda entre elas é geometria, e mais nada: onde ancoram, para que   │
 * │ lado crescem, quantos resultados cabem e se o teclado virtual mexe com   │
 * │ o chão. O contrato — região não modal, fechar por Escape/fora/foco,      │
 * │ lista de ligações, `role="status"` — é o mesmo e é escrito uma vez.      │
 * │                                                                         │
 * │      secretaria   ancora no topo da barra e cresce para BAIXO            │
 * │      movel        ancora no fundo da barra e cresce para CIMA            │
 * │                                                                         │
 * │ No telemóvel a barra vive no fundo do ecrã: crescer para baixo seria     │
 * │ crescer para fora. Crescer para cima tem uma segunda vantagem, e é a     │
 * │ que decide — o campo fica encostado ao teclado virtual, com os           │
 * │ resultados todos por cima dele, em vez de metade tapada por ele.         │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
export type VariantePainel = "secretaria" | "movel";

export default function PainelPesquisa({
  id,
  idCampo,
  aoFechar,
  aoFecharComFoco,
  variante = "secretaria",
}: {
  id: string;
  idCampo: string;
  /** Fecha sem mexer no foco: clique fora, saída por Tab, navegação. */
  aoFechar: () => void;
  /** Fecha e devolve o foco à barra: Escape e o botão ✕. */
  aoFecharComFoco: () => void;
  variante?: VariantePainel;
}) {
  const movel = variante === "movel";
  const caixa = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLDivElement>(null);

  // Mais resultados no telemóvel: o painel ocupa o ecrã quase todo, e um
  // teto pensado para um popover ancorado a um cabeçalho deixaria metade da
  // altura vazia. É o mesmo teto que o diálogo usava.
  const controlador = useControladorBusca({ teto: movel ? TETO_DIALOGO : TETO_POPOVER });

  /**
   * A ALTURA NÃO SE DECIDE AQUI — decide-se na âncora.
   *
   * Esteve aqui, e estava errado por construção: este painel sabe o que
   * mostra, não sabe onde está pousado. Media a janela e punha-se com a
   * altura dela, ignorando os 64 px que a barra de navegação ocupa por
   * baixo da âncora — resultado, o topo do painel ficava fora do ecrã e o
   * rodapé com as teclas não se via.
   *
   * Quem sabe é `DockMovel`: é ele que fixa a âncora, que a levanta quando
   * o teclado virtual abre e que escreve o tecto em `--rc-painel-movel-max`.
   * Aqui só se lê o que a âncora disser (ver `.rc-dock-painel-movel`).
   */

  // ArrowUp no primeiro resultado volta ao campo — ver o quadro em `motor.ts`.
  useVoltarAoCampo(lista, input);

  /**
   * Mesmo não sendo modal, o painel pede a vaga ao coordenador.
   *
   * Não é pela invariante do `aria-modal` — essa não lhe diz respeito. É
   * porque um painel ancorado ao cabeçalho por baixo de um diálogo de
   * consentimento é uma superfície que a pessoa vê e não consegue usar.
   * Pedir vaga é a forma de ele simplesmente não aparecer nesse caso.
   */
  const permitido = useOverlay("busca", true, { modal: false, iniciadoPeloUtilizador: true });

  useEffect(() => {
    if (permitido) input.current?.focus();
  }, [permitido]);

  /**
   * Fechar por clique fora e por Escape.
   *
   * Num diálogo modal o navegador trata disto. Aqui é explícito — e
   * `pointerdown` em vez de `click` porque um clique que começa DENTRO e
   * acaba fora (ao seleccionar texto) não deve fechar o painel.
   *
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ FECHAR NO `pointerdown` DESTRUÍA O ALVO DO PRÓPRIO CLIQUE            │
   * │                                                                     │
   * │ Com a página rolada e o painel aberto, clicar em «Guias» fechava a   │
   * │ pesquisa e não navegava. A cadeia é toda de coisas correctas à peça  │
   * │ e errada no conjunto:                                                │
   * │                                                                     │
   * │  1. `pointerdown` fecha o painel;                                    │
   * │  2. o cabeçalho compacta;                                            │
   * │  3. compactado, a fila de navegação leva `display: none`;            │
   * │  4. o `click` chega a um elemento que já não está no documento — e   │
   * │     um `click` sem alvo não navega.                                  │
   * │                                                                     │
   * │ O `pointerdown` continua a fechar tudo o que é FORA do cabeçalho.    │
   * │ Dentro do cabeçalho espera-se pelo `click`: nessa altura a navegação │
   * │ já foi despachada pelo próprio elemento, e fechar a seguir não lhe   │
   * │ tira nada.                                                           │
   * │                                                                     │
   * │ (A densidade do cabeçalho deixou de mudar com a pesquisa aberta —    │
   * │ ver `Nav.tsx` — mas o passo 3 continua a poder acontecer por scroll, │
   * │ e a regra continua a ser a certa.)                                   │
   * └─────────────────────────────────────────────────────────────────────┘
   */
  useEffect(() => {
    // Sem painel no ecrã não há «clicar fora»: com `caixa.current` a null,
    // qualquer clique em qualquer sítio contaria como fora e fecharia uma
    // pesquisa que ainda nem apareceu.
    if (!permitido) return;

    const dentroDoPainel = (alvo: Node | null) => !!alvo && !!caixa.current?.contains(alvo);
    /**
     * O chrome de cada variante: o cabeçalho de secretária, ou a barra de
     * navegação do telemóvel. É o que não pode ser destruído pelo próprio
     * gesto que o toca — ver o quadro por baixo.
     */
    const CHROME = movel ? 'nav[aria-label="Navegação"]' : "nav[data-compacto]";
    const dentroDoCabecalho = (alvo: Node | null) =>
      !!alvo && !!(alvo instanceof Element ? alvo : alvo.parentElement)?.closest(CHROME);

    const onPointerDown = (e: PointerEvent) => {
      const alvo = e.target as Node | null;
      if (dentroDoPainel(alvo) || dentroDoCabecalho(alvo)) return;
      aoFechar();
    };

    const onClique = (e: MouseEvent) => {
      const alvo = e.target as Node | null;
      if (dentroDoPainel(alvo)) return;
      if (dentroDoCabecalho(alvo)) aoFechar();
    };

    /**
     * ┌───────────────────────────────────────────────────────────────────┐
     * │ O TERCEIRO CAMINHO — E ERA ESTE QUE PARTIA O CLIQUE                │
     * │                                                                   │
     * │ O painel tinha um `onBlur` que o fechava assim que o foco lhe      │
     * │ saísse. Parece a regra certa e é a que quebrava a navegação,       │
     * │ porque o foco sai no `mousedown` — antes do `pointerup`, antes do  │
     * │ `click`. Passa a ser `focusin` no documento, com a mesma regra dos │
     * │ outros dois caminhos: o `Tab` que sai do painel para a página      │
     * │ fecha; o que fica no cabeçalho não destrói o alvo do gesto.        │
     * └───────────────────────────────────────────────────────────────────┘
     */
    const onFoco = (e: FocusEvent) => {
      const alvo = e.target as Node | null;
      if (dentroDoPainel(alvo) || dentroDoCabecalho(alvo)) return;
      aoFechar();
    };

    const onTecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      // Escape não indica destino: quem o carrega quer voltar ao campo.
      aoFecharComFoco();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("click", onClique);
    document.addEventListener("focusin", onFoco);
    document.addEventListener("keydown", onTecla);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("click", onClique);
      document.removeEventListener("focusin", onFoco);
      document.removeEventListener("keydown", onTecla);
    };
  }, [aoFechar, aoFecharComFoco, permitido, movel]);

  if (!permitido) return null;

  return (
    <AnimatePresence>
      <m.div
        ref={caixa}
        key="painel"
        id={id}
        /**
         * ┌───────────────────────────────────────────────────────────────┐
         * │ SÓ OPACIDADE — E NENHUMA TRANSFORMAÇÃO, NEM PARA CENTRAR       │
         * │                                                               │
         * │ A posição vive toda em `.rc-dock-painel`, no CSS, e centra por │
         * │ aritmética (`left: calc(50% - largura/2)`). Uma transformação  │
         * │ de entrada COMPÕE-SE com a que centrasse o painel, e ele       │
         * │ apareceria deslocado antes de saltar para o sítio — defeito    │
         * │ que só se vê em movimento, nunca numa captura de ecrã.         │
         * │                                                               │
         * │ POSIÇÃO é do layout, ENTRADA é da animação.                     │
         * └───────────────────────────────────────────────────────────────┘
         */
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.16 }}
        // Marcador estável de invariância: as auditorias contam quantos
        // painéis existem, e a resposta tem de ser sempre um.
        data-busca-painel="aberto"
        data-variante={variante}
        role="search"
        aria-label="Pesquisa no ReciboCerto"
        className={`flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-float ring-1 ring-black/5 dark:border-stone-700 dark:bg-stone-900 dark:ring-white/5 ${
          movel ? "rc-dock-painel-movel" : "rc-dock-painel"
        }`}
      >
        {/**
         * ┌───────────────────────────────────────────────────────────────┐
         * │ A ORDEM VISUAL INVERTE-SE; A ORDEM DO DOM NÃO                  │
         * │                                                               │
         * │ No telemóvel o campo vai para BAIXO (zona do polegar, colado   │
         * │ ao teclado) e os resultados crescem por cima. Faz-se com       │
         * │ `order-*` e não trocando os elementos, porque a ordem do DOM é │
         * │ a ordem do `Tab` e a que o leitor de ecrã anuncia: campo,      │
         * │ filtros, resultados. Trocá-la punha quem navega por teclado a  │
         * │ atravessar a lista inteira antes de chegar ao sítio onde se    │
         * │ escreve.                                                       │
         * └───────────────────────────────────────────────────────────────┘
         */}
        <div
          className={`shrink-0 border-stone-100 dark:border-stone-800 ${
            movel ? "order-3 border-t" : "border-b"
          }`}
        >
          <FormularioBusca
            controlador={controlador}
            inputRef={input}
            id={idCampo}
            aoFechar={aoFecharComFoco}
            aoDescer={() => focarPrimeiroResultado(lista.current)}
            compacto
          />
        </div>

        <div className={`shrink-0 ${movel ? "order-2" : ""}`}>
          <ChipsIntencao controlador={controlador} inputRef={input} />
        </div>

        {/* `min-h-0` é o que permite ao filho rolar dentro de um flex column:
            sem isso o conteúdo empurra a caixa e o painel cresce sem fim. */}
        <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${movel ? "order-1" : ""}`}>
          <CorpoResultados controlador={controlador} aoFechar={aoFechar} listaRef={lista} />
        </div>

        {/* O rodapé com as teclas fica em cima no telemóvel, entre os
            resultados e os filtros: em baixo ficaria entre o campo e o
            teclado, que é o pior sítio possível para texto de 11 px. */}
        <div className={movel ? "order-0" : ""}>
          <RodapeBusca controlador={controlador} />
        </div>
        <EstadoAcessivel id={`${idCampo}-estado`} mensagem={controlador.mensagemEstado} />
      </m.div>
    </AnimatePresence>
  );
}
