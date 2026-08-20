import type { ResultadoPreco } from "@/lib/pricing";
import type { MarketEconomicAssessment } from "./tipos";

export const MARKET_PRICING_ADAPTER_VERSION = "pricing-market-adapter@1";

/**
 * Traduz o resultado do motor canónico para o gate de mercado. Não existe
 * qualquer fórmula de preço aqui: só condições observáveis no resultado.
 */
export function assessMarketEconomics(result: ResultadoPreco | null): MarketEconomicAssessment {
  if (!result) {
    return {
      viable: null,
      engine: "pricing",
      formulaVersion: MARKET_PRICING_ADAPTER_VERSION,
      reasons: ["Falta concluir um cenário no motor de preço."],
    };
  }
  const reasons: string[] = [];
  if (!result.ok) reasons.push(result.motivoTexto ?? "O motor não encontrou um preço executável.");
  if (result.margem.contribuicaoUnidade <= 0) reasons.push("A margem de contribuição não é positiva.");
  if (result.margem.lucroUnidade <= 0) reasons.push("O lucro operacional por unidade não é positivo.");
  if (!result.breakEven.possivel) reasons.push("O ponto de equilíbrio não é atingível neste cenário.");
  const viable = result.ok && reasons.length === 0;
  return {
    viable,
    engine: "pricing",
    formulaVersion: MARKET_PRICING_ADAPTER_VERSION,
    reasons: viable ? ["Preço, contribuição, lucro e break-even atravessaram o motor canónico."] : reasons,
    priceNet: result.precoLiquido,
    contributionPerUnit: result.margem.contribuicaoUnidade,
    profitPerUnit: result.margem.lucroUnidade,
    breakEvenUnits: result.breakEven.unidades,
  };
}
