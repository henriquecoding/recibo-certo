import "server-only";
import { getStripe } from "@/lib/stripe/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import type { UserDoPedido } from "@/lib/supabase/verify-request-user";

async function customerExists(id: string): Promise<boolean> {
  try {
    const customer = await getStripe().customers.retrieve(id);
    return !("deleted" in customer && customer.deleted);
  } catch (error) {
    const stripe = getStripe();
    if (
      error instanceof stripe.errors.StripeInvalidRequestError
      && (error.code === "resource_missing" || error.statusCode === 404)
    ) return false;
    // Uma indisponibilidade temporária não prova que o Customer desapareceu.
    // Propagar o erro evita criar identidades de faturação duplicadas.
    throw error;
  }
}

async function save(userId: string, customerId: string): Promise<void> {
  const sb = supabaseAdmin();
  if (!sb) throw new Error("SUPABASE_SERVICE_ROLE_KEY não definida.");
  const { error } = await sb.from("billing_customers").upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    atualizado_em: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw new Error(`Falha ao associar Customer Stripe: ${error.message}`);
}

export async function customerIdDoUtilizador(userId: string): Promise<string | null> {
  const sb = supabaseAdmin();
  if (!sb) throw new Error("SUPABASE_SERVICE_ROLE_KEY não definida.");
  const { data, error } = await sb.from("billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Falha ao procurar Customer Stripe: ${error.message}`);
  if (data?.stripe_customer_id && await customerExists(data.stripe_customer_id)) {
    return data.stripe_customer_id as string;
  }

  // Compatibilidade com linhas criadas antes de billing_customers.
  const { data: legacy, error: legacyError } = await sb.from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .not("stripe_customer_id", "is", null)
    .order("atualizado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (legacyError) throw new Error(`Falha ao migrar Customer Stripe: ${legacyError.message}`);
  const id = legacy?.stripe_customer_id as string | null | undefined;
  if (id?.match(/^cus_[A-Za-z0-9]+$/) && await customerExists(id)) {
    await save(userId, id);
    return id;
  }
  return null;
}

export async function obterOuCriarCustomer(user: UserDoPedido): Promise<string> {
  const existing = await customerIdDoUtilizador(user.id);
  if (existing) return existing;
  if (!user.email) throw new Error("A conta não tem email para faturação.");

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user.email,
    preferred_locales: ["pt"],
    metadata: { supabase_uid: user.id, app: "recibocerto" },
  }, { idempotencyKey: `recibocerto-customer-${user.id}` });
  await save(user.id, customer.id);
  return customer.id;
}

export async function associarCustomer(userId: string, customerId: string): Promise<void> {
  if (!customerId.match(/^cus_[A-Za-z0-9]+$/)) throw new Error("Customer Stripe inválido.");
  await save(userId, customerId);
}
