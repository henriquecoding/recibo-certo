"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useAuth } from "@/lib/supabase/auth";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { planoTem, type Entitlement, type Plano } from "@/lib/entitlements";

// Cliente Supabase sob procura — mantém o SDK fora do bundle inicial (ver auth.tsx).
async function sb() {
  const { getSupabase } = await import("@/lib/supabase/client");
  return getSupabase();
}

type StatusSubscricao = "active" | "trialing" | "past_due" | "canceled" | "incomplete" | null;

interface SubscricaoContexto {
  /** "plus" substituiu "pro": o Plus unifica o antigo Pro e o Quiz Master. */
  plano: Plano;
  status: StatusSubscricao;
  intervalo: "monthly" | "annual" | null;
  carregado: boolean;
  /** Verificar SEMPRE a permissão, nunca o nome do plano (ponto 11.5).
      Enquanto o estado carrega, `pode` devolve false — os gates tratam o
      carregamento em separado para não piscar conteúdo bloqueado. */
  pode: (permissao: Entitlement) => boolean;
  abrirCheckout: () => Promise<void>;
  abrirPortal: () => Promise<void>;
}

const Ctx = createContext<SubscricaoContexto | null>(null);

async function obterToken(): Promise<string | null> {
  if (!supabaseConfigurado()) return null;
  const { data } = await (await sb()).auth.getSession();
  return data.session?.access_token ?? null;
}

export function SubscricaoProvider({ children }: { children: ReactNode }) {
  const { user, carregado: authCarregado } = useAuth();
  const [status, setStatus] = useState<StatusSubscricao>(null);
  const [intervalo, setIntervalo] = useState<"monthly" | "annual" | null>(null);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    if (!authCarregado) return;
    if (!user || !supabaseConfigurado()) {
      setStatus(null);
      setIntervalo(null);
      setCarregado(true);
      return;
    }

    let ativo = true;
    sb().then((cliente) => {
      if (!ativo) return;
      cliente.from("subscriptions")
        .select("status, intervalo")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing", "past_due"])
        .order("criado_em", { ascending: false })
        .limit(1)
        .then(({ data }) => {
          if (!ativo) return;
          if (data && data.length > 0) {
            setStatus(data[0].status as StatusSubscricao);
            setIntervalo(data[0].intervalo as "monthly" | "annual");
          } else {
            setStatus(null);
            setIntervalo(null);
          }
          setCarregado(true);
        });
    });

    return () => { ativo = false; };
  }, [user, authCarregado]);

  const plano: Plano = status === "active" || status === "trialing" || status === "past_due" ? "plus" : "free";

  const pode = useCallback((permissao: Entitlement) => planoTem(plano, permissao), [plano]);

  const abrirCheckout = useCallback(async () => {
    const token = await obterToken();
    if (!token) return;

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const json = await res.json();
    if (json.url) window.location.href = json.url;
  }, []);

  const abrirPortal = useCallback(async () => {
    const token = await obterToken();
    if (!token) return;

    const res = await fetch("/api/stripe/portal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const json = await res.json();
    if (json.url) window.location.href = json.url;
  }, []);

  return (
    <Ctx.Provider value={{ plano, status, intervalo, carregado, pode, abrirCheckout, abrirPortal }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSubscricao(): SubscricaoContexto {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSubscricao tem de ser usado dentro de <SubscricaoProvider>.");
  return ctx;
}
