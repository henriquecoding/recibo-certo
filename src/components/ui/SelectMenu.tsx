"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface OpcaoSelectMenu {
  value: string;
  label: string;
}

interface SelectMenuProps {
  id: string;
  value: string;
  options: readonly OpcaoSelectMenu[];
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * Select visual do design system.
 *
 * Não usa o menu nativo de `<select>` porque esse popup é desenhado pelo
 * sistema operativo e, em especial no Edge/Windows, pode ignorar o tema da
 * página (texto claro sobre fundo claro ou uma lista cinzenta sem o desenho
 * do ReciboCerto). A lista continua totalmente navegável por teclado.
 */
export default function SelectMenu({
  id,
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
}: SelectMenuProps) {
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const botaoRef = useRef<HTMLButtonElement | null>(null);
  const opcoesRef = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();

  const indiceSelecionado = Math.max(0, options.findIndex((o) => o.value === value));
  const selecionada = options[indiceSelecionado] ?? options[0];

  useEffect(() => {
    if (!aberto) return;

    const fecharFora = (evento: PointerEvent) => {
      const alvo = evento.target as Node | null;
      if (alvo && !wrapperRef.current?.contains(alvo)) setAberto(false);
    };
    const fecharEscapeGlobal = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        setAberto(false);
        botaoRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", fecharFora);
    document.addEventListener("keydown", fecharEscapeGlobal);
    return () => {
      document.removeEventListener("pointerdown", fecharFora);
      document.removeEventListener("keydown", fecharEscapeGlobal);
    };
  }, [aberto]);

  function focar(indice: number) {
    if (options.length === 0) return;
    const normalizado = (indice + options.length) % options.length;
    setAtivo(normalizado);
    requestAnimationFrame(() => opcoesRef.current[normalizado]?.focus());
  }

  function abrir(indice = indiceSelecionado) {
    setAberto(true);
    setAtivo(indice);
    requestAnimationFrame(() => opcoesRef.current[indice]?.focus());
  }

  function escolher(novoValor: string) {
    onChange(novoValor);
    setAberto(false);
    requestAnimationFrame(() => botaoRef.current?.focus());
  }

  function tecladoDoBotao(evento: React.KeyboardEvent<HTMLButtonElement>) {
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      abrir(indiceSelecionado);
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      abrir(indiceSelecionado);
    } else if (evento.key === "Home") {
      evento.preventDefault();
      abrir(0);
    } else if (evento.key === "End") {
      evento.preventDefault();
      abrir(Math.max(0, options.length - 1));
    }
  }

  function tecladoDaOpcao(evento: React.KeyboardEvent<HTMLButtonElement>, indice: number) {
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      focar(indice + 1);
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      focar(indice - 1);
    } else if (evento.key === "Home") {
      evento.preventDefault();
      focar(0);
    } else if (evento.key === "End") {
      evento.preventDefault();
      focar(options.length - 1);
    } else if (evento.key === "Enter" || evento.key === " ") {
      evento.preventDefault();
      escolher(options[indice]?.value ?? "");
    } else if (evento.key === "Tab") {
      setAberto(false);
    }
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        ref={botaoRef}
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={listboxId}
        onClick={() => {
          if (aberto) setAberto(false);
          else abrir(indiceSelecionado);
        }}
        onKeyDown={tecladoDoBotao}
        className="focus-marca flex min-h-[2.75rem] w-full items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-left text-sm font-medium text-stone-800 shadow-sm transition-[border-color,box-shadow,background-color] hover:border-stone-300 focus:border-brand dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:border-stone-600"
      >
        <span className="min-w-0 truncate">{selecionada?.label ?? ariaLabel}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={`shrink-0 text-stone-400 transition-transform duration-200 ${aberto ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {aberto && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 right-0 top-full z-[90] mt-2 max-h-72 overflow-y-auto overscroll-contain rounded-2xl border border-stone-200 bg-white p-1.5 shadow-float dark:border-stone-700 dark:bg-stone-950"
        >
          {options.map((opcao, indice) => {
            const escolhida = opcao.value === value;
            const focada = indice === ativo;
            return (
              <button
                key={`${opcao.value}:${opcao.label}`}
                ref={(elemento) => { opcoesRef.current[indice] = elemento; }}
                type="button"
                role="option"
                aria-selected={escolhida}
                tabIndex={focada ? 0 : -1}
                onFocus={() => setAtivo(indice)}
                onKeyDown={(evento) => tecladoDaOpcao(evento, indice)}
                onClick={() => escolher(opcao.value)}
                className={`flex min-h-[2.5rem] w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  escolhida
                    ? "bg-brand-light font-semibold text-brand-dark dark:bg-brand/20 dark:text-brand-mint"
                    : "text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
                }`}
              >
                <span className="min-w-0 truncate">{opcao.label}</span>
                {escolhida && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-brand">
                    <path d="M5 12l4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
