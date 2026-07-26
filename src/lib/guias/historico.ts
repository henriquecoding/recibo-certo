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

export const HISTORICO_GUIAS: AlteracaoGuia[] = [
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
