"use client";

// Popup "Novidades & Atualizações".
//
// ⚠️ REGRA IMUTÁVEL (CLAUDE.md, regra 10) — QUANDO APARECE: só na PRIMEIRA
// visita de sempre e quando surge uma versão NOVA. Nunca a cada refresh. A
// garantia está no primeiro efeito, palavra por palavra: a versão é marcada
// como vista NO INSTANTE em que o popup é mostrado, não só ao fechar.
//
// ⚠️ REGRA INEGOCIÁVEL (CLAUDE.md, regra 11) — O QUE CARREGA AO ABRIR: só o
// MÊS ATUAL. Os meses anteriores entram fechados, como um grupo com o nome do
// mês, e os dados desse mês só são pedidos quando alguém clica nele. A regra
// vale por construção — o índice não traz sequer os títulos dos meses
// anteriores, só o nome e a contagem (ver `scripts/gen-novidades.mjs`).
//
// ── A apresentação ─────────────────────────────────────────────────────────
// Eram 176 versões numa tira única, todas expandidas: 766 marcadores de uma
// vez, sem um único ponto de referência entre "hoje" e junho. Agora a versão
// nova tem cartão próprio no topo, o mês atual é uma lista de linhas que abrem
// a pedido, e a história anterior está atrás de um grupo por mês.

import { useCallback, useEffect, useRef, useState } from "react";
import { m, AnimatePresence } from "motion/react";
import { Close, Sparkle, ChevronDown } from "@/components/ui/Icons";
import { APP_VERSION, VERSAO_STORAGE_KEY } from "@/lib/version";
import {
  carregarIndice,
  carregarMes,
  type EntradaResumo,
  type IndiceNovidades,
  type MesCompleto,
  type MesFechado,
} from "@/lib/novidades";
import { useModalA11y } from "@/hooks/useModalA11y";
import { useOverlay } from "@/components/overlays/CoordenadorOverlays";

export default function NovidadesModal() {
  const [querAbrir, setAberto] = useState(false);

  /**
   * ⚠️ REGRA IMUTÁVEL (regra 10) × COORDENADOR DE OVERLAYS (P0-05)
   *
   * As duas encaixam, e a ordem importa. A regra diz que a versão é
   * marcada como vista NO INSTANTE EM QUE O POPUP É MOSTRADO — e é isso
   * que continua a acontecer, no efeito mais abaixo, quando `aberto`
   * passa a verdadeiro.
   *
   * O que muda é o que significa «mostrado». Antes, a marca era posta no
   * momento da DECISÃO — e a auditoria encontrou o caso em que a decisão
   * e a exibição não coincidem: na primeira visita o popup era montado
   * por cima do diálogo de cookies, com o foco preso em baixo. A pessoa
   * nunca o leu, e a versão ficava marcada como vista à mesma. Agora
   * espera pela vaga: com o consentimento por decidir, isto não abre —
   * e como não abre, também não se dá por visto.
   *
   * `iniciadoPeloUtilizador: false` é o que o põe no fim da fila. É a
   * única superfície aqui que ninguém pediu.
   */
  const aberto = useOverlay("novidades", querAbrir, { modal: true, iniciadoPeloUtilizador: false });
  // `null` = ainda a carregar. A DECISÃO de abrir NÃO depende disto: é tomada
  // e persistida no efeito abaixo, com a versão que vem do módulo leve.
  const [indice, setIndice] = useState<IndiceNovidades | null>(null);
  /** Meses já carregados, por chave. Nunca há um pedido repetido. */
  const [meses, setMeses] = useState<Record<string, MesCompleto>>({});
  /** Meses cujo carregamento falhou — para o dizer em vez de fingir. */
  const [falhados, setFalhados] = useState<Record<string, true>>({});
  /** Meses anteriores que o utilizador abriu. */
  const [abertos, setAbertos] = useState<Record<string, true>>({});
  const [expandida, setExpandida] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // ⚠️ REGRA IMUTÁVEL do popup de Novidades (não alterar sem autorização):
  // o popup só pode aparecer (1) na primeira visita de sempre e (2) quando
  // surge uma NOVA versão (APP_VERSION muda no changelog). Nunca a cada
  // refresh. Aqui decide-se apenas SE se quer abrir.
  useEffect(() => {
    try {
      if (localStorage.getItem(VERSAO_STORAGE_KEY) !== APP_VERSION) setAberto(true);
    } catch {
      // ignore
    }
  }, []);

  // ⚠️ REGRA IMUTÁVEL, segunda metade: a versão é marcada como vista NO
  // INSTANTE em que o popup é mostrado — não apenas ao fechar. Assim,
  // atualizar a página com ele aberto não o faz reaparecer para a mesma
  // versão. Voltar a abrir, só com versão nova.
  useEffect(() => {
    if (!aberto) return;
    try {
      localStorage.setItem(VERSAO_STORAGE_KEY, APP_VERSION);
    } catch {
      // ignore
    }
  }, [aberto]);

  // Carrega o índice só depois de a decisão de abrir estar tomada. Se falhar,
  // o popup fecha-se em silêncio — nunca fica um diálogo vazio a bloquear a
  // página.
  useEffect(() => {
    if (!aberto || indice) return;
    let vivo = true;
    carregarIndice()
      .then((dados) => { if (vivo) setIndice(dados); })
      .catch(() => { if (vivo) setAberto(false); });
    return () => { vivo = false; };
  }, [aberto, indice]);

  /**
   * Pede UM mês. É o único caminho por onde entram dados além do índice, e
   * nunca corre sozinho: ou porque alguém mostrou intenção de abrir uma
   * entrada do mês atual (rato por cima, foco de teclado — o mesmo padrão de
   * `prefetchSimulador`), ou porque clicou no grupo de um mês anterior.
   */
  const pedirMes = useCallback((chave: string) => {
    setMeses((atuais) => {
      if (!atuais[chave]) {
        carregarMes(chave)
          .then((mes) => setMeses((m) => ({ ...m, [chave]: mes })))
          .catch(() => setFalhados((f) => ({ ...f, [chave]: true })));
      }
      return atuais;
    });
  }, []);

  function fechar() {
    // Redundante (já marcado ao mostrar), mas mantém a garantia se algo falhar.
    try {
      localStorage.setItem(VERSAO_STORAGE_KEY, APP_VERSION);
    } catch {
      // ignore
    }
    setAberto(false);
  }

  // Escape + scroll-lock + focus-trap + restauro de foco.
  useModalA11y(aberto, fechar, dialogRef);

  const alternarEntrada = (version: string, chaveMes: string) => {
    setExpandida((atual) => (atual === version ? null : version));
    pedirMes(chaveMes);
  };

  const alternarMes = (chave: string) => {
    setAbertos((atuais) => {
      const proximo = { ...atuais };
      if (proximo[chave]) delete proximo[chave];
      else proximo[chave] = true;
      return proximo;
    });
    pedirMes(chave);
  };

  /** Corpo de uma entrada, se o mês dela já cá estiver. */
  const itensDe = (chaveMes: string, version: string) =>
    meses[chaveMes]?.entradas.find((e) => e.version === version)?.itens ?? null;

  return (
    <AnimatePresence>
      {aberto && (
        <>
          <m.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9000] bg-black/50 backdrop-blur-sm"
            onClick={fechar}
            aria-hidden
          />
          {/* Contentor de posição — folha inferior no telemóvel, centrado no desktop.
              Centramos por flex (não por transform) para não colidir com a animação. */}
          <div className="pointer-events-none fixed inset-0 z-[9001] flex items-end justify-center p-0 sm:items-center sm:p-4">
            <m.div
              key="modal"
              initial={{ opacity: 0, scale: 0.97, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 16 }}
              transition={{ type: "spring", stiffness: 420, damping: 38 }}
              ref={dialogRef}
              tabIndex={-1}
              role="dialog"
              aria-modal
              aria-labelledby="novidades-titulo"
              onClick={(e) => e.stopPropagation()}
              className="pointer-events-auto flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-4xl bg-white shadow-float outline-none dark:bg-stone-900 sm:max-h-[680px] sm:rounded-4xl"
            >
              {/* Puxador (folha inferior, só no telemóvel) */}
              <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-stone-200 dark:bg-stone-700 sm:hidden" aria-hidden />

              {/* Cabeçalho */}
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-stone-100 px-5 pb-4 pt-4 dark:border-stone-800 sm:px-6 sm:pt-6">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand">
                    <Sparkle size={16} />
                  </span>
                  <div className="min-w-0">
                    <h2 id="novidades-titulo" className="font-display text-[16px] font-semibold text-stone-800 dark:text-stone-100">
                      Novidades &amp; Atualizações
                    </h2>
                    <p className="mt-0.5 text-[12px] text-stone-400 dark:text-stone-500">
                      {indice?.mesAtual
                        ? `${indice.mesAtual.rotulo} · ${indice.totalVersoes} versões no total`
                        : "Fique a par das últimas melhorias no Recibo Certo."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fechar}
                  aria-label="Fechar"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-stone-500 dark:hover:bg-stone-800"
                >
                  <Close size={16} />
                </button>
              </div>

              {/* Corpo scrollável — min-h-0 é essencial para o overflow funcionar
                  dentro do flex column. */}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {indice === null ? (
                  <Esqueleto />
                ) : (
                  <>
                    <Destaque indice={indice} />

                    {/* ── O mês atual, aberto ────────────────────────────── */}
                    {indice.mesAtual && (
                      <section aria-labelledby="novidades-mes-atual">
                        <CabecalhoMes id="novidades-mes-atual" rotulo={indice.mesAtual.rotulo} n={indice.mesAtual.entradas.length} />
                        <ul className="px-5 py-1 sm:px-6">
                          {indice.mesAtual.entradas.map((entrada) => (
                            <Linha
                              key={entrada.version}
                              entrada={entrada}
                              nova={entrada.version === APP_VERSION}
                              expandida={expandida === entrada.version}
                              itens={itensDe(indice.mesAtual!.chave, entrada.version)}
                              falhou={Boolean(falhados[indice.mesAtual!.chave])}
                              onAlternar={() => alternarEntrada(entrada.version, indice.mesAtual!.chave)}
                              onIntencao={() => pedirMes(indice.mesAtual!.chave)}
                            />
                          ))}
                        </ul>
                      </section>
                    )}

                    {/* ── Os meses anteriores, fechados ──────────────────── */}
                    {indice.anteriores.length > 0 && (
                      <div className="px-5 pb-5 pt-3 sm:px-6">
                        <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">
                          Antes disso
                        </p>
                        <div className="space-y-2">
                          {indice.anteriores.map((mes) => (
                            <GrupoMes
                              key={mes.chave}
                              mes={mes}
                              aberto={Boolean(abertos[mes.chave])}
                              dados={meses[mes.chave] ?? null}
                              falhou={Boolean(falhados[mes.chave])}
                              expandida={expandida}
                              onAlternarMes={() => alternarMes(mes.chave)}
                              onAlternarEntrada={(v) => alternarEntrada(v, mes.chave)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Rodapé */}
              <div className="shrink-0 border-t border-stone-100 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 dark:border-stone-800 sm:px-6">
                <button
                  type="button"
                  onClick={fechar}
                  className="btn-shine flex w-full items-center justify-center rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-glow transition-shadow hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                >
                  Fechar
                </button>
              </div>
            </m.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── A versão nova ─────────────────────────────────────────────────────────
   Cartão próprio, sempre aberto. É o que a pessoa veio ler; ser a primeira
   linha de uma lista uniforme tratava-a como igual às outras. Os marcadores
   vêm no índice, por isso pinta sem segundo pedido. */

function Destaque({ indice }: { indice: IndiceNovidades }) {
  const entrada = indice.mesAtual?.entradas[0];
  if (!entrada) return null;
  return (
    <div className="px-5 pb-5 pt-5 sm:px-6">
      <div className="rounded-3xl border border-brand/20 bg-brand-light/60 p-4 dark:border-brand/20 dark:bg-brand/10">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wider text-white">
            Novo
          </span>
          <span className="text-[13px] font-bold text-brand-dark dark:text-brand">v{entrada.version}</span>
          <span className="text-[11px] text-brand-dark/60 dark:text-brand/60">{entrada.dia}</span>
        </div>
        <p className="mb-2.5 font-display text-[15px] font-semibold leading-snug text-stone-800 dark:text-stone-100">
          {entrada.titulo}
        </p>
        <Itens itens={indice.destaque} />
      </div>
    </div>
  );
}

/* ── Cabeçalho de mês, colado ao topo ──────────────────────────────────────
   Fundo OPACO, não translúcido com desfoque: por cima de uma lista em
   movimento o desfoque deixava passar um fantasma da linha que ia por baixo,
   e um `backdrop-filter` a recalcular a cada fotograma é a última coisa que se
   quer numa lista que rola. */

function CabecalhoMes({ id, rotulo, n }: { id: string; rotulo: string; n: number }) {
  return (
    <h3
      id={id}
      className="sticky top-0 z-10 flex items-baseline justify-between gap-3 border-b border-stone-100 bg-white px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400 dark:border-stone-800 dark:bg-stone-900 sm:px-6"
    >
      {rotulo}
      <span className="font-semibold normal-case tracking-normal text-stone-300 dark:text-stone-600">
        {n} {n === 1 ? "versão" : "versões"}
      </span>
    </h3>
  );
}

/* ── Um mês anterior ───────────────────────────────────────────────────────
   Fechado, é uma pastinha: nome do mês e quantas versões tem. Nada deste mês
   está no browser até alguém clicar aqui — nem os títulos. É a regra 11, e é
   por isso que este componente recebe `dados: null` e não uma lista já
   carregada à espera de ser mostrada. */

function GrupoMes({
  mes,
  aberto,
  dados,
  falhou,
  expandida,
  onAlternarMes,
  onAlternarEntrada,
}: {
  mes: MesFechado;
  aberto: boolean;
  dados: MesCompleto | null;
  falhou: boolean;
  expandida: string | null;
  onAlternarMes: () => void;
  onAlternarEntrada: (version: string) => void;
}) {
  const idPainel = `novidades-grupo-${mes.chave}`;
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-stone-50/60 dark:border-stone-700/70 dark:bg-stone-800/40">
      <button
        type="button"
        onClick={onAlternarMes}
        aria-expanded={aberto}
        aria-controls={idPainel}
        className="group flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:hover:bg-stone-800/80 dark:focus-visible:ring-offset-stone-900"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-stone-700 transition-colors group-hover:text-brand-dark dark:text-stone-200 dark:group-hover:text-brand">
            {mes.rotulo}
          </span>
          <span className="mt-0.5 block text-[11px] text-stone-400 dark:text-stone-500">
            {/* "por carregar" e não "toca para carregar": o painel vive no
                telemóvel e no computador, e o dedo não é a única forma de lá
                chegar — o teclado também. */}
            {mes.n} {mes.n === 1 ? "versão" : "versões"}
            {!aberto && " · por carregar"}
          </span>
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 transition-transform duration-200 ${
            aberto ? "rotate-180 text-brand" : "text-stone-400 group-hover:text-brand"
          }`}
        />
      </button>

      {aberto && (
        <div id={idPainel} role="region" aria-label={mes.rotulo} className="border-t border-stone-200/70 bg-white px-3.5 dark:border-stone-700/70 dark:bg-stone-900">
          {dados ? (
            <ul>
              {dados.entradas.map((entrada) => (
                <Linha
                  key={entrada.version}
                  entrada={entrada}
                  nova={false}
                  expandida={expandida === entrada.version}
                  itens={entrada.itens}
                  falhou={false}
                  onAlternar={() => onAlternarEntrada(entrada.version)}
                  onIntencao={() => {}}
                />
              ))}
            </ul>
          ) : falhou ? (
            <p className="py-3 text-[12px] leading-relaxed text-stone-400">
              Não foi possível carregar {mes.rotulo}. Fecha e volta a abrir o grupo para tentar outra vez.
            </p>
          ) : (
            <EsqueletoLinhas n={Math.min(mes.n, 4)} />
          )}
        </div>
      )}
    </div>
  );
}

/* ── Uma versão ────────────────────────────────────────────────────────── */

function Linha({
  entrada,
  nova,
  expandida,
  itens,
  falhou,
  onAlternar,
  onIntencao,
}: {
  entrada: EntradaResumo;
  nova: boolean;
  expandida: boolean;
  itens: string[] | null;
  falhou: boolean;
  onAlternar: () => void;
  onIntencao: () => void;
}) {
  const idPainel = `novidades-corpo-${entrada.version}`;
  return (
    <li className="border-b border-stone-100/80 last:border-b-0 dark:border-stone-800/60">
      <button
        type="button"
        onClick={onAlternar}
        onPointerEnter={onIntencao}
        onFocus={onIntencao}
        aria-expanded={expandida}
        aria-controls={idPainel}
        className="group flex w-full items-start gap-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-900"
      >
        {/* Marca da linha temporal */}
        <span
          aria-hidden
          className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${
            nova ? "bg-brand ring-2 ring-brand/25" : "bg-stone-200 dark:bg-stone-700"
          }`}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className={`text-[12px] font-bold ${nova ? "text-brand-dark dark:text-brand" : "text-stone-500 dark:text-stone-400"}`}>
              v{entrada.version}
            </span>
            <span className="text-[11px] text-stone-400 dark:text-stone-500">{entrada.dia}</span>
          </span>
          <span
            className={`mt-0.5 block text-[13px] font-medium leading-snug transition-colors ${
              expandida
                ? "text-brand-dark dark:text-brand"
                : "text-stone-700 group-hover:text-brand-dark dark:text-stone-300 dark:group-hover:text-brand"
            }`}
          >
            {entrada.titulo}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={`mt-1 shrink-0 transition-transform duration-200 ${
            expandida ? "rotate-180 text-brand" : "text-stone-300 group-hover:text-brand dark:text-stone-600"
          }`}
        />
      </button>

      {/* Só existe no DOM quando aberta. É isto que faz a diferença entre
          pintar linhas e pintar parágrafos. */}
      {expandida && (
        <div id={idPainel} role="region" aria-label={`Detalhes da versão ${entrada.version}`} className="pb-3 pl-[18px] pr-1">
          {itens ? (
            <Itens itens={itens} />
          ) : falhou ? (
            <p className="text-[12px] leading-relaxed text-stone-400">
              Não foi possível carregar o detalhe desta versão.
            </p>
          ) : (
            <EsqueletoItens n={entrada.n} />
          )}
        </div>
      )}
    </li>
  );
}

function Itens({ itens }: { itens: string[] }) {
  return (
    <ul className="space-y-1.5">
      {itens.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed text-stone-600 dark:text-stone-400">
          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-brand" aria-hidden />
          {item}
        </li>
      ))}
    </ul>
  );
}

/* ── Estados de carregamento ───────────────────────────────────────────── */

function Esqueleto() {
  return (
    <div className="space-y-5 px-5 py-5 sm:px-6" aria-hidden>
      <div className="h-28 animate-pulse rounded-3xl bg-stone-100 dark:bg-stone-800" />
      <div className="h-3 w-28 animate-pulse rounded bg-stone-100 dark:bg-stone-800" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-2.5 w-20 animate-pulse rounded bg-stone-100 dark:bg-stone-800" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-stone-100 dark:bg-stone-800" />
        </div>
      ))}
      <p className="sr-only">A carregar as novidades…</p>
    </div>
  );
}

/** Esqueleto de linhas de versão — enquanto um mês anterior está a chegar. */
function EsqueletoLinhas({ n }: { n: number }) {
  return (
    <div className="space-y-3 py-3" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-2.5 w-16 animate-pulse rounded bg-stone-100 dark:bg-stone-800" />
          <div className="h-3 animate-pulse rounded bg-stone-100 dark:bg-stone-800" style={{ width: `${88 - i * 9}%` }} />
        </div>
      ))}
      <p className="sr-only">A carregar as versões deste mês…</p>
    </div>
  );
}

/** Esqueleto com a altura do conteúdo que aí vem — sem salto quando chega. */
function EsqueletoItens({ n }: { n: number }) {
  return (
    <div className="space-y-1.5" aria-hidden>
      {Array.from({ length: Math.min(n, 6) }, (_, i) => (
        <div key={i} className="h-3 animate-pulse rounded bg-stone-100 dark:bg-stone-800" style={{ width: `${92 - i * 7}%` }} />
      ))}
    </div>
  );
}
