"use client";

import type { ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  Building,
  Calculator,
  ChevronRight,
  Close,
  Gauge,
  History,
  MapPin,
  Receipt,
  Scale,
  Search,
  ShieldCheck,
  ShoppingBag,
  Swap,
  Trophy,
  Wallet,
  Zap,
} from "@/components/ui/Icons";
import type { ItemBusca } from "@/lib/busca";
import { CATEGORIAS } from "@/lib/busca";
import { NAV_APRENDER, NAV_FERRAMENTAS } from "@/components/nav-config";
import type { MotorBusca } from "./motor";

// ─────────────────────────────────────────────────────────────────────
// As peças visuais da pesquisa, partilhadas pelas duas superfícies.
//
// A folha do telemóvel e o painel do cabeçalho compõem estas mesmas peças
// por ordens diferentes — no telemóvel o campo fica em BAIXO (zona do
// polegar, acima do teclado) e os resultados crescem para cima; no
// computador o campo fica em cima e os resultados descem.
//
// A ordem é da composição; o conteúdo é daqui. Assim uma correcção num
// resultado — um truncamento, um contraste, um alvo pequeno de mais —
// chega às duas superfícies de uma vez.
// ─────────────────────────────────────────────────────────────────────

type IconT = React.ComponentType<{ size?: number; className?: string }>;

/**
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ O MAPA TEM DE COBRIR TODOS OS NOMES QUE O ÍNDICE USA                     │
 * │                                                                         │
 * │ Tinha três entradas e o índice usa treze nomes. As outras dez caíam no   │
 * │ ícone por omissão — e o resultado era uma grelha de seis cartões com a   │
 * │ MESMA calculadora, o que não parece um bug, parece um descuido de        │
 * │ desenho. Falhou em silêncio porque um fallback nunca dá erro.            │
 * │                                                                         │
 * │ O teste `busca-icones` confirma que cada `icone` de `FERRAMENTAS` e      │
 * │ `GUIAS` existe aqui: acrescentar um item com um ícone novo passa a       │
 * │ reprovar em vez de aparecer cinzento na interface.                       │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
export const ICONES: Record<string, IconT> = {
  BookOpen,
  Building,
  Calculator,
  Gauge,
  MapPin,
  Receipt,
  Scale,
  Search,
  ShieldCheck,
  ShoppingBag,
  Swap,
  Trophy,
  Wallet,
};

export function Icone({ nome, size = 16, className }: { nome: string; size?: number; className?: string }) {
  const C = ICONES[nome] ?? Calculator;
  return <C size={size} className={className} />;
}

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

export function CampoBusca({
  motor,
  inputRef,
  id,
  aoFechar,
  compacto = false,
  mostrarFechar = true,
}: {
  motor: MotorBusca;
  inputRef: React.RefObject<HTMLInputElement | null>;
  id: string;
  aoFechar: () => void;
  /** No cabeçalho a linha é mais baixa: o painel alinha com a barra fechada. */
  compacto?: boolean;
  mostrarFechar?: boolean;
}) {
  return (
    <div
      /**
       * A primeira linha do painel tem EXACTAMENTE a altura da barra fechada.
       *
       * O painel abre por cima dela, e o campo tem de ficar no mesmo pixel:
       * quatro píxeis de diferença bastam para o texto dar um salto debaixo do
       * cursor de quem acabou de clicar. Daí o token, e não um número à mão —
       * afinar a barra passa a afinar as duas coisas ao mesmo tempo.
       */
      className={`flex shrink-0 items-center gap-3 px-4 ${compacto ? "h-[var(--rc-dock-h)]" : "px-5 py-4"}`}
    >
      <Search size={compacto ? 18 : 20} className="flex-shrink-0 text-brand" />

      <label htmlFor={id} className="sr-only">
        Pesquisar {motor.categoriaAtual.label}
      </label>
      <input
        ref={inputRef}
        id={id}
        type="search"
        value={motor.query}
        onChange={(e) => motor.setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            motor.aoSubmeter();
          }
        }}
        placeholder={motor.categoriaAtual.placeholder}
        autoComplete="off"
        enterKeyHint="search"
        maxLength={120}
        className="min-w-0 flex-1 bg-transparent text-base font-medium text-stone-800 placeholder-stone-400 placeholder:font-normal focus:outline-none dark:text-stone-100"
      />

      {motor.query && (
        <button
          type="button"
          onClick={() => {
            motor.setQuery("");
            inputRef.current?.focus();
          }}
          aria-label="Limpar pesquisa"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800"
        >
          <Close size={16} />
        </button>
      )}

      {mostrarFechar && (
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar pesquisa"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800"
        >
          <Close size={18} />
        </button>
      )}
    </div>
  );
}

/* ─── Categorias ───────────────────────────────────────────────────── */

/**
 * As três categorias, dentro do próprio objecto de pesquisa.
 *
 * `role="tablist"` seria errado: um separador troca de painel, e aqui o
 * painel é o mesmo — o que muda é o corpus consultado. São botões com
 * `aria-pressed`, que é o que um leitor de ecrã precisa de ouvir:
 * «Guias, ativo».
 */
export function AbasCategorias({
  motor,
  inputRef,
  variante = "movel",
}: {
  motor: MotorBusca;
  inputRef: React.RefObject<HTMLInputElement | null>;
  variante?: "movel" | "secretaria";
}) {
  const secretaria = variante === "secretaria";
  return (
    <div
      role="group"
      aria-label="Âmbito da pesquisa"
      className="flex shrink-0 items-center gap-2 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {CATEGORIAS.map((c) => {
        const ativo = motor.categoria === c.id;
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={ativo}
            onClick={() => {
              motor.trocarCategoria(c.id);
              inputRef.current?.focus();
            }}
            className={
              secretaria
                ? `flex h-10 flex-shrink-0 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition-colors ${
                    ativo
                      ? "border-brand/30 bg-brand-light text-brand-dark dark:border-brand/40 dark:bg-brand/15 dark:text-brand"
                      : "border-stone-200 bg-white text-stone-500 hover:border-stone-300 hover:text-stone-800 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
                  }`
                : `flex min-h-[44px] flex-shrink-0 flex-col items-center gap-1.5 rounded-xl border px-4 py-2.5 transition-colors ${
                    ativo
                      ? "border-brand/30 bg-brand-light text-brand-dark shadow-sm dark:border-brand/40 dark:bg-brand/15 dark:text-brand"
                      : "border-stone-200 bg-stone-50 text-stone-500 hover:border-stone-300 hover:bg-white dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
                  }`
            }
          >
            <span
              className={
                secretaria
                  ? "flex items-center"
                  : `flex h-9 w-9 items-center justify-center rounded-lg ${
                      ativo ? "bg-brand text-white" : "bg-white text-stone-400 dark:bg-stone-700 dark:text-stone-300"
                    }`
              }
            >
              <Icone nome={c.icone} size={secretaria ? 15 : 18} />
            </span>
            <span className={secretaria ? "" : "text-[11px] font-semibold leading-none"}>{c.label}</span>
            {secretaria && ativo && (
              <span className="text-[11px] font-medium text-brand-dark dark:text-brand">{c.sub}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Filtros ──────────────────────────────────────────────────────── */

export function ChipsFiltro({
  motor,
  inputRef,
}: {
  motor: MotorBusca;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  if (!motor.temQuery && motor.categoria !== "atividades") return null;

  return (
    <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-t border-stone-100 px-4 py-2 dark:border-stone-800 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <span className="flex-shrink-0 pr-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-600">
        Filtrar
      </span>
      {motor.filtros.map((f) => {
        const on = motor.filtro === f.id;
        return (
          <button
            key={f.id}
            type="button"
            aria-pressed={on}
            onClick={() => {
              motor.setFiltro(f.id);
              inputRef.current?.focus();
            }}
            className={`min-h-9 flex-shrink-0 rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
              on
                ? "border-brand/40 bg-brand-light text-brand-dark dark:border-brand/40 dark:bg-brand/15 dark:text-brand"
                : "border-stone-200 bg-white text-stone-500 hover:border-brand/40 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
            }`}
          >
            {f.label}
          </button>
        );
      })}
      {motor.filtro !== "all" && (
        <button
          type="button"
          onClick={() => motor.setFiltro("all")}
          className="flex min-h-9 flex-shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-stone-600 hover:text-stone-800"
        >
          <Close size={12} /> Limpar
        </button>
      )}
      <span className="ml-auto flex-shrink-0 whitespace-nowrap pl-2 text-[11px] font-bold tabular-nums text-stone-600">
        {motor.totalResultados}
      </span>
    </div>
  );
}

/* ─── Cartões do estado inicial ────────────────────────────────────── */

function CartaoRapido({ item, aoAbrir }: { item: ItemBusca; aoAbrir: (href: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => aoAbrir(item.href)}
      title={item.titulo}
      className="flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl border border-stone-100 bg-stone-50 px-2 py-3 text-center transition-colors hover:border-brand/30 hover:bg-white dark:border-stone-800 dark:bg-stone-800/50 dark:hover:border-brand/40"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-light text-brand">
        <Icone nome={item.icone} size={15} />
      </span>
      <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-stone-700 dark:text-stone-200">
        {item.titulo}
      </span>
    </button>
  );
}

function LinhaResultado({
  titulo,
  descricao,
  icone,
  query,
  aoAbrir,
}: {
  titulo: string;
  descricao: string;
  icone: ReactNode;
  query: string;
  aoAbrir: () => void;
}) {
  return (
    <button
      type="button"
      onClick={aoAbrir}
      className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-stone-100 bg-stone-50 text-brand dark:border-stone-800 dark:bg-stone-800">
        {icone}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
          <Realce texto={titulo} query={query} />
        </span>
        <span className="block truncate text-xs text-stone-600 dark:text-stone-400">{descricao}</span>
      </span>
      <ArrowRight size={14} className="flex-shrink-0 text-stone-300" />
    </button>
  );
}

function Seccao({ titulo, Icon, children }: { titulo: string; Icon: IconT; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-600">
        <Icon size={11} /> {titulo}
      </p>
      {children}
    </div>
  );
}

/* ─── Corpo ────────────────────────────────────────────────────────── */

export function CorpoResultados({ motor, colunas = 3 }: { motor: MotorBusca; colunas?: 3 | 6 }) {
  const { temQuery, categoria, grupos, resultadosAtividades, totalResultados, query } = motor;

  const grelha = colunas === 6 ? "grid-cols-3 sm:grid-cols-6" : "grid-cols-3";

  /* Estado inicial de Ferramentas — os acessos rápidos. */
  if (!temQuery && categoria === "ferramentas") {
    return (
      <div className="space-y-5 p-4">
        {motor.recentes.length > 0 && (
          <Seccao titulo="Pesquisas recentes" Icon={History}>
            <div className="flex flex-wrap gap-1.5">
              {motor.recentes.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => motor.setQuery(h)}
                  className="min-h-9 rounded-lg border border-stone-200 bg-stone-50 px-2.5 text-xs font-medium text-stone-600 transition-colors hover:border-brand/40 hover:bg-white dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                >
                  {h}
                </button>
              ))}
            </div>
          </Seccao>
        )}

        {/**
         * ┌───────────────────────────────────────────────────────────────┐
         * │ UMA GRELHA DE ATALHOS, E ERAM DUAS IGUAIS                      │
         * │                                                               │
         * │ Havia «Mais utilizadas» e «Simuladores», uma por cima da       │
         * │ outra, com as MESMAS seis ferramentas por ordem diferente —    │
         * │ as duas listas partilhavam cinco dos seis identificadores. Ao  │
         * │ lado uma da outra isso não se lê como duas secções: lê-se como │
         * │ um erro, e ocupava metade do painel a repetir-se.              │
         * │                                                               │
         * │ Fica uma grelha, e o espaço libertado vai para os recursos     │
         * │ fiscais — que são destinos que NÃO estavam em mais lado nenhum │
         * │ do painel.                                                     │
         * └───────────────────────────────────────────────────────────────┘
         */}
        <Seccao titulo="Mais utilizadas" Icon={Zap}>
          <div className={`grid gap-2 ${grelha}`}>
            {motor.maisUtilizados.map((item) => (
              <CartaoRapido key={item.id} item={item} aoAbrir={motor.navegar} />
            ))}
          </div>
        </Seccao>

        {/**
         * ┌───────────────────────────────────────────────────────────────┐
         * │ AQUI VIVE O QUE ERA O MENU «RECURSOS FISCAIS»                  │
         * │                                                               │
         * │ Era um mega-dropdown que abria ao passar o rato sobre o        │
         * │ cabeçalho. Sai de lá e entra aqui, e nenhum dos destinos se    │
         * │ perde — ganham, aliás: aqui são pesquisáveis, alcançáveis por  │
         * │ teclado e existem no telemóvel, coisas que um menu de `hover`  │
         * │ nunca teve.                                                    │
         * │                                                               │
         * │ A fonte é a MESMA (`nav-config.tsx`), portanto acrescentar uma │
         * │ ferramenta continua a ser mexer num sítio só.                  │
         * └───────────────────────────────────────────────────────────────┘
         */}
        <Seccao titulo="Recursos fiscais" Icon={BookOpen}>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {[...NAV_FERRAMENTAS, ...NAV_APRENDER].map((item) => (
              <button
                key={`nav-${item.href}`}
                type="button"
                onClick={() => motor.navegar(item.href)}
                className="flex min-h-[52px] items-center gap-3 rounded-xl border border-stone-100 bg-stone-50 px-3 py-2.5 text-left transition-colors hover:border-brand/30 hover:bg-white dark:border-stone-800 dark:bg-stone-800/40 dark:hover:border-brand/40"
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
                  <item.Icon size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-stone-700 dark:text-stone-200">
                    {item.label}
                  </span>
                  <span className="block truncate text-[10px] text-stone-600">{item.desc}</span>
                </span>
                <ChevronRight size={13} className="flex-shrink-0 text-stone-300" />
              </button>
            ))}
          </div>
        </Seccao>
      </div>
    );
  }

  /* Guias e Atividades sem consulta — a lista completa, agrupada. */
  /* Com consulta — os resultados, na mesma forma. */
  return (
    <div className="px-2 py-2">
      {!temQuery && motor.recentes.length > 0 && (
        <div className="px-3 pb-2">
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-600">
            <History size={11} /> Recentes
          </p>
          <div className="flex flex-wrap gap-1.5">
            {motor.recentes.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => motor.setQuery(h)}
                className="min-h-9 rounded-lg border border-stone-200 bg-stone-50 px-2.5 text-xs font-medium text-stone-600 transition-colors hover:border-brand/40 hover:bg-white dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      )}

      {categoria !== "atividades" &&
        Object.entries(grupos).map(([grupo, lista]) => (
          <div key={grupo} className="mb-1">
            <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-stone-600">{grupo}</p>
            {lista.map((it) => (
              <LinhaResultado
                key={it.id}
                titulo={it.titulo}
                descricao={it.descricao}
                query={query}
                icone={<Icone nome={it.icone} size={16} />}
                aoAbrir={() => motor.navegar(it.href)}
              />
            ))}
          </div>
        ))}

      {categoria === "atividades" &&
        resultadosAtividades.map((a) => (
          <LinhaResultado
            key={a.id}
            titulo={a.label}
            descricao={`${a.grupo} · ${a.resumo}`}
            query={query}
            icone={<Search size={15} />}
            aoAbrir={() => motor.navegar(`/dashboard/classificar-atividade?q=${encodeURIComponent(a.label)}`)}
          />
        ))}

      {temQuery && totalResultados === 0 && (
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
          <Search size={28} className="mb-2 text-stone-300" />
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Sem resultados para «{query}» em {motor.categoriaAtual.label.toLowerCase()}.
          </p>
          <p className="mt-1 text-xs text-stone-600">Experimenta outro âmbito acima.</p>
        </div>
      )}
    </div>
  );
}

/* ─── Rodapé ───────────────────────────────────────────────────────── */

export function RodapeBusca({ motor }: { motor: MotorBusca }) {
  return (
    <div className="flex shrink-0 items-center justify-between border-t border-stone-100 px-5 py-2.5 text-[11px] text-stone-600 dark:border-stone-800">
      <span className="flex items-center gap-1.5">
        Enter abre o primeiro resultado
        <ChevronRight size={10} className="text-stone-300" />
        Esc fecha
      </span>
      {motor.temQuery && (
        <span className="font-semibold tabular-nums text-brand-dark dark:text-brand">
          {motor.totalResultados} resultado{motor.totalResultados !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}
