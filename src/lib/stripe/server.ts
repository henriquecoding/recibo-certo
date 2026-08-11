import "server-only";
import Stripe from "stripe";

let instancia: Stripe | null = null;

export function getStripe(): Stripe {
  if (instancia) return instancia;

  const chave = process.env.STRIPE_SECRET_KEY;
  if (!chave) {
    throw new Error("STRIPE_SECRET_KEY não definida.");
  }

  // A versão da API acompanha o SDK: os tipos, a serialização do pedido e a
  // leitura da resposta são todos gerados para ela, e apontar o SDK a uma
  // versão diferente da que ele descreve é o desalinhamento a sério. Ambas são
  // do comboio `dahlia`, que é o sinal da Stripe para compatibilidade.
  // Ao subir o SDK, subir também isto — o compilador avisa se ficar para trás.
  instancia = new Stripe(chave, { apiVersion: "2026-07-29.dahlia" });
  return instancia;
}

export function stripeConfigurado(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
