"use client";

import { useMemo, useRef, useState, useId, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ATIVIDADES, META_TIPO, type Atividade } from "@/lib/fiscal-data";

// ─── Debounce ────────────────────────────────────────────────────────────────
function useDebounce(value: string, delay = 180) {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

// ─── Highlight ───────────────────────────────────────────────────────────────
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-brand-light text-brand-dark rounded-[3px] px-0.5 not-italic">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ─── Histórico (localStorage) ─────────────────────────────────────────────────
const HIST_KEY = "rc-activity-hist-v1";

function lerHistorico(): Atividade[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(HIST_KEY) ?? "[]"); }
  catch { return []; }
}
function guardarHistorico(h: Atividade[]) {
  try { localStorage.setItem(HIST_KEY, JSON.stringify(h)); } catch {}
}

// ─── Badgezinha de tipo ───────────────────────────────────────────────────────
const TIPO_CLASSE: Record<string, string> = {
  art151:      "bg-brand-light text-brand-dark",
  outros:      "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
  vendas:      "bg-amber-50 text-amber-700",
  diretosAutor:"bg-purple-50 text-purple-700",
};

function TipoBadge({ tipo }: { tipo: string }) {
  const meta = META_TIPO[tipo as keyof typeof META_TIPO];
  if (!meta) return null;
  // Label curto para a badge
  const curto: Record<string, string> = {
    art151: "Art. 151.º",
    outros: "Outros",
    vendas: "Comércio",
    diretosAutor: "Dir. Autor",
  };
  return (
    <span className={`flex-shrink-0 rounded-full px-1.5 py-px text-[9px] font-bold ${TIPO_CLASSE[tipo] ?? ""}`}>
      {curto[tipo] ?? tipo}
    </span>
  );
}

// ─── Ícones inline (sem dependência de Icons.tsx para não quebrar SSR) ────────
const IcoSearch = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
    <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const IcoSpin = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden className="animate-spin">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="28 28" strokeLinecap="round" />
  </svg>
);

const IcoCheck = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
    <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IcoHistory = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
    <polyline points="12 8 12 12 14.5 14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const IcoBrowse = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

const IcoTrend = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="17 6 23 6 23 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IcoChevron = (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
    <polyline points="9 18 15 12 9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IcoX = (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ─── Grupos únicos (calculados uma vez) ──────────────────────────────────────
const GRUPOS = Array.from(new Set(ATIVIDADES.map((a) => a.grupo)));
const CONTAGEM_GRUPO = Object.fromEntries(
  GRUPOS.map((g) => [g, ATIVIDADES.filter((a) => a.grupo === g).length])
);

// ─── Seletor pesquisável premium ──────────────────────────────────────────────
// Dropdown usa portal + position:fixed para escapar de overflow:hidden.
// A posição é calculada pós-animação via rAF duplo.
export default function ActivityCombobox({
  value,
  onChange,
}: {
  value: Atividade | null;
  onChange: (a: Atividade) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQueryRaw] = useState("");
  const debounced = useDebounce(query);
  const isPending = query !== debounced;

  const [active, setActive] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 300 });
  const [historico, setHistorico] = useState<Atividade[]>([]);

  const listId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const interagindoDropdown = useRef(false);

  useEffect(() => {
    setMounted(true);
    setHistorico(lerHistorico());
  }, []);

  // ── Posição (portal fixed) ────────────────────────────────────────────────
  const MAX_H = 440;

  const recalcPos = useCallback(() => {
    if (!wrapperRef.current) return;
    const r = wrapperRef.current.getBoundingClientRect();
    const vh = window.visualViewport?.height ?? window.innerHeight;
    const vw = window.innerWidth;
    const spaceBelow = vh - r.bottom - 4;
    const above = spaceBelow < MAX_H && r.top > MAX_H;
    const left = Math.max(0, Math.min(r.left, vw - r.width));
    setPos({ top: above ? r.top - MAX_H - 4 : r.bottom + 4, left, width: r.width });
  }, []);

  const calcPos = useCallback(() => {
    requestAnimationFrame(() => requestAnimationFrame(recalcPos));
  }, [recalcPos]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", recalcPos, true);
    window.addEventListener("resize", recalcPos);
    window.visualViewport?.addEventListener("resize", recalcPos);
    window.visualViewport?.addEventListener("scroll", recalcPos);
    return () => {
      window.removeEventListener("scroll", recalcPos, true);
      window.removeEventListener("resize", recalcPos);
      window.visualViewport?.removeEventListener("resize", recalcPos);
      window.visualViewport?.removeEventListener("scroll", recalcPos);
    };
  }, [open, recalcPos]);

  // ── Filtragem ─────────────────────────────────────────────────────────────
  const filtradas = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return ATIVIDADES;
    return ATIVIDADES.filter((a) =>
      `${a.label} ${a.grupo}`.toLowerCase().includes(q)
    );
  }, [debounced]);

  // Agrupadas por grupo (só quando há query)
  const agrupadas = useMemo<Map<string, Atividade[]> | null>(() => {
    if (!debounced.trim()) return null;
    const map = new Map<string, Atividade[]>();
    filtradas.forEach((a) => {
      const arr = map.get(a.grupo) ?? [];
      arr.push(a);
      map.set(a.grupo, arr);
    });
    return map;
  }, [filtradas, debounced]);

  // Chips de sugestão rápida (primeiros 4)
  const chips = useMemo(
    () => (debounced.trim() ? filtradas.slice(0, 4) : []),
    [filtradas, debounced]
  );

  // ── Ações ──────────────────────────────────────────────────────────────────
  const escolher = useCallback(
    (a: Atividade) => {
      onChange(a);
      setQueryRaw("");
      setOpen(false);
      const next = [a, ...historico.filter((h) => h.label !== a.label)].slice(0, 5);
      setHistorico(next);
      guardarHistorico(next);
    },
    [onChange, historico]
  );

  const setQuery = (q: string) => {
    setQueryRaw(q);
    setActive(0);
    setOpen(true);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, filtradas.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && filtradas[active]) escolher(filtradas[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // ── Dropdown ───────────────────────────────────────────────────────────────
  const dropdown =
    open && mounted ? (
      <div
        id={listId}
        role="listbox"
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          width: pos.width,
          maxHeight: MAX_H,
          zIndex: 9999,
          touchAction: "pan-y",
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          interagindoDropdown.current = true;
        }}
        onMouseUp={() => { interagindoDropdown.current = false; }}
        onTouchStart={() => { interagindoDropdown.current = true; }}
        onTouchEnd={() => { setTimeout(() => { interagindoDropdown.current = false; }, 0); }}
        className="flex flex-col rounded-2xl border border-stone-200 bg-white shadow-float overflow-hidden dark:border-stone-700 dark:bg-stone-950"
      >

        {/* ── COM QUERY ──────────────────────────────────────────────────── */}
        {debounced.trim() ? (
          <>
            {/* Chips de sugestão rápida */}
            {chips.length > 0 && (
              <div className="px-3.5 pt-3 pb-2.5 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-brand">{IcoTrend}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-brand">
                    Sugestões rápidas
                  </span>
                  {!isPending && (
                    <span className="ml-auto text-[10px] font-semibold text-stone-400 tabular-nums">
                      {filtradas.length} resultado{filtradas.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {chips.map((a) => (
                    <button
                      key={a.label}
                      type="button"
                      onClick={() => escolher(a)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-brand-light text-brand-dark border border-brand/20 hover:bg-brand hover:text-white transition-colors"
                    >
                      <span className="opacity-70">{IcoChevron}</span>
                      <span className="truncate max-w-[150px]">
                        <Highlight
                          text={a.label.length > 28 ? a.label.slice(0, 28) + "…" : a.label}
                          query={debounced}
                        />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Resultados agrupados */}
            <div className="overflow-y-auto flex-1">
              {filtradas.length === 0 && !isPending ? (
                /* Estado vazio */
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-stone-300 dark:text-stone-600 mb-3" aria-hidden>
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M9 11h4M11 9v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <p className="text-sm font-semibold text-stone-600 dark:text-stone-300 mb-1">
                    Sem resultados para &ldquo;{debounced}&rdquo;
                  </p>
                  <p className="text-xs text-stone-400 mb-4">
                    Tenta palavras mais gerais ou explora por área profissional.
                  </p>
                  {/* Sugestão de áreas */}
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {GRUPOS.slice(0, 4).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setQuery(g)}
                        className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-stone-50 dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-brand-light hover:text-brand-dark hover:border-brand/20 transition-colors"
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              ) : agrupadas ? (
                Array.from(agrupadas.entries()).map(([grupo, items]) => (
                  <div key={grupo}>
                    {/* Cabeçalho de grupo sticky */}
                    <div className="flex items-center gap-2 px-3.5 py-2 bg-stone-50 dark:bg-stone-900/80 border-b border-stone-100 dark:border-stone-800 sticky top-0 z-10">
                      <span className="text-brand">{IcoBrowse}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-brand flex-1 min-w-0 truncate">
                        {grupo}
                      </span>
                      <span className="text-[9px] font-bold text-stone-400 tabular-nums flex-shrink-0">
                        {items.length}
                      </span>
                    </div>
                    {items.map((a) => {
                      const idx = filtradas.indexOf(a);
                      const isSel = value?.label === a.label;
                      const isAct = idx === active;
                      return (
                        <button
                          key={a.label}
                          type="button"
                          role="option"
                          aria-selected={isSel}
                          onClick={() => escolher(a)}
                          onMouseEnter={() => setActive(idx)}
                          className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm transition-colors text-left border-b border-stone-50 dark:border-stone-800/50 last:border-0 ${
                            isAct
                              ? "bg-brand-light dark:bg-brand/10"
                              : "hover:bg-stone-50 dark:hover:bg-stone-900"
                          }`}
                        >
                          <span className={`flex-1 min-w-0 font-medium leading-snug ${isAct ? "text-brand-dark" : "text-stone-700 dark:text-stone-300"}`}>
                            <Highlight text={a.label} query={debounced} />
                          </span>
                          <TipoBadge tipo={a.tipo} />
                          {isSel && (
                            <span className="text-brand flex-shrink-0">{IcoCheck}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              ) : null}
            </div>
          </>
        ) : (
          /* ── SEM QUERY: histórico + explorar por área ────────────────── */
          <div className="overflow-y-auto flex-1">
            {/* Histórico */}
            {historico.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-stone-100 dark:border-stone-800">
                  <span className="text-stone-400">{IcoHistory}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-stone-400">
                    Selecionadas recentemente
                  </span>
                </div>
                {historico.map((a) => {
                  const isSel = value?.label === a.label;
                  return (
                    <button
                      key={a.label}
                      type="button"
                      role="option"
                      aria-selected={isSel}
                      onClick={() => escolher(a)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm transition-colors text-left border-b border-stone-50 dark:border-stone-800/50 ${
                        isSel
                          ? "bg-brand-light dark:bg-brand/10"
                          : "hover:bg-stone-50 dark:hover:bg-stone-900"
                      }`}
                    >
                      <span className="text-stone-400 flex-shrink-0">{IcoHistory}</span>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium truncate ${isSel ? "text-brand-dark" : "text-stone-700 dark:text-stone-300"}`}>
                          {a.label}
                        </div>
                        <div className="text-[10px] text-stone-400 mt-0.5">{a.grupo}</div>
                      </div>
                      <TipoBadge tipo={a.tipo} />
                      {isSel && (
                        <span className="text-brand flex-shrink-0">{IcoCheck}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Explorar por área profissional */}
            <div>
              <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-stone-100 dark:border-stone-800">
                <span className="text-brand">{IcoBrowse}</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-brand">
                  Explorar por área
                </span>
              </div>
              <div className="px-3.5 py-3 flex flex-wrap gap-1.5">
                {GRUPOS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setQuery(g)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold bg-stone-50 dark:bg-stone-900 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-brand-light hover:text-brand-dark hover:border-brand/20 transition-colors"
                  >
                    {g}
                    <span className="text-[9px] font-bold text-stone-400 tabular-nums">
                      {CONTAGEM_GRUPO[g]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-3.5 py-2 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/80 flex-shrink-0">
          <span className="text-[9px] text-stone-400 select-none">
            ↑↓ navegar · Enter selecionar · Esc fechar
          </span>
          {debounced.trim() && !isPending && (
            <span className={`text-[9px] font-bold tabular-nums ${filtradas.length > 0 ? "text-brand" : "text-stone-400"}`}>
              {filtradas.length > 0
                ? `${filtradas.length} atividade${filtradas.length !== 1 ? "s" : ""}`
                : "0 resultados"}
            </span>
          )}
        </div>
      </div>
    ) : null;

  // ── Input ──────────────────────────────────────────────────────────────────
  const inputDisplay = open ? query : (value?.label ?? "");

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3.5 transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30 dark:border-stone-700 dark:bg-stone-900">
        {/* Ícone / spinner */}
        <span className={`flex-shrink-0 ${isPending ? "text-brand" : "text-stone-400"}`}>
          {isPending ? IcoSpin : IcoSearch}
        </span>

        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          value={inputDisplay}
          placeholder="Procura a tua profissão ou atividade…"
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { calcPos(); setOpen(true); }}
          onBlur={() => {
            if (interagindoDropdown.current) return;
            setTimeout(() => setOpen(false), 150);
          }}
          onKeyDown={onKeyDown}
          className="w-full bg-transparent py-3 text-base text-stone-800 placeholder-stone-400 focus:outline-none dark:text-stone-200"
        />

        {/* Contador inline */}
        {open && debounced.trim() && !isPending && filtradas.length > 0 && (
          <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-light text-brand-dark tabular-nums">
            {filtradas.length}
          </span>
        )}

        {/* Limpar */}
        {inputDisplay && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setQueryRaw("");
              inputRef.current?.focus();
              setOpen(true);
            }}
            className="w-6 h-6 flex items-center justify-center rounded-md text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex-shrink-0"
            aria-label="Limpar pesquisa"
          >
            {IcoX}
          </button>
        )}
      </div>

      {mounted && dropdown && createPortal(dropdown, document.body)}
    </div>
  );
}
