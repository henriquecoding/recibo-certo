"use client";

// Pesquisa global do ReciboCerto — densa e sensível ao contexto.
// Trigger compacto (para os headers) + overlay (folha inferior no telemóvel,
// modal centrado no desktop). Atalho ⌘K / Ctrl+K. Paleta da marca, acessível.

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

/** Botão de pesquisa (leve). Dispara a abertura do overlay global único. */
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
          <span className="hidden md:inline">Pesquisar…</span>
          <span className="ml-2 hidden items-center gap-0.5 rounded-md border border-stone-200 px-1.5 py-0.5 text-[10px] font-semibold text-stone-400 md:inline-flex dark:border-stone-700">
            <Keyboard size={11} /> K
          </span>
        </>
      )}
    </button>
  );
}

/** Overlay de pesquisa — montado UMA vez (na raiz). Abre por ⌘K/Ctrl+K ou evento. */
export default function BuscaOverlay() {
  const router = useRouter();
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaBusca>("ferramentas");
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query);
  const [recentes, setRecentes] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const abrir = useCallback(() => {
    setCategoria(categoriaPorContexto(pathname));
    setRecentes(lerRecentes());
    setAberto(true);
  }, [pathname]);

  // ⌘K / Ctrl+K abre; ESC fecha. Bloqueia scroll do corpo enquanto aberto.
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

  // Fecha ao navegar.
  useEffect(() => { setAberto(false); }, [pathname]);

  const itens = categoria === "guias" ? GUIAS : FERRAMENTAS;
  const resultadosItens = useMemo(
    () => (categoria === "atividades" ? [] : pesquisarItens(itens, debounced)),
    [categoria, itens, debounced]
  );
  const resultadosAtiv = useMemo(
    () => (categoria === "atividades" ? pesquisarAtividades(debounced) : []),
    [categoria, debounced]
  );

  // Agrupa itens por grupo.
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

  return (
    <>
      {/* ── Overlay (instância única) ── */}
      <AnimatePresence>
        {aberto && (
          <div className="fixed inset-0 z-[120]" role="dialog" aria-modal="true" aria-label="Pesquisa">
            <m.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
              className="absolute inset-0 bg-stone-900/45 backdrop-blur-md"
              onClick={() => setAberto(false)}
              aria-hidden
            />
            <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-0 sm:items-start sm:p-4 sm:pt-[7vh]">
              <m.div
                initial={{ y: 28, scale: 0.97 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: 24, scale: 0.97 }}
                transition={{ type: "spring", damping: 32, stiffness: 340 }}
                className="pointer-events-auto flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-stone-200/80 bg-white shadow-float ring-1 ring-black/5 dark:border-stone-800 dark:bg-stone-900 dark:ring-white/5 sm:max-h-[80dvh] sm:rounded-2xl"
              >
                {/* Input — em baixo no telemóvel (zona do polegar), em cima no desktop */}
                <div className="order-3 flex shrink-0 items-center gap-3 border-stone-100 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-stone-800 sm:order-1 sm:border-b sm:pb-4">
                  <Search size={20} className="flex-shrink-0 text-brand" />
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (categoria === "atividades") navegar("/dashboard/classificar-atividade");
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
                  <button type="button" onClick={() => setAberto(false)} aria-label="Fechar pesquisa" className="flex h-8 w-8 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800">
                    <Close size={18} />
                  </button>
                </div>

                {/* Categorias (contexto) */}
                <div className="order-2 flex shrink-0 items-center gap-1.5 overflow-x-auto border-y border-stone-100 px-3 py-2.5 dark:border-stone-800 sm:border-t-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {CATEGORIAS.map((c) => {
                    const ativo = categoria === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={ativo}
                        onClick={() => { setCategoria(c.id); inputRef.current?.focus(); }}
                        className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                          ativo
                            ? "border-brand bg-brand text-white shadow-glow"
                            : "border-stone-200 bg-stone-50 text-stone-600 hover:border-brand/40 hover:bg-white dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"
                        }`}
                      >
                        <Icone nome={c.icone} size={14} />
                        {c.label}
                        <span className={ativo ? "text-white/70" : "text-stone-400"} style={{ fontSize: 10 }}>{c.sub}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Resultados */}
                <div className="order-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 sm:order-3">
                  {/* Recentes (sem query) */}
                  {!query && recentes.length > 0 && (
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

                  {/* Ferramentas / Guias */}
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
                          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
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

                  {/* Atividades */}
                  {categoria === "atividades" && resultadosAtiv.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => navegar("/dashboard/classificar-atividade")}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white dark:hover:bg-stone-800"
                    >
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
                        <Search size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-stone-800 dark:text-stone-100"><Realce texto={a.label} query={query} /></span>
                        <span className="block truncate text-xs text-stone-500 dark:text-stone-400">{a.grupo} · {a.resumo}</span>
                      </span>
                      <ArrowRight size={14} className="flex-shrink-0 text-stone-300" />
                    </button>
                  ))}

                  {/* Vazio */}
                  {query && totalResultados === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Search size={28} className="mb-2 text-stone-300" />
                      <p className="text-sm text-stone-500 dark:text-stone-400">Sem resultados para «{query}» em {catAtual.label.toLowerCase()}.</p>
                      <p className="mt-1 text-xs text-stone-400">Experimenta outra categoria acima.</p>
                    </div>
                  )}
                </div>

                {/* Rodapé */}
                <div className="order-4 hidden shrink-0 items-center justify-between border-t border-stone-100 px-4 py-2 text-[11px] text-stone-400 dark:border-stone-800 sm:flex">
                  <span>Enter abre o primeiro resultado · Esc fecha</span>
                  {query && <span className="font-semibold text-brand-dark dark:text-brand">{totalResultados} resultado{totalResultados !== 1 ? "s" : ""}</span>}
                </div>
              </m.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
