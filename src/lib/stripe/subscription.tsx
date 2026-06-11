"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useAuth } from "@/lib/supabase/auth";
import { getSupabase, supabaseConfigurado } from "@/lib/supabase/client";

type StatusSubscricao = "active" | "trialing" | "past_due" | "canceled" | "incomplete" | null;

interface SubscricaoContexto {
  plano: "free" | "pro";
  status: StatusSubscricao;
  intervalo: "monthly" | "annual" | null;
  carregado: boolean;
  abrirCheckout: (intervalo?: "monthly" | "annual") => Promise<void>;
  abrirPortal: () => Promise<void>;
}

const Ctx = createContext<SubscricaoContexto | null>(null);

async function obterToken(): Promise<string | null> {
  if (!supabaseConfigurado()) return null;
  const { data } = await getSupabase().auth.getSession();
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
    const sb = getSupabase();
    sb.from("subscriptions")
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

    return () => { ativo = false; };
  }, [user, authCarregado]);

  const plano = status === "active" || status === "trialing" ? "pro" : "free";

  const abrirCheckout = useCallback(async (int: "monthly" | "annual" = "annual") => {
    const token = await obterToken();
    if (!token) return;

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ intervalo: int }),
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
    <Ctx.Provider value={{ plano, status, intervalo, carregado, abrirCheckout, abrirPortal }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSubscricao(): SubscricaoContexto {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSubscricao tem de ser usado dentro de <SubscricaoProvider>.");
  return ctx;
}
