// ═══════════════════════════════════════════════════════════════════════
//  VERIFICAÇÃO DE CONTABILISTA — o que é FACTO, e onde está escrito
//  ---------------------------------------------------------------------
//  Este ficheiro é para a verificação o que `fiscal-data.ts` é para as
//  taxas: a fonte de verdade, com base legal, endereço e data em que
//  alguém foi mesmo lá confirmar. Nenhum outro módulo desta pasta pode
//  afirmar um facto sobre a Ordem que não esteja aqui.
//
//  A razão de existir é a mesma da regra de ouro nº 1 do projeto. Um selo
//  de «verificado» é uma afirmação sobre uma pessoa real feita a clientes
//  reais: se for construído sobre um pressuposto que ninguém confirmou,
//  é pior do que não existir.
//
//  ⚠️ AO ACTUALIZAR: confirmar cada `verificadoEm` na fonte oficial antes
//  de lhe mexer. `assertFontesVerificacaoIntegridade()` corre ao carregar
//  o módulo e faz o build falhar se as datas ou os endereços não baterem
//  certo — não é possível publicar uma fonte inventada por distração.
// ═══════════════════════════════════════════════════════════════════════

/** Data da última revisão desta página de factos (ISO 8601). */
export const FONTES_LAST_REVIEW = "2026-08-18" as const;

export interface FonteVerificacao {
  /** Identificador estável — é o que fica gravado na evidência. */
  id: string;
  label: string;
  url: string;
  /** O diploma ou artigo que sustenta o facto. `null` quando é técnico. */
  baseLegal: string | null;
  /** Quando é que alguém confirmou isto na fonte. */
  verificadoEm: string;
  /** O que a fonte permite, dito sem otimismo. */
  nota: string;
}

// ─── O registo público da Ordem (art. 21.º do EOCC) ────────────────────

/**
 * O registo público existe por obrigação legal e é consultável por
 * qualquer pessoa. É a fonte canónica — e a que a administração usa.
 *
 * O que ele NÃO é: uma API. A pesquisa do registo está protegida por
 * reCAPTCHA validado no servidor (confirmado a 2026-08-18: um pedido sem
 * token responde `{"code":101,"message":"Invalid ReCaptcha."}`). Isto não
 * é um obstáculo a contornar, é uma decisão da Ordem sobre quem pode
 * consultar o registo e como. Qualquer sincronização automática não
 * combinada com a OCC passaria por cima dessa decisão, partir-se-ia à
 * primeira alteração do site, e não daria nenhuma garantia jurídica.
 *
 * Daí o desenho: o registo público serve a verificação ASSISTIDA (uma
 * pessoa confirma e assina o que viu), e a verificação AUTOMÁTICA vem do
 * SCAP, que é o canal que o Estado criou exatamente para isto.
 */
export const REGISTO_PUBLICO: FonteVerificacao = {
  id: "registo_publico_occ",
  label: "Registo público dos Contabilistas Certificados inscritos — OCC",
  url: "https://www.occ.pt/pt-pt/registo-publico-dos-contabilistas-certificados-inscritos",
  baseLegal: "Art. 21.º, n.º 1 do EOCC (Lei n.º 139/2015, de 7 de setembro)",
  verificadoEm: "2026-08-18",
  nota:
    "Pesquisa por nome ou por número de membro. Devolve nome, número de " +
    "membro, morada, área de especialidade e exercício de profissão. " +
    "Protegido por reCAPTCHA — consulta humana, não automatizável.",
};

/**
 * O segundo registo do art. 21.º: as inscrições, suspensões e
 * cancelamentos deferidos no trimestre.
 *
 * É a única fonte pública que fala de saídas, e por isso a única que
 * justifica reconfirmar um selo já dado. Também é publicada por períodos
 * (confirmado a 2026-08-18: o período corrente devolvido pela Ordem era
 * 01-04-2026 a 30-06-2026, ou seja, trimestral).
 */
export const REGISTO_DEFERIDOS: FonteVerificacao = {
  id: "registo_deferidos_occ",
  label: "Registo público de inscrições, suspensões e cancelamentos deferidos — OCC",
  url: "https://www.occ.pt/pt-pt/registo-publico-dos-contabilistas-certificados-inscricao-deferida",
  baseLegal: "Art. 21.º, n.º 2 do EOCC (Lei n.º 139/2015, de 7 de setembro)",
  verificadoEm: "2026-08-18",
  nota:
    "Publicado por trimestre. É aqui que aparecem suspensões e " +
    "cancelamentos — a razão pela qual um selo tem de caducar.",
};

// ─── SCAP — o canal oficial e automatizável ────────────────────────────

/**
 * O Sistema de Certificação de Atributos Profissionais.
 *
 * É o mecanismo do Estado para uma pessoa provar, com o Cartão de Cidadão
 * ou a Chave Móvel Digital, a qualidade profissional que uma associação
 * pública lhe reconhece. Tem três propriedades que nenhuma alternativa
 * tem: é a própria pessoa que autoriza, a resposta vem da Ordem e não de
 * um intermediário, e o atributo traz uma data de validade — que é o que
 * torna possível um selo SINCRONIZADO em vez de um carimbo eterno.
 */
export const SCAP: FonteVerificacao = {
  id: "scap",
  label: "Sistema de Certificação de Atributos Profissionais (SCAP) — AMA",
  url: "https://www.autenticacao.gov.pt/a-autenticacao-de-profissionais",
  baseLegal:
    "Portaria n.º 73/2018, de 12 de março (alterada pelas Portarias n.º 305/2020 " +
    "e n.º 6-C/2025), art. 6.º; Decreto-Lei n.º 83/2016, art. 10.º",
  verificadoEm: "2026-08-18",
  nota:
    "Art. 6.º, n.º 1: as associações públicas profissionais podem aderir ao " +
    "SCAP para os membros certificarem a sua qualidade profissional.",
};

/** A adesão da própria Ordem — sem isto, o SCAP não serve para nada aqui. */
export const SCAP_OCC: FonteVerificacao = {
  id: "scap_occ",
  label: "Serviço de Certificação de Atributo Profissional (SCAP) — Ordem dos Contabilistas Certificados",
  url: "https://www.occ.pt/pt-pt/noticias/servico-de-certificacao-de-atributo-profissional-scap",
  baseLegal: null,
  verificadoEm: "2026-08-18",
  nota:
    "A OCC aderiu ao SCAP por protocolo com a AMA (anúncio de 18-01-2021). " +
    "O atributo certificado é o de membro da OCC, e é o próprio membro que " +
    "o activa na aplicação Autenticação.Gov com o CC ou a Chave Móvel Digital.",
};

/** A documentação técnica de quem consome atributos. */
export const SCAP_DOCS: FonteVerificacao = {
  id: "scap_docs",
  label: "SCAP — documentação de integração (vertente Consumidor de Atributos), AMA",
  url: "https://github.com/amagovpt/doc-SCAP-Consumidores",
  baseLegal: null,
  verificadoEm: "2026-08-18",
  nota:
    "Especificação OpenAPI do SCAPAttributeService. Ser consumidor exige " +
    "protocolo com a AMA, relatório de conformidade assinado com LTV, vídeo " +
    "demonstrativo, cinco documentos assinados em pré-produção e certificação " +
    "do código pela AMA ou por auditor eIDAS. Contacto: eid@ama.pt.",
};

/** A cédula, agora também em carteira digital. */
export const CEDULA: FonteVerificacao = {
  id: "cedula_profissional",
  label: "Cédula profissional do contabilista certificado — OCC / gov.pt",
  url: "https://www.occ.pt/pt-pt/contabilista-certificado/cedula-profissional",
  baseLegal: null,
  verificadoEm: "2026-08-18",
  nota:
    "Desde 23-07-2025 pode ser associada aos cartões virtuais em gov.pt e na " +
    "aplicação id.gov.pt, com Chave Móvel Digital activa. Não existe, à data " +
    "desta verificação, mecanismo público de validação por terceiros — por " +
    "isso vale como documento, e não como confirmação junto da Ordem.",
};

export const FONTES: readonly FonteVerificacao[] = [
  REGISTO_PUBLICO, REGISTO_DEFERIDOS, SCAP, SCAP_OCC, SCAP_DOCS, CEDULA,
];

// ─── Integridade ───────────────────────────────────────────────────────

const ISO_DATA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Corre ao carregar o módulo. Não valida se o facto é verdadeiro — isso
 * só uma pessoa consegue fazer, indo à fonte — mas garante que ninguém
 * publica uma entrada sem endereço, sem data, ou com uma data futura, que
 * são as três formas distraídas de fabricar credibilidade.
 */
export function assertFontesVerificacaoIntegridade(): void {
  const erros: string[] = [];
  const vistos = new Set<string>();

  for (const f of FONTES) {
    if (vistos.has(f.id)) erros.push(`Fonte duplicada: ${f.id}.`);
    vistos.add(f.id);

    if (!f.label.trim()) erros.push(`Fonte sem rótulo: ${f.id}.`);
    if (!/^https:\/\//.test(f.url)) erros.push(`Fonte sem endereço https: ${f.id}.`);
    if (!ISO_DATA.test(f.verificadoEm)) erros.push(`Data inválida em ${f.id}: ${f.verificadoEm}.`);
    else if (f.verificadoEm > FONTES_LAST_REVIEW) {
      erros.push(
        `Fonte ${f.id} verificada (${f.verificadoEm}) depois da última revisão ` +
        `(${FONTES_LAST_REVIEW}). Actualizar FONTES_LAST_REVIEW.`
      );
    }
    if (f.nota.trim().length < 20) erros.push(`Fonte ${f.id} sem nota útil.`);
  }

  if (!ISO_DATA.test(FONTES_LAST_REVIEW)) erros.push("FONTES_LAST_REVIEW inválida.");

  if (erros.length) {
    throw new Error(`[verificacao/fontes] Integridade violada:\n- ${erros.join("\n- ")}`);
  }
}

assertFontesVerificacaoIntegridade();
