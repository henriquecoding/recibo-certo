"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { m, AnimatePresence } from "motion/react";
import {
  CATEGORIAS,
  FERRAMENTAS,
  GUIAS,
  pesquisarItens,
  pesquisarAtividades,
  categoriaPorContexto,
  type CategoriaBusca,
  type ItemBusca,
} from "@/lib/busca";
import {
  Search, Close, Calculator, BookOpen, Receipt, Wallet, Building, Scale, Gauge, Swap,
  ShieldCheck, MapPin, ShoppingBag, Trophy, ArrowRight, History, Keyboard,
  Zap, ChevronRight,
} from "@/components/ui/Icons";
import type { ComponentType } from "react";

type IconT = ComponentType<{ size?: number; className?: string }>;
const ICONES: Record<string, IconT> = {
  Calculator, BookOpen, Search, Receipt, Wallet, Building, Scale, Gauge, Swap,
  ShieldCheck, MapPin, ShoppingBag, Trophy,
};
const Icone = ({ nome, size = 16, className }: { nome: string; size?: number; className?: string }) => {
  const C = ICONES[nome] ?? Search;
  return <C size={size} className={className} />;
};

const RECENTES_KEY = "recibocerto:busca:recentes";
function lerRecentes(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENTES_KEY) ?? "[]"); } catch { return []; }
}
function guardarRecente(q: string) {
  if (!q.trim()) return;
  try {
    const atual = lerRecentes().filter((h) => h !== q);
    localStorage.setItem(RECENTES_KEY, JSON.stringify([q, ...atual].slice(0, 6)));
  } catch { /* ignora */ }
}

function useDebounce<T>(valor: T, ms = 160): T {
  const [v, setV] = useState(valor);
  useEffect(() => { const t = setTimeout(() => setV(valor), ms); return () => clearTimeout(t); }, [valor, ms]);
  return v;
}

function Realce({ texto, query }: { texto: string; query: string }) {
  if (!query.trim()) return <>{texto}</>;
  const esc = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const partes = texto.split(new RegExp(`(${esc})`, "gi"));
  return (
    <>
      {partes.map((p, i) =>
        p.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="rounded-[3px] bg-brand/20 px-0.5 text-brand-dark dark:text-brand">{p}</mark>
          : <span key={i}>{p}</span>
      )}
    </>
  );
}

const EVENTO_ABRIR = "recibocerto:busca:abrir";

const MAIS_UTILIZADOS: string[] = [
  "f-comparar", "f-irs", "f-rv", "f-empresa", "f-venc", "f-simplificado",
];

const SIMULADORES_RAPIDOS: string[] = [
  "f-irs", "f-rv", "f-simplificado", "f-venc", "f-empresa", "f-comparar",
];

/** Botao de pesquisa (leve). Dispara a abertura do overlay global unico. */
export function BuscaTrigger({ compacto = false }: { compacto?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(EVENTO_ABRIR))}
      aria-label="Pesquisar no ReciboCerto"
      aria-keyshortcuts="Control+K Meta+K"
      className={
        compacto
          ? "flex h-10 w-10 items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800"
          : "group flex items-center gap-2 rounded-xl border border-stone-200 bg-white/70 px-3 py-2 text-sm text-stone-400 transition-colors hover:border-brand/40 hover:text-stone-600 dark:border-stone-700 dark:bg-stone-900/50 dark:hover:border-brand/40"
      }
    >
      <Search size={16} className="flex-shrink-0" />
      {!compacto && (
        <>
          <span className="hidden md:inline">Pesquisar...</span>
          <span className="ml-2 hidden items-center gap-0.5 rounded-md border border-stone-200 px-1.5 py-0.5 text-[10px] font-semibold text-stone-400 md:inline-flex dark:border-stone-700">
            <Keyboard size={11} /> K
          </span>
        </>
      )}
    </button>
  );
}

function QuickCard({ item, onClick }: { item: ItemBusca; onClick: (href: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(item.href)}
      className="flex flex-col items-center gap-1.5 rounded-2xl border border-stone-100 bg-white p-3 text-center transition-all hover:border-brand/30 hover:shadow-sm dark:border-stone-800 dark:bg-stone-800/60 dark:hover:border-brand/40"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-100 bg-stone-50 text-brand dark:border-stone-700 dark:bg-stone-800">
        <Icone nome={item.icone} size={18} />
      </div>
      <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-stone-700 dark:text-stone-200">
        {item.titulo.replace("Calculadora de recibos verdes", "Recibos Verdes").replace("Comparar cenários", "Comparar").replace("Simulador de ", "").replace("Recibo de vencimento", "Rec. Vencimento").replace("Regime simplificado", "Reg. Simplificado").replace("Abrir empresa", "Abrir Empresa")}
      </span>
    </button>
  );
}

function SimQuickCard({ item, onClick }: { item: ItemBusca; onClick: (href: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(item.href)}
      className="flex flex-col items-center gap-1.5 rounded-2xl border border-stone-100 bg-white p-2.5 text-center transition-all hover:border-brand/30 hover:shadow-sm dark:border-stone-800 dark:bg-stone-800/60 dark:hover:border-brand/40"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand/15 bg-brand-light text-brand">
        <Icone nome={item.icone} size={16} />
      </div>
      <span className="line-clamp-2 text-[10px] font-semibold leading-tight text-stone-600 dark:text-stone-300">
        {item.descricao.split(" ").slice(0, 3).join(" ")}
      </span>
    </button>
  );
}

/** Overlay de pesquisa — montado UMA vez (na raiz). Abre por Cmd+K/Ctrl+K ou evento. */
export default function BuscaOverlay() {
  const router = useRouter();
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaBusca>("ferramentas");
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query);
  const [recentes, setRecentes] = useState<string[]>([]);
  const [filtro, setFiltro] = useState("all");
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Mobile: input na zona do polegar (em baixo) + conteúdo a expandir para
  // cima, sempre acima do teclado. Acompanha o visualViewport (iOS/Android).
  const [isMobile, setIsMobile] = useState(false);
  const [tecladoInset, setTecladoInset] = useState(0);
  const [viewportH, setViewportH] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!aberto || typeof window === "undefined") return;
    const vv = window.visualViewport;
    const update = () => {
      if (!vv) { setTecladoInset(0); setViewportH(window.innerHeight); return; }
      setTecladoInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
      setViewportH(vv.height);
    };
    update();
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
    };
  }, [aberto]);

  const trocarCategoria = useCallback((c: CategoriaBusca) => { setCategoria(c); setFiltro("all"); }, []);

  const abrir = useCallback(() => {
    setCategoria(categoriaPorContexto(pathname));
    setFiltro("all");
    setQuery("");
    setRecentes(lerRecentes());
    setAberto(true);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); aberto ? setAberto(false) : abrir(); }
      else if (e.key === "Escape" && aberto) setAberto(false);
    };
    const onAbrir = () => abrir();
    window.addEventListener("keydown", onKey);
    window.addEventListener(EVENTO_ABRIR, onAbrir);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(EVENTO_ABRIR, onAbrir);
    };
  }, [aberto, abrir]);

  useEffect(() => {
    if (!aberto) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => { document.body.style.overflow = prev; clearTimeout(t); };
  }, [aberto]);

  useEffect(() => { setAberto(false); }, [pathname]);

  const itens = categoria === "guias" ? GUIAS : FERRAMENTAS;
  const resultadosItens = useMemo(
    () => (categoria === "atividades" ? [] : pesquisarItens(itens, debounced).filter((it) => filtro === "all" || it.grupo === filtro)),
    [categoria, itens, debounced, filtro]
  );
  const resultadosAtiv = useMemo(
    () => (categoria === "atividades" ? pesquisarAtividades(debounced, 120).filter((a) => filtro === "all" || a.tipo === filtro) : []),
    [categoria, debounced, filtro]
  );

  const FILTROS = useMemo<{ id: string; label: string }[]>(() => {
    if (categoria === "atividades") {
      return [
        { id: "all", label: "Todas" },
        { id: "art151", label: "Art. 151.º" },
        { id: "outros", label: "Outros serviços" },
        { id: "vendas", label: "Vendas / hotelaria" },
        { id: "diretosAutor", label: "Direitos de autor" },
      ];
    }
    const fonte = categoria === "guias" ? GUIAS : FERRAMENTAS;
    const grupos = Array.from(new Set(fonte.map((i) => i.grupo)));
    return [{ id: "all", label: "Tudo" }, ...grupos.map((g) => ({ id: g, label: g }))];
  }, [categoria]);

  const grupos = useMemo(() => {
    const g: Record<string, ItemBusca[]> = {};
    for (const it of resultadosItens) (g[it.grupo] ??= []).push(it);
    return g;
  }, [resultadosItens]);

  const navegar = (href: string) => {
    guardarRecente(query);
    setAberto(false);
    router.push(href);
  };

  const catAtual = CATEGORIAS.find((c) => c.id === categoria)!;
  const totalResultados = categoria === "atividades" ? resultadosAtiv.length : resultadosItens.length;
  const temQuery = !!debounced.trim();

  const maisUtilizados = useMemo(() => MAIS_UTILIZADOS.map((id) => FERRAMENTAS.find((f) => f.id === id)!).filter(Boolean), []);
  const simRapidos = useMemo(() => SIMULADORES_RAPIDOS.map((id) => FERRAMENTAS.find((f) => f.id === id)!).filter(Boolean), []);

  return (
    <AnimatePresence>
      {aberto && (
        <div className="fixed inset-0 z-[120]" role="dialog" aria-modal="true" aria-label="Pesquisa">
          <m.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-stone-900/45 backdrop-blur-md"
            onClick={() => setAberto(false)}
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-0 sm:items-start sm:p-4 sm:pt-[5vh]">
            <m.div
              initial={{ y: 28, scale: 0.97 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 24, scale: 0.97 }}
              transition={{ type: "spring", damping: 32, stiffness: 340 }}
              style={isMobile ? { marginBottom: tecladoInset, maxHeight: viewportH ? viewportH - 12 : undefined, transition: "margin-bottom 0.22s cubic-bezier(0.16,1,0.3,1)" } : undefined}
              className="pointer-events-auto flex max-h-[100dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-stone-200/80 bg-white shadow-float ring-1 ring-black/5 dark:border-stone-800 dark:bg-stone-900 dark:ring-white/5 sm:max-h-[82dvh] sm:rounded-2xl"
            >
              {/* ── Input ── (em baixo no telemóvel: zona do polegar, acima do teclado) */}
              <div className="order-4 flex shrink-0 items-center gap-3 border-stone-100 px-5 py-4 dark:border-stone-800 sm:order-1 sm:border-b">
                <Search size={20} className="flex-shrink-0 text-brand" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (categoria === "atividades" && resultadosAtiv[0]) navegar(`/dashboard/classificar-atividade?q=${encodeURIComponent(resultadosAtiv[0].label)}`);
                      else if (resultadosItens[0]) navegar(resultadosItens[0].href);
                    }
                  }}
                  placeholder={catAtual.placeholder}
                  aria-label={`Pesquisar ${catAtual.label}`}
                  className="min-w-0 flex-1 bg-transparent text-base font-medium text-stone-800 placeholder-stone-400 placeholder:font-normal focus:outline-none dark:text-stone-100"
                />
                {query && (
                  <button type="button" onClick={() => { setQuery(""); inputRef.current?.focus(); }} aria-label="Limpar" className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800">
                    <Close size={15} />
                  </button>
                )}
                <span className="hidden items-center gap-0.5 rounded-md border border-stone-200 px-1.5 py-0.5 text-[10px] font-semibold text-stone-400 sm:inline-flex dark:border-stone-700">
                  <Keyboard size={11} /> K
                </span>
                <button type="button" onClick={() => setAberto(false)} aria-label="Fechar pesquisa" className="flex h-8 w-8 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 sm:hidden dark:hover:bg-stone-800">
                  <Close size={18} />
                </button>
              </div>

              {/* ── Category tabs ── */}
              <div className="order-3 shrink-0 border-b border-stone-100 px-4 py-3 dark:border-stone-800 sm:order-2">
                <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {CATEGORIAS.map((c) => {
                    const ativo = categoria === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={ativo}
                        onClick={() => { trocarCategoria(c.id); inputRef.current?.focus(); }}
                        className={`flex flex-shrink-0 flex-col items-center gap-1.5 rounded-xl border px-4 py-2.5 transition-all ${
                          ativo
                            ? "border-brand/30 bg-brand-light text-brand-dark shadow-sm dark:border-brand/40 dark:bg-brand/15 dark:text-brand"
                            : "border-stone-200 bg-stone-50 text-stone-500 hover:border-stone-300 hover:bg-white dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400 dark:hover:border-stone-600"
                        }`}
                      >
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                          ativo
                            ? "bg-brand text-white"
                            : "bg-white text-stone-400 dark:bg-stone-700 dark:text-stone-300"
                        }`}>
                          <Icone nome={c.icone} size={18} />
                        </div>
                        <span className="text-[11px] font-semibold leading-none">{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Filter chips (visible when searching or browsing results) ── */}
              {(temQuery || categoria === "atividades") && (
                <div className="order-2 flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-stone-100 px-4 py-2 dark:border-stone-800 sm:order-3 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
                  <span className="flex-shrink-0 pr-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-300">Filtrar</span>
                  {FILTROS.map((f) => {
                    const on = filtro === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => { setFiltro(f.id); inputRef.current?.focus(); }}
                        className={`flex-shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all ${
                          on
                            ? "border-brand/40 bg-brand-light text-brand-dark"
                            : "border-stone-200 bg-white text-stone-500 hover:border-brand/40 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
                        }`}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                  {filtro !== "all" && (
                    <button type="button" onClick={() => setFiltro("all")} className="flex flex-shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-stone-400 hover:text-stone-600" aria-label="Limpar filtro">
                      <Close size={12} /> Limpar
                    </button>
                  )}
                  <span className="ml-auto flex-shrink-0 whitespace-nowrap pl-2 text-[11px] font-bold tabular-nums text-stone-400">{totalResultados}</span>
                </div>
              )}

              {/* ── Results / Default state ── (em cima no telemóvel; cresce para cima) */}
              <div className="order-1 min-h-0 flex-1 overflow-y-auto overscroll-contain sm:order-4">

                {/* ── Default state (no query): quick access ── */}
                {!temQuery && categoria === "ferramentas" && (
                  <div className="p-4 space-y-5">
                    {/* Recentes */}
                    {recentes.length > 0 && (
                      <div>
                        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                          <History size={11} /> Pesquisas recentes
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {recentes.map((h) => (
                            <button key={h} type="button" onClick={() => setQuery(h)} className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-600 hover:border-brand/40 hover:bg-white dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
                              {h}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mais utilizadas */}
                    <div>
                      <div className="mb-2.5 flex items-center justify-between">
                        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                          <Zap size={11} /> Mais utilizadas
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                        {maisUtilizados.map((item) => (
                          <QuickCard key={item.id} item={item} onClick={navegar} />
                        ))}
                      </div>
                    </div>

                    {/* Simuladores rapidos */}
                    <div>
                      <div className="mb-2.5 flex items-center justify-between">
                        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                          <Calculator size={11} /> Simuladores
                        </p>
                        <button type="button" onClick={() => setFiltro("Simuladores")} className="flex items-center gap-1 text-[10px] font-semibold text-brand-dark hover:underline">
                          Ver todos <ChevronRight size={10} />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                        {simRapidos.map((item) => (
                          <SimQuickCard key={item.id} item={item} onClick={navegar} />
                        ))}
                      </div>
                    </div>

                    {/* Sugestoes */}
                    <div>
                      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                        <Zap size={11} /> Sugestões para si
                      </p>
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                        {FERRAMENTAS.filter((f) => ["f-auditoria", "f-classificar", "f-quiz"].includes(f.id)).map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => navegar(item.href)}
                            className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50 px-3 py-2.5 text-left transition-all hover:border-brand/30 hover:bg-white dark:border-stone-800 dark:bg-stone-800/40 dark:hover:border-brand/40"
                          >
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
                              <Icone nome={item.icone} size={14} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-stone-700 dark:text-stone-200">{item.titulo}</p>
                              <p className="truncate text-[10px] text-stone-400">{item.descricao}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Default state for guias / atividades (no query) ── */}
                {!temQuery && categoria !== "ferramentas" && (
                  <div className="px-2 py-2">
                    {recentes.length > 0 && (
                      <div className="px-2 pb-2">
                        <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                          <History size={11} /> Recentes
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {recentes.map((h) => (
                            <button key={h} type="button" onClick={() => setQuery(h)} className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-600 hover:border-brand/40 hover:bg-white dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
                              {h}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Show all items grouped */}
                    {categoria !== "atividades" && Object.entries(grupos).map(([grupo, lista]) => (
                      <div key={grupo} className="mb-1">
                        <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">{grupo}</p>
                        {lista.map((it) => (
                          <button
                            key={it.id}
                            type="button"
                            onClick={() => navegar(it.href)}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
                          >
                            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-stone-100 bg-stone-50 text-brand dark:border-stone-800 dark:bg-stone-800">
                              <Icone nome={it.icone} size={16} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-stone-800 dark:text-stone-100">{it.titulo}</span>
                              <span className="block truncate text-xs text-stone-500 dark:text-stone-400">{it.descricao}</span>
                            </span>
                            <ArrowRight size={14} className="flex-shrink-0 text-stone-300" />
                          </button>
                        ))}
                      </div>
                    ))}

                    {categoria === "atividades" && resultadosAtiv.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => navegar(`/dashboard/classificar-atividade?q=${encodeURIComponent(a.label)}`)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
                      >
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-stone-100 bg-stone-50 text-brand dark:border-stone-800 dark:bg-stone-800">
                          <Search size={15} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-stone-800 dark:text-stone-100">{a.label}</span>
                          <span className="block truncate text-xs text-stone-500 dark:text-stone-400">{a.grupo} · {a.resumo}</span>
                        </span>
                        <ArrowRight size={14} className="flex-shrink-0 text-stone-300" />
                      </button>
                    ))}
                  </div>
                )}

                {/* ── Search results (with query) ── */}
                {temQuery && (
                  <div className="px-2 py-2">
                    {categoria !== "atividades" && Object.entries(grupos).map(([grupo, lista]) => (
                      <div key={grupo} className="mb-1">
                        <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">{grupo}</p>
                        {lista.map((it) => (
                          <button
                            key={it.id}
                            type="button"
                            onClick={() => navegar(it.href)}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
                          >
                            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-stone-100 bg-stone-50 text-brand dark:border-stone-800 dark:bg-stone-800">
                              <Icone nome={it.icone} size={16} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-stone-800 dark:text-stone-100"><Realce texto={it.titulo} query={query} /></span>
                              <span className="block truncate text-xs text-stone-500 dark:text-stone-400">{it.descricao}</span>
                            </span>
                            <ArrowRight size={14} className="flex-shrink-0 text-stone-300" />
                          </button>
                        ))}
                      </div>
                    ))}

                    {categoria === "atividades" && resultadosAtiv.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => navegar(`/dashboard/classificar-atividade?q=${encodeURIComponent(a.label)}`)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
                      >
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-stone-100 bg-stone-50 text-brand dark:border-stone-800 dark:bg-stone-800">
                          <Search size={15} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-stone-800 dark:text-stone-100"><Realce texto={a.label} query={query} /></span>
                          <span className="block truncate text-xs text-stone-500 dark:text-stone-400">{a.grupo} · {a.resumo}</span>
                        </span>
                        <ArrowRight size={14} className="flex-shrink-0 text-stone-300" />
                      </button>
                    ))}

                    {totalResultados === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Search size={28} className="mb-2 text-stone-300" />
                        <p className="text-sm text-stone-500 dark:text-stone-400">Sem resultados para «{query}» em {catAtual.label.toLowerCase()}.</p>
                        <p className="mt-1 text-xs text-stone-400">Experimenta outra categoria acima.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* safe-area mobile spacer (recolhe quando o teclado está aberto) */}
              <div className="order-5 shrink-0 sm:hidden" style={{ height: tecladoInset > 0 ? 0 : "env(safe-area-inset-bottom)" }} aria-hidden />

              {/* ── Footer ── */}
              <div className="order-6 hidden shrink-0 items-center justify-between border-t border-stone-100 px-5 py-2.5 text-[11px] text-stone-400 dark:border-stone-800 sm:order-5 sm:flex">
                <span>Enter abre o primeiro resultado · Esc fecha</span>
                {temQuery && <span className="font-semibold text-brand-dark dark:text-brand">{totalResultados} resultado{totalResultados !== 1 ? "s" : ""}</span>}
              </div>
            </m.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
