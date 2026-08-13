import "server-only";
import type Stripe from "stripe";
import { PLUS } from "@/lib/entitlements";
import { getStripe } from "@/lib/stripe/server";
import { precosLegados } from "@/lib/stripe/precos-autorizados";
import { supabaseAdmin } from "@/lib/supabase/server-admin";

export type ModalidadeCheckout = "mensal" | "vitalicio";

const LOOKUP_KEY: Record<ModalidadeCheckout, string> = {
  mensal: "recibocerto_plus_monthly",
  vitalicio: "recibocerto_plus_lifetime",
};

const cache = new Map<string, { expires: number; value: Promise<Stripe.Price> }>();
const inspectionCache = new Map<
  string,
  {
    expires: number;
    value: Promise<{
      price: Stripe.Price;
      recognized: boolean;
      modalidade: "monthly" | "lifetime" | "legacy";
    }>;
  }
>();

function envPrice(modalidade: ModalidadeCheckout): string | null {
  const value = modalidade === "mensal"
    ? process.env.STRIPE_PRICE_PLUS_MONTHLY
    : process.env.STRIPE_PRICE_PLUS_LIFETIME;
  return value?.match(/^price_[A-Za-z0-9]+$/) ? value : null;
}

function expectedAmount(modalidade: ModalidadeCheckout): number {
  return Math.round((modalidade === "mensal" ? PLUS.precoMensal : PLUS.precoVitalicio) * 100);
}

async function productOf(price: Stripe.Price): Promise<Stripe.Product> {
  const stripe = getStripe();
  const product = typeof price.product === "string"
    ? await stripe.products.retrieve(price.product)
    : price.product;
  if ("deleted" in product && product.deleted) throw new Error("O produto Stripe foi apagado.");
  return product as Stripe.Product;
}

function sameEnvironment(livemode: boolean): boolean {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (key.startsWith("sk_live_") || key.startsWith("rk_live_")) return livemode;
  if (key.startsWith("sk_test_") || key.startsWith("rk_test_")) return !livemode;
  return false;
}

async function saveCatalog(params: {
  price: Stripe.Price;
  product: Stripe.Product;
  modalidade: "monthly" | "lifetime" | "legacy";
  concede: boolean;
}): Promise<void> {
  const sb = supabaseAdmin();
  if (!sb) throw new Error("SUPABASE_SERVICE_ROLE_KEY não definida.");
  const { price, product, modalidade, concede } = params;
  const { error } = await sb.from("billing_price_catalog").upsert({
    stripe_price_id: price.id,
    stripe_product_id: product.id,
    modalidade,
    currency: price.currency,
    unit_amount: price.unit_amount,
    recurring_interval: price.recurring?.interval ?? null,
    concede_plus: concede,
    livemode: price.livemode,
    verificado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  }, { onConflict: "stripe_price_id" });
  if (error) throw new Error(`Falha ao registar preço verificado: ${error.message}`);
}

async function inspectPrice(
  priceId: string,
  expected?: ModalidadeCheckout,
): Promise<{ price: Stripe.Price; recognized: boolean; modalidade: "monthly" | "lifetime" | "legacy" }> {
  const key = `${priceId}:${expected ?? "any"}`;
  const hit = inspectionCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;

  const value = (async () => {
    const stripe = getStripe();
    const price = await stripe.prices.retrieve(priceId);
    const product = await productOf(price);
    const legacy = precosLegados().includes(price.id);
    const productOwned = product.metadata?.app === "recibocerto" || product.name === "Recibo Certo Plus";
    const monthly = productOwned
      && price.currency === PLUS.moeda.toLowerCase()
      && price.unit_amount === expectedAmount("mensal")
      && price.tax_behavior === "inclusive"
      && price.recurring?.interval === "month"
      && price.recurring.interval_count === 1
      && (!price.lookup_key || price.lookup_key === LOOKUP_KEY.mensal);
    const lifetime = productOwned
      && price.currency === PLUS.moeda.toLowerCase()
      && price.unit_amount === expectedAmount("vitalicio")
      && price.tax_behavior === "inclusive"
      && !price.recurring
      && (!price.lookup_key || price.lookup_key === LOOKUP_KEY.vitalicio);

    const modalidade: "legacy" | "lifetime" | "monthly" = legacy
      ? "legacy" : lifetime ? "lifetime" : "monthly";
    const intrinsicallyRecognized = sameEnvironment(price.livemode) && (legacy || monthly || lifetime);
    const matchesExpected = expected === "mensal"
      ? monthly
      : expected === "vitalicio"
        ? lifetime
        : legacy || monthly || lifetime;
    const recognized = intrinsicallyRecognized && matchesExpected;
    // O catálogo guarda a validade intrínseca. Um evento com modalidade
    // errada não pode revogar, por efeito lateral, o preço mensal legítimo.
    await saveCatalog({ price, product, modalidade, concede: intrinsicallyRecognized });
    return { price, recognized, modalidade };
  })();

  inspectionCache.set(key, { expires: Date.now() + 10 * 60_000, value });
  try {
    return await value;
  } catch (error) {
    inspectionCache.delete(key);
    throw error;
  }
}

/** Confirma um price_id recebido num evento e atualiza o catálogo fail-closed. */
export async function validarPrecoQueConcedePlus(
  priceId: string,
  expected?: ModalidadeCheckout,
): Promise<boolean> {
  if (!priceId.match(/^price_[A-Za-z0-9]+$/)) return false;
  const result = await inspectPrice(priceId, expected);
  return result.recognized;
}

/** Resolve por variável ou lookup_key, valida montante/moeda/tipo e faz cache. */
export async function resolverPrecoCheckout(modalidade: ModalidadeCheckout): Promise<Stripe.Price> {
  const key = `${modalidade}:${LOOKUP_KEY[modalidade]}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;

  const value = (async () => {
    const stripe = getStripe();
    // A lookup_key é a identidade estável do catálogo; a variável antiga só
    // serve de fallback numa instalação que ainda não a tenha configurado.
    const listed = await stripe.prices.list({
      lookup_keys: [LOOKUP_KEY[modalidade]],
      active: true,
      limit: 2,
    });
    let price = listed.data[0];
    if (listed.data.length !== 1) {
      const configured = envPrice(modalidade);
      if (!configured) {
        throw new Error(`Preço ${LOOKUP_KEY[modalidade]} não encontrado de forma inequívoca.`);
      }
      price = await stripe.prices.retrieve(configured);
    }

    const inspected = await inspectPrice(price.id, modalidade);
    if (!inspected.recognized || !price.active) {
      throw new Error(`O preço ${modalidade} não cumpre o contrato comercial do Plus.`);
    }
    return price;
  })();

  cache.set(key, { expires: Date.now() + 10 * 60_000, value });
  try {
    return await value;
  } catch (error) {
    cache.delete(key);
    throw error;
  }
}

export const STRIPE_INTEGRATION_IDENTIFIER = "recibocerto_web_kqzrmpta";
