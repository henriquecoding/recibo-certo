"use client";

// ─────────────────────────────────────────────────────────────────────
//  Perfil do utilizador — Independente (Categoria B) vs. Por conta de
//  outrem (Categoria A). É a escolha que ramifica toda a experiência
//  (hero, onboarding, calculadora da homepage). Persiste em localStorage
//  para não voltar a perguntar. Sem sessão, sem telemetria.
// ─────────────────────────────────────────────────────────────────────

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export type Perfil = "independente" | "dependente";

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

  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(STORAGE_KEY);
      if (guardado === "independente" || guardado === "dependente") setPerfil(guardado);
    } catch {
      /* ignora */
    }
    setCarregado(true);
  }, []);

  const definir = useCallback((p: Perfil) => {
    setPerfil(p);
    try {
      window.localStorage.setItem(STORAGE_KEY, p);
    } catch {
      /* ignora */
    }
  }, []);

  const alternar = useCallback(() => {
    definir(perfil === "independente" ? "dependente" : "independente");
  }, [perfil, definir]);

  return <Ctx.Provider value={{ perfil, carregado, definir, alternar }}>{children}</Ctx.Provider>;
}

export function usePerfil(): PerfilContexto {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePerfil tem de ser usado dentro de <PerfilProvider>.");
  return ctx;
}
