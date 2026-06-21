"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { TipoAtividade, BaseSS } from "@/lib/fiscal-data";
import { useAuth } from "@/lib/supabase/auth";
import { useSubscricao } from "@/lib/stripe/subscription";
import { getSupabase, supabaseConfigurado } from "@/lib/supabase/client";

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
  const { user } = useAuth();
  const { plano } = useSubscricao();
  const naNuvem = supabaseConfigurado() && !!user && plano === "pro";
  const [prefs, setPrefs] = useState<PreferenciasFiscais>(DEFAULTS);
  const [carregado, setCarregado] = useState(false);
  const carregouNuvem = useRef(false);

  useEffect(() => {
    let ativo = true;

    if (naNuvem && user && !carregouNuvem.current) {
      (async () => {
        try {
          const { data } = await getSupabase()
            .from("profiles")
            .select("preferencias_fiscais")
            .eq("id", user.id)
            .maybeSingle();
          if (!ativo) return;
          carregouNuvem.current = true;
          if (data?.preferencias_fiscais) {
            const cloud = { ...DEFAULTS, ...(data.preferencias_fiscais as Partial<PreferenciasFiscais>) };
            setPrefs(cloud);
            gravar(cloud);
          } else {
            setPrefs(ler());
          }
        } catch {
          if (!ativo) return;
          setPrefs(ler());
        }
        setCarregado(true);
      })();
    } else {
      setPrefs(ler());
      setCarregado(true);
    }

    return () => { ativo = false; };
  }, [naNuvem, user]);

  const atualizar = useCallback((patch: Partial<PreferenciasFiscais>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      gravar(next);
      if (naNuvem && user) {
        getSupabase()
          .from("profiles")
          .update({ preferencias_fiscais: next })
          .eq("id", user.id)
          .then(() => {});
      }
      return next;
    });
  }, [naNuvem, user]);

  return { prefs, atualizar, carregado };
}

export function lerPreferenciasFiscais(): PreferenciasFiscais {
  return ler();
}
