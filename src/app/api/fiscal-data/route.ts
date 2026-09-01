import { NextResponse } from "next/server";
import {
  FISCAL_YEAR,
  DATA_LAST_REVIEW,
  SOURCES,
  IAS,
  RETENCAO,
  DISPENSA_RETENCAO_LIMITE,
  IVA_ISENCAO_LIMITE,
  IVA_ISENCAO_EXCESSO,
  IVA_TAXAS,
  IVA_CONSTRUCAO_HABITACAO,
  AUTOLIQUIDACAO_CONSTRUCAO,
  SS_TAXA,
  SS_COEFICIENTE,
  SS_BASE_MAX_MENSAL,
  REGIME_SIMPLIFICADO,
  IRS_JOVEM,
  PROGRAMA_REGRESSAR,
  PROGRAMA_REGRESSAR_TETO_CALC,
  ESCALOES_IRS,
  REDUCAO_IRS_REGIOES_AUTONOMAS,
  escaloesIRSDaRegiao,
  DEDUCAO_ESPECIFICA_CATB,
  REGIME_15PCT,
  MINIMO_EXISTENCIA,
  IRC_TAXA_GERAL,
  IRC_TAXA_PME,
  IRC_LIMITE_PME,
  DERRAMA_MAX,
  DIVIDENDOS_TAXA,
  TA_ELETRICA_LIMITE_CUSTO,
  TA_VIATURAS_ELETRICA_ACIMA_LIMITE,
  DLRR_REVOGADA_NOTA,
  IS_TRANSMISSAO_GRATUITA,
  IS_DOACAO_IMOVEL,
  IS_DOACAO_MINIMO_ISENTO,
  PRAZO_MODELO1_MESES,
  MEACAO_FRACAO,
  CONJUGE_QUOTA_MINIMA,
  SELO_RELACOES_ISENTAS,
  LEGITIMA,
  CATEGORIA_F,
  REDUCAO_COEFICIENTE_ANO,
  DEDUCAO_DEPENDENTE,
  DEDUCAO_DEPENDENTE_BEBE,
  DEDUCAO_DEPENDENTE_DEFICIENCIA,
  ABONO_PARA_FALHAS,
  SS_DEPENDENTE,
  SUBSIDIO_REFEICAO,
  AJUDAS_CUSTO,
  HORARIO_SEMANAL_COMPLETO,
  RETENCAO_DEP_ISENCAO,
  RETENCAO_DEP_POR_DEPENDENTE,
  RETENCAO_DEP_REDUCAO_3MAIS,
  RETENCAO_DEP_DEFICIENTE,
  RETENCAO_CONJUGE_DEFICIENTE,
  RETENCAO_UNICO_TITULAR_FRACAO,
  RETENCAO_SUPLEMENTAR_FATOR,
  RETENCAO_TAXA_OPCIONAL,
  DEDUCAO_ESPECIFICA_DEPENDENTE,
  DEDUCAO_DESP_GERAIS,
  DEDUCAO_SAUDE,
  DEDUCAO_EDUCACAO,
  QUOCIENTE_CONJUGAL,
  LIMITE_GLOBAL_DEDUCOES,
  ATIVIDADES,
  type Sourced,
} from "@/lib/fiscal-data";

// Snapshot estático dos parâmetros fiscais — recalculado a cada build.
export const dynamic = "force-static";

function expose<T>(p: Sourced<T>) {
  return {
    value: p.value,
    legalBasis: p.legalBasis,
    lastVerified: p.lastVerified,
    source: SOURCES[p.source],
    note: p.note,
  };
}

export function GET() {
  return NextResponse.json({
    fiscalYear: FISCAL_YEAR,
    lastReview: DATA_LAST_REVIEW,
    disclaimer:
      "Dados informativos. As taxas são alteradas anualmente pelo Orçamento do Estado; confirmar sempre junto da Autoridade Tributária e da Segurança Social.",
    parametros: {
      ias: expose(IAS),
      retencao: {
        art151: expose(RETENCAO.art151),
        outros: expose(RETENCAO.outros),
        vendas: expose(RETENCAO.vendas),
        diretosAutor: expose(RETENCAO.diretosAutor),
      },
      dispensaRetencaoLimite: expose(DISPENSA_RETENCAO_LIMITE),
      iva: {
        isencaoLimite: expose(IVA_ISENCAO_LIMITE),
        isencaoExcesso: expose(IVA_ISENCAO_EXCESSO),
        taxas: {
          continente: expose(IVA_TAXAS.continente),
          madeira: expose(IVA_TAXAS.madeira),
          acores: expose(IVA_TAXAS.acores),
        },
        // Verba 2.42 da lista I — taxa reduzida nas empreitadas de construção
        // ou reabilitação de habitação, em vigor desde 1 de julho de 2026.
        // Os dois limites são derivados (2.º escalão do IMT e 2,5 × RMMG), e é
        // por isso que interessam aqui: quem lê a API não tem como os derivar.
        construcaoHabitacao: {
          taxaPorRegiao: expose(IVA_CONSTRUCAO_HABITACAO.taxaPorRegiao),
          ambito: expose(IVA_CONSTRUCAO_HABITACAO.ambito),
          precoModeradoVenda: expose(IVA_CONSTRUCAO_HABITACAO.precoModeradoVenda),
          rendaModeradaMensal: expose(IVA_CONSTRUCAO_HABITACAO.rendaModeradaMensal),
          rendaModeradaMultiplicadorRMMG: expose(
            IVA_CONSTRUCAO_HABITACAO.rendaModeradaMultiplicadorRMMG
          ),
          limiteIncluiExtras: expose(IVA_CONSTRUCAO_HABITACAO.limiteIncluiExtras),
          iniciativaProcedimentalDe: expose(IVA_CONSTRUCAO_HABITACAO.iniciativaProcedimentalDe),
          iniciativaProcedimentalAte: expose(IVA_CONSTRUCAO_HABITACAO.iniciativaProcedimentalAte),
          exigibilidadeDesde: expose(IVA_CONSTRUCAO_HABITACAO.exigibilidadeDesde),
          produzEfeitosEm: expose(IVA_CONSTRUCAO_HABITACAO.produzEfeitosEm),
          cessaVigenciaEm: expose(IVA_CONSTRUCAO_HABITACAO.cessaVigenciaEm),
          prazoVendaOuPrimeiroArrendamentoMeses: expose(
            IVA_CONSTRUCAO_HABITACAO.prazoVendaOuPrimeiroArrendamentoMeses
          ),
          arrendamentoMinimoMeses: expose(IVA_CONSTRUCAO_HABITACAO.arrendamentoMinimoMeses),
          mencaoNoTituloAquisitivo: expose(IVA_CONSTRUCAO_HABITACAO.mencaoNoTituloAquisitivo),
          regularizacaoAFavorDoEstado: expose(
            IVA_CONSTRUCAO_HABITACAO.regularizacaoAFavorDoEstado
          ),
        },
        // Inversão do sujeito passivo na construção civil (art. 2.º, n.º 1,
        // al. j) CIVA). O alargamento de 1 de julho de 2026 muda quem entrega
        // o imposto, e por isso não é detalhe de copy: é enquadramento.
        autoliquidacaoConstrucao: {
          inverteSujeitoPassivo: expose(AUTOLIQUIDACAO_CONSTRUCAO.inverteSujeitoPassivo),
          mantemDireitoADeducao: expose(AUTOLIQUIDACAO_CONSTRUCAO.mantemDireitoADeducao),
          mencaoNaFatura: expose(AUTOLIQUIDACAO_CONSTRUCAO.mencaoNaFatura),
          alargamentoVerba242: expose(AUTOLIQUIDACAO_CONSTRUCAO.alargamentoVerba242),
          alargamentoProduzEfeitosEm: expose(
            AUTOLIQUIDACAO_CONSTRUCAO.alargamentoProduzEfeitosEm
          ),
          opcaoConjuntaDesde: expose(AUTOLIQUIDACAO_CONSTRUCAO.opcaoConjuntaDesde),
        },
      },
      segurancaSocial: {
        taxa: expose(SS_TAXA),
        coeficienteServicos: expose(SS_COEFICIENTE.servicos),
        coeficienteBens: expose(SS_COEFICIENTE.bens),
        baseMaxMensal: expose(SS_BASE_MAX_MENSAL),
      },
      regimeSimplificado: {
        limite: expose(REGIME_SIMPLIFICADO.limite),
        coefServicos151: expose(REGIME_SIMPLIFICADO.coefServicos151),
        coefOutrosServicos: expose(REGIME_SIMPLIFICADO.coefOutrosServicos),
        coefVendas: expose(REGIME_SIMPLIFICADO.coefVendas),
        coefPropIntelectual: expose(REGIME_SIMPLIFICADO.coefPropIntelectual),
        coefAlojamentoMoradia: expose(REGIME_SIMPLIFICADO.coefAlojamentoMoradia),
        coefAlojamentoContencao: expose(REGIME_SIMPLIFICADO.coefAlojamentoContencao),
        coefTransparencia: expose(REGIME_SIMPLIFICADO.coefTransparencia),
        coefSubsidiosNaoExploracao: expose(REGIME_SIMPLIFICADO.coefSubsidiosNaoExploracao),
        coefSubsidiosExploracao: expose(REGIME_SIMPLIFICADO.coefSubsidiosExploracao),
        reducaoInicioAtividade: expose(REDUCAO_COEFICIENTE_ANO),
      },
      categoriaF: {
        taxaHabitacao: expose(CATEGORIA_F.taxaHabitacao),
        taxaNaoHabitacao: expose(CATEGORIA_F.taxaNaoHabitacao),
        reducaoDuracao: expose(CATEGORIA_F.reducaoDuracao),
      },
      irsJovem: {
        idadeMax: expose(IRS_JOVEM.idadeMax),
        tetoIAS: expose(IRS_JOVEM.tetoIAS),
        isencaoPorAno: expose(IRS_JOVEM.isencaoPorAno),
      },
      programaRegressar: {
        exclusao: expose(PROGRAMA_REGRESSAR.exclusao),
        anos: expose(PROGRAMA_REGRESSAR.anos),
        // Derivado do 2.º limiar do Art. 68.º-A, para onde a norma remete.
        tetoAnual: PROGRAMA_REGRESSAR_TETO_CALC,
      },
      escaloesIRS: expose(ESCALOES_IRS),
      // As regiões autónomas têm taxa própria, e quem consome esta API tem
      // de a poder ver — expor só a nacional era afirmar que só existe uma.
      reducaoIRSRegioesAutonomas: expose(REDUCAO_IRS_REGIOES_AUTONOMAS),
      escaloesIRSPorRegiao: {
        continente: escaloesIRSDaRegiao("continente"),
        madeira: escaloesIRSDaRegiao("madeira"),
        acores: escaloesIRSDaRegiao("acores"),
      },
      deducaoEspecificaCatB: expose(DEDUCAO_ESPECIFICA_CATB),
      regime15Pct: expose(REGIME_15PCT),
      minimoExistencia: expose(MINIMO_EXISTENCIA),
      irc: {
        taxaGeral: expose(IRC_TAXA_GERAL),
        taxaPME: expose(IRC_TAXA_PME),
        limitePME: expose(IRC_LIMITE_PME),
        derramaMax: expose(DERRAMA_MAX),
        dividendos: expose(DIVIDENDOS_TAXA),
        tributacaoAutonomaEletrica: {
          limiteCustoAquisicao: expose(TA_ELETRICA_LIMITE_CUSTO),
          taxaAcimaLimite: expose(TA_VIATURAS_ELETRICA_ACIMA_LIMITE),
        },
        dlrrRevogada: expose(DLRR_REVOGADA_NOTA),
      },
      herancasESucessoes: {
        // Portugal não tem imposto sucessório — as transmissões gratuitas são
        // tributadas em Imposto do Selo; a partilha rege-se pelo Código Civil.
        impostoSeloTransmissaoGratuita: expose(IS_TRANSMISSAO_GRATUITA),
        impostoSeloDoacaoImovel: expose(IS_DOACAO_IMOVEL),
        doacaoMinimoIsento: expose(IS_DOACAO_MINIMO_ISENTO),
        prazoModelo1Meses: expose(PRAZO_MODELO1_MESES),
        meacaoFracao: expose(MEACAO_FRACAO),
        conjugeQuotaMinima: expose(CONJUGE_QUOTA_MINIMA),
        relacoesIsentasSelo: SELO_RELACOES_ISENTAS,
        legitima: LEGITIMA,
      },
      // Trabalho dependente (categoria A) — retenção na fonte e bases do
      // recibo de vencimento. As parcelas de incapacidade são as do n.º 5 do
      // Despacho 233-A/2026, com o fator do n.º 6: quem consome esta API tem
      // de as ver, não só a dedução à coleta que existe no apuramento anual.
      trabalhoDependente: {
        ssTrabalhador: expose(SS_DEPENDENTE.trabalhador),
        ssEntidade: expose(SS_DEPENDENTE.entidade),
        ssEntidadeIpss: expose(SS_DEPENDENTE.ipss),
        horarioSemanalCompleto: expose(HORARIO_SEMANAL_COMPLETO),
        subsidioRefeicaoDinheiro: expose(SUBSIDIO_REFEICAO.dinheiro),
        subsidioRefeicaoCartao: expose(SUBSIDIO_REFEICAO.cartao),
        ajudasCustoNacional: expose(AJUDAS_CUSTO.nacionalDia),
        ajudasCustoEstrangeiro: expose(AJUDAS_CUSTO.estrangeiroDia),
        ajudasCustoNacionalDirecao: expose(AJUDAS_CUSTO.nacionalDiaDirecao),
        ajudasCustoEstrangeiroDirecao: expose(AJUDAS_CUSTO.estrangeiroDiaDirecao),
        // O quilómetro tem limite PRÓPRIO e unidade própria: quem consome esta
        // API a partir das ajudas de custo diárias erraria por um fator de 100.
        kmAutomovelProprio: expose(AJUDAS_CUSTO.kmAutomovelProprio),
        abonoParaFalhas: expose(ABONO_PARA_FALHAS),
        deducaoEspecifica: expose(DEDUCAO_ESPECIFICA_DEPENDENTE),
        retencao: {
          limiarIsencao: expose(RETENCAO_DEP_ISENCAO),
          parcelaPorDependente: expose(RETENCAO_DEP_POR_DEPENDENTE),
          reducaoTresOuMaisDependentes: expose(RETENCAO_DEP_REDUCAO_3MAIS),
          parcelaDependenteComIncapacidade: expose(RETENCAO_DEP_DEFICIENTE),
          parcelaConjugeComIncapacidade: expose(RETENCAO_CONJUGE_DEFICIENTE),
          fracaoUnicoTitular: expose(RETENCAO_UNICO_TITULAR_FRACAO),
          fatorTrabalhoSuplementar: expose(RETENCAO_SUPLEMENTAR_FATOR),
          // Opção do titular por taxa superior (Art. 98.º, n.º 6 CIRS): o
          // direito, o que muda no cálculo, e o passo em pontos inteiros.
          taxaOpcional: {
            direito: expose(RETENCAO_TAXA_OPCIONAL.direito),
            efeitoNoCalculo: expose(RETENCAO_TAXA_OPCIONAL.efeitoNoCalculo),
            passoEmPontos: expose(RETENCAO_TAXA_OPCIONAL.passoEmPontos),
          },
        },
      },
      deducoesColeta: {
        dependente: expose(DEDUCAO_DEPENDENTE),
        dependenteAte3Anos: expose(DEDUCAO_DEPENDENTE_BEBE),
        dependenteComDeficiencia: expose(DEDUCAO_DEPENDENTE_DEFICIENCIA),
        despesasGerais: expose(DEDUCAO_DESP_GERAIS),
        saude: expose(DEDUCAO_SAUDE),
        educacao: expose(DEDUCAO_EDUCACAO),
        quocienteConjugal: expose(QUOCIENTE_CONJUGAL),
        limiteGlobal: expose(LIMITE_GLOBAL_DEDUCOES),
      },
    },
    atividades: {
      total: ATIVIDADES.length,
      grupos: [...new Set(ATIVIDADES.map((a) => a.grupo))],
      lista: ATIVIDADES,
    },
    fontes: Object.values(SOURCES),
  });
}
