"use client";

/**
 * A grelha em modo de EDIÇÃO.
 *
 * Este ficheiro só é carregado ao entrar em edição (import dinâmico no
 * `Workspace`), e é onde vive tudo o que o modo normal não precisa de
 * pagar: arrasto, redimensionamento, colisões, alvo de queda e o
 * fallback de teclado.
 *
 * Decisões que a referência A fixa e que aqui são código:
 *
 *  · O cartão arrastado levanta e escala 1.01 — não roda (§9.3).
 *  · O alvo de queda tem o TAMANHO FINAL do módulo e diz «Solte aqui
 *    para posicionar» (§43, §12.9). Não é um retângulo genérico.
 *  · Redimensionar é pelo canto inferior direito, com snap por unidade de
 *    grelha e limites do registry (§9.4).
 *  · Durante o arrasto NÃO se recalculam dados: o corpo do módulo é
 *    memoizado e nenhum loader é disparado, porque o conteúdo não mudou
 *    por o cartão ter passado da coluna 2 para a 5 (§12.18).
 *
 * O teclado faz o que o rato faz (§10): o grip é focável, `Enter` entra em
 * modo de mover, as setas movem, `Esc` cancela, `Enter` confirma, e cada
 * mudança é anunciada por `aria-live`.
 */

import { memo, useCallback, useMemo, useRef, useState } from "react";
import { MODULOS, definicao } from "@/lib/contabilistas/dashboard/modulos";
import {
  MAX_LINHA, colide, resolverColisoes,
} from "@/lib/contabilistas/dashboard/layout";
import {
  anuncioDeMovimento, anuncioDeTamanho, geometriaDoTamanho, tamanhosPermitidos,
} from "@/lib/contabilistas/dashboard/apresentacao";
import type {
  GridPlacement, WidgetDensity, WidgetPresentationConfig, WidgetSize, WidgetType,
  WorkspaceLayoutV2, WorkspaceWidgetInstance,
} from "@/lib/contabilistas/dashboard/tipos";
import MolduraModulo, { type AcaoDoMenu } from "./MolduraModulo";
import CorpoDoModulo from "./widgets";
import { estiloDaCelula } from "./celula";
import type { Broker } from "./broker";
import { usarEcraEstreito } from "./usarEcraEstreito";
import styles from "./painel-modular.module.css";

/** O corpo, memoizado: arrastar não é razão para recalcular conteúdo. */
const CorpoMemo = memo(CorpoDoModulo);

interface Arrasto {
  instanceId: string;
  /** Onde o módulo estava quando o arrasto começou. */
  origem: GridPlacement;
  /** Posição do ponteiro no início, em px. */
  x0: number;
  y0: number;
  /** Alvo atual, em unidades de grelha. */
  alvo: GridPlacement;
  tipo: "mover" | "redimensionar";
}

export default function GrelhaEdicao({
  layout, broker, href, grelhaVisivel, onAlterar, onRemover, onOrganizar, onAdicionar,
}: {
  layout: WorkspaceLayoutV2;
  broker: Broker;
  href: (destino: string) => string;
  grelhaVisivel: boolean;
  onAlterar: (items: WorkspaceWidgetInstance[]) => void;
  onRemover: (instanceId: string) => void;
  /** Abre a folha do telemóvel — é lá que a ordem e o tamanho se mexem. */
  onOrganizar: () => void;
  /**
   * Largar um módulo vindo da biblioteca.
   *
   * As entradas da biblioteca eram `draggable` e escreviam
   * `text/rc-modulo` no `dataTransfer`, com um comentário a dizer que «a
   * grelha aceita a queda». Não aceitava: não existia um único `onDrop`
   * no painel inteiro. Arrastar da biblioteca não fazia absolutamente
   * nada — o cartão voltava ao sítio e a pessoa ficava sem saber porquê.
   */
  onAdicionar: (type: WidgetType) => void;
}) {
  const estreito = usarEcraEstreito();
  const caixa = useRef<HTMLDivElement>(null);
  const [arrasto, setArrasto] = useState<Arrasto | null>(null);
  const [aMoverPorTeclado, setAMoverPorTeclado] = useState<string | null>(null);
  const [anuncio, setAnuncio] = useState("");
  /** A grelha está a ser sobrevoada por um módulo da biblioteca. */
  const [aReceber, setAReceber] = useState(false);

  /**
   * Onde o módulo estava quando o modo de mover por teclado abriu.
   *
   * Sem isto o `Escape` anunciava «Movimento cancelado» e não cancelava
   * nada: cada seta já tinha aplicado a alteração via `onAlterar`, e o
   * Escape limpava só a flag. Quem usa leitor de ecrã era a única pessoa a
   * quem o painel mentia, porque quem vê percebe que o cartão ficou onde
   * as setas o deixaram.
   */
  const origemDoTeclado = useRef<GridPlacement | null>(null);

  const colunas = layout.grid.desktop.columns;
  const visiveis = useMemo(() => layout.items.filter((i) => !i.hidden), [layout.items]);

  /** Largura de uma coluna e altura de uma linha, em px, agora. */
  const medidas = useCallback(() => {
    const el = caixa.current;
    const largura = el?.clientWidth ?? 1200;
    const gap = layout.grid.desktop.gap;
    return {
      coluna: (largura - gap * (colunas - 1)) / colunas,
      linha: layout.grid.desktop.rowHeight + gap,
    };
  }, [colunas, layout.grid.desktop.gap, layout.grid.desktop.rowHeight]);

  /* ---------------- Arrasto com ponteiro ---------------- */

  const comecar = useCallback(
    (item: WorkspaceWidgetInstance, tipo: "mover" | "redimensionar") =>
      (e: React.PointerEvent) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        setArrasto({
          instanceId: item.instanceId,
          origem: { ...item.desktop },
          x0: e.clientX,
          y0: e.clientY,
          alvo: { ...item.desktop },
          tipo,
        });
      },
    [],
  );

  const mover = useCallback(
    (e: React.PointerEvent) => {
      if (!arrasto) return;
      const { coluna, linha } = medidas();
      const dCol = Math.round((e.clientX - arrasto.x0) / coluna);
      const dRow = Math.round((e.clientY - arrasto.y0) / linha);
      const o = arrasto.origem;
      const def = MODULOS[visiveis.find((i) => i.instanceId === arrasto.instanceId)!.type];

      const alvo: GridPlacement =
        arrasto.tipo === "mover"
          ? {
              col: Math.min(Math.max(o.col + dCol, 1), Math.max(1, colunas - o.colSpan + 1)),
              row: Math.min(Math.max(o.row + dRow, 1), MAX_LINHA),
              colSpan: o.colSpan,
              rowSpan: o.rowSpan,
            }
          : {
              col: o.col,
              row: o.row,
              colSpan: Math.min(
                Math.max(o.colSpan + dCol, def.colSpan.min),
                Math.min(def.colSpan.max, colunas - o.col + 1),
              ),
              rowSpan: Math.min(Math.max(o.rowSpan + dRow, def.rowSpan.min), def.rowSpan.max),
            };

      // Só atualiza se mudou de célula: evita re-render a cada pixel.
      if (
        alvo.col !== arrasto.alvo.col || alvo.row !== arrasto.alvo.row ||
        alvo.colSpan !== arrasto.alvo.colSpan || alvo.rowSpan !== arrasto.alvo.rowSpan
      ) {
        setArrasto({ ...arrasto, alvo });
      }
    },
    [arrasto, colunas, medidas, visiveis],
  );

  const largar = useCallback(() => {
    if (!arrasto) return;
    const items = layout.items.map((i) =>
      i.instanceId === arrasto.instanceId ? { ...i, desktop: { ...arrasto.alvo } } : i,
    );
    // Só os vizinhos que realmente colidem se mexem (§5.10).
    onAlterar(resolverColisoes(items, arrasto.instanceId, colunas));
    const item = layout.items.find((i) => i.instanceId === arrasto.instanceId);
    if (item) {
      setAnuncio(
        arrasto.tipo === "mover"
          ? anuncioDeMovimento(item.tag, MODULOS[item.type].titulo, arrasto.alvo)
          : anuncioDeTamanho(item.tag, MODULOS[item.type].titulo, arrasto.alvo),
      );
    }
    setArrasto(null);
  }, [arrasto, colunas, layout.items, onAlterar]);

  /* ---------------- Teclado ---------------- */

  const moverPorTeclado = useCallback(
    (item: WorkspaceWidgetInstance, dCol: number, dRow: number) => {
      const alvo: GridPlacement = {
        ...item.desktop,
        col: Math.min(Math.max(item.desktop.col + dCol, 1), Math.max(1, colunas - item.desktop.colSpan + 1)),
        row: Math.min(Math.max(item.desktop.row + dRow, 1), MAX_LINHA),
      };
      const items = layout.items.map((i) =>
        i.instanceId === item.instanceId ? { ...i, desktop: alvo } : i,
      );
      onAlterar(resolverColisoes(items, item.instanceId, colunas));
      setAnuncio(anuncioDeMovimento(item.tag, MODULOS[item.type].titulo, alvo));
    },
    [colunas, layout.items, onAlterar],
  );

  /**
   * Muda uma opção de apresentação do módulo.
   *
   * Passa por `onAlterar` como qualquer outra alteração, e isso é o
   * essencial: a configuração entra no MESMO rascunho, na MESMA pilha de
   * Desfazer e na MESMA gravação atómica do layout. Uma opção que se
   * gravasse à parte era uma segunda escrita a competir com a revisão do
   * layout, e a primeira das duas a chegar perdia.
   */
  const mudarConfig = useCallback(
    (item: WorkspaceWidgetInstance, mudanca: WidgetPresentationConfig) => {
      onAlterar(layout.items.map((i) =>
        i.instanceId === item.instanceId
          ? { ...i, config: limparConfig({ ...i.config, ...mudanca }) }
          : i,
      ));
    },
    [layout.items, onAlterar],
  );

  const mudarTamanho = useCallback(
    (item: WorkspaceWidgetInstance, tamanho: WidgetSize) => {
      const alvo = geometriaDoTamanho(item.type, tamanho, item.desktop);
      const corrigido: GridPlacement = {
        ...alvo,
        col: Math.min(alvo.col, Math.max(1, colunas - alvo.colSpan + 1)),
      };
      const items = layout.items.map((i) =>
        i.instanceId === item.instanceId ? { ...i, desktop: corrigido } : i,
      );
      onAlterar(resolverColisoes(items, item.instanceId, colunas));
      setAnuncio(anuncioDeTamanho(item.tag, MODULOS[item.type].titulo, corrigido));
    },
    [colunas, layout.items, onAlterar],
  );

  /* ---------------- Render ---------------- */

  const ocupadosSemArrasto = visiveis
    .filter((i) => i.instanceId !== arrasto?.instanceId)
    .map((i) => i.desktop);
  const alvoInvalido = arrasto ? colide(arrasto.alvo, ocupadosSemArrasto) : false;

  return (
    <>
      <div
        ref={caixa}
        className={`${styles.grelha} ${styles.grelhaEdicao} ${
          grelhaVisivel ? styles.grelhaVisivel : ""
        } ${aReceber ? styles.grelhaAReceber : ""}`}
        onPointerMove={arrasto ? mover : undefined}
        onPointerUp={arrasto ? largar : undefined}
        onPointerCancel={arrasto ? largar : undefined}
        onDragOver={(e) => {
          // Sem `preventDefault` o browser recusa a queda por omissão, e
          // era essa a razão de o arrasto da biblioteca não dar nada.
          if (!e.dataTransfer.types.includes("text/rc-modulo")) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          if (!aReceber) setAReceber(true);
        }}
        onDragLeave={(e) => {
          // Só quando sai mesmo da grelha — entrar num filho dispara
          // `dragleave` no pai, e a moldura piscava a cada cartão.
          if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
          setAReceber(false);
        }}
        onDrop={(e) => {
          const tipo = e.dataTransfer.getData("text/rc-modulo");
          setAReceber(false);
          if (!tipo) return;
          e.preventDefault();
          if (definicao(tipo)) onAdicionar(tipo as WidgetType);
        }}
      >
        {visiveis.map((item) => {
          const aArrastar = arrasto?.instanceId === item.instanceId;
          const geo = aArrastar ? arrasto.alvo : item.desktop;
          const tamanhos = tamanhosPermitidos(item.type);

          // ⚠️ Abaixo dos 640px a grelha é uma LISTA e `grid-column`/`grid-row`
          // são ignorados. «Mover para a esquerda» e os tamanhos de grelha
          // escreviam coordenadas que o ecrã não lê — o menu aceitava o
          // toque e não acontecia nada. Aqui as entradas são as que MEXEM
          // mesmo: a ordem e o tamanho da lista vivem em `mobile`, e quem
          // lhes toca é a folha «Organizar painel».
          const acoes: AcaoDoMenu[] = estreito
            ? [
                { rotulo: "Organizar e reordenar…", onSelect: onOrganizar },
                {
                  rotulo: "Remover do painel",
                  onSelect: () => onRemover(item.instanceId),
                  separar: true,
                  perigoso: true,
                },
              ]
            : [
                { rotulo: "Mover para cima", onSelect: () => moverPorTeclado(item, 0, -1) },
                { rotulo: "Mover para baixo", onSelect: () => moverPorTeclado(item, 0, 1) },
                { rotulo: "Mover para a esquerda", onSelect: () => moverPorTeclado(item, -1, 0) },
                { rotulo: "Mover para a direita", onSelect: () => moverPorTeclado(item, 1, 0) },
                ...tamanhos.map((t, idx) => ({
                  rotulo: `Tamanho ${NOME_DO_TAMANHO[t]}`,
                  onSelect: () => mudarTamanho(item, t),
                  separar: idx === 0,
                })),
                // As opções que ESTE módulo declara suportar, e só essas.
                // Um formulário genérico com as seis chaves ofereceria
                // interruptores sem efeito — que é exatamente o problema
                // que isto corrige.
                ...opcoesDoModulo(item).map((o, idx) => ({
                  rotulo: o.rotulo,
                  onSelect: () => mudarConfig(item, o.mudanca),
                  separar: idx === 0,
                })),
                {
                  rotulo: "Remover do painel",
                  onSelect: () => onRemover(item.instanceId),
                  separar: true,
                  perigoso: true,
                },
              ];

          return (
            <div
              key={item.instanceId}
              className={styles.celula}
              style={estiloDaCelula(item, geo)}
            >
              <MolduraModulo
                type={item.type}
                tag={item.tag}
                placement={geo}
                edicao
                aArrastar={aArrastar}
                acoes={acoes}
                arrastarProps={{
                  // Num ecrã em lista, arrastar escreveria coordenadas de
                  // grelha que ninguém lê. Não se instala o handler.
                  onPointerDown: estreito
                    ? undefined
                    : (comecar(item, "mover") as unknown as React.PointerEventHandler<HTMLButtonElement>),
                  onKeyDown: (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      const jaEstava = aMoverPorTeclado === item.instanceId;
                      if (jaEstava) {
                        origemDoTeclado.current = null;
                        setAMoverPorTeclado(null);
                        setAnuncio("Movimento confirmado.");
                      } else {
                        origemDoTeclado.current = { ...item.desktop };
                        setAMoverPorTeclado(item.instanceId);
                        setAnuncio(
                          `A mover ${MODULOS[item.type].titulo} (${item.tag}). Use as setas. Enter confirma, Escape cancela.`,
                        );
                      }
                      return;
                    }
                    if (aMoverPorTeclado !== item.instanceId) return;
                    const passos: Record<string, [number, number]> = {
                      ArrowUp: [0, -1], ArrowDown: [0, 1],
                      ArrowLeft: [-1, 0], ArrowRight: [1, 0],
                    };
                    if (e.key === "Escape") {
                      e.preventDefault();
                      // Cancelar é repor, não é só fechar o modo.
                      const origem = origemDoTeclado.current;
                      if (origem) {
                        const items = layout.items.map((i) =>
                          i.instanceId === item.instanceId ? { ...i, desktop: { ...origem } } : i,
                        );
                        onAlterar(resolverColisoes(items, item.instanceId, colunas));
                      }
                      origemDoTeclado.current = null;
                      setAMoverPorTeclado(null);
                      setAnuncio("Movimento cancelado. O módulo voltou ao sítio onde estava.");
                      return;
                    }
                    const p = passos[e.key];
                    if (p) {
                      e.preventDefault();
                      moverPorTeclado(item, p[0], p[1]);
                    }
                  },
                  "aria-pressed": aMoverPorTeclado === item.instanceId,
                }}
                onRedimensionar={
                  estreito
                    ? undefined
                    : (comecar(item, "redimensionar") as unknown as (e: React.PointerEvent<HTMLButtonElement>) => void)
                }
              >
                {/* Havia aqui uma prop `versao={broker.versao}`, que existia
                    só para o `memo` deixar passar a chegada de dados: os
                    widgets liam o broker durante o render e nenhuma prop
                    mudava quando os dados chegavam.
                    Deixou de ser precisa. Cada widget subscreve os seus
                    domínios com `useSyncExternalStore`, e um componente que
                    se re-renderiza a si próprio não precisa de autorização
                    do `memo` do pai. */}
                <CorpoMemo
                  type={item.type}
                  colSpan={item.desktop.colSpan}
                  rowSpan={item.desktop.rowSpan}
                  broker={broker}
                  config={item.config}
                  href={href}
                />
              </MolduraModulo>
            </div>
          );
        })}

        {/* O alvo de queda, com o tamanho final e a copy da referência. */}
        {arrasto && (
          <div
            aria-hidden
            className={styles.celula}
            style={{
              gridColumn: `${arrasto.alvo.col} / span ${arrasto.alvo.colSpan}`,
              gridRow: `${arrasto.alvo.row} / span ${arrasto.alvo.rowSpan}`,
            }}
          >
            <div className={styles.alvo} style={alvoInvalido ? { opacity: 0.55 } : undefined}>
              <span className={styles.alvoTexto}>
                {alvoInvalido ? "Os vizinhos descem para abrir espaço" : "Solte aqui para posicionar"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* O que muda é anunciado — a §10 exige-o para quem não vê o ecrã. */}
      <p aria-live="polite" className="sr-only">{anuncio}</p>
    </>
  );
}

const NOME_DO_TAMANHO: Record<WidgetSize, string> = {
  S: "pequeno", M: "médio", L: "grande", XL: "extra grande",
};


/* ------------------------------------------------------------------ */
/* Opções de apresentação                                              */
/* ------------------------------------------------------------------ */

/**
 * Uma chave sem valor não fica no layout.
 *
 * `{ density: undefined }` serializa para `{}` em JSON mas conta como
 * chave em TypeScript, e um `Object.keys` sobre isso diz que há
 * configuração onde não há. Limpar aqui mantém a assinatura canónica do
 * layout estável — que é o que decide se o rascunho está sujo, e portanto
 * se sair da página faz uma pergunta.
 */
function limparConfig(c: WidgetPresentationConfig): WidgetPresentationConfig | undefined {
  const saida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(c)) if (v !== undefined) saida[k] = v;
  return Object.keys(saida).length > 0 ? (saida as WidgetPresentationConfig) : undefined;
}

/**
 * ⚠️ Os ciclos começam sempre em `undefined` — «sem escolha».
 *
 * É o que garante que dar a volta ao ciclo devolve o módulo ao
 * comportamento automático. Sem essa entrada, quem experimentasse uma
 * densidade nunca mais conseguia voltar atrás pelo menu.
 *
 * E não há `expanded` nem `full` na lista: a densidade escolhida só pode
 * APERTAR a automática (ver `densidadeEfetiva`), e oferecer valores que
 * seriam ignorados é oferecer um interruptor sem efeito.
 */
const CICLO_DENSIDADE: (WidgetDensity | undefined)[] = [undefined, "normal", "compact"];
const CICLO_MAX: (number | undefined)[] = [undefined, 3, 5, 8];
const CICLO_ORDEM: WidgetPresentationConfig["sort"][] = [undefined, "deadline", "alpha"];

const NOME_DENSIDADE: Record<string, string> = {
  compact: "compacta", normal: "normal", expanded: "ampla", full: "completa",
};
const NOME_ORDEM: Record<string, string> = {
  deadline: "mais antigos primeiro", alpha: "alfabética",
};

/** O elemento a seguir a `atual` num ciclo, dando a volta no fim. */
function seguinte<T>(ciclo: T[], atual: T): T {
  const i = ciclo.findIndex((v) => v === atual);
  return ciclo[(i + 1) % ciclo.length];
}

/**
 * As entradas de menu que este módulo oferece.
 *
 * Cada uma diz o estado ATUAL e muda para o seguinte ao ser escolhida — é
 * o que permite caber num menu de uma coluna sem abrir um formulário, e
 * era essa a recomendação: «um painel curto de configuração, não um
 * formulário genérico com todas as chaves».
 *
 * A lista sai de `MODULOS[type].opcoes`. O que o módulo não implementa
 * não aparece aqui, e o que aparece aqui tem efeito no ecrã ao fim do
 * mesmo clique.
 */
function opcoesDoModulo(
  item: WorkspaceWidgetInstance,
): { rotulo: string; mudanca: WidgetPresentationConfig }[] {
  const suportadas = MODULOS[item.type].opcoes;
  const c = item.config ?? {};
  const saida: { rotulo: string; mudanca: WidgetPresentationConfig }[] = [];

  if (suportadas.includes("density")) {
    saida.push({
      rotulo: `Densidade: ${c.density ? NOME_DENSIDADE[c.density] : "automática"}`,
      mudanca: { density: seguinte(CICLO_DENSIDADE, c.density) },
    });
  }
  if (suportadas.includes("maxItems")) {
    saida.push({
      rotulo: `Mostrar: ${c.maxItems ? `${c.maxItems} linhas` : "o que couber"}`,
      mudanca: { maxItems: seguinte(CICLO_MAX, c.maxItems) },
    });
  }
  if (suportadas.includes("showCompleted")) {
    saida.push({
      rotulo: c.showCompleted === false ? "Mostrar concluídos" : "Esconder concluídos",
      mudanca: { showCompleted: c.showCompleted === false ? undefined : false },
    });
  }
  if (suportadas.includes("sort")) {
    saida.push({
      rotulo: `Ordem: ${c.sort ? NOME_ORDEM[c.sort] : "mais recentes primeiro"}`,
      mudanca: { sort: seguinte(CICLO_ORDEM, c.sort) },
    });
  }
  return saida;
}
