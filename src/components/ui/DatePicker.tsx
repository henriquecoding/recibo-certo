"use client";

// ─────────────────────────────────────────────────────────────────────────
//  DatePicker — seletor de data moderno, rápido e acessível (pt-PT).
//
//  Substitui o <input type="date"> nativo (lento e inconsistente entre
//  navegadores) por um popover elegante com três vistas — dias, meses e anos —
//  para navegação instantânea (essencial em datas de nascimento). Respeita o
//  design system: marca, dark mode, motion (m.*), foco visível e teclado.
//
//  Valor sempre em ISO `yyyy-mm-dd` (ou "" para vazio). A apresentação é
//  dd/mm/aaaa em pt-PT. Sem dependências de datas externas (evita drift de
//  fuso horário ao formatar/parsear manualmente).
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { m, AnimatePresence } from "motion/react";
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from "@/components/ui/Icons";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
// Semana começa à segunda-feira (convenção pt-PT).
const DIAS_SEMANA = [
  { l: "S", t: "segunda" }, { l: "T", t: "terça" }, { l: "Q", t: "quarta" },
  { l: "Q", t: "quinta" }, { l: "S", t: "sexta" }, { l: "S", t: "sábado" }, { l: "D", t: "domingo" },
];

const pad = (n: number) => String(n).padStart(2, "0");

function parseISO(s: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  if (m < 0 || m > 11 || d < 1 || d > 31) return null;
  return { y, m, d };
}

const toISO = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const formatPT = (s: string) => {
  const p = parseISO(s);
  return p ? `${pad(p.d)}/${pad(p.m + 1)}/${p.y}` : "";
};
const diasNoMes = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
// Índice do 1.º dia do mês com a semana a começar à segunda (0 = segunda).
const primeiroDiaSemana = (y: number, m: number) => (new Date(y, m, 1).getDay() + 6) % 7;

type Vista = "dias" | "meses" | "anos";

export interface DatePickerProps {
  value: string;
  onChange: (iso: string) => void;
  id?: string;
  /** Data ISO máxima selecionável (inclusive). */
  max?: string;
  /** Data ISO mínima selecionável (inclusive). */
  min?: string;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  /** Erro de validação (estiliza a borda). */
  invalido?: boolean;
}

export default function DatePicker({
  value,
  onChange,
  id,
  max,
  min,
  placeholder = "dd/mm/aaaa",
  ariaLabel,
  className = "",
  invalido = false,
}: DatePickerProps) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const popId = `${inputId}-pop`;

  const hoje = useMemo(() => new Date(), []);
  const selecionado = parseISO(value);
  const limiteMax = parseISO(max ?? "");
  const limiteMin = parseISO(min ?? "");

  const [aberto, setAberto] = useState(false);
  const [vista, setVista] = useState<Vista>("dias");
  // Mês/ano em foco no calendário (independente do valor selecionado).
  const [foco, setFoco] = useState(() => ({
    y: selecionado?.y ?? hoje.getFullYear(),
    m: selecionado?.m ?? hoje.getMonth(),
  }));

  const wrapRef = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);

  // Ao abrir, sincroniza o foco com o valor selecionado (ou hoje).
  useEffect(() => {
    if (aberto) {
      setVista("dias");
      setFoco({
        y: selecionado?.y ?? hoje.getFullYear(),
        m: selecionado?.m ?? hoje.getMonth(),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  // Fecha ao clicar fora ou com Escape.
  useEffect(() => {
    if (!aberto) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setAberto(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAberto(false);
        botaoRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [aberto]);

  const foraDeLimites = (y: number, m: number, d: number) => {
    const t = y * 10000 + m * 100 + d;
    if (limiteMax && t > limiteMax.y * 10000 + limiteMax.m * 100 + limiteMax.d) return true;
    if (limiteMin && t < limiteMin.y * 10000 + limiteMin.m * 100 + limiteMin.d) return true;
    return false;
  };

  const escolherDia = (d: number) => {
    if (foraDeLimites(foco.y, foco.m, d)) return;
    onChange(toISO(foco.y, foco.m, d));
    setAberto(false);
    botaoRef.current?.focus();
  };

  const navegarMes = (delta: number) => {
    setFoco((f) => {
      const total = f.y * 12 + f.m + delta;
      return { y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 };
    });
  };

  // Navegação por teclado dentro da grelha de dias.
  const onGridKey = (e: React.KeyboardEvent) => {
    const sel = selecionado && selecionado.y === foco.y && selecionado.m === foco.m ? selecionado.d : null;
    const atual = sel ?? 1;
    const mover = (delta: number) => {
      e.preventDefault();
      const max = diasNoMes(foco.y, foco.m);
      const novo = Math.min(max, Math.max(1, atual + delta));
      onChange(toISO(foco.y, foco.m, novo));
    };
    if (e.key === "ArrowRight") mover(1);
    else if (e.key === "ArrowLeft") mover(-1);
    else if (e.key === "ArrowDown") mover(7);
    else if (e.key === "ArrowUp") mover(-7);
  };

  const anoBase = Math.floor(foco.y / 12) * 12;

  const display = formatPT(value);

  return (
    <div className={`relative ${className}`} ref={wrapRef}>
      <button
        type="button"
        id={inputId}
        ref={botaoRef}
        onClick={() => setAberto((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        aria-controls={aberto ? popId : undefined}
        aria-label={ariaLabel}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-stone-50 px-3.5 py-2.5 text-left text-[16px] transition-all focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand dark:bg-stone-800/50 dark:border-stone-700 ${
          invalido ? "border-red-400 focus:ring-red-400" : "border-stone-200"
        } ${display ? "text-stone-800 dark:text-stone-100" : "text-stone-400"}`}
      >
        <span className="tabular-nums">{display || placeholder}</span>
        <Calendar size={17} className="flex-shrink-0 text-stone-400" />
      </button>

      <AnimatePresence>
        {aberto && (
          <m.div
            id={popId}
            role="dialog"
            aria-label="Selecionar data"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 z-50 mt-2 w-[19rem] max-w-[calc(100vw-2rem)] origin-top rounded-2xl border border-stone-200 bg-white p-3 shadow-float dark:border-stone-700 dark:bg-stone-900"
          >
            {/* Cabeçalho */}
            <div className="mb-2 flex items-center justify-between gap-1">
              <button
                type="button"
                onClick={() => (vista === "anos" ? navegarMes(-12 * 12) : navegarMes(-1))}
                aria-label={vista === "anos" ? "Recuar" : "Mês anterior"}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
              >
                <ChevronLeft size={17} />
              </button>

              <button
                type="button"
                onClick={() => setVista((v) => (v === "dias" ? "meses" : v === "meses" ? "anos" : "dias"))}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-sm font-semibold capitalize text-stone-800 transition-colors hover:bg-stone-100 dark:text-stone-100 dark:hover:bg-stone-800"
              >
                {vista === "dias" && `${MESES[foco.m]} de ${foco.y}`}
                {vista === "meses" && `${foco.y}`}
                {vista === "anos" && `${anoBase} – ${anoBase + 11}`}
                <ChevronDown size={14} className="text-stone-400" />
              </button>

              <button
                type="button"
                onClick={() => (vista === "anos" ? navegarMes(12 * 12) : navegarMes(1))}
                aria-label={vista === "anos" ? "Avançar" : "Mês seguinte"}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
              >
                <ChevronRight size={17} />
              </button>
            </div>

            {/* Vista de dias */}
            {vista === "dias" && (
              <div onKeyDown={onGridKey}>
                <div className="mb-1 grid grid-cols-7">
                  {DIAS_SEMANA.map((d, i) => (
                    <div key={i} title={d.t} className="py-1 text-center text-[11px] font-semibold uppercase text-stone-400">
                      {d.l}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {Array.from({ length: primeiroDiaSemana(foco.y, foco.m) }).map((_, i) => (
                    <div key={`v-${i}`} />
                  ))}
                  {Array.from({ length: diasNoMes(foco.y, foco.m) }, (_, i) => i + 1).map((d) => {
                    const isSel =
                      selecionado && selecionado.y === foco.y && selecionado.m === foco.m && selecionado.d === d;
                    const isHoje =
                      hoje.getFullYear() === foco.y && hoje.getMonth() === foco.m && hoje.getDate() === d;
                    const desativado = foraDeLimites(foco.y, foco.m, d);
                    return (
                      <button
                        key={d}
                        type="button"
                        disabled={desativado}
                        aria-pressed={!!isSel}
                        onClick={() => escolherDia(d)}
                        className={`flex h-9 items-center justify-center rounded-lg text-sm tabular-nums transition-colors ${
                          isSel
                            ? "bg-brand font-semibold text-white"
                            : desativado
                              ? "cursor-not-allowed text-stone-300 dark:text-stone-700"
                              : isHoje
                                ? "font-semibold text-brand ring-1 ring-inset ring-brand/40 hover:bg-brand-light"
                                : "text-stone-700 hover:bg-brand-light hover:text-brand-dark dark:text-stone-200 dark:hover:bg-stone-800"
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Vista de meses */}
            {vista === "meses" && (
              <div className="grid grid-cols-3 gap-1.5">
                {MESES_CURTOS.map((mes, i) => {
                  const isSel = selecionado && selecionado.y === foco.y && selecionado.m === i;
                  return (
                    <button
                      key={mes}
                      type="button"
                      onClick={() => {
                        setFoco((f) => ({ ...f, m: i }));
                        setVista("dias");
                      }}
                      className={`rounded-lg py-2.5 text-sm font-medium capitalize transition-colors ${
                        isSel
                          ? "bg-brand text-white"
                          : "text-stone-700 hover:bg-brand-light hover:text-brand-dark dark:text-stone-200 dark:hover:bg-stone-800"
                      }`}
                    >
                      {mes}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Vista de anos */}
            {vista === "anos" && (
              <div className="grid grid-cols-3 gap-1.5">
                {Array.from({ length: 12 }, (_, i) => anoBase + i).map((ano) => {
                  const isSel = selecionado?.y === ano;
                  return (
                    <button
                      key={ano}
                      type="button"
                      onClick={() => {
                        setFoco((f) => ({ ...f, y: ano }));
                        setVista("meses");
                      }}
                      className={`rounded-lg py-2.5 text-sm font-medium tabular-nums transition-colors ${
                        isSel
                          ? "bg-brand text-white"
                          : "text-stone-700 hover:bg-brand-light hover:text-brand-dark dark:text-stone-200 dark:hover:bg-stone-800"
                      }`}
                    >
                      {ano}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Ações rápidas */}
            <div className="mt-2 flex items-center justify-between border-t border-stone-100 pt-2 dark:border-stone-800">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setAberto(false);
                  botaoRef.current?.focus();
                }}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (foraDeLimites(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) return;
                  onChange(toISO(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()));
                  setAberto(false);
                  botaoRef.current?.focus();
                }}
                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand-light"
              >
                Hoje
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
