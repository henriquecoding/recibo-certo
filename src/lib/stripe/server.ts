import Stripe from "stripe";

let instancia: Stripe | null = null;

export function getStripe(): Stripe {
  if (instancia) return instancia;

  const chave = process.env.STRIPE_SECRET_KEY;
  if (!chave) {
    throw new Error("STRIPE_SECRET_KEY não definida.");
  }

  instancia = new Stripe(chave, { apiVersion: "2026-05-27.dahlia" });
  return instancia;
}

export function stripeConfigurado(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
