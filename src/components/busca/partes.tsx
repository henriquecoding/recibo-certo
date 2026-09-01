"use client";

// ═══════════════════════════════════════════════════════════════════════
//  AS PEÇAS DA PESQUISA — partilhadas pelas duas superfícies
//  ---------------------------------------------------------------------
//  O diálogo do telemóvel e a região do cabeçalho compõem estas mesmas
//  peças por ordens diferentes: no telemóvel o campo fica em BAIXO (zona
//  do polegar, acima do teclado) e os resultados crescem para cima; no
//  computador o campo fica em cima e os resultados descem.
//
//  A ordem é da composição; o conteúdo é daqui. Uma correcção num
//  resultado — um truncamento, um contraste, um alvo pequeno de mais —
//  chega às duas superfícies de uma vez.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Calculator,
  Calendar,
  ChevronRight,
  Close,
  Coin,
  History,
  Info,
  Search,
  Trophy,
  Warning,
} from "@/components/ui/Icons";
import {
  EXEMPLOS_PESQUISA,
  INTENCOES,
  ROTULO_TIPO,
  ROTULO_TIPO_PLURAL,
  type DocumentoBusca,
  type TipoDoc,
} from "@/lib/busca/esquema";
import { MIN_CARACTERES, type ResultadoBusca } from "@/lib/busca/pontuar";
import { MAX_ALTERNATIVAS } from "@/lib/busca/plano";
import {
  CaminhoPreparado,
  ContextoDoPlano,
  FaixaApoio,
  LinhaInterpretacao,
  NotaPrivacidade,
  OutrosCaminhos,
} from "./moldura";
import { useAtalhoDoSistema } from "./motor";
import type { ControladorBusca } from "./useControladorBusca";

type IconT = React.ComponentType<{ size?: number; className?: string }>;

/**
 * O ícone vem do TIPO — não de um nome de ícone guardado em cada item.
 *
 * A versão anterior guardava a string `"Calculator"` em cada entrada do
 * índice e resolvia-a num mapa. Era mais uma ligação que nenhum compilador
 * verificava, e falhou exactamente como essas ligações falham: dez dos
 * treze nomes não existiam no mapa, caíam no ícone por omissão, e a grelha
 * aparecia com seis calculadoras iguais sem dar um único erro.
 *
 * Um `Record` sobre uma união fechada não tem esse estado: acrescentar um
 * tipo sem lhe dar ícone deixa de compilar.
 */
const ICONE_TIPO: Record<TipoDoc, IconT> = {
  ferramenta: Calculator,
  guia: BookOpen,
  atividade: Search,
  quiz: Trophy,
  plano: Coin,
  obrigacao: Calendar,
  pagina: Info,
  apoio: Briefcase,
};

/**
 * Realça o termo dentro do resultado.
 *
 * O termo é escapado antes de virar expressão regular: sem isso, escrever
 * `(` ou `*` — que aparecem em designações de actividade — lançava uma
 * excepção de sintaxe e derrubava a lista inteira a meio da escrita.
 */
export function Realce({ texto, query }: { texto: string; query: string }) {
  const termo = query.trim();
  if (!termo) return <>{texto}</>;
  const escapado = termo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const partes = texto.split(new RegExp(`(${escapado})`, "gi"));
  return (
    <>
      {partes.map((p, i) =>
        p.toLowerCase() === termo.toLowerCase() ? (
          <mark key={i} className="rounded bg-brand-light px-0.5 text-brand-dark dark:bg-brand/25 dark:text-brand">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

/* ─── Campo ────────────────────────────────────────────────────────── */

let proximoExemplo = 0;

/**
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ É UM FORMULÁRIO A SÉRIO, E ISSO RESOLVE TRÊS COISAS DE UMA VEZ       │
 * │                                                                     │
 * │ `<form role="search" action="/pesquisar">` com `name="q"`:           │
 * │                                                                     │
 * │  1. o Enter tem um destino PREVISÍVEL e partilhável. Antes abria o   │
 * │     primeiro resultado — sem dizer qual era, sem o destacar, com a   │
 * │     regra escrita em letra pequena no rodapé. Uma pessoa a escrever  │
 * │     depressa acabava numa página que não escolheu;                   │
 * │  2. funciona sem JavaScript. O `preventDefault` só existe quando há  │
 * │     controlador para o intercetar;                                   │
 * │  3. o teclado do telemóvel mostra «procurar» em vez de «enter».      │
 * │                                                                     │
 * │ O campo NÃO se anuncia como combobox. A versão anterior dizia que o  │
 * │ era — em comentário — sem `role`, sem `aria-expanded`, sem           │
 * │ `aria-activedescendant` e sem selecção visível por setas. Um padrão  │
 * │ meio implementado é pior do que nenhum: promete a um leitor de ecrã  │
 * │ um contrato que o DOM não cumpre. Isto é uma região de pesquisa com  │
 * │ ligações — e é o que diz ser.                                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */
export function FormularioBusca({
  controlador,
  inputRef,
  id,
  aoFechar,
  compacto = false,
  aoDescer,
}: {
  controlador: ControladorBusca;
  inputRef: React.RefObject<HTMLInputElement | null>;
  id: string;
  aoFechar: () => void;
  /** No cabeçalho a linha é mais baixa: alinha com o lançador fechado. */
  compacto?: boolean;
  /** ArrowDown no campo — leva o foco ao primeiro resultado, se existir. */
  aoDescer: () => void;
}) {
  /**
   * Um exemplo diferente a cada abertura — e nenhum a mexer no ecrã.
   *
   * Exemplos que rodam sozinhos dentro de um campo são uma animação
   * infinita ao lado do cursor: distraem enquanto se escreve e nunca
   * param. Rodar no MOMENTO EM QUE ABRE dá a mesma variedade sem nada em
   * movimento. O contador é de módulo porque a superfície é montada de
   * novo a cada abertura — um `useState` reiniciaria sempre no primeiro.
   */
  const exemplo = useMemo(() => EXEMPLOS_PESQUISA[proximoExemplo++ % EXEMPLOS_PESQUISA.length], []);

  return (
    <form
      role="search"
      action="/pesquisar"
      method="get"
      onSubmit={(e) => {
        // Sem consulta não há para onde ir: deixar submeter levaria a
        // `/pesquisar?q=` — uma página vazia como resposta a um Enter.
        if (controlador.consulta.trim().length < MIN_CARACTERES) e.preventDefault();
      }}
      className={`flex shrink-0 items-center gap-3 px-4 ${compacto ? "h-[var(--rc-dock-h)]" : "px-5 py-4"}`}
    >
      <Search size={compacto ? 18 : 20} className="flex-shrink-0 text-brand" aria-hidden />

      <label htmlFor={id} className="sr-only">
        Pesquisar no Recibo Certo
      </label>
      <input
        ref={inputRef}
        id={id}
        name="q"
        type="search"
        value={controlador.consulta}
        onChange={(e) => controlador.setConsulta(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            aoDescer();
          }
        }}
        placeholder={`O que precisas de resolver? Ex.: ${exemplo}`}
        autoComplete="off"
        enterKeyHint="search"
        maxLength={120}
        aria-describedby={`${id}-ajuda ${id}-estado`}
        className="min-w-0 flex-1 bg-transparent text-base font-medium text-stone-800 placeholder-stone-400 placeholder:font-normal focus:outline-none dark:text-stone-100"
      />
      {/* A intenção viaja com o formulário para o Enter sem JavaScript
          chegar a `/pesquisar` com o mesmo filtro que está no ecrã. */}
      {controlador.intencao !== "tudo" && <input type="hidden" name="i" value={controlador.intencao} />}

      <p id={`${id}-ajuda`} className="sr-only">
        Escreve pelo menos {MIN_CARACTERES} caracteres. Usa a seta para baixo para entrar nos resultados, Enter para ver
        todos e Escape para fechar.
      </p>

      {controlador.consulta && (
        <button
          type="button"
          onClick={() => {
            controlador.limparConsulta();
            inputRef.current?.focus();
          }}
          aria-label="Limpar pesquisa"
          className="focus-marca flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800"
        >
          <Close size={16} />
        </button>
      )}

      {/**
       * ┌───────────────────────────────────────────────────────────────┐
       * │ «LIMPAR» E «FECHAR» NÃO PODEM SER A MESMA CRUZ                 │
       * │                                                               │
       * │ São duas acções com consequências muito diferentes — uma       │
       * │ apaga o que escrevi, a outra faz desaparecer a pesquisa — e    │
       * │ estavam lado a lado com o mesmo ✕ do mesmo tamanho. No         │
       * │ diálogo do telemóvel, onde há largura, «Fechar» leva a         │
       * │ palavra. No cabeçalho, onde a linha tem 48 px, fica o ícone    │
       * │ com nome acessível — mas separado por um traço, para as duas   │
       * │ cruzes deixarem de parecer um par.                             │
       * └───────────────────────────────────────────────────────────────┘
       */}
      {controlador.consulta && (
        <span aria-hidden className="h-5 w-px flex-shrink-0 bg-stone-200 dark:bg-stone-700" />
      )}
      <button
        type="button"
        onClick={aoFechar}
        aria-label="Fechar pesquisa"
        className={`focus-marca flex h-9 flex-shrink-0 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 ${
          compacto ? "w-9" : "gap-1.5 px-3 text-sm font-semibold"
        }`}
      >
        {compacto ? <Close size={18} /> : "Fechar"}
      </button>
    </form>
  );
}

/* ─── Intenções ────────────────────────────────────────────────────── */

/**
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ «SIMULAR / COMPREENDER / CUMPRIR» E NÃO «FERRAMENTAS / GUIAS»        │
 * │                                                                     │
 * │ Os tipos de conteúdo são a nossa arrumação interna. Quem chega com   │
 * │ «tenho de cobrar IVA?» não sabe se precisa de um guia, de um         │
 * │ simulador ou do classificador — e obrigá-lo a escolher é pedir-lhe   │
 * │ que conheça o catálogo antes de fazer a pergunta (P1-08).            │
 * │                                                                     │
 * │ Só aparecem DEPOIS de haver consulta. Um filtro sobre uma lista      │
 * │ vazia não filtra nada — e quatro botões no estado inicial eram       │
 * │ quatro paragens de tabulação a mais num sítio onde o orçamento é de  │
 * │ dez (P0-04).                                                         │
 * └─────────────────────────────────────────────────────────────────────┘
 */
export function ChipsIntencao({
  controlador,
  inputRef,
}: {
  controlador: ControladorBusca;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  if (!controlador.temConsulta) return null;

  return (
    <div
      role="group"
      aria-label="Filtrar por intenção"
      className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-t border-stone-100 px-4 py-2 dark:border-stone-800 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {INTENCOES.map((i) => {
        const on = controlador.intencao === i.id;
        return (
          <button
            key={i.id}
            type="button"
            aria-pressed={on}
            title={i.sub}
            onClick={() => {
              controlador.setIntencao(i.id);
              inputRef.current?.focus();
            }}
            className={`focus-marca min-h-9 flex-shrink-0 rounded-lg border px-3 text-xs font-semibold transition-colors ${
              on
                ? "border-brand/40 bg-brand-light text-brand-dark dark:border-brand/40 dark:bg-brand/15 dark:text-brand"
                : "border-stone-200 bg-white text-stone-500 hover:border-brand/40 hover:text-stone-800 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
            }`}
          >
            {i.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Resultados ───────────────────────────────────────────────────── */

function isCliqueModificado(e: React.MouseEvent) {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
}

/**
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ UM RESULTADO É UM DESTINO — LOGO, É UMA LIGAÇÃO (P0-06)              │
 * │                                                                     │
 * │ Eram botões com `router.push`. Parece equivalente e não é: um botão  │
 * │ não tem endereço, e sem endereço desaparecem `⌘/Ctrl + clique`,      │
 * │ «abrir em novo separador», «copiar endereço», a pré-visualização do  │
 * │ URL na barra de estado e a semântica de ligação para quem usa leitor │
 * │ de ecrã. Seis capacidades que o browser dá de graça, deitadas fora   │
 * │ para poupar uma linha.                                               │
 * │                                                                     │
 * │ Fechar o painel só acontece no clique PRIMÁRIO sem modificadores.    │
 * │ Quem carrega em `⌘+clique` quer o resultado noutro separador E a     │
 * │ pesquisa onde estava, para abrir o próximo.                          │
 * └─────────────────────────────────────────────────────────────────────┘
 */
export function LinkResultado({
  resultado,
  query,
  posicao,
  controlador,
  aoFechar,
  destaque = false,
}: {
  resultado: ResultadoBusca;
  query: string;
  posicao: number;
  controlador: ControladorBusca;
  aoFechar: () => void;
  destaque?: boolean;
}) {
  const { doc } = resultado;
  const Icone = ICONE_TIPO[doc.tipo];

  return (
    <Link
      prefetch={false}
      href={doc.href}
      data-resultado
      onClick={(e) => {
        controlador.aoEscolher(doc, posicao);
        if (!isCliqueModificado(e)) aoFechar();
      }}
      className={`focus-marca flex w-full items-center gap-3 rounded-xl px-3 no-underline transition-colors ${
        destaque
          ? "min-h-[64px] border border-brand/25 bg-brand-light/50 py-3 dark:border-brand/30 dark:bg-brand/10"
          : "min-h-[52px] py-2.5 hover:bg-stone-50 dark:hover:bg-stone-800"
      }`}
    >
      <span
        aria-hidden
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border text-brand ${
          destaque
            ? "border-brand/20 bg-white dark:border-brand/30 dark:bg-stone-900"
            : "border-stone-100 bg-stone-50 dark:border-stone-800 dark:bg-stone-800"
        }`}
      >
        <Icone size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
          <Realce texto={doc.titulo} query={query} />
        </span>
        <span className="block truncate text-xs text-stone-600 dark:text-stone-400">{doc.descricao}</span>
      </span>
      <span className="flex flex-shrink-0 items-center gap-2">
        {/* O tipo é METADATA do resultado, não o eixo por que se procura.
            Aparece depois do título, onde confirma — não antes, onde
            obrigaria a escolher um formato antes de fazer a pergunta. */}
        <span className="hidden rounded-md border border-stone-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-600 sm:inline dark:border-stone-700 dark:text-stone-400">
          {ROTULO_TIPO[doc.tipo]}
        </span>
        <ArrowRight size={14} className="text-stone-300" aria-hidden />
      </span>
    </Link>
  );
}

function TituloGrupo({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-stone-600 dark:text-stone-400">
      {children}
    </p>
  );
}

/* ─── Estado inicial ───────────────────────────────────────────────── */

function EstadoInicial({ controlador, aoFechar }: { controlador: ControladorBusca; aoFechar: () => void }) {
  return (
    <div className="space-y-4 p-4">
      <NotaPrivacidade />
      {controlador.recentes.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-600 dark:text-stone-400">
              <History size={11} aria-hidden /> Recentes
            </p>
            {/**
             * ┌───────────────────────────────────────────────────────┐
             * │ APAGAR TEM DE ESTAR ONDE A LISTA ESTÁ                  │
             * │                                                       │
             * │ Num produto fiscal o que se escreve aqui pode ser o    │
             * │ nome de um cliente ou uma doença que dá dedução, e o   │
             * │ dispositivo pode ser partilhado. Um histórico sem      │
             * │ botão de apagar não é uma comodidade: é uma coisa que  │
             * │ a pessoa não pode desfazer. Ver `recentes.ts`.         │
             * └───────────────────────────────────────────────────────┘
             */}
            <button
              type="button"
              onClick={controlador.apagarRecentes}
              className="focus-marca rounded-lg px-2 py-1 text-[11px] font-semibold text-stone-500 transition-colors hover:text-brand-dark dark:text-stone-400 dark:hover:text-brand"
            >
              Limpar
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {controlador.recentes.map((r) => (
              <button
                key={r.termo}
                type="button"
                onClick={() => controlador.setConsulta(r.termo)}
                className="focus-marca min-h-9 rounded-lg border border-stone-200 bg-stone-50 px-2.5 text-xs font-medium text-stone-600 transition-colors hover:border-brand/40 hover:bg-white dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
              >
                {r.termo}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-600 dark:text-stone-400">
          Começar por aqui
        </p>
        <div className="space-y-1">
          {controlador.sugestoes.map((s) => (
            <Link
              prefetch={false}
              key={s.id}
              href={s.href}
              onClick={(e) => {
                if (!isCliqueModificado(e)) aoFechar();
              }}
              className="focus-marca flex min-h-[52px] items-center gap-3 rounded-xl border border-stone-100 bg-stone-50 px-3 py-2.5 no-underline transition-colors hover:border-brand/30 hover:bg-white dark:border-stone-800 dark:bg-stone-800/40 dark:hover:border-brand/40"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
                  {s.pergunta}
                </span>
                <span className="block truncate text-xs text-stone-600 dark:text-stone-400">{s.titulo}</span>
              </span>
              <ChevronRight size={14} className="flex-shrink-0 text-stone-300" aria-hidden />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Erro ─────────────────────────────────────────────────────────── */

/**
 * Quando o índice não carrega, a resposta é NAVEGAÇÃO — não uma mensagem.
 *
 * O cabeçalho não mostra pilhas de erro nem códigos: mostra os dois
 * destinos que resolvem a maior parte das intenções e um botão para tentar
 * outra vez. A pesquisa falhou; o site não.
 */
function EstadoErro({ controlador, aoFechar }: { controlador: ControladorBusca; aoFechar: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
      <Warning size={22} className="text-alert-text" aria-hidden />
      <p className="text-sm text-stone-700 dark:text-stone-300">Não foi possível carregar a pesquisa.</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={controlador.tentarDeNovo}
          className="focus-marca min-h-9 rounded-lg border border-stone-200 px-3 text-xs font-semibold text-stone-700 transition-colors hover:border-brand/40 dark:border-stone-700 dark:text-stone-300"
        >
          Tentar outra vez
        </button>
        <Link
          prefetch={false}
          href="/ferramentas"
          onClick={(e) => !isCliqueModificado(e) && aoFechar()}
          className="focus-marca min-h-9 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white no-underline"
        >
          Abrir todas as ferramentas
        </Link>
        <Link
          prefetch={false}
          href="/guias"
          onClick={(e) => !isCliqueModificado(e) && aoFechar()}
          className="focus-marca min-h-9 rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 no-underline transition-colors hover:border-brand/40 dark:border-stone-700 dark:text-stone-300"
        >
          Abrir guias
        </Link>
      </div>
    </div>
  );
}

/* ─── Sem caminho ──────────────────────────────────────────────────── */

/**
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ «SEM RESULTADOS» É UM ESTADO ÚTIL — SE FOR NAVEGÁVEL                 │
 * │                                                                     │
 * │ A versão anterior dizia «sem resultados» e oferecia uma ligação para │
 * │ os guias. Ficava-se por aí: quem escreveu uma pergunta que o         │
 * │ catálogo não conhece recebia uma frase e um beco.                    │
 * │                                                                     │
 * │ Passa a dizer o que é verdade (não encontrámos um caminho SEGURO —   │
 * │ e não «não existe»), a manter a consulta no campo, a oferecer três   │
 * │ famílias e a pesquisa completa. O apoio profissional aparece como    │
 * │ alternativa, nunca como fuga automática: quem não encontrou o que    │
 * │ procurava não pediu, por isso, para falar com um contabilista.       │
 * └─────────────────────────────────────────────────────────────────────┘
 */
function SemCaminho({
  controlador,
  aoFechar,
  listaRef,
}: {
  controlador: ControladorBusca;
  aoFechar: () => void;
  listaRef: React.RefObject<HTMLDivElement | null>;
}) {
  const FAMILIAS = [
    { href: "/ferramentas", label: "Simular um valor" },
    { href: "/guias", label: "Perceber uma regra" },
    { href: "/dashboard/prazos", label: "Ver prazos e obrigações" },
  ];

  return (
    <div ref={listaRef} className="space-y-3 p-4">
      <div className="text-center">
        <Search size={24} className="mx-auto mb-2 text-stone-300" aria-hidden />
        <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">
          Não encontrámos um caminho seguro para «{controlador.consulta.trim()}».
        </p>
        <p className="texto-mini mt-1 text-stone-600 dark:text-stone-400">
          Preferimos dizer isto a mandar-te para a página mais parecida.
        </p>
      </div>

      <div className="grid gap-1.5 sm:grid-cols-3">
        {FAMILIAS.map((f) => (
          <Link
            prefetch={false}
            key={f.href}
            href={f.href}
            data-resultado
            onClick={(e) => !isCliqueModificado(e) && aoFechar()}
            className="focus-marca flex min-h-[44px] items-center justify-center rounded-xl border border-stone-200 px-3 text-center text-xs font-semibold text-stone-700 no-underline transition-colors hover:border-brand/40 dark:border-stone-700 dark:text-stone-300"
          >
            {f.label}
          </Link>
        ))}
      </div>

      <Link
        prefetch={false}
        href={controlador.hrefTodos}
        onClick={(e) => !isCliqueModificado(e) && aoFechar()}
        className="focus-marca flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-brand-dark no-underline dark:text-brand"
      >
        Procurar em todo o site <ArrowRight size={13} aria-hidden />
      </Link>

      <FaixaApoio controlador={controlador} aoFechar={aoFechar} />
    </div>
  );
}

/* ─── Corpo ────────────────────────────────────────────────────────── */

export function CorpoResultados({
  controlador,
  aoFechar,
  listaRef,
}: {
  controlador: ControladorBusca;
  aoFechar: () => void;
  listaRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { estado, temConsulta, destaque, grupos, consulta, totalSemTeto, total } = controlador;

  if (estado === "erro") return <EstadoErro controlador={controlador} aoFechar={aoFechar} />;

  if (!temConsulta) {
    return (
      <div ref={listaRef}>
        <EstadoInicial controlador={controlador} aoFechar={aoFechar} />
      </div>
    );
  }

  if (estado === "a-carregar") {
    return (
      <div className="space-y-2 p-4" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[52px] animate-pulse rounded-xl bg-stone-100 dark:bg-stone-800" />
        ))}
      </div>
    );
  }

  /**
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ A MOLDURA SÓ APARECE QUANDO HÁ UM CAMINHO PARA MOSTRAR               │
   * │                                                                     │
   * │ Com um caminho principal — porque o primeiro resultado se destacou,  │
   * │ ou porque pertence à família que a frase nomeou — a superfície       │
   * │ mostra UMA acção, no máximo uma pergunta e as alternativas em        │
   * │ segundo plano.                                                       │
   * │                                                                     │
   * │ Sem caminho, volta a ser a lista agrupada de sempre. Não é um estado │
   * │ degradado: é a resposta honesta a uma pergunta ambígua. Coroar o     │
   * │ primeiro de uma lista empatada seria dizer a alguém que vai decidir  │
   * │ dinheiro que existe uma certeza que não existe — e a diferença entre │
   * │ as duas superfícies é exactamente essa.                              │
   * └─────────────────────────────────────────────────────────────────────┘
   */
  const plano = controlador.plano;
  if (plano && (plano.principal || plano.clarificacao)) {
    return (
      <div ref={listaRef} className="space-y-3 p-3">
        <NotaPrivacidade />
        <LinhaInterpretacao controlador={controlador} />

        {/* Uma coluna no telemóvel; a confirmação ao lado só a partir de
            `lg`, que é onde há largura para as duas sem espremer nenhuma. */}
        <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <CaminhoPreparado controlador={controlador} aoFechar={aoFechar} />
          <ContextoDoPlano controlador={controlador} />
        </div>

        <OutrosCaminhos controlador={controlador} aoFechar={aoFechar} />

        {totalSemTeto > MAX_ALTERNATIVAS + 1 && (
          <Link
            prefetch={false}
            href={controlador.hrefTodos}
            onClick={(e) => !isCliqueModificado(e) && aoFechar()}
            className="focus-marca flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-stone-200 text-sm font-semibold text-brand-dark no-underline transition-colors hover:border-brand/40 hover:bg-brand-light/40 dark:border-stone-700 dark:text-brand"
          >
            Explorar {totalSemTeto} resultados <ArrowRight size={13} aria-hidden />
          </Link>
        )}

        <FaixaApoio controlador={controlador} aoFechar={aoFechar} />
      </div>
    );
  }

  /**
   * Sem caminho E sem pergunta. Vem DEPOIS da moldura de propósito: uma
   * consulta como «1200 €» não devolve documento nenhum — nenhum título
   * fala de mil e duzentos — e mesmo assim tem uma pergunta a fazer. Se
   * este ramo viesse primeiro, respondia «sem resultados» a quem escreveu
   * a única coisa que a pesquisa reconheceu.
   */
  if (total === 0) {
    return <SemCaminho controlador={controlador} aoFechar={aoFechar} listaRef={listaRef} />;
  }

  // A posição é global na lista visível — é o `rank` que a medição regista,
  // e tem de contar o destaque como primeiro.
  let posicao = 0;

  return (
    <div ref={listaRef} className="px-2 py-2">
      {destaque && (
        <div className="mb-2 px-1">
          <TituloGrupo>Melhor resposta</TituloGrupo>
          <LinkResultado
            resultado={destaque}
            query={consulta}
            posicao={++posicao}
            controlador={controlador}
            aoFechar={aoFechar}
            destaque
          />
        </div>
      )}

      {grupos.map(([tipo, lista]) => (
        <div key={tipo} className="mb-1">
          <TituloGrupo>{ROTULO_TIPO_PLURAL[tipo]}</TituloGrupo>
          {lista.map((r) => (
            <LinkResultado
              key={r.doc.id}
              resultado={r}
              query={consulta}
              posicao={++posicao}
              controlador={controlador}
              aoFechar={aoFechar}
            />
          ))}
        </div>
      ))}

      {totalSemTeto > total && (
        <Link
          prefetch={false}
          href={controlador.hrefTodos}
          onClick={(e) => !isCliqueModificado(e) && aoFechar()}
          className="focus-marca mt-1 flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-stone-200 text-sm font-semibold text-brand-dark no-underline transition-colors hover:border-brand/40 hover:bg-brand-light/40 dark:border-stone-700 dark:text-brand"
        >
          Ver os {totalSemTeto} resultados <ArrowRight size={13} aria-hidden />
        </Link>
      )}
    </div>
  );
}

/* ─── Estado acessível e rodapé ────────────────────────────────────── */

/**
 * A contagem de resultados ANUNCIADA, e não só desenhada (P2-07).
 *
 * O rodapé mudava para «N resultados» e um leitor de ecrã não recebia
 * nada: quem não vê o painel escrevia e não sabia se tinha acertado.
 * `role="status"` com `aria-live="polite"` espera por uma pausa na fala
 * em vez de interromper cada tecla — que é o que `assertive` faria.
 */
export function EstadoAcessivel({ id, mensagem }: { id: string; mensagem: string }) {
  return (
    <p id={id} role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {mensagem}
    </p>
  );
}

export function RodapeBusca({ controlador }: { controlador: ControladorBusca }) {
  const atalho = useAtalhoDoSistema();
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-t border-stone-100 px-5 py-2.5 text-[11px] text-stone-600 dark:border-stone-800 dark:text-stone-400">
      <span className="flex items-center gap-1.5">
        <span className="hidden sm:inline">Enter abre a página de resultados</span>
        <span className="sm:hidden">Enter: ver todos</span>
        <ChevronRight size={10} className="text-stone-300" aria-hidden />
        Esc fecha
      </span>
      {controlador.temConsulta && controlador.estado === "pronto" && (
        <span className="whitespace-nowrap font-semibold tabular-nums text-brand-dark dark:text-brand">
          {controlador.totalSemTeto} resultado{controlador.totalSemTeto !== 1 ? "s" : ""}
        </span>
      )}
      {!controlador.temConsulta && atalho && (
        <span className="hidden items-center gap-1 rounded-md border border-stone-200 px-1.5 py-0.5 font-semibold text-stone-400 sm:inline-flex dark:border-stone-700">
          {atalho}
        </span>
      )}
    </div>
  );
}

export type { DocumentoBusca };
