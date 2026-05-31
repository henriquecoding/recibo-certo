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
  SS_TAXA,
  SS_COEFICIENTE,
  SS_BASE_MAX_MENSAL,
  REGIME_SIMPLIFICADO,
  IRS_JOVEM,
  ESCALOES_IRS,
  DEDUCAO_ESPECIFICA_CATB,
  REGIME_15PCT,
  MINIMO_EXISTENCIA,
  IRC_TAXA_GERAL,
  IRC_TAXA_PME,
  IRC_LIMITE_PME,
  DERRAMA_MAX,
  DIVIDENDOS_TAXA,
  CATEGORIA_F,
  REDUCAO_COEFICIENTE_ANO,
  DEDUCAO_DEPENDENTE,
  DEDUCAO_DEPENDENTE_BEBE,
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
      escaloesIRS: expose(ESCALOES_IRS),
      deducaoEspecificaCatB: expose(DEDUCAO_ESPECIFICA_CATB),
      regime15Pct: expose(REGIME_15PCT),
      minimoExistencia: expose(MINIMO_EXISTENCIA),
      irc: {
        taxaGeral: expose(IRC_TAXA_GERAL),
        taxaPME: expose(IRC_TAXA_PME),
        limitePME: expose(IRC_LIMITE_PME),
        derramaMax: expose(DERRAMA_MAX),
        dividendos: expose(DIVIDENDOS_TAXA),
      },
      deducoesColeta: {
        dependente: expose(DEDUCAO_DEPENDENTE),
        dependenteAte3Anos: expose(DEDUCAO_DEPENDENTE_BEBE),
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
