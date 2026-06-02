"use client";

import { useMemo, useRef, useState, useId, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ATIVIDADES, type Atividade } from "@/lib/fiscal-data";

// Seletor pesquisável — dropdown usa portal + position:fixed para escapar de
// overflow:hidden. A posição é calculada pós-animação via rAF duplo.
export default function ActivityCombobox({
  value,
  onChange,
}: {
  value: Atividade | null;
  onChange: (a: Atividade) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 300 });
  const listId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Calcular posição depois de todas as animações (double rAF)
  const calcPos = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (wrapperRef.current) {
          const r = wrapperRef.current.getBoundingClientRect();
          setPos({ top: r.bottom + 4, left: r.left, width: r.width });
        }
      });
    });
  }, []);

  // Re-calcular em scroll e resize enquanto aberto
  useEffect(() => {
    if (!open) return;
    const handle = () => {
      if (wrapperRef.current) {
        const r = wrapperRef.current.getBoundingClientRect();
        setPos({ top: r.bottom + 4, left: r.left, width: r.width });
      }
    };
    window.addEventListener("scroll", handle, true);
    window.addEventListener("resize", handle);
    return () => {
      window.removeEventListener("scroll", handle, true);
      window.removeEventListener("resize", handle);
    };
  }, [open]);

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ATIVIDADES;
    return ATIVIDADES.filter((a) =>
      `${a.label} ${a.grupo}`.toLowerCase().includes(q),
    );
  }, [query]);

  const escolher = (a: Atividade) => {
    onChange(a);
    setQuery("");
    setOpen(false);
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

  const dropdown =
    open && mounted ? (
      <ul
        id={listId}
        role="listbox"
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          width: pos.width,
          zIndex: 9999,
        }}
        className="max-h-64 overflow-auto rounded-xl border border-stone-200 bg-white py-1 shadow-float dark:border-stone-700 dark:bg-stone-950"
      >
        {filtradas.length === 0 && (
          <li className="px-3.5 py-2 text-sm text-stone-400">Sem resultados</li>
        )}
        {filtradas.map((a, i) => (
          <li
            key={a.label}
            role="option"
            aria-selected={value?.label === a.label}
            onMouseDown={(e) => {
              e.preventDefault();
              escolher(a);
            }}
            onMouseEnter={() => setActive(i)}
            className={`flex cursor-pointer items-center justify-between gap-3 px-3.5 py-2 text-sm transition-colors ${
              i === active
                ? "bg-brand-light text-brand-dark"
                : "text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-900"
            }`}
          >
            <span>{a.label}</span>
            <span className="shrink-0 text-[11px] text-stone-400">{a.grupo}</span>
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3.5 transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30 dark:border-stone-700 dark:bg-stone-900">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className="flex-shrink-0 text-stone-400"
        >
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          value={open ? query : value?.label ?? ""}
          placeholder="Procura a tua profissão ou atividade…"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => {
            calcPos();
            setOpen(true);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          className="w-full bg-transparent py-3 text-sm text-stone-800 placeholder-stone-400 focus:outline-none dark:text-stone-200"
        />
      </div>
      {mounted && dropdown && createPortal(dropdown, document.body)}
    </div>
  );
}
