// ═══════════════════════════════════════════════════════════════════════
//  AFIRMAÇÕES LEGAIS DOS GUIAS (LegalClaim)
//  ---------------------------------------------------------------------
//  Cada afirmação relevante publicada num Guia liga-se AQUI a:
//    · a(s) fonte(s) oficial(is) que a fundamenta(m);
//    · ou a uma `ruleKey` do motor fiscal (o número vem de fiscal-data.ts).
//
//  Regra 7.2/5 da auditoria: toda a afirmação quantitativa tem de ter
//  `ruleKey` OU fonte + vigência próprias. `assertClaimsIntegrity()` faz
//  o build falhar se isso não acontecer.
//
//  Desvio consciente face ao esboço da auditoria: o campo `appliesTo` do
//  esboço era `string[]` sobre um `appliesFrom` que é data. Aqui separam-se
//  os dois eixos — `appliesUntil` (vigência) e `appliesTo` (públicos) —
//  porque misturá-los tornava o registo impossível de validar.
// ═══════════════════════════════════════════════════════════════════════

import { FISCAL_YEAR } from "@/lib/fiscal-year";
import { LEGAL_SOURCES, type LegalSourceId } from "./legal-sources";

export type Confidence =
  | "verified" // confirmada em fonte oficial na data de revisão
  | "review_required" // depende do caso concreto — exige revisão especializada
  | "illustrative"; // exemplo pedagógico, nunca apresentado como regra

export type ReviewSeverity = "critical" | "high" | "normal";

export type GuideAudience = "TI" | "ENI" | "COMPANY" | "EMPLOYEE" | "MIXED";

export interface LegalClaim {
  id: string;
  guideId: string;
  /** Chave do motor fiscal quando o número é calculado, não escrito. */
  ruleKey?: string;
  statement: string;
  sourceIds: LegalSourceId[];
  appliesFrom: string;
  appliesUntil?: string;
  /** Públicos a que a afirmação se aplica. Vazio = todos. */
  appliesTo?: GuideAudience[];
  confidence: Confidence;
  reviewSeverity: ReviewSeverity;
  /** Nota editorial: porque é que a afirmação foi escrita assim. */
  nota?: string;
}

const DE = `${FISCAL_YEAR}-01-01`;

export const LEGAL_CLAIMS: LegalClaim[] = [
  // ══ Direitos e cobranças ═══════════════════════════════════════════
  //  Todas verificadas contra o articulado no Portal das Finanças e no
  //  Diário da República a 2026-07-27. Marcadas com severidade alta ou
  //  crítica: são regras de prazo, e um prazo mal escrito faz perder um
  //  direito que não se recupera.

  // ── fatura-nao-paga ──────────────────────────────────────────────────
  { id: "fatura-nao-paga.momento-irs", guideId: "fatura-nao-paga", statement: "Os rendimentos da categoria B ficam sujeitos a tributação desde o momento em que, para efeitos de IVA, é obrigatória a emissão de fatura — e não desde o recebimento. Só quando a fatura não é obrigatória é que releva o momento do pagamento.", sourceIds: ["cirs3"], appliesFrom: DE, appliesTo: ["TI", "ENI"], confidence: "verified", reviewSeverity: "critical", nota: "Art. 3.º, n.º 6 CIRS. É a norma que explica o caso mais frequente e mais mal compreendido: dever IRS de dinheiro que ainda não entrou." },
  { id: "fatura-nao-paga.prazo-fatura", guideId: "fatura-nao-paga", statement: "A fatura deve ser emitida, o mais tardar, no 5.º dia útil seguinte ao momento em que o imposto é devido.", sourceIds: ["civa36"], appliesFrom: DE, confidence: "verified", reviewSeverity: "high", nota: "Art. 36.º, n.º 1, al. a) CIVA. Atrasar a fatura para adiar o imposto é contraordenação, não planeamento." },
  { id: "fatura-nao-paga.juros-automaticos", guideId: "fatura-nao-paga", statement: "Nas transações comerciais, o credor tem direito a juros de mora sem necessidade de interpelação, a contar do dia seguinte ao vencimento.", sourceIds: ["dl62_2013"], appliesFrom: DE, confidence: "verified", reviewSeverity: "high" },

  // ── juros-de-mora ────────────────────────────────────────────────────
  { id: "juros-de-mora.prazo-supletivo", guideId: "juros-de-mora", statement: "Quando o contrato não fixa data de vencimento, o prazo de pagamento é de 30 dias a contar da receção da fatura — ou da receção efetiva dos bens ou serviços, quando a data da fatura for incerta.", sourceIds: ["dl62_2013"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical", nota: "Art. 4.º, n.º 3 do DL 62/2013." },
  { id: "juros-de-mora.sem-interpelacao", guideId: "juros-de-mora", statement: "Os juros de mora vencem-se automaticamente, sem ser preciso enviar qualquer aviso ao devedor.", sourceIds: ["dl62_2013"], appliesFrom: DE, confidence: "verified", reviewSeverity: "high", nota: "Art. 4.º, n.º 2 do DL 62/2013." },
  { id: "juros-de-mora.indemnizacao-40", guideId: "juros-de-mora", statement: "Além dos juros, o credor tem direito a um montante mínimo de 40 € a título de indemnização pelos custos de cobrança, também sem necessidade de interpelação.", sourceIds: ["dl62_2013"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical", nota: "Art. 7.º do DL 62/2013. Valor fixo definido no diploma, não indexado — por isso é uma afirmação com fonte própria e não uma regra do motor fiscal." },

  // ── cobrar-divida ────────────────────────────────────────────────────
  { id: "cobrar-divida.injuncao-valor", guideId: "cobrar-divida", statement: "A injunção destina-se a obrigações pecuniárias emergentes de contratos de valor não superior a 15 000 €; tratando-se de transações comerciais, é admissível independentemente do valor.", sourceIds: ["dl269_98", "dl62_2013"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical", nota: "DL 269/98, com a extensão às transações comerciais. O limite de valor é a dúvida mais comum e a que mais leva a desistir sem razão." },
  { id: "cobrar-divida.titulo-executivo", guideId: "cobrar-divida", statement: "A injunção não é uma ação judicial declarativa: serve para conferir força executiva ao requerimento quando o devedor não deduz oposição.", sourceIds: ["dl269_98"], appliesFrom: DE, confidence: "verified", reviewSeverity: "high" },

  // ── recuperar-iva-incobravel ─────────────────────────────────────────
  { id: "recuperar-iva.base", guideId: "recuperar-iva-incobravel", statement: "O sujeito passivo pode deduzir o imposto respeitante a créditos considerados de cobrança duvidosa, evidenciados como tal na contabilidade, bem como o respeitante a créditos incobráveis.", sourceIds: ["civa78a"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical", nota: "Art. 78.º-A, n.º 1 CIVA." },
  { id: "recuperar-iva.mora-12-meses", guideId: "recuperar-iva-incobravel", statement: "Consideram-se de cobrança duvidosa os créditos em mora há mais de 12 meses desde a data do vencimento, havendo provas objetivas de imparidade e de terem sido efetuadas diligências para o seu recebimento.", sourceIds: ["civa78a"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical", nota: "Art. 78.º-A, n.º 2, al. a) CIVA." },
  { id: "recuperar-iva.mora-6-meses", guideId: "recuperar-iva-incobravel", statement: "Há uma via mais curta — mora superior a 6 meses — para créditos de valor não superior a 750 €, IVA incluído, quando o devedor é particular ou sujeito passivo que realiza exclusivamente operações isentas sem direito à dedução.", sourceIds: ["civa78a"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical", nota: "Art. 78.º-A, n.º 2, al. b) CIVA." },
  { id: "recuperar-iva.prova", guideId: "recuperar-iva-incobravel", statement: "A regularização depende de documentação de suporte e, nos casos previstos na lei, de pedido de autorização prévia à Autoridade Tributária.", sourceIds: ["civa78b", "civa78d"], appliesFrom: DE, confidence: "review_required", reviewSeverity: "critical", nota: "O procedimento concreto varia com o tipo de crédito e o valor; é matéria de contabilista certificado, não de auto-serviço." },

  // ── iva-de-caixa ─────────────────────────────────────────────────────
  { id: "iva-de-caixa.mecanismo", guideId: "iva-de-caixa", statement: "No regime de IVA de caixa o imposto das operações ativas só se torna exigível no momento do recebimento do cliente; em contrapartida, o IVA suportado nas compras só é dedutível depois de essas faturas serem pagas.", sourceIds: ["dl71_2013"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical", nota: "É a contrapartida que costuma ser omitida: o regime não é só vantagem de tesouraria." },
  { id: "iva-de-caixa.limiar", guideId: "iva-de-caixa", statement: "O limiar de volume de negócios para aceder ao regime foi elevado para 2 000 000 €, com efeitos a partir de 1 de julho de 2025.", sourceIds: ["dl34_2025", "dl71_2013"], appliesFrom: "2025-07-01", confidence: "verified", reviewSeverity: "critical", nota: "DL 34/2025, de 24 de março. O Diário da República serve o diploma por aplicação OutSystems, pelo que o texto do articulado não é legível por monitor automático — este valor está sinalizado como crítico para confirmação na revisão fiscal humana." },
  { id: "iva-de-caixa.opcao", guideId: "iva-de-caixa", statement: "A adesão é opcional e exerce-se por comunicação à Autoridade Tributária; não é um regime automático nem se pode entrar e sair a meio do ano a qualquer momento.", sourceIds: ["dl71_2013", "portalFinancas"], appliesFrom: DE, confidence: "review_required", reviewSeverity: "high", nota: "As datas concretas da opção e da renúncia dependem do enquadramento — confirmar no Portal das Finanças antes de agir." },

  // ── contestar-liquidacao ─────────────────────────────────────────────
  { id: "contestar.graciosa-120", guideId: "contestar-liquidacao", statement: "A reclamação graciosa pode ser deduzida com os mesmos fundamentos da impugnação judicial e apresenta-se no prazo de 120 dias contados a partir dos factos previstos no n.º 1 do artigo 102.º do CPPT.", sourceIds: ["cppt70", "cppt102"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical", nota: "Art. 70.º, n.º 1 CPPT." },
  { id: "contestar.impugnacao-3-meses", guideId: "contestar-liquidacao", statement: "A impugnação judicial apresenta-se no prazo de três meses contados dos factos enumerados no n.º 1 do artigo 102.º do CPPT, entre os quais o termo do prazo de pagamento voluntário.", sourceIds: ["cppt102"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical", nota: "Art. 102.º, n.º 1 CPPT." },

  // ── prazos-fiscais-divida ────────────────────────────────────────────
  { id: "prazos-divida.caducidade-4", guideId: "prazos-fiscais-divida", statement: "O direito de liquidar os tributos caduca se a liquidação não for validamente notificada ao contribuinte no prazo de quatro anos, quando a lei não fixar outro.", sourceIds: ["lgt45"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical", nota: "Art. 45.º, n.º 1 LGT." },
  { id: "prazos-divida.prescricao-8", guideId: "prazos-fiscais-divida", statement: "As dívidas tributárias prescrevem no prazo de oito anos; nos impostos periódicos contam-se do termo do ano em que ocorreu o facto tributário e, no IVA e nas retenções a título definitivo, do início do ano civil seguinte.", sourceIds: ["lgt48"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical", nota: "Art. 48.º, n.º 1 LGT." },
  { id: "prazos-divida.distincao", guideId: "prazos-fiscais-divida", statement: "Caducidade e prescrição são coisas distintas: a primeira limita o tempo para liquidar o imposto, a segunda o tempo para cobrar a dívida já liquidada. Os prazos suspendem-se e interrompem-se em casos previstos na lei.", sourceIds: ["lgt45", "lgt48"], appliesFrom: DE, confidence: "review_required", reviewSeverity: "critical", nota: "As causas de suspensão e interrupção dependem do processo concreto e são a razão pela qual quase nunca se pode concluir a prescrição só com uma conta de anos." },

  // ── juros-indemnizatorios ────────────────────────────────────────────
  { id: "juros-indem.direito", guideId: "juros-indemnizatorios", statement: "São devidos juros indemnizatórios quando se determine, em reclamação graciosa ou impugnação judicial, que houve erro imputável aos serviços de que resultou pagamento de dívida tributária em montante superior ao legalmente devido.", sourceIds: ["lgt43"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical", nota: "Art. 43.º, n.º 1 LGT. É o espelho dos juros de mora: quando o erro é do Estado, é o Estado que paga." },
  { id: "juros-indem.orientacoes", guideId: "juros-indemnizatorios", statement: "Considera-se também haver erro imputável aos serviços quando, apesar de a liquidação assentar na declaração do contribuinte, este seguiu orientações genéricas da administração tributária devidamente publicadas.", sourceIds: ["lgt43"], appliesFrom: DE, confidence: "verified", reviewSeverity: "high" },

  // ── execucao-fiscal ──────────────────────────────────────────────────
  { id: "execucao.suspensao", guideId: "execucao-fiscal", statement: "A execução fiscal suspende-se, até decisão, quando esteja a discutir-se a legalidade da dívida exequenda, desde que tenha sido constituída ou prestada garantia, ou a penhora garanta a totalidade da quantia exequenda e do acrescido.", sourceIds: ["cppt169"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical", nota: "Art. 169.º, n.º 1 CPPT. Contestar, por si só, não trava a cobrança — é o erro mais caro nesta matéria." },
  { id: "execucao.prescricao", guideId: "execucao-fiscal", statement: "A dívida em execução não é eterna, mas a contagem da prescrição suspende-se e interrompe-se com factos do próprio processo, como a citação.", sourceIds: ["lgt48"], appliesFrom: DE, confidence: "review_required", reviewSeverity: "critical" },

  // ── plano-prestacoes ─────────────────────────────────────────────────
  { id: "prestacoes.limite-36", guideId: "plano-prestacoes", statement: "O pagamento em prestações é autorizado, em regra, até ao limite máximo de 36 prestações mensais, quando se demonstre que a situação económica do devedor não lhe permite solver a dívida de uma só vez.", sourceIds: ["cppt196"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical", nota: "Art. 196.º, n.º 4 CPPT." },
  { id: "prestacoes.alargamento", guideId: "plano-prestacoes", statement: "Em caso de notória dificuldade financeira e previsíveis consequências económicas gravosas, o número de prestações pode ser alargado até cinco anos, se a dívida exceder 500 unidades de conta.", sourceIds: ["cppt196"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical", nota: "Art. 196.º, n.º 5 CPPT." },

  // ── suspender-execucao ───────────────────────────────────────────────
  { id: "suspender.garantia", guideId: "suspender-execucao", statement: "A suspensão da execução depende da constituição ou prestação de garantia, ou de a penhora já garantir a totalidade da quantia exequenda e do acrescido.", sourceIds: ["cppt169", "cppt199"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical" },
  { id: "suspender.dispensa", guideId: "suspender-execucao", statement: "A lei prevê a possibilidade de dispensa de garantia, mas depende de pressupostos próprios que têm de ser alegados e provados pelo executado.", sourceIds: ["cppt199"], appliesFrom: DE, confidence: "review_required", reviewSeverity: "critical", nota: "A dispensa não é automática nem se presume: é matéria a tratar com apoio profissional e dentro do prazo." },

  // ── penhora-limites ──────────────────────────────────────────────────
  { id: "penhora.dois-tercos", guideId: "penhora-limites", statement: "São impenhoráveis dois terços da parte líquida dos vencimentos, salários, prestações periódicas pagas a título de aposentação ou de outra prestação de idêntica natureza que assegurem a subsistência do executado.", sourceIds: ["cpc738"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical", nota: "Art. 738.º, n.º 1 CPC." },
  { id: "penhora.teto-e-piso", guideId: "penhora-limites", statement: "A impenhorabilidade tem como limite máximo o equivalente a três salários mínimos nacionais à data de cada apreensão e, quando o executado não tenha outro rendimento, o limite mínimo é o equivalente a um salário mínimo nacional.", sourceIds: ["cpc738"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical", nota: "Art. 738.º, n.º 3 CPC." },
  { id: "penhora.parte-liquida", guideId: "penhora-limites", statement: "Na determinação da parte líquida do rendimento apenas são considerados os descontos legalmente obrigatórios.", sourceIds: ["cpc738"], appliesFrom: DE, confidence: "verified", reviewSeverity: "high", nota: "Art. 738.º, n.º 2 CPC." },

  // ── reversao-gerentes ────────────────────────────────────────────────
  { id: "reversao.alinea-a", guideId: "reversao-gerentes", statement: "Os gerentes e administradores respondem subsidiariamente pelas dívidas cujo facto constitutivo ocorreu no período do exercício do cargo, ou cujo prazo de pagamento terminou depois deste, quando por culpa sua o património da pessoa coletiva se tornou insuficiente para a sua satisfação.", sourceIds: ["lgt24"], appliesFrom: DE, appliesTo: ["COMPANY"], confidence: "verified", reviewSeverity: "critical", nota: "Art. 24.º, n.º 1, al. a) LGT — aqui o ónus da prova da culpa é da administração tributária." },
  { id: "reversao.alinea-b", guideId: "reversao-gerentes", statement: "Quando o prazo legal de pagamento terminou no período do exercício do cargo, os gerentes respondem salvo se provarem que não lhes foi imputável a falta de pagamento.", sourceIds: ["lgt24"], appliesFrom: DE, appliesTo: ["COMPANY"], confidence: "verified", reviewSeverity: "critical", nota: "Art. 24.º, n.º 1, al. b) LGT — aqui o ónus inverte-se e é o gerente que tem de provar. É a diferença que decide a maioria dos casos." },

  // ── falsos-recibos-verdes ────────────────────────────────────────────
  { id: "falsos-rv.presuncao", guideId: "falsos-recibos-verdes", statement: "O Código do Trabalho presume a existência de contrato de trabalho quando se verifiquem algumas das características enunciadas no seu Art. 12.º — entre elas o local e o horário determinados pelo beneficiário, os equipamentos pertencerem-lhe e o pagamento ser periódico.", sourceIds: ["ct"], appliesFrom: DE, confidence: "review_required", reviewSeverity: "critical", nota: "A presunção é ilidível e a qualificação depende sempre do caso concreto — nunca pode ser automatizada por um formulário. Ver também a falha 3.7 da auditoria." },
  { id: "falsos-rv.consequencia", guideId: "falsos-recibos-verdes", statement: "Se a presunção operar, a relação é tratada como contrato de trabalho, com as consequências laborais e contributivas correspondentes.", sourceIds: ["ct", "codigoContributivo"], appliesFrom: DE, confidence: "review_required", reviewSeverity: "critical" },

  // ── abrir-atividade ──────────────────────────────────────────────────
  { id: "abrir-atividade.declaracao", guideId: "abrir-atividade", statement: "A abertura de atividade faz-se por declaração de início de atividade entregue nas Finanças, presencialmente ou no Portal das Finanças.", sourceIds: ["govTrabIndependente", "portalFinancas"], appliesFrom: DE, confidence: "verified", reviewSeverity: "high" },
  { id: "abrir-atividade.coeficiente", guideId: "abrir-atividade", ruleKey: "COEFICIENTES", statement: "O coeficiente do regime simplificado depende da atividade declarada.", sourceIds: ["cirs31"], appliesFrom: DE, confidence: "verified", reviewSeverity: "high" },

  // ── ato-isolado ──────────────────────────────────────────────────────
  { id: "ato-isolado.sem-atividade", guideId: "ato-isolado", statement: "O ato isolado permite emitir um documento sem abrir atividade, desde que a prestação não seja previsível nem repetida.", sourceIds: ["govTrabIndependente"], appliesFrom: DE, confidence: "verified", reviewSeverity: "high" },
  { id: "ato-isolado.iva", guideId: "ato-isolado", ruleKey: "IVA_ISENCAO_LIMITE", statement: "O limite de isenção de IVA do Art. 53.º também releva para o ato isolado.", sourceIds: ["civa53"], appliesFrom: DE, confidence: "verified", reviewSeverity: "high" },

  // ── regime-simplificado ──────────────────────────────────────────────
  { id: "regime-simplificado.coeficientes", guideId: "regime-simplificado", ruleKey: "COEFICIENTES", statement: "No regime simplificado o rendimento tributável resulta da aplicação de um coeficiente à faturação.", sourceIds: ["cirs31"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical" },
  { id: "regime-simplificado.regra15", guideId: "regime-simplificado", ruleKey: "REGRA_15", statement: "A regra dos 15 % exige justificar despesas para a parte do coeficiente que corresponde a dedução presumida.", sourceIds: ["cirs31"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical" },

  // ── despesas-dedutiveis ──────────────────────────────────────────────
  { id: "despesas-dedutiveis.efatura", guideId: "despesas-dedutiveis", statement: "As despesas relevantes têm de estar comunicadas no e-Fatura e afetas à atividade.", sourceIds: ["cirs31", "eFatura"], appliesFrom: DE, confidence: "verified", reviewSeverity: "high" },

  // ── contabilidade-organizada ─────────────────────────────────────────
  { id: "contabilidade-organizada.opcao", guideId: "contabilidade-organizada", statement: "A determinação do rendimento pode fazer-se pelo regime simplificado ou com base na contabilidade organizada.", sourceIds: ["cirs28"], appliesFrom: DE, confidence: "verified", reviewSeverity: "high" },
  { id: "contabilidade-organizada.custo-cc", guideId: "contabilidade-organizada", statement: "O custo mensal de um contabilista certificado usado nas simulações é uma estimativa de mercado, não um valor legal.", sourceIds: ["cirs28"], appliesFrom: DE, confidence: "illustrative", reviewSeverity: "normal", nota: "Valor de mercado: apresentar sempre como estimativa configurável." },

  // ── retencao-na-fonte ────────────────────────────────────────────────
  { id: "retencao-na-fonte.taxas", guideId: "retencao-na-fonte", ruleKey: "RETENCAO", statement: "A taxa de retenção na fonte da categoria B depende da natureza da atividade.", sourceIds: ["cirs101"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical" },
  { id: "retencao-na-fonte.dispensa", guideId: "retencao-na-fonte", ruleKey: "DISPENSA_RETENCAO_LIMITE", statement: "Existe dispensa de retenção quando a estimativa anual de rendimentos não excede o limite legal.", sourceIds: ["cirs101b"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical" },
  { id: "retencao-na-fonte.nao-residente", guideId: "retencao-na-fonte", statement: "Um adquirente não residente sem estabelecimento estável em Portugal não é substituto tributário, pelo que não retém.", sourceIds: ["cirs101"], appliesFrom: DE, confidence: "verified", reviewSeverity: "high" },

  // ── pagamentos-por-conta ─────────────────────────────────────────────
  { id: "pagamentos-por-conta.regra", guideId: "pagamentos-por-conta", statement: "Os pagamentos por conta da categoria B são adiantamentos do IRS, com prazos fixados na lei.", sourceIds: ["cirs102"], appliesFrom: DE, confidence: "verified", reviewSeverity: "high" },

  // ── iva-recibos-verdes ───────────────────────────────────────────────
  { id: "iva.isencao53", guideId: "iva-recibos-verdes", ruleKey: "IVA_ISENCAO_LIMITE", statement: "O regime de isenção do Art. 53.º aplica-se abaixo do limite anual de volume de negócios.", sourceIds: ["civa53"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical" },
  { id: "iva.excesso", guideId: "iva-recibos-verdes", ruleKey: "IVA_ISENCAO_EXCESSO", statement: "Ultrapassar o limite majorado obriga a passar ao regime normal no decurso do ano.", sourceIds: ["civa53"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical" },
  { id: "iva.art9", guideId: "iva-recibos-verdes", statement: "As isenções do Art. 9.º (saúde, ensino) são distintas da isenção do Art. 53.º e não dependem do volume de negócios.", sourceIds: ["civa9"], appliesFrom: DE, confidence: "verified", reviewSeverity: "high" },
  { id: "iva.taxas", guideId: "iva-recibos-verdes", ruleKey: "IVA_TAXAS", statement: "As taxas de IVA diferem entre continente, Madeira e Açores.", sourceIds: ["civa18"], appliesFrom: DE, confidence: "verified", reviewSeverity: "high" },

  // ── seguranca-social ─────────────────────────────────────────────────
  { id: "ss.taxa", guideId: "seguranca-social", ruleKey: "SS_TAXA", statement: "A contribuição do trabalhador independente incide sobre uma base determinada a partir do rendimento relevante.", sourceIds: ["ssIndependentes", "codigoContributivo"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical" },
  // Falha 3.6 da auditoria: o Guia dizia "12 meses" para a parentalidade.
  {
    id: "ss.parentalidade",
    guideId: "seguranca-social",
    statement: "A proteção na parentalidade tem um prazo de garantia de 6 meses civis, seguidos ou interpolados, com registo de remunerações — e depende ainda de outras condições cumulativas, incluindo situação contributiva regularizada.",
    sourceIds: ["ssParentalidade"],
    appliesFrom: DE,
    confidence: "verified",
    reviewSeverity: "critical",
    nota: "Nunca reduzir a um número isolado: o prazo de garantia é uma de várias condições cumulativas.",
  },
  // Falha 3.6 da auditoria: o Guia dizia "24 meses de contribuições".
  {
    id: "ss.cessacao",
    guideId: "seguranca-social",
    statement: "O subsídio por cessação de atividade exige 360 dias de exercício de atividade independente economicamente dependente, com pagamento efetivo de contribuições, nos 24 meses imediatamente anteriores à cessação — além das restantes condições cumulativas.",
    sourceIds: ["ssCessacaoAtividade"],
    appliesFrom: DE,
    confidence: "verified",
    reviewSeverity: "critical",
    nota: "Distinguir prazo de garantia, período de referência e natureza da atividade.",
  },

  // ── acumulacao-emprego ───────────────────────────────────────────────
  // Falha 3.7 da auditoria: três conceitos distintos, três afirmações distintas.
  { id: "acumulacao.isencao-ss", guideId: "acumulacao-emprego", ruleKey: "IAS_VALUE", statement: "A dispensa de contribuições sobre os rendimentos independentes depende de condições cumulativas relativas ao empregador, ao cliente e ao valor dos rendimentos.", sourceIds: ["codigoContributivo", "ssIndependentes"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical" },
  {
    id: "acumulacao.entidade-contratante",
    guideId: "acumulacao-emprego",
    statement: "Uma entidade é qualificada como entidade contratante quando beneficia de pelo menos 50 % do valor total da atividade do trabalhador independente; a taxa aplicável varia consoante a concentração se situe entre 50 % e 80 % ou acima de 80 %.",
    sourceIds: ["ssEntidadeContratante", "codigoContributivo"],
    appliesFrom: DE,
    confidence: "verified",
    reviewSeverity: "critical",
    nota: "É uma obrigação DA ENTIDADE perante a Segurança Social — não uma conclusão sobre a natureza laboral do vínculo.",
  },
  {
    id: "acumulacao.presuncao-laboral",
    guideId: "acumulacao-emprego",
    statement: "A existência de contrato de trabalho depende dos indícios de subordinação jurídica previstos no Código do Trabalho e é apreciada caso a caso — não decorre automaticamente de uma percentagem de faturação.",
    sourceIds: ["ct"],
    appliesFrom: DE,
    confidence: "review_required",
    reviewSeverity: "critical",
    nota: "Nunca automatizar a conclusão laboral. Concentração de faturação é indício, não prova.",
  },

  // ── clientes-estrangeiros ────────────────────────────────────────────
  { id: "estrangeiros.localizacao", guideId: "clientes-estrangeiros", statement: "A localização das prestações de serviços determina onde o IVA é devido e depende de o adquirente ser sujeito passivo.", sourceIds: ["civa6"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical" },
  { id: "estrangeiros.vies", guideId: "clientes-estrangeiros", statement: "O número de IVA de um cliente da UE deve ser validado no VIES antes de aplicar a autoliquidação.", sourceIds: ["vies"], appliesFrom: DE, confidence: "verified", reviewSeverity: "high" },
  { id: "estrangeiros.retencao", guideId: "clientes-estrangeiros", statement: "Não há retenção na fonte quando o adquirente não é residente nem tem estabelecimento estável em Portugal.", sourceIds: ["cirs101"], appliesFrom: DE, confidence: "verified", reviewSeverity: "high" },

  // ── cessar-atividade ─────────────────────────────────────────────────
  { id: "cessar.iva", guideId: "cessar-atividade", statement: "A cessação de atividade para efeitos de IVA segue as regras do Art. 33.º CIVA.", sourceIds: ["civa33"], appliesFrom: DE, confidence: "verified", reviewSeverity: "high" },
  { id: "cessar.ss", guideId: "cessar-atividade", statement: "A cessação nas Finanças não dispensa a regularização da situação contributiva perante a Segurança Social.", sourceIds: ["ssIndependentes"], appliesFrom: DE, confidence: "verified", reviewSeverity: "high" },

  // ── fatura-vs-recibo ─────────────────────────────────────────────────
  { id: "fatura-recibo.documento", guideId: "fatura-vs-recibo", statement: "O documento a emitir depende de o pagamento já ter ocorrido: fatura quando não houve pagamento, fatura-recibo quando é simultâneo, recibo quando quita uma fatura anterior.", sourceIds: ["portalFinancas"], appliesFrom: DE, confidence: "verified", reviewSeverity: "high" },

  // ── merchant-of-record ───────────────────────────────────────────────
  // Falha 3.8 da auditoria: o Guia não tinha fontes e fazia afirmações absolutas.
  {
    id: "mor.qualificacao",
    guideId: "merchant-of-record",
    statement: "O tratamento fiscal de um payout de plataforma depende do contrato, de quem é o verdadeiro adquirente, do fluxo financeiro e do papel jurídico da plataforma — não existe uma resposta única.",
    sourceIds: ["civa6"],
    appliesFrom: DE,
    confidence: "review_required",
    reviewSeverity: "critical",
    nota: "Proibido prometer «um recibo por mês» sem validar a relação contratual concreta.",
  },
  {
    id: "mor.oss",
    guideId: "merchant-of-record",
    statement: "O regime aplicável às vendas à distância e serviços eletrónicos na UE é o Balcão Único (OSS), que substituiu o MOSS em 1 de julho de 2021.",
    sourceIds: ["ossUe", "civa6"],
    appliesFrom: DE,
    confidence: "verified",
    reviewSeverity: "high",
    nota: "A terminologia «MOSS» está ultrapassada na generalidade dos fluxos atuais.",
  },
  { id: "mor.precos", guideId: "merchant-of-record", statement: "As comissões e funcionalidades das plataformas são condições comerciais que mudam sem aviso e valem apenas como referência datada.", sourceIds: ["ossUe"], appliesFrom: DE, confidence: "illustrative", reviewSeverity: "normal" },

  // ── recibo-vencimento ────────────────────────────────────────────────
  // Falha 3.3 da auditoria: a fonte estava a apontar para um artigo bancário.
  { id: "vencimento.tabelas", guideId: "recibo-vencimento", ruleKey: "TABELAS_RETENCAO", statement: "As tabelas de retenção na fonte de IRS aplicáveis no continente em 2026 são as aprovadas pelo Despacho n.º 233-A/2026.", sourceIds: ["despachoRetencao2026", "despachoRetencao2026Dre"], appliesFrom: DE, appliesUntil: `${FISCAL_YEAR}-12-31`, appliesTo: ["EMPLOYEE"], confidence: "verified", reviewSeverity: "critical" },
  { id: "vencimento.deducao", guideId: "recibo-vencimento", statement: "O trabalho dependente tem uma dedução específica prevista no Art. 25.º CIRS.", sourceIds: ["cirs25"], appliesFrom: DE, appliesTo: ["EMPLOYEE"], confidence: "verified", reviewSeverity: "high" },
  { id: "vencimento.ss", guideId: "recibo-vencimento", statement: "A taxa contributiva do trabalhador por conta de outrem é retida pela entidade empregadora.", sourceIds: ["ssContaOutrem"], appliesFrom: DE, appliesTo: ["EMPLOYEE"], confidence: "verified", reviewSeverity: "high" },

  // ── subsidios-ferias-natal ───────────────────────────────────────────
  // Falha 3.5 da auditoria: o Art. 264.º-A não existe na versão consolidada.
  { id: "subsidios.natal", guideId: "subsidios-ferias-natal", statement: "O subsídio de Natal corresponde a um mês de retribuição e é pago até 15 de dezembro, com proporcionalidade nos casos previstos na lei.", sourceIds: ["ct263"], appliesFrom: DE, appliesTo: ["EMPLOYEE"], confidence: "verified", reviewSeverity: "critical" },
  { id: "subsidios.ferias", guideId: "subsidios-ferias-natal", statement: "O subsídio de férias compreende a retribuição base e as prestações que sejam contrapartida do modo específico de execução do trabalho, correspondentes à duração mínima das férias.", sourceIds: ["ct264"], appliesFrom: DE, appliesTo: ["EMPLOYEE"], confidence: "verified", reviewSeverity: "critical" },
  {
    id: "subsidios.duodecimos",
    guideId: "subsidios-ferias-natal",
    statement: "O pagamento do subsídio de férias em duodécimos depende de acordo escrito entre empregador e trabalhador e está limitado a 50 % do subsídio, devendo o remanescente ser pago antes do gozo das férias.",
    sourceIds: ["ct264"],
    appliesFrom: DE,
    appliesTo: ["EMPLOYEE"],
    confidence: "verified",
    reviewSeverity: "critical",
    nota: "Substitui a referência ao inexistente Art. 264.º-A. Os duodécimos são modalidade dependente do enquadramento contratual, não regra geral.",
  },

  // ── trabalho-suplementar ─────────────────────────────────────────────
  { id: "suplementar.acrescimos", guideId: "trabalho-suplementar", ruleKey: "TRABALHO_SUPLEMENTAR", statement: "O trabalho suplementar é pago com acréscimos sobre a retribuição horária, nos termos do Art. 268.º do Código do Trabalho.", sourceIds: ["ct268"], appliesFrom: DE, appliesTo: ["EMPLOYEE"], confidence: "verified", reviewSeverity: "critical" },
  { id: "suplementar.horaria", guideId: "trabalho-suplementar", statement: "A retribuição horária calcula-se pela fórmula legal do Código do Trabalho.", sourceIds: ["ct"], appliesFrom: DE, appliesTo: ["EMPLOYEE"], confidence: "verified", reviewSeverity: "high" },

  // ── abrir-empresa ────────────────────────────────────────────────────
  // Falha 3.4 da auditoria: identificador do CSC errado.
  { id: "abrir-empresa.formas", guideId: "abrir-empresa", statement: "As formas jurídicas societárias e as respetivas regras de responsabilidade constam do Código das Sociedades Comerciais.", sourceIds: ["csc"], appliesFrom: DE, appliesTo: ["COMPANY"], confidence: "verified", reviewSeverity: "critical" },
  { id: "abrir-empresa.na-hora", guideId: "abrir-empresa", statement: "A constituição pode ser feita presencialmente (Empresa na Hora) ou online (Empresa Online).", sourceIds: ["govEmpresaOnline", "eportugalEmpresaNaHora"], appliesFrom: DE, appliesTo: ["COMPANY"], confidence: "verified", reviewSeverity: "high" },
  // Falha 3.1: a taxa vinha de uma página com a redação até 2013 (25 %).
  { id: "abrir-empresa.irc", guideId: "abrir-empresa", ruleKey: "IRC_TAXAS", statement: "A tributação dos lucros da sociedade segue as taxas do Art. 87.º CIRC na redação em vigor.", sourceIds: ["circ87"], appliesFrom: DE, appliesTo: ["COMPANY"], confidence: "verified", reviewSeverity: "critical" },
  { id: "abrir-empresa.dividendos", guideId: "abrir-empresa", ruleKey: "DIVIDENDOS_TAXA", statement: "A distribuição de dividendos está sujeita a taxa liberatória, com opção de englobamento.", sourceIds: ["cirs71"], appliesFrom: DE, appliesTo: ["COMPANY"], confidence: "verified", reviewSeverity: "high" },

  // ── unipessoal-vs-eni ────────────────────────────────────────────────
  { id: "unipessoal.responsabilidade", guideId: "unipessoal-vs-eni", statement: "A sociedade unipessoal por quotas limita a responsabilidade ao património social; o empresário em nome individual responde com o património pessoal.", sourceIds: ["csc"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical" },
  { id: "unipessoal.tributacao", guideId: "unipessoal-vs-eni", ruleKey: "IRC_TAXAS", statement: "A sociedade é tributada em IRC; o trabalhador independente é tributado em IRS na categoria B.", sourceIds: ["circ87", "cirs31"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical" },

  // ── irc ──────────────────────────────────────────────────────────────
  { id: "irc.taxas", guideId: "irc", ruleKey: "IRC_TAXAS", statement: "As taxas de IRC, incluindo a taxa reduzida aplicável a PME sobre a primeira parcela de matéria coletável, constam do Art. 87.º CIRC.", sourceIds: ["circ87", "oe2026"], appliesFrom: DE, appliesTo: ["COMPANY"], confidence: "verified", reviewSeverity: "critical" },
  { id: "irc.pagamentos", guideId: "irc", statement: "Os pagamentos por conta de IRC seguem o Art. 104.º CIRC.", sourceIds: ["circ104"], appliesFrom: DE, appliesTo: ["COMPANY"], confidence: "verified", reviewSeverity: "high" },
  { id: "irc.modelo22", guideId: "irc", statement: "A declaração periódica de rendimentos (Modelo 22) é entregue nos termos do Art. 120.º CIRC.", sourceIds: ["circ120"], appliesFrom: DE, appliesTo: ["COMPANY"], confidence: "verified", reviewSeverity: "high" },

  // ── tributacao-autonoma ──────────────────────────────────────────────
  { id: "ta.taxas", guideId: "tributacao-autonoma", ruleKey: "TRIBUTACAO_AUTONOMA", statement: "As taxas de tributação autónoma e os escalões de custo de aquisição de viaturas constam do Art. 88.º CIRC na redação em vigor.", sourceIds: ["circ88", "oe2026"], appliesFrom: DE, appliesTo: ["COMPANY"], confidence: "verified", reviewSeverity: "critical" },
  { id: "ta.agravamento", guideId: "tributacao-autonoma", ruleKey: "TA_AGRAVAMENTO", statement: "O agravamento por prejuízo fiscal tem exceções previstas na lei.", sourceIds: ["circ88"], appliesFrom: DE, appliesTo: ["COMPANY"], confidence: "verified", reviewSeverity: "critical" },

  // ── calendario-fiscal ────────────────────────────────────────────────
  {
    id: "calendario.prazos",
    guideId: "calendario-fiscal",
    statement: "Os prazos apresentados são os prazos legais gerais. O estado real das obrigações de cada contribuinte só é conhecido nos serviços oficiais ou num operador com acesso à conta.",
    sourceIds: ["portalFinancas", "ssDireta"],
    appliesFrom: DE,
    confidence: "verified",
    reviewSeverity: "critical",
    nota: "Ponto 4.7 da auditoria: o ReciboCerto não mantém uma segunda verdade operacional.",
  },

  // ── escaloes-irs ─────────────────────────────────────────────────────
  { id: "escaloes.tabela", guideId: "escaloes-irs", ruleKey: "ESCALOES_IRS", statement: "As taxas gerais de IRS são progressivas por escalões, nos termos do Art. 68.º CIRS.", sourceIds: ["cirs68", "oe2026"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical" },
  { id: "escaloes.marginal", guideId: "escaloes-irs", statement: "Subir de escalão não aumenta o imposto sobre todo o rendimento — a taxa mais alta incide apenas sobre a parcela dentro desse escalão.", sourceIds: ["cirs68"], appliesFrom: DE, confidence: "verified", reviewSeverity: "high" },
  { id: "escaloes.minimo", guideId: "escaloes-irs", ruleKey: "MINIMO_EXISTENCIA", statement: "O mínimo de existência garante um rendimento líquido mínimo, nos termos do Art. 70.º CIRS.", sourceIds: ["cirs70"], appliesFrom: DE, confidence: "verified", reviewSeverity: "high" },

  // ── irs-jovem ────────────────────────────────────────────────────────
  { id: "irs-jovem.isencao", guideId: "irs-jovem", ruleKey: "IRS_JOVEM", statement: "O IRS Jovem isenta uma percentagem do rendimento das categorias A e B, decrescente ao longo dos anos de utilização, com limite máximo indexado ao IAS.", sourceIds: ["cirs12b"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical" },
  { id: "irs-jovem.historico", guideId: "irs-jovem", statement: "O ano de benefício depende do histórico de utilização do regime, não apenas da idade.", sourceIds: ["cirs12b"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical" },

  // ── ifici-nhr ────────────────────────────────────────────────────────
  { id: "ifici.taxa", guideId: "ifici-nhr", statement: "O IFICI aplica uma taxa especial de 20 % apenas aos rendimentos líquidos das categorias A e B auferidos nas atividades elegíveis.", sourceIds: ["ebf58a"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical", nota: "Dividendos de fonte portuguesa (cat. E) ficam de fora — nunca aplicar os 20 % a dividendos nacionais." },
  { id: "ifici.elegibilidade", guideId: "ifici-nhr", statement: "A elegibilidade depende da atividade, do enquadramento e da inscrição no regime — exige revisão especializada.", sourceIds: ["ebf58a"], appliesFrom: DE, confidence: "review_required", reviewSeverity: "critical" },

  // ── deducoes-coleta ──────────────────────────────────────────────────
  // Falha 3.2 da auditoria: a fonte apontava para o Art. 87.º (deficiência).
  { id: "deducoes.regras", guideId: "deducoes-coleta", ruleKey: "DEDUCOES_COLETA", statement: "As deduções à coleta e o respetivo limite global constam do Art. 78.º CIRS.", sourceIds: ["cirs78"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical" },
  { id: "deducoes.dependentes", guideId: "deducoes-coleta", ruleKey: "DEDUCAO_DEPENDENTES", statement: "A dedução por dependentes e ascendentes consta do Art. 78.º-A CIRS.", sourceIds: ["cirs78a"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical" },
  { id: "deducoes.gerais", guideId: "deducoes-coleta", statement: "A dedução por despesas gerais familiares consta do Art. 78.º-B CIRS.", sourceIds: ["cirs78b"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical" },
  { id: "deducoes.saude", guideId: "deducoes-coleta", statement: "A dedução por despesas de saúde consta do Art. 78.º-C CIRS.", sourceIds: ["cirs78c"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical" },
  { id: "deducoes.educacao", guideId: "deducoes-coleta", statement: "A dedução por despesas de formação e educação consta do Art. 78.º-D CIRS.", sourceIds: ["cirs78d"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical" },
  { id: "deducoes.imoveis", guideId: "deducoes-coleta", statement: "A dedução por encargos com imóveis consta do Art. 78.º-E CIRS.", sourceIds: ["cirs78e"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical" },
  { id: "deducoes.deficiencia", guideId: "deducoes-coleta", statement: "As deduções relativas a pessoas com deficiência constam do Art. 87.º CIRS e seguem regras próprias.", sourceIds: ["cirs87"], appliesFrom: DE, confidence: "verified", reviewSeverity: "high", nota: "Artigo distinto das deduções gerais — a confusão entre ambos era a falha 3.2." },

  // ── mais-valias ──────────────────────────────────────────────────────
  { id: "mais-valias.incidencia", guideId: "mais-valias", statement: "As mais-valias são rendimentos da categoria G, com regras de incidência no Art. 10.º CIRS.", sourceIds: ["cirs10"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical" },
  { id: "mais-valias.saldo", guideId: "mais-valias", statement: "O saldo entre mais e menos-valias apura-se nos termos do Art. 43.º CIRS.", sourceIds: ["cirs43"], appliesFrom: DE, confidence: "verified", reviewSeverity: "high" },
  { id: "mais-valias.taxas", guideId: "mais-valias", ruleKey: "MAIS_VALIAS_TAXA", statement: "As taxas especiais e a opção de englobamento constam do Art. 72.º CIRS.", sourceIds: ["cirs72"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical" },

  // ── tributacao-conjunta ──────────────────────────────────────────────
  { id: "conjunta.opcao", guideId: "tributacao-conjunta", statement: "Os sujeitos passivos casados ou unidos de facto podem optar pela tributação conjunta.", sourceIds: ["cirs13"], appliesFrom: DE, confidence: "verified", reviewSeverity: "high" },
  { id: "conjunta.quociente", guideId: "tributacao-conjunta", ruleKey: "QUOCIENTE_CONJUGAL", statement: "Na tributação conjunta aplica-se o quociente conjugal previsto no Art. 69.º CIRS.", sourceIds: ["cirs69"], appliesFrom: DE, confidence: "verified", reviewSeverity: "critical" },

  // ── reembolso-irs ────────────────────────────────────────────────────
  { id: "reembolso.prazo", guideId: "reembolso-irs", statement: "O pagamento e o reembolso do IRS seguem o Art. 97.º CIRS; a data efetiva depende da validação da declaração pela AT.", sourceIds: ["cirs97", "portalFinancas"], appliesFrom: DE, confidence: "verified", reviewSeverity: "high", nota: "Não prometer datas nem valores — o estado oficial é o da AT." },
];

// ─── Acesso ────────────────────────────────────────────────────────────

export function claimsDoGuia(guideId: string): LegalClaim[] {
  return LEGAL_CLAIMS.filter((c) => c.guideId === guideId);
}

export function claim(id: string): LegalClaim | undefined {
  return LEGAL_CLAIMS.find((c) => c.id === id);
}

/** Fontes oficiais efetivamente usadas por um Guia, sem repetições e na
    ordem em que aparecem nas afirmações. */
export function fonteIdsDoGuia(guideId: string): LegalSourceId[] {
  const vistos = new Set<LegalSourceId>();
  for (const c of claimsDoGuia(guideId)) for (const s of c.sourceIds) vistos.add(s);
  return [...vistos];
}

/** Um Guia está "em revisão" se alguma afirmação exigir revisão
    especializada ou se alguma fonte tiver sido marcada como alterada. */
export function guiaExigeRevisao(guideId: string): boolean {
  return claimsDoGuia(guideId).some(
    (c) =>
      c.confidence === "review_required" ||
      c.sourceIds.some((s) => LEGAL_SOURCES[s].status === "changed" || LEGAL_SOURCES[s].status === "unavailable"),
  );
}

// ─── Integridade ───────────────────────────────────────────────────────

export function assertClaimsIntegrity(): void {
  const erros: string[] = [];
  const ids = new Set<string>();

  for (const c of LEGAL_CLAIMS) {
    if (ids.has(c.id)) erros.push(`Afirmação "${c.id}": id duplicado.`);
    ids.add(c.id);

    if (c.sourceIds.length === 0) {
      erros.push(`Afirmação "${c.id}": nenhuma fonte oficial associada.`);
    }
    for (const s of c.sourceIds) {
      if (!(s in LEGAL_SOURCES)) erros.push(`Afirmação "${c.id}": fonte desconhecida "${s}".`);
    }
    if (!c.statement.trim()) erros.push(`Afirmação "${c.id}": statement vazio.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c.appliesFrom)) {
      erros.push(`Afirmação "${c.id}": appliesFrom tem de ser uma data ISO.`);
    }
    if (c.appliesUntil && c.appliesUntil < c.appliesFrom) {
      erros.push(`Afirmação "${c.id}": appliesUntil é anterior a appliesFrom.`);
    }
    // Uma afirmação vinda de fonte histórica só vale como comparação identificada.
    for (const s of c.sourceIds) {
      const fonte = LEGAL_SOURCES[s];
      if (fonte.status === "historical" && c.confidence === "verified") {
        erros.push(`Afirmação "${c.id}": fundamentada em fonte histórica ("${s}") mas marcada como verificada.`);
      }
    }
  }

  if (erros.length > 0) {
    throw new Error(`Afirmações legais inconsistentes:\n  · ${erros.join("\n  · ")}`);
  }
}

assertClaimsIntegrity();
