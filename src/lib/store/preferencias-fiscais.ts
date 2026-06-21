"use client";

import { useState, useEffect, useCallback } from "react";
import type { TipoAtividade, BaseSS } from "@/lib/fiscal-data";

export interface PreferenciasFiscais {
  anoAtividade: number;
  irsJovemAno: number;
  acumulaEmprego: boolean;
  isencaoSSPrimeiroAno: boolean;
  regimeContabilidade: "simplificado" | "organizada";
  conjunta: boolean;
  dependentes: number;
  despSaude: number;
  despEducacao: number;
  despGerais: number;
  despRendas: number;
  despesasJustificadas: number;
  deficiencia: boolean;
  ifici: boolean;
}

const DEFAULTS: PreferenciasFiscais = {
  anoAtividade: 3,
  irsJovemAno: 0,
  acumulaEmprego: false,
  isencaoSSPrimeiroAno: false,
  regimeContabilidade: "simplificado",
  conjunta: false,
  dependentes: 0,
  despSaude: 0,
  despEducacao: 0,
  despGerais: 0,
  despRendas: 0,
  despesasJustificadas: 0,
  deficiencia: false,
  ifici: false,
};

const STORAGE_KEY = "recibocerto:preferencias-fiscais:v1";

function ler(): PreferenciasFiscais {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function gravar(prefs: PreferenciasFiscais): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function usePreferenciasFiscais() {
  const [prefs, setPrefs] = useState<PreferenciasFiscais>(DEFAULTS);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    setPrefs(ler());
    setCarregado(true);
  }, []);

  const atualizar = useCallback((patch: Partial<PreferenciasFiscais>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      gravar(next);
      return next;
    });
  }, []);

  return { prefs, atualizar, carregado };
}

export function lerPreferenciasFiscais(): PreferenciasFiscais {
  return ler();
}
