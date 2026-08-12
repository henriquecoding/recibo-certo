"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useAuth } from "@/lib/supabase/auth";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { planoTem, type Entitlement, type Plano } from "@/lib/entitlements";
import { concedePlus } from "@/lib/stripe/precos-autorizados";

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
  /**
   * Vai buscar de novo o estado da subscrição.
   *
   * Existe porque a fonte de verdade é o webhook do Stripe, que escreve na
   * tabela `subscriptions` de forma ASSÍNCRONA — e o cliente lia uma vez e
   * mais nada.
   */
  revalidar: () => void;
}

const Ctx = createContext<SubscricaoContexto | null>(null);

async function obterToken(): Promise<string | null> {
  if (!supabaseConfigurado()) return null;
  const { data } = await (await sb()).auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Viemos agora do checkout do Stripe? `checkoutSuccessUrl` é
 * `/dashboard?plano=ativo` — é esse marcador que autoriza as repetições.
 */
function esperaWebhook(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("plano") === "ativo";
}

export function SubscricaoProvider({ children }: { children: ReactNode }) {
  const { user, carregado: authCarregado } = useAuth();
  const [status, setStatus] = useState<StatusSubscricao>(null);
  const [intervalo, setIntervalo] = useState<"monthly" | "annual" | null>(null);
  const [carregado, setCarregado] = useState(false);

  /** Um contador que, ao mudar, força nova leitura. */
  const [tentativa, setTentativa] = useState(0);
  const revalidar = useCallback(() => setTentativa((n) => n + 1), []);

  useEffect(() => {
    if (!authCarregado) return;
    if (!user || !supabaseConfigurado()) {
      setStatus(null);
      setIntervalo(null);
      setCarregado(true);
      return;
    }

    let ativo = true;
    /** Repetições ainda disponíveis para a corrida com o webhook. */
    let porTentar = esperaWebhook() ? 6 : 0;
    let temporizador: ReturnType<typeof setTimeout> | undefined;

    const buscar = () => {
      sb().then((cliente) => {
        if (!ativo) return;
        cliente.from("subscriptions")
          .select("status, intervalo, price_id")
          .eq("user_id", user.id)
          .in("status", ["active", "trialing", "past_due"])
          .order("criado_em", { ascending: false })
          .limit(1)
          .then(({ data }) => {
            if (!ativo) return;
            if (data && data.length > 0) {
              // ⚠️ RC-BILL-002 — o preço decide, não só o estado.
              //
              // Antes bastava existir uma subscrição `active`/`trialing`/
              // `past_due` para o Plus ser concedido: qualquer preço servia,
              // incluindo um de teste, um antigo de outro produto ou um criado
              // à mão no painel. `concedePlus` exige as duas coisas.
              const linha = data[0] as { status: string; intervalo: string; price_id: string | null };
              if (!concedePlus({ status: linha.status, priceId: linha.price_id })) {
                console.warn("[stripe] Subscrição com preço não autorizado — Plus não concedido.");
                setStatus(null);
                setIntervalo(null);
                setCarregado(true);
                return;
              }
              setStatus(linha.status as StatusSubscricao);
              setIntervalo(linha.intervalo as "monthly" | "annual");
              setCarregado(true);
              return;
            }

            setStatus(null);
            setIntervalo(null);
            setCarregado(true);

            // A CORRIDA COM O WEBHOOK.
            //
            // O Stripe reencaminha o browser para `/dashboard?plano=ativo`
            // no instante do pagamento; a linha em `subscriptions` só existe
            // quando o webhook `checkout.session.completed` chegar, o que é
            // assíncrono. Quem pagava via, à sua espera, «Plano Grátis» — e
            // só recarregando à mão é que o Plus aparecia.
            if (porTentar > 0) {
              const espera = (7 - porTentar) * 1000;
              porTentar -= 1;
              temporizador = setTimeout(buscar, espera);
            }
          });
      });
    };

    buscar();
    return () => {
      ativo = false;
      if (temporizador) clearTimeout(temporizador);
    };
  }, [user, authCarregado, tentativa]);

  /**
   * Voltar ao separador revalida.
   *
   * O estado da subscrição muda FORA desta aba: no portal do Stripe, noutro
   * dispositivo, ou por um webhook de renovação falhada. Sem isto, uma aba
   * aberta desde ontem continuava a mostrar o plano de ontem — a conceder
   * Plus a quem já cancelou, ou a negá-lo a quem acabou de pagar.
   */
  useEffect(() => {
    if (!user || !supabaseConfigurado()) return;
    const aoVoltar = () => {
      if (document.visibilityState === "visible") revalidar();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", aoVoltar);
    return () => {
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", aoVoltar);
    };
  }, [user, revalidar]);

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
    <Ctx.Provider value={{ plano, status, intervalo, carregado, pode, abrirCheckout, abrirPortal, revalidar }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSubscricao(): SubscricaoContexto {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSubscricao tem de ser usado dentro de <SubscricaoProvider>.");
  return ctx;
}
