"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from "react";
import { useAuth } from "@/lib/supabase/auth";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { planoTem, type Entitlement, type Plano } from "@/lib/entitlements";
import type { OrigemConcessao } from "@/lib/stripe/precos-autorizados";

export type Modalidade = "mensal" | "vitalicio";
type StatusSubscricao =
  | "active" | "trialing" | "past_due" | "canceled" | "incomplete"
  | "incomplete_expired" | "unpaid" | "paused" | null;

interface SubscricaoContexto {
  plano: Plano;
  status: StatusSubscricao;
  intervalo: "monthly" | "annual" | null;
  origem: OrigemConcessao | null;
  vitalicio: boolean;
  periodoGracaTerminaEm: string | null;
  temClienteStripe: boolean;
  carregado: boolean;
  pode: (permissao: Entitlement) => boolean;
  abrirCheckout: (modalidade?: Modalidade) => Promise<{ erro: string; esgotado: boolean } | undefined>;
  abrirPortal: () => Promise<void>;
  revalidar: () => void;
}

interface EntitlementsResponse {
  plano: Plano;
  status: StatusSubscricao;
  intervalo: "monthly" | "annual" | null;
  origem: OrigemConcessao | null;
  vitalicio: boolean;
  periodoGracaTerminaEm: string | null;
  temClienteStripe: boolean;
}

const Ctx = createContext<SubscricaoContexto | null>(null);

async function tokenAtual(): Promise<string | null> {
  if (!supabaseConfigurado()) return null;
  const { getSupabase } = await import("@/lib/supabase/client");
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}

function checkoutSessionId(): string | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("session_id");
  return value?.match(/^cs_(?:live|test)_[A-Za-z0-9]+$/) ? value : null;
}

function clearCheckoutParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete("session_id");
  url.searchParams.delete("plano");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export function SubscricaoProvider({ children }: { children: ReactNode }) {
  const { user, carregado: authCarregado } = useAuth();
  const userId = user?.id;
  const [plano, setPlano] = useState<Plano>("free");
  const [status, setStatus] = useState<StatusSubscricao>(null);
  const [intervalo, setIntervalo] = useState<"monthly" | "annual" | null>(null);
  const [origem, setOrigem] = useState<OrigemConcessao | null>(null);
  const [vitalicio, setVitalicio] = useState(false);
  const [periodoGracaTerminaEm, setPeriodoGracaTerminaEm] = useState<string | null>(null);
  const [temClienteStripe, setTemClienteStripe] = useState(false);
  const [carregado, setCarregado] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const revalidar = useCallback(() => setTentativa((value) => value + 1), []);

  useEffect(() => {
    if (!authCarregado) return;
    if (!userId || !supabaseConfigurado()) {
      setPlano("free");
      setStatus(null);
      setIntervalo(null);
      setOrigem(null);
      setVitalicio(false);
      setPeriodoGracaTerminaEm(null);
      setCarregado(true);
      return;
    }

    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attemptsLeft = checkoutSessionId() ? 6 : 0;
    let reconciled = false;
    const controller = new AbortController();

    const load = async () => {
      try {
        const token = await tokenAtual();
        if (!token || !active) throw new Error("Sessão indisponível.");
        const sessionId = checkoutSessionId();
        if (sessionId && !reconciled) {
          const response = await fetch("/api/stripe/reconcile", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ session_id: sessionId }),
            signal: controller.signal,
          });
          const result = await response.json().catch(() => ({}));
          if (result.reembolsado) {
            reconciled = true;
            clearCheckoutParams();
            window.alert(result.mensagem ?? "O pagamento foi reembolsado automaticamente.");
          } else if (response.status === 202 || result.pendente) {
            // Alguns meios de pagamento confirmam de forma assíncrona. Mantém
            // o identificador para as tentativas seguintes e para um refresh.
          } else if (response.ok) {
            reconciled = true;
            clearCheckoutParams();
          } else {
            throw new Error(result.erro ?? "Não foi possível reconciliar o pagamento.");
          }
        }

        const response = await fetch("/api/entitlements", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Não foi possível confirmar o plano.");
        const result = await response.json() as EntitlementsResponse;
        if (!active) return;
        setPlano(result.plano);
        setStatus(result.status);
        setIntervalo(result.intervalo);
        setOrigem(result.origem);
        setVitalicio(result.vitalicio);
        setPeriodoGracaTerminaEm(result.periodoGracaTerminaEm);
        setTemClienteStripe(Boolean(result.temClienteStripe));
        setCarregado(true);

        if (checkoutSessionId() && result.plano !== "plus" && attemptsLeft > 0) {
          const delay = (7 - attemptsLeft) * 1000;
          attemptsLeft -= 1;
          timer = setTimeout(load, delay);
        }
      } catch (error) {
        if (!active || (error instanceof DOMException && error.name === "AbortError")) return;
        console.error("[entitlements]", error);
        setPlano("free");
        setStatus(null);
        setIntervalo(null);
        setOrigem(null);
        setVitalicio(false);
        setPeriodoGracaTerminaEm(null);
        setTemClienteStripe(false);
        setCarregado(true);
        if (attemptsLeft > 0) {
          const delay = (7 - attemptsLeft) * 1000;
          attemptsLeft -= 1;
          timer = setTimeout(load, delay);
        }
      }
    };

    void load();
    return () => {
      active = false;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [userId, authCarregado, tentativa]);

  useEffect(() => {
    if (!userId || !supabaseConfigurado()) return;
    const onReturn = () => {
      if (document.visibilityState === "visible") revalidar();
    };
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
    return () => {
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
    };
  }, [userId, revalidar]);

  const pode = useCallback((permission: Entitlement) => planoTem(plano, permission), [plano]);

  const abrirCheckout = useCallback(async (modalidade: Modalidade = "mensal") => {
    const token = await tokenAtual();
    if (!token) return { erro: "Inicia sessão para escolher o Plus.", esgotado: false };
    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ modalidade }),
    });
    const result = await response.json().catch(() => ({}));
    if (result.url) {
      window.location.href = result.url;
      return;
    }
    return { erro: result.erro ?? "Não foi possível iniciar o pagamento.", esgotado: Boolean(result.esgotado) };
  }, []);

  const abrirPortal = useCallback(async () => {
    const token = await tokenAtual();
    if (!token) return;
    const response = await fetch("/api/stripe/portal", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json().catch(() => ({}));
    if (result.url) window.location.href = result.url;
  }, []);

  const contextValue = useMemo<SubscricaoContexto>(() => ({
    plano, status, intervalo, origem, vitalicio, periodoGracaTerminaEm,
    temClienteStripe, carregado, pode, abrirCheckout, abrirPortal, revalidar,
  }), [
    plano, status, intervalo, origem, vitalicio, periodoGracaTerminaEm,
    temClienteStripe, carregado, pode, abrirCheckout, abrirPortal, revalidar,
  ]);

  return (
    <Ctx.Provider value={contextValue}>
      {children}
    </Ctx.Provider>
  );
}

export function useSubscricao(): SubscricaoContexto {
  const context = useContext(Ctx);
  if (!context) throw new Error("useSubscricao tem de estar dentro de <SubscricaoProvider>.");
  return context;
}
