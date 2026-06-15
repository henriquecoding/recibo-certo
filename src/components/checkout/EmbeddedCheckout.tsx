"use client";

// Checkout embebido com Stripe Payment Elements
//
// Renderiza o formulário de pagamento directamente na página de upgrade,
// sem redirect para o checkout hosted. Suporta MB WAY com confirmação push
// em 3 minutos — o método preferido por 45% dos utilizadores portugueses.
//
// Fluxo:
//   1. Obtém client_secret via POST /api/stripe/payment-intent
//   2. Renderiza <PaymentElement> da Stripe
//   3. Utilizador confirma no telemóvel
//   4. Webhook Stripe → activa acesso Pro

import { useEffect, useState, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useAuth } from "@/lib/supabase/auth";
import { Spinner } from "@/components/ui/Icons";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
);

// Stripe appearance API — alinhado com o design system do ReciboCerto
const APPEARANCE = {
  theme: "stripe" as const,
  variables: {
    colorPrimary:       "#1D9E75",
    colorBackground:    "#ffffff",
    colorText:          "#1A1A17",
    colorDanger:        "#97553C",
    fontFamily:         "var(--font-dm-sans), system-ui, sans-serif",
    fontSizeBase:       "14px",
    spacingUnit:        "4px",
    borderRadius:       "12px",
    focusBoxShadow:     "0 0 0 2px rgba(29,158,117,0.25)",
  },
  rules: {
    ".Input": {
      border: "1px solid #E7E5E4",
      boxShadow: "none",
    },
    ".Input:focus": {
      border: "1px solid #1D9E75",
    },
    ".Label": {
      fontWeight: "500",
      color: "#78716C",
    },
  },
};

// ── Formulário interno (precisa do contexto Elements) ───────────────────────

function FormularioPagamento({
  onSucesso,
}: {
  onSucesso: () => void;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!stripe || !elements) return;

    setLoading(true);
    setErro(null);

    const { error } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard?plano=ativo`,
      },
      redirect: "if_required",
    });

    if (error) {
      setErro(error.message ?? "Ocorreu um erro no pagamento.");
      setLoading(false);
    } else {
      onSucesso();
    }
  }, [stripe, elements, onSucesso]);

  return (
    <div className="space-y-4">
      <PaymentElement
        options={{
          layout: { type: "tabs", defaultCollapsed: false },
          // Mostrar MB WAY no topo para utilizadores portugueses
          paymentMethodOrder: ["mb_way", "card"],
          fields: { billingDetails: "never" },
        }}
      />

      {erro && (
        <p className="rounded-2xl bg-clay-bg px-4 py-3 text-sm text-clay-text">
          {erro}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!stripe || loading}
        className="btn-shine w-full rounded-2xl bg-brand py-3 text-sm font-semibold text-white shadow-glow transition-shadow hover:shadow-float disabled:opacity-50"
      >
        {loading ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Spinner size={16} className="animate-spin" />
            A processar…
          </span>
        ) : (
          "Confirmar pagamento"
        )}
      </button>

      <p className="text-center text-xs text-stone-400">
        MB WAY: recebes uma notificação push no telemóvel para confirmar.
        Tens <strong className="text-stone-600">3 minutos</strong>.
      </p>
    </div>
  );
}

// ── Componente exportado ─────────────────────────────────────────────────────

interface EmbeddedCheckoutProps {
  onSucesso?: () => void;
}

export default function EmbeddedCheckout({ onSucesso }: EmbeddedCheckoutProps) {
  const { user } = useAuth();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Obtém token de auth do Supabase
    import("@/lib/supabase/client").then(async ({ getSupabase }) => {
      const { data } = await getSupabase().auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;

      const res = await fetch("/api/stripe/payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const json = (await res.json()) as { clientSecret?: string; erro?: string };
      if (json.clientSecret) {
        setClientSecret(json.clientSecret);
      } else {
        setErro(json.erro ?? "Não foi possível iniciar o checkout.");
      }
    });
  }, [user]);

  const handleSucesso = useCallback(() => {
    setSucesso(true);
    onSucesso?.();
  }, [onSucesso]);

  if (sucesso) {
    return (
      <div className="rounded-3xl border border-brand/20 bg-brand-light p-6 text-center dark:bg-brand/10">
        <p className="text-sm font-semibold text-brand-dark dark:text-brand-mint">
          Pagamento confirmado! Bem-vindo ao Pro.
        </p>
        <p className="mt-1 text-xs text-stone-500">
          A actualizar o teu acesso…
        </p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="rounded-3xl border border-clay-border bg-clay-bg p-5 text-sm text-clay-text">
        {erro}
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size={20} className="animate-spin text-brand" />
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: APPEARANCE,
        locale: "pt",
      }}
    >
      <FormularioPagamento onSucesso={handleSucesso} />
    </Elements>
  );
}
