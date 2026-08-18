"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { m } from "motion/react";
import {
  Scale, Clock, BookOpen, Search, Close, Filter,
  LayoutGrid, Menu, ChevronRight, Check, Star, ArrowRight,
} from "@/components/ui/Icons";
import { GUIAS, type Categoria, type Guia, type HubGroup, type IconType } from "@/lib/guias-config";
import { pesquisarGuias } from "@/lib/guias";
import { HUB_GRUPOS } from "@/lib/guias/manifests";

// ═════════════════════════════════════════════════════════════════════════
//  ÍNDICE DOS GUIAS
//  ---------------------------------------------------------------------
//  A versão anterior mostrava o catálogo TRÊS VEZES na mesma página: a
//  barra lateral do layout listava os 43 guias, o bloco "O que precisas de
//  fazer?" listava-os outra vez em nove caixas aninhadas, e só depois disso
//  — a dois ecrãs de distância — apareciam a pesquisa e os filtros, seguidos
//  do catálogo a sério. Quem chegava aqui percorria uma parede de 43 links
//  antes de descobrir que havia forma de filtrar.
//
//  A correção não é reordenar: é perceber que o hub por intenção nunca devia
//  ter sido um segundo índice. É um EIXO DE FILTRAGEM — "o que preciso de
//  fazer" — a par da categoria, que responde a "quem sou". Como filtro
//  ocupa uma linha de chips e passa a servir para alguma coisa; como lista
//  duplicada só empurrava o conteúdo para baixo.
//
//  Estrutura: herói compacto → barra de controlo fixa (pesquisa + filtros)
//  → catálogo. Nada entre a intenção do utilizador e o resultado.
// ═════════════════════════════════════════════════════════════════════════

const CATEGORIAS: Array<"Todos" | Categoria> = [
  "Todos", "Independentes", "Conta de outrem", "Empresas", "Transversal",
];

// As quatro afirmações que o sistema consegue mesmo garantir (ponto 4.8 da
// auditoria). Ficam numa faixa fina: são reasseguramento, não navegação.
const GARANTIAS: Array<{ icon: IconType; texto: string }> = [
  { icon: Scale, texto: "Fonte por afirmação" },
  { icon: BookOpen, texto: "Revisão datada" },
  { icon: Check, texto: "Só fontes oficiais" },
  { icon: Clock, texto: "Alterações visíveis" },
];

const FAVORITOS_KEY = "recibocerto:guias:favoritos";
type Ordem = "relevancia" | "alfabetica" | "tempo";
type FiltroHub = "todas" | HubGroup;

const HUBS_COM_GUIAS = HUB_GRUPOS.filter((h) => GUIAS.some((g) => g.hub === h.id));
const ROTULO_HUB = new Map(HUB_GRUPOS.map((h) => [h.id, h.titulo]));

/** Chip de filtro. Um só desenho para os dois eixos — e desativado, em vez
 *  de escondido, quando o cruzamento com o outro filtro não dá resultados:
 *  esconder faria os chips saltar de sítio a cada clique. */
function Chip({
  ativo,
  contagem,
  onClick,
  children,
}: {
  ativo: boolean;
  contagem: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const vazio = contagem === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={vazio && !ativo}
      aria-pressed={ativo}
      className={`flex-shrink-0 whitespace-nowrap rounded-xl px-3 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
        ativo
          ? "bg-brand text-white shadow-card"
          : vazio
            ? "cursor-not-allowed border border-stone-100 bg-stone-50 text-stone-300 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-700"
            : "border border-stone-200 bg-white text-stone-600 hover:border-brand/40 hover:text-brand dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
      }`}
    >
      {children}{" "}
      <span className={ativo ? "text-white/95" : vazio ? "text-stone-300 dark:text-stone-700" : "text-stone-400"}>
        · {contagem}
      </span>
    </button>
  );
}

export default function GuiasIndex() {
  const [categoria, setCategoria] = useState<"Todos" | Categoria>("Todos");
  const [hub, setHub] = useState<FiltroHub>("todas");
  const [pesquisa, setPesquisa] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("relevancia");
  const [vista, setVista] = useState<"lista" | "grelha">("lista");
  const [soFavoritos, setSoFavoritos] = useState(false);
  /**
   * A barra fixa com pesquisa e os dois eixos de chips mede ~243 px em
   * desktop e ~200 px em móvel. Ao chegar à página isso é bom — é o mapa do
   * catálogo. A percorrer a lista é um quarto do ecrã ocupado por controlos
   * que já se usaram.
   *
   * Por isso os chips ficam à vista no topo e recolhem assim que se passa o
   * herói, deixando uma barra de ~68 px com a pesquisa e um botão que os
   * traz de volta. Descoberta primeiro, densidade depois.
   */
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [rolado, setRolado] = useState(false);

  useEffect(() => {
    const LIMIAR = 260; // altura aproximada do herói
    const aoRolar = () => setRolado(window.scrollY > LIMIAR);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const campoPesquisa = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVORITOS_KEY);
      if (raw) setFavoritos(JSON.parse(raw));
    } catch { /* ignora */ }
  }, []);

  // Atalho "/" para a pesquisa, como nos catálogos que as pessoas já usam.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const alvo = e.target as HTMLElement | null;
      const aEscrever =
        alvo &&
        (alvo.tagName === "INPUT" || alvo.tagName === "TEXTAREA" || alvo.isContentEditable);
      if (aEscrever) return;
      e.preventDefault();
      campoPesquisa.current?.focus();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);

  const alternarFavorito = useCallback((href: string) => {
    setFavoritos((prev) => {
      const next = prev.includes(href) ? prev.filter((x) => x !== href) : [...prev, href];
      try { localStorage.setItem(FAVORITOS_KEY, JSON.stringify(next)); } catch { /* ignora */ }
      return next;
    });
  }, []);

  // A pesquisa passa pelo índice dos manifestos (sinónimos, linguagem comum,
  // artigos legais e afirmações), não pelo texto literal do título.
  const porPesquisa = useMemo<Guia[]>(() => {
    const q = pesquisa.trim();
    if (q === "") return GUIAS;
    return pesquisarGuias(q, GUIAS.length)
      .map((r) => GUIAS.find((g) => g.slug === r.manifesto.slug))
      .filter((g): g is Guia => Boolean(g));
  }, [pesquisa]);

  const base = useMemo(
    () => (soFavoritos ? porPesquisa.filter((g) => favoritos.includes(g.href)) : porPesquisa),
    [porPesquisa, soFavoritos, favoritos],
  );

  const filtrados = useMemo(() => {
    let lista = base.filter(
      (g) =>
        (categoria === "Todos" || g.categoria === categoria) &&
        (hub === "todas" || g.hub === hub),
    );
    if (ordem === "alfabetica") lista = [...lista].sort((a, b) => a.titulo.localeCompare(b.titulo, "pt"));
    else if (ordem === "tempo") lista = [...lista].sort((a, b) => a.tempo - b.tempo);
    return lista;
  }, [base, categoria, hub, ordem]);

  // Contagens cruzadas: cada eixo conta já com o outro filtro aplicado, para
  // o número no chip corresponder ao que vais mesmo obter ao clicar.
  const contarCategoria = (c: "Todos" | Categoria) =>
    base.filter((g) => (hub === "todas" || g.hub === hub) && (c === "Todos" || g.categoria === c)).length;
  const contarHub = (h: FiltroHub) =>
    base.filter(
      (g) => (categoria === "Todos" || g.categoria === categoria) && (h === "todas" || g.hub === h),
    ).length;

  const temFiltro = categoria !== "Todos" || hub !== "todas" || pesquisa.trim() !== "" || soFavoritos;
  const limpar = () => {
    setCategoria("Todos");
    setHub("todas");
    setPesquisa("");
    setSoFavoritos(false);
  };

  const descricaoHub = hub === "todas" ? null : HUB_GRUPOS.find((h) => h.id === hub)?.descricao;

  return (
    <div>
      {/* ── Herói ─────────────────────────────────────────────────────────
          Encolhido face à versão anterior: as quatro garantias passaram de
          blocos com ícone grande e duas linhas de texto para uma faixa fina.
          Diziam o mesmo e ocupavam meio ecrã antes de qualquer ação. */}
      <m.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative mb-6 overflow-hidden rounded-4xl border border-stone-200/70 bg-white shadow-card dark:border-stone-700 dark:bg-stone-900"
      >
        <div className="grid items-stretch gap-0 lg:grid-cols-[1.45fr_1fr]">
          <div className="p-6 sm:p-8">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-stone-200 bg-cream dark:border-stone-700 dark:bg-stone-800">
                <BookOpen size={12} className="text-brand" />
              </span>
              <span className="text-brand">Recursos fiscais</span>
              <span aria-hidden>·</span>
              <span>Portugal</span>
            </div>
            <h1 className="font-display text-3xl font-semibold leading-[1.08] text-ink sm:text-[2.6rem]">
              Guias fiscais e laborais para <span className="text-brand">2026</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-stone-500 dark:text-stone-400 sm:text-base">
              {GUIAS.length} guias para trabalhadores independentes, por conta de outrem e empresas.
              Sem jargão, com dados verificados e base legal.
            </p>

            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
              {GARANTIAS.map((g) => {
                const Icon = g.icon;
                return (
                  <li key={g.texto} className="flex items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400">
                    <Icon size={13} className="flex-shrink-0 text-brand" />
                    {g.texto}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Rio Douro e Ponte D. Luís I, Porto */}
          <div className="relative hidden min-h-[220px] overflow-hidden lg:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/guias-douro.jpg"
              alt="Ponte Dom Luís I sobre o Rio Douro, no Porto"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-deep/75 via-brand-dark/25 to-transparent" />
            <span className="absolute bottom-4 left-6 text-[11px] font-medium tracking-wide text-white/85">
              Porto · Rio Douro
            </span>
          </div>
        </div>
      </m.section>

      {/* ── Barra de controlo ─────────────────────────────────────────────
          Fixa ao topo: com 43 guias, quem rola até meio da lista e quer
          mudar de filtro não deve ter de voltar ao princípio. O `top`
          acompanha a altura da navegação (h-14 em móvel, 72px a partir de
          sm) para não haver sobreposição. */}
      <div className="sticky top-14 z-30 -mx-4 mb-5 border-y border-stone-200/70 bg-cream/95 px-4 py-3 backdrop-blur-md dark:border-stone-800 dark:bg-stone-950/95 sm:top-[72px] sm:-mx-6 sm:px-6">
        {/* Linha 1 — pesquisa e apresentação */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              ref={campoPesquisa}
              type="search"
              value={pesquisa}
              onChange={(e) => setPesquisa(e.target.value)}
              placeholder="Pesquisar por palavras tuas — «cliente não pagou», «acao isolada»…"
              aria-label="Pesquisar guias"
              className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-9 text-sm text-stone-700 transition-colors placeholder:text-stone-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
            />
            {pesquisa ? (
              <button
                type="button"
                onClick={() => setPesquisa("")}
                aria-label="Limpar pesquisa"
                className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
              >
                <Close size={12} />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-stone-200 px-1.5 py-0.5 font-sans text-[10px] font-medium text-stone-400 dark:border-stone-700 sm:block">
                /
              </kbd>
            )}
          </div>

          <select
            value={ordem}
            onChange={(e) => setOrdem(e.target.value as Ordem)}
            aria-label="Ordenar guias"
            className="hidden flex-shrink-0 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-600 transition-colors focus:border-brand focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 sm:block"
          >
            <option value="relevancia">Mais relevantes</option>
            <option value="alfabetica">Ordem alfabética</option>
            <option value="tempo">Leitura mais curta</option>
          </select>

          {rolado && (
            <button
              type="button"
              onClick={() => setFiltrosAbertos((v) => !v)}
              aria-expanded={filtrosAbertos}
              aria-controls="filtros-guias"
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                temFiltro
                  ? "border-brand bg-brand text-white"
                  : "border-stone-200 bg-white text-stone-600 hover:border-brand/40 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
              }`}
            >
              <Filter size={14} />
              Filtros
            </button>
          )}

          <div className="hidden flex-shrink-0 items-center gap-0.5 rounded-xl border border-stone-200 bg-white p-0.5 dark:border-stone-700 dark:bg-stone-900 sm:flex">
            <button
              type="button"
              onClick={() => setVista("lista")}
              aria-pressed={vista === "lista"}
              aria-label="Vista de lista"
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${vista === "lista" ? "bg-brand text-white" : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"}`}
            >
              <Menu size={15} />
            </button>
            <button
              type="button"
              onClick={() => setVista("grelha")}
              aria-pressed={vista === "grelha"}
              aria-label="Vista de grelha"
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${vista === "grelha" ? "bg-brand text-white" : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"}`}
            >
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>

        <div id="filtros-guias" className={!rolado || filtrosAbertos ? "block" : "hidden"}>
        {/* Linha 2 — o que precisas de fazer (era o bloco que empurrava a
            página inteira para baixo; agora filtra em vez de duplicar) */}
        <div className="mt-2.5">
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">
            O que precisas de fazer
          </div>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
            <Chip ativo={hub === "todas"} contagem={contarHub("todas")} onClick={() => setHub("todas")}>
              Tudo
            </Chip>
            {HUBS_COM_GUIAS.map((h) => (
              <Chip key={h.id} ativo={hub === h.id} contagem={contarHub(h.id)} onClick={() => setHub(h.id)}>
                {h.titulo}
              </Chip>
            ))}
          </div>
        </div>

        {/* Linha 3 — quem és */}
        <div className="mt-2">
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Para quem
          </div>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
            {CATEGORIAS.map((c) => (
              <Chip key={c} ativo={categoria === c} contagem={contarCategoria(c)} onClick={() => setCategoria(c)}>
                {c}
              </Chip>
            ))}
            {favoritos.length > 0 && (
              <Chip
                ativo={soFavoritos}
                contagem={favoritos.length}
                onClick={() => setSoFavoritos((v) => !v)}
              >
                Guardados
              </Chip>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* ── Estado do resultado ───────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          <span className="font-semibold text-stone-700 dark:text-stone-200">{filtrados.length}</span>
          {filtrados.length === 1 ? " guia" : " guias"}
          {temFiltro && <span className="text-stone-400"> de {GUIAS.length}</span>}
          {descricaoHub && (
            <span className="ml-1 hidden text-stone-400 sm:inline">· {descricaoHub}</span>
          )}
        </p>
        {temFiltro && (
          <button
            type="button"
            onClick={limpar}
            className="inline-flex items-center gap-1 rounded-lg text-sm font-semibold text-brand transition-colors hover:text-brand-dark"
          >
            <Close size={11} /> Limpar filtros
          </button>
        )}
      </div>

      {/* ── Catálogo ──────────────────────────────────────────────────────── */}
      {filtrados.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-200 bg-stone-50 px-6 py-14 text-center dark:border-stone-700 dark:bg-stone-900/40">
          <Search size={22} className="mx-auto mb-2 text-stone-300" />
          <p className="text-sm font-medium text-stone-600 dark:text-stone-300">
            {pesquisa ? <>Nenhum guia para «{pesquisa}»</> : "Nenhum guia com estes filtros"}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-stone-400">
            A pesquisa também percebe linguagem comum e erros frequentes — tenta descrever a
            situação por palavras tuas.
          </p>
          <button
            type="button"
            onClick={limpar}
            className="mt-3 text-sm font-semibold text-brand hover:underline"
          >
            Limpar filtros
          </button>
        </div>
      ) : vista === "grelha" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtrados.map((g) => (
            <CartaoGuia key={g.href} g={g} favorito={favoritos.includes(g.href)} onFav={() => alternarFavorito(g.href)} grelha />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-stone-200/70 bg-white dark:border-stone-700 dark:bg-stone-900">
          {filtrados.map((g, i) => (
            <div key={g.href} className={i > 0 ? "border-t border-stone-100 dark:border-stone-800" : ""}>
              <CartaoGuia g={g} favorito={favoritos.includes(g.href)} onFav={() => alternarFavorito(g.href)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CartaoGuia({
  g,
  favorito,
  onFav,
  grelha = false,
}: {
  g: Guia;
  favorito: boolean;
  onFav: () => void;
  grelha?: boolean;
}) {
  const Icon = g.icon;
  return (
    <div
      className={`group relative flex items-center gap-3.5 transition-colors ${
        grelha
          ? "h-full rounded-2xl border border-stone-200/70 bg-white p-4 hover:border-brand/40 hover:shadow-lift dark:border-stone-700 dark:bg-stone-900"
          : "px-4 py-3.5 hover:bg-stone-50 dark:hover:bg-stone-800/40 sm:px-5"
      }`}
    >
      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-500 transition-colors group-hover:bg-brand-light group-hover:text-brand-dark dark:bg-stone-800 dark:text-stone-400">
        <Icon size={18} />
      </span>

      <Link href={g.href} className="min-w-0 flex-1 after:absolute after:inset-0 after:content-['']">
        {/* O grupo por intenção situa o guia sem ser preciso abrir. */}
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">
          {ROTULO_HUB.get(g.hub)}
        </span>
        <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-stone-800 group-hover:text-brand dark:text-stone-100 sm:truncate">
          {g.titulo}
        </p>
        <p className="mt-0.5 line-clamp-1 text-xs text-stone-500 dark:text-stone-400">{g.descricao}</p>
      </Link>

      <div className="relative z-10 flex flex-shrink-0 items-center gap-2.5">
        <span className="hidden rounded-lg bg-brand-light/70 px-2 py-0.5 text-[10px] font-semibold text-brand-dark dark:bg-brand/15 dark:text-brand sm:inline">
          {g.categoria}
        </span>
        <span className="hidden items-center gap-1 text-[11px] text-stone-400 sm:flex">
          <Clock size={12} /> {g.tempo} min
        </span>
        <button
          type="button"
          onClick={onFav}
          aria-pressed={favorito}
          aria-label={favorito ? `Remover ${g.titulo} dos guardados` : `Guardar ${g.titulo}`}
          className={`rounded-lg p-1.5 transition-colors ${favorito ? "text-brand" : "text-stone-300 hover:text-stone-500 dark:text-stone-600"}`}
        >
          <Star size={15} />
        </button>
        <ArrowRight size={15} className="hidden text-stone-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand sm:block" />
      </div>
    </div>
  );
}
