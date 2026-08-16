import "server-only";

// ═══════════════════════════════════════════════════════════════════════
//  STRIPE CONNECT — o contabilista como comerciante
//  ---------------------------------------------------------------------
//  Cobranças DIRETAS (`direct charges`). A escolha não é técnica, é a que
//  mantém verdadeira a frase que o produto sempre disse: **o cliente paga
//  ao contabilista**.
//
//    · a cobrança nasce na conta DELE (cabeçalho `Stripe-Account`);
//    · é o nome dele no extrato do cartão do cliente, e o recibo é dele;
//    · o dinheiro vai direto para o saldo dele — nunca entra no do
//      Recibo Certo;
//    · a comissão sai como `application_fee_amount`, encaminhada pela
//      Stripe para a plataforma.
//
//  A alternativa (destination charges) fazia o dinheiro passar pelo saldo
//  da plataforma antes de chegar ao contabilista. É precisamente essa
//  passagem que `progressao/fronteiras.ts` explica não ser a mesma
//  atividade — e é por isso que não é o que está aqui.
// ═══════════════════════════════════════════════════════════════════════

import type Stripe from "stripe";
import { getStripe } from "./server";
import { appUrl } from "@/lib/origem";

/** O país das contas. Portugal é o único mercado, e dizê-lo evita adivinhar. */
export const PAIS_CONNECT = "PT";
export const MOEDA = "eur";

export interface EstadoConta {
  stripeAccountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requisitos: string[];
}

/**
 * Cria a conta Connect de um contabilista.
 *
 * `controller` em vez do `type: "express"` de outros tempos: a Stripe
 * passou a descrever o que a plataforma controla em vez de vender três
 * tipos com nomes. O que aqui se declara:
 *
 *  · `losses.payments: "application"` — a plataforma assume os
 *    estornos. É o que permite `application_fee` em cobranças diretas.
 *  · `fees.payer: "application"` — as taxas da Stripe são debitadas à
 *    plataforma, não ao contabilista. Ele recebe o valor limpo do que
 *    combinou com o cliente, menos a nossa comissão.
 *  · `stripe_dashboard.type: "express"` — ele tem um painel Stripe para
 *    ver os pagamentos e mudar o IBAN sem nos pedir nada.
 */
export async function criarContaConnect(params: {
  email: string | null;
  nome: string;
  contabilistaId: string;
}): Promise<Stripe.Account> {
  return getStripe().accounts.create({
    country: PAIS_CONNECT,
    email: params.email ?? undefined,
    default_currency: MOEDA,
    business_type: "individual",
    controller: {
      losses: { payments: "application" },
      fees: { payer: "application" },
      stripe_dashboard: { type: "express" },
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_profile: {
      name: params.nome,
      // MCC 8931 — «Accounting, Auditing and Bookkeeping Services».
      mcc: "8931",
      url: `${appUrl()}/contabilistas`,
    },
    metadata: {
      app: "recibo-certo",
      contabilista_id: params.contabilistaId,
    },
  });
}

/**
 * O link de onboarding.
 *
 * Expira em minutos por desenho da Stripe — por isso é gerado a cada
 * pedido e nunca guardado. Um link guardado é um link morto.
 */
export async function linkDeOnboarding(
  stripeAccountId: string,
): Promise<string> {
  const link = await getStripe().accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${appUrl()}/contabilista/pagamentos?estado=recomecar`,
    return_url: `${appUrl()}/contabilista/pagamentos?estado=voltou`,
    type: "account_onboarding",
  });
  return link.url;
}

/** O painel Stripe do contabilista — pagamentos, IBAN, documentos. */
export async function linkDoPainelStripe(stripeAccountId: string): Promise<string> {
  const link = await getStripe().accounts.createLoginLink(stripeAccountId);
  return link.url;
}

export function lerEstadoDaConta(conta: Stripe.Account): EstadoConta {
  return {
    stripeAccountId: conta.id,
    chargesEnabled: Boolean(conta.charges_enabled),
    payoutsEnabled: Boolean(conta.payouts_enabled),
    detailsSubmitted: Boolean(conta.details_submitted),
    // `currently_due` é o que falta AGORA. `eventually_due` assusta sem
    // acionar: pede coisas que a Stripe ainda não exige.
    requisitos: conta.requirements?.currently_due ?? [],
  };
}

/**
 * Checkout de uma consulta, na conta do contabilista.
 *
 * Três coisas que fazem disto uma cobrança direta e não outra coisa:
 *
 *  1. `{ stripeAccount }` no segundo argumento — o pedido é FEITO NA conta
 *     dele. Sem isto a sessão nascia na plataforma e o modelo era outro.
 *  2. `application_fee_amount` — a comissão, calculada pelo servidor a
 *     partir do patamar. Nunca vem do browser.
 *  3. `price_data` inline em vez de um `price` do catálogo: cada consulta
 *     tem o seu valor, e criar um preço na Stripe por consulta encheria o
 *     catálogo de lixo.
 */
export async function checkoutDaConsulta(params: {
  stripeAccountId: string;
  pagamentoId: string;
  liquidoCents: number;
  comissaoCents: number;
  descricao: string;
  nomeContabilista: string;
}): Promise<Stripe.Checkout.Session> {
  return getStripe().checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: MOEDA,
            unit_amount: params.liquidoCents,
            product_data: {
              name: params.descricao,
              description: `Serviço de ${params.nomeContabilista}`,
            },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: params.comissaoCents,
        description: `${params.descricao} — ${params.nomeContabilista}`,
        metadata: {
          app: "recibo-certo",
          tipo: "consulta",
          pagamento_id: params.pagamentoId,
        },
      },
      // O `pagamento_id` viaja nos metadados da SESSÃO e do INTENT. O
      // webhook chega por qualquer um dos dois, e depender de um só era
      // depender do evento que a Stripe decidir mandar primeiro.
      metadata: {
        app: "recibo-certo",
        tipo: "consulta",
        pagamento_id: params.pagamentoId,
      },
      success_url: `${appUrl()}/dashboard/contabilista?pagamento=feito`,
      cancel_url: `${appUrl()}/dashboard/contabilista?pagamento=cancelado`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    },
    { stripeAccount: params.stripeAccountId },
  );
}

/**
 * Checkout do desbloqueio de patamar.
 *
 * Este NÃO é Connect: o serviço é da plataforma, o comerciante é a
 * plataforma, e o dinheiro é mesmo dela. É a única cobrança do painel de
 * contabilistas onde isso é verdade.
 */
export async function checkoutDoDesbloqueio(params: {
  compraId: string;
  contabilistaId: string;
  patamar: number;
  precoFinalCents: number;
  descontoPct: number;
  email?: string | null;
}): Promise<Stripe.Checkout.Session> {
  const titulo = `Patamar ${params.patamar} — comissão reduzida`;
  return getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: MOEDA,
          unit_amount: params.precoFinalCents,
          product_data: {
            name: titulo,
            description:
              params.descontoPct > 0
                ? `Desbloqueio imediato, com ${params.descontoPct}% de desconto por créditos de fidelidade.`
                : "Desbloqueio imediato do próximo patamar de comissão.",
          },
        },
      },
    ],
    customer_email: params.email ?? undefined,
    metadata: {
      app: "recibo-certo",
      tipo: "desbloqueio_patamar",
      compra_id: params.compraId,
      contabilista_id: params.contabilistaId,
    },
    payment_intent_data: {
      metadata: {
        app: "recibo-certo",
        tipo: "desbloqueio_patamar",
        compra_id: params.compraId,
      },
    },
    success_url: `${appUrl()}/contabilista/progressao?desbloqueio=feito`,
    cancel_url: `${appUrl()}/contabilista/progressao?desbloqueio=cancelado`,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
  });
}
