"use client";

// ─────────────────────────────────────────────────────────────────────
//  Perfil/modo do utilizador na homepage. Ramifica toda a experiência
//  (hero, calculadora). Quatro modos mutuamente exclusivos:
//   · independente — Categoria B (recibos verdes)
//   · dependente   — Categoria A (por conta de outrem)
//   · empresa      — abertura de sociedade (IRC + dividendos)
//   · comparar     — comparar cenários (A vs B vs Empresa)
//  Persiste em localStorage para não voltar a perguntar. Sem sessão, sem
//  telemetria.
// ─────────────────────────────────────────────────────────────────────

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

export type Perfil = "independente" | "dependente" | "empresa" | "comparar";

const VALIDOS: readonly Perfil[] = ["independente", "dependente", "empresa", "comparar"];

const STORAGE_KEY = "recibocerto:perfil:v1";

interface PerfilContexto {
  perfil: Perfil;
  /** True quando o valor guardado já foi lido (evita flash do default). */
  carregado: boolean;
  definir: (p: Perfil) => void;
  alternar: () => void;
}

const Ctx = createContext<PerfilContexto | null>(null);

export function PerfilProvider({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<Perfil>("independente");
  const [carregado, setCarregado] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    try {
      const q = searchParams.get("modo");
      if (q && (VALIDOS as readonly string[]).includes(q)) {
        setPerfil(q as Perfil);
        window.localStorage.setItem(STORAGE_KEY, q);
      } else if (!carregado) {
        const guardado = window.localStorage.getItem(STORAGE_KEY);
        if (guardado && (VALIDOS as readonly string[]).includes(guardado)) setPerfil(guardado as Perfil);
      }
    } catch {
      /* ignora */
    }
    setCarregado(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const definir = useCallback((p: Perfil) => {
    setPerfil(p);
    try {
      window.localStorage.setItem(STORAGE_KEY, p);
    } catch {
      /* ignora */
    }
  }, []);

  // Alterna entre os dois perfis de "Sou Trabalhador" (atalho do Nav).
  const alternar = useCallback(() => {
    definir(perfil === "dependente" ? "independente" : "dependente");
  }, [perfil, definir]);

  return <Ctx.Provider value={{ perfil, carregado, definir, alternar }}>{children}</Ctx.Provider>;
}

export function usePerfil(): PerfilContexto {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePerfil tem de ser usado dentro de <PerfilProvider>.");
  return ctx;
}
