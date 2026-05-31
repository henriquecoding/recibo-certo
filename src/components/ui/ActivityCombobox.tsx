"use client";

import { useMemo, useRef, useState, useId } from "react";
import { ATIVIDADES, type Atividade } from "@/lib/fiscal-data";

// Seletor de atividade pesquisável e acessível (combobox + listbox).
// Suporta teclado (setas, Enter, Escape) e rato.
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
  const listId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filtradas = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ATIVIDADES;
    return ATIVIDADES.filter((a) => `${a.label} ${a.grupo}`.toLowerCase().includes(q));
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

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3.5 transition-all focus-within:border-brand focus-within:ring-2 focus-within:ring-brand">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="flex-shrink-0 text-stone-400">
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
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          className="w-full bg-transparent py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none"
        />
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1.5 max-h-72 w-full overflow-auto rounded-xl border border-stone-200 bg-white py-1 shadow-lift"
        >
          {filtradas.length === 0 && <li className="px-3.5 py-2 text-sm text-stone-400">Sem resultados</li>}
          {filtradas.map((a, i) => {
            const selected = value?.label === a.label;
            return (
              <li
                key={a.label}
                role="option"
                aria-selected={selected}
                onMouseDown={(e) => {
                  e.preventDefault();
                  escolher(a);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center justify-between gap-3 px-3.5 py-2 text-sm ${
                  i === active ? "bg-brand-light text-brand-dark" : "text-stone-700"
                }`}
              >
                <span>{a.label}</span>
                <span className="text-[11px] text-stone-400">{a.grupo}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
