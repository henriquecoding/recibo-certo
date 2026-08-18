// ═══════════════════════════════════════════════════════════════════════
//  A PORTA DA PRICING ENGINE
//  ---------------------------------------------------------------------
//  Importar daqui corre `assertRegrasPricing()` uma vez — o mesmo contrato
//  de `fiscal-data.ts` e de `ferramentas/index.ts`: se os pressupostos de
//  mercado ficarem inconsistentes ou caducarem, o build falha em vez de
//  servir preços calculados com um preçário de há dois anos.
// ═══════════════════════════════════════════════════════════════════════

import { assertRegrasPricing } from "./regras";

assertRegrasPricing();

export * from "./tipos";
export { precificar, FOLGA_CONFORTAVEL_PADRAO } from "./motor";
export {
  CANAIS_COMISSAO,
  METODOS_PAGAMENTO,
  TAXA_FATURAVEL_PADRAO,
  PRECO_AO_CONSUMIDOR,
  PRECO_UNIDADE_MEDIDA,
  REDUCAO_PRECO_30_DIAS,
  LIVRE_RESOLUCAO,
  VENDAS_DISTANCIA_UE,
  REVISAO_PRICING,
  canalPorId,
  pagamentoPorId,
  validarRegrasPricing,
  assertRegrasPricing,
  type CanalComissao,
  type MetodoPagamento,
  type RegraPricing,
} from "./regras";

export {
  CENARIOS_INICIAIS_DEF,
  cenarioPorChave,
  cenarioDeQuery,
  contextoBase,
  type DefinicaoCenarioInicial,
  type CampoPergunta,
  type BlocoAvancado,
} from "./perguntas";

export { CENARIOS, compararCenarios, correrCenario } from "./motores/cenarios";
export { precoParaGanhar, unidadesParaGanhar, resultadoAoPreco } from "./motores/objetivo";
export { margemDeMarkup, markupDeMargem } from "./motores/margem";
export { calcularTempo, capacidadeMensal, valorHoraImplicito } from "./motores/tempo";
export { situacaoIVAPreco, custoRelevante, taxaDe, pvpDe, liquidoDe } from "./motores/iva";
export { fracoesFiscais, fracaoRetencao } from "./motores/fiscal-ti";
export {
  precoPorMargem,
  precoPorMarkup,
  precoPorLucroUnidade,
  lucroAoPreco,
  custosVariaveisAoPreco,
  fracaoDisponivel,
  type EntradaSolver,
} from "./motores/preco";
