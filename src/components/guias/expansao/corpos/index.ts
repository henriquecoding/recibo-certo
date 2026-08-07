import type { ComponentType } from "react";
import CorpoIMI from "./imi";
import CorpoIMT from "./imt";
import CorpoAIMI from "./aimi";
import CorpoVptReavaliacao from "./vpt-reavaliacao";
import CorpoImpostoSeloCompraCasa from "./imposto-selo-compra-casa";
import CorpoDespesasSenhorio from "./despesas-senhorio";
import CorpoArrendamentoCategoriaF from "./arrendamento-categoria-f";
import CorpoReciboRendaModelo44 from "./recibo-renda-modelo-44";
import CorpoMaisValiasImoveis from "./mais-valias-imoveis";
import CorpoAlojamentoLocal from "./alojamento-local";
import CorpoAlVsArrendamento from "./al-vs-arrendamento";
import CorpoHerdarImovel from "./herdar-imovel";
import CorpoImovelEmpresaOuPessoal from "./imovel-empresa-ou-pessoal";
import CorpoAnexoJ from "./anexo-j";
import CorpoCorretorasEstrangeirasIrs from "./corretoras-estrangeiras-irs";
import CorpoCripto365Dias from "./cripto-365-dias";
import CorpoRendimentosCapitaisCategoriaE from "./rendimentos-capitais-categoria-e";
import CorpoDividendosIrs from "./dividendos-irs";
import CorpoCreditoImpostoEstrangeiro from "./credito-imposto-estrangeiro";
import CorpoReporteMenosValias from "./reporte-menos-valias";
import CorpoPprIrs from "./ppr-irs";
import CorpoCriptoStakingMining from "./cripto-staking-mining";
import CorpoEtfIrs from "./etf-irs";
import CorpoResidenciaFiscal from "./residencia-fiscal";
import CorpoSairDePortugal from "./sair-de-portugal";
import CorpoNaoResidentesIrs from "./nao-residentes-irs";
import CorpoProgramaRegressar from "./programa-regressar";
import CorpoModelo21Rfi from "./modelo-21-rfi";
import CorpoRepresentanteFiscal from "./representante-fiscal";
import CorpoConvencaoDuplaTributacao from "./convencao-dupla-tributacao";
import CorpoPrimeiroAnoFiscalPortugal from "./primeiro-ano-fiscal-portugal";
import CorpoNomadaDigitalD8 from "./nomada-digital-d8";
import CorpoRemotoEmpresaEstrangeira from "./remoto-empresa-estrangeira";
import CorpoTvdeMotorista from "./tvde-motorista";
import CorpoEstafetaPlataformas from "./estafeta-plataformas";
import CorpoCriadoresDeConteudo from "./criadores-de-conteudo";
import CorpoPlataformasSubscricao from "./plataformas-subscricao";
import CorpoFreelancerTecnologia from "./freelancer-tecnologia";
import CorpoProfissionaisSaude from "./profissionais-saude";
import CorpoFormadoresExplicadores from "./formadores-explicadores";
import CorpoArtistasDireitosAutor from "./artistas-direitos-autor";
import CorpoMediacaoComissoes from "./mediacao-comissoes";
import CorpoArquitetosEngenheiros from "./arquitetos-engenheiros";
import CorpoCoimasFiscais from "./coimas-fiscais";
import CorpoRegularizacaoVoluntaria from "./regularizacao-voluntaria";
import CorpoInspecaoTributaria from "./inspecao-tributaria";
import CorpoInsolvenciaPessoal from "./insolvencia-pessoal";
import CorpoIrsAutomatico from "./irs-automatico";
import CorpoDeclaracaoSubstituicao from "./declaracao-substituicao";
import CorpoIrsForaDoPrazo from "./irs-fora-do-prazo";
import CorpoEFatura from "./e-fatura";
import CorpoReclamarDeducoes from "./reclamar-deducoes";
import CorpoDeclaracaoTrimestralSs from "./declaracao-trimestral-ss";
import CorpoIsencaoContribuicoesSs from "./isencao-contribuicoes-ss";
import CorpoEntidadeContratante from "./entidade-contratante";
import CorpoSubsidioDoencaIndependentes from "./subsidio-doenca-independentes";
import CorpoParentalidadeIndependentes from "./parentalidade-independentes";
import CorpoDesempregoIndependentes from "./desemprego-independentes";
import CorpoSeguroAcidentesIndependentes from "./seguro-acidentes-independentes";
import CorpoIrsPensionistas from "./irs-pensionistas";
import CorpoReformadoRecibosVerdes from "./reformado-recibos-verdes";
import CorpoReformaIndependentes from "./reforma-independentes";
import CorpoPensaoEstrangeira from "./pensao-estrangeira";
import CorpoMudarRegimeIva from "./mudar-regime-iva";
import CorpoNotaDeCredito from "./nota-de-credito";
import CorpoAtcudQrCode from "./atcud-qr-code";
import CorpoFaturacaoEletronica from "./faturacao-eletronica";
import CorpoProgramaFaturacaoCertificado from "./programa-faturacao-certificado";
import CorpoRenunciarIsencaoIva from "./renunciar-isencao-iva";
import CorpoRegimeIsencaoUe from "./regime-isencao-ue";
import CorpoVies from "./vies";
import CorpoAutoliquidacaoIva from "./autoliquidacao-iva";
import CorpoOssIva from "./oss-iva";
import CorpoIoss from "./ioss";
import CorpoSafTFaturacao from "./saf-t-faturacao";
import CorpoDeclaracaoPeriodicaIva from "./declaracao-periodica-iva";
import CorpoDeclaracaoRecapitulativa from "./declaracao-recapitulativa";
import CorpoModelo10 from "./modelo-10";
import CorpoModelo30 from "./modelo-30";
import CorpoDmrDmis from "./dmr-dmis";
import CorpoPortalDasFinancas from "./portal-das-financas";
import CorpoSituacaoRegularizada from "./situacao-regularizada";

// ═══════════════════════════════════════════════════════════════════════
//  CORPOS REDIGIDOS DOS GUIAS DA EXPANSÃO
//  ---------------------------------------------------------------------
//  O registo tem de coincidir com `CORPOS_REDIGIDOS` (o conjunto de slugs
//  que decide o estado editorial). São duas listas porque vivem em lados
//  diferentes da fronteira cliente/servidor: os manifestos precisam de
//  saber QUE guias têm corpo sem arrastar o JSX de todos eles.
//
//  `guias:expansao` verifica as duas direções e falha se divergirem — é a
//  única razão por que duas listas são aceitáveis aqui.
// ═══════════════════════════════════════════════════════════════════════

export const CORPOS: Record<string, ComponentType> = {
  imi: CorpoIMI,
  imt: CorpoIMT,
  aimi: CorpoAIMI,
  "vpt-reavaliacao": CorpoVptReavaliacao,
  "imposto-selo-compra-casa": CorpoImpostoSeloCompraCasa,
  "despesas-senhorio": CorpoDespesasSenhorio,
  "arrendamento-categoria-f": CorpoArrendamentoCategoriaF,
  "recibo-renda-modelo-44": CorpoReciboRendaModelo44,
  "mais-valias-imoveis": CorpoMaisValiasImoveis,
  "alojamento-local": CorpoAlojamentoLocal,
  "al-vs-arrendamento": CorpoAlVsArrendamento,
  "herdar-imovel": CorpoHerdarImovel,
  "imovel-empresa-ou-pessoal": CorpoImovelEmpresaOuPessoal,
  "anexo-j": CorpoAnexoJ,
  "corretoras-estrangeiras-irs": CorpoCorretorasEstrangeirasIrs,
  "cripto-365-dias": CorpoCripto365Dias,
  "rendimentos-capitais-categoria-e": CorpoRendimentosCapitaisCategoriaE,
  "dividendos-irs": CorpoDividendosIrs,
  "credito-imposto-estrangeiro": CorpoCreditoImpostoEstrangeiro,
  "reporte-menos-valias": CorpoReporteMenosValias,
  "ppr-irs": CorpoPprIrs,
  "cripto-staking-mining": CorpoCriptoStakingMining,
  "etf-irs": CorpoEtfIrs,
  "residencia-fiscal": CorpoResidenciaFiscal,
  "sair-de-portugal": CorpoSairDePortugal,
  "nao-residentes-irs": CorpoNaoResidentesIrs,
  "programa-regressar": CorpoProgramaRegressar,
  "modelo-21-rfi": CorpoModelo21Rfi,
  "representante-fiscal": CorpoRepresentanteFiscal,
  "convencao-dupla-tributacao": CorpoConvencaoDuplaTributacao,
  "primeiro-ano-fiscal-portugal": CorpoPrimeiroAnoFiscalPortugal,
  "nomada-digital-d8": CorpoNomadaDigitalD8,
  "remoto-empresa-estrangeira": CorpoRemotoEmpresaEstrangeira,
  "tvde-motorista": CorpoTvdeMotorista,
  "estafeta-plataformas": CorpoEstafetaPlataformas,
  "criadores-de-conteudo": CorpoCriadoresDeConteudo,
  "plataformas-subscricao": CorpoPlataformasSubscricao,
  "freelancer-tecnologia": CorpoFreelancerTecnologia,
  "profissionais-saude": CorpoProfissionaisSaude,
  "formadores-explicadores": CorpoFormadoresExplicadores,
  "artistas-direitos-autor": CorpoArtistasDireitosAutor,
  "mediacao-comissoes": CorpoMediacaoComissoes,
  "arquitetos-engenheiros": CorpoArquitetosEngenheiros,
  "coimas-fiscais": CorpoCoimasFiscais,
  "regularizacao-voluntaria": CorpoRegularizacaoVoluntaria,
  "inspecao-tributaria": CorpoInspecaoTributaria,
  "insolvencia-pessoal": CorpoInsolvenciaPessoal,
  "irs-automatico": CorpoIrsAutomatico,
  "declaracao-substituicao": CorpoDeclaracaoSubstituicao,
  "irs-fora-do-prazo": CorpoIrsForaDoPrazo,
  "e-fatura": CorpoEFatura,
  "reclamar-deducoes": CorpoReclamarDeducoes,
  "declaracao-trimestral-ss": CorpoDeclaracaoTrimestralSs,
  "isencao-contribuicoes-ss": CorpoIsencaoContribuicoesSs,
  "entidade-contratante": CorpoEntidadeContratante,
  "subsidio-doenca-independentes": CorpoSubsidioDoencaIndependentes,
  "parentalidade-independentes": CorpoParentalidadeIndependentes,
  "desemprego-independentes": CorpoDesempregoIndependentes,
  "seguro-acidentes-independentes": CorpoSeguroAcidentesIndependentes,
  "irs-pensionistas": CorpoIrsPensionistas,
  "reformado-recibos-verdes": CorpoReformadoRecibosVerdes,
  "reforma-independentes": CorpoReformaIndependentes,
  "pensao-estrangeira": CorpoPensaoEstrangeira,
  "mudar-regime-iva": CorpoMudarRegimeIva,
  "nota-de-credito": CorpoNotaDeCredito,
  "atcud-qr-code": CorpoAtcudQrCode,
  "faturacao-eletronica": CorpoFaturacaoEletronica,
  "programa-faturacao-certificado": CorpoProgramaFaturacaoCertificado,
  "renunciar-isencao-iva": CorpoRenunciarIsencaoIva,
  "regime-isencao-ue": CorpoRegimeIsencaoUe,
  "vies": CorpoVies,
  "autoliquidacao-iva": CorpoAutoliquidacaoIva,
  "oss-iva": CorpoOssIva,
  "ioss": CorpoIoss,
  "saf-t-faturacao": CorpoSafTFaturacao,
  "declaracao-periodica-iva": CorpoDeclaracaoPeriodicaIva,
  "declaracao-recapitulativa": CorpoDeclaracaoRecapitulativa,
  "modelo-10": CorpoModelo10,
  "modelo-30": CorpoModelo30,
  "dmr-dmis": CorpoDmrDmis,
  "portal-das-financas": CorpoPortalDasFinancas,
  "situacao-regularizada": CorpoSituacaoRegularizada,
};
