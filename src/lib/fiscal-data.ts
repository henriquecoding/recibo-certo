// ═══════════════════════════════════════════════════════════════════════
//  FONTE DE VERDADE FISCAL — Portugal 2026
//  ---------------------------------------------------------------------
//  Todos os parâmetros fiscais vivem AQUI e só aqui. Cada valor carrega:
//    · base legal (artigo do código aplicável)
//    · fonte verificável (URL oficial / entidade de referência)
//    · data da última verificação
//
//  O motor de cálculo (fiscal.ts) NÃO contém números mágicos: lê tudo
//  deste módulo. No fim do ficheiro, `assertFiscalDataIntegrity()` corre
//  ao carregar o módulo e LANÇA se algum invariante for violado — ou seja,
//  é impossível publicar dados internamente inconsistentes (o build falha).
//
//  AO ATUALIZAR PARA UM NOVO ANO: alterar os valores, atualizar
//  `lastVerified` de cada parâmetro tocado e `DATA_LAST_REVIEW`.
// ═══════════════════════════════════════════════════════════════════════

// Reexportado de `./fiscal-year` (módulo leve, sem dados nem asserções) para que
// componentes-cliente o possam importar sem arrastar este ficheiro pesado.
export { FISCAL_YEAR } from "./fiscal-year";

/**
 * Data da última revisão dos dados (ISO 8601). É a data que a secção «Fontes»
 * mostra ao utilizador, por isso não pode ser anterior a nenhum `lastVerified`
 * registado abaixo: dizer «revisto a 20/07» com um parâmetro verificado a 21/07
 * descreve mal o que aconteceu. `assertFiscalDataIntegrity()` faz o build falhar
 * se algum parâmetro for mais recente do que esta data.
 */
export const DATA_LAST_REVIEW = "2026-08-19" as const;

// ─── Registo de fontes (evita repetir URLs longos) ─────────────────────
export interface Source {
  label: string;
  url: string;
}

export const SOURCES = {
  // ── Portal das Finanças (AT) — Códigos tributários ──────────────────
  portalFinancasIVA: {
    label: "Art. 53.º CIVA — Isenção de IVA · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/artigo-53-o-do-civa.aspx",
  },
  art18civa: {
    label: "Art. 18.º CIVA — Taxas do imposto · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/iva18.aspx",
  },
  art33civa: {
    label: "Art. 33.º CIVA — Cessação de atividade · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/iva33.aspx",
  },
  art6civa: {
    label: "Art. 6.º CIVA — Localização das operações intracomunitárias · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/iva6.aspx",
  },
  art31: {
    label: "Art. 31.º CIRS — Coeficientes do regime simplificado · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs31.aspx",
  },
  art68cirs: {
    label: "Art. 68.º CIRS — Taxas gerais (escalões IRS) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs68.aspx",
  },
  art68aCirs: {
    label: "Art. 68.º-A CIRS — Taxa adicional de solidariedade · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs68a.aspx",
  },
  lfra: {
    label: "Lei Orgânica n.º 2/2013 — Lei das Finanças das Regiões Autónomas (Título VI, poder tributário próprio)",
    url: "https://diariodarepublica.pt/dr/detalhe/lei-organica/2-2013-499317",
  },
  dlrMadeira2026: {
    label: "Decreto Legislativo Regional n.º 8/2025/M — Orçamento da Região Autónoma da Madeira para 2026",
    url: "https://diariodarepublica.pt/dr/detalhe/decreto-legislativo-regional/8-2025-993031451",
  },
  dlrAcores: {
    label: "Decreto Legislativo Regional n.º 15-A/2021/A — adaptação do sistema fiscal nacional à Região Autónoma dos Açores",
    url: "https://diariodarepublica.pt/dr/detalhe/decreto-legislativo-regional/15-a-2021-164193991",
  },
  art25cirs: {
    label: "Art. 25.º CIRS — Dedução específica do trabalho dependente · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs25.aspx",
  },
  art12aCirs: {
    label: "Art. 12.º-A CIRS — Regime fiscal aplicável a ex-residentes (Programa Regressar) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs12a.aspx",
  },
  lgt30: {
    label: "Art. 30.º LGT — O crédito tributário é indisponível, e essa regra prevalece sobre qualquer legislação especial · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/lgt/Pages/lgt30.aspx",
  },
  rgit26: {
    label: "Art. 26.º RGIT — Montante das coimas: mínimo de 50 €, ou 25 € em caso de redução; metade dos limites para pessoas singulares · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/rgit/Pages/rgit26.aspx",
  },
  rgit29: {
    label: "Art. 29.º RGIT — Dispensa das coimas (redação da Lei n.º 7/2021) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/rgit/Pages/rgit29.aspx",
  },
  rgit30: {
    label: "Art. 30.º RGIT — Direito à redução das coimas: 12,5% antes de qualquer ação, 50% até à audição prévia · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/rgit/Pages/rgit30.aspx",
  },
  rgit114: {
    label: "Art. 114.º RGIT — Falta de entrega da prestação tributária · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/rgit/Pages/rgit114.aspx",
  },
  rgit116: {
    label: "Art. 116.º RGIT — Falta ou atraso de declarações: coima de 150 € a 3 750 € · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/rgit/Pages/rgit116.aspx",
  },
  rgit117: {
    label: "Art. 117.º RGIT — Falta ou atraso na apresentação de documentos e de declarações de início, alteração ou cessação · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/rgit/Pages/rgit117.aspx",
  },
  lgt78: {
    label: "Art. 78.º LGT — Revisão dos atos tributários: quatro anos por erro imputável aos serviços, três anos por injustiça grave ou notória · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/lgt/Pages/lgt78.aspx",
  },
  cppt70: {
    label: "Art. 70.º CPPT — Reclamação graciosa: prazo de 120 dias · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cppt/Pages/cppt70.aspx",
  },
  art53cirs: {
    label: "Art. 53.º CIRS — Pensões: a dedução específica remete para a al. a) do n.º 1 do Art. 25.º · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs53.aspx",
  },
  art57cirs: {
    label: "Art. 57.º CIRS — Declaração de rendimentos, contitularidade e a declaração por cada estatuto de residência · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs57.aspx",
  },
  art58aCirs: {
    label: "Art. 58.º-A CIRS — Declaração automática de rendimentos: conversão em declaração entregue, tributação separada por defeito e substituição em 30 dias · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs58a.aspx",
  },
  art58EBF: {
    label: "Art. 58.º EBF — Propriedade intelectual: englobamento por 50%, só ao titular originário, com o teto de 10 000 € · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/bf_rep/Pages/ebf-artigo-58-ordm-.aspx",
  },
  civa27: {
    label: "Art. 27.º CIVA — Pagamento do imposto apurado: até ao dia 25 do 2.º mês seguinte · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/iva27.aspx",
  },
  civa41: {
    label: "Art. 41.º CIVA — Prazo de entrega da declaração periódica: dia 20 do 2.º mês seguinte, e o limiar de 650 000 € que separa mensal de trimestral · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/iva41.aspx",
  },
  civa36: {
    label: "Art. 36.º CIVA — Prazo de emissão e formalidades das faturas: 5.º dia útil, 15.º dia do mês seguinte nas intracomunitárias, data do recebimento nos adiantamentos · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/iva36.aspx",
  },
  civa53: {
    label: "Art. 53.º CIVA — Âmbito de aplicação no território nacional: limiar de 15 000 €, e o regime transfronteiriço com o limiar de 100 000 € na União e o número EX · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/artigo-53-o-do-civa.aspx",
  },
  civa58: {
    label: "Art. 58.º CIVA — Cessação do regime de isenção: a regra dos 25%, o efeito imediato e os 15 dias úteis para a declaração de alterações · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/iva58.aspx",
  },
  civa78: {
    label: "Art. 78.º CIVA — Regularizações: prazos de retificação e a prova exigida para regularizar a favor do sujeito passivo · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/iva78.aspx",
  },
  civa9: {
    label: "Art. 9.º CIVA — Isenções nas operações internas: saúde, ensino, formação profissional e lições particulares · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/civa_rep/Pages/iva9.aspx",
  },
  art16cirs: {
    label: "Art. 16.º CIRS — Residência: os 183 dias, o critério da habitação, a residência parcial e a regra do ano da saída · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs16.aspx",
  },
  lgt19: {
    label: "Art. 19.º LGT — Domicílio fiscal, prazo de 60 dias para comunicar a alteração de residência e regime do representante fiscal · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/lgt/Pages/lgt19.aspx",
  },
  art70cirs: {
    label: "Art. 70.º CIRS — Mínimo de existência · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs70.aspx",
  },
  art71cirs: {
    label: "Art. 71.º CIRS — Taxas liberatórias: capitais a 28%, trabalho e pensões de não residentes a 25%, devolução a residentes na UE/EEE · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs71.aspx",
  },
  art72: {
    label: "Art. 72.º CIRS — Taxas especiais: rendimentos prediais, mais-valias, não residentes e a opção pelas taxas progressivas na UE/EEE · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs72.aspx",
  },
  art78cirs: {
    label: "Art. 78.º CIRS — Deduções à coleta · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs78.aspx",
  },
  art13cirs: {
    label: "Art. 13.º CIRS — Sujeito passivo, agregado familiar, dependentes e as responsabilidades parentais exercidas em comum · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs13.aspx",
  },
  art26cis: {
    label: "Art. 26.º CIS — Participação da transmissão de bens: prazo até ao final do 3.º mês seguinte · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/selo/Pages/selo26.aspx",
  },
  art6cisSelo: {
    label: "Art. 6.º CIS — Isenções: cônjuge ou unido de facto, descendentes e ascendentes nas transmissões gratuitas da verba 1.2 · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/selo/Pages/selo6.aspx",
  },
  art78aCirs: {
    label: "Art. 78.º-A CIRS — Dedução por dependentes · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs78a.aspx",
  },
  portalFinancasArt87: {
    label: "Art. 87.º CIRS — Deduções relativas a pessoas com deficiência · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs87.aspx",
  },
  art101cirs: {
    label: "Art. 101.º CIRS — Retenção na fonte sobre rendimentos Cat. B · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs101.aspx",
  },
  art101bCirs: {
    label: "Art. 101.º-B CIRS — Dispensa de retenção na fonte · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs101b.aspx",
  },
  art12bCirs: {
    label: "Art. 12.º-B CIRS — IRS Jovem · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs12b.aspx",
  },
  ctPeriodoExperimental: {
    label: "Art. 112.º Código do Trabalho — Duração do período experimental · Base de Dados Jurídica da PGD Lisboa (versão consolidada)",
    url: "https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?artigo_id=1047A0112&nid=1047&tabela=leis&nversao=",
  },
  ctDenunciaExperimental: {
    label: "Art. 114.º Código do Trabalho — Denúncia do contrato durante o período experimental · PGD Lisboa",
    url: "https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?artigo_id=1047A0114&nid=1047&tabela=leis&nversao=",
  },
  ctTermo: {
    label: "Arts. 140.º e 148.º Código do Trabalho — Admissibilidade e duração do contrato a termo resolutivo · PGD Lisboa",
    url: "https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?artigo_id=1047A0140&nid=1047&tabela=leis&nversao=",
  },
  ctFormacao: {
    label: "Arts. 131.º, 132.º e 134.º Código do Trabalho — Formação contínua, crédito de horas e efeito da cessação · PGD Lisboa",
    url: "https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?artigo_id=1047A0131&nid=1047&tabela=leis&nversao=",
  },
  ctBancoHoras: {
    label: "Arts. 208.º-A e 208.º-B Código do Trabalho — Banco de horas individual (revogado) e grupal · PGD Lisboa",
    url: "https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?artigo_id=1047A0208B&nid=1047&tabela=leis&nversao=",
  },
  ctTeletrabalho: {
    label: "Arts. 166.º, 168.º e 170.º Código do Trabalho — Acordo, equipamentos e despesas, e privacidade em teletrabalho · PGD Lisboa",
    url: "https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?artigo_id=1047A0168&nid=1047&tabela=leis&nversao=",
  },
  ctAssedio: {
    label: "Art. 29.º Código do Trabalho — Assédio · PGD Lisboa",
    url: "https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?artigo_id=1047A0029&nid=1047&tabela=leis&nversao=",
  },
  ctTrabalhadorEstudante: {
    label: "Art. 94.º Código do Trabalho — Concessão do estatuto de trabalhador-estudante · PGD Lisboa",
    url: "https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?artigo_id=1047A0094&nid=1047&tabela=leis&nversao=",
  },
  ctCompensacao: {
    label: "Art. 366.º Código do Trabalho — Compensação por despedimento coletivo · PGD Lisboa",
    url: "https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?artigo_id=1047A0366&nid=1047&tabela=leis&nversao=",
  },
  dgertCodigoTrabalho: {
    label: "Código do Trabalho e regulamentação — lista oficial de alterações · DGERT (Direção-Geral do Emprego e das Relações de Trabalho)",
    url: "https://www.dgert.gov.pt/codigo-do-trabalho-e-regulamentacao",
  },
  art2cirs: {
    label: "Art. 2.º CIRS — Rendimentos da categoria A: subsídio de refeição, abono para falhas e ajudas de custo · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs2.aspx",
  },
  art98cirs: {
    label: "Art. 98.º CIRS — Retenção na fonte: regras gerais e opção por taxa inteira superior (n.º 6) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs98.aspx",
  },
  ct154: {
    label: "Art. 154.º Código do Trabalho — Condições de trabalho a tempo parcial (retribuição proporcional ao período normal de trabalho) · PGDL",
    url: "https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?artigo_id=1047A0154&nid=1047&tabela=leis",
  },
  art56aCirs: {
    label: "Art. 56.º-A CIRS — Exclusão de rendimentos de pessoas com deficiência · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs56a.aspx",
  },
  art87circ: {
    label: "Art. 87.º CIRC — Taxas de IRC · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/CIRC_2R/Pages/irc87.aspx",
  },
  art88circ: {
    label: "Art. 88.º CIRC — Tributação autónoma · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/CIRC_2R/Pages/irc88.aspx",
  },

  // ── Diário da República (DRE) — Legislação consolidada ──────────────
  portaria151: {
    label: "Portaria 1011/2001 — Tabela de atividades do Art. 151.º CIRS · Diário da República",
    url: "https://diariodarepublica.pt/dr/legislacao-consolidada/portaria/2001-177307831",
  },
  cfi: {
    label: "DL 162/2014 — Código Fiscal do Investimento (CFI: RFAI, SIFIDE II; DLRR revogada pela Lei 24-D/2022) · Diário da República",
    url: "https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/2014-59423292",
  },

  // ── Segurança Social — Portal oficial ───────────────────────────────
  segSocialGov: {
    label: "Trabalhadores independentes — obrigações contributivas · Segurança Social (Gov)",
    url: "https://www.seg-social.pt/trabalhadores-independentes",
  },

  // ── Governo de Portugal — Guias oficiais ────────────────────────────
  govptTrabIndependente: {
    label: "Trabalhar por conta própria — guia para trabalhadores independentes · Gov.pt",
    url: "https://www.gov.pt/guias/trabalhar-por-conta-propria-guia-para-trabalhadores-independentes/",
  },

  // ── Ordem dos Contabilistas Certificados (OCC) — entidade oficial ──
  occIVA: {
    label: "IVA — Taxas em Portugal continental e regiões autónomas · OCC",
    url: "https://www.occ.pt/pt-pt/noticias/iva-taxas-em-portugal-continental-e-acores",
  },
  occRegimeSimplificado: {
    label: "IRS — Regime simplificado (coeficientes e regra dos 15%) · OCC",
    url: "https://www.occ.pt/pt-pt/noticias/irs-regime-simplificado-1",
  },
  alojamentoLocal: {
    label: "IRS do alojamento local — coeficientes (0,15 / 0,35 / 0,50) · OCC",
    url: "https://www.occ.pt/pt-pt/noticias/irs-regime-simplificado-alojamento-local",
  },
  rendasPrediais: {
    label: "IRS — rendimentos prediais e tributação autónoma · OCC",
    url: "https://www.occ.pt/pt-pt/noticias/irs-rendimentos-prediais-e-tributacao-autonoma",
  },
  occTA: {
    label: "Tributação Autónoma — Art. 88.º CIRC (OE2025/OE2026) · OCC",
    url: "https://portal.occ.pt/pt-pt/noticias/irc-tributacao-autonoma",
  },
  occRFAI: {
    label: "RFAI — Regime Fiscal de Apoio ao Investimento (Art. 22.º–26.º CFI) · OCC",
    url: "https://www.occ.pt/pt-pt/noticias/beneficios-fiscais-rfai-e-dlrr",
  },
  occDLRR: {
    label: "DLRR — regime REVOGADO desde 1 jan 2023 (Art. 281.º da Lei 24-D/2022; ex-Art. 27.º–34.º CFI) · OCC",
    url: "https://www.occ.pt/pt-pt/noticias/beneficios-fiscais-rfai-e-dlrr",
  },
  occICE: {
    label: "ICE — Incentivo à Capitalização das Empresas (Art. 43.º-D EBF, sucessor da DLRR) · OCC",
    url: "https://www.occ.pt/pt-pt/noticias/irc-beneficios-fiscais-ice-0",
  },
  occSIFIDE: {
    label: "SIFIDE II — Sistema de Incentivos Fiscais à I&D (Art. 35.º–42.º CFI) · OCC",
    url: "https://www.occ.pt/pt-pt/noticias/irc-beneficios-fiscais-sifide-ii",
  },
  occIFICI: {
    label: "Art. 58.º-A EBF — IFICI, Incentivo Fiscal à Investigação Científica e Inovação (ex-NHR) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/bf_rep/Pages/EBF58A.aspx",
  },

  // ── Trabalho dependente (Categoria A) ───────────────────────────────
  // Corrigido em 26/07/2026 (auditoria P0 3.3): apontava para um artigo do
  // Montepio apresentado como se fosse o despacho. O texto oficial é
  // publicado pela AT; o artigo bancário passou a leitura complementar em
  // `src/lib/guias/legal-sources.ts`.
  despachoRetencao2026: {
    label: "Despacho n.º 233-A/2026 — Tabelas de retenção na fonte de IRS 2026 (Continente) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/legislacao/diplomas_legislativos/Documents/Despacho-233-A-2026.pdf",
  },
  subsidioRefeicao2026: {
    label: "Subsídio de refeição — limites de isenção 2026 (Art. 2.º, n.º 3 CIRS) · ref. Edenred/idealista",
    url: "https://www.edenred.pt/novidades/beneficios-sociais/subsidio-de-refeicao-2026-quais-os-valores-a-considerar/",
  },
  ct268: {
    label: "Art. 268.º Código do Trabalho — Pagamento de trabalho suplementar (Lei 7/2009, alt. Lei 13/2023) · PGDL",
    url: "https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?artigo_id=1047A0268&nid=1047&tabela=leis",
  },
  ct271: {
    label: "Art. 271.º Código do Trabalho — Cálculo do valor da retribuição horária · PGDL",
    url: "https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?artigo_id=1047A0271&nid=1047&tabela=leis",
  },
  retencaoSuplementar2026: {
    label: "Trabalho suplementar — retenção na fonte 2026 (50% da taxa efetiva mensal, desde a 1.ª hora) · Doutor Finanças",
    url: "https://www.doutorfinancas.pt/carreira-e-rendimentos/rendimentos/retencao-na-fonte-sobre-trabalho-suplementar-alteracoes-e-beneficios-fiscais/",
  },
  ajudasCusto2026: {
    label: "Ajudas de custo — tabela oficial em vigor (limites legais dos servidores do Estado, referência do Art. 2.º, n.º 3, al. d) CIRS) · DGAEP",
    url: "https://www.dgaep.gov.pt/stap/infoPageTabelas.cfm?KeepThis=true&objid=C63BAF54-E6CE-49C1-BBF1-C5AC0AF36C68",
  },
  codContributivo: {
    label: "Código dos Regimes Contributivos (Lei 110/2009) — base de incidência contributiva (prémios regulares) · Diário da República",
    url: "https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34514575",
  },
  madeiraRetencao2026: {
    label: "Declaração de Retificação n.º 10/2026 — republicação integral das tabelas de retenção na fonte de IRS 2026 da Região Autónoma da Madeira (retifica o Despacho n.º 19/2026) · JORAM",
    url: "https://joram.madeira.gov.pt/joram/2serie/Ano%20de%202026/IISerie-016-2026-01-23Supl3.pdf",
  },
  acoresRetencao2026: {
    label: "Despacho n.º 1179/2026 — Tabelas de retenção na fonte de IRS 2026, Região Autónoma dos Açores · Diário da República",
    url: "https://files.diariodarepublica.pt/2s/2026/02/023000000/0005100057.pdf",
  },

  // ── CIMI / CIMT / TGIS — articulado da AT ──────────────────────────
  //    Estas entradas substituem o guia da PwC como fonte dos parâmetros
  //    patrimoniais. A PwC continua no registo: é boa leitura e é usada
  //    onde não há artigo que fixe o número. Mas onde há artigo, é o artigo
  //    que manda — a regra 1 deste projeto diz «só fontes oficiais», e um
  //    guia de consultora não é a fonte de uma taxa que está na lei.
  //    Verificados por leitura direta a 2026-08-06.
  art112cimi: {
    label: "Art. 112.º CIMI — Taxas (urbano 0,3%–0,45%; rústico 0,8%; agravamentos) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cimi/Pages/cimi112.aspx",
  },
  art113cimi: {
    label: "Art. 113.º CIMI — Competência e prazo da liquidação · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cimi/Pages/cimi113.aspx",
  },
  art120cimi: {
    label: "Art. 120.º CIMI — Prazo de pagamento (uma, duas ou três prestações) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cimi/Pages/cimi120.aspx",
  },
  art11aCimi: {
    label: "Art. 11.º-A CIMI — Isenção de prédios de reduzido VPT de sujeitos passivos de baixos rendimentos · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cimi/Pages/cimi11a.aspx",
  },
  art135cCimi: {
    label: "Art. 135.º-C CIMI — AIMI: regras de determinação do valor tributável e dedução · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cimi/Pages/cimi135c.aspx",
  },
  art135fCimi: {
    label: "Art. 135.º-F CIMI — AIMI: taxas · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cimi/Pages/cimi135f.aspx",
  },
  art135gCimi: {
    label: "Art. 135.º-G CIMI — AIMI: forma e prazo da liquidação · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cimi/Pages/cimi135g.aspx",
  },
  art135hCimi: {
    label: "Art. 135.º-H CIMI — AIMI: pagamento · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cimi/Pages/cimi135h.aspx",
  },
  art9cimt: {
    label: "Art. 9.º CIMT — Isenção pela aquisição de prédios destinados exclusivamente a habitação · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cimt/Pages/cimt9.aspx",
  },
  art17cimt: {
    label: "Art. 17.º CIMT — Taxas (escalões, taxas marginais e taxas únicas) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cimt/Pages/cimt17.aspx",
  },
  art36cimt: {
    label: "Art. 36.º CIMT — Prazos para pagamento · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cimt/Pages/cimt36.aspx",
  },
  tgisPdf: {
    label: "Tabela Geral do Imposto do Selo — verbas 1.1, 1.2, 2 e 17 (PDF consolidado do CIS) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/Cod_download/Documents/CIS.pdf",
  },
  art5cirs: {
    label: "Art. 5.º CIRS — Rendimentos da categoria E, incluindo a remuneração de operações com criptoativos (al. u) do n.º 2 e n.º 11) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs5.aspx",
  },
  art15cirs: {
    label: "Art. 15.º CIRS — Âmbito da sujeição (rendimento mundial dos residentes) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs15.aspx",
  },
  art41cirs: {
    label: "Art. 41.º CIRS — Deduções aos rendimentos prediais (categoria F) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs41.aspx",
  },
  art51cirs: {
    label: "Art. 51.º CIRS — Despesas e encargos (mais-valias) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs51.aspx",
  },
  art55cirs: {
    label: "Art. 55.º CIRS — Dedução de perdas · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs55.aspx",
  },
  art115cirs: {
    label: "Art. 115.º CIRS — Emissão de recibos e faturas (recibo de renda e declaração anual) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs115.aspx",
  },
  art46circ: {
    label: "Art. 46.º CIRC — Conceito de mais-valias e menos-valias (dedução das depreciações) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/CIRC_2R/Pages/irc46.aspx",
  },
  art47circ: {
    label: "Art. 47.º CIRC — Correção monetária das mais-valias e menos-valias · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/CIRC_2R/Pages/irc47.aspx",
  },

  // ── PwC / CIMI / CIMT / TGIS — Impostos municipais ─────────────────
  pwcGuiaFiscal: {
    label: "PwC — Guia Fiscal 2026 (IMI, IMT, IS) · PwC Portugal",
    url: "https://www.pwc.pt/pt/pwcinforfisco/guia-fiscal/2026.html",
  },
  art40aCirs: {
    label: "Art. 40.º-A CIRS — Englobamento de lucros e reservas (50% dividendos) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs40a.aspx",
  },

  // ── Mais-valias (categoria G), criptoativos e rendimentos estrangeiros ──
  art10cirs: {
    label: "Art. 10.º CIRS — Mais-valias (categoria G); criptoativos (al. k) do n.º 1 e n.º 19) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs10.aspx",
  },
  art43cirs: {
    label: "Art. 43.º CIRS — Saldo de mais-valias (redução a 50% nas imobiliárias e em micro/pequenas empresas) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs43.aspx",
  },
  art81cirs: {
    label: "Art. 81.º CIRS — Eliminação da dupla tributação jurídica internacional (crédito de imposto) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs81.aspx",
  },
  ativosMaisValias2026: {
    label: "Mais-Valias IRS 2026: guia para investidores (28%; englobamento obrigatório < 365 dias no último escalão) · Ativos.pt",
    url: "https://www.ativos.pt/blog/mais-valias-irs-2026-guia-investidores",
  },
  faciliteCripto2026: {
    label: "Criptomoedas no IRS 2026: regra dos 365 dias (isenção ≥ 365 dias; 28% < 365 dias) · Facilite",
    url: "https://www.facilite.co/pt/criptomoedas-irs-portugal-2026",
  },
  cgdImoveisMaisValias: {
    label: "Venda de imóvel: pagamento de mais-valias (50% do saldo; reinvestimento em HPP) · CGD Saldo Positivo",
    url: "https://www.cgd.pt/Site/Saldo-Positivo/leis-e-impostos/Pages/vender-imovel-pagamento-mais-valia.aspx",
  },
  occAnexoJ: {
    label: "IRS — Anexo J (rendimentos obtidos no estrangeiro) · Ordem dos Contabilistas Certificados",
    url: "https://www.occ.pt/pt-pt/noticias/irs-anexo-j-0",
  },
  art21EBF: {
    label: "Art. 21.º EBF — PPR: dedução à coleta de 20% com limites por idade · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/bf_rep/Pages/ebf-artigo-21-ordm-.aspx",
  },
  ebf22: {
    label: "Art. 22.º EBF — Organismos de investimento coletivo: IRC sobre o lucro tributável, excluídos os rendimentos dos arts. 5.º, 8.º e 10.º do CIRS · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/bf_rep/Pages/ebf-artigo-22-ordm.aspx",
  },
  ebf22a: {
    label: "Art. 22.º-A EBF — Rendimentos pagos por organismos de investimento coletivo aos participantes: retenção na distribuição e no resgate · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/bf_rep/Pages/ebf-artigo-22-ordm-a.aspx",
  },
  ebf43c: {
    label: "Art. 43.º-C EBF — Incentivo fiscal à aquisição de participações sociais de startups · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/bf_rep/Pages/ebf43c.aspx",
  },
  ebf43d: {
    label: "Art. 43.º-D EBF — Regime fiscal de incentivo à capitalização das empresas (ICE) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/bf_rep/Pages/ebf43d.aspx",
  },
  circ31: {
    label: "Art. 31.º CIRC — Quotas de depreciação ou amortização · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/CIRC_2R/Pages/irc31.aspx",
  },
  circ33: {
    label: "Art. 33.º CIRC — Elementos de reduzido valor · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/CIRC_2R/Pages/irc33.aspx",
  },
  circ34: {
    label: "Art. 34.º CIRC — Depreciações e amortizações não dedutíveis para efeitos fiscais · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/CIRC_2R/Pages/irc34.aspx",
  },
  art72cirsF: {
    label: "Art. 72.º, n.º 1, al. f) CIRS — taxa autónoma de 28% sobre os ganhos de planos de opções abrangidos pelo art. 43.º-C do EBF · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs72.aspx",
  },
  art63EBF: {
    label: "Art. 63.º EBF — Estatuto do Mecenato: donativos, dedução de 25% com limite de 15% da coleta · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/bf_rep/Pages/ebf-artigo-63-ordm-.aspx",
  },
  art62EBF: {
    label: "Art. 62.º EBF — Mecenato: majorações dos donativos (130% social/religioso, 140% cultural/ambiental) e donativos ao Estado sem limite · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/bf_rep/Pages/ebf-artigo-62-ordm-.aspx",
  },
  portaria382_2025: {
    label: "Portaria n.º 382/2025/1 — Coeficientes de desvalorização da moeda (bens alienados em 2025) · Diário da República",
    url: "https://diariodarepublica.pt/dr/detalhe/portaria/382-2025-945460818",
  },
  art83aCirs: {
    label: "Art. 83.º-A CIRS — Dedução de pensões de alimentos (20%, sem limite) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs83a.aspx",
  },
  art84cirs: {
    label: "Art. 84.º CIRS — Dedução de encargos com lares (25%, limite 403,75 €) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs84.aspx",
  },

  // ── Comissão Europeia ───────────────────────────────────────────────
  viesValidation: {
    label: "VIES — Validação de número de identificação para efeitos do IVA · Comissão Europeia",
    url: "https://ec.europa.eu/taxation_customs/vies",
  },

  // ── Empresas — constituição, formas jurídicas e obrigações ──────────
  empresaConstituicao: {
    label: "Constituição de sociedades — Empresa na Hora / Empresa Online (formas jurídicas, capital social) · gov.pt (IRN)",
    url: "https://www2.gov.pt/espaco-empresa/empresa-online",
  },
  csc: {
    label: "Código das Sociedades Comerciais (DL 262/86) — tipos de sociedade, capital e órgãos sociais · Diário da República",
    url: "https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/1986-34443975",
  },
  ircObrigacoes: {
    label: "IRC — Guia Fiscal 2026 (taxas, prazos e obrigações declarativas) · PwC Portugal",
    url: "https://www.pwc.pt/pt/pwcinforfisco/guia-fiscal/2026/irc.html",
  },
  // ── Direitos, cobranças e execução (Parte «Direitos» dos Guias) ──────
  avisoJuros2026: {
    label:
      "Aviso n.º 822/2026/2 (DR n.º 11, 16-01-2026) — taxas supletivas de juros moratórios comerciais, 1.º semestre de 2026 · Entidade do Tesouro e Finanças",
    url: "https://diariodarepublica.pt/dr/detalhe/aviso/822-2026-2",
  },
  portaria291_2003: {
    label: "Portaria n.º 291/2003 — taxa de juros legais e de juros de mora de obrigações civis (4%) · Diário da República",
    url: "https://diariodarepublica.pt/dr/detalhe/portaria/291-2003-632924",
  },
  unidadeContaOE: {
    label:
      "Art. 242.º da Lei n.º 73-A/2025 (OE 2026) — suspensão da atualização da unidade de conta processual (mantém-se em 102 €) · Diário da República",
    url: "https://diariodarepublica.pt/dr/detalhe/lei/73-a-2025",
  },
  cppt198a: {
    label: "Art. 198.º-A CPPT — plano oficioso de pagamento em prestações · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cppt/Pages/cppt198a.aspx",
  },
  cpc738dr: {
    label: "Art. 738.º CPC — bens parcialmente penhoráveis (versão consolidada) · Diário da República",
    url: "https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2013-34580575",
  },
  // ── Trabalho por conta de outrem e proteção social ───────────────────
  ct: {
    label: "Código do Trabalho (Lei 7/2009, versão consolidada) — férias, faltas, noturno e cessação · Diário da República",
    url: "https://diariodarepublica.pt/dr/legislacao-consolidada/lei/2009-34546475",
  },
  ssEntidadeContratante: {
    label: "Entidades contratantes de trabalhadores independentes — dependência económica e taxas de 7% e 10% · Segurança Social",
    url: "https://www.seg-social.pt/entidades-contratantes",
  },
  ssDoenca: {
    label: "Subsídio de doença — montante, prazo de garantia e período de espera · Segurança Social",
    url: "https://www.seg-social.pt/subsidio-de-doenca",
  },
  ssDesemprego: {
    label: "Subsídio de desemprego — prazo de garantia, montante e duração · Segurança Social",
    url: "https://www.seg-social.pt/subsidio-de-desemprego",
  },
  ssParentalidade: {
    label: "Subsídio parental — modalidades, percentagens e licença exclusiva do pai · Segurança Social",
    url: "https://www.seg-social.pt/subsidio-parental",
  },
  seguroAcidentesTrabalho: {
    label: "Seguro de acidentes de trabalho — obrigatoriedade (Lei 98/2009, Art. 79.º) · Diário da República",
    url: "https://diariodarepublica.pt/dr/detalhe/lei/98-2009-490009",
  },
  art87circ_pgdl: {
    label: "Art. 87.º CIRC — Taxas de IRC (texto legal consolidado) · PGDL",
    url: "https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?nid=524&tabela=leis&so_miolo=",
  },
  art88circ_pgdl: {
    label: "Art. 88.º CIRC — Tributação Autónoma (texto legal consolidado) · PGDL",
    url: "https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?nid=524&tabela=leis&so_miolo=",
  },
  art41bEBF: {
    label: "Art. 41.º-B EBF — IRC do Interior (12,5% nos primeiros 50 000 €) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/bf_rep/Pages/ebf-artigo-41-o-b.aspx",
  },
  art58aEBF: {
    label: "Art. 58.º-A EBF — IFICI (ex-NHR 2.0): taxa de 20% sobre rendimentos das categorias A e B elegíveis · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/bf_rep/Pages/EBF58A.aspx",
  },
  dl262_86: {
    label: "DL 262/86 — Código das Sociedades Comerciais (Art. 270.º-A ss. — Soc. Unipessoal por Quotas) · PGDL",
    url: "https://www.pgdlisboa.pt/leis/lei_mostra_articulado.php?nid=524&tabela=leis",
  },
  representanteFiscal: {
    label: "Representação fiscal de não residentes — Art. 130.º CIRS / Art. 19.º LGT (FAQ oficial) · Portal das Finanças",
    url: "https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/questoes_frequentes/pages/faqs-00307.aspx",
  },
  sedeVirtual: {
    label: "Sede virtual / domicílio fiscal da empresa — Art. 3.º CSC (DL 262/86) · IRN/Gov.pt",
    url: "https://www2.gov.pt/espaco-empresa/empresa-online",
  },

  // ── Heranças e Sucessões — Imposto do Selo (CIS/TGIS) e Código Civil ──
  tgisSelo: {
    label: "Tabela Geral do Imposto do Selo (Verbas 1.1 e 1.2) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/selo/Pages/ccod-selo-tabgiselo.aspx",
  },
  cisArt6: {
    label: "Art. 6.º CIS — Isenções (al. e): cônjuge/unido de facto, descendentes e ascendentes · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/selo/Pages/selo6.aspx",
  },
  cisArt13: {
    label: "Art. 13.º CIS — Valor tributável das transmissões gratuitas (imóveis pelo VPT) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/selo/Pages/selo13.aspx",
  },
  cisArt26: {
    label: "Art. 26.º CIS — Participação (Modelo 1) até ao fim do 3.º mês seguinte ao óbito · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/selo/Pages/selo26.aspx",
  },
  modelo1ISTG: {
    label: "Participação do Imposto do Selo — Óbito (Modelo 1 ISTG, cabeça-de-casal) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/apoio_contribuinte/Folhetos_informativos/Documents/Folheto_Participacao_Imposto_Selo_Obito.pdf",
  },
  ccSucessoes: {
    label: "Código Civil, Livro V — Direito das Sucessões (Art. 2133.º ss.) · Diário da República",
    url: "https://diariodarepublica.pt/dr/legislacao-consolidada/decreto-lei/1966-34509075",
  },
  occHerancas: {
    label: "Guia Prático de Heranças (partilha, meação, Imposto do Selo) · Ordem dos Contabilistas Certificados",
    url: "https://www.occ.pt/sites/default/files/public/2024-02/Guia_Pratico_HERANCAS_2.pdf",
  },
  art45cirs: {
    label: "Art. 45.º CIRS — Valor de aquisição a título gratuito (valor para Imposto do Selo/VPT) · Portal das Finanças (AT)",
    url: "https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/cirs_rep/Pages/irs45.aspx",
  },
} satisfies Record<string, Source>;

export type SourceKey = keyof typeof SOURCES;

// ─── Valor com proveniência ────────────────────────────────────────────
export interface Sourced<T> {
  value: T;
  /** Base legal: artigo do código aplicável. */
  legalBasis: string;
  /** Chave do registo SOURCES. */
  source: SourceKey;
  /** Data da última verificação (ISO 8601). */
  lastVerified: string;
  /** Nota opcional de contexto. */
  note?: string;
}

function sv<T>(
  value: T,
  legalBasis: string,
  source: SourceKey,
  lastVerified: string,
  note?: string
): Sourced<T> {
  return { value, legalBasis, source, lastVerified, note };
}

const TODAY = "2026-06-11";
// Verificação das taxas regionais de IRS (Madeira e Açores) contra a tabela
// publicada para 2026 e os diplomas regionais que a fixam.
const REV_REGIOES = "2026-08-19";
// Data de verificação dos parâmetros adicionados na revisão de mais-valias
// (categoria G) e rendimentos estrangeiros — confirmados em fontes oficiais/de
// referência nesta data.
const REV_MAIS_VALIAS = "2026-06-22";
// Data de verificação dos benefícios fiscais à coleta (PPR, donativos, ascendentes).
const REV_BENEFICIOS = "2026-06-22";
// Data de verificação do regime dos organismos de investimento coletivo
// (arts. 22.º e 22.º-A do EBF) e da exclusão por tempo de detenção do
// Art. 43.º, n.º 5 do CIRS — lidos no articulado do Portal das Finanças.
const REV_INVESTIMENTO = "2026-08-07";
// Data de verificação do bloco de rendimentos e residência internacionais —
// Art. 16.º do CIRS (residência), Art. 12.º-A (ex-residentes) e Art. 19.º da
// LGT (domicílio fiscal e representante), lidos no Portal das Finanças.
const REV_ESTRANGEIRO = "2026-08-07";
// Data de verificação do bloco das profissões — Art. 58.º do EBF
// (propriedade intelectual) e as isenções do Art. 9.º do CIVA que decidem a
// fiscalidade da saúde, da formação e das explicações.
const REV_PROFISSOES = "2026-08-07";
// Data de verificação do bloco das infrações e da correção de declarações —
// arts. 26.º, 29.º, 30.º, 114.º, 116.º e 117.º do RGIT, art. 78.º da LGT,
// art. 70.º do CPPT e arts. 57.º e 58.º-A do CIRS.
const REV_INFRACOES = "2026-08-07";
// Data de verificação do bloco da proteção social dos independentes e das
// pensões — art. 53.º do CIRS e o Código dos Regimes Contributivos.
const REV_PROTECAO_2026 = "2026-08-07";
// Data de verificação do bloco da faturação e do regime de isenção de IVA —
// arts. 36.º, 53.º, 58.º e 78.º do CIVA na coleção consolidada, já com a
// redação do Decreto-Lei n.º 35/2025.
const REV_FATURACAO = "2026-08-07";
// Data de verificação do bloco da família — art. 13.º, art. 78.º (n.os 9 a
// 12) e art. 83.º-A do CIRS, e arts. 6.º e 26.º do Código do Imposto do Selo.
const REV_FAMILIA = "2026-08-07";
// Data de verificação da secção «Gerir uma empresa»: arts. 31.º, 33.º e
// 34.º do CIRC, arts. 43.º-C e 43.º-D do EBF e art. 72.º, n.º 1, al. f)
// do CIRS, lidos no articulado do Portal das Finanças.
const REV_EMPRESA = "2026-08-07";
// Data de verificação do Código do Trabalho: articulado consolidado lido na
// base da PGD Lisboa, com a lista de alterações confirmada contra a DGERT —
// ambas terminam na Lei n.º 32/2025, de 27 de março.
const REV_TRABALHO = "2026-08-07";
// Data de verificação dos coeficientes de desvalorização da moeda (Portaria 382/2025).
const REV_COEF_MOEDA = "2026-06-23";
// Data de verificação do Salário Mínimo Nacional 2026 (RMMG 920 €, DL 139/2025).
const REV_SMN = "2026-07-14";
// Data de leitura direta do articulado do CIMI, CIMT, TGIS e dos artigos do
// CIRS/CIRC do património. Até aqui, vários destes parâmetros vinham do guia
// fiscal da PwC — boa leitura, mas leitura de terceiros. Onde a lei fixa o
// número, passa a ser a lei a sustentá-lo.
const REV_PATRIMONIO = "2026-08-06";

// ═══════════════════════════════════════════════════════════════════════
//  INDEXANTE DOS APOIOS SOCIAIS (IAS) — base de vários limites
// ═══════════════════════════════════════════════════════════════════════
export const IAS = sv(
  537.13,
  "Indexante dos Apoios Sociais (IAS) 2026",
  "segSocialGov",
  TODAY,
  "Base de cálculo de limites da Segurança Social e do teto do IRS Jovem."
);

// ═══════════════════════════════════════════════════════════════════════
//  IRS — RETENÇÃO NA FONTE (categoria B) — adiantamento, não imposto final
// ═══════════════════════════════════════════════════════════════════════
export type TipoAtividade = "art151" | "outros" | "vendas" | "diretosAutor";

/** Conjunto fechado dos tipos, para validar dados que vêm de fora (RC-P1-12). */
export const TIPOS_ATIVIDADE = ["art151", "outros", "vendas", "diretosAutor"] as const;

export const RETENCAO: Record<TipoAtividade, Sourced<number>> = {
  art151: sv(
    0.23,
    "Art. 101.º, n.º 1, al. a) CIRS · Art. 151.º CIRS",
    "art101cirs",
    TODAY,
    "Profissões liberais. Reduzida de 25% para 23% pelo OE2025; mantém-se em 2026."
  ),
  outros: sv(
    0.115,
    "Art. 101.º CIRS — atividades não previstas no Art. 151.º",
    "art101cirs",
    TODAY
  ),
  vendas: sv(
    0,
    "Vendas de bens/mercadorias — não sujeitas a retenção na fonte",
    "art101cirs",
    TODAY,
    "A retenção na fonte incide sobre prestações de serviços, não sobre vendas de bens."
  ),
  diretosAutor: sv(
    0.165,
    "Art. 101.º CIRS — direitos de autor e propriedade intelectual",
    "art101cirs",
    TODAY
  ),
};

export const META_TIPO: Record<TipoAtividade, { label: string; sub: string; info: string }> = {
  art151: {
    label: "Profissão do Art. 151.º",
    sub: "Programadores, designers, consultores, arquitetos, médicos…",
    info: "Profissões liberais listadas na tabela do Art. 151.º do CIRS. Retenção de 23% e coeficiente de 0,75 no regime simplificado.",
  },
  outros: {
    label: "Outras prestações de serviços",
    sub: "Serviços não previstos no Art. 151.º (código 1519)",
    info: "Serviços que não constam da tabela do Art. 151.º. Retenção de 11,5% e coeficiente de 0,35.",
  },
  vendas: {
    label: "Venda de bens / hotelaria",
    sub: "Comércio, produção, restauração e bebidas",
    info: "Vendas de mercadorias/produtos e atividades de restauração e hotelaria. Sem retenção na fonte e coeficiente de 0,15. A Segurança Social incide sobre 20% do rendimento.",
  },
  diretosAutor: {
    label: "Direitos de autor / propriedade intelectual",
    sub: "Royalties, licenciamento, propriedade industrial",
    info: "Cessão ou utilização de propriedade intelectual/industrial. Retenção de 16,5% e coeficiente de 0,95.",
  },
};

/** Limiar de dispensa de retenção na fonte (rendimento anual estimado). */
export const DISPENSA_RETENCAO_LIMITE = sv(
  15000,
  "Art. 101.º-B, n.º 1, al. a) CIRS",
  "art101bCirs",
  TODAY,
  "Quem prevê faturar menos do que este valor no ano pode dispensar a retenção na fonte."
);

// ═══════════════════════════════════════════════════════════════════════
//  IVA — isenção (Art. 53.º) e taxas por região
// ═══════════════════════════════════════════════════════════════════════
export const IVA_ISENCAO_LIMITE = sv(
  15000,
  "Art. 53.º CIVA",
  "portalFinancasIVA",
  TODAY,
  "Volume de negócios anual abaixo do qual há isenção de IVA."
);

/** Acima de 125% do limite de isenção, passa imediatamente ao regime normal. */
export const IVA_ISENCAO_EXCESSO = sv(
  18750,
  "Art. 53.º / Art. 58.º CIVA — excesso de 25% sobre o limiar",
  "portalFinancasIVA",
  TODAY
);

export type Regiao = "continente" | "madeira" | "acores";
export type EscalaoIVA = "reduzida" | "intermedia" | "normal";

/** Conjuntos fechados, para validar dados persistidos (RC-P1-12). */
export const REGIOES = ["continente", "madeira", "acores"] as const;
export const ESCALOES_IVA = ["reduzida", "intermedia", "normal"] as const;
/** Regime de IVA de um recibo: isento (Art. 53.º) ou uma das taxas. */
export const REGIMES_IVA = ["isento", "reduzida", "intermedia", "normal"] as const;

export const IVA_TAXAS: Record<Regiao, Sourced<Record<EscalaoIVA, number>>> = {
  continente: sv(
    { reduzida: 0.06, intermedia: 0.13, normal: 0.23 },
    "Art. 18.º CIVA — Portugal continental",
    "occIVA",
    TODAY
  ),
  madeira: sv(
    { reduzida: 0.04, intermedia: 0.12, normal: 0.22 },
    "Art. 18.º CIVA — Região Autónoma da Madeira (DLR 6/2024/M: reduzida 4% desde out/2024)",
    "occIVA",
    TODAY
  ),
  acores: sv(
    { reduzida: 0.04, intermedia: 0.09, normal: 0.16 },
    "Art. 18.º CIVA — Região Autónoma dos Açores",
    "occIVA",
    TODAY
  ),
};

export const META_REGIAO: Record<Regiao, string> = {
  continente: "Continente",
  madeira: "Madeira",
  acores: "Açores",
};

// ───────────────────────────────────────────────────────────────────────
//  IVA ESPERADO POR CATEGORIA DE ATIVIDADE (fonte única guiado + completo)
// ───────────────────────────────────────────────────────────────────────
// As categorias dos simuladores de recibos verdes agrupam os tipos fiscais
// canónicos numa forma amigável. Nota importante: "hosped" (alojamento local /
// restauração) resolve fiscalmente para "vendas" no coeficiente e na retenção,
// MAS tem taxa de IVA própria (intermédia — Verba 3.1 da Lista II do CIVA). Por
// isso a taxa de IVA habitual é mapeada por CATEGORIA de UI, não pelo tipo
// canónico. Esta é a ÚNICA definição — o modo guiado e o modo completo leem
// daqui, para nunca divergirem (antes estava hardcoded em 3 sítios).

/** Categorias de atividade dos simuladores de recibos verdes (guiado + completo). */
export type CategoriaSimuladorRV = "art151" | "vendas" | "hosped" | "outras" | "prop_int";

/** Taxa de IVA habitual de uma categoria (inclui "isento" para casos do Art. 9.º). */
export type IvaEsperado = EscalaoIVA | "isento";

export interface AtividadeIvaMeta {
  /** Taxa de IVA habitual/por omissão — deriva o regime efetivo e assinala
   *  taxas fora do comum. NÃO substitui a análise da operação concreta. */
  esperado: IvaEsperado;
  /** Nota quando o enquadramento de IVA não tem um único valor habitual (ex.:
   *  direitos de autor — obra própria isenta vs royalties à taxa normal). */
  notaIVA?: string;
}

const NOTA_IVA_DIREITOS_AUTOR =
  "Direitos de autor da obra própria (livros, música, arte) são isentos de IVA, sem limite de faturação (Art. 9.º, n.º 16 CIVA). Royalties e licenciamento (software, marca, patente) são tributados à taxa normal (23%). Confirma o teu caso com o contabilista.";

export const IVA_ESPERADO_POR_CATEGORIA: Sourced<Record<CategoriaSimuladorRV, AtividadeIvaMeta>> = sv(
  {
    art151: { esperado: "normal" },
    vendas: { esperado: "normal" },
    hosped: { esperado: "intermedia" },
    outras: { esperado: "normal" },
    prop_int: { esperado: "normal", notaIVA: NOTA_IVA_DIREITOS_AUTOR },
  },
  "Art. 18.º CIVA — taxa aplicável por natureza da operação (Listas I e II anexas ao CIVA): serviços não listados à taxa normal; restauração/alojamento à taxa intermédia (Verba 3.1 da Lista II); direitos de autor de obra própria isentos (Art. 9.º, n.º 16 CIVA).",
  "art18civa",
  TODAY,
  "Taxa HABITUAL da categoria, não uma garantia. «outras» reúne serviços diversos — a maioria é normal (23%), mas alguns (ex.: explicações/ensino, Art. 9.º) podem ser isentos; por isso o simulador só assinala «confirma com o contabilista» quando a taxa escolhida difere da habitual."
);

/**
 * Remapeia uma taxa de IVA de uma região para outra, preservando o ESCALÃO
 * (reduzida/intermédia/normal); "isento" (0) e valores não-padrão mantêm-se.
 * Usado para sincronizar as taxas dos recibos "recibo a recibo" quando o
 * utilizador muda de região — o escalão escolhido é preservado, mas o valor
 * numérico passa a ser o da nova região (ex.: normal 23% no Continente → 22%
 * na Madeira → 16% nos Açores). Evita o hardcoded de uma taxa fixa por omissão.
 */
export function remapTaxaIvaEntreRegioes(taxa: number, de: Regiao, para: Regiao): number {
  const a = IVA_TAXAS[de].value;
  const b = IVA_TAXAS[para].value;
  if (taxa === a.reduzida) return b.reduzida;
  if (taxa === a.intermedia) return b.intermedia;
  if (taxa === a.normal) return b.normal;
  return taxa;
}

// ═══════════════════════════════════════════════════════════════════════
//  SEGURANÇA SOCIAL — trabalhadores independentes
// ═══════════════════════════════════════════════════════════════════════
export const SS_TAXA = sv(
  0.214,
  "Art. 168.º do Código Contributivo — taxa contributiva do TI",
  "segSocialGov",
  TODAY
);

/** Coeficiente do rendimento relevante consoante a natureza da atividade. */
export type BaseSS = "servicos" | "bens";
/** Conjunto fechado das bases, para validar dados persistidos (RC-P1-12). */
export const BASES_SS = ["servicos", "bens"] as const;
export const SS_COEFICIENTE: Record<BaseSS, Sourced<number>> = {
  servicos: sv(0.7, "Art. 162.º Código Contributivo — prestação de serviços", "segSocialGov", TODAY),
  bens: sv(
    0.2,
    "Art. 162.º Código Contributivo — produção/venda de bens, hotelaria e restauração",
    "segSocialGov",
    TODAY
  ),
};

export const META_BASE_SS: Record<BaseSS, { label: string; sub: string }> = {
  servicos: { label: "Prestação de serviços", sub: "Base de 70% do rendimento" },
  bens: { label: "Venda de bens / hotelaria", sub: "Base de 20% do rendimento" },
};

/** Teto mensal do rendimento relevante = 12 × IAS. */
export const SS_BASE_MAX_MENSAL = sv(
  6445.56,
  "Limite de 12 × IAS ao rendimento relevante mensal médio",
  "segSocialGov",
  TODAY
);

export const SS_ISENCAO_PRIMEIRO_ANO_MESES = sv(
  12,
  "Art. 157.º Código Contributivo — isenção nos primeiros 12 meses de atividade",
  "segSocialGov",
  TODAY,
  "Aplica-se a quem não teve atividade independente nos 3 anos anteriores."
);

/**
 * Art. 157.º n.º 1 al. a) do Código Contributivo — quem acumula atividade
 * independente com trabalho por conta de outrem só está dispensado de
 * contribuir enquanto o rendimento relevante mensal médio for **inferior a
 * 4 × IAS**. Acima disso contribui sobre o EXCEDENTE (e sem o mínimo de 20 €).
 *
 * Não é, portanto, uma isenção total: era assim que o motor a tratava, e a
 * partir de ~36 800 €/ano de faturação de serviços isso apagava contribuições
 * na ordem dos milhares de euros.
 *
 * A dispensa exige ainda condições cumulativas que o simulador não consegue
 * verificar (entidades sem relação de domínio entre si, o outro regime cobrir
 * as mesmas eventualidades e a remuneração desse regime ser ≥ 1 × IAS) — daí
 * a nota, para o resultado não passar por certificado.
 */
export const SS_ACUMULACAO_LIMITE_IAS = sv(
  4,
  "Art. 157.º n.º 1 al. a) Código Contributivo — dispensa até 4 × IAS de rendimento relevante mensal médio",
  "segSocialGov",
  TODAY,
  "Acima do limite contribui-se sobre o excedente, sem contribuição mínima. Depende ainda de a remuneração do trabalho dependente ser ≥ 1 × IAS."
);

/** Valor do limite de acumulação em euros por mês (4 × IAS). */
export const SS_ACUMULACAO_LIMITE_MENSAL = sv(
  Math.round(SS_ACUMULACAO_LIMITE_IAS.value * IAS.value * 100) / 100,
  "Art. 157.º n.º 1 al. a) Código Contributivo — 4 × IAS",
  "segSocialGov",
  TODAY
);

// ═══════════════════════════════════════════════════════════════════════
//  REGIME SIMPLIFICADO (IRS) — coeficientes para o rendimento tributável
// ═══════════════════════════════════════════════════════════════════════
export const REGIME_SIMPLIFICADO = {
  limite: sv(
    200000,
    "Art. 28.º CIRS — limite de rendimento bruto do regime simplificado",
    "art68cirs",
    TODAY
  ),
  coefServicos151: sv(0.75, "Art. 31.º, n.º 1, al. b) CIRS — serviços do Art. 151.º", "art31", TODAY),
  coefOutrosServicos: sv(0.35, "Art. 31.º, n.º 1, al. c) CIRS — outras prestações de serviços", "art31", TODAY),
  coefVendas: sv(0.15, "Art. 31.º, n.º 1, al. a) CIRS — vendas de bens, restauração e hotelaria", "art31", TODAY),
  coefPropIntelectual: sv(0.95, "Art. 31.º, n.º 1, al. d) CIRS — propriedade intelectual/industrial", "art31", TODAY),
  // O AL em moradia ou apartamento está EXPRESSAMENTE EXCLUÍDO da al. a) —
  // a das atividades hoteleiras — e cai por isso na regra geral das
  // prestações de serviços da al. c). Lido no articulado a 2026-08-06; até
  // aqui a fonte era um artigo da OCC, boa leitura mas leitura de terceiros.
  coefAlojamentoMoradia: sv(
    0.35,
    "Art. 31.º, n.º 1, al. c) CIRS — o AL em moradia ou apartamento é excluído da al. a) e cai na regra geral das prestações de serviços",
    "art31",
    REV_PATRIMONIO
  ),
  coefAlojamentoContencao: sv(
    0.5,
    "Art. 31.º, n.º 1, al. h) CIRS (aditada pela Lei n.º 2/2020) — AL em moradia ou apartamento localizado em área de contenção",
    "art31",
    REV_PATRIMONIO,
    "A delimitação das áreas é municipal e muda: verifica-se por morada, na câmara do concelho. A al. h) não consta do n.º 2, pelo que não permite a dedução autónoma das contribuições obrigatórias."
  ),
  coefTransparencia: sv(1.0, "Art. 31.º, n.º 1, al. g) CIRS — serviços a sociedade onde detém ≥ 5%", "art31", TODAY),
  coefSubsidiosNaoExploracao: sv(
    0.3,
    "Art. 31.º, n.º 1, al. e) CIRS — subsídios ou subvenções não destinados à exploração",
    "art31",
    TODAY,
    "Tributados em 1/5 no ano de recebimento e em cada um dos quatro anos seguintes."
  ),
  coefSubsidiosExploracao: sv(
    0.1,
    "Art. 31.º, n.º 1, al. f) CIRS — subsídios destinados à exploração e restantes rendimentos da categoria B",
    "art31",
    TODAY
  ),
};

/**
 * Indisponibilidade do crédito tributário — Art. 30.º, n.os 2 e 3 da LGT.
 *
 * É a norma de onde nasce a tese de que as dívidas fiscais e à Segurança
 * Social não são abrangidas pela exoneração do passivo restante. O n.º 3,
 * aditado pela Lei n.º 55-A/2010, é o que a torna decisiva: manda-a
 * prevalecer sobre qualquer legislação especial — e o Código da
 * Insolvência é legislação especial.
 *
 * O motor guarda o texto da norma, não a conclusão. A questão de saber se
 * a exoneração abrange créditos tributários tem decisões judiciais em
 * sentidos diferentes, e não é ao motor fiscal que compete fechá-la — é
 * por isso que o guia a apresenta em aberto.
 */
export const CREDITO_TRIBUTARIO_INDISPONIVEL = {
  regra: sv(
    "o crédito tributário é indisponível",
    "Art. 30.º, n.º 2 LGT — só podendo fixar-se condições para a sua redução ou extinção com respeito pelo princípio da igualdade e da legalidade tributária",
    "lgt30",
    REV_INFRACOES
  ),
  prevaleceSobreLegislacaoEspecial: sv(
    true,
    "Art. 30.º, n.º 3 LGT (aditado pela Lei n.º 55-A/2010) — o disposto no número anterior prevalece sobre qualquer legislação especial",
    "lgt30",
    REV_INFRACOES,
    "É este número que sustenta a tese de que a exoneração do passivo restante não abrange créditos tributários. A jurisprudência não é unânime."
  ),
} as const;


/**
 * Faturar — os prazos do Art. 36.º e as regularizações do Art. 78.º do
 * CIVA, lidos na coleção consolidada a 07/08/2026.
 *
 * O prazo da fatura não é um só: são três, e o que os separa é o momento
 * em que o imposto se torna devido. O caso dos adiantamentos é o que mais
 * apanha gente — a fatura emite-se na DATA DO RECEBIMENTO, mesmo que o
 * serviço ainda não tenha sido prestado.
 */
export const FATURACAO_PRAZOS = {
  /** A regra geral. */
  regraGeralDiasUteis: sv(
    5,
    "Art. 36.º, n.º 1, al. a) CIVA — a fatura deve ser emitida o mais tardar no 5.º dia útil seguinte ao do momento em que o imposto é devido nos termos do Art. 7.º",
    "civa36",
    REV_FATURACAO
  ),
  /** Prestações intracomunitárias de serviços tributáveis noutro Estado. */
  intracomunitariasAteDiaDoMesSeguinte: sv(
    15,
    "Art. 36.º, n.º 1, al. b) CIVA — o mais tardar no 15.º dia do mês seguinte àquele em que o imposto é devido, nas prestações intracomunitárias de serviços tributáveis no território de outro Estado-Membro",
    "civa36",
    REV_FATURACAO
  ),
  /** Adiantamentos: o caso que apanha mais gente. */
  adiantamentos: sv(
    "na data do recebimento",
    "Art. 36.º, n.º 1, al. c) CIVA — no caso de pagamentos relativos a transmissão de bens ou prestação de serviços ainda não efetuada",
    "civa36",
    REV_FATURACAO,
    "Um sinal recebido em dezembro por trabalho de janeiro fatura-se em dezembro."
  ),
  /** Faturas globais. */
  globaisDiasUteis: sv(
    5,
    "Art. 36.º, n.º 2 CIVA — o processamento das faturas globais não pode ir além de cinco dias úteis do termo do período a que respeitam",
    "civa36",
    REV_FATURACAO
  ),
} as const;

/**
 * Regularizações de IVA — Art. 78.º do CIVA.
 *
 * A assimetria é toda a matéria: corrigir a favor do Estado é
 * OBRIGATÓRIO e tem prazo curto sem penalidade; corrigir a favor do
 * sujeito passivo é FACULTATIVO, tem prazo longo — e exige prova.
 */
export const REGULARIZACAO_IVA = {
  /** Anulação ou redução do valor tributável. */
  anulacaoAtePeriodoSeguinte: sv(
    "até ao final do período de imposto seguinte",
    "Art. 78.º, n.º 2 CIVA — anulada a operação ou reduzido o valor tributável, o fornecedor pode deduzir o imposto correspondente até ao final do período de imposto seguinte àquele em que se verificarem as circunstâncias",
    "civa78",
    REV_FATURACAO
  ),
  /** Imposto liquidado a menos: obrigatório. */
  aMenosObrigatorio: sv(
    true,
    "Art. 78.º, n.º 3 CIVA — nos casos de faturas inexatas, a retificação é obrigatória quando houver imposto liquidado a menos, podendo ser efetuada sem qualquer penalidade até ao final do período seguinte àquele a que respeita a fatura",
    "civa78",
    REV_FATURACAO
  ),
  /** Imposto liquidado a mais: facultativo, com prazo de dois anos. */
  aMaisPrazoAnos: sv(
    2,
    "Art. 78.º, n.º 3 CIVA — a retificação é facultativa quando houver imposto liquidado a mais, mas apenas pode ser efetuada no prazo de dois anos",
    "civa78",
    REV_FATURACAO
  ),
  /** A condição que invalida a regularização mal feita. */
  provaExigida: sv(
    "prova de que o adquirente tomou conhecimento da retificação ou de que foi reembolsado do imposto",
    "Art. 78.º, n.º 5 CIVA — sem ela, considera-se indevida a respetiva dedução",
    "civa78",
    REV_FATURACAO
  ),
  /** O prazo do lado de quem recebe a nota de crédito. */
  adquirenteCorrigeAte: sv(
    "até ao fim do período de imposto seguinte ao da receção do documento retificativo",
    "Art. 78.º, n.º 4 CIVA — o adquirente sujeito passivo corrige a dedução efetuada",
    "civa78",
    REV_FATURACAO
  ),
} as const;

/**
 * O regime de isenção do Art. 53.º e a sua cessação (Art. 58.º), na
 * redação do Decreto-Lei n.º 35/2025.
 *
 * A reforma de 2025 fez duas coisas ao mesmo tempo: mudou a epígrafe do
 * Art. 53.º para «Âmbito de aplicação no território nacional» e abriu o
 * regime a sujeitos passivos de outros Estados-Membros — com um segundo
 * limiar, este à escala da União, e um número de identificação próprio
 * com o sufixo «EX».
 */
export const ISENCAO_IVA_REGIME = {
  /** O limiar nacional. */
  limiarNacional: sv(
    15000,
    "Art. 53.º, n.º 1 CIVA (redação do Decreto-Lei n.º 35/2025) — volume de negócios anual em território nacional não superior a 15 000 €, no ano civil anterior",
    "civa53",
    REV_FATURACAO
  ),
  /** O limiar do regime transfronteiriço. */
  limiarUniao: sv(
    100000,
    "Art. 53.º, n.º 2, al. a) CIVA — o volume de negócios anual na União Europeia do sujeito passivo não pode exceder 100 000 €",
    "civa53",
    REV_FATURACAO
  ),
  /** O identificador do regime transfronteiriço. */
  sufixoIdentificacao: sv(
    "EX",
    "Art. 53.º, n.º 2, al. c) CIVA — número individual de identificação com o sufixo «EX», obtido no Estado-Membro de estabelecimento",
    "civa53",
    REV_FATURACAO
  ),
  /** O que a isenção custa. */
  semDireitoADeducao: sv(
    true,
    "Art. 53.º, n.º 3 CIVA — os sujeitos passivos isentos estão excluídos do direito à dedução previsto nos artigos 19.º e 20.º e do direito ao reembolso",
    "civa53",
    REV_FATURACAO
  ),
  /** A margem que torna a mudança imediata. */
  excessoQueTornaImediato: sv(
    0.25,
    "Art. 58.º, n.º 2, al. b) CIVA — deixa de poder beneficiar da isenção quem, no ano civil em curso, exceda o limiar em mais de 25%",
    "civa58",
    REV_FATURACAO
  ),
  /** Quando passa a ser devido imposto, em cada caso. */
  efeitoNoAnoSeguinte: sv(
    "a partir de 1 de janeiro do ano seguinte",
    "Art. 58.º, n.º 4, al. a) CIVA — quando o limiar tenha sido ultrapassado no ano civil anterior",
    "civa58",
    REV_FATURACAO
  ),
  efeitoImediato: sv(
    "a partir do momento em que o limiar é excedido em mais de 25%",
    "Art. 58.º, n.º 4, al. b) CIVA",
    "civa58",
    REV_FATURACAO
  ),
  /** O prazo da declaração de alterações. */
  prazoDeclaracaoAlteracoesDiasUteis: sv(
    15,
    "Art. 58.º, n.º 5 CIVA — declaração de alterações do Art. 32.º, no prazo de 15 dias úteis",
    "civa58",
    REV_FATURACAO
  ),
} as const;


/**
 * A declaração periódica de IVA — Arts. 41.º e 27.º do CIVA, lidos na
 * coleção consolidada a 07/08/2026, já com as alterações do Decreto-Lei
 * n.º 49/2025.
 *
 * O pacote dá os prazos mas não dá o número que decide qual deles se
 * aplica: o limiar de 650 000 € de volume de negócios do ano anterior. É
 * ele que separa quem entrega todos os meses de quem entrega por
 * trimestre — e quem o ultrapassa passa a mensal a partir de 1 de janeiro
 * do ano seguinte, mediante declaração de alterações entregue em janeiro.
 */
export const DECLARACAO_PERIODICA_IVA = {
  /** O limiar que separa mensal de trimestral. */
  limiarMensal: sv(
    650000,
    "Art. 41.º, n.º 1 CIVA — periodicidade mensal para volume de negócios igual ou superior a 650 000 € no ano civil anterior; trimestral abaixo disso",
    "civa41",
    REV_FATURACAO
  ),
  /** Dia-limite de entrega. */
  diaEntrega: sv(
    20,
    "Art. 41.º, n.º 1 CIVA — até ao dia 20 do 2.º mês seguinte àquele a que respeitam as operações, ou ao trimestre",
    "civa41",
    REV_FATURACAO
  ),
  /** Dia-limite de pagamento. */
  diaPagamento: sv(
    25,
    "Art. 27.º, n.º 1 CIVA — até ao dia 25 do 2.º mês seguinte àquele a que respeitam as operações, ou ao trimestre",
    "civa27",
    REV_FATURACAO
  ),
  /** Quantos meses depois do período. */
  mesesAposPeriodo: sv(
    2,
    "Arts. 41.º e 27.º CIVA — os prazos contam-se sobre o 2.º mês seguinte ao período",
    "civa41",
    REV_FATURACAO
  ),
  /** A opção pelo regime mensal, e quando se exerce. */
  opcaoMensalEmJaneiro: sv(
    true,
    "Art. 41.º, n.os 2 e 3, al. b) CIVA — os sujeitos passivos trimestrais podem optar pelo envio mensal; estando já registados, a declaração de alterações só pode ser apresentada durante o mês de janeiro, produzindo efeitos a partir de 1 de janeiro",
    "civa41",
    REV_FATURACAO
  ),
} as const;


/**
 * Coimas tributárias — o RGIT, lido no articulado a 07/08/2026.
 *
 * Três artigos que quase nunca são lidos juntos, e que só juntos fazem
 * sentido: o 26.º fixa os tetos e os pisos, o 29.º a DISPENSA e o 30.º a
 * REDUÇÃO. Dispensa e redução não são graus da mesma coisa — têm
 * pressupostos diferentes, e quem confunde as duas pede a errada.
 */
export const COIMAS_RGIT = {
  /** Falta ou atraso de declarações — o caso mais comum. */
  faltaDeclaracoesMin: sv(
    150,
    "Art. 116.º, n.º 1 RGIT — a falta de declarações que devam ser apresentadas para a AT determinar, avaliar ou comprovar a matéria coletável, e a sua prestação fora do prazo legal, é punível com coima de 150 € a 3 750 €",
    "rgit116",
    REV_INFRACOES
  ),
  faltaDeclaracoesMax: sv(
    3750,
    "Art. 116.º, n.º 1 RGIT — limite máximo",
    "rgit116",
    REV_INFRACOES
  ),
  /** Declarações de início, alteração ou cessação de atividade. */
  inicioAlteracaoCessacaoMin: sv(
    300,
    "Art. 117.º, n.º 2 RGIT — a falta de apresentação, ou apresentação fora do prazo, das declarações de início, alteração ou cessação de atividade é punível com coima de 300 € a 7 500 €",
    "rgit117",
    REV_INFRACOES
  ),
  inicioAlteracaoCessacaoMax: sv(
    7500,
    "Art. 117.º, n.º 2 RGIT — limite máximo",
    "rgit117",
    REV_INFRACOES
  ),
  /** O piso absoluto do que se paga. */
  minimoAPagar: sv(
    50,
    "Art. 26.º, n.º 3 RGIT — o montante mínimo da coima a pagar é de 50 €",
    "rgit26",
    REV_INFRACOES
  ),
  /** E o piso quando há redução — é este que decide o caso comum. */
  minimoComReducao: sv(
    25,
    "Art. 26.º, n.º 3 RGIT — exceto em caso de redução da coima, em que o mínimo a pagar é de 25 €",
    "rgit26",
    REV_INFRACOES,
    "12,5% de 150 € dariam 18,75 €: é este piso que faz o valor subir para 25 €."
  ),
  /** Pessoas singulares pagam no máximo metade dos tetos das coletivas. */
  fracaoLimitesPessoaSingular: sv(
    0.5,
    "Art. 26.º, n.º 2 RGIT — as coimas aplicáveis às pessoas singulares não podem exceder metade dos limites estabelecidos para as pessoas coletivas",
    "rgit26",
    REV_INFRACOES
  ),
  /** E as coletivas veem os limites dos tipos legais dobrados. */
  fatorPessoaColetiva: sv(
    2,
    "Art. 26.º, n.º 4 RGIT — os limites mínimo e máximo das coimas previstas nos diferentes tipos legais são elevados para o dobro quando aplicadas a pessoa coletiva ou entidade equiparada",
    "rgit26",
    REV_INFRACOES
  ),
} as const;

/**
 * Redução da coima — Art. 30.º do RGIT, na redação da Lei n.º 7/2021 (em
 * vigor desde 1 de janeiro de 2022).
 *
 * Duas percentagens e um relógio. O que as separa não é a gravidade da
 * falta: é o MOMENTO em que se pede, medido contra a ação da AT.
 *
 * E há um n.º 5 que muda o guia todo: quando a regularização não depende
 * de tributo a liquidar pelos serviços, «vale como pedido de redução a
 * entrega da prestação tributária ou do documento ou declaração em
 * falta». Ou seja — na maior parte dos casos, entregar a declaração É o
 * pedido. Não há formulário a preencher.
 */
export const REDUCAO_COIMA = {
  antesDeQualquerAcao: sv(
    0.125,
    "Art. 30.º, n.º 1, al. a) RGIT — sem que tenha sido levantado auto de notícia, recebida participação ou denúncia ou iniciado procedimento de inspeção tributária, para 12,5% do montante mínimo legal",
    "rgit30",
    REV_INFRACOES
  ),
  ateAudicaoPrevia: sv(
    0.5,
    "Art. 30.º, n.º 1, al. b) RGIT — até ao termo do prazo para apresentação de audição prévia no âmbito de procedimento de inspeção tributária, para 50% do montante mínimo legal",
    "rgit30",
    REV_INFRACOES
  ),
  /** Sobre que valor incidem as percentagens. */
  baseDeCalculo: sv(
    "o montante mínimo legal, e considera-se sempre o estabelecido para os casos de negligência",
    "Art. 30.º, n.º 2 RGIT",
    "rgit30",
    REV_INFRACOES
  ),
  /** Prazo para pagar depois de notificado da coima reduzida. */
  prazoPagamentoDias: sv(
    30,
    "Art. 30.º, n.º 3, al. a) RGIT — o direito à redução depende do pagamento nos 30 dias posteriores à notificação da coima reduzida e da regularização da situação tributária no mesmo prazo",
    "rgit30",
    REV_INFRACOES
  ),
  /** Quando é que o pedido é implícito. */
  pedidoImplicito: sv(
    "a entrega da prestação tributária ou do documento ou declaração em falta",
    "Art. 30.º, n.º 5 RGIT — sempre que a regularização não dependa de tributo a liquidar pelos serviços, vale como pedido de redução",
    "rgit30",
    REV_INFRACOES
  ),
} as const;

/**
 * Dispensa de coima — Art. 29.º do RGIT, na redação da Lei n.º 7/2021.
 *
 * Não é uma redução maior: é outra coisa. O n.º 1 é um travão automático
 * baseado num historial limpo de cinco anos; o n.º 2 é uma via própria,
 * que exige ausência de prejuízo efetivo e regularização, e que tem de
 * ser REQUERIDA no prazo da defesa.
 */
export const DISPENSA_COIMA = {
  anosDeHistorialLimpo: sv(
    5,
    "Art. 29.º, n.º 1 RGIT — não pode ser aplicada coima quando o agente, nos cinco anos anteriores, não tenha sido condenado por infração tributária nem beneficiado de dispensa ou de coima reduzida",
    "rgit29",
    REV_INFRACOES
  ),
  exigeSemPrejuizoEfetivo: sv(
    true,
    "Art. 29.º, n.º 2, al. a) RGIT — a prática da infração não pode ocasionar prejuízo efetivo à receita tributária",
    "rgit29",
    REV_INFRACOES,
    "E o n.º 3 fecha a porta ao caso mais comum: existe SEMPRE prejuízo efetivo quando esteja em causa falta de entrega da prestação tributária."
  ),
  requeridaNoPrazoDeDefesa: sv(
    true,
    "Art. 29.º, n.º 4 RGIT — a dispensa deve ser requerida no prazo concedido para a defesa, devendo a falta ser regularizada até ao termo desse prazo",
    "rgit29",
    REV_INFRACOES
  ),
} as const;

/** Falta de entrega da prestação tributária — Art. 114.º do RGIT. */
export const FALTA_ENTREGA_PRESTACAO = {
  negligenciaMin: sv(
    0.15,
    "Art. 114.º, n.º 2 RGIT — sendo a conduta imputável a título de negligência, coima variável entre 15% e metade do imposto em falta",
    "rgit114",
    REV_INFRACOES
  ),
  negligenciaMax: sv(
    0.5,
    "Art. 114.º, n.º 2 RGIT — limite superior no caso de negligência",
    "rgit114",
    REV_INFRACOES
  ),
  doloFatorMax: sv(
    2,
    "Art. 114.º, n.º 1 RGIT — coima variável entre o valor da prestação em falta e o seu dobro",
    "rgit114",
    REV_INFRACOES
  ),
} as const;

/**
 * Corrigir depois de entregue — os prazos do Art. 78.º da LGT e do Art.
 * 70.º do CPPT.
 *
 * O pacote manda confirmar estes prazos antes de indicar números. Estão
 * confirmados, e são três relógios diferentes que costumam ser tratados
 * como um só.
 */
export const REVISAO_E_RECLAMACAO = {
  /** Reclamação graciosa da liquidação. */
  reclamacaoGraciosaDias: sv(
    120,
    "Art. 70.º, n.º 1 CPPT — a reclamação graciosa é apresentada no prazo de 120 dias contados a partir dos factos previstos no n.º 1 do Art. 102.º",
    "cppt70",
    REV_INFRACOES
  ),
  /** Revisão por iniciativa da AT, por erro dos serviços. */
  revisaoPorErroDosServicosAnos: sv(
    4,
    "Art. 78.º, n.º 1 LGT — por iniciativa da administração tributária, no prazo de quatro anos após a liquidação, ou a todo o tempo se o tributo ainda não tiver sido pago, com fundamento em erro imputável aos serviços",
    "lgt78",
    REV_INFRACOES,
    "O pedido do contribuinte dirigido ao órgão competente interrompe este prazo (n.º 7)."
  ),
  /** A via excecional da injustiça grave ou notória. */
  injusticaGraveAnos: sv(
    3,
    "Art. 78.º, n.º 4 LGT — o dirigente máximo do serviço pode autorizar, excecionalmente, nos três anos posteriores ao ato tributário, a revisão da matéria tributável com fundamento em injustiça grave ou notória",
    "lgt78",
    REV_INFRACOES,
    "Desde que o erro não seja imputável a comportamento negligente do contribuinte."
  ),
  /** Duplicação de coleta. */
  duplicacaoColetaAnos: sv(
    4,
    "Art. 78.º, n.º 6 LGT — a revisão por motivo de duplicação de coleta pode efetuar-se, seja qual for o fundamento, no prazo de quatro anos",
    "lgt78",
    REV_INFRACOES
  ),
} as const;

/**
 * Declaração automática de rendimentos — Art. 58.º-A do CIRS.
 *
 * O pacote deu a página deste artigo como não verificada. Abre, e tem
 * duas regras que decidem o guia inteiro e que quase ninguém conhece:
 *
 *  · não fazer nada NÃO é não entregar. A declaração provisória
 *    converte-se em declaração entregue pelo próprio, no fim do prazo;
 *  · e nesse caso, sendo casado ou unido de facto, o regime que se
 *    observa é o da tributação SEPARADA. Quem beneficiaria da conjunta
 *    perde-a por inação, sem ninguém lho dizer.
 */
export const IRS_AUTOMATICO = {
  /** Prazo para comunicar o agregado familiar. */
  prazoElementosPessoais: sv(
    "até ao final do mês de fevereiro",
    "Art. 58.º-A, n.º 6 CIRS (redação do Decreto-Lei n.º 49/2025) — os sujeitos passivos podem indicar no Portal das Finanças os elementos pessoais relevantes, mediante autenticação de todos os membros do agregado familiar",
    "art58aCirs",
    REV_INFRACOES
  ),
  /** O que acontece a quem não comunica nada. */
  semComunicacaoDeAgregado: sv(
    "usam-se os elementos do ano anterior e, na falta deles, considera-se não casado e sem dependentes",
    "Art. 58.º-A, n.º 7 CIRS",
    "art58aCirs",
    REV_INFRACOES
  ),
  /** O que acontece a quem não confirma nem entrega. */
  seNadaForFeito: sv(
    "a declaração provisória converte-se em declaração entregue pelo sujeito passivo",
    "Art. 58.º-A, n.º 3 CIRS — quando, no fim do prazo do n.º 1 do Art. 60.º, não se tenha verificado a confirmação nem a entrega de qualquer declaração",
    "art58aCirs",
    REV_INFRACOES
  ),
  /** E com que regime de tributação. */
  regimeSeNadaForFeito: sv(
    "tributação separada",
    "Art. 58.º-A, n.º 4, al. b) CIRS — no caso do n.º 3, observa-se, tratando-se de sujeitos passivos casados ou unidos de facto, o regime de tributação separada",
    "art58aCirs",
    REV_INFRACOES,
    "Quem beneficiaria da tributação conjunta perde-a por inação."
  ),
  /** A janela para corrigir sem penalidade. */
  substituicaoSemPenalidadeDias: sv(
    30,
    "Art. 58.º-A, n.º 3 CIRS — o sujeito passivo pode entregar uma declaração de substituição nos 30 dias posteriores à liquidação sem qualquer penalidade",
    "art58aCirs",
    REV_INFRACOES
  ),
  /** Quem é abrangido não está no artigo. */
  universoDefinidoPor: sv(
    "decreto regulamentar",
    "Art. 58.º-A, n.º 8 CIRS — o universo dos sujeitos passivos abrangidos é fixado por decreto regulamentar",
    "art58aCirs",
    REV_INFRACOES,
    "É por isto que o artigo não responde à pergunta «sou abrangido?»: a resposta vive noutro diploma, que muda."
  ),
} as const;

/**
 * Propriedade intelectual — a exclusão parcial do Art. 58.º do EBF.
 *
 * Lido no articulado a 07/08/2026. É um benefício com três travões, e
 * quem só conhece o primeiro fica com uma ideia errada do seu alcance:
 *
 *  · vale só ao **titular originário** — quem criou. Um cessionário de
 *    direitos, um herdeiro ou uma editora não têm direito a ele;
 *  · **exclui** obras escritas sem carácter literário, artístico ou
 *    científico, obras de **arquitetura** e obras **publicitárias**;
 *  · a importância a excluir do englobamento **não pode exceder 10 000 €**
 *    — é um teto sobre o que se exclui, não sobre o que se ganha.
 *
 * Nota de vigência, e é importante: o Art. 58.º está sujeito ao prazo de
 * caducidade do Art. 3.º, n.º 1 do EBF (cinco anos), e NÃO consta da lista
 * de exceções do n.º 3 desse artigo. A última prorrogação que a AT anota na
 * própria página do artigo é a da Lei n.º 21/2021, até 31/12/2021. O texto
 * continua publicado na coleção consolidada sem marca de revogação, mas a
 * vigência para um ano concreto tem de ser confirmada — e é isso que o guia
 * diz ao leitor, em vez de a afirmar.
 */
export const PROPRIEDADE_INTELECTUAL_EBF = {
  /** Fração do rendimento considerada no englobamento. */
  fracaoEnglobada: sv(
    0.5,
    "Art. 58.º, n.º 1 EBF — os rendimentos são considerados no englobamento, para efeitos de IRS, apenas por 50% do seu valor, líquido de outros benefícios",
    "art58EBF",
    REV_PROFISSOES
  ),
  /** Teto do montante que se pode excluir do englobamento. */
  limiteExclusao: sv(
    10000,
    "Art. 58.º, n.º 3 EBF — a importância a excluir do englobamento nos termos do n.º 1 não pode exceder 10 000 €",
    "art58EBF",
    REV_PROFISSOES,
    "O teto morde no que se exclui, não no que se ganha."
  ),
  /** Quem pode usar o benefício. */
  exigeTitularOriginario: sv(
    true,
    "Art. 58.º, n.º 1 EBF — quando auferidos por titulares de direitos de autor ou conexos residentes em território português, desde que sejam os titulares originários",
    "art58EBF",
    REV_PROFISSOES,
    "Cessionários, herdeiros e editoras ficam de fora."
  ),
  /** O que a lei retira expressamente do benefício. */
  excluidas: sv(
    "obras escritas sem carácter literário, artístico ou científico, obras de arquitetura e obras publicitárias",
    "Art. 58.º, n.º 2 EBF — exclusões expressas",
    "art58EBF",
    REV_PROFISSOES
  ),
  /** O que a lei inclui, e costuma surpreender. */
  incluidas: sv(
    "propriedade literária, artística e científica, incluindo a alienação de obras de arte de exemplar único e as obras de divulgação pedagógica e científica",
    "Art. 58.º, n.º 1 EBF — âmbito",
    "art58EBF",
    REV_PROFISSOES
  ),
} as const;

/**
 * Isenções do Art. 9.º do CIVA que decidem a fiscalidade de três profissões
 * inteiras — saúde, formação e explicações. Lidas no articulado a
 * 07/08/2026, na coleção consolidada.
 *
 * São isenções INCOMPLETAS: isentam a operação e, por isso mesmo, retiram
 * o direito à dedução do IVA suportado. Não é «não pagar IVA» — é ficar
 * fora do imposto nos dois sentidos.
 */
export const ISENCOES_CIVA_PROFISSOES = {
  /** Saúde: a isenção é pela PROFISSÃO, não pelo rótulo «serviço de saúde». */
  saude: sv(
    "médico, odontologista, psicólogo, parteiro, enfermeiro e outras profissões paramédicas",
    "Art. 9.º, n.º 1) CIVA (redação da Lei n.º 2/2020) — prestações de serviços efetuadas no exercício destas profissões",
    "civa9",
    REV_PROFISSOES,
    "O n.º 2) acrescenta os serviços médicos e sanitários prestados por estabelecimentos hospitalares e clínicas, e o n.º 3) os protésicos dentários."
  ),
  /** Formação profissional: depende de reconhecimento ministerial. */
  formacaoProfissional: sv(
    "organismos de direito público ou entidades reconhecidas como tendo competência nos domínios da formação e reabilitação profissionais pelos ministérios competentes",
    "Art. 9.º, n.º 10) CIVA — prestações de serviços que tenham por objeto a formação profissional, e transmissões e prestações conexas",
    "civa9",
    REV_PROFISSOES,
    "Sem o reconhecimento, a formação não cabe nesta isenção."
  ),
  /** Explicações: isentas por natureza, sem depender de reconhecimento. */
  licoes: sv(
    "lições ministradas sobre matérias do ensino escolar ou superior",
    "Art. 9.º, n.º 11) CIVA (redação da Lei n.º 82/2023) — prestações de serviços que consistam em lições sobre matérias do ensino escolar ou superior",
    "civa9",
    REV_PROFISSOES,
    "Não depende de reconhecimento nem de volume de negócios: é isenção pela natureza do serviço."
  ),
} as const;

/** Coeficiente do regime simplificado por tipo de atividade. */
export const COEFICIENTE_POR_TIPO: Record<TipoAtividade, number> = {
  art151: REGIME_SIMPLIFICADO.coefServicos151.value,
  outros: REGIME_SIMPLIFICADO.coefOutrosServicos.value,
  vendas: REGIME_SIMPLIFICADO.coefVendas.value,
  diretosAutor: REGIME_SIMPLIFICADO.coefPropIntelectual.value,
};

/** Base da Segurança Social por tipo (vendas/hotelaria = 20%, restante = 70%). */
export const BASE_SS_POR_TIPO: Record<TipoAtividade, BaseSS> = {
  art151: "servicos",
  outros: "servicos",
  vendas: "bens",
  diretosAutor: "servicos",
};

/**
 * Redução do coeficiente no início de atividade (Art. 31.º, n.º 10):
 * −50% no 1.º ano e −25% no 2.º ano de atividade.
 */
export const REDUCAO_COEFICIENTE_ANO = sv<Record<number, number>>(
  { 1: 0.5, 2: 0.25 },
  "Art. 31.º, n.º 10 CIRS — redução de 50% (1.º ano) e 25% (2.º ano)",
  "art31",
  TODAY
);

// ═══════════════════════════════════════════════════════════════════════
//  IRS JOVEM — isenção progressiva (categorias A e B)
// ═══════════════════════════════════════════════════════════════════════
export const IRS_JOVEM = {
  idadeMax: sv(35, "Regime IRS Jovem — até 35 anos no último dia do ano", "art12bCirs", TODAY),
  /** Teto anual de rendimento isento = 55 × IAS. */
  tetoIAS: sv(55, "Teto anual de isenção = 55 × IAS", "art12bCirs", TODAY),
  /** Percentagem de isenção por ano de obtenção de rendimentos (1 a 10). */
  isencaoPorAno: sv<Record<number, number>>(
    { 1: 1.0, 2: 0.75, 3: 0.75, 4: 0.75, 5: 0.5, 6: 0.5, 7: 0.5, 8: 0.25, 9: 0.25, 10: 0.25 },
    "Regime IRS Jovem — 100% (1.º), 75% (2.º–4.º), 50% (5.º–7.º), 25% (8.º–10.º)",
    "art12bCirs",
    TODAY
  ),
};

/**
 * Programa Regressar / ex-residentes (Art. 12.º-A CIRS).
 *
 * O texto do n.º 1 é curto e diz tudo: «São excluídos de tributação 50 % dos
 * rendimentos do trabalho dependente e dos rendimentos empresariais e
 * profissionais dos sujeitos passivos, até ao montante do limite superior do
 * primeiro escalão previsto no n.º 1 do artigo 68.º-A».
 *
 * Duas consequências que o motor tem de respeitar:
 *
 *  · **São as categorias A e B**, não só a B. Um ex-residente com salário tem
 *    direito à mesma exclusão de quem passa recibos.
 *  · **O teto morde no montante EXCLUÍDO**, não no rendimento — é a leitura da
 *    letra («são excluídos … até ao montante de») e é a que o Guia Fiscal 2026
 *    da PwC explicita: «a exclusão acima referida está limitada a 250 000 €/ano».
 *    O limite é derivado do 2.º limiar do Art. 68.º-A, que é onde a lei o foi
 *    buscar — se esse valor mudar, este acompanha sozinho.
 */
export const PROGRAMA_REGRESSAR = {
  exclusao: sv(0.5, "Art. 12.º-A, n.º 1 CIRS — exclusão de 50% dos rendimentos das categorias A e B", "art12aCirs", DATA_LAST_REVIEW),
  anos: sv(5, "Art. 12.º-A, n.º 1 CIRS — cinco anos, incluindo o do regresso", "art12aCirs", DATA_LAST_REVIEW),
  /**
   * As quatro condições cumulativas do n.º 1, na redação da Lei n.º 82/2023
   * — lidas no articulado a 07/08/2026, porque o pacote de expansão marcou
   * duas delas como «confirmar» e a resposta é datada.
   */
  anosSemResidencia: sv(
    5,
    "Art. 12.º-A, n.º 1, al. b) CIRS — não ter sido considerado residente em território português em qualquer dos cinco anos anteriores",
    "art12aCirs",
    REV_ESTRANGEIRO
  ),
  /** A janela fecha, e a lei diz o ano. */
  ultimoAnoParaSeTornarResidente: sv(
    2026,
    "Art. 12.º-A, n.º 1, al. a) CIRS (Lei n.º 82/2023) — tornar-se fiscalmente residente nos termos dos n.os 1 e 2 do Art. 16.º até 2026",
    "art12aCirs",
    REV_ESTRANGEIRO,
    "É o último ano previsto na redação em vigor. A janela já foi prorrogada antes; enquanto não o for de novo, quem se tornar residente em 2027 fica de fora."
  ),
  /** É para quem VOLTA — não para quem chega pela primeira vez. */
  exigeResidenciaAnterior: sv(
    true,
    "Art. 12.º-A, n.º 1, al. c) CIRS — ter sido residente em território português em qualquer período antecedente ao dos cinco anos anteriores",
    "art12aCirs",
    REV_ESTRANGEIRO,
    "É o regime dos EX-residentes: quem nunca cá foi residente não é elegível, por muitos anos que tenha vivido fora."
  ),
  exigeSituacaoRegularizada: sv(
    true,
    "Art. 12.º-A, n.º 1, al. d) CIRS — ter a situação tributária regularizada",
    "art12aCirs",
    REV_ESTRANGEIRO
  ),
  /** Não acumula com o residente não habitual. */
  incompativelComRNH: sv(
    true,
    "Art. 12.º-A, n.º 2 CIRS — não podem beneficiar deste regime os sujeitos passivos que tenham solicitado a sua inscrição como residente não habitual",
    "art12aCirs",
    REV_ESTRANGEIRO
  ),
};

// ═══════════════════════════════════════════════════════════════════════
//  IRS — ESCALÕES PROGRESSIVOS (Art. 68.º CIRS) e dedução específica.
//  Aplicam-se ao RENDIMENTO COLETÁVEL (após coeficiente e deduções).
// ═══════════════════════════════════════════════════════════════════════
export interface EscalaoIRS {
  /** Limite superior do escalão (€); null no último escalão. */
  ate: number | null;
  /** Taxa marginal aplicada à fração de rendimento dentro do escalão. */
  taxa: number;
}

export const ESCALOES_IRS = sv<EscalaoIRS[]>(
  [
    { ate: 8342, taxa: 0.125 },
    { ate: 12587, taxa: 0.157 },
    { ate: 17838, taxa: 0.212 },
    { ate: 23089, taxa: 0.241 },
    { ate: 29397, taxa: 0.311 },
    { ate: 43090, taxa: 0.349 },
    { ate: 46566, taxa: 0.431 },
    { ate: 86634, taxa: 0.446 },
    { ate: null, taxa: 0.48 },
  ],
  "Art. 68.º CIRS — escalões 2026 (Portugal continental)",
  "art68cirs",
  TODAY,
  "Taxas marginais. Confirmar anualmente contra a tabela oficial da AT."
);

// ═══════════════════════════════════════════════════════════════════════
//  IRS NAS REGIÕES AUTÓNOMAS — o mesmo Art. 68.º, com taxas reduzidas
//  ---------------------------------------------------------------------
//  A Lei das Finanças das Regiões Autónomas permite às assembleias
//  legislativas regionais baixar as taxas nacionais de IRS até 30%. Em 2026
//  as duas regiões aplicam o diferencial MÁXIMO, em TODOS os escalões — na
//  Madeira depois de o Orçamento regional o ter alargado do 6.º ao 9.º.
//
//  ── O QUE DECIDE A REDUÇÃO ───────────────────────────────────────────
//
//  A RESIDÊNCIA FISCAL do sujeito passivo, e mais nada. Não é o lugar onde
//  se presta o serviço, nem onde está o cliente, nem a região que governa o
//  IVA da operação. Quem reside nos Açores e fatura para Lisboa é tributado
//  às taxas dos Açores; quem reside em Lisboa e fatura para os Açores não é.
//  É por isso que `Regiao` NÃO chega para decidir isto sozinha — ver
//  `residenciaFiscal` nos perfis, que é uma pergunta diferente da do IVA.
//
//  ── PORQUE É UM FATOR, E NÃO DEZOITO TAXAS ESCRITAS À MÃO ────────────
//
//  A regra legal é «menos 30% sobre a taxa nacional», e é a regra que se
//  guarda. Transcrever 9 taxas × 2 regiões seria copiar dezoito números que
//  já se derivam de um, e cada um deles seria uma oportunidade de erro de
//  transcrição que ninguém voltaria a conferir.
//
//  Para que a derivação não vire um ato de fé, `assertFiscalDataIntegrity()`
//  confere-a contra a tabela PUBLICADA para 2026 (Agenda da OCC): se o
//  legislador mudar o diferencial, ou se alguém mexer nos escalões
//  nacionais sem pensar nas regiões, o build parte.
// ═══════════════════════════════════════════════════════════════════════

/** Regiões com poder tributário próprio sobre as taxas do Art. 68.º. */
export type RegiaoFiscal = Regiao;

export const REDUCAO_IRS_REGIOES_AUTONOMAS = sv<Record<Exclude<Regiao, "continente">, number>>(
  { madeira: 0.3, acores: 0.3 },
  "Lei Orgânica n.º 2/2013 (Lei das Finanças das Regiões Autónomas), Título VI — diferencial máximo de 30% sobre as taxas nacionais de IRS; aplicado na íntegra em 2026 pelo DLR n.º 8/2025/M (Madeira, alargado a todos os escalões) e pelo DLR n.º 15-A/2021/A (Açores)",
  "lfra",
  REV_REGIOES,
  "A redução é do sujeito passivo RESIDENTE na região, seja qual for a categoria de rendimento ou o local onde exerce a atividade. Confirmar anualmente: o diferencial é decidido a cada orçamento regional."
);

/**
 * Escalões do Art. 68.º aplicáveis a quem reside na região indicada.
 *
 * Os limites de escalão são os nacionais — a lei regional baixa as TAXAS, não
 * as fronteiras. Devolve o array nacional tal e qual para o continente, para
 * que quem não sabe da existência disto continue a obter o que sempre obteve.
 */
export function escaloesIRSDaRegiao(regiao: Regiao = "continente"): EscalaoIRS[] {
  if (regiao === "continente") return ESCALOES_IRS.value;
  const reducao = REDUCAO_IRS_REGIOES_AUTONOMAS.value[regiao];
  return ESCALOES_IRS.value.map((e) => ({
    ate: e.ate,
    // Duas casas decimais em pontos percentuais é como a tabela oficial as
    // publica (12,50% → 8,75%); arredondar aqui evita que 0,157 × 0,7 vire
    // 0,10989999999999999 e que a comparação com a tabela publicada falhe
    // por um erro de vírgula flutuante que não existe na lei.
    taxa: Math.round(e.taxa * (1 - reducao) * 10000) / 10000,
  }));
}

// Dedução específica = máx(piso fixo; 8,54 × IAS). Para 2026 = 4.587,09 €.
export const DEDUCAO_ESPECIFICA_FLOOR = 4104;
export const DEDUCAO_ESPECIFICA_IAS_MULT = 8.54;

/**
 * Dedução específica da categoria B. No regime simplificado NÃO é uma subtração
 * direta ao coletável (o coeficiente já presume as despesas): conta como despesa
 * automaticamente justificada para a regra dos 15%.
 *
 * Em alternativa contam as contribuições obrigatórias para a Segurança Social —
 * as TOTAIS, a maior das duas (Art. 31.º n.º 13 al. a). Este comentário dizia
 * «que excedam 10% do rendimento bruto», o que é outra coisa: a dedução autónoma
 * do n.º 2. O código sempre esteve certo; era o comentário que convidava alguém
 * a «arranjá-lo».
 */
export const DEDUCAO_ESPECIFICA_CATB = sv(
  Math.round(Math.max(DEDUCAO_ESPECIFICA_FLOOR, DEDUCAO_ESPECIFICA_IAS_MULT * IAS.value) * 100) / 100,
  "Art. 25.º / 31.º CIRS — máx(4.104 €; 8,54 × IAS)",
  "occRegimeSimplificado",
  TODAY
);

/** Limiar de despesas a justificar no regime simplificado (coef. 0,75 e 0,35). */
export const REGIME_15PCT = sv(
  0.15,
  "Art. 31.º CIRS — 15% do rendimento bruto a justificar com despesas",
  "occRegimeSimplificado",
  TODAY,
  "Parte de 15% do bruto não justificada com despesas é acrescida ao rendimento tributável."
);

/**
 * Piso fixo do valor de referência do mínimo de existência (Art. 70.º, n.º 1).
 * Em 2026 coincide com a RMMG × 14 (920 € × 14), mas a lei fixa-o como valor
 * absoluto — não como uma função do salário mínimo.
 */
export const MINIMO_EXISTENCIA_PISO = 12880;
/** Multiplicadores do braço indexado ao IAS: 1,5 × 14 × IAS (Art. 70.º, n.º 1). */
export const MINIMO_EXISTENCIA_IAS_MULT = 1.5;
export const MINIMO_EXISTENCIA_IAS_MESES = 14;

/**
 * Valor de referência do mínimo de existência (rendimento protegido de IRS).
 *
 * O Art. 70.º, n.º 1 manda usar o MAIOR de dois braços: o valor fixo de
 * 12 880 € e 1,5 × 14 × IAS. Não é «RMMG × 14»: em 2026 os dois coincidem por
 * acaso (920 × 14 = 12 880 e 1,5 × 14 × 537,13 = 11 279,73, logo prevalece o
 * fixo), mas fundamentar o parâmetro na RMMG parte assim que o IAS passar de
 * ~613,33 € — a partir daí é o braço indexado que manda e a fórmula da RMMG
 * daria um valor a menos.
 */
export const MINIMO_EXISTENCIA = sv(
  Math.round(
    Math.max(
      MINIMO_EXISTENCIA_PISO,
      MINIMO_EXISTENCIA_IAS_MULT * MINIMO_EXISTENCIA_IAS_MESES * IAS.value
    ) * 100
  ) / 100,
  "Art. 70.º, n.º 1 CIRS — máx(12 880 €; 1,5 × 14 × IAS)",
  "art70cirs",
  TODAY,
  "Valor de referência. O abatimento é calculado pela fórmula por troços do artigo 70.º."
);

/**
 * Parâmetros estruturais do abatimento por mínimo de existência.
 *
 * O patamar L é `VR − limiteDespesasGerais/(taxa1×3,60) + limiteEscalao1/3,60`.
 * Os valores 2,60, 1,35 e 3,60 resultam diretamente dos n.os 2 e 3 do
 * artigo 70.º do CIRS; 2,2 é o multiplicador da exclusão do n.º 4, al. a).
 */
export const MINIMO_EXISTENCIA_FORMULA = {
  coeficienteTrocoIntermedio: sv(2.6, "Art. 70.º, n.º 2, al. b) CIRS", "art70cirs", TODAY),
  coeficienteTrocoSuperior: sv(1.35, "Art. 70.º, n.º 2, al. c) CIRS", "art70cirs", TODAY),
  divisorPatamarL: sv(3.6, "Art. 70.º, n.º 3 CIRS", "art70cirs", TODAY),
  limiteDespesasGeraisPorTitular: sv(250, "Art. 70.º, n.º 5, al. c) e Art. 78.º-B, n.º 1 CIRS", "art70cirs", TODAY),
  multiplicadorExclusaoRendimentoAgregado: sv(2.2, "Art. 70.º, n.º 4, al. a) CIRS", "art70cirs", TODAY),
  multiplicadorIASExclusao: sv(14, "Art. 70.º, n.º 4 CIRS", "art70cirs", TODAY),
} as const;

/**
 * Adicional de solidariedade (Art. 68.º-A CIRS): acresce às taxas gerais do
 * Art. 68.º — 2,5% na parte do rendimento coletável entre 80 000 € e
 * 250 000 €; 5% na parte que exceda 250 000 €. Não se aplica aos regimes de
 * taxa fixa (IFICI/RNH antigo), que substituem — em vez de acrescer a — as
 * taxas gerais do Art. 68.º.
 */
export const ADICIONAL_SOLIDARIEDADE = {
  limiar1: sv(80000, "Art. 68.º-A, n.º 1, al. a) CIRS — 1.º limiar do adicional de solidariedade", "art68aCirs", TODAY),
  limiar2: sv(250000, "Art. 68.º-A, n.º 1, al. b) CIRS — 2.º limiar do adicional de solidariedade", "art68aCirs", TODAY),
  taxa1: sv(0.025, "Art. 68.º-A, n.º 1, al. a) CIRS — taxa de 2,5% entre 80 000 € e 250 000 €", "art68aCirs", TODAY),
  taxa2: sv(0.05, "Art. 68.º-A, n.º 1, al. b) CIRS — taxa de 5% acima de 250 000 €", "art68aCirs", TODAY),
};

/**
 * Teto anual da exclusão do Art. 12.º-A: «o limite superior do primeiro escalão
 * previsto no n.º 1 do artigo 68.º-A» — ou seja, o 2.º limiar do adicional de
 * solidariedade (250 000 €). Derivado, e não escrito à mão, porque a lei o
 * define por remissão: a única forma de os dois não divergirem é este vir dali.
 */
export const PROGRAMA_REGRESSAR_TETO_CALC = ADICIONAL_SOLIDARIEDADE.limiar2.value;

// ═══════════════════════════════════════════════════════════════════════
//  IRC — para o comparador "recibos verdes vs empresa" (sociedade)
// ═══════════════════════════════════════════════════════════════════════
// ATENÇÃO a quem vier verificar isto contra a fonte: o CORPO do Art. 87.º,
// n.º 1 diz "17 %". Não é a taxa de 2026. A norma transitória (Art. 3.º da
// Lei n.º 64/2025, de 7 de novembro), publicada na mesma página logo abaixo
// do articulado, escalona a descida:
//     · períodos iniciados em 2026 → 19 %
//     · períodos iniciados em 2027 → 18 %
//     · períodos iniciados em ou após 1/1/2028 → 17 % (o texto do artigo)
// Ler só o articulado dá 17 % e está errado para o ano fiscal em curso.
export const IRC_TAXA_GERAL = sv(
  0.19,
  "Art. 87.º, n.º 1 CIRC conjugado com a norma transitória do Art. 3.º, n.º 2 da Lei n.º 64/2025, de 7 de novembro — 19% nos períodos de tributação iniciados em 2026 (o corpo do artigo prevê 17%, mas só a partir de 2028)",
  "art87circ",
  TODAY
);
export const IRC_TAXA_PME = sv(
  0.15,
  "Art. 87.º, n.º 2 CIRC (redação da Lei n.º 64/2025, de 7 de novembro) — taxa reduzida PME nos primeiros 50 000 € de matéria coletável, aplicável aos períodos iniciados em ou após 1/1/2026 (Art. 3.º, n.º 4 da mesma lei)",
  "art87circ",
  TODAY
);
export const IRC_LIMITE_PME = sv(50000, "Art. 87.º CIRC — limiar da taxa reduzida PME", "art87circ", TODAY);
export const DERRAMA_MAX = sv(0.015, "Derrama municipal — taxa máxima legal sobre o lucro tributável", "art87circ", TODAY);
export const DIVIDENDOS_TAXA = sv(
  0.28,
  "Art. 71.º CIRS — taxa liberatória sobre dividendos distribuídos",
  "art71cirs",
  TODAY
);

/**
 * A MESMA taxa do Art. 71.º, n.º 1, vista do lado dos juros, dos depósitos e
 * dos restantes rendimentos de capitais.
 *
 * É deliberadamente uma referência e não um segundo valor: a norma é uma só —
 * «estão sujeitos a retenção na fonte a título definitivo, à taxa liberatória
 * de 28 %, os rendimentos de capitais obtidos em território português». Os
 * dividendos são um caso dela, não uma regra à parte. Dois `sv()` com o mesmo
 * número seriam dois sítios para atualizar no dia em que a taxa mudar, e um
 * deles ficaria para trás.
 */
export const CAPITAIS_TAXA_LIBERATORIA = DIVIDENDOS_TAXA;

// ═══════════════════════════════════════════════════════════════════════
//  RENDIMENTOS DO ESTRANGEIRO E REPORTE DE PERDAS
//  ---------------------------------------------------------------------
//  O que os guias de «Investir e poupar» precisam e o motor não tinha: o
//  duplo limite do crédito de imposto, os anos de reporte de cada coisa, e
//  a condição — muito esquecida — de que o reporte de menos-valias depende
//  de se ter optado pelo englobamento no ano da perda.
// ═══════════════════════════════════════════════════════════════════════

export const RENDIMENTO_MUNDIAL = sv(
  true,
  "Art. 15.º, n.º 1 CIRS — sendo as pessoas residentes em território português, o IRS incide sobre a totalidade dos seus rendimentos, incluindo os obtidos fora desse território",
  "art15cirs",
  REV_PATRIMONIO,
  "Aos não residentes o IRS incide unicamente sobre os rendimentos obtidos em território português (n.º 2)."
);

/**
 * Residência fiscal — os critérios do Art. 16.º, lidos no articulado a
 * 07/08/2026.
 *
 * O pacote avisa, e com razão, que residência fiscal (Art. 16.º CIRS),
 * domicílio fiscal (Art. 19.º LGT) e autorização de residência são três
 * coisas diferentes que toda a gente confunde. Só a primeira decide o que
 * Portugal tributa.
 *
 * Três coisas que a letra diz e as explicações costumam perder:
 *
 *  · O período dos 183 dias NÃO é o ano civil — é «qualquer período de 12
 *    meses com início ou fim no ano em causa». É uma janela deslizante.
 *  · Basta UM dos critérios do n.º 1. O da habitação dispensa por completo
 *    a contagem de dias.
 *  · A residência é aferida em relação a CADA sujeito passivo do agregado
 *    (n.º 5). Num casal, um pode ser residente e o outro não.
 */
export const RESIDENCIA_FISCAL = {
  /** Dias de permanência que, por si só, tornam residente. */
  diasPermanencia: sv(
    183,
    "Art. 16.º, n.º 1, al. a) CIRS — permanência por mais de 183 dias, seguidos ou interpolados, em qualquer período de 12 meses com início ou fim no ano em causa",
    "art16cirs",
    REV_ESTRANGEIRO,
    "São mais de 183 dias, não 183: no dia 183 ainda não és residente por esta via."
  ),
  /** A janela em que os dias se contam. */
  janelaMeses: sv(
    12,
    "Art. 16.º, n.º 1, al. a) CIRS — qualquer período de 12 meses com início ou fim no ano em causa",
    "art16cirs",
    REV_ESTRANGEIRO,
    "Janela deslizante, não ano civil. Uma estadia a cavalo de dois anos pode contar toda para o mesmo período."
  ),
  /** O que conta como dia de presença. */
  contaComoDia: sv(
    "qualquer dia, completo ou parcial, que inclua dormida",
    "Art. 16.º, n.º 2 CIRS — considera-se dia de presença em território português qualquer dia, completo ou parcial, que inclua dormida no mesmo",
    "art16cirs",
    REV_ESTRANGEIRO,
    "Um dia de chegada e um dia de partida contam ambos, se houve dormida."
  ),
  /** O critério que dispensa a contagem de dias. */
  criterioHabitacao: sv(
    "habitação em condições que façam supor intenção atual de a manter e ocupar como residência habitual",
    "Art. 16.º, n.º 1, al. b) CIRS — tendo permanecido por menos tempo, dispor de habitação nessas condições num qualquer dia do período",
    "art16cirs",
    REV_ESTRANGEIRO,
    "Basta um dia do período. Não é ter casa: é ter casa em condições que revelem a intenção."
  ),
  /** A residência é individual, não do agregado. */
  aferidaPorSujeitoPassivo: sv(
    true,
    "Art. 16.º, n.º 5 CIRS — a residência fiscal é aferida em relação a cada sujeito passivo do agregado",
    "art16cirs",
    REV_ESTRANGEIRO
  ),
  /** Quando começa a residência, no ano da chegada. */
  inicioResidencia: sv(
    "primeiro dia do período de permanência",
    "Art. 16.º, n.º 3 CIRS — tornam-se residentes desde o primeiro dia de permanência, salvo se tiverem sido residentes em qualquer dia do ano anterior, caso em que desde 1 de janeiro",
    "art16cirs",
    REV_ESTRANGEIRO
  ),
  /** Quando termina, no ano da saída. */
  fimResidencia: sv(
    "último dia de permanência",
    "Art. 16.º, n.º 4 CIRS — a perda da qualidade de residente ocorre a partir do último dia de permanência, salvo nos casos dos n.os 14 e 16",
    "art16cirs",
    REV_ESTRANGEIRO
  ),
  /**
   * A regra que apanha quem sai tarde e recebe depois de sair.
   *
   * Continuas residente durante TODO o ano da saída se, cumulativamente,
   * permaneceste cá mais de 183 dias nesse ano E recebeste, depois do
   * último dia de permanência, rendimentos que seriam sujeitos a IRS.
   * Cai se provares que esses rendimentos foram tributados na UE/EEE com
   * cooperação, ou noutro Estado a taxa não inferior a 60% da portuguesa.
   */
  residenteTodoOAnoDaSaida: sv(
    "mais de 183 dias nesse ano e rendimentos obtidos após o último dia de permanência",
    "Art. 16.º, n.os 14 e 15 CIRS — condições cumulativas, com a exceção da tributação no estrangeiro a taxa não inferior a 60% da que cá se aplicaria",
    "art16cirs",
    REV_ESTRANGEIRO
  ),
  /**
   * A saída da regra anterior: prova de tributação efetiva lá fora.
   *
   * Fora da UE e do EEE, não basta ter sido tributado — a taxa aplicada
   * tem de não ser inferior a esta fração da que cá se aplicaria. É o que
   * separa uma mudança real de uma mudança para não pagar.
   */
  limiarTributacaoNoEstrangeiro: sv(
    0.6,
    "Art. 16.º, n.º 15, al. b) CIRS — noutro Estado não abrangido pela al. a), a taxa de tributação aplicável àqueles rendimentos não pode ser inferior a 60% daquela que lhes seria aplicável caso o sujeito passivo mantivesse a residência em território português",
    "art16cirs",
    REV_ESTRANGEIRO
  ),
  /** Sair e voltar no ano seguinte apaga a saída. */
  regressoNoAnoSeguinte: sv(
    "residente durante a totalidade do ano",
    "Art. 16.º, n.º 16 CIRS — considera-se residente durante a totalidade do ano quem volte a adquirir essa qualidade no ano subsequente àquele em que a perdeu",
    "art16cirs",
    REV_ESTRANGEIRO
  ),
  /** Mudar para um paraíso fiscal não corta a residência de imediato. */
  paraisoFiscalAnos: sv(
    4,
    "Art. 16.º, n.º 6 CIRS — nacionais portugueses que deslocalizem a residência para regime fiscal claramente mais favorável continuam havidos como residentes no ano da mudança e nos quatro subsequentes",
    "art16cirs",
    REV_ESTRANGEIRO,
    "Salvo prova de razões atendíveis, designadamente atividade temporária por conta de entidade patronal domiciliada em Portugal."
  ),
  /** Prazo para comunicar a mudança de estatuto de residência. */
  prazoComunicarDias: sv(
    60,
    "Art. 19.º, n.º 5 LGT — sempre que se altere o estatuto de residência, o sujeito passivo deve comunicá-lo à administração tributária no prazo de 60 dias",
    "lgt19",
    REV_ESTRANGEIRO,
    "É ineficaz a mudança de domicílio enquanto não for comunicada (n.º 4)."
  ),
} as const;

/**
 * Representante fiscal — Art. 19.º da LGT, lido a 07/08/2026.
 *
 * O pacote manda confirmar a lista de países dispensados, e a confirmação
 * dá uma resposta diferente da esperada: a lei NÃO tem lista de países.
 * Tem um critério (UE, ou EEE com cooperação administrativa equivalente) —
 * e, desde o Decreto-Lei n.º 44/2022, uma segunda porta que dispensa a
 * nomeação a QUALQUER não residente: aderir às notificações eletrónicas.
 */
export const REPRESENTANTE_FISCAL = {
  /** Quem tem de designar. */
  obrigatorioPara: sv(
    "residentes no estrangeiro e residentes que se ausentem por mais de seis meses",
    "Art. 19.º, n.º 6 LGT — os sujeitos passivos residentes no estrangeiro, bem como os que, residindo cá, se ausentem por período superior a seis meses, devem designar um representante com residência em território nacional",
    "lgt19",
    REV_ESTRANGEIRO
  ),
  /** Meses de ausência que ativam a obrigação para quem reside cá. */
  ausenciaMeses: sv(
    6,
    "Art. 19.º, n.º 6 LGT — ausência do território nacional por período superior a seis meses",
    "lgt19",
    REV_ESTRANGEIRO
  ),
  /** Onde a designação é facultativa. */
  facultativoPara: sv(
    "União Europeia e Espaço Económico Europeu com cooperação administrativa equivalente",
    "Art. 19.º, n.º 8 LGT — a designação é meramente facultativa em relação a não residentes de, ou residentes que se ausentem para, Estados membros da UE ou do EEE, neste último caso desde que vinculados a cooperação administrativa equivalente",
    "lgt19",
    REV_ESTRANGEIRO,
    "A lei não fixa uma lista de países: fixa o critério. O EEE são a Noruega, a Islândia e o Listenstaine."
  ),
  /** A segunda porta, que vale para qualquer país. */
  dispensaPorNotificacoesEletronicas: sv(
    true,
    "Art. 19.º, n.º 15 LGT (Decreto-Lei n.º 44/2022) — a obrigatoriedade de designar representante não é aplicável a quem adira ao serviço público de notificações eletrónicas associado à morada única digital, ao regime de notificações e citações eletrónicas no Portal das Finanças ou à caixa postal eletrónica",
    "lgt19",
    REV_ESTRANGEIRO,
    "Cancelar a adesão, residindo fora da UE/EEE, só produz efeitos depois de designado representante (n.º 16)."
  ),
  /** O que se perde sem representante, quando ele é obrigatório. */
  semRepresentante: sv(
    "não se exercem direitos perante a administração tributária, incluindo reclamação, recurso e impugnação",
    "Art. 19.º, n.º 7 LGT — independentemente das sanções aplicáveis, o exercício dos direitos depende da designação de representante",
    "lgt19",
    REV_ESTRANGEIRO
  ),
  /** Prazo da AT para processar a renúncia do representante. */
  renunciaPrazoDias: sv(
    90,
    "Art. 19.º, n.º 10 LGT — a renúncia é eficaz perante a AT quando lhe for comunicada, devendo esta proceder às alterações em 90 dias, desde que tenha decorrido pelo menos um ano desde a nomeação ou tenha sido nomeado novo representante",
    "lgt19",
    REV_ESTRANGEIRO
  ),
} as const;

/**
 * Como Portugal tributa quem cá não reside — Arts. 71.º e 72.º, lidos a
 * 07/08/2026.
 *
 * O pacote avisa: «não afirmar uma taxa única de 25% sem qualificar a
 * categoria». O aviso é certo e fica curto — não há uma taxa, há três, e
 * há duas saídas que quase ninguém usa.
 *
 * As taxas incidem sobre o rendimento ILÍQUIDO (Art. 71.º, n.º 8): é por
 * isto que um não residente não tem deduções, e não por a lei lhas negar
 * uma a uma. Mas quem reside na UE ou no EEE com troca de informações tem
 * duas portas de volta às taxas progressivas — a opção do Art. 72.º, n.º
 * 15 e o pedido de devolução do Art. 71.º, n.os 11 a 13. Em ambas contam
 * TODOS os rendimentos, incluindo os obtidos fora de Portugal.
 */
export const NAO_RESIDENTES = {
  /** Trabalho dependente, categoria B (mesmo em ato isolado) e pensões. */
  taxaTrabalhoEPensoes: sv(
    0.25,
    "Art. 71.º, n.º 4, als. a) e c) CIRS — retenção na fonte a título definitivo, à taxa liberatória de 25%, sobre rendimentos do trabalho dependente, todos os rendimentos empresariais e profissionais (ainda que de atos isolados) e pensões obtidos em território português por não residentes",
    "art71cirs",
    REV_ESTRANGEIRO
  ),
  /** Rendimentos de capitais obtidos cá — a taxa é a mesma dos residentes. */
  taxaCapitais: sv(
    0.28,
    "Art. 71.º, n.º 1, al. a) CIRS — rendimentos de capitais obtidos em território português, por residentes ou não residentes, à taxa liberatória de 28%",
    "art71cirs",
    REV_ESTRANGEIRO
  ),
  /** Tudo o que sobra e não sofreu retenção liberatória. */
  taxaOutrosRendimentos: sv(
    0.28,
    "Art. 72.º, n.º 1, al. b) CIRS — outros rendimentos auferidos por não residentes não imputáveis a estabelecimento estável e não sujeitos a retenção às taxas liberatórias, à taxa autónoma de 28%",
    "art72",
    REV_ESTRANGEIRO
  ),
  /** Quando há estabelecimento estável em Portugal. */
  taxaEstabelecimentoEstavel: sv(
    0.25,
    "Art. 72.º, n.º 6, al. a) CIRS — rendimentos auferidos por não residentes imputáveis a estabelecimento estável situado em território português, à taxa autónoma de 25%",
    "art72",
    REV_ESTRANGEIRO
  ),
  /** A base sobre que a taxa incide. */
  incideSobre: sv(
    "rendimentos ilíquidos",
    "Art. 71.º, n.º 8 CIRS — as taxas incidem sobre os rendimentos ilíquidos, exceto nas pensões, que beneficiam da dedução do Art. 53.º",
    "art71cirs",
    REV_ESTRANGEIRO,
    "É daqui que vem a ausência de deduções: não há um rendimento líquido a que abater seja o que for."
  ),
  /** A folga na retenção do trabalho, quando há uma só entidade. */
  semRetencaoAteRmmg: sv(
    true,
    "Art. 71.º, n.º 5 CIRS — não é aplicada retenção até ao valor da retribuição mínima mensal garantida, quando os rendimentos resultem de trabalho ou serviços prestados a uma única entidade",
    "art71cirs",
    REV_ESTRANGEIRO,
    "Depende de declaração escrita do titular à entidade devedora (n.º 6)."
  ),
  /** A opção pelas taxas progressivas, para residentes na UE/EEE. */
  opcaoTaxasProgressivas: sv(
    "residentes noutro Estado-Membro da UE ou do EEE com intercâmbio de informações",
    "Art. 72.º, n.os 15 e 16 CIRS — podem optar pela tributação à taxa que seria aplicável a residentes, sendo considerados todos os rendimentos, incluindo os obtidos fora do território",
    "art72",
    REV_ESTRANGEIRO
  ),
  /** O pedido de devolução do que foi retido a mais. */
  devolucaoPrazoAnos: sv(
    2,
    "Art. 71.º, n.º 13 CIRS — a devolução deve ser requerida no prazo de dois anos contados do final do ano civil seguinte àquele em que se verificou o facto tributário",
    "art71cirs",
    REV_ESTRANGEIRO,
    "A AT restitui até ao fim do 3.º mês seguinte à apresentação dos elementos; falhando o prazo, acrescem juros indemnizatórios."
  ),
} as const;

export const CREDITO_IMPOSTO_ESTRANGEIRO = {
  /** Anos para usar o crédito que a coleta do ano não chegou para absorver. */
  reporteAnos: sv(
    5,
    "Art. 81.º, n.º 3 CIRS — por insuficiência de coleta, o remanescente pode ser deduzido à coleta dos cinco períodos de tributação seguintes",
    "art81cirs",
    REV_PATRIMONIO
  ),
  /**
   * O crédito é o MENOR de dois valores (n.º 1) — e, havendo convenção, não
   * pode ultrapassar o imposto pago no estrangeiro NOS TERMOS DA CONVENÇÃO
   * (n.º 2). É o segundo limite que apanha quem sofreu retenção acima da
   * taxa convencionada: essa parte recupera-se no país da fonte, não cá.
   */
  duploLimite: sv(
    ["imposto sobre o rendimento pago no estrangeiro", "fração da coleta do IRS correspondente a esses rendimentos"],
    "Art. 81.º, n.os 1 e 2 CIRS — o crédito corresponde à menor das duas importâncias e, havendo convenção, não pode ultrapassar o imposto pago nos termos previstos por ela",
    "art81cirs",
    REV_PATRIMONIO
  ),
};

/**
 * Reporte do saldo negativo de mais-valias mobiliárias e de criptoativos.
 *
 * A condição é a parte que mais se perde: o reporte só existe se o sujeito
 * passivo OPTAR (ou for obrigado) pelo englobamento desses rendimentos no
 * ano da perda. Quem deixa a taxa especial correr por defeito no ano mau
 * fica sem nada para abater no ano bom.
 */
export const MAIS_VALIAS_REPORTE = {
  anos: sv(
    5,
    "Art. 55.º, n.º 1, al. d) CIRS — o saldo negativo das operações das als. b), c), e), f), g), h) e k) do n.º 1 do art. 10.º pode ser reportado para os cinco anos seguintes",
    "art55cirs",
    REV_PATRIMONIO
  ),
  exigeEnglobamento: sv(
    true,
    "Art. 55.º, n.º 1, al. d) CIRS — «quando o sujeito passivo opte ou seja obrigado a englobar esses rendimentos»",
    "art55cirs",
    REV_PATRIMONIO
  ),
  /** Reporte do saldo negativo de mais-valias IMOBILIÁRIAS — outro prazo. */
  anosImobiliario: sv(
    5,
    "Art. 55.º, n.º 1, al. c) CIRS — a percentagem do saldo negativo a que se refere o n.º 2 do art. 43.º reporta-se aos cinco anos seguintes",
    "art55cirs",
    REV_PATRIMONIO
  ),
};

// ═══════════════════════════════════════════════════════════════════════
//  CATEGORIA F — RENDIMENTOS PREDIAIS (rendas puras, sem alojamento local)
//  ---------------------------------------------------------------------
//  Tributação totalmente distinta da categoria B: taxa autónoma (especial)
//  sobre as rendas líquidas das despesas dedutíveis (Art. 41.º), sem
//  Segurança Social e sem IVA (Art. 9.º CIVA). Não é recibo verde — tem
//  motor próprio (`calcularCategoriaF`). Pode optar-se pelo englobamento
//  (taxas progressivas), não modelado aqui.
// ═══════════════════════════════════════════════════════════════════════

/** Duração do contrato de arrendamento habitacional (define a redução da taxa). */
export type DuracaoArrendamento = "curto" | "5a10" | "10a20" | "20mais";

export const CATEGORIA_F = {
  /** Taxa autónoma sobre arrendamento para habitação. */
  taxaHabitacao: sv(
    0.25,
    "Art. 72.º, n.º 1 CIRS — taxa especial dos rendimentos prediais (habitação)",
    "art72",
    TODAY
  ),
  /** Taxa autónoma sobre arrendamento não habitacional (comércio, escritórios…). */
  taxaNaoHabitacao: sv(
    0.28,
    "Art. 72.º CIRS — rendimentos prediais de arrendamento não habitacional",
    "rendasPrediais",
    TODAY
  ),
  /**
   * Redução da taxa (em pontos percentuais, expressos como fração) por duração
   * do contrato de arrendamento HABITACIONAL permanente comunicado à AT.
   * 5–10 anos: −10 p.p.; 10–20 anos: −15 p.p.; ≥20 anos: −20 p.p.
   */
  reducaoDuracao: sv<Record<DuracaoArrendamento, number>>(
    { curto: 0, "5a10": 0.1, "10a20": 0.15, "20mais": 0.2 },
    "Art. 72.º, n.os 3 a 5 CIRS (Lei 56/2023) — reduções por duração do contrato, em PONTOS PERCENTUAIS",
    "art72",
    REV_PATRIMONIO,
    "Só para contratos de arrendamento habitacional permanente. A redução é em pontos percentuais sobre a taxa autónoma, não em percentagem dela: −10 p.p. sobre 25% dá 15%, não 22,5%. O regime de renda moderada (taxa de 10%) anunciado no OE2026 está pendente de regulamentação e não é aqui aplicado."
  ),
  /** Redução adicional por cada renovação de igual duração (contratos de 5 a 10 anos). */
  reducaoPorRenovacao: sv(
    0.02,
    "Art. 72.º, n.º 3 CIRS — por cada renovação com igual duração, redução de dois pontos percentuais",
    "art72",
    REV_PATRIMONIO
  ),
  /** Teto do conjunto das reduções obtidas por renovação. */
  reducaoRenovacaoMax: sv(
    0.1,
    "Art. 72.º, n.º 3 CIRS — as reduções relativas à renovação estão sujeitas ao limite de 10 pontos percentuais",
    "art72",
    REV_PATRIMONIO
  ),
  /** Anos de reporte do resultado líquido negativo da categoria F. */
  reporteDePerdasAnos: sv(
    6,
    "Art. 55.º, n.º 1, al. b) CIRS — o resultado líquido negativo da categoria F reporta-se aos seis anos seguintes",
    "art55cirs",
    REV_PATRIMONIO,
    "Caduca se os prédios não gerarem rendimentos da categoria F em pelo menos 36 meses, seguidos ou interpolados, dos cinco anos seguintes (n.º 8)."
  ),
  /** Janela de obras de conservação anteriores ao arrendamento que são dedutíveis. */
  obrasAntesArrendamentoMeses: sv(
    24,
    "Art. 41.º, n.º 7 CIRS — gastos de conservação e manutenção suportados nos 24 meses anteriores ao início do arrendamento",
    "art41cirs",
    REV_PATRIMONIO,
    "Desde que o imóvel não tenha sido utilizado para outro fim que não o arrendamento."
  ),
  /** Prazo da declaração anual de rendas, alternativa ao recibo eletrónico. */
  prazoDeclaracaoRendas: sv(
    "fim de fevereiro",
    "Art. 115.º, n.º 5, al. b) CIRS (redação do DL 49/2025) — declaração de modelo oficial até ao fim do mês de fevereiro, por referência ao ano anterior",
    "art115cirs",
    REV_PATRIMONIO
  ),
};


export const META_DURACAO: Record<DuracaoArrendamento, { label: string; sub: string }> = {
  curto: { label: "Menos de 5 anos", sub: "Sem redução" },
  "5a10": { label: "5 a 10 anos", sub: "−10 p.p." },
  "10a20": { label: "10 a 20 anos", sub: "−15 p.p." },
  "20mais": { label: "20 anos ou mais", sub: "−20 p.p." },
};

// ═══════════════════════════════════════════════════════════════════════
//  CATÁLOGO DE ATIVIDADES — tabela do Art. 151.º CIRS (Portaria 1011/2001)
//  e categorias de comércio/hotelaria e propriedade intelectual. Cada
//  atividade aponta para o `tipo` que determina retenção, coeficiente e SS.
// ═══════════════════════════════════════════════════════════════════════
export interface Atividade {
  label: string;
  /** Categoria fiscal base (define os valores por defeito). */
  tipo: TipoAtividade;
  grupo: string;
  /**
   * Categoria de rendimento de IRS. As atividades deste catálogo são de
   * categoria B (rendimentos empresariais e profissionais — recibos verdes).
   * As rendas puras são categoria F e têm motor próprio (`calcularCategoriaF`),
   * fora do fluxo de recibos. Por defeito "B".
   */
  categoria?: "B" | "F";
  // ── Pacote de regras (override do `tipo`, para regimes especiais) ──
  /** Coeficiente do regime simplificado, se diferente do `tipo`. */
  coef?: number;
  /** Taxa de retenção na fonte, se diferente do `tipo`. */
  retencao?: number;
  /** Base da Segurança Social, se diferente do `tipo`. */
  baseSS?: BaseSS;
  /** Sujeita à regra dos 15% (Art. 31.º al. b/c). Por defeito deriva do `tipo`. */
  regra15?: boolean;
  /** Observação/exceção legal a mostrar ao utilizador. */
  nota?: string;
  /** Base legal do coeficiente. */
  legalCoef?: string;
}

/** Efeito fiscal efetivo de uma atividade (resolve overrides sobre o `tipo`). */
export interface EfeitoFiscal {
  coef: number;
  retencao: number;
  baseSS: BaseSS;
  regra15: boolean;
  nota?: string;
  legalCoef: string;
}

// Grupos da tabela oficial (Portaria 1011/2001) + categorias adicionais.
const G1 = "Engenharia e arquitetura";
const G2 = "Artistas e espetáculo";
const G3 = "Tauromaquia";
const G4 = "Economia e contabilidade";
const G5 = "Saúde (paramédicos)";
const G6 = "Juristas";
const G7 = "Médicos";
const G8 = "Ensino";
const G9 = "Nomeação oficial";
const G10 = "Psicologia e sociologia";
const G11 = "Química";
const G12 = "Religião";
const G13 = "Outras profissões liberais";
const G14 = "Veterinária";
const G15 = "Outros serviços";
const G_COM = "Comércio e hotelaria";
const G_PI = "Propriedade intelectual";
const G_SUB = "Subsídios e subvenções";

/** Entrada do Art. 151.º: código oficial + nome → tratamento de profissão liberal. */
const a = (code: string, nome: string, grupo: string): Atividade => ({
  label: `${code} · ${nome}`,
  tipo: "art151",
  grupo,
});

// Tabela oficial completa do Art. 151.º do CIRS (Portaria 1011/2001).
export const ATIVIDADES: Atividade[] = [
  // 1 — Arquitetos, engenheiros e técnicos similares
  a("1000", "Agentes técnicos de engenharia e arquitetura", G1),
  a("1001", "Arquitetos", G1),
  a("1002", "Desenhadores", G1),
  a("1003", "Engenheiros", G1),
  a("1004", "Engenheiros técnicos", G1),
  a("1005", "Geólogos", G1),
  a("1006", "Topógrafos", G1),
  // 2 — Artistas plásticos, atores e músicos
  a("2010", "Artistas de teatro, bailado, cinema, rádio e televisão", G2),
  a("2011", "Artistas de circo", G2),
  a("2012", "Escultores", G2),
  a("2013", "Músicos", G2),
  a("2014", "Pintores", G2),
  a("2015", "Outros artistas", G2),
  a("2019", "Cantores", G2),
  // 3 — Artistas tauromáquicos
  a("3010", "Toureiros", G3),
  a("3019", "Outros artistas tauromáquicos", G3),
  // 4 — Economistas, contabilistas, atuários e técnicos similares
  a("4010", "Atuários", G4),
  a("4011", "Auditores", G4),
  a("4012", "Consultores fiscais", G4),
  a("4013", "Contabilistas", G4),
  a("4014", "Economistas", G4),
  a("4015", "Técnicos oficiais de contas", G4),
  a("4016", "Técnicos similares", G4),
  // 5 — Enfermeiros, parteiras e outros técnicos paramédicos
  a("5010", "Enfermeiros", G5),
  a("5012", "Fisioterapeutas", G5),
  a("5013", "Nutricionistas", G5),
  a("5014", "Parteiras", G5),
  a("5015", "Terapeutas da fala", G5),
  a("5016", "Terapeutas ocupacionais", G5),
  a("5019", "Outros técnicos paramédicos", G5),
  // 6 — Juristas
  a("6010", "Advogados", G6),
  a("6011", "Jurisconsultos", G6),
  a("6012", "Solicitadores", G6),
  // 7 — Médicos
  a("7010", "Dentistas", G7),
  a("7011", "Médicos analistas", G7),
  a("7012", "Médicos cirurgiões", G7),
  a("7013", "Médicos de bordo em navios", G7),
  a("7014", "Médicos de clínica geral", G7),
  a("7015", "Médicos dentistas", G7),
  a("7016", "Médicos estomatologistas", G7),
  a("7017", "Médicos fisiatras", G7),
  a("7018", "Médicos gastroenterologistas", G7),
  a("7019", "Médicos oftalmologistas", G7),
  a("7020", "Médicos ortopedistas", G7),
  a("7021", "Médicos otorrinolaringologistas", G7),
  a("7022", "Médicos pediatras", G7),
  a("7023", "Médicos radiologistas", G7),
  a("7024", "Médicos de outras especialidades", G7),
  // 8 — Professores e técnicos similares
  a("8010", "Explicadores", G8),
  a("8011", "Formadores", G8),
  a("8012", "Professores", G8),
  // 9 — Profissionais dependentes de nomeação oficial
  a("9010", "Revisores oficiais de contas", G9),
  a("9011", "Notários", G9),
  // 10 — Psicólogos e sociólogos
  a("1010", "Psicólogos", G10),
  a("1011", "Sociólogos", G10),
  // 11 — Químicos
  a("1110", "Analistas", G11),
  // 12 — Sacerdotes
  a("1210", "Sacerdotes de qualquer religião", G12),
  // 13 — Outras pessoas exercendo profissões liberais, técnicas e assimiladas
  a("1310", "Administradores de bens", G13),
  a("1311", "Ajudantes familiares", G13),
  a("1312", "Amas", G13),
  a("1313", "Analistas de sistemas", G13),
  a("1314", "Arqueólogos", G13),
  a("1315", "Assistentes sociais", G13),
  a("1316", "Astrólogos", G13),
  a("1317", "Parapsicólogos", G13),
  a("1318", "Biólogos", G13),
  a("1319", "Comissionistas", G13),
  a("1320", "Consultores", G13),
  a("1321", "Dactilógrafos", G13),
  a("1322", "Decoradores", G13),
  a("1323", "Desportistas", G13),
  a("1324", "Engomadores", G13),
  a("1325", "Esteticistas, manicuras e pedicuras", G13),
  a("1326", "Guias-intérpretes", G13),
  a("1327", "Jornalistas e repórteres", G13),
  a("1328", "Louvados", G13),
  a("1329", "Massagistas", G13),
  a("1330", "Mediadores imobiliários", G13),
  a("1331", "Peritos-avaliadores", G13),
  a("1332", "Programadores informáticos", G13),
  a("1333", "Publicitários", G13),
  a("1334", "Tradutores", G13),
  a("1335", "Farmacêuticos", G13),
  a("1336", "Designers", G13),
  // 14 — Veterinários
  a("1410", "Veterinários", G14),
  // 15 — Outros (residual: coeficiente 0,35)
  { label: "1519 · Outros prestadores de serviços", tipo: "outros", grupo: G15 },
  // Categorias adicionais (fora do Art. 151.º) ──────────────────────────
  // Comércio, produção e hotelaria — coeficiente 0,15
  { label: "Venda de bens / comércio", tipo: "vendas", grupo: G_COM },
  { label: "Restauração e bebidas", tipo: "vendas", grupo: G_COM },
  { label: "Alojamento local / hotelaria", tipo: "vendas", grupo: G_COM },
  { label: "Produção / artesanato", tipo: "vendas", grupo: G_COM },
  // Propriedade intelectual — coeficiente 0,95
  { label: "Direitos de autor (obra própria)", tipo: "diretosAutor", grupo: G_PI },
  { label: "Licenciamento de software / propriedade industrial", tipo: "diretosAutor", grupo: G_PI },
  { label: "Royalties / cedência de marca", tipo: "diretosAutor", grupo: G_PI },
  // Alojamento local e regimes especiais (coeficientes próprios) ─────────
  {
    label: "Alojamento local — estabelecimento (hotelaria)",
    tipo: "vendas",
    grupo: "Alojamento e regimes especiais",
    coef: 0.15,
    retencao: 0,
    baseSS: "bens",
    regra15: false,
    legalCoef: "Art. 31.º, al. a) CIRS",
    nota: "Coeficiente 0,15 (hotelaria). Sem retenção (hóspedes/plataformas). Segurança Social sobre 20% (hotelaria).",
  },
  {
    label: "Alojamento local — moradia / apartamento",
    tipo: "vendas",
    grupo: "Alojamento e regimes especiais",
    coef: 0.35,
    retencao: 0,
    baseSS: "bens",
    regra15: false,
    legalCoef: "Art. 31.º CIRS (alojamento local, moradia/apartamento)",
    nota: "Coeficiente 0,35. Em zona de contenção sobe para 0,50. A eventual isenção de Segurança Social depende de exerceres AL em exclusivo — é condicional, não é aplicada automaticamente. Confirma com o teu contabilista.",
  },
  {
    label: "Alojamento local — moradia em zona de contenção",
    tipo: "vendas",
    grupo: "Alojamento e regimes especiais",
    coef: 0.5,
    retencao: 0,
    baseSS: "bens",
    regra15: false,
    legalCoef: "Art. 31.º, al. h) CIRS",
    nota: "Coeficiente 0,50 (zona de pressão urbanística; exige o anexo 13F). A eventual isenção de Segurança Social depende de exerceres AL em exclusivo — é condicional, não é aplicada automaticamente. Confirma com o teu contabilista.",
  },
  {
    label: "Serviços a sociedade própria (transparência fiscal)",
    tipo: "art151",
    grupo: "Alojamento e regimes especiais",
    coef: 1.0,
    regra15: false,
    legalCoef: "Art. 31.º, al. g) CIRS",
    nota: "Coeficiente 1,0 quando prestas serviços a sociedade onde deténs ≥ 5% por mais de 183 dias.",
  },
  // Subsídios e subvenções (categoria B) — coeficientes próprios ──────────
  {
    label: "Subsídio destinado à exploração",
    tipo: "outros",
    grupo: G_SUB,
    coef: 0.1,
    retencao: 0,
    baseSS: "servicos",
    regra15: false,
    legalCoef: "Art. 31.º, al. f) CIRS",
    nota: "Coeficiente 0,10. Inclui também os restantes rendimentos da categoria B não previstos noutras alíneas. O enquadramento na Segurança Social deve ser confirmado com o teu contabilista.",
  },
  {
    label: "Subsídio não destinado à exploração",
    tipo: "outros",
    grupo: G_SUB,
    coef: 0.3,
    retencao: 0,
    baseSS: "servicos",
    regra15: false,
    legalCoef: "Art. 31.º, al. e) CIRS",
    nota: "Coeficiente 0,30. Tributado em 1/5 no ano de recebimento e em cada um dos quatro anos seguintes. O enquadramento na Segurança Social deve ser confirmado com o teu contabilista.",
  },

  // ── Cessão de equipamentos ──────────────────────────────────────────────
  // Art. 101.º, al. b) CIRS: retenção 16,5%; Art. 31.º, al. d): coef. 0,95
  {
    label: "Cessão de uso de equipamentos",
    tipo: "diretosAutor",
    grupo: "Cessão de equipamentos",
    legalCoef: "Art. 31.º, al. d) CIRS — cessão ou utilização de equipamentos",
    nota: "Cedência temporária de equipamentos a terceiros. Coeficiente 0,95 e retenção de 16,5% (Art. 101.º, al. b) CIRS). Distinto da venda — aplica-se quando cedes o uso, não a propriedade.",
  },
  {
    label: "Aluguer de equipamentos / maquinaria",
    tipo: "diretosAutor",
    grupo: "Cessão de equipamentos",
    legalCoef: "Art. 31.º, al. d) CIRS",
    nota: "Coeficiente 0,95 e retenção 16,5%. Consulta o teu contabilista se a atividade principal for comércio.",
  },

  // ── Atividades agrícolas e rurais ───────────────────────────────────────
  // Art. 31.º CIRS: coeficiente 0,10 para atividades agrícolas, silvícolas e pecuárias
  {
    label: "Atividades agrícolas, silvícolas e pecuárias",
    tipo: "outros",
    grupo: "Atividades agrícolas e rurais",
    coef: 0.1,
    retencao: 0,
    baseSS: "bens",
    regra15: false,
    legalCoef: "Art. 31.º CIRS — atividades agrícolas, silvícolas e pecuárias",
    nota: "Coeficiente 0,10. Sem retenção na fonte. Segurança Social calculada sobre 20% do rendimento (equiparado a venda de bens).",
  },
  {
    label: "Atividades aquícolas, avícolas e apícolas",
    tipo: "outros",
    grupo: "Atividades agrícolas e rurais",
    coef: 0.1,
    retencao: 0,
    baseSS: "bens",
    regra15: false,
    legalCoef: "Art. 31.º CIRS — atividades aquícolas, avícolas, apícolas",
    nota: "Coeficiente 0,10. Sem retenção na fonte. Segurança Social sobre 20%.",
  },
  {
    label: "Produção agrícola (outra atividade rural)",
    tipo: "outros",
    grupo: "Atividades agrícolas e rurais",
    coef: 0.1,
    retencao: 0,
    baseSS: "bens",
    regra15: false,
    legalCoef: "Art. 31.º CIRS",
    nota: "Para atividades rurais não listadas acima. Coeficiente 0,10.",
  },

  // ── Criadores, artistas e media ─────────────────────────────────────────
  // Profissões criativas não incluídas no Art. 151.º: coef. 0,35, retenção 11,5% (Art. 101.º, al. c)
  {
    label: "Fotógrafo / fotógrafa",
    tipo: "outros",
    grupo: "Criadores, artistas e media",
    legalCoef: "Art. 31.º, al. c) CIRS — outras prestações de serviços",
    nota: "Coeficiente 0,35. Retenção de 11,5% (Art. 101.º, al. c). Se cederes os direitos de autor das fotografias, parte dos rendimentos pode enquadrar-se em propriedade intelectual (coef. 0,95, ret. 16,5%).",
  },
  {
    label: "Videógrafo / realizador de vídeo",
    tipo: "outros",
    grupo: "Criadores, artistas e media",
    legalCoef: "Art. 31.º, al. c) CIRS",
    nota: "Coeficiente 0,35. Retenção de 11,5% (Art. 101.º, al. c). Tal como na fotografia, a cedência de direitos de autor pode ter enquadramento distinto.",
  },
  {
    label: "Influencer / criador de conteúdo digital",
    tipo: "outros",
    grupo: "Criadores, artistas e media",
    legalCoef: "Art. 31.º, al. c) CIRS",
    nota: "Coeficiente 0,35. Retenção de 11,5% (Art. 101.º, al. c) quando o cliente é uma entidade com contabilidade organizada. Patrocínios e publicidade são rendimentos de serviços.",
  },
  {
    label: "DJ profissional",
    tipo: "outros",
    grupo: "Criadores, artistas e media",
    legalCoef: "Art. 31.º, al. c) CIRS",
    nota: "Coeficiente 0,35. Retenção de 11,5% (Art. 101.º, al. c). Se atuares como artista de espetáculo ao vivo e estiveres no Art. 151.º, a retenção é de 23% — confirma com o teu contabilista.",
  },
  {
    label: "Modelo profissional",
    tipo: "outros",
    grupo: "Criadores, artistas e media",
    legalCoef: "Art. 31.º, al. c) CIRS",
    nota: "Coeficiente 0,35. Retenção de 11,5% (Art. 101.º, al. c).",
  },
  {
    label: "Escritor / autor (obra própria)",
    tipo: "diretosAutor",
    grupo: "Criadores, artistas e media",
    legalCoef: "Art. 31.º, al. d) CIRS — titular originário de obra literária",
    nota: "Coeficiente 0,95 para o criador da obra (titular originário). Retenção de 16,5%. Se cederes apenas os direitos de edição/reprodução, o enquadramento mantém-se em propriedade intelectual.",
  },
  {
    label: "Guionista / redator criativo",
    tipo: "diretosAutor",
    grupo: "Criadores, artistas e media",
    legalCoef: "Art. 31.º, al. d) CIRS",
    nota: "Coeficiente 0,95 quando o rendimento provém de obra própria (direitos de autor). Se for prestação de serviços de escrita sem transferência de direitos, usar coef. 0,35.",
  },

  // ── Serviços em geral ───────────────────────────────────────────────────
  // Profissões de serviços não incluídas no Art. 151.º: coef. 0,35, ret. 11,5% (Art. 101.º, al. c)
  {
    label: "Personal trainer / instrutor de fitness",
    tipo: "outros",
    grupo: "Serviços em geral",
    legalCoef: "Art. 31.º, al. c) CIRS",
    nota: "Coeficiente 0,35. Retenção de 11,5% (Art. 101.º, al. c). Distinto de 1323 Desportistas (atletas profissionais). Aplicável a treino pessoal, aulas de grupo e similares.",
  },
  {
    label: "Cozinheiro / chef freelance",
    tipo: "outros",
    grupo: "Serviços em geral",
    legalCoef: "Art. 31.º, al. c) CIRS",
    nota: "Coeficiente 0,35 para prestação de serviços de cozinha. Se explorares estabelecimento de restauração próprio, usa a categoria Restauração e bebidas (coef. 0,15).",
  },
  {
    label: "Consultor de marketing / redes sociais",
    tipo: "outros",
    grupo: "Serviços em geral",
    legalCoef: "Art. 31.º, al. c) CIRS",
    nota: "Coeficiente 0,35. Retenção de 11,5% (Art. 101.º, al. c). Se exerceres com o código 1333 (Publicitários) do Art. 151.º, o coeficiente passa a 0,75 e a retenção a 23%.",
  },
  {
    label: "Técnico de informática / suporte IT",
    tipo: "outros",
    grupo: "Serviços em geral",
    legalCoef: "Art. 31.º, al. c) CIRS",
    nota: "Coeficiente 0,35 para suporte e manutenção informática. Se desenvolveres software, considera 1332 Programadores informáticos (Art. 151.º, coef. 0,75).",
  },
  {
    label: "Explicador / tutor privado",
    tipo: "outros",
    grupo: "Serviços em geral",
    legalCoef: "Art. 31.º, al. c) CIRS",
    nota: "Coeficiente 0,35. Alternativa: código 8010 Explicadores do Art. 151.º (coef. 0,75, ret. 23%) se realizares explicações no sentido tradicional.",
  },
  {
    label: "Esteticista / manicure / pedicure",
    tipo: "outros",
    grupo: "Serviços em geral",
    legalCoef: "Art. 31.º, al. c) CIRS",
    nota: "Coeficiente 0,35. Alternativa: código 1325 do Art. 151.º (coef. 0,75, ret. 23%) — confirma com o teu contabilista qual o enquadramento mais favorável.",
  },
  {
    label: "Mediador imobiliário (não certificado IMPIC)",
    tipo: "outros",
    grupo: "Serviços em geral",
    legalCoef: "Art. 31.º, al. c) CIRS",
    nota: "Coeficiente 0,35. Mediadores certificados pelo IMPIC podem usar o código 1330 do Art. 151.º (coef. 0,75, ret. 23%).",
  },
  {
    label: "Comercial / vendedor freelance (serviços)",
    tipo: "outros",
    grupo: "Serviços em geral",
    legalCoef: "Art. 31.º, al. c) CIRS",
    nota: "Coeficiente 0,35 para comissionistas de serviços. Se comissionas vendas de bens pode aplicar-se coef. 0,15 (1319 Comissionistas, Art. 151.º).",
  },
  {
    label: "Prestação de serviços (outra — não Art. 151.º)",
    tipo: "outros",
    grupo: "Serviços em geral",
    legalCoef: "Art. 31.º, al. c) CIRS",
    nota: "Para serviços não enquadráveis em nenhuma das categorias acima. Coeficiente 0,35. Retenção de 11,5% (Art. 101.º, al. c).",
  },

  // ── Comércio e transportes ──────────────────────────────────────────────
  {
    label: "TVDE — motorista (plataformas Uber, Bolt…)",
    tipo: "vendas",
    grupo: G_COM,
    coef: 0.15,
    retencao: 0,
    baseSS: "bens",
    regra15: false,
    legalCoef: "Art. 31.º, al. a) CIRS — transportes (atividade de TVDE)",
    nota: "Coeficiente 0,15 (transporte de passageiros). Sem retenção (as plataformas não retêm na fonte). Segurança Social sobre 20%.",
  },
  {
    label: "Transporte de mercadorias / estafeta",
    tipo: "vendas",
    grupo: G_COM,
    coef: 0.15,
    retencao: 0,
    baseSS: "bens",
    regra15: false,
    legalCoef: "Art. 31.º, al. a) CIRS — transportes",
    nota: "Coeficiente 0,15. Sem retenção. Segurança Social sobre 20%.",
  },
  {
    label: "Atividade comercial ou industrial (outra)",
    tipo: "vendas",
    grupo: G_COM,
    nota: "Para comércio ou indústria não enquadráveis nas categorias acima. Coeficiente 0,15.",
  },
];

/**
 * Resolve o efeito fiscal efetivo de uma atividade: aplica os overrides do
 * regime especial sobre os valores por defeito do `tipo`. É o "pacote de regras"
 * que cada atividade carrega (coeficiente, retenção, base de SS, regra dos 15%).
 */
export function efeitoFiscal(a: Atividade): EfeitoFiscal {
  return {
    coef: a.coef ?? COEFICIENTE_POR_TIPO[a.tipo],
    retencao: a.retencao ?? RETENCAO[a.tipo].value,
    baseSS: a.baseSS ?? BASE_SS_POR_TIPO[a.tipo],
    regra15: a.regra15 ?? (a.tipo === "art151" || a.tipo === "outros"),
    nota: a.nota,
    legalCoef: a.legalCoef ?? "Art. 31.º CIRS",
  };
}

// ═══════════════════════════════════════════════════════════════════════
//  DEDUÇÕES À COLETA (IRS) — valores 2026
// ═══════════════════════════════════════════════════════════════════════
export const DEDUCAO_DEPENDENTE = sv(600, "Art. 78.º-A CIRS — por dependente com mais de 3 anos", "art78aCirs", TODAY);
export const DEDUCAO_DEPENDENTE_BEBE = sv(726, "Art. 78.º-A CIRS — por dependente até 3 anos", "art78aCirs", TODAY);

/**
 * Dedução adicional por dependente com deficiência ≥ 60% (Art. 87.º CIRS).
 * Base: 2,5 × IAS. Acumula com a dedução base por dependente.
 */
export const DEDUCAO_DEPENDENTE_DEFICIENCIA = sv(
  Math.round(2.5 * IAS.value * 100) / 100,
  "Art. 87.º CIRS — 2,5 × IAS por dependente com grau de incapacidade ≥ 60%",
  "portalFinancasArt87",
  TODAY
);

export interface DeducaoLimitada {
  taxa: number;
  limite: number;
}
export const DEDUCAO_DESP_GERAIS = sv<DeducaoLimitada>(
  { taxa: 0.35, limite: 250 },
  "Art. 78.º-B CIRS — despesas gerais familiares: 35% até 250 €/sujeito",
  "art78aCirs",
  TODAY
);
export const DEDUCAO_SAUDE = sv<DeducaoLimitada>(
  { taxa: 0.15, limite: 1000 },
  "Art. 78.º-C CIRS — saúde: 15% até 1.000 €",
  "art78aCirs",
  TODAY
);
export const DEDUCAO_EDUCACAO = sv<DeducaoLimitada>(
  { taxa: 0.3, limite: 800 },
  "Art. 78.º-D CIRS — educação: 30% até 800 €",
  "art78aCirs",
  TODAY
);

/** Dedução de rendas habitação permanente (Art. 78.º-E CIRS): 15% até 900 € (Lei 36/2024). */
export const DEDUCAO_RENDAS = sv<DeducaoLimitada>(
  { taxa: 0.15, limite: 900 },
  "Art. 78.º-E CIRS — rendas de habitação permanente: 15% até 900 € (Lei 36/2024, rendimentos de 2026)",
  "art78aCirs",
  TODAY,
  "Limite atualizado pela Lei 36/2024: 700 € em 2025, 900 € em 2026, 1.000 € a partir de 2027."
);

/** Dedução majorada por dependente (Art. 78.º-A n.º 6 CIRS).
 *  Na lei: 900 € aplica-se a partir do 2.º dependente com até 6 anos.
 *  No simulador: usado como majoração a partir do 3.º dependente (simplificação
 *  conservadora — a UI não recolhe a faixa etária 3–6 anos). */
export const DEDUCAO_DEPENDENTE_3MAIS = sv(
  900,
  "Art. 78.º-A n.º 6 CIRS — 2.º dependente e seguintes até 6 anos (900 €)",
  "art78aCirs",
  TODAY,
  "Na lei: 900 € por dependente a partir do 2.º, até 6 anos. O simulador aplica-a a partir do 3.º (simplificação conservadora — não recolhe faixa 3–6 anos)."
);

/** Divisor do rendimento na tributação conjunta dos casados/unidos de facto. */
export const QUOCIENTE_CONJUGAL = sv(2, "Art. 69.º CIRS — quociente conjugal (divisão por 2)", "art78aCirs", TODAY);

/** Limite global das deduções à coleta (Art. 78.º, n.º 7), escalonado. */
export const LIMITE_GLOBAL_DEDUCOES = sv(
  { semLimiteAte: 8342, limiteAlto: 2500, limiteBaixo: 1000, escalaoSuperior: 80000 },
  "Art. 78.º, n.º 7 CIRS — sem limite até 8.342 € (1.º escalão Art. 68.º 2026); entre 1.000 € e 2.500 € até 80.000 € (Art. 68.º-A); 1.000 € acima",
  "art78aCirs",
  TODAY,
  "semLimiteAte = 1.º escalão Art. 68.º (8.342 € em 2026); escalaoSuperior = 1.º escalão Art. 68.º-A (80.000 €, fixo)."
);

/**
 * Majoração do limite global das deduções à coleta em agregados numerosos
 * (Art. 78.º, n.º 8): a partir do 3.º dependente, o limite do n.º 7 sobe 5% por
 * cada dependente. A majoração conta TODOS os dependentes, não só os que
 * excedem dois — com 4 dependentes o limite sobe 20%, não 10%.
 */
export const LIMITE_GLOBAL_MAJORACAO_DEPENDENTES = sv(
  { minDependentes: 3, porDependente: 0.05 },
  "Art. 78.º, n.º 8 CIRS — limites do n.º 7 majorados em 5% por dependente nos agregados com três ou mais",
  "art78aCirs",
  TODAY
);

// ═══════════════════════════════════════════════════════════════════════
//  TRIBUTAÇÃO AUTÓNOMA — IRC (Art. 88.º CIRC)
//  ---------------------------------------------------------------------
//  Incide sobre encargos anuais de viaturas e determinadas despesas,
//  independentemente do IRC regular. O custo de aquisição da viatura
//  determina o escalão (não o encargo em si).
//  Thresholds corrigidos pelo OE2025 (€37 500 e €45 000); PHEV criado
//  pelo OE2026 para viaturas Euro 6e-bis com < 80 g CO₂/km.
// ═══════════════════════════════════════════════════════════════════════

/** Limiares do custo de aquisição que determinam o escalão de TA de viaturas. */
export const TA_THRESHOLDS = sv(
  { t1: 37500, t2: 45000 },
  "Art. 88.º, n.os 3 e 11 CIRC — limiares do custo de aquisição (OE2025)",
  "occTA",
  TODAY,
  "Thresholds anteriores (até 2024): €27 500 e €35 000. Atualizados pelo OE2025."
);

export interface TAViaturasTaxas {
  /** Encargos de viatura com custo de aquisição ≤ t1. */
  ate37500: number;
  /** Encargos de viatura com custo de aquisição > t1 e ≤ t2. */
  ate45000: number;
  /** Encargos de viatura com custo de aquisição > t2. */
  acima45000: number;
}

export const TA_VIATURAS_COMBUSTAO = sv<TAViaturasTaxas>(
  { ate37500: 0.08, ate45000: 0.25, acima45000: 0.32 },
  "Art. 88.º, n.º 3 CIRC — viaturas ligeiras de passageiros a gasóleo/gasolina (OE2025)",
  "occTA",
  TODAY,
  "Taxas anteriores (até 2024): 10% / 17,5% / 35%. Substituídas pelo OE2025."
);

export const TA_VIATURAS_PHEV = sv<TAViaturasTaxas>(
  { ate37500: 0.025, ate45000: 0.075, acima45000: 0.15 },
  "Art. 88.º, n.º 11 CIRC — viaturas PHEV (Euro 6e-bis, < 80 g CO₂/km) — OE2026",
  "occTA",
  TODAY,
  "Nova categoria OE2026 para híbridos plug-in conformes Euro 6e-bis. Threshold = custo de aquisição."
);

export const TA_VIATURAS_ELETRICA = sv(
  0,
  "Art. 88.º, n.º 20 CIRC — viaturas 100% elétricas com custo de aquisição até 62 500 €: taxa zero",
  "occTA",
  "2026-07-20",
  "A isenção só vale até ao limite da Portaria n.º 467/2010 (62 500 € para elétricos); acima, aplica-se 10%."
);

/** Custo de aquisição a partir do qual as viaturas elétricas pagam TA. */
export const TA_ELETRICA_LIMITE_CUSTO = sv(
  62_500,
  "Portaria n.º 467/2010, Art. 1.º, n.º 4, al. a) — limite do custo de aquisição para viaturas exclusivamente elétricas",
  "occTA",
  "2026-07-20"
);

/** Taxa de TA das viaturas elétricas cujo custo de aquisição excede o limite. */
export const TA_VIATURAS_ELETRICA_ACIMA_LIMITE = sv(
  0.10,
  "Art. 88.º, n.º 20 CIRC — encargos de viaturas 100% elétricas com custo de aquisição superior a 62 500 €: 10%",
  "occTA",
  "2026-07-20"
);

/** Despesas de representação (n.º 7 do Art. 88.º). */
export const TA_REPRESENTACAO = sv(
  0.10,
  "Art. 88.º, n.º 7 CIRC — despesas de representação: 10%",
  "occTA",
  TODAY
);

/** Ajudas de custo e quilómetros em viatura própria (n.º 9 do Art. 88.º). */
export const TA_AJUDAS_CUSTO = sv(
  0.05,
  "Art. 88.º, n.º 9 CIRC — ajudas de custo e quilómetros em viatura própria: 5%",
  "occTA",
  TODAY
);

/** Despesas não documentadas (n.º 1 do Art. 88.º). */
export const TA_NAO_DOCUMENTADAS = sv(
  0.50,
  "Art. 88.º, n.º 1 CIRC — despesas não documentadas: 50%",
  "occTA",
  TODAY
);

/**
 * Agravamento de +10 p.p. quando há prejuízo fiscal (n.º 14 do Art. 88.º).
 * Não se aplica nos primeiros 3 anos de atividade nem se houve lucro em
 * pelo menos 1 dos 3 exercícios anteriores.
 */
export const TA_AGRAVAMENTO_PREJUIZO = sv(
  0.10,
  "Art. 88.º, n.º 14 CIRC — agravamento de 10 p.p. em caso de prejuízo fiscal",
  "occTA",
  TODAY,
  "Exceção: não se aplica nos primeiros 3 anos ou se houve lucro em ≥1 dos 3 exercícios anteriores."
);

// ═══════════════════════════════════════════════════════════════════════
//  RFAI — Regime Fiscal de Apoio ao Investimento (Art. 22.º–26.º CFI)
//  Verificado: estrategor.pt Jan 2026; santander.pt Abr 2026; OCC Jan 2026.
// ═══════════════════════════════════════════════════════════════════════

export const RFAI_TAXA_INTERIOR = sv(
  0.30,
  "Art. 23.º CFI — 30% do investimento elegível nas regiões Norte, Centro, Alentejo, Açores e Madeira (até €15 M)",
  "cfi",
  TODAY
);

export const RFAI_TAXA_INTERIOR_EXCEDENTE = sv(
  0.10,
  "Art. 23.º CFI — 10% sobre a parcela do investimento que exceda €15 M nas regiões interiores",
  "cfi",
  TODAY
);

export const RFAI_TAXA_LITORAL = sv(
  0.10,
  "Art. 23.º CFI — 10% do investimento elegível nas regiões de Lisboa e Algarve",
  "cfi",
  TODAY
);

export const RFAI_LIMITE_INVESTIMENTO_INTERIOR = sv(
  15_000_000,
  "Art. 23.º CFI — limiar de €15 000 000 para aplicação da taxa de 30%",
  "occRFAI",
  TODAY
);

/**
 * Limite máximo de dedução à coleta: 50% da coleta IRC no período.
 * Nos primeiros 3 anos de atividade elegível, o limite é 100%.
 */
export const RFAI_LIMITE_COLETA = sv(
  0.50,
  "Art. 24.º CFI — dedução limitada a 50% da coleta IRC (100% nos primeiros 3 anos)",
  "occRFAI",
  TODAY
);

/** Exercícios seguintes em que o saldo não deduzido pode ser reportado. */
export const RFAI_REPORTE_ANOS = sv(
  10,
  "Art. 24.º CFI — saldo não deduzido reportável por 10 exercícios seguintes",
  "occRFAI",
  TODAY
);

// ═══════════════════════════════════════════════════════════════════════
//  DLRR — REVOGADA. Os Art. 27.º–34.º do CFI foram revogados pelo
//  Art. 281.º da Lei n.º 24-D/2022 (OE2023), com efeitos a 1 jan 2023.
//  O regime só se aplicou a lucros retidos até ao período de 2022 — NÃO
//  pode ser simulado como poupança em 2026. Sucedido pelo ICE (Incentivo
//  à Capitalização das Empresas, Art. 43.º-D EBF), cuja dedução depende
//  da Euribor 12M (+ spread de 2 p.p. para PME/Small Mid Cap) sobre os
//  aumentos líquidos dos capitais próprios elegíveis — sem taxa fixa
//  simulável sem dados do balanço, pelo que não há parâmetros numéricos
//  aqui (ver fonte `occICE`).
// ═══════════════════════════════════════════════════════════════════════

/** Nota informativa única sobre a revogação da DLRR e o sucessor ICE. */
export const DLRR_REVOGADA_NOTA = sv(
  "A DLRR foi revogada com efeitos a 1 de janeiro de 2023 (Art. 281.º da Lei n.º 24-D/2022 — OE2023). O benefício sucessor é o ICE — Incentivo à Capitalização das Empresas (Art. 43.º-D EBF): dedução ao lucro tributável correspondente à Euribor a 12 meses do período, adicionada de um spread de 2 pontos percentuais, sobre os aumentos líquidos dos capitais próprios elegíveis. O apuramento exige dados do balanço — fala com um contabilista certificado.",
  "Art. 281.º Lei 24-D/2022 (revogação) · Art. 43.º-D EBF (ICE)",
  "ebf43d",
  REV_EMPRESA,
  "O spread do n.º 1 passou a ser único com a Lei n.º 45-A/2024, que revogou o n.º 2 — deixou de haver majoração por dimensão da empresa."
);

// ═══════════════════════════════════════════════════════════════════════
//  ICE — Incentivo à Capitalização das Empresas (Art. 43.º-D EBF)
//  Verificado a 07/08/2026 contra o articulado no Portal das Finanças,
//  na redação da Lei n.º 45-A/2024.
//
//  A taxa não é simulável sem dados do período: depende da média da
//  Euribor a 12 meses calculada com base no último dia de cada mês. O que
//  É fixo — e é o que decide se vale a pena — são o spread, os dois
//  limites do n.º 4 e o reporte do n.º 5.
// ═══════════════════════════════════════════════════════════════════════

export const ICE = {
  spread: sv(
    0.02,
    "Art. 43.º-D, n.º 1 EBF — taxa Euribor a 12 meses do período, adicionada de um spread de 2 pontos percentuais",
    "ebf43d",
    REV_EMPRESA,
    "Spread único desde a Lei n.º 45-A/2024, que revogou o n.º 2 (majoração para PME e Small Mid Cap)."
  ),
  limiteAbsoluto: sv(
    4_000_000,
    "Art. 43.º-D, n.º 4, al. a) EBF — a dedução não pode exceder, em cada período, o MAIOR de €4 000 000 ou do limite da al. b)",
    "ebf43d",
    REV_EMPRESA
  ),
  limiteEbitda: sv(
    0.30,
    "Art. 43.º-D, n.º 4, al. b) EBF — 30% do resultado antes de depreciações, amortizações, gastos de financiamento líquidos e impostos, nos termos do art. 67.º do CIRC",
    "ebf43d",
    REV_EMPRESA
  ),
  reporteAnos: sv(
    5,
    "Art. 43.º-D, n.º 5 EBF — a parte que exceda o limite da al. b) do n.º 4 é dedutível num ou mais dos cinco períodos de tributação posteriores",
    "ebf43d",
    REV_EMPRESA
  ),
  periodosAnteriores: sv(
    6,
    "Art. 43.º-D, n.º 3 EBF — os aumentos líquidos apuram-se pelo somatório do próprio exercício e de cada um dos seis períodos de tributação anteriores",
    "ebf43d",
    REV_EMPRESA,
    "Resultando desse somatório uma diferença negativa, considera-se zero — não gera dedução negativa."
  ),
  primeiroPeriodoElegivel: sv(
    "períodos de tributação que se iniciem em ou após 1 de janeiro de 2023",
    "Art. 43.º-D, n.º 9 EBF",
    "ebf43d",
    REV_EMPRESA
  ),
  exigeSituacaoRegularizada: sv(
    "ter a situação fiscal e contributiva regularizada, contabilidade regularmente organizada e lucro tributável não determinado por métodos indiretos",
    "Art. 43.º-D, n.º 7, als. b), c) e d) EBF",
    "ebf43d",
    REV_EMPRESA
  ),
};

// ═══════════════════════════════════════════════════════════════════════
//  STOCK OPTIONS — Art. 43.º-C EBF (Lei das Startups, Lei n.º 21/2023)
//  + Art. 72.º, n.º 1, al. f) do CIRS.
//  Verificado a 07/08/2026 contra os dois articulados.
//
//  A taxa efetiva não está escrita em lado nenhum: sai do encontro dos
//  dois artigos. O EBF manda considerar metade do ganho; o CIRS tributa
//  o que resta à taxa autónoma de 28%. Metade de 28 dá 14 — e é por isso
//  que a fração e a taxa vivem aqui juntas e derivadas, e não à mão.
// ═══════════════════════════════════════════════════════════════════════

export const STOCK_OPTIONS_STARTUP = {
  fracaoTributada: sv(
    0.5,
    "Art. 43.º-C, n.º 1 EBF — os ganhos são considerados em 50% do seu valor",
    "ebf43c",
    REV_EMPRESA
  ),
  taxa: sv(
    0.28,
    "Art. 72.º, n.º 1, al. f) CIRS — taxa autónoma de 28% sobre os ganhos que beneficiem do regime do art. 43.º-C do EBF",
    "art72cirsF",
    REV_EMPRESA
  ),
  retencaoMinimaAnos: sv(
    1,
    "Art. 43.º-C, n.º 4 EBF — a tributação depende da manutenção dos direitos subjacentes por um período mínimo de um ano",
    "ebf43c",
    REV_EMPRESA
  ),
  isencaoSaidaEmIas: sv(
    20,
    "Art. 43.º-C, n.º 5 EBF — perdendo a residência, os rendimentos ficam parcialmente isentos até 20 × IAS, sendo englobados para determinação da taxa dos restantes",
    "ebf43c",
    REV_EMPRESA
  ),
  isencaoSaidaUmaVez: sv(
    "a isenção só pode ser utilizada uma vez pelo sujeito passivo",
    "Art. 43.º-C, n.º 6 EBF",
    "ebf43c",
    REV_EMPRESA
  ),
  prazoRespostaEntidadeDias: sv(
    90,
    "Art. 43.º-C, n.º 8 EBF — confirmando por escrito, ou não respondendo no prazo de 90 dias, a entidade é subsidiariamente responsável pelo imposto em falta",
    "ebf43c",
    REV_EMPRESA
  ),
  participacaoQueExclui: sv(
    0.20,
    "Art. 43.º-C, n.º 9 EBF — estão excluídos os sujeitos passivos que detenham, direta ou indiretamente, participação não inferior a 20% do capital social ou dos direitos de voto",
    "ebf43c",
    REV_EMPRESA,
    "O n.º 10 afasta esta exclusão nas startups e nas micro e pequenas empresas."
  ),
  limiarInovacao: sv(
    0.10,
    "Art. 43.º-C, n.º 2, al. b) EBF — despesas com I&D, patentes, desenhos ou modelos industriais ou programas de computador equivalentes a pelo menos 10% dos gastos ou do volume de negócios",
    "ebf43c",
    REV_EMPRESA
  ),
  momentosDeTributacao: sv(
    "alienação dos valores mobiliários, perda da qualidade de residente em território português ou transmissão gratuita — o primeiro que ocorrer",
    "Art. 43.º-C, n.º 4, als. a), b) e c) EBF",
    "ebf43c",
    REV_EMPRESA
  ),
};

/** Taxa efetiva do regime: metade do ganho, à taxa autónoma. */
export const STOCK_OPTIONS_TAXA_EFETIVA =
  STOCK_OPTIONS_STARTUP.fracaoTributada.value * STOCK_OPTIONS_STARTUP.taxa.value;

// ═══════════════════════════════════════════════════════════════════════
//  DEPRECIAÇÕES (Arts. 31.º, 33.º e 34.º CIRC) — verificados a 07/08/2026.
//  As TAXAS por tipo de ativo não estão no Código: o art. 31.º remete para
//  «o decreto regulamentar que estabelece o respetivo regime», e é lá que
//  vivem. Não são publicadas aqui — o que é publicável é o mecanismo.
// ═══════════════════════════════════════════════════════════════════════

export const ELEMENTOS_REDUZIDO_VALOR = sv(
  1000,
  "Art. 33.º CIRC — custo unitário de aquisição ou produção até €1 000: dedução integral no período de tributação em que seja reconhecido",
  "circ33",
  REV_EMPRESA,
  "Exceto quando o elemento faça parte integrante de um conjunto que deva ser depreciado como um todo — a exceção que trava a compra de um portátil «às peças»."
);

export const DEPRECIACAO = {
  /** Coeficientes máximos do método das quotas decrescentes, por vida útil. */
  quotasDecrescentes: sv(
    [
      { vidaUtil: "inferior a cinco anos", coeficiente: 1.5 },
      { vidaUtil: "de cinco ou seis anos", coeficiente: 2 },
      { vidaUtil: "superior a seis anos", coeficiente: 2.5 },
    ] as { vidaUtil: string; coeficiente: number }[],
    "Art. 31.º, n.º 4 CIRC — coeficientes máximos que corrigem a taxa no método das quotas decrescentes",
    "circ31",
    REV_EMPRESA
  ),
  taxasNoDecretoRegulamentar: sv(
    "as taxas de depreciação por tipo de ativo constam do decreto regulamentar que estabelece o respetivo regime, e não do Código do IRC",
    "Art. 31.º, n.º 1 CIRC",
    "circ31",
    REV_EMPRESA
  ),
  proporcionalNoAnoDeEntrada: sv(
    "no ano de início de funcionamento pode optar-se por uma taxa deduzida da anual, correspondente ao número de meses contados desde o mês de entrada em funcionamento",
    "Art. 31.º, n.º 7 CIRC",
    "circ31",
    REV_EMPRESA
  ),
  semTaxaFixada: sv(
    "não havendo taxa fixada para o elemento, são aceites as que a Autoridade Tributária considere razoáveis, tendo em conta o período de vida útil esperada",
    "Art. 31.º, n.º 3 CIRC",
    "circ31",
    REV_EMPRESA
  ),
  naoDedutiveis: sv(
    "as praticadas para além do período máximo de vida útil, as que excedam os limites legais, a parte do imóvel correspondente ao terreno e a parcela do custo das viaturas ligeiras que exceda o montante definido por portaria",
    "Art. 34.º, n.º 1, als. b), c), d) e e) CIRC",
    "circ34",
    REV_EMPRESA,
    "A al. e) abrange expressamente os veículos elétricos, e ressalva os bens afetos ao serviço público de transportes ou destinados a aluguer."
  ),
};

// ═══════════════════════════════════════════════════════════════════════
//  SIFIDE II — Sistema de Incentivos Fiscais à I&D (Art. 35.º–42.º CFI)
//  Vigência prorrogada até ao período de tributação de 2026 (Lei n.º
//  13/2026, de 16 de abril). O OE2026 eliminou a dedução via fundos de
//  investimento (SIFIDE indireto) — só o investimento direto em I&D conta.
// ═══════════════════════════════════════════════════════════════════════

export const SIFIDE_TAXA_BASE = sv(
  0.325,
  "Art. 36.º CFI — taxa base de 32,5% das despesas com I&D do período (regime prorrogado até 2026 pela Lei 13/2026)",
  "occSIFIDE",
  "2026-07-20"
);

export const SIFIDE_TAXA_INCREMENTAL = sv(
  0.50,
  "Art. 36.º CFI — taxa incremental de 50% do aumento de despesas I&D face à média dos 2 anos anteriores",
  "occSIFIDE",
  TODAY
);

/** Montante máximo do incremento elegível para a taxa incremental. */
export const SIFIDE_TETO_INCREMENTAL = sv(
  1_500_000,
  "Art. 36.º CFI — incremento de despesas I&D elegível limitado a €1 500 000",
  "occSIFIDE",
  TODAY
);

/**
 * Majoração adicional para PME que não completaram 2 exercícios e não
 * beneficiaram anteriormente da taxa incremental. Taxa efetiva: 47,5%.
 */
export const SIFIDE_MAJORACAO_PME_JOVEM = sv(
  0.15,
  "Art. 36.º CFI — majoração de 15% para PME < 2 exercícios sem histórico incremental (taxa efetiva 47,5%)",
  "occSIFIDE",
  TODAY
);

export const SIFIDE_REPORTE_ANOS = sv(
  12,
  "Art. 37.º CFI — crédito não deduzido por insuficiência de coleta reportável por 12 exercícios",
  "occSIFIDE",
  TODAY
);

// ═══════════════════════════════════════════════════════════════════════
//  IFICI — Incentivo Fiscal à Investigação Científica e Inovação
//  (ex-NHR — Residente Não Habitual). Regime em vigor desde OE2024.
// ═══════════════════════════════════════════════════════════════════════

export const IFICI_TAXA = sv(
  0.20,
  "Art. 58.º-A, n.º 2 EBF — IFICI: taxa especial de 20% sobre rendimentos líquidos das categorias A e B auferidos nas atividades elegíveis (Lei 82/2023/OE2024)",
  "occIFICI",
  "2026-07-20",
  "Substitui o NHR desde 1 jan 2024. Válido por 10 exercícios consecutivos não renováveis. Abrange APENAS rendimentos do trabalho (cat. A) e empresariais/profissionais (cat. B) das atividades elegíveis — dividendos de fonte portuguesa (cat. E) ficam de fora e seguem a taxa liberatória de 28% ou o englobamento."
);

export const IFICI_PRAZO_ANOS = sv(
  10,
  "Art. 58.º-A EBF — prazo máximo de 10 exercícios consecutivos",
  "occIFICI",
  TODAY
);

// ═══════════════════════════════════════════════════════════════════════
//  DEDUÇÕES POR DEFICIÊNCIA (Art. 87.º CIRS)
//  Grau de incapacidade permanente ≥ 60% comprovado por atestado médico.
// ═══════════════════════════════════════════════════════════════════════

/**
 * Art. 56.º-A CIRS — Exclusão parcial de rendimentos de sujeitos passivos com
 * deficiência. O artigo não fala em exclusão: diz que os rendimentos brutos
 * «são considerados apenas por 85%» nas categorias A e B, e «apenas por 90%»
 * na categoria H. A exclusão é o complemento — 15% e 10%, respetivamente.
 *
 * As duas frações são DIFERENTES, e é o erro que mais se repete nesta matéria:
 * uma pensão não tem a mesma exclusão que um salário. O teto de €2 500 é por
 * CATEGORIA de rendimentos, não por sujeito passivo.
 *
 * O grau mínimo de 60% NÃO consta deste artigo — está no n.º 5 do art. 87.º,
 * e é de lá que vem (`DEDUCAO_DEFICIENCIA_GRAU_MINIMO`).
 */
export const EXCLUSAO_DEFICIENCIA_TAXA = sv(
  0.15,
  "Art. 56.º-A, n.º 1, al. a) CIRS — rendimentos das categorias A e B considerados apenas por 85% (exclusão de 15%)",
  "art56aCirs",
  REV_FAMILIA
);
/** Categoria H (pensões): considerada por 90% — logo, exclusão de 10%. */
export const EXCLUSAO_DEFICIENCIA_TAXA_PENSOES = sv(
  0.10,
  "Art. 56.º-A, n.º 1, al. b) CIRS — rendimentos da categoria H considerados apenas por 90% (exclusão de 10%)",
  "art56aCirs",
  REV_FAMILIA,
  "Diferente da fração das categorias A e B. Uma pensão não tem a mesma exclusão que um salário."
);
export const EXCLUSAO_DEFICIENCIA_MAX = sv(
  2_500,
  "Art. 56.º-A, n.º 2 CIRS — a parte do rendimento excluída de tributação não pode exceder, POR CATEGORIA de rendimentos, €2 500",
  "art56aCirs",
  REV_FAMILIA
);

/**
 * Art. 87.º CIRS — Dedução ADICIONAL à coleta por deficiência ≥ 60%:
 * 4 × IAS por sujeito passivo. Acumula com a exclusão Art. 56.º-A.
 */
export const DEDUCAO_DEFICIENCIA_COLETA = sv(
  Math.round(4 * IAS.value * 100) / 100,
  "Art. 87.º CIRS — dedução à coleta de 4 × IAS por sujeito passivo com grau ≥ 60%",
  "portalFinancasArt87",
  TODAY,
  "Valor 2026: 4 × €537,13 = €2 148,52. Acumula com a exclusão Art. 56.º-A."
);

/** Grau mínimo de incapacidade permanente (comprovado por atestado médico). */
export const DEDUCAO_DEFICIENCIA_GRAU_MINIMO = sv(
  60,
  "Art. 87.º, n.º 5 CIRS — considera-se pessoa com deficiência aquela que apresente grau de incapacidade permanente igual ou superior a 60%, comprovado por atestado médico de incapacidade multiúso",
  "portalFinancasArt87",
  REV_FAMILIA,
  "O grau consta do n.º 5 do art. 87.º — não do art. 56.º-A, que nada diz sobre graus."
);

/**
 * O resto do art. 87.º do CIRS, que é onde está quase tudo o que interessa a
 * quem vive este regime e que raramente aparece escrito num sítio só.
 *
 * Três deduções somam-se sem se anularem — o n.º 8 di-lo por palavras: «as
 * deduções previstas nos n.os 1, 6 e 7 são cumulativas». E há dois graus
 * distintos em jogo: 60% abre o regime, 90% abre a despesa de acompanhamento.
 *
 * O n.º 9, aditado pela Lei n.º 82/2023, resolve o caso de quem perde o grau
 * numa reavaliação depois de cinco anos a beneficiar: a dedução não cai a zero
 * de um ano para o outro, desce em escada ao longo de quatro anos, desde que
 * se mantenha uma incapacidade de pelo menos 20%.
 */
export const DEFICIENCIA_ART87 = {
  dependenteOuAscendente: sv(
    Math.round(2.5 * IAS.value * 100) / 100,
    "Art. 87.º, n.º 1 CIRS — 2,5 × IAS por cada dependente com deficiência e por cada ascendente com deficiência nas condições da al. b) do n.º 1 do art. 78.º-A",
    "portalFinancasArt87",
    REV_FAMILIA
  ),
  educacaoEReabilitacao: sv(
    0.30,
    "Art. 87.º, n.º 2 CIRS — 30% da totalidade das despesas com educação e reabilitação do sujeito passivo ou dependentes com deficiência",
    "portalFinancasArt87",
    REV_FAMILIA,
    "Sem teto próprio no artigo — ao contrário da dedução geral de educação."
  ),
  premiosSeguroVida: sv(
    0.25,
    "Art. 87.º, n.º 2 CIRS — 25% dos prémios de seguros de vida ou contribuições a associações mutualistas que garantam exclusivamente riscos de morte, invalidez ou reforma por velhice",
    "portalFinancasArt87",
    REV_FAMILIA
  ),
  limitePremiosNaColeta: sv(
    0.15,
    "Art. 87.º, n.º 4 CIRS — a dedução dos prémios de seguros ou das contribuições a associações mutualistas não pode exceder 15% da coleta de IRS",
    "portalFinancasArt87",
    REV_FAMILIA
  ),
  limiteContribuicoesReforma: sv(
    65,
    "Art. 87.º, n.º 3 CIRS — limite de €65 para as contribuições pagas para reforma por velhice (sujeitos passivos não casados ou separados judicialmente)",
    "portalFinancasArt87",
    REV_FAMILIA
  ),
  limiteContribuicoesReformaCasados: sv(
    130,
    "Art. 87.º, n.º 3 CIRS — limite de €130 tratando-se de sujeitos passivos casados e não separados judicialmente de pessoas e bens",
    "portalFinancasArt87",
    REV_FAMILIA
  ),
  acompanhamento: sv(
    Math.round(4 * IAS.value * 100) / 100,
    "Art. 87.º, n.º 6 CIRS — dedução à coleta, a título de despesa de acompanhamento, igual a 4 × IAS por cada sujeito passivo ou dependente",
    "portalFinancasArt87",
    REV_FAMILIA
  ),
  grauAcompanhamento: sv(
    90,
    "Art. 87.º, n.º 6 CIRS — a despesa de acompanhamento exige grau de invalidez permanente igual ou superior a 90%",
    "portalFinancasArt87",
    REV_FAMILIA,
    "Segundo grau, distinto dos 60% que abrem o regime."
  ),
  forcasArmadas: sv(
    Math.round(IAS.value * 100) / 100,
    "Art. 87.º, n.º 7 CIRS — mais 1 × IAS por cada sujeito passivo com deficiência das Forças Armadas abrangido pelos Decretos-Leis n.os 43/76 e 314/90",
    "portalFinancasArt87",
    REV_FAMILIA
  ),
  cumulativas: sv(
    "as deduções previstas nos n.os 1, 6 e 7 são cumulativas",
    "Art. 87.º, n.º 8 CIRS",
    "portalFinancasArt87",
    REV_FAMILIA
  ),
  /** N.º 9: escada de descida, em múltiplos do IAS, ano a ano após a reavaliação. */
  descidaAposReavaliacao: sv(
    [2, 1.5, 1, 0.5] as number[],
    "Art. 87.º, n.º 9 CIRS (aditado pela Lei n.º 82/2023) — 2, 1,5, 1 e 0,5 IAS no primeiro, segundo, terceiro e quarto anos subsequentes à revisão que atribua grau inferior a 60%",
    "portalFinancasArt87",
    REV_FAMILIA
  ),
  descidaAnosMinimosBeneficio: sv(
    5,
    "Art. 87.º, n.º 9 CIRS — exige ter beneficiado da dedução do n.º 1 durante pelo menos cinco anos",
    "portalFinancasArt87",
    REV_FAMILIA
  ),
  descidaGrauMinimo: sv(
    20,
    "Art. 87.º, n.º 9 CIRS — desde que se mantenha uma incapacidade igual ou superior a 20%",
    "portalFinancasArt87",
    REV_FAMILIA
  ),
};

/**
 * Art. 55.º do Código Contributivo — base de incidência dos membros de órgãos
 * estatutários (gerentes, administradores): a remuneração efetivamente
 * auferida, com o **mínimo de 1 × IAS**.
 *
 * Um gerente sem salário não fica sem Segurança Social: paga sobre 1 IAS. O
 * mínimo cai se o MOE acumular com outra atividade remunerada cuja base
 * contributiva já seja ≥ 1 IAS, ou se for pensionista de invalidez/velhice —
 * casos que o simulador não consegue verificar.
 */
export const MOE_BASE_MINIMA_MENSAL = sv(
  IAS.value,
  "Art. 55.º Código Contributivo — base de incidência mínima dos MOE = 1 × IAS",
  "segSocialGov",
  TODAY,
  "Não se aplica em acumulação com outra atividade com base contributiva ≥ 1 IAS, nem a pensionistas."
);

/** Contribuição mínima mensal de SS para trabalhadores independentes. */
export const SS_MIN_MENSAL = sv(
  20,
  "Art. 168.º Código Contributivo — contribuição mínima mensal",
  "segSocialGov",
  TODAY
);

// ═══════════════════════════════════════════════════════════════════════
//  IMPOSTOS MUNICIPAIS (IMI, IMT, IS) — empresa com imóvel próprio
// ═══════════════════════════════════════════════════════════════════════

export const IMI_TAXA_PADRAO = sv(
  0.003,
  "Art. 112.º, n.º 1, al. c) CIMI — piso do intervalo legal da taxa de IMI urbano",
  "art112cimi",
  REV_PATRIMONIO
);

/** Opções de taxa de IMI urbano dentro do intervalo legal (0,3%–0,45%). Cada
 *  município fixa a sua; o simulador oferece o mín., o máx. e dois passos. */
export const IMI_TAXA_URBANO_OPCOES = sv(
  [0.003, 0.0035, 0.004, 0.0045],
  "Art. 112.º, n.º 1, al. c) CIMI — intervalo legal da taxa de IMI para prédios urbanos (0,3% a 0,45%)",
  "art112cimi",
  REV_PATRIMONIO
);

export const IMT_TAXA_COMERCIAL = sv(
  0.065,
  "Art. 17.º, n.º 1, al. e) CIMT — aquisição de outros prédios urbanos e outras aquisições onerosas",
  "art17cimt",
  REV_PATRIMONIO
);

export const IS_TAXA_AQUISICAO = sv(
  0.008,
  "Verba 1.1 TGIS — aquisição onerosa ou por doação do direito de propriedade sobre imóveis",
  "tgisPdf",
  REV_PATRIMONIO
);

// ═══════════════════════════════════════════════════════════════════════
//  PATRIMÓNIO — IMI, AIMI, IMT, selo do crédito, rendas e alojamento local
//  ---------------------------------------------------------------------
//  Tudo o que os guias de «Casa e património» mostram vive aqui, e não no
//  texto deles. A razão é a regra de ouro do projeto: um número escrito no
//  meio de um parágrafo é um número que ninguém encontra no dia em que a lei
//  muda — e estes mudam todos os anos, com o Orçamento do Estado.
//
//  Cada valor traz o artigo que o fixa e a data em que foi lido. Os escalões
//  do IMT foram transcritos das três tabelas do Art. 17.º; as taxas do selo
//  da Tabela Geral, que não tem página de artigo e só existe no PDF do
//  código consolidado.
// ═══════════════════════════════════════════════════════════════════════

/** Taxa de IMI dos prédios rústicos — fixa, ao contrário da dos urbanos. */
export const IMI_TAXA_RUSTICO = sv(
  0.008,
  "Art. 112.º, n.º 1, al. a) CIMI — prédios rústicos",
  "art112cimi",
  REV_PATRIMONIO
);

/** Teto do intervalo legal da taxa de IMI urbano. */
export const IMI_TAXA_URBANO_MAX = sv(
  0.0045,
  "Art. 112.º, n.º 1, al. c) CIMI — teto do intervalo legal da taxa de IMI urbano",
  "art112cimi",
  REV_PATRIMONIO
);

/** Taxa agravada de IMI para titulares com domicílio em regime fiscal mais favorável. */
export const IMI_TAXA_OFFSHORE = sv(
  0.075,
  "Art. 112.º, n.º 4 CIMI — prédios de sujeitos passivos com domicílio fiscal em país, território ou região sujeito a regime fiscal mais favorável",
  "art112cimi",
  REV_PATRIMONIO
);

/** Multiplicador da taxa aplicado a prédios devolutos há mais de um ano e a ruínas. */
export const IMI_AGRAVAMENTO_DEVOLUTO = sv(
  3,
  "Art. 112.º, n.º 3 CIMI — taxas elevadas ao triplo em prédios devolutos há mais de um ano ou em ruínas",
  "art112cimi",
  REV_PATRIMONIO
);

/** Escalões de pagamento do IMI: limite superior (€) e meses das prestações. */
export interface PrestacaoIMI {
  /** Limite superior do escalão, em euros. `null` = sem limite. */
  ateEuros: number | null;
  meses: readonly string[];
}

export const IMI_PRESTACOES = sv<readonly PrestacaoIMI[]>(
  [
    { ateEuros: 100, meses: ["maio"] },
    { ateEuros: 500, meses: ["maio", "novembro"] },
    { ateEuros: null, meses: ["maio", "agosto", "novembro"] },
  ],
  "Art. 120.º, n.º 1 CIMI (redação da Lei n.º 71/2018) — uma prestação até 100 €, duas até 500 €, três acima disso",
  "art120cimi",
  REV_PATRIMONIO,
  "O escalão intermédio é maio e NOVEMBRO. Agosto só entra no escalão das três prestações."
);

/** Meses em que a AT liquida o IMI do ano anterior. */
export const IMI_MESES_LIQUIDACAO = sv<readonly string[]>(
  ["fevereiro", "abril"],
  "Art. 113.º, n.º 2 CIMI — a liquidação é efetuada nos meses de fevereiro e abril do ano seguinte",
  "art113cimi",
  REV_PATRIMONIO
);

/** Abaixo deste montante não há sequer liquidação de IMI. */
export const IMI_MINIMO_LIQUIDACAO = sv(
  10,
  "Art. 113.º, n.º 6 CIMI — não há lugar a liquidação quando o imposto a cobrar seja inferior a 10 €",
  "art113cimi",
  REV_PATRIMONIO
);

/**
 * Isenção permanente do Art. 11.º-A: os limiares são múltiplos do IAS, não
 * valores fixos em euros — é por isso que se guardam os multiplicadores e se
 * calcula, em vez de se copiar um número que muda quando o IAS muda.
 */
export const IMI_ISENCAO_BAIXOS_RENDIMENTOS = {
  /** Rendimento bruto total do agregado: 2,3 × (14 × IAS). */
  multiplicadorRendimento: sv(
    2.3,
    "Art. 11.º-A, n.º 1 CIMI — rendimento bruto total do agregado não superior a 2,3 vezes o valor de 14 IAS",
    "art11aCimi",
    REV_PATRIMONIO
  ),
  /** VPT global de todos os prédios do agregado: 10 × (14 × IAS). */
  multiplicadorVpt: sv(
    10,
    "Art. 11.º-A, n.º 1 CIMI — VPT global da totalidade dos prédios do agregado não superior a 10 vezes o valor de 14 IAS",
    "art11aCimi",
    REV_PATRIMONIO
  ),
  /** Número de IAS que forma a unidade de referência do artigo. */
  mesesIAS: sv(
    14,
    "Art. 11.º-A, n.º 1 CIMI — a unidade de referência do artigo é «14 IAS»",
    "art11aCimi",
    REV_PATRIMONIO
  ),
};

/** Limiares da isenção do Art. 11.º-A já calculados a partir do IAS em vigor. */
export const IMI_ISENCAO_RENDIMENTO_LIMITE =
  IMI_ISENCAO_BAIXOS_RENDIMENTOS.multiplicadorRendimento.value *
  IMI_ISENCAO_BAIXOS_RENDIMENTOS.mesesIAS.value *
  IAS.value;

export const IMI_ISENCAO_VPT_LIMITE =
  IMI_ISENCAO_BAIXOS_RENDIMENTOS.multiplicadorVpt.value *
  IMI_ISENCAO_BAIXOS_RENDIMENTOS.mesesIAS.value *
  IAS.value;

// ─── AIMI ──────────────────────────────────────────────────────────────

export const AIMI = {
  /** Dedução ao valor tributável de pessoas singulares e heranças indivisas. */
  deducaoSingular: sv(
    600_000,
    "Art. 135.º-C, n.º 2 CIMI — dedução de 600 000 € a pessoas singulares e a heranças indivisas",
    "art135cCimi",
    REV_PATRIMONIO,
    "As pessoas coletivas não têm esta dedução: são tributadas sobre a soma toda."
  ),
  taxaSingular: sv(
    0.007,
    "Art. 135.º-F, n.º 1 CIMI — taxa aplicável a pessoas singulares e heranças indivisas",
    "art135fCimi",
    REV_PATRIMONIO
  ),
  taxaColetiva: sv(
    0.004,
    "Art. 135.º-F, n.º 1 CIMI — taxa aplicável a pessoas coletivas",
    "art135fCimi",
    REV_PATRIMONIO
  ),
  /** Taxa marginal sobre a parte do valor tributável acima de 1 M€. */
  taxaMarginal1M: sv(
    0.01,
    "Art. 135.º-F, n.º 2 CIMI — taxa marginal na parte do valor tributável superior a 1 000 000 € e até 2 000 000 €",
    "art135fCimi",
    REV_PATRIMONIO
  ),
  /** Taxa marginal sobre a parte do valor tributável acima de 2 M€. */
  taxaMarginal2M: sv(
    0.015,
    "Art. 135.º-F, n.º 3 CIMI — taxa marginal na parte do valor tributável superior a 2 000 000 €",
    "art135fCimi",
    REV_PATRIMONIO
  ),
  limiar1M: sv(
    1_000_000,
    "Art. 135.º-F, n.º 2 CIMI — limiar da primeira taxa marginal",
    "art135fCimi",
    REV_PATRIMONIO,
    "Com opção pela tributação conjunta, o limiar conta ao dobro."
  ),
  limiar2M: sv(
    2_000_000,
    "Art. 135.º-F, n.º 3 CIMI — limiar da segunda taxa marginal",
    "art135fCimi",
    REV_PATRIMONIO
  ),
  taxaOffshore: sv(
    0.075,
    "Art. 135.º-F, n.º 5 CIMI — prédios de entidades sujeitas a regime fiscal mais favorável",
    "art135fCimi",
    REV_PATRIMONIO,
    "Não se aplica a pessoas singulares (n.º 6)."
  ),
  mesLiquidacao: sv(
    "junho",
    "Art. 135.º-G, n.º 4 CIMI — a liquidação é efetuada no mês de junho do ano a que o imposto respeita",
    "art135gCimi",
    REV_PATRIMONIO
  ),
  mesPagamento: sv(
    "setembro",
    "Art. 135.º-H, n.º 1 CIMI — o pagamento é efetuado no mês de setembro do ano a que respeita",
    "art135hCimi",
    REV_PATRIMONIO
  ),
};

// ─── IMT: escalões ─────────────────────────────────────────────────────

/** Qual das três tabelas do Art. 17.º se aplica. */
export type TabelaIMT = "hpp" | "jovem" | "secundaria";

export interface EscalaoIMT {
  /** Limite superior do escalão, em euros. `null` = sem limite. */
  ate: number | null;
  /** Taxa marginal (fração). */
  taxa: number;
  /** `true` quando a taxa é única sobre todo o valor, sem parcela a abater. */
  taxaUnica?: boolean;
}

export const IMT_ESCALOES = sv<Record<TabelaIMT, readonly EscalaoIMT[]>>(
  {
    // Al. a) — habitação própria e permanente, exceto os da al. b).
    hpp: [
      { ate: 106_346, taxa: 0 },
      { ate: 145_470, taxa: 0.02 },
      { ate: 198_347, taxa: 0.05 },
      { ate: 330_539, taxa: 0.07 },
      { ate: 660_982, taxa: 0.08 },
      { ate: 1_150_853, taxa: 0.06, taxaUnica: true },
      { ate: null, taxa: 0.075, taxaUnica: true },
    ],
    // Al. b) — primeira aquisição de HPP por quem tenha 35 anos ou menos.
    jovem: [
      { ate: 330_539, taxa: 0 },
      { ate: 660_982, taxa: 0.08 },
      { ate: 1_150_853, taxa: 0.06, taxaUnica: true },
      { ate: null, taxa: 0.075, taxaUnica: true },
    ],
    // Al. c) — habitação não destinada a habitação própria e permanente.
    secundaria: [
      { ate: 106_346, taxa: 0.01 },
      { ate: 145_470, taxa: 0.02 },
      { ate: 198_347, taxa: 0.05 },
      { ate: 330_539, taxa: 0.07 },
      { ate: 633_931, taxa: 0.08 },
      { ate: 1_150_853, taxa: 0.06, taxaUnica: true },
      { ate: null, taxa: 0.075, taxaUnica: true },
    ],
  },
  "Art. 17.º, n.º 1, als. a), b) e c) CIMT — as três tabelas de escalões e taxas marginais",
  "art17cimt",
  REV_PATRIMONIO,
  "Atualizados anualmente pelo Orçamento do Estado. Ler sempre do artigo antes de publicar."
);

export const IMT_TAXA_RUSTICO = sv(
  0.05,
  "Art. 17.º, n.º 1, al. d) CIMT — aquisição de prédios rústicos",
  "art17cimt",
  REV_PATRIMONIO
);

/** Condições da isenção jovem do Art. 9.º, n.º 2 e n.º 3. */
export const IMT_ISENCAO_JOVEM = {
  idadeMaxima: sv(
    35,
    "Art. 9.º, n.º 2 CIMT — sujeitos passivos com idade igual ou inferior a 35 anos à data da transmissão",
    "art9cimt",
    REV_PATRIMONIO,
    "Exige ainda que seja a primeira aquisição de HPP e que o adquirente não seja considerado dependente no ano da transmissão."
  ),
  anosSemPropriedade: sv(
    3,
    "Art. 9.º, n.º 3 CIMT — exclusão de quem seja titular de prédio urbano habitacional à data da transmissão ou em qualquer momento nos três anos anteriores",
    "art9cimt",
    REV_PATRIMONIO
  ),
};

/** Prazo de pagamento do IMT depois da liquidação. */
export const IMT_PRAZO_PAGAMENTO_DIAS = sv(
  30,
  "Art. 36.º, n.º 1 CIMT (redação do DL 97/2026) — pagamento no próprio dia da liquidação ou nos 30 dias seguintes, sob pena de esta ficar sem efeito",
  "art36cimt",
  REV_PATRIMONIO
);

// ─── Imposto do selo do crédito (verba 17.1) ───────────────────────────

export const IS_CREDITO = {
  ateUmAnoPorMes: sv(
    0.0004,
    "Verba 17.1.1 TGIS — crédito de prazo inferior a um ano, por cada mês ou fração",
    "tgisPdf",
    REV_PATRIMONIO
  ),
  umAnoOuMais: sv(
    0.005,
    "Verba 17.1.2 TGIS — crédito de prazo igual ou superior a um ano",
    "tgisPdf",
    REV_PATRIMONIO
  ),
  cincoAnosOuMais: sv(
    0.006,
    "Verba 17.1.3 TGIS — crédito de prazo igual ou superior a cinco anos",
    "tgisPdf",
    REV_PATRIMONIO,
    "É a taxa do crédito à habitação típico. A prorrogação do prazo conta sempre como nova concessão de crédito."
  ),
};



// ═══════════════════════════════════════════════════════════════════════
//  HERANÇAS E SUCESSÕES
//  ---------------------------------------------------------------------
//  Portugal NÃO tem imposto sucessório (o Imposto sobre Sucessões e Doações
//  foi abolido em 2004). As transmissões gratuitas são tributadas em Imposto
//  do Selo, e a partilha rege-se pelo Código Civil (Livro V). Verificado 2026;
//  o OE2026 (Lei 73-A/2025) não alterou este regime.
// ═══════════════════════════════════════════════════════════════════════

const SELO_TODAY = "2026-07-21";

/** Verba 1.2 TGIS — aquisição gratuita de bens (heranças, legados, doações). */
export const IS_TRANSMISSAO_GRATUITA = sv(
  0.10,
  "Verba 1.2 TGIS — aquisição gratuita de bens (heranças, legados e doações): 10%",
  "tgisSelo",
  SELO_TODAY,
  "Taxa proporcional (não progressiva). Não confundir com um imposto sucessório — este foi abolido em 2004."
);

/**
 * Verba 1.1 TGIS — 0,8% sobre a DOAÇÃO (ou aquisição onerosa) de imóveis.
 * NÃO se aplica às transmissões por morte (heranças): a redação da verba é
 * "aquisição onerosa ou por doação", que exclui a sucessão mortis causa.
 */
export const IS_DOACAO_IMOVEL = sv(
  0.008,
  "Verba 1.1 TGIS — doação (ou aquisição onerosa) do direito de propriedade sobre imóveis: 0,8%",
  "tgisSelo",
  SELO_TODAY,
  "Incide sobre doações e transmissões onerosas de imóveis, mesmo para família isenta da Verba 1.2. A herança (transmissão por morte) NÃO está sujeita à Verba 1.1."
);

/** Verba 1.2 TGIS — doações de valor até 500 € não são tributadas. */
export const IS_DOACAO_MINIMO_ISENTO = sv(
  500,
  "Verba 1.2 TGIS — doações de valor igual ou inferior a 500 € não são tributadas",
  "tgisSelo",
  SELO_TODAY
);

/** Prazo da participação (Modelo 1 ISTG) — fim do 3.º mês seguinte ao do óbito. */
export const PRAZO_MODELO1_MESES = sv(
  3,
  "Art. 26.º CIS — participação (Modelo 1) apresentada pelo cabeça-de-casal até ao fim do 3.º mês seguinte ao do óbito",
  "cisArt26",
  SELO_TODAY
);

/** Relação de parentesco com o falecido (para partilha e isenção de Imposto do Selo). */
export type RelacaoSucessoria =
  | "conjuge"
  | "unido_facto"
  | "filho"
  | "neto"
  | "bisneto"
  | "pai"
  | "avo"
  | "bisavo"
  | "irmao"
  | "sobrinho"
  | "tio"
  | "primo"
  | "outro";

/**
 * Relações ISENTAS de Imposto do Selo nas transmissões gratuitas — Art. 6.º
 * al. e) CIS: cônjuge, unido de facto, descendentes e ascendentes.
 */
export const SELO_RELACOES_ISENTAS: readonly RelacaoSucessoria[] = [
  "conjuge",
  "unido_facto",
  "filho",
  "neto",
  "bisneto",
  "pai",
  "avo",
  "bisavo",
] as const;

export const SELO_ISENCAO_BASE = "Art. 6.º al. e) CIS" as const;

export function relacaoIsentaSelo(r: RelacaoSucessoria): boolean {
  return SELO_RELACOES_ISENTAS.includes(r);
}

/**
 * Legítima (quota indisponível) por configuração familiar — a fração da
 * herança reservada por lei aos herdeiros legitimários. A quota disponível
 * (o que se pode deixar livremente por testamento) é 1 − legítima.
 */
export type ConfigLegitima =
  | "conjuge_so"
  | "conjuge_descendentes"
  | "descendentes_1"
  | "descendentes_2mais"
  | "conjuge_ascendentes"
  | "ascendentes_pais"
  | "ascendentes_avos";

export const LEGITIMA: Record<ConfigLegitima, { fracao: number; base: string }> = {
  conjuge_so: { fracao: 1 / 2, base: "Art. 2158.º CC" },
  conjuge_descendentes: { fracao: 2 / 3, base: "Art. 2159.º, n.º 1 CC" },
  descendentes_1: { fracao: 1 / 2, base: "Art. 2159.º, n.º 2 CC" },
  descendentes_2mais: { fracao: 2 / 3, base: "Art. 2159.º, n.º 2 CC" },
  conjuge_ascendentes: { fracao: 2 / 3, base: "Art. 2161.º, n.º 1 CC" },
  ascendentes_pais: { fracao: 1 / 2, base: "Art. 2161.º, n.º 2 CC" },
  ascendentes_avos: { fracao: 1 / 3, base: "Art. 2161.º, n.º 2 CC" },
};

/** Meação: na comunhão, cada cônjuge tem direito a metade dos bens comuns. */
export const MEACAO_FRACAO = sv(
  0.5,
  "Art. 1730.º CC — cada cônjuge tem direito a metade dos bens comuns (meação), que não integra a herança",
  "ccSucessoes",
  SELO_TODAY
);

/**
 * Sucessão legítima (sem testamento): quando o cônjuge concorre com
 * descendentes, o seu quinhão não pode ser inferior a 1/4 da herança.
 */
export const CONJUGE_QUOTA_MINIMA = sv(
  0.25,
  "Art. 2139.º, n.º 1 CC — o cônjuge não recebe menos de 1/4 quando concorre com descendentes",
  "ccSucessoes",
  SELO_TODAY
);

/** Sucessão legítima: cônjuge em concurso com ascendentes (sem descendentes). */
export const CONJUGE_ASCENDENTES_QUOTAS = {
  conjuge: 2 / 3,
  ascendentes: 1 / 3,
  base: "Art. 2142.º CC",
} as const;

// ═══════════════════════════════════════════════════════════════════════
//  ENGLOBAMENTO DE DIVIDENDOS (Art. 40.º-A CIRS)
// ═══════════════════════════════════════════════════════════════════════

export const DIV_INCLUSAO_ENGLOBAMENTO = sv(
  0.5,
  "Art. 40.º-A CIRS — englobamento: só 50% dos dividendos de entidades residentes é incluído no rendimento coletável",
  "art40aCirs",
  TODAY
);

// ═══════════════════════════════════════════════════════════════════════
//  CATEGORIA G — MAIS-VALIAS (valores mobiliários, criptoativos, imóveis)
//  ---------------------------------------------------------------------
//  Mais-valias mobiliárias e de criptoativos: taxa autónoma de 28% sobre o
//  saldo positivo anual (mais-valias − menos-valias), com OPÇÃO de englobamento.
//  Englobamento OBRIGATÓRIO de valores mobiliários quando, cumulativamente,
//  os ativos foram detidos < 365 dias E o rendimento coletável do titular é
//  ≥ ao limite do último escalão de IRS (86 634 € em 2026) — Art. 72.º.
//  Criptoativos detidos ≥ 365 dias estão EXCLUÍDOS de tributação (Art. 10.º
//  n.º 19). Mais-valias imobiliárias: só 50% do saldo é tributado, com
//  englobamento obrigatório às taxas progressivas (Art. 43.º n.º 2).
// ═══════════════════════════════════════════════════════════════════════

/** Taxa especial (autónoma) sobre o saldo positivo de mais-valias mobiliárias. */
export const MAIS_VALIAS_MOBILIARIAS_TAXA = sv(
  0.28,
  "Art. 72.º, n.º 1 CIRS — taxa especial de 28% sobre o saldo positivo de mais-valias de valores mobiliários",
  "ativosMaisValias2026",
  REV_MAIS_VALIAS,
  "Aplica-se por defeito; o titular pode optar pelo englobamento (taxas progressivas de 12,5% a 48%)."
);

/** Período de detenção (dias) que separa curto/longo prazo nas mais-valias. */
export const MAIS_VALIAS_DETENCAO_DIAS = sv(
  365,
  "Art. 72.º, n.º 18 CIRS — englobamento obrigatório de mais-valias de valores mobiliários detidos < 365 dias quando o titular está no último escalão",
  "ativosMaisValias2026",
  REV_MAIS_VALIAS
);

/**
 * Exclusão parcial por tempo de detenção — a escada do Art. 43.º, n.º 5.
 *
 * Aditada pela Lei n.º 31/2024 e lida no articulado a 07/08/2026. Vale para
 * valores mobiliários ADMITIDOS À NEGOCIAÇÃO e para partes de organismos de
 * investimento coletivo ABERTOS — ou seja, para ações cotadas, ETFs e fundos
 * abertos, e não para participações em sociedades não cotadas.
 *
 * Exclui uma fração do RENDIMENTO, não da taxa: 30% excluídos aos 8 anos
 * significa que a taxa de 28% incide sobre 70% do ganho.
 *
 * O sinal é simétrico — a lei diz «quando positivo ou negativo». Num ano de
 * perdas, a mesma escada corta a menos-valia que se leva para o saldo.
 */
export const MAIS_VALIAS_EXCLUSAO_DETENCAO = {
  /** Detidos > 2 anos e < 5 anos. */
  de2a5Anos: sv(
    0.1,
    "Art. 43.º, n.º 5, al. a) CIRS (Lei n.º 31/2024) — são excluídos da tributação 10% do rendimento quando resultem de ativos detidos por período superior a 2 anos e inferior a 5",
    "art43cirs",
    REV_INVESTIMENTO
  ),
  /** Detidos ≥ 5 anos e < 8 anos. */
  de5a8Anos: sv(
    0.2,
    "Art. 43.º, n.º 5, al. b) CIRS (Lei n.º 31/2024) — 20% do rendimento excluídos entre os 5 e os 8 anos de detenção",
    "art43cirs",
    REV_INVESTIMENTO
  ),
  /** Detidos ≥ 8 anos. */
  mais8Anos: sv(
    0.3,
    "Art. 43.º, n.º 5, al. c) CIRS (Lei n.º 31/2024) — 30% do rendimento excluídos a partir dos 8 anos de detenção",
    "art43cirs",
    REV_INVESTIMENTO
  ),
  /** A que ativos se aplica, nas palavras da lei. */
  ambito: sv(
    "valores mobiliários admitidos à negociação e partes de organismos de investimento coletivo abertos",
    "Art. 43.º, n.º 5 CIRS — delimitação do âmbito da exclusão",
    "art43cirs",
    REV_INVESTIMENTO,
    "Fica de fora o que não é admitido à negociação, e os fundos fechados."
  ),
} as const;

/**
 * Organismos de investimento coletivo constituídos em Portugal — o regime
 * que o Decreto-Lei n.º 7/2015 instalou e que continua em vigor.
 *
 * O pacote de expansão mandava confirmar isto antes de afirmar seja o que
 * for sobre fundos nacionais, e com razão: a arquitetura não é intuitiva.
 * O fundo É sujeito passivo de IRC (Art. 22.º, n.º 1 EBF), mas o Art. 22.º,
 * n.º 3 manda NÃO considerar, no lucro tributável, os rendimentos dos
 * artigos 5.º, 8.º e 10.º do CIRS — isto é, precisamente os juros, as rendas
 * e as mais-valias de que uma carteira vive.
 *
 * O resultado prático é tributação à SAÍDA: o fundo acumula sem imposto
 * sobre o retorno da carteira, e o imposto aparece quando o participante
 * recebe (Art. 22.º-A). Não é isenção — é adiamento com mudança de sujeito.
 */
export const OIC_NACIONAIS = {
  /** O que o fundo não leva a lucro tributável. */
  rendimentosExcluidosNoFundo: sv(
    "capitais, prediais e mais-valias (arts. 5.º, 8.º e 10.º do CIRS)",
    "Art. 22.º, n.º 3 EBF (Decreto-Lei n.º 7/2015) — não são considerados, para apuramento do lucro tributável, os rendimentos referidos nos artigos 5.º, 8.º e 10.º do Código do IRS",
    "ebf22",
    REV_INVESTIMENTO,
    "Exceto quando provenham de entidades em regime fiscal claramente mais favorável."
  ),
  /** Derramas de que o fundo está isento. */
  isentoDeDerramas: sv(
    true,
    "Art. 22.º, n.º 6 EBF — as entidades referidas no n.º 1 estão isentas de derrama municipal e derrama estadual",
    "ebf22",
    REV_INVESTIMENTO
  ),
  /** Retenção sobre rendimentos DISTRIBUÍDOS a residentes. */
  retencaoDistribuicao: sv(
    0.28,
    "Art. 22.º-A, n.º 1, al. a), subal. i) EBF — retenção na fonte à taxa do n.º 1 do Art. 71.º do CIRS, com caráter definitivo fora de atividade comercial, industrial ou agrícola",
    "ebf22a",
    REV_INVESTIMENTO
  ),
  /** Retenção sobre o RESGATE de unidades de participação. */
  retencaoResgate: sv(
    0.28,
    "Art. 22.º-A, n.º 1, al. b) EBF (Lei n.º 31/2024) — retenção na fonte a título definitivo à taxa do n.º 1 do Art. 72.º do CIRS, tendo em conta o n.º 5 do Art. 43.º",
    "ebf22a",
    REV_INVESTIMENTO,
    "A remissão para o n.º 5 do Art. 43.º é o que traz a exclusão por tempo de detenção para dentro do resgate."
  ),
  /** A opção que devolve o imposto retido à natureza de imposto por conta. */
  permiteEnglobamento: sv(
    true,
    "Art. 22.º-A, n.º 2 EBF — a opção pelo englobamento converte o imposto retido em imposto por conta, nos termos do Art. 78.º do CIRS",
    "ebf22a",
    REV_INVESTIMENTO
  ),
  /** O que acontece a quem comprou em mercado secundário e não comunicou. */
  penalizacaoSemComunicacao: sv(
    "retenção sobre o montante bruto do resgate",
    "Art. 22.º-A, n.os 10 e 11 EBF — quem adquire em mercado secundário ou a título gratuito deve comunicar a data e o valor de aquisição; não o fazendo, a retenção incide sobre o montante bruto",
    "ebf22a",
    REV_INVESTIMENTO,
    "Retenção sobre o bruto é retenção sobre o capital, e não só sobre o ganho."
  ),
  /** Fundos imobiliários: os rendimentos mudam de natureza. */
  fundosImobiliarios: sv(
    "rendimentos de bens imóveis",
    "Art. 22.º-A, n.º 13 EBF — os rendimentos de unidades de participação em fundos de investimento imobiliário, incluindo as mais-valias da transmissão onerosa, resgate ou liquidação, são considerados rendimentos de bens imóveis",
    "ebf22a",
    REV_INVESTIMENTO
  ),
} as const;

/** Taxa autónoma sobre mais-valias de criptoativos detidos menos de 365 dias. */
export const CRIPTO_TAXA_CURTO_PRAZO = sv(
  0.28,
  "Art. 10.º n.º 1 al. k) + Art. 72.º CIRS — criptoativos detidos < 365 dias tributados a 28% (categoria G)",
  "faciliteCripto2026",
  REV_MAIS_VALIAS
);

/**
 * Remuneração de operações com criptoativos — staking, lending e afins.
 *
 * É o ponto em que as fontes de terceiros mais divergem, e a divergência
 * tem explicação: quem lê só a alínea u) do n.º 2 conclui «categoria E,
 * tributado ao receber». Falta-lhe o n.º 11 do mesmo artigo, que trata
 * separadamente o caso — muito mais comum — de a recompensa ser paga NA
 * PRÓPRIA CRIPTO.
 *
 * A lei resolve isto sozinha:
 *   · recompensa paga em euros        → categoria E, tributada ao receber;
 *   · recompensa paga em criptoativos → NÃO é tributada na receção; é
 *     tributada como mais-valia no momento em que esses criptoativos forem
 *     alienados.
 *
 * A diferença não é de classificação — é de MOMENTO. Quem declara staking
 * pago em cripto no ano em que o recebeu está a antecipar um imposto que a
 * lei manda cobrar mais tarde.
 */
export const CRIPTO_REMUNERACAO = {
  categoriaQuandoPagaEmMoeda: sv(
    "E",
    "Art. 5.º, n.º 2, al. u) CIRS (aditada pela Lei n.º 24-D/2022) — quaisquer formas de remuneração decorrentes de operações relativas a criptoativos são rendimentos de capitais",
    "art5cirs",
    REV_PATRIMONIO
  ),
  categoriaQuandoPagaEmCripto: sv(
    "G",
    "Art. 5.º, n.º 11 CIRS (aditado pela Lei n.º 24-D/2022) — os rendimentos da al. u) do n.º 2, quando assumam a forma de criptoativos, são tributados como mais-valia no momento da alienação dos criptoativos recebidos",
    "art5cirs",
    REV_PATRIMONIO,
    "Não há facto tributário na receção: o momento é o da alienação do que foi recebido."
  ),
};

/** Período de detenção (dias) a partir do qual os criptoativos ficam isentos. */
export const CRIPTO_ISENCAO_DIAS = sv(
  365,
  "Art. 10.º, n.º 19 CIRS — exclusão de tributação dos ganhos de criptoativos detidos ≥ 365 dias",
  "art10cirs",
  REV_MAIS_VALIAS,
  "Não se aplica a criptoativos emitidos por entidades em regime fiscal claramente mais favorável."
);

/** Fração do saldo de mais-valias imobiliárias sujeita a tributação (residentes). */
export const MAIS_VALIAS_IMOBILIARIO_INCLUSAO = sv(
  0.5,
  "Art. 43.º, n.º 2, al. b) CIRS — apenas 50% do saldo de mais-valias imobiliárias é considerado",
  "art43cirs",
  REV_MAIS_VALIAS
);

/** Prazo de reinvestimento em habitação própria e permanente (exclusão). */
export const MAIS_VALIAS_REINVESTIMENTO_MESES = sv(
  36,
  "Art. 10.º, n.º 5, al. b) CIRS — reinvestimento efetuado entre os 24 meses anteriores e os 36 meses posteriores à realização",
  "art10cirs",
  REV_PATRIMONIO
);

/**
 * Reinvestimento e mais-valias de imóveis — o resto dos prazos do Art. 10.º.
 *
 * Lido diretamente do articulado a 06/08/2026, incluindo os n.os 7 e 8 na
 * redação do Decreto-Lei n.º 97/2026: a segunda via de exclusão, que não
 * exige comprar para habitação própria mas sim para arrendar dentro dos
 * limites de renda desse diploma.
 */
export const MAIS_VALIAS_IMOVEIS = {
  /** Janela anterior à venda em que o reinvestimento já conta. */
  reinvestimentoAntesMeses: sv(
    24,
    "Art. 10.º, n.º 5, al. b) CIRS — o reinvestimento conta desde os 24 meses anteriores à realização",
    "art10cirs",
    REV_PATRIMONIO
  ),
  /** Tempo mínimo de HPP no imóvel vendido, antes da transmissão. */
  hppAntesDaVendaMeses: sv(
    12,
    "Art. 10.º, n.º 5, al. e) CIRS (redação do DL 57/2024) — habitação própria e permanente comprovada pelo domicílio fiscal nos 12 meses anteriores à transmissão",
    "art10cirs",
    REV_PATRIMONIO
  ),
  /** Prazo para afetar a habitação o imóvel adquirido com o reinvestimento. */
  afetacaoAposReinvestimentoMeses: sv(
    12,
    "Art. 10.º, n.º 6, al. a) CIRS — o adquirente tem de afetar o imóvel a habitação até decorridos 12 meses após o reinvestimento",
    "art10cirs",
    REV_PATRIMONIO
  ),
  /** Prazo para requerer a inscrição na matriz em construção, ampliação ou melhoramento. */
  inscricaoMatrizMeses: sv(
    48,
    "Art. 10.º, n.º 6, al. b) CIRS — inscrição na matriz requerida até 48 meses desde a data da realização",
    "art10cirs",
    REV_PATRIMONIO,
    "E afetação do imóvel a habitação até ao fim do quinto ano seguinte ao da realização."
  ),
  /** Anos de detenção abaixo dos quais um imóvel com apoio público perde a redução a 50%. */
  apoioPublicoAnos: sv(
    10,
    "Art. 43.º, n.º 2, al. a) CIRS — imóveis com apoio público não reembolsável superior a 30% do VPT vendidos antes de 10 anos são tributados por inteiro",
    "art43cirs",
    REV_PATRIMONIO
  ),
  apoioPublicoLimiarVpt: sv(
    0.3,
    "Art. 43.º, n.º 2, al. a) CIRS — apoio de valor superior a 30% do valor patrimonial tributário",
    "art43cirs",
    REV_PATRIMONIO
  ),
  /** Janela dos encargos de valorização que acrescem ao valor de aquisição. */
  encargosValorizacaoAnos: sv(
    12,
    "Art. 51.º, n.º 1, al. a) CIRS — encargos com a valorização comprovadamente realizados nos últimos 12 anos",
    "art51cirs",
    REV_PATRIMONIO,
    "Não contam os encargos realizados durante o período em que o imóvel esteve afeto a atividade empresarial ou profissional (n.º 3)."
  ),
  /** Segunda via de exclusão: reinvestir em imóveis para arrendamento a renda moderada. */
  arrendamentoContratoMeses: sv(
    6,
    "Art. 10.º, n.º 8, al. a) CIRS (redação do DL 97/2026) — contrato de arrendamento habitacional dentro dos limites de renda celebrado nos seis meses seguintes ao reinvestimento ou à realização",
    "art10cirs",
    REV_PATRIMONIO,
    "Salvo impedimento justificado, designadamente obras urgentes."
  ),
  arrendamentoManutencaoMeses: sv(
    36,
    "Art. 10.º, n.º 8, al. b) CIRS (redação do DL 97/2026) — o imóvel tem de estar arrendado pelo menos 36 meses, seguidos ou interpolados, nos primeiros cinco anos",
    "art10cirs",
    REV_PATRIMONIO
  ),
};

// ═══════════════════════════════════════════════════════════════════════
//  BENEFÍCIOS FISCAIS À COLETA — PPR, donativos e ascendentes
//  ---------------------------------------------------------------------
//  PPR (Art. 21.º EBF): dedução à coleta de 20% dos valores aplicados, com
//  limite por idade do sujeito passivo a 1 de janeiro. Donativos (Art. 63.º
//  EBF / Estatuto do Mecenato): 25% do donativo, limitado a 15% da coleta.
//  Ascendentes (Art. 78.º-A CIRS): 525 € por ascendente em comunhão de
//  habitação com rendimento ≤ pensão mínima; 635 € se existir só um.
//  PPR e donativos contam para o limite global das deduções (Art. 78.º n.º 7);
//  a dedução por ascendentes, tal como a de dependentes, fica fora desse limite.
// ═══════════════════════════════════════════════════════════════════════

export interface DeducaoPPR {
  taxa: number;
  /** Limite anual (€) por escalão de idade a 1 de janeiro. */
  ate35: number;
  de35a50: number;
  mais50: number;
}

export const DEDUCAO_PPR = sv<DeducaoPPR>(
  { taxa: 0.2, ate35: 400, de35a50: 350, mais50: 300 },
  "Art. 21.º EBF — PPR: 20% dos valores aplicados; limite €400 (< 35), €350 (35–50), €300 (> 50)",
  "art21EBF",
  REV_BENEFICIOS
);

/**
 * O outro lado do PPR: o que se paga ao resgatar.
 *
 * Há DOIS regimes, e confundi-los custa dinheiro em qualquer dos sentidos.
 * Dentro das situações definidas na lei, a matéria coletável é apenas dois
 * quintos do rendimento e a tributação é autónoma a 20% — o que dá uma taxa
 * efetiva de 8% sobre o rendimento. Fora delas, o rendimento é tributado
 * autonomamente a 21,5%, pelas regras da categoria E, sem a redução a dois
 * quintos.
 *
 * A dedução à coleta tem um regime próprio e SEPARADO: perde-se com
 * majoração de 10% por cada ano ou fração decorrido desde que foi feita.
 * As duas consequências somam-se — não são alternativas.
 */
export const PPR_RESGATE = {
  fracaoTributavel: sv(
    0.4,
    "Art. 21.º, n.º 3, al. b), 1) EBF — a matéria coletável é constituída por dois quintos do rendimento",
    "art21EBF",
    REV_PATRIMONIO
  ),
  taxaAutonoma: sv(
    0.2,
    "Art. 21.º, n.º 3, al. b), 2) EBF — a tributação é autónoma, sendo efetuada à taxa de 20%",
    "art21EBF",
    REV_PATRIMONIO
  ),
  taxaForaDasCondicoes: sv(
    0.215,
    "Art. 21.º, n.º 5 EBF — reembolso fora de qualquer das situações definidas na lei: rendimento tributado autonomamente à taxa de 21,5%, pelas regras da categoria E",
    "art21EBF",
    REV_PATRIMONIO,
    "Sem a redução a dois quintos do n.º 3, al. b). É esta a distinção que gera o erro de calcular 2/5 × 21,5%."
  ),
  majoracaoAnual: sv(
    0.1,
    "Art. 21.º, n.º 4 EBF — as importâncias deduzidas são majoradas em 10% por cada ano ou fração decorrido desde aquele em que foi exercido o direito à dedução",
    "art21EBF",
    REV_PATRIMONIO
  ),
  anosParaDispensa: sv(
    5,
    "Art. 21.º, n.º 4 EBF — salvo morte do subscritor ou quando tenham decorrido pelo menos cinco anos a contar da respetiva entrega e ocorra uma das situações definidas na lei",
    "art21EBF",
    REV_PATRIMONIO
  ),
};

/** Taxa efetiva sobre o rendimento do PPR resgatado nas condições legais:
    dois quintos do rendimento, tributados a 20%. Calculada, não escrita. */
export const PPR_TAXA_EFETIVA_CONDICOES_LEGAIS =
  PPR_RESGATE.fracaoTributavel.value * PPR_RESGATE.taxaAutonoma.value;

/**
 * Englobamento de lucros distribuídos: só metade conta.
 *
 * É a peça que decide se englobar dividendos compensa. Optando pelo
 * englobamento, os lucros de pessoas coletivas sujeitas e não isentas de
 * IRC são considerados em apenas 50% do seu valor — porque já foram
 * tributados na esfera da sociedade.
 */
export const DIVIDENDOS_ENGLOBAMENTO_FRACAO = sv(
  0.5,
  "Art. 40.º-A, n.º 1 CIRS — no caso de opção pelo englobamento, os lucros são considerados em apenas 50% do seu valor",
  "art40aCirs",
  REV_PATRIMONIO,
  "Exige que a entidade devedora tenha sede ou direção efetiva em Portugal e o beneficiário resida cá (n.º 2), ou que seja residente na UE/EEE nas condições do n.º 4."
);

export interface DeducaoDonativos {
  taxa: number;
  /** Limite da dedução em fração da coleta. */
  limiteColeta: number;
}

export const DEDUCAO_DONATIVOS = sv<DeducaoDonativos>(
  { taxa: 0.25, limiteColeta: 0.15 },
  "Art. 63.º EBF — donativos: dedução de 25% sobre o valor majorado, limitada a 15% da coleta",
  "art63EBF",
  REV_BENEFICIOS
);

export type TipoDonativo = "geral" | "social" | "ambiental" | "estado";

export interface OpcaoDonativo {
  label: string;
  /** Fator de majoração aplicado ao donativo antes da taxa de 25%. */
  fator: number;
  /** true = não sujeito ao limite de 15% da coleta (donativos ao Estado). */
  semLimite: boolean;
}

export const DONATIVOS_MAJORACOES = sv<Record<TipoDonativo, OpcaoDonativo>>(
  {
    geral: { label: "Geral (sem majoração)", fator: 1.0, semLimite: false },
    social: { label: "Social / religioso (+30%)", fator: 1.3, semLimite: false },
    ambiental: { label: "Cultural / ambiental / infância (+40%)", fator: 1.4, semLimite: false },
    estado: { label: "Estado / autarquias (sem limite)", fator: 1.0, semLimite: true },
  },
  "Art. 62.º EBF — majorações dos donativos: 130% (social/religioso), 140% (cultural/ambiental/infância); donativos ao Estado sem o limite de 15% da coleta",
  "art62EBF",
  REV_BENEFICIOS
);

/** Dedução de pensões de alimentos pagas (Art. 83.º-A CIRS): 20%, sem limite. */
export const DEDUCAO_PENSAO_ALIMENTOS = sv(
  0.2,
  "Art. 83.º-A CIRS — 20% das importâncias pagas a título de pensão de alimentos (sem limite)",
  "art83aCirs",
  REV_BENEFICIOS
);

/** Dedução de encargos com lares (Art. 84.º CIRS): 25%, limite 403,75 €. */
export const DEDUCAO_LARES = sv<DeducaoLimitada>(
  { taxa: 0.25, limite: 403.75 },
  "Art. 84.º CIRS — 25% dos encargos com lares e apoio domiciliário (limite 403,75 €)",
  "art84cirs",
  REV_BENEFICIOS
);

/** Dedução à coleta por ascendente em comunhão de habitação (Art. 78.º-A CIRS). */
export const DEDUCAO_ASCENDENTE = sv(
  525,
  "Art. 78.º-A CIRS — 525 € por ascendente em comunhão de habitação com rendimento não superior à pensão mínima do regime geral",
  "art78aCirs",
  REV_BENEFICIOS
);

/** Dedução quando exista apenas um ascendente nestas condições. */
export const DEDUCAO_ASCENDENTE_UNICO = sv(
  635,
  "Art. 78.º-A CIRS — 635 € quando exista apenas um ascendente nas condições",
  "art78aCirs",
  REV_BENEFICIOS
);

// ═══════════════════════════════════════════════════════════════════════
//  COEFICIENTES DE DESVALORIZAÇÃO DA MOEDA (mais-valias imobiliárias)
//  ---------------------------------------------------------------------
//  Art. 50.º CIRS: o valor de aquisição de imóveis é corrigido por um
//  coeficiente oficial (Portaria anual) quando, à data da venda, tenham
//  decorrido pelo menos 24 meses desde a aquisição — aumentando o custo e
//  reduzindo a mais-valia tributável.
//
//  Tabela em vigor: Portaria 382/2025 (bens alienados em 2025). Enquanto a
//  tabela de 2026 não for publicada (habitualmente em novembro), aplica-se
//  esta como melhor estimativa — a app atualiza assim que a nova sair.
//  Anos não tabelados na app (1991–1999) devolvem null (pedir valor corrigido).
// ═══════════════════════════════════════════════════════════════════════

export interface CoefMoeda {
  /** Ano da tabela (ano de alienação a que respeita). */
  anoTabela: number;
  /** Coeficiente por ano de aquisição. */
  porAno: Record<number, number>;
}

export const COEF_DESVALORIZACAO_MOEDA = sv<CoefMoeda>(
  {
    anoTabela: 2025,
    porAno: {
      1990: 2.69,
      2000: 1.67, 2001: 1.55, 2002: 1.49, 2003: 1.45, 2004: 1.43, 2005: 1.4,
      2006: 1.34, 2007: 1.32, 2008: 1.28, 2009: 1.3, 2010: 1.28, 2011: 1.24,
      2012: 1.2, 2013: 1.2, 2014: 1.2, 2015: 1.2,
      2016: 1.19, 2017: 1.18,
      2018: 1.17, 2019: 1.17, 2020: 1.17,
      2021: 1.16, 2022: 1.06, 2023: 1.02, 2024: 1.0,
    },
  },
  "Portaria 382/2025 — coeficientes de desvalorização da moeda (Art. 50.º CIRS); aplicáveis se decorridos ≥ 24 meses desde a aquisição",
  "portaria382_2025",
  REV_COEF_MOEDA,
  "Tabela de 2025 usada como estimativa para 2026 até à publicação da nova portaria."
);

// ═══════════════════════════════════════════════════════════════════════
//  SALÁRIO MÍNIMO NACIONAL 2026
// ═══════════════════════════════════════════════════════════════════════

export const SMN = sv(
  920,
  "Salário Mínimo Nacional / RMMG 2026 (DL 139/2025, publicado em Diário da República; entrou em vigor a 1 de janeiro de 2026)",
  "segSocialGov",
  REV_SMN
);

/**
 * Dependentes e agregado familiar — Art. 13.º do CIRS, lido a 07/08/2026.
 *
 * Três regras que decidem quase tudo o que a secção da família trata, e
 * que são citadas de memória com mais frequência do que lidas.
 */
export const DEPENDENTES_IRS = {
  /** A idade-limite dos dependentes maiores. */
  idadeMaxima: sv(
    25,
    "Art. 13.º, n.º 5, als. b) e d) CIRS — filhos, adotados, enteados e afilhados civis maiores que não tenham mais de 25 anos",
    "art13cirs",
    REV_FAMILIA
  ),
  /**
   * O limite de rendimentos do dependente maior.
   *
   * A lei não fixa um valor: remete para a retribuição mínima mensal
   * garantida — «nem aufiram anualmente rendimentos superiores ao valor da
   * retribuição mínima mensal garantida». É por isso um limiar que sobe
   * sozinho todos os anos, e é mais baixo do que quase toda a gente supõe.
   */
  limiteRendimentoAnual: sv(
    SMN.value,
    "Art. 13.º, n.º 5, al. b) CIRS — rendimentos anuais não superiores ao valor da retribuição mínima mensal garantida",
    "art13cirs",
    REV_FAMILIA,
    "A lei remete para a RMMG e não fixa montante próprio: o limiar acompanha o salário mínimo do ano."
  ),
  /** A data que decide a situação pessoal e familiar. */
  situacaoRelevanteEm: sv(
    "o último dia do ano a que o imposto respeite",
    "Art. 13.º, n.º 8 CIRS — a situação pessoal e familiar relevante para efeitos de tributação é a que se verificar no último dia do ano",
    "art13cirs",
    REV_FAMILIA
  ),
  /** Não se pode estar em dois agregados. */
  umSoAgregado: sv(
    true,
    "Art. 13.º, n.º 7 CIRS — as pessoas referidas não podem, simultaneamente, fazer parte de mais de um agregado familiar nem, integrando um agregado, ser consideradas sujeitos passivos autónomos",
    "art13cirs",
    REV_FAMILIA
  ),
} as const;

/**
 * Guarda partilhada — Art. 78.º, n.os 9 a 12 do CIRS, com o n.º 11 na
 * redação do Decreto-Lei n.º 49/2025.
 *
 * O mecanismo é este: por defeito, um dependente que conste das duas
 * declarações vale METADE das deduções em cada uma. Uma partilha
 * diferente exige acordo que a fixe quantitativamente E comunicação de
 * ambos, até ao fim de fevereiro. Não comunicando — ou não somando 100% —
 * volta-se à divisão em partes iguais.
 */
export const GUARDA_PARTILHADA = {
  /** A redução automática quando o dependente consta das duas declarações. */
  fracaoPorSujeitoPassivo: sv(
    0.5,
    "Art. 78.º, n.º 9 CIRS — sempre que o mesmo dependente ou ascendente conste de mais do que uma declaração, o valor das deduções à coleta é reduzido para metade, por sujeito passivo",
    "art78cirs",
    REV_FAMILIA
  ),
  /** O prazo da comunicação da percentagem. */
  prazoComunicacao: sv(
    "até ao final do mês de fevereiro do ano seguinte àquele a que o imposto respeita",
    "Art. 78.º, n.º 11 CIRS (redação do Decreto-Lei n.º 49/2025) — os sujeitos passivos devem indicar no Portal das Finanças a percentagem que lhes corresponde na partilha de despesas",
    "art78cirs",
    REV_FAMILIA
  ),
  /** O que acontece sem comunicação, ou com comunicações que não fecham. */
  supletivo: sv(
    "o valor das deduções à coleta é dividido em partes iguais",
    "Art. 78.º, n.º 12 CIRS — caso não efetuem a comunicação ou a soma das percentagens comunicadas por ambos não corresponda a 100%",
    "art78cirs",
    REV_FAMILIA
  ),
  /** A condição para uma partilha diferente de metade. */
  exigeAcordoQuantificado: sv(
    true,
    "Art. 78.º, n.º 10 CIRS — só quando o acordo de regulação do exercício em comum das responsabilidades parentais estabeleça partilha não igualitária e fixe QUANTITATIVAMENTE a percentagem de cada sujeito passivo",
    "art78cirs",
    REV_FAMILIA
  ),
} as const;

/**
 * Pensões de alimentos — Art. 83.º-A do CIRS.
 *
 * A dedução é generosa — 20% sem limite máximo — e tem duas condições que
 * a anulam por inteiro quando falham: a obrigação tem de resultar de
 * SENTENÇA ou de ACORDO HOMOLOGADO, e o beneficiário não pode fazer parte
 * do mesmo agregado nem ter outras deduções ao abrigo do Art. 78.º.
 */
export const PENSAO_ALIMENTOS_IRS = {
  taxa: sv(
    DEDUCAO_PENSAO_ALIMENTOS.value,
    "Art. 83.º-A, n.º 1 CIRS — dedução de 20% das importâncias comprovadamente suportadas e não reembolsadas",
    "art83aCirs",
    REV_FAMILIA
  ),
  semLimite: sv(
    true,
    "Art. 83.º-A, n.º 1 CIRS — a norma não fixa limite máximo à dedução",
    "art83aCirs",
    REV_FAMILIA
  ),
  exigeTituloJudicial: sv(
    "sentença judicial ou acordo homologado nos termos da lei civil",
    "Art. 83.º-A, n.º 1 CIRS — a obrigação tem de resultar de um destes títulos",
    "art83aCirs",
    REV_FAMILIA,
    "Um acordo particular entre os pais, por escrito que seja, não abre o direito a esta dedução."
  ),
  incompativelComDependente: sv(
    true,
    "Art. 83.º-A, n.º 1 CIRS — salvo nos casos em que o beneficiário faça parte do mesmo agregado familiar para efeitos fiscais ou relativamente ao qual estejam previstas outras deduções à coleta ao abrigo do Art. 78.º",
    "art83aCirs",
    REV_FAMILIA,
    "Não se deduz a pensão e se declara o mesmo filho como dependente: a lei escolhe um caminho ou o outro."
  ),
} as const;

/**
 * Heranças e doações — a participação do Art. 26.º do CIS.
 *
 * A isenção da família direta é conhecida; a obrigação de participar,
 * que existe MESMO havendo isenção, é o que se esquece.
 */
export const TRANSMISSAO_GRATUITA_PARTICIPACAO = {
  prazoMeses: sv(
    3,
    "Art. 26.º, n.º 3 CIS — a participação deve ser apresentada até ao final do 3.º mês seguinte ao do nascimento da obrigação tributária",
    "art26cis",
    REV_FAMILIA
  ),
  adiamentoMaximoDias: sv(
    60,
    "Art. 26.º, n.º 5 CIS — os prazos são improrrogáveis, salvo alegando-se e provando-se motivo justificado, caso em que o chefe de finanças pode conceder adiamento até ao limite máximo de 60 dias",
    "art26cis",
    REV_FAMILIA
  ),
  quemParticipa: sv(
    "o cabeça-de-casal e o beneficiário",
    "Art. 26.º, n.º 1 CIS — ambos são obrigados a participar ao serviço de finanças competente",
    "art26cis",
    REV_FAMILIA,
    "Identificando o cabeça-de-casal todos os beneficiários, estes ficam desonerados da participação que lhes competiria (n.º 4)."
  ),
  isentos: sv(
    "o cônjuge ou unido de facto, descendentes e ascendentes",
    "Art. 6.º, al. e) CIS — isenção nas transmissões gratuitas sujeitas à verba 1.2 da Tabela Geral de que sejam beneficiários",
    "art6cisSelo",
    REV_FAMILIA,
    "A isenção é do imposto, não da participação."
  ),
} as const;


// Valores derivados (calculados, nunca digitados à mão) ──────────────────
export const IAS_VALUE = IAS.value;
export const SS_BASE_MAX_MENSAL_CALC = 12 * IAS_VALUE; // deve igualar SS_BASE_MAX_MENSAL.value
export const IRS_JOVEM_TETO_CALC = IRS_JOVEM.tetoIAS.value * IAS_VALUE; // 55 × IAS

// ═══════════════════════════════════════════════════════════════════════
//  SISTEMA DE GARANTIA — invariantes verificados ao carregar o módulo.
//  Se algo for inconsistente, LANÇA e o build/dev falha imediatamente.
// ═══════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════
//  TRABALHO DEPENDENTE (CATEGORIA A) — vencimento, retenção IRS, SS
//  ---------------------------------------------------------------------
//  Etapa 1 da unificação com trabalhadores por conta de outrem.
//  Tabelas de retenção CROSS-VERIFICADAS contra duas referências
//  independentes (Montepio + CRN Contabilidade) que reproduzem o
//  Despacho 233-A/2026. Para já só a Tabela I (não casado / casado dois
//  titulares, Continente); restantes tabelas/regiões na Etapa seguinte.
// ═══════════════════════════════════════════════════════════════════════

const DEP_TODAY = "2026-06-17";
// Data de verificação da revisão do simulador de recibos de vencimento: parcelas
// de incapacidade do n.º 5/n.º 6 do Despacho 233-A/2026, republicação das tabelas
// da Madeira e tabela de ajudas de custo da DGAEP.
const REV_RETENCAO_INCAPACIDADE = "2026-08-01";

/** Taxas de contribuição para a Segurança Social — trabalho por conta de outrem. */
export const SS_DEPENDENTE = {
  trabalhador: sv(
    0.11,
    "Taxa contributiva do trabalhador por conta de outrem (11% sobre a remuneração ilíquida)",
    "segSocialGov",
    DEP_TODAY
  ),
  entidade: sv(
    0.2375,
    "Taxa Social Única da entidade empregadora (regime geral)",
    "segSocialGov",
    DEP_TODAY
  ),
  ipss: sv(
    0.223,
    "TSU da entidade — IPSS / entidades sem fins lucrativos",
    "segSocialGov",
    DEP_TODAY
  ),
};

/**
 * Subsídio de refeição — limites diários de isenção (IRS + SS).
 *
 * A al. b), 2) do n.º 3 do art. 2.º do CIRS, na redação da Lei n.º 45-A/2024,
 * não fixa DOIS montantes: fixa um, e uma majoração. É rendimento do trabalho
 * o subsídio «na parte em que exceder o limite legal estabelecido ou em que o
 * exceda em 70% sempre que o respetivo subsídio seja atribuído através de
 * vales de refeição».
 *
 * O limite do cartão é, por isso, DERIVADO — não é um segundo número a manter
 * à mão. Quando o valor em numerário sobe, o do cartão acompanha-o sozinho.
 */
export const SUBSIDIO_REFEICAO_MAJORACAO_VALES = sv(
  0.70,
  "Art. 2.º, n.º 3, al. b), 2) CIRS — o limite é excedido em 70% quando o subsídio é atribuído através de vales de refeição (Lei n.º 45-A/2024)",
  "art2cirs",
  REV_EMPRESA
);

export const SUBSIDIO_REFEICAO = {
  dinheiro: sv(
    6.15,
    "Limite diário isento em numerário (Art. 2.º, n.º 3, al. b), 2) CIRS)",
    "subsidioRefeicao2026",
    DEP_TODAY
  ),
  cartao: sv(
    Math.round(6.15 * (1 + SUBSIDIO_REFEICAO_MAJORACAO_VALES.value) * 100) / 100,
    "Limite diário isento em cartão/vale de refeição — o do numerário majorado em 70% (Art. 2.º, n.º 3, al. b), 2) CIRS)",
    "art2cirs",
    REV_EMPRESA,
    "Derivado, não fixado: 6,15 € × 1,70 = 10,46 €. Subiu de 6,00 €/10,20 € (2025) para 6,15 €/10,46 € (2026)."
  ),
};

/**
 * Abono para falhas — devido a quem, no seu trabalho, tenha de movimentar
 * numerário. Só é rendimento na parte que exceda uma fração da remuneração
 * mensal fixa, e é por isso que não tem valor em euros: tem percentagem.
 */
export const ABONO_PARA_FALHAS = sv(
  0.05,
  "Art. 2.º, n.º 3, al. c) CIRS — os abonos para falhas são rendimento do trabalho na parte em que excedam 5% da remuneração mensal fixa",
  "art2cirs",
  REV_EMPRESA
);

/**
 * A condição que a al. d) do n.º 3 do art. 2.º impõe às ajudas de custo e aos
 * quilómetros, e que é esquecida com mais frequência do que os limites: não
 * basta ficar abaixo do valor: têm de ser observados os PRESSUPOSTOS da sua
 * atribuição aos servidores do Estado.
 */
export const AJUDAS_CUSTO_PRESSUPOSTOS = sv(
  "as ajudas de custo e as importâncias pela utilização de automóvel próprio em serviço são rendimento do trabalho na parte em que excedam os limites legais OU quando não sejam observados os pressupostos da sua atribuição aos servidores do Estado",
  "Art. 2.º, n.º 3, al. d) CIRS",
  "art2cirs",
  REV_EMPRESA,
  "A mesma alínea tributa as verbas para despesas de deslocação, viagens ou representação de que não tenham sido prestadas contas até ao termo do exercício."
);


// ═══════════════════════════════════════════════════════════════════════
//  CÓDIGO DO TRABALHO — o que a secção «Trabalho por conta de outrem»
//  precisa, lido no articulado consolidado a 07/08/2026.
//
//  Sobre a fonte, porque a decisão importa: o texto CONSOLIDADO do Código
//  do Trabalho não está no Portal das Finanças (não é um código fiscal) e
//  o Diário da República serve as suas páginas de legislação consolidada
//  como aplicação de página única — o pedido devolve 2,3 KB de shell
//  vazio. A base de dados jurídica da Procuradoria-Geral Distrital de
//  Lisboa serve-o inteiro, com o histórico de alterações artigo a artigo.
//
//  A currência foi confirmada CONTRA fonte governamental independente: a
//  lista de alterações que a PGD Lisboa apresenta termina na Lei n.º
//  32/2025, de 27 de março, exatamente a mesma que a DGERT — a direção-
//  geral responsável pela matéria — dá como última alteração ao Código.
//  Duas fontes, a mesma lista de 24 diplomas. É isso que sustenta estes
//  valores, e é por isso que ambas ficam registadas em `SOURCES`.
// ═══════════════════════════════════════════════════════════════════════

/** Art. 112.º — durações do período experimental, em dias. */
export const PERIODO_EXPERIMENTAL = {
  geral: sv(
    90,
    "Art. 112.º, n.º 1, al. a) CT — 90 dias para a generalidade dos trabalhadores, em contrato por tempo indeterminado",
    "ctPeriodoExperimental",
    REV_TRABALHO
  ),
  qualificados: sv(
    180,
    "Art. 112.º, n.º 1, al. b) CT — 180 dias para cargos de complexidade técnica, elevado grau de responsabilidade ou especial qualificação, funções de confiança, e quem esteja à procura de primeiro emprego ou em desemprego de longa duração",
    "ctPeriodoExperimental",
    REV_TRABALHO
  ),
  direcao: sv(
    240,
    "Art. 112.º, n.º 1, al. c) CT — 240 dias para trabalhador que exerça cargo de direção ou quadro superior",
    "ctPeriodoExperimental",
    REV_TRABALHO
  ),
  termoSeisMesesOuMais: sv(
    30,
    "Art. 112.º, n.º 2, al. a) CT — 30 dias em contrato a termo de duração igual ou superior a seis meses",
    "ctPeriodoExperimental",
    REV_TRABALHO
  ),
  termoMenosDeSeisMeses: sv(
    15,
    "Art. 112.º, n.º 2, al. b) CT — 15 dias em contrato a termo certo de duração inferior a seis meses, ou a termo incerto cuja duração previsível não ultrapasse esse limite",
    "ctPeriodoExperimental",
    REV_TRABALHO
  ),
  comissaoDeServico: sv(
    180,
    "Art. 112.º, n.º 3 CT — em comissão de serviço depende de estipulação expressa e não pode exceder 180 dias",
    "ctPeriodoExperimental",
    REV_TRABALHO
  ),
  reducaoPorContratoAnterior: sv(
    90,
    "Art. 112.º, n.os 5 e 6 CT — o período do primeiro emprego/desemprego de longa duração é reduzido ou excluído consoante contrato a termo anterior com OUTRO empregador, ou estágio profissional com avaliação positiva nos últimos 12 meses, tenha durado 90 dias ou mais",
    "ctPeriodoExperimental",
    REV_TRABALHO
  ),
  antiguidadeContaDesdeOInicio: sv(
    "a antiguidade do trabalhador conta-se desde o início do período experimental",
    "Art. 112.º, n.º 8 CT",
    "ctPeriodoExperimental",
    REV_TRABALHO
  ),
};

/** Art. 114.º — denúncia durante o período experimental. */
export const DENUNCIA_EXPERIMENTAL = {
  semAvisoPrevio: sv(
    "qualquer das partes pode denunciar o contrato sem aviso prévio e sem invocação de justa causa, nem direito a indemnização",
    "Art. 114.º, n.º 1 CT",
    "ctDenunciaExperimental",
    REV_TRABALHO,
    "Salvo acordo escrito em contrário — e é a única porta que o contrato individual tem aqui."
  ),
  limiarAviso7Dias: sv(
    60,
    "Art. 114.º, n.º 2 CT — tendo o período experimental durado mais de 60 dias, a denúncia pelo empregador depende de aviso prévio de sete dias",
    "ctDenunciaExperimental",
    REV_TRABALHO
  ),
  aviso7Dias: sv(7, "Art. 114.º, n.º 2 CT — aviso prévio de sete dias", "ctDenunciaExperimental", REV_TRABALHO),
  limiarAviso30Dias: sv(
    120,
    "Art. 114.º, n.º 3 CT — tendo durado mais de 120 dias, a denúncia pelo empregador depende de aviso prévio de 30 dias",
    "ctDenunciaExperimental",
    REV_TRABALHO
  ),
  aviso30Dias: sv(30, "Art. 114.º, n.º 3 CT — aviso prévio de 30 dias", "ctDenunciaExperimental", REV_TRABALHO),
  faltaDeAviso: sv(
    "o não cumprimento, total ou parcial, do aviso prévio determina o pagamento da retribuição correspondente ao período em falta",
    "Art. 114.º, n.º 4 CT",
    "ctDenunciaExperimental",
    REV_TRABALHO
  ),
  comunicacaoIgualdadeDiasUteis: sv(
    5,
    "Art. 114.º, n.º 5 CT — a denúncia de trabalhadora grávida, puérpera ou lactante, de trabalhador em licença parental ou de trabalhador cuidador é comunicada à entidade competente na área da igualdade no prazo de cinco dias úteis",
    "ctDenunciaExperimental",
    REV_TRABALHO
  ),
  denunciaAbusiva: sv(
    "é ilícita a denúncia que constitua abuso do direito, e o caráter abusivo só pode ser declarado pelos tribunais judiciais",
    "Art. 114.º, n.os 7 e 8 CT",
    "ctDenunciaExperimental",
    REV_TRABALHO
  ),
};

/** Arts. 140.º e 148.º — contrato a termo. */
export const CONTRATO_A_TERMO = {
  soNecessidadesTemporarias: sv(
    "só pode ser celebrado para a satisfação de necessidades temporárias, objetivamente definidas pela entidade empregadora, e apenas pelo período estritamente necessário à satisfação dessas necessidades",
    "Art. 140.º, n.º 1 CT",
    "ctTermo",
    REV_TRABALHO
  ),
  onusDaProva: sv(
    "cabe ao empregador a prova dos factos que justificam a celebração de contrato de trabalho a termo",
    "Art. 140.º, n.º 5 CT",
    "ctTermo",
    REV_TRABALHO
  ),
  duracaoMaximaTermoCerto: sv(
    2,
    "Art. 148.º, n.º 1 CT — a duração do contrato a termo certo não pode ser superior a dois anos",
    "ctTermo",
    REV_TRABALHO
  ),
  duracaoMaximaTermoIncerto: sv(
    4,
    "Art. 148.º, n.º 5 CT — a duração do contrato a termo incerto não pode ser superior a quatro anos",
    "ctTermo",
    REV_TRABALHO
  ),
  duracaoMinimaMeses: sv(
    6,
    "Art. 148.º, n.º 2 CT — só pode ser celebrado por prazo inferior a seis meses nas situações das als. a) a g) do n.º 2 do art. 140.º; violando-o, considera-se celebrado por seis meses",
    "ctTermo",
    REV_TRABALHO
  ),
  novaEmpresaTrabalhadores: sv(
    250,
    "Art. 140.º, n.º 4, al. a) CT — lançamento de nova atividade de duração incerta ou início de funcionamento de empresa ou estabelecimento de empresa com menos de 250 trabalhadores, nos dois anos posteriores",
    "ctTermo",
    REV_TRABALHO
  ),
  contraordenacao: sv(
    "constitui contraordenação muito grave a violação do disposto em qualquer dos n.os 1 a 4 do art. 140.º",
    "Art. 140.º, n.º 6 CT",
    "ctTermo",
    REV_TRABALHO
  ),
};

/** Arts. 131.º, 132.º e 134.º — formação contínua. */
export const FORMACAO_CONTINUA = {
  horasAnuais: sv(
    40,
    "Art. 131.º, n.º 2 CT — o trabalhador tem direito, em cada ano, a um número mínimo de quarenta horas de formação contínua",
    "ctFormacao",
    REV_TRABALHO,
    "Sendo contratado a termo por período igual ou superior a três meses, a um número proporcional à duração do contrato nesse ano."
  ),
  fracaoMinimaDeTrabalhadores: sv(
    0.10,
    "Art. 131.º, n.º 5 CT — o empregador deve assegurar, em cada ano, formação contínua a pelo menos 10% dos trabalhadores da empresa",
    "ctFormacao",
    REV_TRABALHO
  ),
  antecipacaoOuDiferimentoAnos: sv(
    2,
    "Art. 131.º, n.º 6 CT — o empregador pode antecipar até dois anos ou, prevendo-o o plano de formação, diferir por igual período",
    "ctFormacao",
    REV_TRABALHO
  ),
  antecipacaoDuplaCertificacaoAnos: sv(
    5,
    "Art. 131.º, n.º 7 CT — o período de antecipação é de cinco anos em processo de reconhecimento, validação e certificação de competências, ou em formação de dupla certificação",
    "ctFormacao",
    REV_TRABALHO
  ),
  prazoAteViragemEmCredito: sv(
    2,
    "Art. 132.º, n.º 1 CT — as horas não asseguradas pelo empregador até ao termo dos dois anos posteriores ao seu vencimento transformam-se em crédito de horas, em igual número, para formação por iniciativa do trabalhador",
    "ctFormacao",
    REV_TRABALHO
  ),
  creditoContaComoTrabalho: sv(
    "o crédito de horas é referido ao período normal de trabalho, confere direito a retribuição e conta como tempo de serviço efetivo",
    "Art. 132.º, n.º 2 CT",
    "ctFormacao",
    REV_TRABALHO
  ),
  antecedenciaComunicacaoDias: sv(
    10,
    "Art. 132.º, n.º 3 CT — o trabalhador pode utilizar o crédito mediante comunicação ao empregador com a antecedência mínima de 10 dias",
    "ctFormacao",
    REV_TRABALHO
  ),
  caducidadeDoCreditoAnos: sv(
    3,
    "Art. 132.º, n.º 6 CT — o crédito de horas para formação que não seja utilizado cessa passados três anos sobre a sua constituição",
    "ctFormacao",
    REV_TRABALHO
  ),
  pagamentoNaCessacao: sv(
    "cessando o contrato, o trabalhador tem direito a receber a retribuição correspondente ao número mínimo anual de horas de formação que não lhe tenha sido proporcionado, ou ao crédito de horas de que seja titular à data da cessação",
    "Art. 134.º CT",
    "ctFormacao",
    REV_TRABALHO
  ),
};

/** Arts. 208.º-A e 208.º-B — banco de horas. */
export const BANCO_DE_HORAS = {
  individualRevogado: sv(
    "o banco de horas individual foi REVOGADO — o art. 208.º-A já não existe na ordem jurídica",
    "Art. 208.º-A CT (revogado)",
    "ctBancoHoras",
    REV_TRABALHO,
    "Continua a ser descrito como vigente em muita informação em circulação. Não é."
  ),
  grupalAcrescimoDiario: sv(
    2,
    "Art. 208.º-B, n.º 3 CT — no banco de horas grupal o período normal de trabalho pode ser aumentado até duas horas diárias",
    "ctBancoHoras",
    REV_TRABALHO
  ),
  grupalMaximoSemanal: sv(
    50,
    "Art. 208.º-B, n.º 3 CT — pode atingir 50 horas semanais",
    "ctBancoHoras",
    REV_TRABALHO
  ),
  grupalMaximoAnual: sv(
    150,
    "Art. 208.º-B, n.º 3 CT — o acréscimo tem o limite de 150 horas por ano",
    "ctBancoHoras",
    REV_TRABALHO
  ),
  grupalMaioriaReferendo: sv(
    0.65,
    "Art. 208.º-B, n.º 6 CT — o regime só pode ser aplicado se o projeto for aprovado em referendo por, pelo menos, 65% dos trabalhadores abrangidos",
    "ctBancoHoras",
    REV_TRABALHO
  ),
  grupalDuracaoMaximaAnos: sv(
    4,
    "Art. 208.º-B, n.º 4, al. b) CT — o período durante o qual o regime é aplicável não pode ser superior a quatro anos",
    "ctBancoHoras",
    REV_TRABALHO
  ),
  grupalAntecedenciaReferendoDias: sv(
    20,
    "Art. 208.º-B, n.º 5 CT — o projeto é publicitado e comunicado com a antecedência mínima de 20 dias em relação à data do referendo",
    "ctBancoHoras",
    REV_TRABALHO
  ),
};

/** Arts. 166.º, 168.º e 170.º — teletrabalho. */
export const TELETRABALHO = {
  exigeAcordoEscrito: sv(
    "a implementação do regime de teletrabalho depende SEMPRE de acordo escrito, que pode constar do contrato inicial ou ser autónomo",
    "Art. 166.º, n.º 2 CT",
    "ctTeletrabalho",
    REV_TRABALHO
  ),
  localDeTrabalho: sv(
    "o local em que o trabalhador realiza habitualmente o trabalho é considerado, para todos os efeitos legais, o seu local de trabalho",
    "Art. 166.º, n.º 4, al. b) CT",
    "ctTeletrabalho",
    REV_TRABALHO
  ),
  despesasIntegralmenteCompensadas: sv(
    "são integralmente compensadas pelo empregador todas as despesas adicionais que, comprovadamente, o trabalhador suporte como direta consequência da aquisição ou uso dos equipamentos e sistemas, incluindo os acréscimos de custos de energia e da rede e os custos de manutenção",
    "Art. 168.º, n.º 2 CT",
    "ctTeletrabalho",
    REV_TRABALHO
  ),
  criterioDasDespesas: sv(
    "na ausência de acordo sobre um valor fixo, consideram-se despesas adicionais as correspondentes a bens ou serviços de que o trabalhador não dispunha antes do acordo, e as determinadas por comparação com as despesas homólogas do último mês de trabalho presencial",
    "Art. 168.º, n.º 4 CT",
    "ctTeletrabalho",
    REV_TRABALHO
  ),
  pagamentoImediato: sv(
    "o pagamento da compensação é devido imediatamente após a realização das despesas pelo trabalhador",
    "Art. 168.º, n.º 5 CT",
    "ctTeletrabalho",
    REV_TRABALHO
  ),
  tratamentoFiscal: sv(
    "a compensação é, para efeitos fiscais, custo para o empregador e NÃO constitui rendimento do trabalhador até ao limite do valor definido por portaria",
    "Art. 168.º, n.º 6 CT",
    "ctTeletrabalho",
    REV_TRABALHO,
    "O limite consta de portaria dos membros do Governo responsáveis pelas áreas dos assuntos fiscais e da segurança social — não do Código."
  ),
  avisoVisitaHoras: sv(
    24,
    "Art. 170.º, n.º 2 CT — sendo o teletrabalho realizado no domicílio, a visita ao local de trabalho requer aviso prévio de 24 horas e concordância do trabalhador",
    "ctTeletrabalho",
    REV_TRABALHO
  ),
  controloProibido: sv(
    "é vedada a captura e utilização de imagem, de som, de escrita, de histórico, ou o recurso a outros meios de controlo que possam afetar o direito à privacidade do trabalhador",
    "Art. 170.º, n.º 5 CT — a violação constitui contraordenação MUITO GRAVE (n.º 7)",
    "ctTeletrabalho",
    REV_TRABALHO
  ),
};

/** Art. 29.º — assédio. */
export const ASSEDIO_TRABALHO = {
  definicao: sv(
    "comportamento indesejado, nomeadamente o baseado em fator de discriminação, praticado aquando do acesso ao emprego ou no próprio emprego, trabalho ou formação profissional, com o objetivo OU O EFEITO de perturbar ou constranger a pessoa, afetar a sua dignidade, ou de lhe criar um ambiente intimidativo, hostil, degradante, humilhante ou desestabilizador",
    "Art. 29.º, n.º 2 CT",
    "ctAssedio",
    REV_TRABALHO,
    "«Objetivo ou efeito» — não é preciso provar intenção."
  ),
  assedioSexual: sv(
    "comportamento indesejado de carácter sexual, sob forma verbal, não verbal ou física, com o mesmo objetivo ou efeito",
    "Art. 29.º, n.º 3 CT",
    "ctAssedio",
    REV_TRABALHO
  ),
  direitoAIndemnizacao: sv(
    "a prática de assédio confere à vítima o direito de indemnização",
    "Art. 29.º, n.º 4 CT",
    "ctAssedio",
    REV_TRABALHO
  ),
  contraordenacao: sv(
    "a prática de assédio constitui contraordenação muito grave, sem prejuízo da eventual responsabilidade penal",
    "Art. 29.º, n.º 5 CT",
    "ctAssedio",
    REV_TRABALHO
  ),
  protecaoDoDenunciante: sv(
    "o denunciante e as testemunhas por si indicadas não podem ser sancionados disciplinarmente, a menos que atuem com dolo, até decisão final transitada em julgado",
    "Art. 29.º, n.º 6 CT",
    "ctAssedio",
    REV_TRABALHO
  ),
};

/** Art. 94.º — trabalhador-estudante. */
export const TRABALHADOR_ESTUDANTE = {
  provaDaCondicao: sv(
    "o trabalhador-estudante deve comprovar perante o empregador a sua condição de estudante, apresentando igualmente o horário das atividades educativas a frequentar",
    "Art. 94.º, n.º 1 CT",
    "ctTrabalhadorEstudante",
    REV_TRABALHO
  ),
  aproveitamentoEscolar: sv(
    "transição de ano, ou aprovação ou progressão em pelo menos METADE das disciplinas em que esteja matriculado",
    "Art. 94.º, n.º 4 CT",
    "ctTrabalhadorEstudante",
    REV_TRABALHO
  ),
  horarioCompativel: sv(
    "deve escolher, entre as possibilidades existentes, o horário mais compatível com o horário de trabalho, sob pena de não beneficiar dos inerentes direitos",
    "Art. 94.º, n.º 3 CT",
    "ctTrabalhadorEstudante",
    REV_TRABALHO
  ),
  naoCumulavel: sv(
    "não pode cumular os direitos previstos no Código com quaisquer regimes que visem os mesmos fins",
    "Art. 94.º, n.º 6 CT",
    "ctTrabalhadorEstudante",
    REV_TRABALHO
  ),
};

/**
 * Art. 366.º — compensação por despedimento coletivo. Os dois tetos são
 * múltiplos da retribuição mínima mensal garantida, e por isso derivam do
 * SMN: sobem com ele, sozinhos.
 */
export const COMPENSACAO_DESPEDIMENTO = {
  diasPorAno: sv(
    14,
    "Art. 366.º, n.º 1 CT — compensação correspondente a 14 dias de retribuição base e diuturnidades por cada ano completo de antiguidade",
    "ctCompensacao",
    REV_TRABALHO
  ),
  tetoRetribuicaoEmSmn: sv(
    20,
    "Art. 366.º, n.º 2, al. a) CT — a retribuição base mensal e diuturnidades a considerar não pode ser superior a 20 vezes a retribuição mínima mensal garantida",
    "ctCompensacao",
    REV_TRABALHO
  ),
  tetoGlobalEmMeses: sv(
    12,
    "Art. 366.º, n.º 2, al. b) CT — o montante global não pode ser superior a 12 vezes a retribuição base mensal e diuturnidades",
    "ctCompensacao",
    REV_TRABALHO
  ),
  tetoGlobalEmSmn: sv(
    240,
    "Art. 366.º, n.º 2, al. b) CT — ou, sendo aplicável o teto da al. a), a 240 vezes a retribuição mínima mensal garantida",
    "ctCompensacao",
    REV_TRABALHO
  ),
  divisorDiario: sv(
    30,
    "Art. 366.º, n.º 2, al. c) CT — o valor diário resulta da divisão por 30 da retribuição base mensal e diuturnidades",
    "ctCompensacao",
    REV_TRABALHO
  ),
  fracaoProporcional: sv(
    "em caso de fração de ano, o montante da compensação é calculado proporcionalmente",
    "Art. 366.º, n.º 2, al. d) CT",
    "ctCompensacao",
    REV_TRABALHO
  ),
  presuncaoDeAceitacao: sv(
    "presume-se que o trabalhador aceita o despedimento quando recebe a totalidade da compensação — presunção ilidível se, em simultâneo, devolver a totalidade do que recebeu",
    "Art. 366.º, n.os 4 e 5 CT",
    "ctCompensacao",
    REV_TRABALHO,
    "É a razão pela qual receber a compensação sem reservas fecha a porta a contestar o despedimento."
  ),
};

/** Tetos do art. 366.º em euros, derivados do salário mínimo. */
export const COMPENSACAO_TETO_RETRIBUICAO =
  Math.round(COMPENSACAO_DESPEDIMENTO.tetoRetribuicaoEmSmn.value * SMN.value * 100) / 100;
export const COMPENSACAO_TETO_GLOBAL =
  Math.round(COMPENSACAO_DESPEDIMENTO.tetoGlobalEmSmn.value * SMN.value * 100) / 100;

/** Horário semanal a tempo completo — base da fórmula da retribuição horária. */
export const HORARIO_SEMANAL_COMPLETO = sv(
  40,
  "Art. 203.º CT — limite máximo do período normal de trabalho (40h/semana)",
  "ct271",
  DEP_TODAY,
  "Usado na fórmula da retribuição horária (Art. 271.º CT): (retribuição mensal × 12) ÷ (52 × horas semanais)."
);

/**
 * Trabalho suplementar (horas extra) — acréscimos sobre a retribuição horária
 * (Art. 268.º CT, redação da Lei 13/2023 «Agenda do Trabalho Digno»).
 * Até 100h/ano: 25% (1.ª hora, dia útil), 37,5% (horas seguintes, dia útil),
 * 50% (dia de descanso/feriado). Acima de 100h/ano os acréscimos sobem para
 * 50% / 75% / 100%. Os seis segmentos permanecem separados para não aplicar
 * 50% onde é devido 75% depois do limiar anual.
 */
export const TRABALHO_SUPLEMENTAR = {
  acrescimos: sv(
    [0.25, 0.375, 0.5, 0.5, 0.75, 1.0] as number[],
    "Art. 268.º CT — acréscimos do trabalho suplementar (Lei 7/2009, alt. Lei 13/2023)",
    "ct268",
    DEP_TODAY,
    "25%/37,5% em dia útil (≤100h/ano); 50% em descanso/feriado (ou dia útil >100h, 1.ª hora); 100% em descanso/feriado >100h."
  ),
};

/**
 * Retenção na fonte do trabalho suplementar: desde 2026 aplica-se, a TODAS as
 * horas, uma taxa igual a 50% da taxa efetiva mensal de retenção do salário.
 */
export const RETENCAO_SUPLEMENTAR_FATOR = sv(
  0.5,
  "Trabalho suplementar — retenção autónoma = 50% da taxa efetiva mensal (aplicável desde a 1.ª hora em 2026)",
  "retencaoSuplementar2026",
  DEP_TODAY
);

/**
 * Ajudas de custo — limites diários isentos de IRS e Segurança Social.
 *
 * O Art. 2.º, n.º 3, al. d) do CIRS não fixa valores: remete para «os limites
 * legais estabelecidos para os servidores do Estado», publicados pela DGAEP. Daí
 * haver DOIS patamares no setor privado, e não um só:
 *  · trabalhadores em geral → escalão dos servidores com nível remuneratório
 *    superior a 18 (65,89 € / 148,91 €);
 *  · administradores, gerentes e membros de órgãos estatutários → escalão
 *    equiparado a membros do Governo (72,65 € / 167,07 €).
 *
 * Os valores anteriores (62,75 € / 89,35 €) estavam desatualizados: o nacional
 * era o de 2024, antes do aumento de 5% do Decreto-Lei n.º 1/2025, e o do
 * estrangeiro nem sequer correspondia ao patamar certo — tributava indevidamente
 * deslocações inteiramente cobertas pela isenção.
 */
export const AJUDAS_CUSTO = {
  nacionalDia: sv(
    65.89,
    "Art. 2.º, n.º 3, al. d) CIRS — limite diário isento em território nacional (servidor do Estado com nível remuneratório superior a 18)",
    "ajudasCusto2026",
    REV_RETENCAO_INCAPACIDADE
  ),
  estrangeiroDia: sv(
    148.91,
    "Art. 2.º, n.º 3, al. d) CIRS — limite diário isento em deslocação ao estrangeiro (servidor do Estado com nível remuneratório superior a 18)",
    "ajudasCusto2026",
    REV_RETENCAO_INCAPACIDADE
  ),
  nacionalDiaDirecao: sv(
    72.65,
    "Art. 2.º, n.º 3, al. d) CIRS — limite diário isento em território nacional para administradores/gerentes (escalão de membros do Governo)",
    "ajudasCusto2026",
    REV_RETENCAO_INCAPACIDADE
  ),
  estrangeiroDiaDirecao: sv(
    167.07,
    "Art. 2.º, n.º 3, al. d) CIRS — limite diário isento em deslocação ao estrangeiro para administradores/gerentes (escalão de membros do Governo)",
    "ajudasCusto2026",
    REV_RETENCAO_INCAPACIDADE
  ),
};

/** Escalão de ajudas de custo aplicável a quem se desloca. */
export type EscalaoAjudasCusto = "trabalhador" | "direcao";

/** Limite diário isento de ajudas de custo, por destino e escalão. */
export function limiteAjudasCusto(estrangeiro: boolean, escalao: EscalaoAjudasCusto = "trabalhador"): number {
  if (estrangeiro) {
    return escalao === "direcao" ? AJUDAS_CUSTO.estrangeiroDiaDirecao.value : AJUDAS_CUSTO.estrangeiroDia.value;
  }
  return escalao === "direcao" ? AJUDAS_CUSTO.nacionalDiaDirecao.value : AJUDAS_CUSTO.nacionalDia.value;
}

/**
 * Dedução específica do trabalho dependente (Categoria A): 8,54 × IAS — ou, se
 * superior, o total das contribuições obrigatórias para a Segurança Social.
 * Usada no apuramento anual de IRS (não na retenção mensal).
 */
export const DEDUCAO_ESPECIFICA_DEPENDENTE = sv(
  Math.round(8.54 * IAS.value * 100) / 100,
  "Art. 25.º CIRS — dedução específica = 8,54 × IAS (ou contribuições SS, se superiores)",
  "art25cirs",
  DEP_TODAY
);


/**
 * Dedução específica das pensões — Art. 53.º, n.º 1 do CIRS.
 *
 * Lido no articulado a 07/08/2026, e a leitura muda o que se pode
 * escrever: na redação da Lei n.º 45-A/2024, o artigo JÁ NÃO TEM VALOR
 * PRÓPRIO. Remete para «o previsto na alínea a) do n.º 1 do artigo 25.º»
 * — a dedução específica do trabalho dependente.
 *
 * Por isso não é um número: é uma referência. Escrever aqui um valor
 * fixo criava a segunda cópia do mesmo montante, e no ano em que o IAS
 * mudasse as duas divergiam sem ninguém dar por isso.
 */
export const DEDUCAO_ESPECIFICA_PENSOES = sv(
  DEDUCAO_ESPECIFICA_DEPENDENTE.value,
  "Art. 53.º, n.º 1 CIRS (redação da Lei n.º 45-A/2024) — aos rendimentos brutos da categoria H deduz-se o previsto na al. a) do n.º 1 do Art. 25.º, até à concorrência do rendimento",
  "art53cirs",
  REV_PROTECAO_2026,
  "Rendimentos anuais iguais ou inferiores a este montante deduzem a totalidade do seu quantitativo (n.º 1); acima disso, deduz-se o montante fixado (n.º 2)."
);

/**
 * Entidade contratante — a contribuição que o CLIENTE paga quando um
 * independente depende economicamente dele.
 *
 * Não sai do bolso do independente e não lhe acrescenta proteção: é uma
 * contribuição autónoma da entidade, apurada oficiosamente pela Segurança
 * Social a partir das declarações trimestrais.
 */
export const ENTIDADE_CONTRATANTE = {
  /** Dependência a partir da qual a obrigação existe. */
  dependenciaMinima: sv(
    0.5,
    "Código dos Regimes Contributivos — considera-se entidade contratante a que beneficie de mais de 50% do valor total da atividade do trabalhador independente",
    "ssEntidadeContratante",
    REV_PROTECAO_2026
  ),
  /** Dependência de mais de 50% e até 80%. */
  taxaAte80: sv(
    0.07,
    "Código dos Regimes Contributivos — taxa de 7% quando a dependência económica é superior a 50% e igual ou inferior a 80%",
    "ssEntidadeContratante",
    REV_PROTECAO_2026
  ),
  /** Dependência superior a 80%. */
  taxaAcima80: sv(
    0.1,
    "Código dos Regimes Contributivos — taxa de 10% quando a dependência económica é superior a 80%",
    "ssEntidadeContratante",
    REV_PROTECAO_2026
  ),
  /** O limiar de rendimento anual que ativa a obrigação, em múltiplos do IAS. */
  limiarIAS: sv(
    6,
    "Código dos Regimes Contributivos — a obrigação só existe quando o rendimento anual do trabalhador independente é superior a seis vezes o valor do IAS",
    "ssEntidadeContratante",
    REV_PROTECAO_2026
  ),
} as const;

/** O limiar da entidade contratante, em euros do ano corrente. */
export const ENTIDADE_CONTRATANTE_LIMIAR_CALC =
  Math.round(ENTIDADE_CONTRATANTE.limiarIAS.value * IAS.value * 100) / 100;

/**
 * O ajuste voluntário da base de incidência, na declaração trimestral.
 *
 * É a única alavanca que o independente tem sobre a sua contribuição — e
 * é uma alavanca de dois gumes, porque a base de incidência é também a
 * remuneração registada de que sairão o subsídio de doença, o subsídio
 * parental e, no fim, a pensão. Baixar hoje é poupar hoje e receber menos
 * em todos os momentos em que precisar.
 */
export const AJUSTE_BASE_SS = {
  amplitude: sv(
    0.25,
    "Código dos Regimes Contributivos — o trabalhador independente pode fazer variar a base de incidência apurada em ±25%",
    "segSocialGov",
    REV_PROTECAO_2026
  ),
  degrau: sv(
    0.05,
    "Código dos Regimes Contributivos — a variação faz-se em intervalos de 5 pontos percentuais",
    "segSocialGov",
    REV_PROTECAO_2026
  ),
} as const;

/**
 * Tecto da dedução específica da categoria A quando elevada por quotizações
 * para ordens profissionais (Art. 25.º, n.º 4): 75% de 12 × IAS. Só a diferença
 * face à alínea a) pode vir das quotizações, e só quando a atividade é exercida
 * exclusivamente por conta de outrem — daí ser um tecto, não um acréscimo livre.
 */
export const DEDUCAO_ESPECIFICA_DEP_MAX_ORDENS = sv(
  Math.round(0.75 * 12 * IAS.value * 100) / 100,
  "Art. 25.º, n.º 4 CIRS — elevação da dedução específica até 75% de 12 × IAS por quotizações para ordens profissionais",
  "art25cirs",
  DEP_TODAY
);

/**
 * Quotizações sindicais (Art. 25.º, n.º 1, al. c): dedutíveis até 1% do
 * rendimento bruto da categoria e acrescidas de 100% — ou seja, 1% do bruto
 * suportado vale 2% de dedução. Acrescem à dedução da alínea a), não a
 * substituem.
 */
export const QUOTIZACOES_SINDICAIS = sv(
  { limiteFracaoBruto: 0.01, majoracao: 1 },
  "Art. 25.º, n.º 1, al. c) CIRS — quotizações sindicais até 1% do rendimento bruto, acrescidas de 100%",
  "art25cirs",
  DEP_TODAY
);

/** Remuneração mensal até este valor: isenta de retenção na fonte (acompanha o SMN). */
export const RETENCAO_DEP_ISENCAO = sv(
  920,
  "Limiar de isenção de retenção na fonte 2026 (Despacho 233-A/2026)",
  "despachoRetencao2026",
  DEP_TODAY
);

/** Parcela adicional a abater por dependente (Tabela I, Continente 2026). */
export const RETENCAO_DEP_POR_DEPENDENTE = sv(
  21.43,
  "Parcela adicional a abater por dependente (Tabela I, Continente)",
  "despachoRetencao2026",
  DEP_TODAY
);

/**
 * Redução da taxa marginal máxima da retenção na fonte para trabalhadores com
 * 3 ou mais dependentes: menos 1 ponto percentual (Despacho 233-A/2026, n.º 5,
 * al. h). A parcela a abater mantém-se inalterada.
 */
export const RETENCAO_DEP_REDUCAO_3MAIS = sv(
  0.01,
  "Despacho n.º 233-A/2026, n.º 5, al. h) — redução de 1 p.p. na taxa marginal com 3+ dependentes",
  "despachoRetencao2026",
  DEP_TODAY
);

/**
 * Opção do titular por uma taxa de retenção SUPERIOR à legalmente aplicável.
 *
 * O direito está no n.º 6 do Art. 98.º do CIRS: «Os titulares dos rendimentos
 * das categorias A, B e H podem optar pela retenção do IRS mediante taxa
 * inteira superior à que lhes é legalmente aplicável em declaração para o
 * efeito a apresentar à entidade pagadora dos rendimentos.»
 *
 * O que muda no CÁLCULO está no n.º 5, al. e) do Despacho: «altera-se apenas o
 * valor da taxa marginal máxima que seria aplicável, mantendo-se inalterada a
 * parcela a abater e, se aplicável, a parcela adicional a abater por
 * dependente». É por isso que aqui não há uma segunda fórmula: há uma
 * substituição de UM fator dentro da fórmula que já existe.
 *
 * Sobre o máximo: a lei não fixa nenhum. Fixar 40% ou 48% neste ficheiro seria
 * inventar um limite legal — o teto que a aplicação usa é DERIVADO da própria
 * tabela aplicável (`taxaMarginalMaximaTabela`), que é o mais alto que a
 * retenção pode legitimamente alcançar por via das tabelas.
 */
export const RETENCAO_TAXA_OPCIONAL = {
  direito: sv(
    "os titulares dos rendimentos das categorias A, B e H podem optar pela retenção do IRS mediante taxa inteira superior à que lhes é legalmente aplicável, em declaração a apresentar à entidade pagadora dos rendimentos",
    "Art. 98.º, n.º 6 CIRS",
    "art98cirs",
    DATA_LAST_REVIEW
  ),
  efeitoNoCalculo: sv(
    "altera-se apenas o valor da taxa marginal máxima que seria aplicável, mantendo-se inalterada a parcela a abater e, se aplicável, a parcela adicional a abater por dependente",
    "Despacho n.º 233-A/2026, n.º 5, al. e)",
    "despachoRetencao2026",
    DATA_LAST_REVIEW
  ),
  /** «Taxa INTEIRA»: a opção é por pontos percentuais inteiros, não por décimas. */
  passoEmPontos: sv(
    1,
    "Art. 98.º, n.º 6 CIRS — a opção é por «taxa inteira», isto é, em pontos percentuais inteiros",
    "art98cirs",
    DATA_LAST_REVIEW
  ),
};

/**
 * Taxa marginal máxima de uma tabela de retenção — o teto que a opção do n.º 6
 * do Art. 98.º pode alcançar nesta aplicação. Derivado da tabela, não fixado à
 * mão: quando as tabelas mudarem, o teto acompanha-as sozinho.
 */
export function taxaMarginalMaximaTabela(escaloes: readonly EscalaoRetencao[]): number {
  return escaloes.reduce((maior, escalao) => Math.max(maior, escalao.taxa), 0);
}

/**
 * Normaliza a taxa opcional comunicada à entidade: pontos percentuais INTEIROS,
 * nunca abaixo da taxa que a tabela já aplicaria (nesse caso não há opção
 * nenhuma — a taxa legal prevalece) e nunca acima do topo da tabela.
 *
 * Devolve `undefined` quando não há opção a aplicar, para que o motor siga o
 * caminho normal em vez de receber um valor igual ao legal e ter de o descobrir.
 */
export function taxaRetencaoOpcionalValida(
  taxaEscolhida: number | undefined,
  taxaLegal: number,
  escaloes: readonly EscalaoRetencao[]
): number | undefined {
  if (taxaEscolhida === undefined || !Number.isFinite(taxaEscolhida)) return undefined;
  const passo = RETENCAO_TAXA_OPCIONAL.passoEmPontos.value / 100;
  const inteira = Math.round(taxaEscolhida / passo) * passo;
  const teto = taxaMarginalMaximaTabela(escaloes);
  const limitada = Math.min(teto, inteira);
  return limitada > taxaLegal ? Math.round(limitada * 10000) / 10000 : undefined;
}

/**
 * Parcela ACRESCIDA à parcela a abater por cada dependente com grau de
 * incapacidade permanente ≥ 60% (Despacho 233-A/2026, n.º 5, al. a). Os mesmos
 * valores constam do Despacho n.º 19/2026 (Madeira) e do n.º 1179/2026 (Açores).
 *
 * O n.º 6 permite multiplicar esta parcela até três vezes (não casado ou casado
 * único titular) ou até seis vezes (casado, dois titulares); o n.º 7 exige que o
 * sujeito passivo COMUNIQUE o fator pretendido à entidade devedora antes do
 * pagamento — por isso o fator é uma escolha do utilizador, com 1 por omissão, e
 * não algo que se possa presumir.
 */
export const RETENCAO_DEP_DEFICIENTE = sv(
  {
    naoCasadoOuUnico: 84.82,
    casadoDois: 42.41,
    fatorMaxNaoCasadoOuUnico: 3,
    fatorMaxCasadoDois: 6,
  },
  "Despacho n.º 233-A/2026, n.ºs 5 al. a), 6 e 7 — parcela por dependente com incapacidade ≥ 60% e fator de multiplicação comunicável",
  "despachoRetencao2026",
  REV_RETENCAO_INCAPACIDADE
);

/**
 * Parcela acrescida à parcela a abater quando, na situação «casado, único
 * titular», o cônjuge ou unido de facto não aufere rendimentos das categorias A
 * ou H e tem grau de incapacidade permanente ≥ 60% (Despacho 233-A/2026, n.º 5,
 * al. b). Não existe equivalente nas restantes situações familiares.
 */
export const RETENCAO_CONJUGE_DEFICIENTE = sv(
  135.71,
  "Despacho n.º 233-A/2026, n.º 5, al. b) — cônjuge/unido de facto sem rendimentos das cat. A ou H e com incapacidade ≥ 60%",
  "despachoRetencao2026",
  REV_RETENCAO_INCAPACIDADE
);

/**
 * Fração do rendimento englobado do agregado a partir da qual as tabelas
 * «casado, único titular» são aplicáveis havendo dois titulares com rendimentos
 * (Despacho 233-A/2026, n.º 9). Abaixo dela, a tabela correta é a de dois
 * titulares — a fórmula pode estar certa e ser a tabela errada.
 */
export const RETENCAO_UNICO_TITULAR_FRACAO = sv(
  0.95,
  "Despacho n.º 233-A/2026, n.º 9 — tabelas de «casado, único titular» só quando o outro titular não aufere rendimentos englobáveis ou um deles tem ≥ 95% do rendimento englobado",
  "despachoRetencao2026",
  REV_RETENCAO_INCAPACIDADE
);

/** Incapacidade do agregado que acresce à parcela a abater da retenção mensal. */
export interface IncapacidadeFamiliarRet {
  /** Dependentes com grau de incapacidade permanente ≥ 60%. */
  dependentesDeficientes?: number;
  /** Fator de multiplicação comunicado à entidade devedora (n.ºs 6 e 7). */
  fatorDependenteDeficiente?: number;
  /** Cônjuge/unido de facto sem rendimentos cat. A/H e com incapacidade ≥ 60%. */
  conjugeDeficiente?: boolean;
}

/** Fator máximo de multiplicação da parcela por dependente com incapacidade. */
export function fatorMaximoDependenteDeficiente(estadoCivil: EstadoCivilRet): number {
  return estadoCivil === "casadoDois"
    ? RETENCAO_DEP_DEFICIENTE.value.fatorMaxCasadoDois
    : RETENCAO_DEP_DEFICIENTE.value.fatorMaxNaoCasadoOuUnico;
}

/**
 * Valor total a ACRESCER à parcela a abater por incapacidade de dependentes e do
 * cônjuge (Despacho 233-A/2026, n.º 5, al. a) e b), com o fator do n.º 6).
 *
 * Devolve zero quando não há incapacidade declarada, pelo que pode ser somado
 * incondicionalmente à parcela a abater de qualquer tabela.
 */
export function parcelaIncapacidadeFamiliar(
  estadoCivil: EstadoCivilRet,
  incapacidade: IncapacidadeFamiliarRet = {}
): number {
  const deps = Math.max(0, Math.floor(incapacidade.dependentesDeficientes ?? 0));
  const porDependente =
    estadoCivil === "casadoDois"
      ? RETENCAO_DEP_DEFICIENTE.value.casadoDois
      : RETENCAO_DEP_DEFICIENTE.value.naoCasadoOuUnico;
  const fator = Math.min(
    fatorMaximoDependenteDeficiente(estadoCivil),
    Math.max(1, Math.floor(incapacidade.fatorDependenteDeficiente ?? 1))
  );
  // Al. b) é exclusiva de «casado, único titular»: aplicá-la noutra situação
  // familiar seria inventar uma dedução que a tabela dessa pessoa não prevê.
  const conjuge =
    incapacidade.conjugeDeficiente && estadoCivil === "casadoUnico"
      ? RETENCAO_CONJUGE_DEFICIENTE.value
      : 0;
  return Math.round((deps * porDependente * fator + conjuge) * 100) / 100;
}

/**
 * Escalão de uma tabela de retenção na fonte. A `parcelaAbater`:
 *  · `number` → valor fixo em euros;
 *  · `{ coef, base }` → fórmula do mínimo de existência: `taxa × coef × (base − R)`.
 */
export type EscalaoRetencao = {
  /** Limite superior da remuneração mensal (Infinity no último escalão). */
  ate: number;
  /** Taxa marginal máxima. */
  taxa: number;
  parcelaAbater: number | { coef: number; base: number };
};

/**
 * Tabela I de retenção na fonte — Continente 2026, Não casado / Casado dois
 * titulares. Fonte: Despacho 233-A/2026. Valores cross-verificados em duas
 * referências independentes (Montepio + CRN Contabilidade). O Excel oficial
 * da AT não foi diferenciado por máquina (REST anónimo do SharePoint indisp.).
 */
export const RETENCAO_DEP_CONTINENTE_T1 = sv<EscalaoRetencao[]>(
  [
    { ate: 920, taxa: 0, parcelaAbater: 0 },
    { ate: 1042, taxa: 0.125, parcelaAbater: { coef: 2.6, base: 1273.85 } },
    { ate: 1108, taxa: 0.157, parcelaAbater: { coef: 1.35, base: 1554.83 } },
    { ate: 1154, taxa: 0.157, parcelaAbater: 94.71 },
    { ate: 1212, taxa: 0.212, parcelaAbater: 158.18 },
    { ate: 1819, taxa: 0.241, parcelaAbater: 193.33 },
    { ate: 2119, taxa: 0.311, parcelaAbater: 320.66 },
    { ate: 2499, taxa: 0.349, parcelaAbater: 401.19 },
    { ate: 3305, taxa: 0.3836, parcelaAbater: 487.66 },
    { ate: 5547, taxa: 0.3969, parcelaAbater: 531.62 },
    { ate: 20221, taxa: 0.4495, parcelaAbater: 823.40 },
    { ate: Infinity, taxa: 0.4717, parcelaAbater: 1272.31 },
  ],
  "Despacho n.º 233-A/2026 — Tabela I, Continente (trabalho dependente)",
  "despachoRetencao2026",
  DEP_TODAY,
  "Transcrito do Despacho oficial (Diário da República). Parcela do escalão 20 221 € corrigida para 823,40 (a taxa efetiva 40,9% confirma)."
);

/**
 * Tabelas de retenção na fonte do trabalho dependente — Continente 2026.
 * Transcritas do Despacho n.º 233-A/2026 (DR). Cada tabela traz os seus
 * escalões e a parcela adicional a abater por dependente:
 *   I   — não casado sem dependentes ou casado dois titulares (21,43)
 *   II  — não casado com um ou mais dependentes (34,29)
 *   III — casado, único titular (42,86)
 *   IV  — não casado/casado dois titulares sem dependentes, deficiência (0)
 *   V   — não casado com dependentes, deficiência (42,86)
 *   VI  — casado dois titulares com dependentes, deficiência (21,43)
 *   VII — casado único titular, deficiência (42,86)
 */
export interface TabelaRetencaoDep {
  escaloes: EscalaoRetencao[];
  /** Parcela adicional a abater por dependente (€). */
  parcelaDependente: number;
}

export type EstadoCivilRet = "naoCasado" | "casadoDois" | "casadoUnico";

const ESC_T2: EscalaoRetencao[] = RETENCAO_DEP_CONTINENTE_T1.value; // II = I com outra parcela/dep

export const RETENCAO_DEP_TABELAS = sv<Record<"i" | "ii" | "iii" | "iv" | "v" | "vi" | "vii", TabelaRetencaoDep>>(
  {
    i: { parcelaDependente: 21.43, escaloes: RETENCAO_DEP_CONTINENTE_T1.value },
    ii: { parcelaDependente: 34.29, escaloes: ESC_T2 },
    iii: {
      parcelaDependente: 42.86,
      escaloes: [
        { ate: 991, taxa: 0, parcelaAbater: 0 },
        { ate: 1042, taxa: 0.125, parcelaAbater: { coef: 2.6, base: 1372.15 } },
        { ate: 1108, taxa: 0.125, parcelaAbater: { coef: 1.35, base: 1677.85 } },
        { ate: 1119, taxa: 0.125, parcelaAbater: 96.17 },
        { ate: 1432, taxa: 0.1272, parcelaAbater: 98.64 },
        { ate: 1962, taxa: 0.157, parcelaAbater: 141.32 },
        { ate: 2240, taxa: 0.1938, parcelaAbater: 213.53 },
        { ate: 2773, taxa: 0.2277, parcelaAbater: 289.47 },
        { ate: 3389, taxa: 0.257, parcelaAbater: 370.72 },
        { ate: 5965, taxa: 0.2881, parcelaAbater: 476.12 },
        { ate: 20265, taxa: 0.3843, parcelaAbater: 1049.96 },
        { ate: Infinity, taxa: 0.4717, parcelaAbater: 2821.13 },
      ],
    },
    iv: {
      parcelaDependente: 0,
      escaloes: [
        { ate: 1694, taxa: 0, parcelaAbater: 0 },
        { ate: 2063, taxa: 0.212, parcelaAbater: 359.13 },
        { ate: 2492, taxa: 0.311, parcelaAbater: 563.37 },
        { ate: 4487, taxa: 0.349, parcelaAbater: 658.07 },
        { ate: 4753, taxa: 0.3836, parcelaAbater: 813.33 },
        { ate: 6687, taxa: 0.3969, parcelaAbater: 876.55 },
        { ate: 20468, taxa: 0.4495, parcelaAbater: 1228.29 },
        { ate: Infinity, taxa: 0.4717, parcelaAbater: 1682.68 },
      ],
    },
    v: {
      parcelaDependente: 42.86,
      escaloes: [
        { ate: 1938, taxa: 0, parcelaAbater: 0 },
        { ate: 2063, taxa: 0.2132, parcelaAbater: 413.19 },
        { ate: 2854, taxa: 0.311, parcelaAbater: 614.96 },
        { ate: 4504, taxa: 0.349, parcelaAbater: 723.42 },
        { ate: 6826, taxa: 0.3836, parcelaAbater: 879.26 },
        { ate: 7048, taxa: 0.3969, parcelaAbater: 970.05 },
        { ate: 20468, taxa: 0.4495, parcelaAbater: 1340.78 },
        { ate: Infinity, taxa: 0.4717, parcelaAbater: 1795.17 },
      ],
    },
    vi: {
      parcelaDependente: 21.43,
      escaloes: [
        { ate: 1668, taxa: 0, parcelaAbater: 0 },
        { ate: 2068, taxa: 0.2049, parcelaAbater: 341.78 },
        { ate: 2497, taxa: 0.241, parcelaAbater: 416.44 },
        { ate: 3107, taxa: 0.311, parcelaAbater: 591.23 },
        { ate: 4504, taxa: 0.349, parcelaAbater: 709.30 },
        { ate: 6826, taxa: 0.3836, parcelaAbater: 865.14 },
        { ate: 7048, taxa: 0.3969, parcelaAbater: 955.93 },
        { ate: 20468, taxa: 0.4495, parcelaAbater: 1326.66 },
        { ate: Infinity, taxa: 0.4717, parcelaAbater: 1781.05 },
      ],
    },
    vii: {
      parcelaDependente: 42.86,
      escaloes: [
        { ate: 2325, taxa: 0, parcelaAbater: 0 },
        { ate: 3494, taxa: 0.2277, parcelaAbater: 529.41 },
        { ate: 3761, taxa: 0.257, parcelaAbater: 631.79 },
        { ate: 6687, taxa: 0.2881, parcelaAbater: 748.76 },
        { ate: 20468, taxa: 0.4244, parcelaAbater: 1660.20 },
        { ate: Infinity, taxa: 0.4717, parcelaAbater: 2628.34 },
      ],
    },
  },
  "Despacho n.º 233-A/2026 — Tabelas I-VII, Continente (trabalho dependente)",
  "despachoRetencao2026",
  DEP_TODAY,
  "Transcritas integralmente do Despacho oficial publicado em Diário da República."
);

// ── Região Autónoma da Madeira — Despacho n.º 19/2026 (JORAM, 20-01-2026),
//    RETIFICADO pela Declaração de Retificação n.º 10/2026 (JORAM, 23-01-2026) ──
// Tabela II = Tabela I com parcela adicional por dependente de 34,29 €.
//
// A primeira publicação saiu com inexatidões nas Tabelas I e II e foi objeto de
// republicação integral três dias depois. As cinco últimas linhas abaixo são as
// da versão RETIFICADA: a versão inicial dava 23,70%/283,91 e 30,28%/521,72 nos
// escalões de 3 614 € e 6 585 €, e abatimentos mais baixos daí para cima —
// numa remuneração de 7 000 € isso retinha 59,61 €/mês a mais do que a lei manda.
const ESC_MADEIRA_I: EscalaoRetencao[] = [
  { ate: 980, taxa: 0, parcelaAbater: 0 },
  { ate: 1028, taxa: 0.0872, parcelaAbater: { coef: 2.6, base: 1356.92 } },
  { ate: 1099, taxa: 0.1204, parcelaAbater: { coef: 1.35, base: 1696.78 } },
  { ate: 1201, taxa: 0.1204, parcelaAbater: 97.17 },
  { ate: 1623, taxa: 0.1763, parcelaAbater: 164.31 },
  { ate: 2332, taxa: 0.223, parcelaAbater: 240.11 },
  { ate: 3203, taxa: 0.2242, parcelaAbater: 242.91 },
  { ate: 3614, taxa: 0.2727, parcelaAbater: 398.26 },
  { ate: 6585, taxa: 0.2778, parcelaAbater: 416.7 },
  { ate: 6954, taxa: 0.2802, parcelaAbater: 432.51 },
  { ate: 21411, taxa: 0.2924, parcelaAbater: 517.35 },
  { ate: Infinity, taxa: 0.3278, parcelaAbater: 1275.3 },
];
export const RETENCAO_DEP_MADEIRA = sv<Record<"i" | "ii" | "iii" | "iv" | "v" | "vi" | "vii", TabelaRetencaoDep>>(
  {
    i: { parcelaDependente: 21.43, escaloes: ESC_MADEIRA_I },
    ii: { parcelaDependente: 34.29, escaloes: ESC_MADEIRA_I },
    iii: {
      parcelaDependente: 42.86,
      escaloes: [
        { ate: 997, taxa: 0, parcelaAbater: 0 },
        { ate: 1099, taxa: 0.0872, parcelaAbater: { coef: 1.35, base: 1819.64 } },
        { ate: 1141, taxa: 0.0872, parcelaAbater: 84.84 },
        { ate: 1857, taxa: 0.1033, parcelaAbater: 103.22 },
        { ate: 2485, taxa: 0.1091, parcelaAbater: 114.0 },
        { ate: 3331, taxa: 0.1236, parcelaAbater: 150.04 },
        { ate: 3895, taxa: 0.1404, parcelaAbater: 206.01 },
        { ate: 6673, taxa: 0.1595, parcelaAbater: 280.41 },
        { ate: 6878, taxa: 0.2213, parcelaAbater: 692.81 },
        { ate: 21411, taxa: 0.2493, parcelaAbater: 885.4 },
        { ate: Infinity, taxa: 0.3278, parcelaAbater: 2566.17 },
      ],
    },
    iv: {
      parcelaDependente: 0,
      escaloes: [
        { ate: 2053, taxa: 0, parcelaAbater: 0 },
        { ate: 2591, taxa: 0.149, parcelaAbater: 305.9 },
        { ate: 3622, taxa: 0.1863, parcelaAbater: 402.55 },
        { ate: 4668, taxa: 0.2289, parcelaAbater: 556.85 },
        { ate: 7066, taxa: 0.2616, parcelaAbater: 709.5 },
        { ate: 7168, taxa: 0.2752, parcelaAbater: 805.6 },
        { ate: 21625, taxa: 0.3058, parcelaAbater: 1024.95 },
        { ate: Infinity, taxa: 0.3278, parcelaAbater: 1500.7 },
      ],
    },
    v: {
      parcelaDependente: 42.86,
      escaloes: [
        { ate: 2345, taxa: 0, parcelaAbater: 0 },
        { ate: 2591, taxa: 0.1382, parcelaAbater: 324.08 },
        { ate: 3622, taxa: 0.1863, parcelaAbater: 448.71 },
        { ate: 4668, taxa: 0.2289, parcelaAbater: 603.01 },
        { ate: 7066, taxa: 0.2616, parcelaAbater: 755.66 },
        { ate: 7168, taxa: 0.2752, parcelaAbater: 851.76 },
        { ate: 21625, taxa: 0.3058, parcelaAbater: 1071.11 },
        { ate: Infinity, taxa: 0.3278, parcelaAbater: 1546.86 },
      ],
    },
    vi: {
      parcelaDependente: 21.43,
      escaloes: [
        { ate: 2019, taxa: 0, parcelaAbater: 0 },
        { ate: 2528, taxa: 0.1566, parcelaAbater: 316.18 },
        { ate: 3049, taxa: 0.1768, parcelaAbater: 367.25 },
        { ate: 4272, taxa: 0.1781, parcelaAbater: 371.22 },
        { ate: 5734, taxa: 0.228, parcelaAbater: 584.4 },
        { ate: 7066, taxa: 0.2595, parcelaAbater: 765.03 },
        { ate: 7550, taxa: 0.2752, parcelaAbater: 875.97 },
        { ate: 21625, taxa: 0.3058, parcelaAbater: 1107.0 },
        { ate: Infinity, taxa: 0.3278, parcelaAbater: 1582.75 },
      ],
    },
    vii: {
      parcelaDependente: 42.86,
      escaloes: [
        { ate: 3061, taxa: 0, parcelaAbater: 0 },
        { ate: 4668, taxa: 0.0883, parcelaAbater: 270.29 },
        { ate: 7066, taxa: 0.1334, parcelaAbater: 480.82 },
        { ate: 7168, taxa: 0.2503, parcelaAbater: 1306.84 },
        { ate: 21625, taxa: 0.281, parcelaAbater: 1526.9 },
        { ate: Infinity, taxa: 0.3278, parcelaAbater: 2538.95 },
      ],
    },
  },
  "Despacho n.º 19/2026 (SRF), retificado pela Declaração de Retificação n.º 10/2026 — Tabelas I-VII, Madeira (trabalho dependente)",
  "madeiraRetencao2026",
  REV_RETENCAO_INCAPACIDADE,
  "Transcritas da republicação integral no Jornal Oficial da RAM, II Série n.º 16, 3.º Suplemento, 23-01-2026. As Tabelas III a VII não foram alteradas pela retificação."
);

// ── Região Autónoma dos Açores — Despacho n.º 1179/2026 (DR, 03-02-2026) ──
const ESC_ACORES_I: EscalaoRetencao[] = [
  { ate: 966, taxa: 0, parcelaAbater: 0 },
  { ate: 1042, taxa: 0.0875, parcelaAbater: { coef: 2.6, base: 1337.54 } },
  { ate: 1108, taxa: 0.1099, parcelaAbater: { coef: 1.35, base: 1652.49 } },
  { ate: 1154, taxa: 0.1099, parcelaAbater: 80.79 },
  { ate: 1212, taxa: 0.1484, parcelaAbater: 125.22 },
  { ate: 1819, taxa: 0.1687, parcelaAbater: 149.83 },
  { ate: 2119, taxa: 0.2177, parcelaAbater: 238.97 },
  { ate: 2499, taxa: 0.2443, parcelaAbater: 295.34 },
  { ate: 3305, taxa: 0.2685, parcelaAbater: 355.82 },
  { ate: 5547, taxa: 0.2779, parcelaAbater: 386.89 },
  { ate: 20221, taxa: 0.3146, parcelaAbater: 590.47 },
  { ate: Infinity, taxa: 0.3302, parcelaAbater: 905.92 },
];
export const RETENCAO_DEP_ACORES = sv<Record<"i" | "ii" | "iii" | "iv" | "v" | "vi" | "vii", TabelaRetencaoDep>>(
  {
    i: { parcelaDependente: 21.43, escaloes: ESC_ACORES_I },
    ii: { parcelaDependente: 34.29, escaloes: ESC_ACORES_I },
    iii: {
      parcelaDependente: 42.86,
      escaloes: [
        { ate: 1226, taxa: 0, parcelaAbater: 0 },
        { ate: 1267, taxa: 0.0728, parcelaAbater: 89.26 },
        { ate: 1602, taxa: 0.0964, parcelaAbater: 119.17 },
        { ate: 1962, taxa: 0.1099, parcelaAbater: 140.8 },
        { ate: 2240, taxa: 0.1357, parcelaAbater: 191.42 },
        { ate: 2900, taxa: 0.1594, parcelaAbater: 244.51 },
        { ate: 3389, taxa: 0.1799, parcelaAbater: 303.96 },
        { ate: 5965, taxa: 0.2017, parcelaAbater: 377.85 },
        { ate: 20265, taxa: 0.271, parcelaAbater: 791.23 },
        { ate: Infinity, taxa: 0.3302, parcelaAbater: 1990.92 },
      ],
    },
    iv: {
      parcelaDependente: 0,
      escaloes: [
        { ate: 2119, taxa: 0, parcelaAbater: 0 },
        { ate: 2492, taxa: 0.2177, parcelaAbater: 464.51 },
        { ate: 2748, taxa: 0.2443, parcelaAbater: 530.8 },
        { ate: 3012, taxa: 0.2685, parcelaAbater: 597.31 },
        { ate: 4883, taxa: 0.2779, parcelaAbater: 625.63 },
        { ate: 20468, taxa: 0.3102, parcelaAbater: 783.36 },
        { ate: Infinity, taxa: 0.3255, parcelaAbater: 1096.53 },
      ],
    },
    v: {
      parcelaDependente: 42.86,
      escaloes: [
        { ate: 2339, taxa: 0, parcelaAbater: 0 },
        { ate: 2488, taxa: 0.2177, parcelaAbater: 511.64 },
        { ate: 3479, taxa: 0.2443, parcelaAbater: 577.83 },
        { ate: 3728, taxa: 0.2685, parcelaAbater: 662.03 },
        { ate: 6687, taxa: 0.2779, parcelaAbater: 697.08 },
        { ate: 20468, taxa: 0.3102, parcelaAbater: 913.08 },
        { ate: Infinity, taxa: 0.3255, parcelaAbater: 1226.25 },
      ],
    },
    vi: {
      parcelaDependente: 21.43,
      escaloes: [
        { ate: 2143, taxa: 0, parcelaAbater: 0 },
        { ate: 2790, taxa: 0.1687, parcelaAbater: 363.67 },
        { ate: 3215, taxa: 0.2177, parcelaAbater: 500.38 },
        { ate: 3479, taxa: 0.2443, parcelaAbater: 585.9 },
        { ate: 5915, taxa: 0.2685, parcelaAbater: 670.1 },
        { ate: 6687, taxa: 0.2779, parcelaAbater: 725.71 },
        { ate: 20468, taxa: 0.3102, parcelaAbater: 941.71 },
        { ate: Infinity, taxa: 0.3255, parcelaAbater: 1254.88 },
      ],
    },
    vii: {
      parcelaDependente: 42.86,
      escaloes: [
        { ate: 2897, taxa: 0, parcelaAbater: 0 },
        { ate: 4503, taxa: 0.1594, parcelaAbater: 461.79 },
        { ate: 6818, taxa: 0.1799, parcelaAbater: 554.11 },
        { ate: 6916, taxa: 0.2017, parcelaAbater: 702.75 },
        { ate: 20468, taxa: 0.2926, parcelaAbater: 1331.42 },
        { ate: Infinity, taxa: 0.3255, parcelaAbater: 2004.82 },
      ],
    },
  },
  "Despacho n.º 1179/2026 — Tabelas I-VII, Açores (trabalho dependente)",
  "acoresRetencao2026",
  DEP_TODAY,
  "Transcritas do Diário da República, 2.ª série n.º 23, 03-02-2026."
);

/** Conjunto de tabelas de retenção do trabalho dependente por região. */
export const RETENCAO_DEP_POR_REGIAO: Record<Regiao, Record<"i" | "ii" | "iii" | "iv" | "v" | "vi" | "vii", TabelaRetencaoDep>> = {
  continente: RETENCAO_DEP_TABELAS.value,
  madeira: RETENCAO_DEP_MADEIRA.value,
  acores: RETENCAO_DEP_ACORES.value,
};

/**
 * Seleciona a tabela de retenção do trabalho dependente conforme a situação
 * familiar e a região (Continente: Despacho 233-A/2026; Madeira: Despacho
 * 19/2026; Açores: Despacho 1179/2026).
 */
export function tabelaRetencaoDependente(
  estadoCivil: EstadoCivilRet,
  dependentes: number,
  deficiencia: boolean,
  regiao: Regiao = "continente"
): TabelaRetencaoDep {
  const t = RETENCAO_DEP_POR_REGIAO[regiao] ?? RETENCAO_DEP_TABELAS.value;
  const temDeps = dependentes >= 1;
  if (!deficiencia) {
    if (estadoCivil === "casadoUnico") return t.iii;
    if (estadoCivil === "casadoDois") return t.i;
    return temDeps ? t.ii : t.i; // não casado
  }
  if (estadoCivil === "casadoUnico") return t.vii;
  if (estadoCivil === "casadoDois") return temDeps ? t.vi : t.iv;
  return temDeps ? t.v : t.iv; // não casado
}

// ═══════════════════════════════════════════════════════════════════════
//  DIREITOS, COBRANÇAS E EXECUÇÃO FISCAL
//  ---------------------------------------------------------------------
//  Números citados pelos Guias da secção «Direitos e cobranças». Estavam
//  escritos à mão no texto de cada guia, contra a regra 1 do projeto: as
//  taxas de juro comerciais mudam TODOS OS SEMESTRES (fixadas por Aviso da
//  Entidade do Tesouro e Finanças em janeiro e julho) e a unidade de conta
//  pode ser atualizada em cada Orçamento do Estado. Escritos no corpo do
//  guia, ficariam desatualizados em silêncio.
// ═══════════════════════════════════════════════════════════════════════

const REV_DIREITOS = "2026-07-29";

/**
 * Unidade de conta processual (UC). Base de vários limiares do CPPT e do
 * Regulamento das Custas Processuais. Mantém-se em 102 € em 2026: o
 * Art. 242.º da Lei 73-A/2025 (OE 2026) suspendeu de novo a atualização.
 */
export const UNIDADE_CONTA = sv(
  102,
  "Unidade de conta processual — Art. 242.º da Lei n.º 73-A/2025 (OE 2026), que manteve o valor de 2025",
  "unidadeContaOE",
  REV_DIREITOS,
  "Usada para traduzir em euros os limiares expressos em UC (ex.: 500 UC do Art. 196.º, n.º 5 CPPT)."
);

/**
 * Taxas supletivas de juros moratórios. As duas primeiras são COMERCIAIS e
 * fixadas semestralmente por Aviso — daí o `effectiveTo`: passado 30 de
 * junho de 2026 o valor deixa de estar em vigor e tem de ser reconfirmado.
 * A distinção entre as duas é subtil e cara: quem cobra uma fatura B2B ao
 * abrigo do DL 62/2013 tem direito à taxa mais alta e aplica quase sempre a
 * mais baixa.
 */
export const JUROS_MORA = {
  transacoesComerciais: sv(
    0.1015,
    "Taxa supletiva de juros moratórios de créditos do § 5.º do Art. 102.º do Código Comercial e do DL 62/2013 (atrasos de pagamento em transações comerciais) — 1.º semestre de 2026",
    "avisoJuros2026",
    REV_DIREITOS,
    "Aviso n.º 822/2026/2, DR n.º 11, de 16-01-2026. Fixada por semestre: reconfirmar em julho de 2026."
  ),
  outrosCreditosComerciais: sv(
    0.0915,
    "Taxa supletiva de juros moratórios de créditos comerciais do § 3.º do Art. 102.º do Código Comercial — 1.º semestre de 2026",
    "avisoJuros2026",
    REV_DIREITOS,
    "Mesmo Aviso. Aplica-se aos créditos comerciais fora do âmbito do DL 62/2013."
  ),
  civis: sv(
    0.04,
    "Taxa de juros legais e de juros de mora de obrigações civis — Portaria n.º 291/2003",
    "portaria291_2003",
    REV_DIREITOS,
    "Também é a taxa dos juros indemnizatórios devidos pela AT ao contribuinte (Art. 43.º LGT)."
  ),
  /** Semestre a que as taxas comerciais acima dizem respeito. */
  vigenciaComercialAte: "2026-06-30",
};

/** Indemnização mínima por custos de cobrança (Art. 8.º, n.º 1 DL 62/2013). */
export const INDEMNIZACAO_CUSTOS_COBRANCA = sv(
  40,
  "Art. 8.º, n.º 1 do DL 62/2013 — montante mínimo de indemnização pelos custos de cobrança, sem necessidade de interpelação",
  "avisoJuros2026",
  REV_DIREITOS,
  "Valor fixo no diploma, não indexado."
);

/** Prazo supletivo de pagamento nas transações comerciais (Art. 4.º, n.º 3 DL 62/2013). */
export const PRAZO_PAGAMENTO_SUPLETIVO_DIAS = sv(
  30,
  "Art. 4.º, n.º 3 do DL 62/2013 — prazo supletivo de pagamento na falta de estipulação contratual",
  "avisoJuros2026",
  REV_DIREITOS,
  "O Art. 5.º fixa o mesmo prazo com entidades públicas; o que muda é a margem de estipulação, não a duração."
);

/** Pagamento em prestações de dívidas fiscais (Art. 196.º e 198.º-A CPPT). */
export const PLANO_PRESTACOES = {
  maximoGeral: sv(
    36,
    "Art. 196.º, n.º 5 CPPT — limite geral de prestações mensais mediante demonstração da situação económica",
    "cppt198a",
    REV_DIREITOS
  ),
  alargamentoAnos: sv(
    5,
    "Art. 196.º, n.º 6 CPPT — alargamento até cinco anos em caso de notória dificuldade financeira",
    "cppt198a",
    REV_DIREITOS
  ),
  alargamentoLimiarUC: sv(
    500,
    "Art. 196.º, n.º 6 CPPT — o alargamento exige dívida superior a 500 unidades de conta",
    "cppt198a",
    REV_DIREITOS
  ),
  /** Limiares do plano OFICIOSO (automático, sem garantia) do Art. 198.º-A. */
  automaticoSingulares: sv(
    5000,
    "Art. 198.º-A CPPT — plano oficioso de pagamento em prestações para dívidas até 5 000 € de pessoas singulares",
    "cppt198a",
    REV_DIREITOS,
    "Criado pela AT sem pedido nem garantia, e disponibilizado na área reservada do Portal das Finanças."
  ),
  automaticoColetivas: sv(
    10000,
    "Art. 198.º-A CPPT — plano oficioso de pagamento em prestações para dívidas até 10 000 € de pessoas coletivas",
    "cppt198a",
    REV_DIREITOS
  ),
};

/** Limites da penhora de rendimentos do trabalho (Art. 738.º CPC). */
export const PENHORA = {
  fracaoImpenhoravel: sv(
    2 / 3,
    "Art. 738.º, n.º 1 CPC — são impenhoráveis dois terços da parte líquida dos vencimentos, salários e pensões",
    "cpc738dr",
    REV_DIREITOS
  ),
  tetoSalariosMinimos: sv(
    3,
    "Art. 738.º, n.º 3 CPC — a impenhorabilidade tem como limite máximo o equivalente a três salários mínimos nacionais",
    "cpc738dr",
    REV_DIREITOS
  ),
  pisoSalariosMinimos: sv(
    1,
    "Art. 738.º, n.º 3 CPC — não tendo o executado outro rendimento, o limite mínimo é um salário mínimo nacional",
    "cpc738dr",
    REV_DIREITOS
  ),
  contaBancariaSalariosMinimos: sv(
    1,
    "Art. 738.º, n.º 6 CPC — é impenhorável o saldo bancário correspondente a um salário mínimo nacional",
    "cpc738dr",
    REV_DIREITOS,
    "É a penhora mais frequente na execução fiscal e a que acontece sem aviso prévio."
  ),
};

// Valores derivados dos limites da penhora (nunca digitados) ─────────────
export const PENHORA_TETO_CALC = PENHORA.tetoSalariosMinimos.value * SMN.value; // 2 760 €
export const PENHORA_PISO_CALC = PENHORA.pisoSalariosMinimos.value * SMN.value; // 920 €
export const PRESTACOES_ALARGAMENTO_LIMIAR_EUR =
  PLANO_PRESTACOES.alargamentoLimiarUC.value * UNIDADE_CONTA.value; // 51 000 €

// ═══════════════════════════════════════════════════════════════════════
//  PROTEÇÃO SOCIAL E CESSAÇÃO DO CONTRATO (Categoria A)
//  ---------------------------------------------------------------------
//  Baixa médica, parentalidade, desemprego e contas finais do contrato.
//  Alimentam os guias novos de «Trabalho por conta de outrem» e os motores
//  de `fiscal-dependente.ts`.
// ═══════════════════════════════════════════════════════════════════════

const REV_PROTECAO = "2026-07-29";

/** Subsídio de doença (DL 28/2004). */
export const SUBSIDIO_DOENCA = {
  periodoEsperaDias: sv(
    3,
    "DL 28/2004 — período de espera de 3 dias para trabalhadores por conta de outrem (não aplicável em internamento hospitalar, tuberculose ou doença profissional)",
    "ssDoenca",
    REV_PROTECAO
  ),
  prazoGarantiaMeses: sv(
    6,
    "DL 28/2004 — prazo de garantia de seis meses com registo de remunerações, seguidos ou interpolados",
    "ssDoenca",
    REV_PROTECAO
  ),
  /** Percentagem da remuneração de referência, por duração da incapacidade. */
  escaloes: sv(
    [
      { ateDias: 30, taxa: 0.55 },
      { ateDias: 90, taxa: 0.6 },
      { ateDias: 365, taxa: 0.7 },
      { ateDias: Infinity, taxa: 0.75 },
    ] as { ateDias: number; taxa: number }[],
    "DL 28/2004 — 55% até 30 dias, 60% de 31 a 90, 70% de 91 a 365 e 75% acima de 365 dias da remuneração de referência",
    "ssDoenca",
    REV_PROTECAO,
    "Há uma majoração de 5 p.p. sobre os escalões de 55% e 60% quando a remuneração de referência não excede 500 € ou o agregado tem três ou mais descendentes — modelada em `MAJORACAO_DOENCA`."
  ),
  majoracao: sv(
    0.05,
    "DL 28/2004 — majoração de 5 pontos percentuais nos escalões de 55% e 60% para remunerações de referência baixas ou agregados com três ou mais descendentes",
    "ssDoenca",
    REV_PROTECAO
  ),
  majoracaoRemuneracaoLimite: sv(
    500,
    "DL 28/2004 — limite da remuneração de referência para a majoração de 5 p.p.",
    "ssDoenca",
    REV_PROTECAO
  ),
};

/** Licença parental inicial e licença exclusiva do pai (Código do Trabalho + DL 91/2009). */
export const LICENCA_PARENTAL = {
  modalidades: sv(
    [
      { dias: 120, taxa: 1.0, partilhada: false },
      { dias: 150, taxa: 0.8, partilhada: false },
      { dias: 150, taxa: 1.0, partilhada: true },
      { dias: 180, taxa: 0.83, partilhada: true },
    ] as { dias: number; taxa: number; partilhada: boolean }[],
    "Licença parental inicial — 120 dias a 100%, 150 dias a 80% sem partilha, 120+30 partilhados a 100% e 180 dias (150+30) a 83% com partilha",
    "ssParentalidade",
    REV_PROTECAO,
    "A partilha exige que cada progenitor goze em exclusivo pelo menos 30 dias seguidos ou dois períodos de 15."
  ),
  partilhaDiasExclusivos: sv(
    30,
    "Condição da partilha — cada progenitor goza em exclusivo pelo menos 30 dias seguidos, ou dois períodos de 15 dias",
    "ssParentalidade",
    REV_PROTECAO
  ),
  paiObrigatoriaDias: sv(
    28,
    "Licença parental exclusiva do pai — 28 dias obrigatórios, gozados nos 42 dias seguintes ao nascimento",
    "ssParentalidade",
    REV_PROTECAO
  ),
  paiOpcionaisDias: sv(
    7,
    "Licença parental exclusiva do pai — 7 dias opcionais, gozáveis durante a licença parental inicial da mãe",
    "ssParentalidade",
    REV_PROTECAO
  ),
  paiTaxa: sv(
    1.0,
    "A licença exclusiva do pai é paga a 100% da remuneração de referência, qualquer que seja a modalidade escolhida para a licença inicial",
    "ssParentalidade",
    REV_PROTECAO
  ),
};

/** Subsídio de desemprego (DL 220/2006). */
export const SUBSIDIO_DESEMPREGO = {
  prazoGarantiaDias: sv(
    360,
    "DL 220/2006 — prazo de garantia de 360 dias com registo de remunerações nos 24 meses anteriores à data do desemprego",
    "ssDesemprego",
    REV_PROTECAO
  ),
  taxa: sv(
    0.65,
    "DL 220/2006 — o montante diário corresponde a 65% da remuneração de referência",
    "ssDesemprego",
    REV_PROTECAO
  ),
  minimoIAS: sv(
    1,
    "DL 220/2006 — limite mínimo do montante mensal: 1 × IAS (salvo se a remuneração de referência for inferior, caso em que o montante é igual a esta)",
    "ssDesemprego",
    REV_PROTECAO,
    "Fontes secundárias divergem sobre a leitura deste limite mínimo; sinalizado para revisão fiscal humana."
  ),
  minimoMajoradoIAS: sv(
    1.15,
    "DL 220/2006 — limite mínimo majorado de 1,15 × IAS quando as remunerações registadas não foram inferiores à retribuição mínima mensal garantida",
    "ssDesemprego",
    REV_PROTECAO,
    "Sinalizado para revisão fiscal humana (ver nota de `minimoIAS`)."
  ),
  maximoIAS: sv(
    2.5,
    "DL 220/2006 — limite máximo do montante mensal: 2,5 × IAS",
    "ssDesemprego",
    REV_PROTECAO
  ),
  tetoReferenciaLiquida: sv(
    0.75,
    "DL 220/2006 — o montante mensal não pode exceder 75% da remuneração de referência líquida de contribuições e IRS",
    "ssDesemprego",
    REV_PROTECAO
  ),
  duracaoMinimaDias: sv(
    150,
    "DL 220/2006 — duração mínima do período de concessão",
    "ssDesemprego",
    REV_PROTECAO
  ),
  duracaoMaximaDias: sv(
    540,
    "DL 220/2006 — duração máxima do período de concessão, conforme a idade e a carreira contributiva",
    "ssDesemprego",
    REV_PROTECAO
  ),
};

/** Compensação por cessação do contrato de trabalho (Art. 366.º CT). */
export const COMPENSACAO_CESSACAO = {
  diasPorAno: sv(
    12,
    "Art. 366.º, n.º 1 CT — 12 dias de retribuição base e diuturnidades por cada ano completo de antiguidade (contratos celebrados a partir de 01-10-2013)",
    "ct",
    REV_PROTECAO
  ),
  tetoBaseRMMG: sv(
    20,
    "Art. 366.º, n.º 2, al. a) CT — a retribuição base e diuturnidades a considerar não pode exceder 20 × RMMG",
    "ct",
    REV_PROTECAO
  ),
  tetoTotalMeses: sv(
    12,
    "Art. 366.º, n.º 2, al. b) CT — o montante global da compensação não pode exceder 12 meses de retribuição base e diuturnidades",
    "ct",
    REV_PROTECAO
  ),
  tetoTotalRMMG: sv(
    240,
    "Art. 366.º, n.º 2, al. b) CT — nem exceder 240 × RMMG",
    "ct",
    REV_PROTECAO
  ),
  /** Tranches dos regimes transitórios, por data de admissão. */
  transitorios: sv(
    [
      { ate: "2012-10-31", diasPorAno: 30, rotulo: "um mês por ano até 31-10-2012" },
      { ate: "2013-09-30", diasPorAno: 20, rotulo: "20 dias por ano até 30-09-2013" },
      { ate: null, diasPorAno: 12, rotulo: "12 dias por ano a partir de 01-10-2013" },
    ] as { ate: string | null; diasPorAno: number; rotulo: string }[],
    "Regimes transitórios da compensação (Lei 23/2012 e Lei 69/2013) — quem foi admitido antes de 01-11-2011 acumula tranches com contagens diferentes",
    "ct",
    REV_PROTECAO,
    "É a razão pela qual dois colegas com a mesma antiguidade recebem valores muito diferentes."
  ),
};

/** Férias (Art. 238.º e seguintes do Código do Trabalho). */
export const FERIAS = {
  diasUteisAno: sv(
    22,
    "Art. 238.º, n.º 1 CT — o período anual de férias tem a duração mínima de 22 dias úteis",
    "ct",
    REV_PROTECAO
  ),
  anoAdmissaoDiasPorMes: sv(
    2,
    "Art. 239.º, n.º 1 CT — no ano de admissão, dois dias úteis de férias por cada mês de duração do contrato",
    "ct",
    REV_PROTECAO
  ),
  anoAdmissaoMaximo: sv(
    20,
    "Art. 239.º, n.º 1 CT — no ano de admissão as férias têm o máximo de 20 dias úteis, gozáveis após seis meses completos de execução do contrato",
    "ct",
    REV_PROTECAO
  ),
  indemnizacaoNaoGozadasFator: sv(
    3,
    "Art. 246.º, n.º 1 CT — as férias não gozadas por culpa do empregador dão direito ao triplo da retribuição correspondente",
    "ct",
    REV_PROTECAO,
    "Direito real, frequentemente violado e raramente reclamado — mesmo perfil dos 40 € do DL 62/2013."
  ),
};

/** Trabalho noturno (Art. 223.º e 266.º CT). */
export const TRABALHO_NOTURNO = {
  horaInicio: sv(
    22,
    "Art. 223.º, n.º 1 CT — o período de trabalho noturno compreende, em regra, o intervalo entre as 22 horas e as 7 horas do dia seguinte",
    "ct",
    REV_PROTECAO,
    "O IRCT pode fixar outro intervalo, dentro dos limites legais."
  ),
  horaFim: sv(
    7,
    "Art. 223.º, n.º 1 CT — fim do período de trabalho noturno",
    "ct",
    REV_PROTECAO
  ),
  acrescimo: sv(
    0.25,
    "Art. 266.º, n.º 1 CT — o trabalho noturno é pago com acréscimo de 25% relativamente ao pagamento de trabalho equivalente prestado durante o dia",
    "ct",
    REV_PROTECAO
  ),
};

/**
 * Seguro de acidentes de trabalho — obrigatório desde o primeiro dia, sem
 * exceção (Art. 79.º da Lei 98/2009). O prémio depende da atividade e da
 * seguradora; guarda-se uma ESTIMATIVA de ordem de grandeza para o custo
 * total do posto de trabalho, sempre rotulada como tal na interface.
 */
export const SEGURO_ACIDENTES_TRABALHO_ESTIMATIVA = sv(
  0.01,
  "Seguro de acidentes de trabalho — obrigatório (Art. 79.º da Lei 98/2009). Estimativa de 1% da massa salarial para efeitos de custo total do posto de trabalho",
  "seguroAcidentesTrabalho",
  REV_PROTECAO,
  "ESTIMATIVA, não um parâmetro legal: o prémio real varia com a atividade, a sinistralidade e a seguradora."
);

/**
 * Membros de órgãos estatutários (MOE) que exercem gerência. A base de
 * incidência tem por limite mínimo o valor do IAS mesmo com remuneração
 * declarada de zero — é o custo que quase toda a gente esquece ao dizer
 * «não me pago nada».
 */
export const SS_MOE = {
  trabalhador: sv(
    0.11,
    "Código Contributivo — taxa contributiva do membro de órgão estatutário que exerce funções de gerência",
    "codContributivo",
    REV_PROTECAO
  ),
  entidade: sv(
    0.2375,
    "Código Contributivo — taxa contributiva da entidade sobre a remuneração do membro de órgão estatutário com funções de gerência",
    "codContributivo",
    REV_PROTECAO
  ),
  /**
   * Base de incidência mínima dos MOE, em múltiplos do IAS.
   *
   * O valor em euros vive em `MOE_BASE_MINIMA_MENSAL` (= 1 × IAS), que já
   * existia e traz a ressalva importante: não se aplica em acumulação com
   * outra atividade com base contributiva ≥ 1 IAS, nem a pensionistas. Aqui
   * guarda-se só o múltiplo, para os guias poderem citar a regra sem
   * duplicarem o valor.
   */
  baseMinimaIAS: sv(
    MOE_BASE_MINIMA_MENSAL.value / IAS.value,
    "Art. 55.º Código Contributivo — a base de incidência dos membros de órgãos estatutários tem por limite mínimo o valor do IAS",
    "codContributivo",
    REV_PROTECAO
  ),
};

// ═══════════════════════════════════════════════════════════════════════
//  OBRIGAÇÕES ANUAIS DA SOCIEDADE (IRC)
// ═══════════════════════════════════════════════════════════════════════

/** Pagamentos por conta de IRC (Art. 104.º, 105.º e 107.º CIRC). */
export const PAGAMENTOS_CONTA_IRC = {
  numero: sv(3, "Art. 104.º CIRC — três pagamentos por conta", "ircObrigacoes", REV_PROTECAO),
  meses: sv(
    [7, 9, 12] as number[],
    "Art. 104.º CIRC — vencimento em julho, setembro e até 15 de dezembro do próprio período de tributação",
    "ircObrigacoes",
    REV_PROTECAO
  ),
  taxaAte500k: sv(
    0.8,
    "Art. 105.º CIRC — 80% da coleta do período anterior líquida de retenções, quando o volume de negócios não excedeu 500 000 €",
    "ircObrigacoes",
    REV_PROTECAO
  ),
  taxaAcima500k: sv(
    0.95,
    "Art. 105.º CIRC — 95% da coleta do período anterior líquida de retenções, quando o volume de negócios excedeu 500 000 €",
    "ircObrigacoes",
    REV_PROTECAO
  ),
  limiteVolumeNegocios: sv(
    500000,
    "Art. 105.º CIRC — limiar de volume de negócios que separa os 80% dos 95%",
    "ircObrigacoes",
    REV_PROTECAO
  ),
  dispensaColeta: sv(
    200,
    "Art. 105.º CIRC — não há lugar a pagamentos por conta quando a coleta do período anterior, líquida de retenções, é igual ou inferior a 200 €",
    "ircObrigacoes",
    REV_PROTECAO
  ),
  margemErroTerceiro: sv(
    0.2,
    "Art. 107.º CIRC — o terceiro pagamento pode ser limitado ou suspenso; se a estimativa errar por mais de 20%, são devidos juros compensatórios",
    "ircObrigacoes",
    REV_PROTECAO
  ),
};

/** Reporte de prejuízos fiscais (Art. 52.º CIRC, redação desde 2023). */
export const PREJUIZOS_FISCAIS = {
  limitePercentagemLucro: sv(
    0.65,
    "Art. 52.º, n.º 2 CIRC — a dedução de prejuízos em cada período não pode exceder 65% do respetivo lucro tributável",
    "ircObrigacoes",
    REV_PROTECAO
  ),
  semLimiteTemporal: sv(
    true,
    "Art. 52.º, n.º 1 CIRC — os prejuízos fiscais são dedutíveis aos lucros tributáveis de períodos seguintes sem limite temporal (regime em vigor desde 2023; antes eram 12 anos e 70%)",
    "ircObrigacoes",
    REV_PROTECAO
  ),
  alteracaoTitularidadeLimite: sv(
    0.5,
    "Art. 52.º, n.º 8 CIRC — a dedução pode cessar quando se verifique alteração da titularidade de mais de 50% do capital social, salvo exceções e mediante autorização",
    "ircObrigacoes",
    REV_PROTECAO
  ),
};

/** Reserva legal obrigatória antes de distribuir lucros (Art. 218.º CSC). */
export const RESERVA_LEGAL = {
  percentagemLucro: sv(
    0.05,
    "Art. 218.º CSC — pelo menos 5% do lucro do exercício é destinado à constituição da reserva legal",
    "csc",
    REV_PROTECAO
  ),
  limiteCapital: sv(
    0.2,
    "Art. 218.º CSC — a reserva legal constitui-se até atingir 20% do capital social (com o mínimo legal de 2 500 €)",
    "csc",
    REV_PROTECAO
  ),
};

/** Prazos das entregas anuais da sociedade. */
export const PRAZOS_ANUAIS_EMPRESA = {
  modelo22: sv(
    "05-31",
    "Art. 120.º CIRC — a declaração Modelo 22 é entregue até 31 de maio do ano seguinte",
    "ircObrigacoes",
    REV_PROTECAO
  ),
  ies: sv(
    "07-15",
    "IES / declaração anual — entrega até 15 de julho do ano seguinte",
    "ircObrigacoes",
    REV_PROTECAO
  ),
  aprovacaoContas: sv(
    "03-31",
    "Art. 65.º CSC — as contas do exercício são aprovadas até 31 de março do ano seguinte",
    "csc",
    REV_PROTECAO
  ),
};

/**
 * Os parâmetros com proveniência que a asserção de integridade percorre.
 *
 * Estava como `const sourced` dentro de `assertFiscalDataIntegrity`, o que
 * o tornava invisível de fora. A página `/estado-dos-dados` (§10.3 do
 * relatório estratégico) precisa de dizer quantos parâmetros são
 * verificados e com que datas — e a única resposta honesta a essa pergunta
 * é a lista que a asserção percorre, não uma contagem escrita à mão ao
 * lado, que envelheceria à primeira alteração.
 */
export const PARAMETROS_AUDITADOS: readonly Sourced<unknown>[] = [
    IAS,
    SS_DEPENDENTE.trabalhador, SS_DEPENDENTE.entidade, SS_DEPENDENTE.ipss,
    SUBSIDIO_REFEICAO.dinheiro, SUBSIDIO_REFEICAO.cartao,
    SUBSIDIO_REFEICAO_MAJORACAO_VALES,
    ABONO_PARA_FALHAS,
    AJUDAS_CUSTO_PRESSUPOSTOS,
    RETENCAO_DEP_ISENCAO, RETENCAO_DEP_POR_DEPENDENTE, RETENCAO_DEP_CONTINENTE_T1,
    RETENCAO_DEP_TABELAS,
    RETENCAO_DEP_MADEIRA,
    RETENCAO_DEP_ACORES,
    HORARIO_SEMANAL_COMPLETO,
    TRABALHO_SUPLEMENTAR.acrescimos,
    RETENCAO_SUPLEMENTAR_FATOR,
    RETENCAO_DEP_REDUCAO_3MAIS,
    RETENCAO_DEP_DEFICIENTE,
    RETENCAO_CONJUGE_DEFICIENTE,
    RETENCAO_UNICO_TITULAR_FRACAO,
    RETENCAO_TAXA_OPCIONAL.direito,
    RETENCAO_TAXA_OPCIONAL.efeitoNoCalculo,
    RETENCAO_TAXA_OPCIONAL.passoEmPontos,
    AJUDAS_CUSTO.nacionalDia,
    AJUDAS_CUSTO.estrangeiroDia,
    AJUDAS_CUSTO.nacionalDiaDirecao,
    AJUDAS_CUSTO.estrangeiroDiaDirecao,
    DEDUCAO_ESPECIFICA_DEPENDENTE,
    ...Object.values(RETENCAO),
    DISPENSA_RETENCAO_LIMITE,
    IVA_ISENCAO_LIMITE,
    IVA_ISENCAO_EXCESSO,
    ...Object.values(IVA_TAXAS),
    SS_TAXA,
    ...Object.values(SS_COEFICIENTE),
    SS_BASE_MAX_MENSAL,
    SS_ISENCAO_PRIMEIRO_ANO_MESES,
    SS_ACUMULACAO_LIMITE_IAS,
    SS_ACUMULACAO_LIMITE_MENSAL,
    MOE_BASE_MINIMA_MENSAL,
    REGIME_SIMPLIFICADO.limite,
    REGIME_SIMPLIFICADO.coefServicos151,
    REGIME_SIMPLIFICADO.coefOutrosServicos,
    IRS_JOVEM.idadeMax,
    IRS_JOVEM.tetoIAS,
    IRS_JOVEM.isencaoPorAno,
    ...Object.values(PROGRAMA_REGRESSAR),
    ESCALOES_IRS,
    DEDUCAO_ESPECIFICA_CATB,
    REGIME_15PCT,
    MINIMO_EXISTENCIA,
    ...Object.values(MINIMO_EXISTENCIA_FORMULA),
    ADICIONAL_SOLIDARIEDADE.limiar1,
    ADICIONAL_SOLIDARIEDADE.limiar2,
    ADICIONAL_SOLIDARIEDADE.taxa1,
    ADICIONAL_SOLIDARIEDADE.taxa2,
    IRC_TAXA_GERAL,
    IRC_TAXA_PME,
    IRC_LIMITE_PME,
    DERRAMA_MAX,
    DIVIDENDOS_TAXA,
    REGIME_SIMPLIFICADO.coefVendas,
    REGIME_SIMPLIFICADO.coefPropIntelectual,
    REGIME_SIMPLIFICADO.coefAlojamentoMoradia,
    REGIME_SIMPLIFICADO.coefAlojamentoContencao,
    REGIME_SIMPLIFICADO.coefTransparencia,
    REGIME_SIMPLIFICADO.coefSubsidiosNaoExploracao,
    REGIME_SIMPLIFICADO.coefSubsidiosExploracao,
    CATEGORIA_F.taxaHabitacao,
    CATEGORIA_F.taxaNaoHabitacao,
    CATEGORIA_F.reducaoDuracao,
    REDUCAO_COEFICIENTE_ANO,
    DEDUCAO_DEPENDENTE,
    DEDUCAO_DEPENDENTE_BEBE,
    DEDUCAO_DEPENDENTE_3MAIS,
    DEDUCAO_DEPENDENTE_DEFICIENCIA,
    DEDUCAO_DESP_GERAIS,
    DEDUCAO_SAUDE,
    DEDUCAO_EDUCACAO,
    DEDUCAO_RENDAS,
    QUOCIENTE_CONJUGAL,
    LIMITE_GLOBAL_DEDUCOES,
    // Deficiência (Art. 56.º-A + Art. 87.º)
    EXCLUSAO_DEFICIENCIA_TAXA,
    EXCLUSAO_DEFICIENCIA_TAXA_PENSOES,
    EXCLUSAO_DEFICIENCIA_MAX,
    DEDUCAO_DEFICIENCIA_COLETA,
    DEDUCAO_DEFICIENCIA_GRAU_MINIMO,
    DEDUCAO_DEPENDENTE_DEFICIENCIA,
    ...Object.values(DEFICIENCIA_ART87),
    SS_MIN_MENSAL,
    // Gerir uma empresa (Arts. 31.º/33.º/34.º CIRC, 43.º-C/43.º-D EBF)
    ELEMENTOS_REDUZIDO_VALOR,
    ...Object.values(DEPRECIACAO),
    ...Object.values(ICE),
    ...Object.values(STOCK_OPTIONS_STARTUP),
    // Código do Trabalho
    ...Object.values(PERIODO_EXPERIMENTAL),
    ...Object.values(DENUNCIA_EXPERIMENTAL),
    ...Object.values(CONTRATO_A_TERMO),
    ...Object.values(FORMACAO_CONTINUA),
    ...Object.values(BANCO_DE_HORAS),
    ...Object.values(TELETRABALHO),
    ...Object.values(ASSEDIO_TRABALHO),
    ...Object.values(TRABALHADOR_ESTUDANTE),
    ...Object.values(COMPENSACAO_DESPEDIMENTO),
    // Tributação Autónoma
    TA_THRESHOLDS,
    TA_VIATURAS_COMBUSTAO,
    TA_VIATURAS_PHEV,
    TA_VIATURAS_ELETRICA,
    TA_ELETRICA_LIMITE_CUSTO,
    TA_VIATURAS_ELETRICA_ACIMA_LIMITE,
    TA_REPRESENTACAO,
    TA_AJUDAS_CUSTO,
    TA_NAO_DOCUMENTADAS,
    TA_AGRAVAMENTO_PREJUIZO,
    // RFAI
    RFAI_TAXA_INTERIOR,
    RFAI_TAXA_INTERIOR_EXCEDENTE,
    RFAI_TAXA_LITORAL,
    RFAI_LIMITE_INVESTIMENTO_INTERIOR,
    RFAI_LIMITE_COLETA,
    RFAI_REPORTE_ANOS,
    // DLRR (revogada — só a nota informativa)
    DLRR_REVOGADA_NOTA,
    // SIFIDE II
    SIFIDE_TAXA_BASE,
    SIFIDE_TAXA_INCREMENTAL,
    SIFIDE_TETO_INCREMENTAL,
    SIFIDE_MAJORACAO_PME_JOVEM,
    SIFIDE_REPORTE_ANOS,
    // IFICI
    IFICI_TAXA,
    IFICI_PRAZO_ANOS,
    // Impostos municipais
    IMI_TAXA_PADRAO,
    IMT_TAXA_COMERCIAL,
    IS_TAXA_AQUISICAO,
    // Heranças e sucessões (Imposto do Selo + Código Civil)
    IS_TRANSMISSAO_GRATUITA,
    IS_DOACAO_IMOVEL,
    IS_DOACAO_MINIMO_ISENTO,
    PRAZO_MODELO1_MESES,
    MEACAO_FRACAO,
    CONJUGE_QUOTA_MINIMA,
    // Englobamento dividendos
    DIV_INCLUSAO_ENGLOBAMENTO,
    // Mais-valias (categoria G)
    MAIS_VALIAS_MOBILIARIAS_TAXA,
    MAIS_VALIAS_DETENCAO_DIAS,
    CRIPTO_TAXA_CURTO_PRAZO,
    CRIPTO_ISENCAO_DIAS,
    MAIS_VALIAS_IMOBILIARIO_INCLUSAO,
    MAIS_VALIAS_REINVESTIMENTO_MESES,
    // Benefícios fiscais à coleta
    DEDUCAO_PPR,
    DEDUCAO_DONATIVOS,
    DONATIVOS_MAJORACOES,
    DEDUCAO_ASCENDENTE,
    DEDUCAO_ASCENDENTE_UNICO,
    DEDUCAO_PENSAO_ALIMENTOS,
    DEDUCAO_LARES,
    COEF_DESVALORIZACAO_MOEDA,
    // Categoria A — Art. 25.º n.os 1 al. c) e 4
    DEDUCAO_ESPECIFICA_DEP_MAX_ORDENS,
    QUOTIZACOES_SINDICAIS,
    // Limite global das deduções à coleta — Art. 78.º n.º 8
    LIMITE_GLOBAL_MAJORACAO_DEPENDENTES,
    // SMN
    SMN,
    // Direitos, cobranças e execução fiscal
    UNIDADE_CONTA,
    JUROS_MORA.transacoesComerciais, JUROS_MORA.outrosCreditosComerciais, JUROS_MORA.civis,
    INDEMNIZACAO_CUSTOS_COBRANCA, PRAZO_PAGAMENTO_SUPLETIVO_DIAS,
    PLANO_PRESTACOES.maximoGeral, PLANO_PRESTACOES.alargamentoAnos,
    PLANO_PRESTACOES.alargamentoLimiarUC, PLANO_PRESTACOES.automaticoSingulares,
    PLANO_PRESTACOES.automaticoColetivas,
    PENHORA.fracaoImpenhoravel, PENHORA.tetoSalariosMinimos, PENHORA.pisoSalariosMinimos,
    PENHORA.contaBancariaSalariosMinimos,
    // Proteção social e cessação do contrato
    SUBSIDIO_DOENCA.periodoEsperaDias, SUBSIDIO_DOENCA.prazoGarantiaMeses,
    SUBSIDIO_DOENCA.escaloes, SUBSIDIO_DOENCA.majoracao, SUBSIDIO_DOENCA.majoracaoRemuneracaoLimite,
    LICENCA_PARENTAL.modalidades, LICENCA_PARENTAL.partilhaDiasExclusivos,
    LICENCA_PARENTAL.paiObrigatoriaDias, LICENCA_PARENTAL.paiOpcionaisDias, LICENCA_PARENTAL.paiTaxa,
    SUBSIDIO_DESEMPREGO.prazoGarantiaDias, SUBSIDIO_DESEMPREGO.taxa, SUBSIDIO_DESEMPREGO.minimoIAS,
    SUBSIDIO_DESEMPREGO.minimoMajoradoIAS, SUBSIDIO_DESEMPREGO.maximoIAS,
    SUBSIDIO_DESEMPREGO.tetoReferenciaLiquida, SUBSIDIO_DESEMPREGO.duracaoMinimaDias,
    SUBSIDIO_DESEMPREGO.duracaoMaximaDias,
    COMPENSACAO_CESSACAO.diasPorAno, COMPENSACAO_CESSACAO.tetoBaseRMMG,
    COMPENSACAO_CESSACAO.tetoTotalMeses, COMPENSACAO_CESSACAO.tetoTotalRMMG,
    COMPENSACAO_CESSACAO.transitorios,
    FERIAS.diasUteisAno, FERIAS.anoAdmissaoDiasPorMes, FERIAS.anoAdmissaoMaximo,
    FERIAS.indemnizacaoNaoGozadasFator,
    TRABALHO_NOTURNO.horaInicio, TRABALHO_NOTURNO.horaFim, TRABALHO_NOTURNO.acrescimo,
    SEGURO_ACIDENTES_TRABALHO_ESTIMATIVA,
    SS_MOE.trabalhador, SS_MOE.entidade, SS_MOE.baseMinimaIAS,
    // Obrigações anuais da sociedade
    PAGAMENTOS_CONTA_IRC.numero, PAGAMENTOS_CONTA_IRC.meses,
    PAGAMENTOS_CONTA_IRC.taxaAte500k, PAGAMENTOS_CONTA_IRC.taxaAcima500k,
    PAGAMENTOS_CONTA_IRC.limiteVolumeNegocios, PAGAMENTOS_CONTA_IRC.dispensaColeta,
    PAGAMENTOS_CONTA_IRC.margemErroTerceiro,
    PREJUIZOS_FISCAIS.limitePercentagemLucro, PREJUIZOS_FISCAIS.semLimiteTemporal,
    PREJUIZOS_FISCAIS.alteracaoTitularidadeLimite,
    RESERVA_LEGAL.percentagemLucro, RESERVA_LEGAL.limiteCapital,
    PRAZOS_ANUAIS_EMPRESA.modelo22, PRAZOS_ANUAIS_EMPRESA.ies, PRAZOS_ANUAIS_EMPRESA.aprovacaoContas,
];

export function assertFiscalDataIntegrity(): void {
  const erros: string[] = [];
  const EPS = 0.01;

  const isRate = (n: number) => Number.isFinite(n) && n >= 0 && n <= 1;
  const isIsoDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

  // 1) Coerência do IAS com valores derivados.
  if (Math.abs(SS_BASE_MAX_MENSAL_CALC - SS_BASE_MAX_MENSAL.value) > EPS) {
    erros.push(
      `Teto SS (12×IAS=${SS_BASE_MAX_MENSAL_CALC.toFixed(2)}) ≠ SS_BASE_MAX_MENSAL (${SS_BASE_MAX_MENSAL.value}).`
    );
  }
  if (Math.abs(IRS_JOVEM_TETO_CALC - IRS_JOVEM.tetoIAS.value * IAS_VALUE) > EPS) {
    erros.push("Teto do IRS Jovem inconsistente com 55×IAS.");
  }
  if (
    Math.abs(SS_ACUMULACAO_LIMITE_IAS.value * IAS_VALUE - SS_ACUMULACAO_LIMITE_MENSAL.value) > EPS
  ) {
    erros.push("Limite de acumulação da SS inconsistente com 4×IAS.");
  }
  // O limite de acumulação tem de ficar abaixo do teto: acima dele a dispensa
  // do Art. 157.º deixaria de ter qualquer efeito prático.
  if (!(SS_ACUMULACAO_LIMITE_MENSAL.value < SS_BASE_MAX_MENSAL.value)) {
    erros.push("Limite de acumulação da SS (4×IAS) não é inferior ao teto (12×IAS).");
  }

  // 2) Excesso de IVA = 125% do limite de isenção.
  if (Math.abs(IVA_ISENCAO_EXCESSO.value - IVA_ISENCAO_LIMITE.value * 1.25) > EPS) {
    erros.push("Limiar de excesso de IVA não corresponde a 125% do limite de isenção.");
  }

  // 2b) Os conjuntos fechados usados na validação têm de cobrir exatamente as
  // chaves reais. Um enum que se desalinhe põe a validação a recusar dados
  // legítimos (ou a aceitar lixo) sem ninguém dar por isso.
  const mesmoConjunto = (a: readonly string[], b: readonly string[]) =>
    a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");
  if (!mesmoConjunto(TIPOS_ATIVIDADE, Object.keys(RETENCAO))) {
    erros.push("TIPOS_ATIVIDADE não corresponde às chaves de RETENCAO.");
  }
  if (!mesmoConjunto(REGIOES, Object.keys(IVA_TAXAS))) {
    erros.push("REGIOES não corresponde às chaves de IVA_TAXAS.");
  }
  if (!mesmoConjunto(BASES_SS, Object.keys(SS_COEFICIENTE))) {
    erros.push("BASES_SS não corresponde às chaves de SS_COEFICIENTE.");
  }
  if (!mesmoConjunto(REGIMES_IVA, ["isento", ...ESCALOES_IVA])) {
    erros.push("REGIMES_IVA não corresponde a «isento» mais os escalões de IVA.");
  }

  // 3) Todas as taxas no intervalo [0, 1].
  (Object.keys(RETENCAO) as TipoAtividade[]).forEach((k) => {
    if (!isRate(RETENCAO[k].value)) erros.push(`Taxa de retenção inválida: ${k}.`);
  });
  if (!isRate(SS_TAXA.value)) erros.push("Taxa de SS inválida.");
  (Object.keys(SS_COEFICIENTE) as BaseSS[]).forEach((k) => {
    if (!isRate(SS_COEFICIENTE[k].value)) erros.push(`Coeficiente SS inválido: ${k}.`);
  });
  (Object.keys(IVA_TAXAS) as Regiao[]).forEach((r) => {
    const t = IVA_TAXAS[r].value;
    (["reduzida", "intermedia", "normal"] as EscalaoIVA[]).forEach((e) => {
      if (!isRate(t[e])) erros.push(`Taxa de IVA inválida: ${r}/${e}.`);
    });
    if (!(t.reduzida < t.intermedia && t.intermedia < t.normal)) {
      erros.push(`Ordem das taxas de IVA incorreta em ${r} (reduzida<intermédia<normal).`);
    }
  });

  // 4) IRS Jovem: anos 1..10 com percentagens válidas e não crescentes.
  const escala = IRS_JOVEM.isencaoPorAno.value;
  let anterior = Infinity;
  for (let ano = 1; ano <= 10; ano++) {
    const v = escala[ano];
    if (v === undefined || !isRate(v)) {
      erros.push(`IRS Jovem: percentagem do ano ${ano} inválida ou em falta.`);
      continue;
    }
    if (v > anterior + EPS) erros.push(`IRS Jovem: isenção do ano ${ano} maior que a do ano anterior.`);
    anterior = v;
  }

  // 4b) Escalões de IRS: limites e taxas estritamente crescentes em [0,1].
  //     (Esta verificação rejeita tabelas inconsistentes — ex.: 2.º escalão
  //      com taxa inferior ao 1.º.)
  const escaloes = ESCALOES_IRS.value;
  let limiteAnterior = 0;
  let taxaAnterior = -1;
  escaloes.forEach((e, idx) => {
    const ultimo = idx === escaloes.length - 1;
    if (!isRate(e.taxa)) erros.push(`Escalão IRS ${idx + 1}: taxa inválida.`);
    if (e.taxa <= taxaAnterior) erros.push(`Escalão IRS ${idx + 1}: taxa não é crescente.`);
    taxaAnterior = e.taxa;
    if (ultimo) {
      if (e.ate !== null) erros.push("Último escalão de IRS deve ter limite null.");
    } else {
      if (e.ate === null || e.ate <= limiteAnterior) {
        erros.push(`Escalão IRS ${idx + 1}: limite superior não é crescente.`);
      } else {
        limiteAnterior = e.ate;
      }
    }
  });
  if (!(DEDUCAO_ESPECIFICA_CATB.value > 0)) erros.push("Dedução específica não positiva.");
  const deducaoEsperada =
    Math.round(Math.max(DEDUCAO_ESPECIFICA_FLOOR, DEDUCAO_ESPECIFICA_IAS_MULT * IAS.value) * 100) / 100;
  if (Math.abs(DEDUCAO_ESPECIFICA_CATB.value - deducaoEsperada) > EPS) {
    erros.push("Dedução específica não corresponde a máx(piso; 8,54 × IAS).");
  }
  if (!isRate(REGIME_15PCT.value)) erros.push("Limiar dos 15% inválido.");
  if (!(MINIMO_EXISTENCIA.value > 0)) erros.push("Mínimo de existência não positivo.");
  if (!(MINIMO_EXISTENCIA_FORMULA.coeficienteTrocoIntermedio.value > 0)) {
    erros.push("Coeficiente intermédio do mínimo de existência inválido.");
  }
  if (!(MINIMO_EXISTENCIA_FORMULA.coeficienteTrocoSuperior.value > 0)) {
    erros.push("Coeficiente superior do mínimo de existência inválido.");
  }
  if (!(MINIMO_EXISTENCIA_FORMULA.divisorPatamarL.value > 0)) {
    erros.push("Divisor do patamar L do mínimo de existência inválido.");
  }

  // IRC e dividendos.
  [IRC_TAXA_GERAL, IRC_TAXA_PME, DERRAMA_MAX, DIVIDENDOS_TAXA].forEach((p) => {
    if (!isRate(p.value)) erros.push(`Taxa inválida: ${p.legalBasis}.`);
  });

  // Mais-valias (categoria G): taxas em [0,1]; frações em [0,1]; prazos positivos.
  [MAIS_VALIAS_MOBILIARIAS_TAXA, CRIPTO_TAXA_CURTO_PRAZO, MAIS_VALIAS_IMOBILIARIO_INCLUSAO].forEach((p) => {
    if (!isRate(p.value)) erros.push(`Parâmetro de mais-valias inválido: ${p.legalBasis}.`);
  });
  if (!(MAIS_VALIAS_DETENCAO_DIAS.value > 0)) erros.push("Período de detenção de mais-valias não positivo.");
  if (!(CRIPTO_ISENCAO_DIAS.value > 0)) erros.push("Período de isenção de criptoativos não positivo.");
  if (!(MAIS_VALIAS_REINVESTIMENTO_MESES.value > 0)) erros.push("Prazo de reinvestimento de mais-valias não positivo.");

  // Benefícios fiscais à coleta: PPR, donativos e ascendentes.
  if (!isRate(DEDUCAO_PPR.value.taxa)) erros.push("Taxa de dedução PPR inválida.");
  if (!(DEDUCAO_PPR.value.ate35 >= DEDUCAO_PPR.value.de35a50 && DEDUCAO_PPR.value.de35a50 >= DEDUCAO_PPR.value.mais50 && DEDUCAO_PPR.value.mais50 > 0)) {
    erros.push("Limites do PPR por idade inválidos ou não decrescentes.");
  }
  if (!isRate(DEDUCAO_DONATIVOS.value.taxa) || !isRate(DEDUCAO_DONATIVOS.value.limiteColeta)) {
    erros.push("Parâmetros de dedução de donativos fora de [0,1].");
  }
  (Object.keys(DONATIVOS_MAJORACOES.value) as TipoDonativo[]).forEach((k) => {
    if (!(DONATIVOS_MAJORACOES.value[k].fator >= 1)) erros.push(`Fator de majoração de donativo inválido: ${k}.`);
  });
  if (!(DEDUCAO_ASCENDENTE.value > 0)) erros.push("Dedução por ascendente não positiva.");
  if (!(DEDUCAO_ASCENDENTE_UNICO.value >= DEDUCAO_ASCENDENTE.value)) {
    erros.push("Dedução por ascendente único deveria ser ≥ à dedução por ascendente.");
  }
  if (!isRate(DEDUCAO_PENSAO_ALIMENTOS.value)) erros.push("Taxa de dedução de pensão de alimentos inválida.");
  if (!isRate(DEDUCAO_LARES.value.taxa) || !(DEDUCAO_LARES.value.limite > 0)) {
    erros.push("Parâmetros de dedução de lares inválidos.");
  }

  // Coeficientes de desvalorização da moeda: todos ≥ 1 (não são estritamente
  // monótonos — p. ex. 2009 sobe face a 2008 por deflação). O ano mais recente
  // tabelado deve aproximar-se de 1 (sem correção relevante).
  {
    const t = COEF_DESVALORIZACAO_MOEDA.value.porAno;
    const anos = Object.keys(t).map(Number).sort((a, b) => a - b);
    if (anos.length === 0) erros.push("Tabela de coeficientes de desvalorização vazia.");
    anos.forEach((a) => {
      if (!(t[a] >= 1)) erros.push(`Coeficiente de desvalorização inválido (< 1) em ${a}.`);
    });
    const maisRecente = anos[anos.length - 1];
    if (anos.length > 0 && Math.abs(t[maisRecente] - 1) > 0.05) {
      erros.push("Coeficiente do ano mais recente deveria aproximar-se de 1.");
    }
  }
  if (!(IRC_TAXA_PME.value < IRC_TAXA_GERAL.value)) {
    erros.push("Taxa PME de IRC deveria ser inferior à geral.");
  }
  if (!(IRC_LIMITE_PME.value > 0)) erros.push("Limiar PME de IRC não positivo.");

  // Tributação Autónoma.
  if (!(TA_THRESHOLDS.value.t1 > 0 && TA_THRESHOLDS.value.t2 > TA_THRESHOLDS.value.t1)) {
    erros.push("Thresholds de TA inválidos ou não crescentes.");
  }
  [TA_VIATURAS_COMBUSTAO, TA_VIATURAS_PHEV].forEach((p) => {
    const t = p.value;
    if (!(t.ate37500 >= 0 && t.ate45000 > t.ate37500 && t.acima45000 > t.ate45000)) {
      erros.push(`Taxas de TA de viaturas não crescentes: ${p.legalBasis}.`);
    }
    if (!isRate(t.ate37500) || !isRate(t.ate45000) || !isRate(t.acima45000)) {
      erros.push(`Taxas de TA de viaturas fora de [0,1]: ${p.legalBasis}.`);
    }
  });
  if (!isRate(TA_VIATURAS_ELETRICA.value)) erros.push("Taxa TA elétrica inválida.");
  if (TA_VIATURAS_ELETRICA.value !== 0) erros.push("Taxa TA elétrica deveria ser 0.");
  [TA_REPRESENTACAO, TA_AJUDAS_CUSTO, TA_NAO_DOCUMENTADAS, TA_AGRAVAMENTO_PREJUIZO].forEach((p) => {
    if (!isRate(p.value)) erros.push(`Taxa de TA inválida: ${p.legalBasis}.`);
  });

  // RFAI.
  [RFAI_TAXA_INTERIOR, RFAI_TAXA_INTERIOR_EXCEDENTE, RFAI_TAXA_LITORAL, RFAI_LIMITE_COLETA].forEach((p) => {
    if (!isRate(p.value)) erros.push(`Parâmetro RFAI inválido: ${p.legalBasis}.`);
  });
  if (!(RFAI_TAXA_INTERIOR.value > RFAI_TAXA_INTERIOR_EXCEDENTE.value)) {
    erros.push("Taxa RFAI interior deveria ser superior à taxa do excedente.");
  }
  if (!(RFAI_LIMITE_INVESTIMENTO_INTERIOR.value > 0)) erros.push("Limite de investimento RFAI não positivo.");
  if (!(RFAI_REPORTE_ANOS.value > 0)) erros.push("Anos de reporte RFAI não positivos.");

  // DLRR (revogada) — garantir que a nota de revogação existe e cita a lei.
  if (!DLRR_REVOGADA_NOTA.value.includes("24-D/2022")) {
    erros.push("Nota de revogação da DLRR deve citar a Lei 24-D/2022.");
  }

  // TA de viaturas elétricas (Art. 88.º, n.º 20).
  if (!isRate(TA_VIATURAS_ELETRICA_ACIMA_LIMITE.value)) erros.push("Taxa TA elétricas acima do limite inválida.");
  if (!(TA_ELETRICA_LIMITE_CUSTO.value > 0)) erros.push("Limite de custo TA elétricas não positivo.");

  // SIFIDE II.
  [SIFIDE_TAXA_BASE, SIFIDE_TAXA_INCREMENTAL, SIFIDE_MAJORACAO_PME_JOVEM].forEach((p) => {
    if (!isRate(p.value)) erros.push(`Taxa SIFIDE inválida: ${p.legalBasis}.`);
  });
  if (!(SIFIDE_TETO_INCREMENTAL.value > 0)) erros.push("Teto incremental SIFIDE não positivo.");
  if (!(SIFIDE_REPORTE_ANOS.value > 0)) erros.push("Anos de reporte SIFIDE não positivos.");
  if (!(SIFIDE_TAXA_BASE.value + SIFIDE_MAJORACAO_PME_JOVEM.value < 1)) {
    erros.push("Soma taxa base SIFIDE + majoração PME jovem deveria ser < 1.");
  }

  // IFICI.
  if (!isRate(IFICI_TAXA.value)) erros.push("Taxa IFICI inválida.");
  if (!(IFICI_PRAZO_ANOS.value > 0)) erros.push("Prazo IFICI não positivo.");

  // Heranças e Sucessões — Imposto do Selo + Código Civil.
  [IS_TRANSMISSAO_GRATUITA, IS_DOACAO_IMOVEL, MEACAO_FRACAO, CONJUGE_QUOTA_MINIMA].forEach((p) => {
    if (!isRate(p.value)) erros.push(`Taxa/fração de heranças inválida: ${p.legalBasis}.`);
  });
  if (!(IS_DOACAO_MINIMO_ISENTO.value > 0)) erros.push("Limiar de isenção de doações não positivo.");
  if (!(PRAZO_MODELO1_MESES.value > 0)) erros.push("Prazo do Modelo 1 não positivo.");
  if (!IS_DOACAO_IMOVEL.note?.includes("herança")) {
    erros.push("A nota da Verba 1.1 deve esclarecer que não se aplica a heranças.");
  }
  if (SELO_RELACOES_ISENTAS.length === 0) erros.push("Lista de relações isentas de Imposto do Selo vazia.");
  (Object.keys(LEGITIMA) as ConfigLegitima[]).forEach((k) => {
    const f = LEGITIMA[k].fracao;
    if (!(f > 0 && f < 1)) erros.push(`Fração de legítima fora de (0,1): ${k}.`);
    if (!LEGITIMA[k].base) erros.push(`Legítima sem base legal: ${k}.`);
  });
  // Cônjuge com descendentes tem legítima superior à do cônjuge sozinho.
  if (!(LEGITIMA.conjuge_descendentes.fracao > LEGITIMA.conjuge_so.fracao)) {
    erros.push("Legítima cônjuge+descendentes deveria exceder a do cônjuge sozinho.");
  }
  // Quotas de sucessão legítima cônjuge/ascendentes somam 1.
  if (Math.abs(CONJUGE_ASCENDENTES_QUOTAS.conjuge + CONJUGE_ASCENDENTES_QUOTAS.ascendentes - 1) > EPS) {
    erros.push("Quotas cônjuge+ascendentes (Art. 2142.º) não somam 1.");
  }

  // Deficiência (Art. 56.º-A + 87.º CIRS).
  if (!isRate(EXCLUSAO_DEFICIENCIA_TAXA.value)) erros.push("Taxa exclusão deficiência Art. 56.º-A inválida.");
  if (!(EXCLUSAO_DEFICIENCIA_MAX.value > 0)) erros.push("Máx exclusão deficiência Art. 56.º-A não positivo.");
  if (!(DEDUCAO_DEFICIENCIA_COLETA.value > 0)) erros.push("Dedução coleta deficiência Art. 87.º não positiva.");
  if (Math.abs(DEDUCAO_DEFICIENCIA_COLETA.value - Math.round(4 * IAS.value * 100) / 100) > EPS) {
    erros.push("Dedução coleta deficiência não corresponde a 4 × IAS.");
  }
  if (!(DEDUCAO_DEFICIENCIA_GRAU_MINIMO.value > 0 && DEDUCAO_DEFICIENCIA_GRAU_MINIMO.value < 100)) {
    erros.push("Grau mínimo de deficiência deve estar entre 0 e 100.");
  }
  if (!(DEDUCAO_DEPENDENTE_DEFICIENCIA.value > 0)) erros.push("Dedução dependente deficiência não positiva.");
  if (Math.abs(DEDUCAO_DEPENDENTE_DEFICIENCIA.value - Math.round(2.5 * IAS.value * 100) / 100) > EPS) {
    erros.push("Dedução dependente deficiência não corresponde a 2,5 × IAS.");
  }
  // A exclusão da categoria H é MENOR que a das categorias A e B (90% vs 85%
  // de rendimento considerado). Trocá-las tributa a menos uma pensão.
  if (!isRate(EXCLUSAO_DEFICIENCIA_TAXA_PENSOES.value)) {
    erros.push("Taxa exclusão deficiência Cat. H (Art. 56.º-A) inválida.");
  }
  if (!(EXCLUSAO_DEFICIENCIA_TAXA_PENSOES.value < EXCLUSAO_DEFICIENCIA_TAXA.value)) {
    erros.push("Exclusão da Cat. H deveria ser inferior à das Cat. A/B (Art. 56.º-A, n.º 1).");
  }
  // Art. 87.º — o resto do artigo.
  for (const [nome, taxa] of [
    ["educação e reabilitação (n.º 2)", DEFICIENCIA_ART87.educacaoEReabilitacao],
    ["prémios de seguro (n.º 2)", DEFICIENCIA_ART87.premiosSeguroVida],
    ["limite dos prémios na coleta (n.º 4)", DEFICIENCIA_ART87.limitePremiosNaColeta],
  ] as const) {
    if (!isRate(taxa.value)) erros.push(`Taxa do Art. 87.º — ${nome} — inválida.`);
  }
  if (!(DEFICIENCIA_ART87.limiteContribuicoesReformaCasados.value
    === 2 * DEFICIENCIA_ART87.limiteContribuicoesReforma.value)) {
    erros.push("Art. 87.º, n.º 3: o limite dos casados é o dobro do dos não casados (€130 / €65).");
  }
  // Dois graus distintos: 60% abre o regime, 90% abre o acompanhamento.
  if (!(DEFICIENCIA_ART87.grauAcompanhamento.value > DEDUCAO_DEFICIENCIA_GRAU_MINIMO.value)) {
    erros.push("Art. 87.º, n.º 6: o grau da despesa de acompanhamento tem de exceder o grau de acesso ao regime.");
  }
  if (Math.abs(DEFICIENCIA_ART87.acompanhamento.value - DEDUCAO_DEFICIENCIA_COLETA.value) > EPS) {
    erros.push("Art. 87.º, n.º 6: a despesa de acompanhamento é igual a 4 × IAS, como a dedução do n.º 1.");
  }
  if (Math.abs(DEFICIENCIA_ART87.dependenteOuAscendente.value - DEDUCAO_DEPENDENTE_DEFICIENCIA.value) > EPS) {
    erros.push("Art. 87.º, n.º 1: a dedução por ascendente com deficiência é a mesma do dependente (2,5 × IAS).");
  }
  // A escada do n.º 9 desce, e nunca sobe.
  const escada = DEFICIENCIA_ART87.descidaAposReavaliacao.value;
  if (escada.length !== 4 || escada.some((v, i) => i > 0 && v >= escada[i - 1])) {
    erros.push("Art. 87.º, n.º 9: a escada de descida tem quatro degraus estritamente decrescentes.");
  }
  if (!(DEFICIENCIA_ART87.descidaGrauMinimo.value < DEDUCAO_DEFICIENCIA_GRAU_MINIMO.value)) {
    erros.push("Art. 87.º, n.º 9: o grau residual (20%) tem de ser inferior ao grau de acesso (60%).");
  }
  // Gerir uma empresa. O ICE é o único benefício em que o limite NÃO é um
  // teto único: o n.º 4 manda escolher o MAIOR dos dois, e trocar isso por
  // um mínimo cortava a dedução a quem tem EBITDA grande.
  if (!isRate(ICE.spread.value)) erros.push("Spread do ICE (Art. 43.º-D, n.º 1 EBF) inválido.");
  if (!isRate(ICE.limiteEbitda.value)) erros.push("Limite EBITDA do ICE (Art. 43.º-D, n.º 4 EBF) inválido.");
  if (!(ICE.limiteAbsoluto.value > 0)) erros.push("Limite absoluto do ICE não positivo.");
  if (!(ICE.periodosAnteriores.value > ICE.reporteAnos.value)) {
    erros.push("ICE: a janela de apuramento (6 períodos) deveria exceder o reporte (5 períodos).");
  }
  // Stock options: metade do ganho à taxa autónoma. Se a fração deixar de
  // ser uma fração, a taxa efetiva do regime deixa de fazer sentido.
  if (!isRate(STOCK_OPTIONS_STARTUP.fracaoTributada.value)) {
    erros.push("Fração tributada das stock options (Art. 43.º-C, n.º 1 EBF) inválida.");
  }
  if (!isRate(STOCK_OPTIONS_STARTUP.taxa.value)) {
    erros.push("Taxa das stock options (Art. 72.º, n.º 1, al. f) CIRS) inválida.");
  }
  if (!(STOCK_OPTIONS_TAXA_EFETIVA < STOCK_OPTIONS_STARTUP.taxa.value)) {
    erros.push("A taxa efetiva das stock options tem de ser inferior à taxa autónoma — é metade dela.");
  }
  if (!(STOCK_OPTIONS_STARTUP.isencaoSaidaEmIas.value > 0)) {
    erros.push("Isenção de saída das stock options (Art. 43.º-C, n.º 5 EBF) não positiva.");
  }
  if (!(ELEMENTOS_REDUZIDO_VALOR.value > 0)) erros.push("Limiar dos elementos de reduzido valor não positivo.");
  // Os coeficientes das quotas decrescentes crescem com a vida útil, e
  // nenhum deles reduz a quota — corrigi-la para baixo seria o contrário
  // do que o método faz.
  const coefs = DEPRECIACAO.quotasDecrescentes.value;
  if (coefs.length !== 3 || coefs.some((c, i) => c.coeficiente <= 1 || (i > 0 && c.coeficiente <= coefs[i - 1].coeficiente))) {
    erros.push("Art. 31.º, n.º 4 CIRC: os três coeficientes são maiores que 1 e crescem com a vida útil.");
  }
  // Código do Trabalho — a escada do período experimental sobe, e a do
  // contrato a termo é sempre mais curta do que a do indeterminado.
  if (!(PERIODO_EXPERIMENTAL.geral.value < PERIODO_EXPERIMENTAL.qualificados.value
    && PERIODO_EXPERIMENTAL.qualificados.value < PERIODO_EXPERIMENTAL.direcao.value)) {
    erros.push("Art. 112.º CT: as três durações do período experimental são estritamente crescentes.");
  }
  if (!(PERIODO_EXPERIMENTAL.termoMenosDeSeisMeses.value < PERIODO_EXPERIMENTAL.termoSeisMesesOuMais.value
    && PERIODO_EXPERIMENTAL.termoSeisMesesOuMais.value < PERIODO_EXPERIMENTAL.geral.value)) {
    erros.push("Art. 112.º, n.º 2 CT: o período experimental a termo é mais curto do que o do contrato sem termo.");
  }
  if (!(DENUNCIA_EXPERIMENTAL.limiarAviso7Dias.value < DENUNCIA_EXPERIMENTAL.limiarAviso30Dias.value
    && DENUNCIA_EXPERIMENTAL.aviso7Dias.value < DENUNCIA_EXPERIMENTAL.aviso30Dias.value)) {
    erros.push("Art. 114.º CT: limiares e avisos prévios da denúncia têm de crescer juntos.");
  }
  if (!(CONTRATO_A_TERMO.duracaoMaximaTermoCerto.value < CONTRATO_A_TERMO.duracaoMaximaTermoIncerto.value)) {
    erros.push("Art. 148.º CT: o termo incerto admite duração superior à do termo certo.");
  }
  if (!(FORMACAO_CONTINUA.horasAnuais.value > 0) || !isRate(FORMACAO_CONTINUA.fracaoMinimaDeTrabalhadores.value)) {
    erros.push("Art. 131.º CT: horas anuais de formação ou fração mínima de trabalhadores inválidas.");
  }
  if (!(FORMACAO_CONTINUA.caducidadeDoCreditoAnos.value > FORMACAO_CONTINUA.prazoAteViragemEmCredito.value)) {
    erros.push("Arts. 131.º/132.º CT: o crédito caduca depois de se constituir, não antes.");
  }
  if (!isRate(BANCO_DE_HORAS.grupalMaioriaReferendo.value) || !(BANCO_DE_HORAS.grupalMaioriaReferendo.value > 0.5)) {
    erros.push("Art. 208.º-B, n.º 6 CT: a maioria do referendo é uma fração superior a metade.");
  }
  if (!(BANCO_DE_HORAS.grupalMaximoSemanal.value > HORARIO_SEMANAL_COMPLETO.value)) {
    erros.push("Art. 208.º-B CT: o máximo semanal do banco grupal excede o período normal de trabalho.");
  }
  // Os dois tetos do art. 366.º são múltiplos do salário mínimo, e o global
  // é exatamente o produto do teto da retribuição pelo teto em meses.
  if (COMPENSACAO_DESPEDIMENTO.tetoGlobalEmSmn.value
    !== COMPENSACAO_DESPEDIMENTO.tetoRetribuicaoEmSmn.value * COMPENSACAO_DESPEDIMENTO.tetoGlobalEmMeses.value) {
    erros.push("Art. 366.º, n.º 2 CT: 240 × RMMG tem de ser 20 × RMMG × 12 meses.");
  }
  if (!(COMPENSACAO_TETO_GLOBAL > COMPENSACAO_TETO_RETRIBUICAO && COMPENSACAO_TETO_RETRIBUICAO > SMN.value)) {
    erros.push("Art. 366.º CT: os tetos derivados do salário mínimo estão incoerentes.");
  }
  if (!isRate(DEDUCAO_RENDAS.value.taxa)) erros.push("Taxa dedução rendas inválida.");
  if (!(DEDUCAO_RENDAS.value.limite > 0)) erros.push("Limite dedução rendas não positivo.");
  if (!(SS_MIN_MENSAL.value > 0)) erros.push("SS mínimo mensal não positivo.");

  // Dedução majorada (2.º+ dependente até 6 anos / simplificação 3.º+).
  if (!(DEDUCAO_DEPENDENTE_3MAIS.value >= DEDUCAO_DEPENDENTE.value)) {
    erros.push("Dedução majorada por dependente deveria ser ≥ à dedução base.");
  }

  // Coeficientes do regime simplificado e atividades.
  [
    REGIME_SIMPLIFICADO.coefVendas,
    REGIME_SIMPLIFICADO.coefPropIntelectual,
    REGIME_SIMPLIFICADO.coefAlojamentoMoradia,
    REGIME_SIMPLIFICADO.coefAlojamentoContencao,
    REGIME_SIMPLIFICADO.coefTransparencia,
    REGIME_SIMPLIFICADO.coefSubsidiosNaoExploracao,
    REGIME_SIMPLIFICADO.coefSubsidiosExploracao,
  ].forEach((p) => {
    if (!isRate(p.value)) erros.push(`Coeficiente inválido: ${p.legalBasis}.`);
  });

  // Categoria F: taxas e reduções em [0,1]; taxa reduzida nunca negativa.
  if (!isRate(CATEGORIA_F.taxaHabitacao.value)) erros.push("Taxa de cat. F (habitação) inválida.");
  if (!isRate(CATEGORIA_F.taxaNaoHabitacao.value)) erros.push("Taxa de cat. F (não habitação) inválida.");
  (Object.keys(CATEGORIA_F.reducaoDuracao.value) as DuracaoArrendamento[]).forEach((k) => {
    const red = CATEGORIA_F.reducaoDuracao.value[k];
    if (!isRate(red)) erros.push(`Redução de cat. F inválida: ${k}.`);
    if (CATEGORIA_F.taxaHabitacao.value - red < -EPS) {
      erros.push(`Redução de cat. F (${k}) maior que a taxa base — taxa efetiva negativa.`);
    }
  });
  Object.values(REDUCAO_COEFICIENTE_ANO.value).forEach((v) => {
    if (!isRate(v)) erros.push("Redução de coeficiente por ano de atividade inválida.");
  });
  ATIVIDADES.forEach((a) => {
    if (!a.label || !(a.tipo in RETENCAO)) erros.push(`Atividade inválida: ${a.label}.`);
    if (a.coef !== undefined && !isRate(a.coef)) erros.push(`Coeficiente da atividade inválido: ${a.label}.`);
    if (a.retencao !== undefined && !isRate(a.retencao)) erros.push(`Retenção da atividade inválida: ${a.label}.`);
  });

  // Deduções à coleta.
  if (!(DEDUCAO_DEPENDENTE.value > 0)) erros.push("Dedução por dependente não positiva.");
  if (DEDUCAO_DEPENDENTE_BEBE.value < DEDUCAO_DEPENDENTE.value) {
    erros.push("Dedução do dependente até 3 anos deveria ser ≥ à do dependente normal.");
  }
  [DEDUCAO_DESP_GERAIS, DEDUCAO_SAUDE, DEDUCAO_EDUCACAO].forEach((p) => {
    if (!isRate(p.value.taxa)) erros.push(`Taxa de dedução inválida: ${p.legalBasis}.`);
    if (!(p.value.limite > 0)) erros.push(`Limite de dedução não positivo: ${p.legalBasis}.`);
  });
  if (QUOCIENTE_CONJUGAL.value !== 2) erros.push("Quociente conjugal deveria ser 2.");
  {
    const g = LIMITE_GLOBAL_DEDUCOES.value;
    if (!(g.semLimiteAte < g.escalaoSuperior) || !(g.limiteBaixo < g.limiteAlto)) {
      erros.push("Limite global das deduções inconsistente.");
    }
  }

  // 5) Limites positivos.
  [DISPENSA_RETENCAO_LIMITE, IVA_ISENCAO_LIMITE, IVA_ISENCAO_EXCESSO, REGIME_SIMPLIFICADO.limite].forEach(
    (p) => {
      if (!(p.value > 0)) erros.push(`Limite não positivo: ${p.legalBasis}.`);
    }
  );

  // 5b) Trabalho dependente (Categoria A).
  if (!isRate(SS_DEPENDENTE.trabalhador.value)) erros.push("Taxa SS trabalhador (cat. A) inválida.");
  if (!isRate(SS_DEPENDENTE.entidade.value)) erros.push("Taxa SS entidade/TSU (cat. A) inválida.");
  if (!isRate(SS_DEPENDENTE.ipss.value)) erros.push("Taxa SS IPSS (cat. A) inválida.");
  if (!(SS_DEPENDENTE.trabalhador.value < SS_DEPENDENTE.entidade.value)) {
    erros.push("TSU da entidade deveria exceder a taxa do trabalhador.");
  }
  if (!(SUBSIDIO_REFEICAO.dinheiro.value > 0 && SUBSIDIO_REFEICAO.cartao.value > SUBSIDIO_REFEICAO.dinheiro.value)) {
    erros.push("Limites do subsídio de refeição inválidos (cartão deve exceder dinheiro).");
  }
  if (!(HORARIO_SEMANAL_COMPLETO.value > 0 && HORARIO_SEMANAL_COMPLETO.value <= 60)) {
    erros.push("Horário semanal completo (cat. A) fora do intervalo plausível.");
  }
  if (!Array.isArray(TRABALHO_SUPLEMENTAR.acrescimos.value) || TRABALHO_SUPLEMENTAR.acrescimos.value.length === 0) {
    erros.push("Acréscimos do trabalho suplementar em falta.");
  }
  TRABALHO_SUPLEMENTAR.acrescimos.value.forEach((r, i) => {
    if (!(r > 0 && r <= 2)) erros.push(`Acréscimo de trabalho suplementar ${i + 1} fora de (0, 2].`);
  });
  if (!isRate(RETENCAO_SUPLEMENTAR_FATOR.value)) erros.push("Fator de retenção do trabalho suplementar fora de [0,1].");
  // O limite do cartão é o do numerário majorado — não um segundo valor.
  if (Math.abs(SUBSIDIO_REFEICAO.cartao.value
    - Math.round(SUBSIDIO_REFEICAO.dinheiro.value * (1 + SUBSIDIO_REFEICAO_MAJORACAO_VALES.value) * 100) / 100) > EPS) {
    erros.push("Subsídio de refeição: o limite em vales é o do numerário majorado em 70% (Art. 2.º, n.º 3, al. b), 2) CIRS).");
  }
  if (!isRate(ABONO_PARA_FALHAS.value)) erros.push("Abono para falhas (Art. 2.º, n.º 3, al. c) CIRS) inválido.");
  if (!(AJUDAS_CUSTO.nacionalDia.value > 0 && AJUDAS_CUSTO.estrangeiroDia.value > AJUDAS_CUSTO.nacionalDia.value)) {
    erros.push("Ajudas de custo: estrangeiro deve exceder nacional e ambos positivos.");
  }
  if (
    !(AJUDAS_CUSTO.nacionalDiaDirecao.value > AJUDAS_CUSTO.nacionalDia.value
      && AJUDAS_CUSTO.estrangeiroDiaDirecao.value > AJUDAS_CUSTO.estrangeiroDia.value)
  ) {
    erros.push("Ajudas de custo: o escalão de direção deve exceder o do trabalhador em ambos os destinos.");
  }
  if (!(RETENCAO_DEP_ISENCAO.value > 0)) erros.push("Limiar de isenção de retenção (cat. A) não positivo.");
  if (!(RETENCAO_DEP_POR_DEPENDENTE.value > 0)) erros.push("Parcela por dependente (cat. A) não positiva.");
  // Incapacidade do agregado (Despacho 233-A/2026, n.ºs 5 e 6): a parcela de
  // «casado, dois titulares» é metade da das restantes situações porque cada
  // titular retém sobre a sua parte — se um dia as duas ficarem iguais, é sinal
  // de transcrição errada, não de alteração legislativa.
  const incapDep = RETENCAO_DEP_DEFICIENTE.value;
  if (!(incapDep.naoCasadoOuUnico > 0 && incapDep.casadoDois > 0)) {
    erros.push("Parcela por dependente com incapacidade (cat. A) não positiva.");
  }
  if (Math.abs(incapDep.naoCasadoOuUnico - 2 * incapDep.casadoDois) > EPS) {
    erros.push("Parcela por dependente com incapacidade: a de casado dois titulares deve ser metade da de não casado/único titular.");
  }
  if (!(Number.isInteger(incapDep.fatorMaxNaoCasadoOuUnico) && incapDep.fatorMaxNaoCasadoOuUnico >= 1)) {
    erros.push("Fator máximo por dependente com incapacidade (não casado/único titular) inválido.");
  }
  if (!(Number.isInteger(incapDep.fatorMaxCasadoDois) && incapDep.fatorMaxCasadoDois >= incapDep.fatorMaxNaoCasadoOuUnico)) {
    erros.push("Fator máximo por dependente com incapacidade (casado dois titulares) inválido.");
  }
  if (!(RETENCAO_CONJUGE_DEFICIENTE.value > 0)) {
    erros.push("Parcela por cônjuge com incapacidade (cat. A) não positiva.");
  }
  if (!(RETENCAO_UNICO_TITULAR_FRACAO.value > 0.5 && RETENCAO_UNICO_TITULAR_FRACAO.value <= 1)) {
    erros.push("Fração do rendimento englobado para «casado, único titular» fora de (0,5; 1].");
  }
  // Opção do n.º 6 do Art. 98.º: a regra é uma SUBSTITUIÇÃO da taxa marginal.
  // As asserções prendem as três propriedades que a tornam correta — só sobe,
  // é inteira, e não passa do topo da tabela — para que nenhuma refatoração as
  // perca em silêncio.
  {
    const topo = taxaMarginalMaximaTabela(RETENCAO_DEP_CONTINENTE_T1.value);
    if (!(topo > 0 && topo <= 1)) {
      erros.push("Taxa marginal máxima da Tabela I (Continente) fora de (0; 1].");
    }
    if (!(RETENCAO_TAXA_OPCIONAL.passoEmPontos.value === 1)) {
      erros.push("A opção do Art. 98.º, n.º 6 é por «taxa inteira»: o passo tem de ser de 1 ponto percentual.");
    }
    const escaloes = RETENCAO_DEP_CONTINENTE_T1.value;
    if (taxaRetencaoOpcionalValida(0.2, 0.25, escaloes) !== undefined) {
      erros.push("Taxa opcional abaixo da legal não pode ser aceite (Art. 98.º, n.º 6 exige taxa SUPERIOR).");
    }
    if (taxaRetencaoOpcionalValida(0.99, 0.25, escaloes) !== topo) {
      erros.push("Taxa opcional acima do topo da tabela não foi limitada ao topo.");
    }
    if (taxaRetencaoOpcionalValida(0.305, 0.25, escaloes) !== 0.31) {
      erros.push("Taxa opcional não foi arredondada a ponto percentual inteiro.");
    }
  }
  // A al. b) é exclusiva de «casado, único titular»: a asserção prende a regra
  // ao código, para que nenhuma refatoração a espalhe pelas outras situações.
  if (parcelaIncapacidadeFamiliar("casadoDois", { conjugeDeficiente: true }) !== 0
    || parcelaIncapacidadeFamiliar("naoCasado", { conjugeDeficiente: true }) !== 0) {
    erros.push("Parcela do cônjuge com incapacidade aplicada fora de «casado, único titular».");
  }
  if (Math.abs(DEDUCAO_ESPECIFICA_DEPENDENTE.value - Math.round(8.54 * IAS.value * 100) / 100) > EPS) {
    erros.push("Dedução específica (cat. A) deve ser 8,54 × IAS.");
  }
  if (
    Math.abs(DEDUCAO_ESPECIFICA_DEP_MAX_ORDENS.value - Math.round(0.75 * 12 * IAS.value * 100) / 100) > EPS
  ) {
    erros.push("Tecto do Art. 25.º n.º 4 (cat. A) deve ser 75% de 12 × IAS.");
  }
  // O n.º 4 ELEVA a dedução da alínea a) — um tecto inferior a ela tornaria a
  // norma inaplicável e cortaria silenciosamente a dedução de quem paga ordem.
  if (!(DEDUCAO_ESPECIFICA_DEP_MAX_ORDENS.value > DEDUCAO_ESPECIFICA_DEPENDENTE.value)) {
    erros.push("Tecto do Art. 25.º n.º 4 não é superior à dedução específica da alínea a).");
  }
  if (!isRate(QUOTIZACOES_SINDICAIS.value.limiteFracaoBruto)) {
    erros.push("Limite das quotizações sindicais (fração do bruto) inválido.");
  }
  if (!(QUOTIZACOES_SINDICAIS.value.majoracao >= 0)) {
    erros.push("Majoração das quotizações sindicais negativa.");
  }
  const majDep = LIMITE_GLOBAL_MAJORACAO_DEPENDENTES.value;
  if (!(Number.isInteger(majDep.minDependentes) && majDep.minDependentes >= 1)) {
    erros.push("Majoração do limite global: número mínimo de dependentes inválido.");
  }
  if (!isRate(majDep.porDependente)) {
    erros.push("Majoração do limite global por dependente inválida.");
  }
  // ── Taxas de IRS das regiões autónomas ──────────────────────────────
  //  A tabela abaixo é a PUBLICADA para 2026 (Agenda da OCC), transcrita
  //  aqui com um único propósito: provar que a derivação «taxa nacional
  //  menos 30%» reproduz a lei, escalão a escalão. Não é a fonte de verdade
  //  — é a testemunha. Se um orçamento regional mudar o diferencial, ou se
  //  alguém mexer nos escalões nacionais sem pensar nas regiões, isto parte
  //  o build em vez de servir em silêncio um imposto errado.
  const TAXAS_REGIOES_2026 = [0.0875, 0.1099, 0.1484, 0.1687, 0.2177, 0.2443, 0.3017, 0.3122, 0.336];
  for (const reg of ["madeira", "acores"] as const) {
    const reducao = REDUCAO_IRS_REGIOES_AUTONOMAS.value[reg];
    if (!isRate(reducao) || reducao > 0.3) {
      erros.push(`Redução de IRS (${reg}): fora de [0, 0.30] — a Lei das Finanças das Regiões Autónomas limita o diferencial a 30%.`);
      continue;
    }
    const derivados = escaloesIRSDaRegiao(reg);
    if (derivados.length !== ESCALOES_IRS.value.length) {
      erros.push(`Escalões de IRS (${reg}): número de escalões diferente do nacional.`);
      continue;
    }
    derivados.forEach((e, i) => {
      if (e.ate !== ESCALOES_IRS.value[i].ate) {
        erros.push(`Escalões de IRS (${reg}) escalão ${i + 1}: a lei regional baixa a taxa, não o limite do escalão.`);
      }
      if (!isRate(e.taxa)) {
        erros.push(`Escalões de IRS (${reg}) escalão ${i + 1}: taxa fora de [0,1].`);
      }
      if (Math.abs(e.taxa - TAXAS_REGIOES_2026[i]) > 1e-9) {
        erros.push(
          `Escalões de IRS (${reg}) escalão ${i + 1}: a derivação dá ${(e.taxa * 100).toFixed(2)}% mas a tabela publicada para 2026 diz ${(TAXAS_REGIOES_2026[i] * 100).toFixed(2)}%.`
        );
      }
    });
  }

  // Valida as tabelas de retenção das três regiões. Nota: a taxa marginal NÃO é
  // necessariamente crescente entre escalões (ex.: Tabela I da Madeira desce de
  // 30,28% para 28,02%), por isso só se valida o domínio [0,1] e o limite crescente.
  for (const reg of Object.keys(RETENCAO_DEP_POR_REGIAO) as Regiao[]) {
    for (const [nome, tab] of Object.entries(RETENCAO_DEP_POR_REGIAO[reg])) {
      const t = tab.escaloes;
      if (tab.parcelaDependente < 0) erros.push(`Retenção cat. A (${reg}/${nome}): parcela por dependente negativa.`);
      let ateAnt = -1;
      t.forEach((e, i) => {
        if (!isRate(e.taxa)) erros.push(`Retenção cat. A (${reg}/${nome}) escalão ${i + 1}: taxa fora de [0,1].`);
        if (!(e.ate > ateAnt)) erros.push(`Retenção cat. A (${reg}/${nome}) escalão ${i + 1}: limite não crescente.`);
        // parcelaAbater: número ≥ 0, ou fórmula { coef>0, base>0 } (mínimo de existência).
        const pa = e.parcelaAbater;
        if (typeof pa === "number") {
          if (!(pa >= 0)) erros.push(`Retenção cat. A (${reg}/${nome}) escalão ${i + 1}: parcelaAbater negativa.`);
        } else if (!(pa.coef > 0 && pa.base > 0)) {
          erros.push(`Retenção cat. A (${reg}/${nome}) escalão ${i + 1}: parcelaAbater {coef,base} inválida.`);
        }
        ateAnt = e.ate;
      });
      if (t[t.length - 1].ate !== Infinity) erros.push(`Retenção cat. A (${reg}/${nome}): último escalão deve ser Infinity.`);
    }
  }

  // 5b) Coerência do Salário Mínimo Nacional (SMN / RMMG). Estes cross-checks
  //     teriam bloqueado a contradição "870 vs 920" que existia no ficheiro.
  if (!(SMN.value > 0)) erros.push("SMN não positivo.");
  // Art. 70.º, n.º 1: o valor de referência é o MAIOR de (piso fixo; 1,5×14×IAS).
  // A invariante segue a lei, não a coincidência de 2026 com a RMMG × 14 — assim
  // continua a valer quando o braço indexado ao IAS ultrapassar o piso.
  const minimoExistenciaEsperado =
    Math.round(
      Math.max(
        MINIMO_EXISTENCIA_PISO,
        MINIMO_EXISTENCIA_IAS_MULT * MINIMO_EXISTENCIA_IAS_MESES * IAS.value
      ) * 100
    ) / 100;
  if (Math.abs(MINIMO_EXISTENCIA.value - minimoExistenciaEsperado) > EPS) {
    erros.push(
      `Mínimo de existência (${MINIMO_EXISTENCIA.value}) deve ser máx(${MINIMO_EXISTENCIA_PISO}; 1,5 × 14 × IAS) = ${minimoExistenciaEsperado}.`
    );
  }
  if (RETENCAO_DEP_ISENCAO.value !== SMN.value) {
    erros.push(`Limiar de isenção de retenção (${RETENCAO_DEP_ISENCAO.value}) deve acompanhar o SMN (${SMN.value}).`);
  }

  // 5c) Adicional de solidariedade (Art. 68.º-A CIRS): limiares e taxas crescentes.
  if (!(ADICIONAL_SOLIDARIEDADE.limiar1.value < ADICIONAL_SOLIDARIEDADE.limiar2.value)) {
    erros.push("Adicional de solidariedade: 1.º limiar deve ser menor que o 2.º.");
  }
  if (!(ADICIONAL_SOLIDARIEDADE.taxa1.value < ADICIONAL_SOLIDARIEDADE.taxa2.value)) {
    erros.push("Adicional de solidariedade: 1.ª taxa deve ser menor que a 2.ª.");
  }
  if (!isRate(ADICIONAL_SOLIDARIEDADE.taxa1.value) || !isRate(ADICIONAL_SOLIDARIEDADE.taxa2.value)) {
    erros.push("Adicional de solidariedade: taxa inválida.");
  }
  if (RETENCAO_DEP_CONTINENTE_T1.value[0].ate !== SMN.value) {
    erros.push(`1.º escalão de retenção Tabela I (${RETENCAO_DEP_CONTINENTE_T1.value[0].ate}) deve igualar o SMN (${SMN.value}).`);
  }

  // 5c-bis) Programa Regressar (Art. 12.º-A CIRS). O teto é definido POR
  // REMISSÃO para o Art. 68.º-A — se alguém o escrever à mão e o adicional de
  // solidariedade mudar, ficam dois números a dizer coisas diferentes sobre a
  // mesma norma. A invariante prende-os um ao outro.
  if (!isRate(PROGRAMA_REGRESSAR.exclusao.value) || PROGRAMA_REGRESSAR.exclusao.value <= 0) {
    erros.push("Programa Regressar: percentagem de exclusão inválida.");
  }
  if (PROGRAMA_REGRESSAR_TETO_CALC !== ADICIONAL_SOLIDARIEDADE.limiar2.value) {
    erros.push(
      `Teto do Art. 12.º-A (${PROGRAMA_REGRESSAR_TETO_CALC}) deve ser o limite superior do 1.º escalão do Art. 68.º-A (${ADICIONAL_SOLIDARIEDADE.limiar2.value}).`
    );
  }
  if (!(PROGRAMA_REGRESSAR.anos.value > 0)) {
    erros.push("Programa Regressar: duração em anos não positiva.");
  }

  // 5b) Direitos, cobranças e proteção social — invariantes dos parâmetros novos.
  //     Estes números alimentam os Guias; se algum ficar incoerente, é melhor
  //     falhar o build do que publicar um guia que engana quem o lê.
  if (!(JUROS_MORA.outrosCreditosComerciais.value < JUROS_MORA.transacoesComerciais.value)) {
    erros.push(
      "Juros de mora: a taxa das transações comerciais (DL 62/2013) tem de ser superior à dos restantes créditos comerciais."
    );
  }
  if (![JUROS_MORA.transacoesComerciais, JUROS_MORA.outrosCreditosComerciais, JUROS_MORA.civis].every((j) => isRate(j.value))) {
    erros.push("Juros de mora: taxa fora do intervalo [0,1].");
  }
  if (!isIsoDate(JUROS_MORA.vigenciaComercialAte)) {
    erros.push("Juros de mora: `vigenciaComercialAte` não é uma data ISO — as taxas comerciais são semestrais e a vigência é obrigatória.");
  }
  if (Math.abs(PENHORA_TETO_CALC - PENHORA.tetoSalariosMinimos.value * SMN.value) > EPS) {
    erros.push("Penhora: o teto derivado não bate com três salários mínimos.");
  }
  if (!(PENHORA_PISO_CALC < PENHORA_TETO_CALC)) {
    erros.push("Penhora: o piso de impenhorabilidade tem de ser inferior ao teto.");
  }
  if (Math.abs(PRESTACOES_ALARGAMENTO_LIMIAR_EUR - PLANO_PRESTACOES.alargamentoLimiarUC.value * UNIDADE_CONTA.value) > EPS) {
    erros.push("Prestações: o limiar em euros não bate com 500 × unidade de conta.");
  }
  if (!(PLANO_PRESTACOES.automaticoSingulares.value < PLANO_PRESTACOES.automaticoColetivas.value)) {
    erros.push("Plano oficioso (Art. 198.º-A CPPT): o limiar das pessoas singulares tem de ser inferior ao das coletivas.");
  }
  {
    const esc = SUBSIDIO_DOENCA.escaloes.value;
    if (esc.at(-1)?.ateDias !== Infinity) {
      erros.push("Subsídio de doença: o último escalão tem de ser aberto (Infinity).");
    }
    for (let i = 1; i < esc.length; i++) {
      if (!(esc[i].ateDias > esc[i - 1].ateDias) || !(esc[i].taxa > esc[i - 1].taxa)) {
        erros.push("Subsídio de doença: escalões têm de ser crescentes em dias e em taxa.");
        break;
      }
    }
    if (!esc.every((e) => isRate(e.taxa))) erros.push("Subsídio de doença: taxa fora do intervalo [0,1].");
  }
  if (!LICENCA_PARENTAL.modalidades.value.every((mod) => isRate(mod.taxa) && mod.dias > 0)) {
    erros.push("Licença parental: modalidade com taxa fora de [0,1] ou duração não positiva.");
  }
  if (!(SUBSIDIO_DESEMPREGO.minimoIAS.value < SUBSIDIO_DESEMPREGO.maximoIAS.value)) {
    erros.push("Subsídio de desemprego: o mínimo em IAS tem de ser inferior ao máximo.");
  }
  if (!(SUBSIDIO_DESEMPREGO.duracaoMinimaDias.value < SUBSIDIO_DESEMPREGO.duracaoMaximaDias.value)) {
    erros.push("Subsídio de desemprego: duração mínima tem de ser inferior à máxima.");
  }
  {
    const t = COMPENSACAO_CESSACAO.transitorios.value;
    if (t.at(-1)?.ate !== null) {
      erros.push("Compensação por cessação: a última tranche transitória tem de ser aberta (`ate: null`).");
    }
    if (t.at(-1)?.diasPorAno !== COMPENSACAO_CESSACAO.diasPorAno.value) {
      erros.push("Compensação por cessação: a tranche em vigor tem de coincidir com `diasPorAno`.");
    }
  }
  if (!(TRABALHO_NOTURNO.horaInicio.value > TRABALHO_NOTURNO.horaFim.value)) {
    erros.push("Trabalho noturno: o período tem de atravessar a meia-noite (início > fim).");
  }
  if (!isRate(TRABALHO_NOTURNO.acrescimo.value)) {
    erros.push("Trabalho noturno: acréscimo fora do intervalo [0,1].");
  }
  if (Math.abs(SS_MOE.baseMinimaIAS.value * IAS.value - MOE_BASE_MINIMA_MENSAL.value) > EPS) {
    erros.push("Base mínima dos MOE: o múltiplo do IAS e o valor em euros divergiram.");
  }
  if (Math.abs(SS_MOE.trabalhador.value - SS_DEPENDENTE.trabalhador.value) > EPS
    || Math.abs(SS_MOE.entidade.value - SS_DEPENDENTE.entidade.value) > EPS) {
    erros.push("SS de membros de órgãos estatutários: as taxas divergiram das do regime geral sem justificação registada.");
  }
  if (!(PAGAMENTOS_CONTA_IRC.taxaAte500k.value < PAGAMENTOS_CONTA_IRC.taxaAcima500k.value)) {
    erros.push("Pagamentos por conta de IRC: a taxa até 500 000 € tem de ser inferior à taxa acima.");
  }
  if (PAGAMENTOS_CONTA_IRC.meses.value.length !== PAGAMENTOS_CONTA_IRC.numero.value) {
    erros.push("Pagamentos por conta de IRC: o número de meses não coincide com o número de pagamentos.");
  }
  if (!isRate(PREJUIZOS_FISCAIS.limitePercentagemLucro.value)) {
    erros.push("Prejuízos fiscais: limite fora do intervalo [0,1].");
  }
  if (!isRate(RESERVA_LEGAL.percentagemLucro.value) || !isRate(RESERVA_LEGAL.limiteCapital.value)) {
    erros.push("Reserva legal: percentagem fora do intervalo [0,1].");
  }
  {
    const mmdd = /^\d{2}-\d{2}$/;
    for (const [k, p] of Object.entries(PRAZOS_ANUAIS_EMPRESA)) {
      if (!mmdd.test(p.value)) erros.push(`Prazos anuais da empresa: \`${k}\` não está no formato MM-DD.`);
    }
    if (!(PRAZOS_ANUAIS_EMPRESA.aprovacaoContas.value < PRAZOS_ANUAIS_EMPRESA.modelo22.value
      && PRAZOS_ANUAIS_EMPRESA.modelo22.value < PRAZOS_ANUAIS_EMPRESA.ies.value)) {
      erros.push("Prazos anuais da empresa: a ordem aprovação de contas → Modelo 22 → IES está trocada.");
    }
  }

  // 6) Proveniência obrigatória: fonte registada + data válida em cada parâmetro.
  const sourced: readonly Sourced<unknown>[] = PARAMETROS_AUDITADOS;
  sourced.forEach((p) => {
    if (!(p.source in SOURCES)) erros.push(`Fonte não registada: ${p.legalBasis}.`);
    if (!isIsoDate(p.lastVerified)) erros.push(`Data de verificação inválida: ${p.legalBasis}.`);
    // A data global de revisão é a que a UI mostra na secção «Fontes». Se um
    // parâmetro foi verificado depois dela, a data mostrada está a subestimar o
    // trabalho feito — e, pior, sinaliza que alguém atualizou um valor sem
    // atualizar a revisão. Só se compara quando ambas as datas são válidas.
    else if (isIsoDate(DATA_LAST_REVIEW) && p.lastVerified > DATA_LAST_REVIEW) {
      erros.push(
        `Parâmetro verificado (${p.lastVerified}) depois da última revisão (${DATA_LAST_REVIEW}): ${p.legalBasis}. Atualizar DATA_LAST_REVIEW.`
      );
    }
  });

  if (erros.length > 0) {
    throw new Error(
      `[fiscal-data] Dados fiscais inconsistentes — build bloqueado:\n - ${erros.join("\n - ")}`
    );
  }
}

// Corre na importação do módulo: qualquer página que o use falha o build
// caso os dados estejam inconsistentes. É esta a garantia de integridade.
assertFiscalDataIntegrity();
