"use client";

import { useEffect, useState } from "react";

// Alterna entre tema claro e escuro, persistindo a preferência.
// O estado inicial é aplicado antes da pintura pelo script em layout.tsx.
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const alternar = () => {
    const proximo = !dark;
    setDark(proximo);
    document.documentElement.classList.toggle("dark", proximo);
    try {
      localStorage.setItem("recibocerto:theme", proximo ? "dark" : "light");
    } catch {
      /* ignora indisponibilidade do localStorage */
    }
  };

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={dark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      aria-pressed={montado ? dark : undefined}
      className={`flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition-colors hover:border-stone-300 hover:text-stone-800 ${className}`}
    >
      {/* Mostra o ícone do tema-alvo; só após montar para evitar mismatch. */}
      {montado && dark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
