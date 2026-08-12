"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A ilha interativa do hub — pesquisa, filtros e grelha
//  ---------------------------------------------------------------------
//  É a ÚNICA parte do hub que é cliente. Tudo o resto (hero, contextos,
//  percursos, aprender, rigor) é servidor. O catálogo chega por props, já
//  serializado: nem os motores fiscais nem os ícones do catálogo entram
//  neste chunk — o catálogo transporta chaves de ícone, e o mapa de ícones
//  é pequeno (§13.1).
//
//  PORQUE NÃO USA `useSearchParams`
//  Esse hook obriga a rota a ser dinâmica ou a viver dentro de um
//  `<Suspense>` cujo fallback é o que fica no HTML pré-renderizado. Nos
//  dois casos a grelha deixava de estar no HTML inicial — e o requisito é
//  o oposto: conteúdo essencial legível sem JavaScript, e filtrar em menos
//  de 100 ms sem ir à rede (§13.3). Então o estado inicial é o catálogo
//  inteiro (que é o que o servidor pinta), e a sincronização com o URL
//  acontece no cliente, com `history` e `popstate` — o que dá também o
//  back/forward que o teste E2E exige.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  selecionar, contarFiltrosAtivos, agruparPorObjetivo,
  ROTULO_INTENT, ROTULO_INTENT_CURTO, ROTULO_PERFIL, ROTULO_KIND,
  type FiltrosFerramentas, type ToolDefinition, type ToolIntent,
  type ToolKind, type ToolProfile,
} from "@/lib/ferramentas";
import { Search, Close, Filter, ArrowRight } from "@/components/ui/Icons";
import CartaoFerramenta from "./CartaoFerramenta";

const PERFIS: ToolProfile[] = ["independente", "dependente", "empresa", "familia"];
const OBJETIVOS: ToolIntent[] = ["calcular", "comparar", "verificar", "cumprir"];

/** Rótulo legível de um tema técnico do catálogo. */
const ROTULO_TEMA: Record<string, string> = {
  irs: "IRS",
  iva: "IVA",
  "seguranca-social": "Segurança Social",
  salario: "Salário",
  empresa: "Empresa",
  irc: "IRC",
  patrimonio: "Património",
  "recibos-verdes": "Recibos verdes",
  atividade: "Atividade",
  coeficiente: "Coeficiente",
  retencao: "Retenção",
  deducoes: "Deduções",
  declaracao: "Declaração",
  beneficios: "Benefícios",
  jovens: "Jovens",
  dividendos: "Dividendos",
  heranca: "Herança",
  "imposto-selo": "Imposto do Selo",
  prazos: "Prazos",
  plataformas: "Plataformas",
  contabilista: "Contabilista",
  custos: "Custos",
  regioes: "Regiões",
};
const tema = (t: string) => ROTULO_TEMA[t] ?? t;

const VAZIO: FiltrosFerramentas = {};

/** URL → filtros. Só chaves conhecidas; lixo no URL é ignorado. */
function lerURL(): FiltrosFerramentas {
  if (typeof window === "undefined") return VAZIO;
  const p = new URLSearchParams(window.location.search);
  const perfil = p.get("perfil");
  const objetivo = p.get("objetivo");
  const tipo = p.get("tipo");
  return {
    q: p.get("q") ?? undefined,
    perfil: PERFIS.includes(perfil as ToolProfile) ? (perfil as ToolProfile) : undefined,
    objetivo: OBJETIVOS.includes(objetivo as ToolIntent) ? (objetivo as ToolIntent) : undefined,
    tema: p.get("tema") ?? undefined,
    tipo: (tipo as ToolKind) ?? undefined,
  };
}

function escreverURL(f: FiltrosFerramentas, substituir: boolean) {
  const p = new URLSearchParams();
  if (f.q?.trim()) p.set("q", f.q.trim());
  if (f.perfil) p.set("perfil", f.perfil);
  if (f.objetivo) p.set("objetivo", f.objetivo);
  if (f.tema) p.set("tema", f.tema);
  if (f.tipo) p.set("tipo", f.tipo);
  const qs = p.toString();
  const url = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
  if (substituir) window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
}

interface Props {
  ferramentas: ToolDefinition[];
  temas: Array<{ tema: string; total: number }>;
  tipos: Array<{ tipo: ToolKind; total: number }>;
}

export default function HubFerramentas({ ferramentas, temas, tipos }: Props) {
  const [filtros, setFiltros] = useState<FiltrosFerramentas>(VAZIO);
  const [avancadosAbertos, setAvancadosAbertos] = useState(false);
  const campoRef = useRef<HTMLInputElement>(null);

  // Estado inicial e back/forward. O primeiro render é sempre o catálogo
  // inteiro — é o que o servidor pintou, e hidratar com outra coisa daria
  // um desencontro de HTML.
  useEffect(() => {
    setFiltros(lerURL());
    const aoNavegar = () => setFiltros(lerURL());
    window.addEventListener("popstate", aoNavegar);
    return () => window.removeEventListener("popstate", aoNavegar);
  }, []);

  const aplicar = useCallback((parcial: Partial<FiltrosFerramentas>, substituir = false) => {
    setFiltros((atual) => {
      const proximo = { ...atual, ...parcial };
      for (const k of Object.keys(proximo) as Array<keyof FiltrosFerramentas>) {
        if (!proximo[k]) delete proximo[k];
      }
      escreverURL(proximo, substituir);
      return proximo;
    });
  }, []);

  const limpar = useCallback(() => {
    setFiltros(VAZIO);
    escreverURL(VAZIO, false);
    campoRef.current?.focus();
  }, []);

  const resultados = useMemo(
    () => selecionar(filtros, ferramentas),
    [filtros, ferramentas],
  );
  const nFiltros = contarFiltrosAtivos(filtros);
  const grupos = useMemo(() => agruparPorObjetivo(resultados), [resultados]);
  // Vista por objetivo é o padrão; com pesquisa ativa, a relevância manda.
  const porObjetivo = !filtros.q?.trim() && !filtros.objetivo;

  const chip = (ativo: boolean) =>
    `inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
      ativo
        ? "border-brand bg-brand text-white"
        : "border-stone-200 bg-white text-stone-600 hover:border-brand hover:text-brand dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
    }`;

  return (
    <section aria-labelledby="todas-ferramentas" className="scroll-mt-24" id="todas">
      {/* ── Pesquisa ────────────────────────────────────────────────── */}
      <div className="mb-4">
        <label htmlFor="pesquisa-ferramentas" className="sr-only">
          Pesquisar nas ferramentas
        </label>
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            ref={campoRef}
            id="pesquisa-ferramentas"
            type="search"
            inputMode="search"
            value={filtros.q ?? ""}
            onChange={(e) => aplicar({ q: e.target.value }, true)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && filtros.q) {
                e.preventDefault();
                aplicar({ q: "" }, true);
              }
            }}
            placeholder="O que precisas de resolver?"
            aria-describedby="ambito-pesquisa contagem-ferramentas"
            className="w-full rounded-2xl border border-stone-200 bg-white py-3.5 pl-11 pr-11 text-[15px] text-stone-800 placeholder:text-stone-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          />
          {filtros.q ? (
            <button
              type="button"
              onClick={() => aplicar({ q: "" }, true)}
              aria-label="Limpar pesquisa"
              className="absolute right-2.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
            >
              <Close size={16} />
            </button>
          ) : null}
        </div>
        <p id="ambito-pesquisa" className="mt-2 text-xs text-stone-400">
          Pesquisa apenas nas ferramentas.{" "}
          <Link href="/pesquisar" className="font-semibold text-brand underline-offset-2 hover:underline">
            Pesquisar em todo o site
          </Link>
        </p>
      </div>

      {/* ── Filtros primários: objetivo ─────────────────────────────── */}
      <div className="mb-3">
        <h2 id="todas-ferramentas" className="sr-only">
          Todas as ferramentas
        </h2>
        <div role="group" aria-label="Filtrar por objetivo" className="flex flex-wrap gap-2">
          <button type="button" onClick={() => aplicar({ objetivo: undefined })} aria-pressed={!filtros.objetivo} className={chip(!filtros.objetivo)}>
            Tudo
          </button>
          {OBJETIVOS.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => aplicar({ objetivo: filtros.objetivo === o ? undefined : o })}
              aria-pressed={filtros.objetivo === o}
              className={chip(filtros.objetivo === o)}
            >
              {ROTULO_INTENT_CURTO[o]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAvancadosAbertos((v) => !v)}
            aria-expanded={avancadosAbertos}
            aria-controls="filtros-avancados"
            className={chip(false)}
          >
            <Filter size={14} />
            Mais filtros
            {nFiltros > 0 ? (
              <span className="ml-0.5 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                {nFiltros}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {/* ── Filtros avançados ───────────────────────────────────────── */}
      {avancadosAbertos ? (
        <div
          id="filtros-avancados"
          className="mb-4 space-y-4 rounded-4xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-5"
        >
          <fieldset>
            <legend className="mb-2 text-[11px] font-bold uppercase tracking-wider text-stone-400">Perfil</legend>
            <div className="flex flex-wrap gap-2">
              {PERFIS.map((p) => (
                <button key={p} type="button" onClick={() => aplicar({ perfil: filtros.perfil === p ? undefined : p })} aria-pressed={filtros.perfil === p} className={chip(filtros.perfil === p)}>
                  {ROTULO_PERFIL[p]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-[11px] font-bold uppercase tracking-wider text-stone-400">Tipo</legend>
            <div className="flex flex-wrap gap-2">
              {tipos.map(({ tipo: t, total }) => (
                <button key={t} type="button" onClick={() => aplicar({ tipo: filtros.tipo === t ? undefined : t })} aria-pressed={filtros.tipo === t} className={chip(filtros.tipo === t)}>
                  {ROTULO_KIND[t]} <span className="font-normal opacity-60">{total}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-[11px] font-bold uppercase tracking-wider text-stone-400">Tema</legend>
            <div className="flex flex-wrap gap-2">
              {temas.map(({ tema: t, total }) => (
                <button key={t} type="button" onClick={() => aplicar({ tema: filtros.tema === t ? undefined : t })} aria-pressed={filtros.tema === t} className={chip(filtros.tema === t)}>
                  {tema(t)} <span className="font-normal opacity-60">{total}</span>
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      ) : null}

      {/* ── Contagem (anunciada) ────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p id="contagem-ferramentas" aria-live="polite" className="text-sm text-stone-500 dark:text-stone-400">
          {resultados.length === ferramentas.length
            ? `${ferramentas.length} ferramentas`
            : `${resultados.length} ${resultados.length === 1 ? "ferramenta encontrada" : "ferramentas encontradas"}`}
        </p>
        {nFiltros > 0 ? (
          <button
            type="button"
            onClick={limpar}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-brand transition-colors hover:bg-brand-light dark:hover:bg-brand/10"
          >
            <Close size={13} /> Limpar filtros
          </button>
        ) : null}
      </div>

      {/* ── Grelha ──────────────────────────────────────────────────── */}
      {resultados.length === 0 ? (
        <div className="rounded-4xl border border-dashed border-stone-200 bg-white p-8 text-center dark:border-stone-700 dark:bg-stone-900">
          <p className="text-[15px] font-semibold text-stone-700 dark:text-stone-200">
            Nenhuma ferramenta corresponde a esta procura.
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-stone-500 dark:text-stone-400">
            Tenta por palavras do dia a dia — «quanto recebo», «salário», «segurança social»,
            «abrir empresa» — ou limpa os filtros para ver as {ferramentas.length}.
          </p>
          <button
            type="button"
            onClick={limpar}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Limpar filtros <ArrowRight size={14} />
          </button>
        </div>
      ) : porObjetivo ? (
        <div className="space-y-8">
          {grupos.map((g) => (
            <div key={g.objetivo}>
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                {ROTULO_INTENT[g.objetivo]}
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {g.ferramentas.map((f) => (
                  <CartaoFerramenta key={f.id} ferramenta={f} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {resultados.map((f) => (
            <CartaoFerramenta key={f.id} ferramenta={f} />
          ))}
        </div>
      )}
    </section>
  );
}
