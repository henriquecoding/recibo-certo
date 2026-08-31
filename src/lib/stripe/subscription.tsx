"use client";

import {
  Suspense,
  createContext,
  lazy,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/supabase/auth";
import { planoTem, type Entitlement, type Plano } from "@/lib/entitlements";
import type { OrigemConcessao } from "@/lib/stripe/precos-autorizados";

export type Modalidade = "mensal" | "vitalicio";
export type StatusSubscricao =
  | "active" | "trialing" | "past_due" | "canceled" | "incomplete"
  | "incomplete_expired" | "unpaid" | "paused" | null;

export interface SubscricaoContexto {
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

export interface EntitlementsResponse {
  plano: Plano;
  status: StatusSubscricao;
  intervalo: "monthly" | "annual" | null;
  origem: OrigemConcessao | null;
  vitalicio: boolean;
  periodoGracaTerminaEm: string | null;
  temClienteStripe: boolean;
}

export const SubscricaoCtx = createContext<SubscricaoContexto | null>(null);

const podeFree = (permissao: Entitlement) => planoTem("free", permissao);
const checkoutSemSessao = async () => ({
  erro: "Inicia sessão para escolher o Plus.",
  esgotado: false,
});
const portalSemSessao = async () => {};
const ignorar = () => {};

function contextoFree(carregado: boolean): SubscricaoContexto {
  return {
    plano: "free",
    status: null,
    intervalo: null,
    origem: null,
    vitalicio: false,
    periodoGracaTerminaEm: null,
    temClienteStripe: false,
    carregado,
    pode: podeFree,
    abrirCheckout: checkoutSemSessao,
    abrirPortal: portalSemSessao,
    revalidar: ignorar,
  };
}

// Reconciliação, Stripe e entitlements só entram depois de uma sessão real.
// O visitante anónimo recebe o contrato Free completo sem baixar o runtime.
const SubscricaoAutenticada = lazy(() => import("./subscription-runtime"));

export function SubscricaoProvider({ children }: { children: ReactNode }) {
  const { user, carregado } = useAuth();
  const free = useMemo(() => contextoFree(carregado), [carregado]);
  const fallback = (
    <SubscricaoCtx.Provider value={free}>
      {children}
    </SubscricaoCtx.Provider>
  );

  if (!user) return fallback;
  return (
    <Suspense fallback={fallback}>
      <SubscricaoAutenticada>{children}</SubscricaoAutenticada>
    </Suspense>
  );
}

export function useSubscricao(): SubscricaoContexto {
  const context = useContext(SubscricaoCtx);
  if (!context) throw new Error("useSubscricao tem de estar dentro de <SubscricaoProvider>.");
  return context;
}
