"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A MOLDURA DO PALCO — o que é igual nos cinco
//  ---------------------------------------------------------------------
//  Cabeçalho com sinal de estado, pausa, recomeço, régua de atos no
//  rodapé, a narração para leitor de ecrã e o relógio que move tudo.
//
//  Estava escrita duas vezes — `PalcoDescobrir` e `HeroPreco` — com as
//  mesmas decisões tomadas outra vez à mão. Ao terceiro palco isso deixa
//  de ser duplicação e passa a ser garantia de divergência: cinco palcos
//  com cinco molduras «quase iguais» é a coisa que se nota sem ninguém
//  conseguir apontar porquê.
//
//  ── O que a moldura GARANTE, e nenhum palco pode desfazer ────────────
//
//   1. **A pausa pára tudo** (WCAG 2.2.2). O relógio deixa de acumular e
//      o contexto propaga `parado` às fichas e aos contadores, que têm
//      relógio próprio precisamente por isto.
//   2. **A cena servida está resolvida.** O ato inicial é o ÚLTIMO, e só
//      a montagem rebobina. Sem JavaScript e com movimento reduzido, o
//      resultado completo está no HTML.
//   3. **Ir para um ato é pô-lo a correr**, e a repor o que ele constrói.
//   4. **A cena acaba.** Não reinicia em ciclo.
//   5. **Uma região viva por palco**, e as fichas `aria-hidden` — são a
//      FORMA de dizer o que o texto já diz.
// ═══════════════════════════════════════════════════════════════════════

import { useRef, type ReactNode } from "react";
import { Pause, Play, RotateCcw } from "@/components/ui/Icons";
import LegendaDoAto from "./legenda";
import { PalcoContexto } from "./atores";
import type { Ato } from "./relogio";
import { usePalco } from "./usePalco";
import type { TomPalco } from "@/components/foco/focos";

export interface CenaDoPalco {
  /** O índice do ato em curso. */
  ato: number;
  /** O relógio cru — só para LANÇAR fichas, nunca para desenhar. */
  feito: (id: string) => boolean;
  /**
   * O que se DESENHA lê isto, e não `feito`.
   *
   * No servidor o relógio nunca correu, portanto nenhum beat disparou —
   * desenhar a partir dele escreve `opacity: 0` no HTML servido e quem
   * chega sem JavaScript fica sem o resultado.
   */
  emCena: (id: string) => boolean;
  /** Sem JavaScript ou com movimento reduzido. */
  estatico: boolean;
  ciclo: number;
  /** O elemento onde as fichas são medidas e posicionadas. */
  palcoRef: React.RefObject<HTMLDivElement | null>;
}

/** As duas legendas que não vêm da coreografia. A ordem importa: [fim, pausa]. */
const LEGENDAS_DE_ESTADO = ["Demonstração concluída", "Demonstração em pausa"] as const;

const PELE = {
  claro: {
    seccao:
      "border-stone-200 bg-white text-ink shadow-lift dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100",
    cabecalho: "border-stone-200 dark:border-stone-700",
    titulo: "text-stone-800 dark:text-stone-100",
    legenda: "text-stone-500 dark:text-stone-400",
    botao:
      "border-stone-200 text-stone-500 hover:border-brand/50 hover:text-brand-dark dark:border-stone-700 dark:text-stone-300 dark:hover:text-brand-mint",
    rodape: "border-stone-200 dark:border-stone-700",
    calha: "bg-stone-200 dark:bg-stone-700",
    barra: "bg-brand",
    anelFoco: "ring-offset-white dark:ring-offset-stone-900",
    rotuloAtivo: "text-stone-800 dark:text-stone-100",
    rotuloFeito: "text-brand dark:text-brand-mint",
    rotuloPorVir: "text-stone-400 dark:text-stone-500",
    corpo: "",
  },
  escuro: {
    seccao: "border-brand-deep/20 bg-[#0c251e] text-white shadow-lift",
    cabecalho: "border-white/10",
    titulo: "text-white",
    legenda: "text-white/45",
    botao: "border-white/15 text-white/75 hover:border-brand-mint/60 hover:text-white",
    rodape: "border-white/10",
    calha: "bg-white/10",
    barra: "bg-brand-mint",
    anelFoco: "ring-offset-[#0c251e]",
    rotuloAtivo: "text-white",
    rotuloFeito: "text-brand-mint/65",
    rotuloPorVir: "text-white/30",
    corpo: "",
  },
} as const satisfies Record<TomPalco, Record<string, string>>;

export default function MolduraPalco({
  id,
  tom,
  nome,
  resumo,
  narracao,
  atos,
  children,
}: {
  /** Prefixo dos `id` de acessibilidade. Único por palco. */
  id: string;
  tom: TomPalco;
  /** O nome do palco: «Mesa de decisão», «A repartição»… */
  nome: string;
  /** Uma frase que diz o que a demonstração mostra. */
  resumo: string;
  /** Um item por ato: o que esse ato diz, em texto corrido. */
  narracao: readonly ReactNode[];
  atos: readonly Ato[];
  children: (cena: CenaDoPalco) => ReactNode;
}) {
  // A moldura é o que o `IntersectionObserver` do arranque vigia: a cena
  // só rebobina depois de ela estar no ecrã e de o browser ter tido um
  // momento livre. Declarada antes do hook porque é argumento dele.
  const molduraRef = useRef<HTMLElement>(null);
  const palcoRef = useRef<HTMLDivElement>(null);

  // Todo o estado — o ato inicial ser o último, a pausa parar mesmo, ir
  // para um ato pô-lo a correr — vive em `usePalco`, partilhado com o hero
  // da bússola. Ver o cabeçalho desse ficheiro.
  const {
    ato,
    feito,
    emCena,
    estatico,
    parado,
    finalizado,
    ciclo,
    barraRef,
    anuncio: anuncioManual,
    alternarPausa,
    irPara,
    rever,
    estadoPalco,
  } = usePalco(atos, molduraRef, id);

  const pele = PELE[tom];
  const cena: CenaDoPalco = { ato, feito, emCena, estatico, ciclo, palcoRef };

  return (
    <PalcoContexto.Provider value={estadoPalco}>
      <section
        ref={molduraRef}
        data-palco={id.replace(/^palco-/, "")}
        aria-labelledby={`${id}-titulo`}
        aria-describedby={`${id}-resumo`}
        className={`relative overflow-hidden rounded-[2rem] border sm:rounded-[2.5rem] ${pele.seccao}`}
      >
        <div
          className={`relative flex flex-col items-stretch justify-between gap-3 border-b px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:px-6 ${pele.cabecalho}`}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden
              className={`h-2.5 w-2.5 flex-shrink-0 rounded-full transition-colors ${
                finalizado || estatico
                  ? "bg-brand"
                  : parado
                    ? "bg-categoria-areia-text"
                    : "bg-brand"
              }`}
            />
            <div className="min-w-0">
              <h2
                id={`${id}-titulo`}
                className={`text-xs font-bold uppercase tracking-[.14em] ${pele.titulo}`}
              >
                {nome}
              </h2>
              {/* Sem `truncate`: a auditoria trata texto cortado como
                  texto que não cabe, e tem razão — uma legenda que acaba
                  em reticências a 320 px não diz o que o ato faz. Quebra,
                  e a caixa reserva o pior caso para não mudar de altura a
                  cada ato — ver `legenda.tsx`. */}
              <LegendaDoAto
                className={`mt-1 text-xs leading-snug ${pele.legenda}`}
                candidatas={[...LEGENDAS_DE_ESTADO, ...atos.map((item) => item.legenda)]}
                texto={
                  finalizado || estatico
                    ? LEGENDAS_DE_ESTADO[0]
                    : parado
                      ? LEGENDAS_DE_ESTADO[1]
                      : atos[ato]?.legenda ?? ""
                }
              />
            </div>
          </div>

          {!estatico && (
            <div className="flex items-center gap-2 sm:justify-end">
              {finalizado ? (
                // ┌─────────────────────────────────────────────────────┐
                // │ O LUGAR DO BOTÃO FICA; O BOTÃO É QUE SAI            │
                // │                                                     │
                // │ Quando a cena acaba não há nada para pausar. Só que │
                // │ tirar o botão estreita o bloco de controlos, o      │
                // │ cabeçalho deixa de precisar de duas linhas e a      │
                // │ página salta 44 px — medido em `/inicio/recibos`,   │
                // │ 0,078 de CLS contra um budget de 0,049, a 2,7 s da  │
                // │ carga. `visibility: hidden` guarda o espaço sem     │
                // │ deixar nada perceptível, focável ou clicável.       │
                // └─────────────────────────────────────────────────────┘
                <span
                  aria-hidden
                  className="invisible inline-flex min-h-[36px] items-center gap-2 rounded-full border px-3 text-xs font-semibold sm:min-h-[42px]"
                >
                  <Pause size={12} />
                  Pausar
                </span>
              ) : (
                <button
                  type="button"
                  onClick={alternarPausa}
                  aria-pressed={parado}
                  className={`focus-marca inline-flex min-h-[42px] items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors ${pele.botao}`}
                >
                  {parado ? <Play size={12} /> : <Pause size={12} />}
                  {parado ? "Retomar" : "Pausar"}
                </button>
              )}
              <button
                type="button"
                onClick={rever}
                className={`focus-marca relative inline-flex min-h-[42px] items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors ${pele.botao}`}
              >
                <RotateCcw size={12} />
                {/* «Rever» e «Recomeçar» têm larguras diferentes, e a
                    diferença chega para o cabeçalho voltar a quebrar. A
                    palavra mais larga reserva o lugar das duas. */}
                <span className="grid">
                  <span aria-hidden className="invisible col-start-1 row-start-1">
                    Recomeçar
                  </span>
                  <span className="col-start-1 row-start-1">
                    {finalizado ? "Rever" : "Recomeçar"}
                  </span>
                </span>
              </button>
            </div>
          )}
        </div>

        <p id={`${id}-resumo`} className="sr-only">
          {resumo}
        </p>
        {/* A narração completa, em texto, sempre presente. A animação é a
            FORMA de dizer isto — nunca o único sítio onde está dito. */}
        <ol className="sr-only">
          {narracao.map((linha, indice) => (
            <li key={indice}>{linha}</li>
          ))}
        </ol>
        <p className="sr-only" aria-live="polite">
          {anuncioManual}
        </p>

        <div ref={palcoRef} className="relative px-3 py-3 sm:px-5 sm:py-5">
          {tom === "escuro" && (
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:28px_28px]" />
              <div className="absolute -left-28 top-12 h-64 w-64 rounded-full bg-brand/15 blur-3xl" />
              <div className="absolute -right-24 bottom-0 h-60 w-60 rounded-full bg-[#8b7148]/10 blur-3xl" />
            </div>
          )}
          {children(cena)}
        </div>

        <ol
          className={`relative grid gap-1.5 border-t px-3 py-3 sm:px-5 ${pele.rodape}`}
          style={{ gridTemplateColumns: `repeat(${atos.length}, minmax(0, 1fr))` }}
          aria-label="Etapas da demonstração"
        >
          {atos.map((item, indice) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => irPara(indice)}
                aria-current={indice === ato ? "step" : undefined}
                aria-label={`Passo ${indice + 1} de ${atos.length}: ${item.legenda}`}
                className="focus-marca group block min-h-[42px] w-full py-1 text-left"
              >
                <span
                  className={`block h-1 overflow-hidden rounded-full group-focus-visible:ring-2 group-focus-visible:ring-brand group-focus-visible:ring-offset-2 ${pele.calha} ${pele.anelFoco}`}
                >
                  <span
                    ref={indice === ato ? barraRef : undefined}
                    className={`block h-full w-full origin-left rounded-full ${pele.barra}`}
                    style={{
                      transform: `scaleX(${
                        indice < ato || (indice === ato && (estatico || finalizado)) ? 1 : 0
                      })`,
                    }}
                  />
                </span>
                <span
                  className={`mt-1.5 block text-center text-[10px] font-bold uppercase leading-tight tracking-wide transition-colors sm:text-left sm:text-[11px] ${
                    indice === ato
                      ? pele.rotuloAtivo
                      : indice < ato
                        ? pele.rotuloFeito
                        : pele.rotuloPorVir
                  }`}
                >
                  {item.rotulo}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </section>
    </PalcoContexto.Provider>
  );
}
