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

export {
  agregar,
  agregarBase,
  overheadMensal,
  custoTrabalhadoresMensal,
  custoTrabalhadoresPrimeiroAnoMensal,
  custosDosPostos,
  custosOperacionaisAnuais,
  contaParaONegocio,
  entradaDoPosto,
  temTrabalhadorValido,
  type AgregadoBase,
  type AgregadoNegocio,
} from "./agregar";

export {
  migrarNegocioV1ParaV2,
  migrarTrabalhadorV1ParaV2,
  precisaMigrar,
  type ContextoNegocioV1,
} from "./migracoes/v1-v2";

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
  capacidadeDaEquipa,
  diagnosticarCapacidade,
  gargaloDeHoras,
  horasProdutivasDoPosto,
  LIMIAR_APERTADO,
  type CapacidadeEquipa,
  type HorasDoPosto,
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
export {
  explicarMes,
  IVA_DEDUTIVEL_NAO_MODELADO,
  projetarCaixa,
  projetarCaixaDoNegocio,
  PROJECAO_NAO_E_SALDO,
  type OpcoesCaixa,
} from "./caixa";
export {
  CALENDARIO_ENTREGAS,
  fluxosDeArranque,
  fluxosDeInvestimento,
  fluxosDeIVA,
  fluxosDePayroll,
  fluxosDeVendas,
  porMes,
  type FluxoCaixa,
  type OpcoesFluxos,
  type TipoFluxo,
} from "./fluxos";
export {
  entidadeDoNegocio,
  periodicidadeIVA,
  regimeDoNegocio,
  situacaoIVADoNegocio,
} from "./adapters/iva";

export {
  LOCALIZACOES_CONHECIDAS,
  localizacaoDeclarada,
  municipioDoNegocio,
  nomeDaLocalizacao,
  parametrosDaLocalizacao,
  regiaoDeclarada,
  regiaoDoNegocio,
} from "./localizacao";
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
  atividadeLabelDominante,
  comparacaoPossivel,
  entradaComparacao,
  extremosDaComparacao,
  naturezaPrincipal,
  paraComparacao,
  portfolioFiscal,
  type EntradaComparacao,
  type EstadoNatureza,
  type PortfolioFiscal,
  type RendimentoPorNatureza,
} from "./adapters/comparar";
export {
  ambitoClientes,
  conteudoPartilhaNegocio,
  formaJuridicaDe,
  paraDiagnosticoContabilista,
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
