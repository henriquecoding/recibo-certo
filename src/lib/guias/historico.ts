// ═══════════════════════════════════════════════════════════════════════
//  HISTÓRICO EDITORIAL DOS GUIAS
//  ---------------------------------------------------------------------
//  Ponto 6.3/10 da auditoria: cada Guia mostra "o que mudou e desde quando".
//  Substitui a promessa genérica de "sempre atualizado" (ponto 4.8) por um
//  registo verificável.
//
//  Regra: uma entrada por alteração com efeito para o leitor. Correções de
//  estilo não entram aqui.
// ═══════════════════════════════════════════════════════════════════════

export type TipoAlteracao =
  | "correcao_fonte" // a fonte estava errada, desatualizada ou não era oficial
  | "correcao_regra" // a regra descrita estava errada ou era demasiado absoluta
  | "atualizacao_anual" // valores do novo ano fiscal
  | "novo_conteudo" // secção nova
  | "reestruturacao"; // o Guia mudou de forma

export interface AlteracaoGuia {
  guideId: string;
  data: string;
  tipo: TipoAlteracao;
  /** Escrito para o leitor, em pt-PT, sem jargão interno. */
  descricao: string;
  /** Referência ao relatório de auditoria, quando aplicável. */
  origem?: string;
}

export const ROTULO_ALTERACAO: Record<TipoAlteracao, string> = {
  correcao_fonte: "Correção de fonte",
  correcao_regra: "Correção de conteúdo",
  atualizacao_anual: "Atualização anual",
  novo_conteudo: "Conteúdo novo",
  reestruturacao: "Reestruturação",
};

const AUDITORIA = "Auditoria editorial de 26 de julho de 2026";
const EXPANSAO = "Expansão editorial dos Guias de 6 de agosto de 2026";

import { HISTORICO_EXPANSAO } from "./expansao/derivar";

export const HISTORICO_GUIAS: AlteracaoGuia[] = [
  // Uma entrada por guia da expansão que já tem corpo redigido. Um andaime
  // sem corpo não teve ainda alteração nenhuma com efeito para o leitor.
  ...HISTORICO_EXPANSAO,

  // ── Correções a conteúdo publicado, apuradas na expansão de agosto ──
  {
    guideId: "iva-recibos-verdes",
    data: "2026-08-06",
    tipo: "correcao_fonte",
    descricao:
      "O artigo 53.º do Código do IVA foi reescrito pelo Decreto-Lei n.º 35/2025 e passou a chamar-se «Âmbito de aplicação no território nacional». Estávamos a citá-lo pela epígrafe antiga, «Regime de isenção». O limite de 15 000 € mantém-se.",
    origem: EXPANSAO,
  },
  {
    guideId: "juros-indemnizatorios",
    data: "2026-08-06",
    tipo: "correcao_fonte",
    descricao:
      "A ligação para o artigo 43.º da Lei Geral Tributária passou a apontar para a página do Portal das Finanças, com o texto do artigo e a epígrafe oficial — «Pagamento indevido da prestação tributária». Antes apontava para o Diário da República, onde o artigo não é diretamente verificável.",
    origem: EXPANSAO,
  },

  // ── Secção nova: Direitos e cobranças ───────────────────────────────
  { guideId: "juros-indemnizatorios", data: "2026-07-27", tipo: "novo_conteudo", descricao: "Guia novo sobre os juros que a Autoridade Tributária deve ao contribuinte quando o erro é dos serviços — o espelho dos juros de mora, e raramente pedido." },
  { guideId: "execucao-fiscal", data: "2026-07-27", tipo: "novo_conteudo", descricao: "Guia novo sobre o que acontece depois da citação em execução fiscal e sobre as saídas que continuam abertas." },
  { guideId: "plano-prestacoes", data: "2026-07-27", tipo: "novo_conteudo", descricao: "Guia novo sobre o pagamento de dívidas fiscais a prestações, com o limite geral e o alargamento em dificuldade notória." },
  { guideId: "suspender-execucao", data: "2026-07-27", tipo: "novo_conteudo", descricao: "Guia novo a esclarecer que contestar não trava a cobrança por si só: a suspensão depende de garantia, penhora suficiente ou dispensa." },
  { guideId: "penhora-limites", data: "2026-07-27", tipo: "novo_conteudo", descricao: "Guia novo com os limites legais da penhora de vencimentos e pensões — dois terços impenhoráveis, com piso e teto." },
  { guideId: "reversao-gerentes", data: "2026-07-27", tipo: "novo_conteudo", descricao: "Guia novo sobre a reversão de dívidas fiscais para gerentes, separando as duas alíneas do Art. 24.º da LGT pelo ónus da prova." },
  { guideId: "falsos-recibos-verdes", data: "2026-07-27", tipo: "novo_conteudo", descricao: "Guia novo sobre a presunção de contrato de trabalho e os indícios que a fazem operar, sem automatizar a conclusão." },
  { guideId: "fatura-nao-paga", data: "2026-07-27", tipo: "novo_conteudo", descricao: "Guia novo. O catálogo explicava o que pagar e quando, mas não dizia uma palavra sobre o caso mais frequente de todos: emitir a fatura e o cliente não pagar. Fica claro que o IRS da categoria B se vence com a emissão, não com o recebimento." },
  { guideId: "juros-de-mora", data: "2026-07-27", tipo: "novo_conteudo", descricao: "Guia novo sobre prazos legais de pagamento, juros de mora automáticos e a indemnização mínima de 40 € por custos de cobrança." },
  { guideId: "cobrar-divida", data: "2026-07-27", tipo: "novo_conteudo", descricao: "Guia novo com a escada da cobrança — interpelação, injunção e execução — e os limites de valor de cada via." },
  { guideId: "recuperar-iva-incobravel", data: "2026-07-27", tipo: "novo_conteudo", descricao: "Guia novo sobre a recuperação do IVA entregue sobre faturas que não foram pagas, com os prazos de mora e a prova exigida." },
  { guideId: "iva-de-caixa", data: "2026-07-27", tipo: "novo_conteudo", descricao: "Guia novo sobre o regime de IVA de caixa, incluindo a contrapartida que costuma ser omitida: a dedução do IVA das compras também passa a depender do pagamento." },
  { guideId: "contestar-liquidacao", data: "2026-07-27", tipo: "novo_conteudo", descricao: "Guia novo com os meios de defesa contra uma liquidação e os respetivos prazos — 120 dias na reclamação graciosa, três meses na impugnação judicial." },
  { guideId: "prazos-fiscais-divida", data: "2026-07-27", tipo: "novo_conteudo", descricao: "Guia novo a separar caducidade da liquidação (quatro anos) de prescrição da dívida (oito anos), que são sistematicamente confundidas." },

  // ── P0 3.1 — CIRC histórico ─────────────────────────────────────────
  { guideId: "irc", data: "2026-07-26", tipo: "correcao_fonte", descricao: "As ligações para o Código do IRC apontavam para a redação em vigor até 2013, que ainda mostra a taxa de 25 %. Passaram a apontar para os artigos em vigor.", origem: AUDITORIA },
  { guideId: "tributacao-autonoma", data: "2026-07-26", tipo: "correcao_fonte", descricao: "A ligação para o Art. 88.º do CIRC apontava para a redação em vigor até 2011. Passou a apontar para o artigo em vigor.", origem: AUDITORIA },
  { guideId: "abrir-empresa", data: "2026-07-26", tipo: "correcao_fonte", descricao: "Corrigidas duas ligações: o Código das Sociedades Comerciais tinha um identificador errado e o Art. 87.º do CIRC apontava para uma versão histórica.", origem: AUDITORIA },
  { guideId: "unipessoal-vs-eni", data: "2026-07-26", tipo: "correcao_fonte", descricao: "A ligação para o CIRC apontava para a versão histórica do código. Passou a citar os artigos em vigor.", origem: AUDITORIA },

  // ── P0 3.2 — artigo errado nas deduções ─────────────────────────────
  { guideId: "deducoes-coleta", data: "2026-07-26", tipo: "correcao_fonte", descricao: "A fonte dizia «Artigos 78.º-A a 78.º-E» mas ligava ao Art. 87.º, que trata de deduções relativas a pessoas com deficiência. Cada artigo passou a ser uma fonte própria.", origem: AUDITORIA },

  // ── P0 3.3 — fonte comercial marcada como oficial ───────────────────
  { guideId: "recibo-vencimento", data: "2026-07-26", tipo: "correcao_fonte", descricao: "O Despacho n.º 233-A/2026 estava a ser citado através de um artigo bancário. Passou a ligar ao texto publicado pela Autoridade Tributária e ao Diário da República; o artigo passou a leitura complementar.", origem: AUDITORIA },

  // ── P0 3.5 — artigo inexistente ─────────────────────────────────────
  { guideId: "subsidios-ferias-natal", data: "2026-07-26", tipo: "correcao_regra", descricao: "Foi removida a referência a um «Art. 264.º-A», que não existe no Código do Trabalho. Os duodécimos passaram a ser descritos como o que são: uma modalidade dependente de acordo escrito e limitada a metade do subsídio de férias.", origem: AUDITORIA },

  // ── P0 3.6 — elegibilidade da Segurança Social ──────────────────────
  { guideId: "seguranca-social", data: "2026-07-26", tipo: "correcao_regra", descricao: "Os prazos de acesso às prestações estavam simplificados de forma incorreta. O prazo de garantia da parentalidade é de 6 meses (não 12) e o subsídio por cessação de atividade exige 360 dias de atividade nos 24 meses anteriores, entre outras condições cumulativas.", origem: AUDITORIA },

  // ── P0 3.7 — três conceitos confundidos ─────────────────────────────
  { guideId: "acumulacao-emprego", data: "2026-07-26", tipo: "reestruturacao", descricao: "O Guia juntava entidade contratante, dependência económica e presunção laboral como se fossem a mesma coisa. Passaram a ser três secções independentes, com as fontes oficiais de cada uma.", origem: AUDITORIA },

  // ── P0 3.8 — MoR sem fontes ─────────────────────────────────────────
  { guideId: "merchant-of-record", data: "2026-07-26", tipo: "correcao_regra", descricao: "Foram retiradas as conclusões absolutas sobre faturação, SAF-T e IVA. O Guia passou a separar o funcionamento comercial do tratamento fiscal, que depende do contrato concreto, e a terminologia «MOSS» deu lugar ao OSS.", origem: AUDITORIA },

  // ── Estrutura comum a todos os Guias ────────────────────────────────
  ...[
    "abrir-atividade", "ato-isolado", "regime-simplificado", "despesas-dedutiveis",
    "contabilidade-organizada", "retencao-na-fonte", "pagamentos-por-conta",
    "iva-recibos-verdes", "seguranca-social", "acumulacao-emprego",
    "clientes-estrangeiros", "cessar-atividade", "fatura-vs-recibo",
    "merchant-of-record", "recibo-vencimento", "subsidios-ferias-natal",
    "trabalho-suplementar", "abrir-empresa", "unipessoal-vs-eni", "irc",
    "tributacao-autonoma", "calendario-fiscal", "escaloes-irs", "irs-jovem",
    "ifici-nhr", "deducoes-coleta", "mais-valias", "tributacao-conjunta",
    "reembolso-irs",
  ].map<AlteracaoGuia>((guideId) => ({
    guideId,
    data: "2026-07-26",
    tipo: "reestruturacao",
    descricao: "O aviso genérico sobre o Orçamento do Estado foi substituído por um cabeçalho com o período de aplicabilidade, a data da última revisão e as fontes efetivamente usadas neste Guia.",
    origem: AUDITORIA,
  })),
];

export function historicoDoGuia(guideId: string): AlteracaoGuia[] {
  return HISTORICO_GUIAS.filter((a) => a.guideId === guideId).sort((a, b) => b.data.localeCompare(a.data));
}

export function ultimaAlteracao(guideId: string): AlteracaoGuia | undefined {
  return historicoDoGuia(guideId)[0];
}

export function assertHistoricoIntegrity(): void {
  const erros: string[] = [];
  for (const a of HISTORICO_GUIAS) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.data)) erros.push(`Alteração de "${a.guideId}": data inválida (${a.data}).`);
    if (a.descricao.length < 30) erros.push(`Alteração de "${a.guideId}": descrição demasiado curta para ser útil ao leitor.`);
  }
  if (erros.length > 0) throw new Error(`Histórico editorial inconsistente:\n  · ${erros.join("\n  · ")}`);
}

assertHistoricoIntegrity();
