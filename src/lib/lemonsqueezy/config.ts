import "server-only";

// Configuração do Lemon Squeezy (Merchant of Record)
//
// A Lemon Squeezy é a entidade legal vendedora (MoR). Toda a gestão de IVA
// global, cumprimento fiscal em 200+ jurisdições e emissão de faturas para os
// clientes finais é da responsabilidade da LS — não do developer.
//
// Resultado: 1 única fatura mensal (payout) em vez de 1 por cada venda.

import { appUrl } from "@/lib/origem";

// RC-CFG-001: origem normalizada, para o retorno do checkout coincidir com o
// host que o site serve.
const APP_URL = appUrl();

export const LS_CONFIG = {
  storeId:        process.env.LS_STORE_ID        ?? "",
  variantMonthly: process.env.LS_VARIANT_MONTHLY ?? "",
  variantAnnual:  process.env.LS_VARIANT_ANNUAL  ?? "",

  // Botão com a cor da marca Recibo Certo
  checkoutButtonColor: "#177E5E",

  successUrl: `${APP_URL}/dashboard?plano=ativo`,
  cancelUrl:  `${APP_URL}/dashboard/upgrade`,
  portalReturnUrl: `${APP_URL}/dashboard/conta`,
} as const;

export type PlanoIntervalo = "monthly" | "annual";

export function variantIdParaIntervalo(intervalo: PlanoIntervalo): string {
  return intervalo === "annual" ? LS_CONFIG.variantAnnual : LS_CONFIG.variantMonthly;
}
