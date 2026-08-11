// Validação do formulário de investidores — partilhada entre cliente e servidor.
//
// ── Porque não é `zod` ─────────────────────────────────────────────────────
// O relatório propõe `zod`. O CLAUDE.md deste projeto diz "sem dependências
// novas sem motivo", e o motivo aqui é fraco: são doze campos com regras
// triviais, o módulo é server-only no caminho que interessa (a rota) e o
// projeto já valida à mão noutros sítios (`validacao-email.ts`). O que a
// biblioteca dava — uma mensagem de erro por campo e a garantia de que nada
// passa sem ser verificado — está aqui, com teste próprio.
//
// A regra que importa é outra, e é respeitada: **o servidor não confia em
// nada do cliente**. Este módulo é a única porta, corre inteiro no servidor
// antes de qualquer escrita, e o cliente usa-o apenas para dar feedback cedo.

/** Interesses aceites. Qualquer outro valor é rejeitado. */
export const INTERESSES = ["deck", "intro", "strategic-partnership"] as const;
export type Interesse = (typeof INTERESSES)[number];

/** Bandas de ticket. Bandas, e não um valor livre: o número exato não é
 *  preciso nesta fase e um campo numérico aberto só convida a lixo. */
export const BANDAS_TICKET = [
  "under-25k",
  "25k-100k",
  "100k-250k",
  "over-250k",
  "not-applicable",
] as const;
export type BandaTicket = (typeof BANDAS_TICKET)[number];

/** Versão da nota de privacidade que a pessoa reconheceu. Guardada com o
 *  registo — sem ela não se consegue provar O QUE foi mostrado no momento da
 *  recolha, que é metade do que o artigo 13.º pede. */
export const VERSAO_PRIVACIDADE = "investor-privacy-v1";

/** Tempo mínimo de preenchimento. Um humano não preenche isto em 2,5s; um
 *  script preenche em 50ms. Não substitui o rate limit — soma-se a ele. */
export const TEMPO_MINIMO_MS = 2_500;

export interface LeadInvestidor {
  name: string;
  email: string;
  organisation: string;
  role: string;
  interest: Interesse;
  ticketBand?: BandaTicket;
  message: string;
  sourceUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  privacyVersion: string;
  privacyAcknowledged: true;
  startedAt: string;
  idempotencyKey: string;
  /** Honeypot: tem de vir vazio. Um bot preenche todos os campos que vê. */
  companyFax: string;
}

export type ErrosCampos = Record<string, string>;

export type Resultado =
  | { ok: true; dados: LeadInvestidor }
  | { ok: false; erros: ErrosCampos };

const RE_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RE_VERSAO_PRIVACIDADE = /^investor-privacy-v[0-9]+$/;

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

/**
 * Valida o corpo do pedido. `agora` é injetável para o teste poder exercer a
 * regra do tempo mínimo sem esperar.
 */
export function validarLead(corpo: unknown, agora: number = Date.now()): Resultado {
  const erros: ErrosCampos = {};
  const c = (corpo ?? {}) as Record<string, unknown>;

  const name = texto(c.name);
  if (name.length < 2) erros.name = "Indica o teu nome.";
  else if (name.length > 120) erros.name = "Nome demasiado longo.";

  const email = texto(c.email).toLowerCase();
  if (!email) erros.email = "Indica o teu email.";
  else if (email.length > 254 || !RE_EMAIL.test(email)) erros.email = "Email inválido.";

  const organisation = texto(c.organisation);
  if (organisation.length > 160) erros.organisation = "Nome demasiado longo.";

  const role = texto(c.role);
  if (role.length > 120) erros.role = "Cargo demasiado longo.";

  const interest = texto(c.interest);
  if (!INTERESSES.includes(interest as Interesse)) erros.interest = "Escolhe o tipo de interesse.";

  const banda = texto(c.ticketBand);
  if (banda && !BANDAS_TICKET.includes(banda as BandaTicket)) erros.ticketBand = "Banda inválida.";

  const message = texto(c.message);
  if (message.length > 1500) erros.message = "Mensagem demasiado longa (máx. 1500).";

  const sourceUrl = texto(c.sourceUrl);
  if (!sourceUrl || sourceUrl.length > 500 || !/^https?:\/\//i.test(sourceUrl)) {
    erros.sourceUrl = "Origem inválida.";
  }

  const utmSource = texto(c.utmSource).slice(0, 100);
  const utmMedium = texto(c.utmMedium).slice(0, 100);
  const utmCampaign = texto(c.utmCampaign).slice(0, 100);

  const privacyVersion = texto(c.privacyVersion);
  if (!RE_VERSAO_PRIVACIDADE.test(privacyVersion)) erros.privacyVersion = "Versão de privacidade inválida.";

  // Reconhecimento de LEITURA da nota — não é uma caixa de consentimento para
  // o tratamento em si (ver a nota em `_data/legal.ts`). É obrigatória porque
  // é o que fica registado como prova do que foi mostrado.
  if (c.privacyAcknowledged !== true) {
    erros.privacyAcknowledged = "Confirma que leste a nota de privacidade.";
  }

  const startedAt = texto(c.startedAt);
  const inicio = Date.parse(startedAt);
  if (!Number.isFinite(inicio)) {
    erros.startedAt = "Pedido inválido.";
  } else {
    const decorrido = agora - inicio;
    // Também rejeita um `startedAt` no futuro (decorrido negativo), que é a
    // forma óbvia de contornar o mínimo.
    if (decorrido < TEMPO_MINIMO_MS) erros.startedAt = "too_fast";
  }

  const idempotencyKey = texto(c.idempotencyKey);
  if (!RE_UUID.test(idempotencyKey)) erros.idempotencyKey = "Pedido inválido.";

  // Honeypot: um campo escondido que só um autómato preenche.
  const companyFax = texto(c.companyFax);
  if (companyFax.length > 0) erros.companyFax = "rejeitado";

  if (Object.keys(erros).length > 0) return { ok: false, erros };

  return {
    ok: true,
    dados: {
      name,
      email,
      organisation,
      role,
      interest: interest as Interesse,
      ticketBand: (banda || undefined) as BandaTicket | undefined,
      message,
      sourceUrl,
      utmSource,
      utmMedium,
      utmCampaign,
      privacyVersion,
      privacyAcknowledged: true,
      startedAt,
      idempotencyKey,
      companyFax: "",
    },
  };
}
