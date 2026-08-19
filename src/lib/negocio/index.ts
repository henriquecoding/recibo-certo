// ═══════════════════════════════════════════════════════════════════════
//  A PORTA DO DOMÍNIO DE NEGÓCIO
//  ---------------------------------------------------------------------
//  Importar daqui não corre asserção nenhuma — porque este diretório NÃO
//  TEM DADOS PRÓPRIOS. Não há taxas, não há preçários, não há nada que
//  possa envelhecer em silêncio: tudo o que é número vem de
//  `fiscal-data.ts` e de `pricing/regras.ts`, através dos motores que já
//  os validam ao serem importados.
//
//  É essa a prova de que a camada é mesmo um orquestrador. Se um dia
//  aparecer aqui uma constante com um `%`, é porque alguém duplicou uma
//  fonte de verdade — e o teste `negocio-invariantes` reprova-o.
// ═══════════════════════════════════════════════════════════════════════

export * from "./tipos";

export { agregar, overheadMensal, custoTrabalhadoresMensal, custosOperacionaisAnuais, contaParaONegocio, type AgregadoNegocio } from "./agregar";

export {
  calcularOferta,
  capacidadeDe,
  capacidadeDerivada,
  cenariosDeVolume,
  horasConsumidas,
  unidadeDe,
  volumeDerivado,
} from "./ofertas";

export {
  diagnosticarCapacidade,
  gargaloDeHoras,
  LIMIAR_APERTADO,
} from "./capacidade";

export {
  analisarNegocio,
  calcularBreakEvenNegocio,
  confiancaDe,
  diagnosticarConcentracao,
  EXPLICACAO_CONFIANCA,
  ROTULO_CONFIANCA,
  type OpcoesAnalise,
} from "./viabilidade";

export { analisarSensibilidade, margemDeSeguranca, CHOQUES } from "./sensibilidade";
export { projetarCaixa, PROJECAO_NAO_E_SALDO } from "./caixa";
export { levantarPressupostos, confirmados } from "./pressupostos";

export {
  detetarDuplicacoes,
  manterNaOferta,
  mesmaDespesa,
  moverParaEstrutura,
  normalizarRotulo,
} from "./duplicacao";

export { entradaEmpresa, paraEmpresa, sociedadeValeAPena, type EntradaEmpresa } from "./adapters/empresa";
export {
  atividadeDominante,
  atividadeLabelDominante,
  entradaComparacao,
  paraComparacao,
  type EntradaComparacao,
} from "./adapters/comparar";
export {
  ambitoClientes,
  formaJuridicaDe,
  paraDiagnosticoContabilista,
  resumoParaContabilista,
  type CampoPartilha,
} from "./adapters/contabilista";
export { paraFiz, passosAntesDaFiz, simuladorFizDe, type ValoresFizNegocio } from "./adapters/fiz";
export { confiancaParaRouting, sinaisDoNegocio, type OpcoesSinais } from "./adapters/routing";

export {
  contextoNegocioVazio,
  novaOferta,
  novoCustoEstrutura,
  novoInvestimento,
  novoTrabalhador,
  uid,
} from "./fabrica";
