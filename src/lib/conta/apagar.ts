// ═══════════════════════════════════════════════════════════════════════
//  O QUE SE PODE APAGAR, E O QUE É PRECISO ESCREVER PARA O FAZER
//  ---------------------------------------------------------------------
//  Contrato partilhado pela interface e pela rota que apaga. Vive num sítio
//  só de propósito: se a frase de confirmação estivesse escrita nos dois
//  lados, um dia divergiam — e a divergência mais provável é o servidor
//  aceitar uma frase que a interface já não pede, que é exatamente a
//  proteção a desaparecer sem ninguém dar por isso.
// ═══════════════════════════════════════════════════════════════════════

export type AlvoApagar =
  | "recibos" | "vencimentos" | "cenarios" | "perfil-fiscal" | "tudo" | "conta";

export interface DefinicaoAlvo {
  id: AlvoApagar;
  titulo: string;
  descricao: string;
  /** Exatamente o que a pessoa tem de escrever. */
  confirmacao: string;
  acao: string;
  /** A conta é outra ordem de grandeza — a interface trata-a à parte. */
  irreversivelTotal?: boolean;
}

export const ALVOS: DefinicaoAlvo[] = [
  {
    id: "recibos",
    titulo: "Apagar os recibos verdes guardados",
    descricao:
      "Remove todos os recibos verdes que registaste. Os simuladores continuam a funcionar; o que desaparece é o histórico.",
    confirmacao: "apagar recibos verdes",
    acao: "Apagar recibos",
  },
  {
    id: "vencimentos",
    titulo: "Apagar os recibos de vencimento guardados",
    descricao:
      "Remove os recibos de vencimento que guardaste, incluindo os que serviram de base a auditorias.",
    confirmacao: "apagar recibos de vencimento",
    acao: "Apagar vencimentos",
  },
  {
    id: "cenarios",
    titulo: "Apagar os cenários guardados",
    descricao:
      "Remove todos os cenários de simulação — recibos verdes, vencimento, empresa, IRS e heranças.",
    confirmacao: "apagar cenarios",
    acao: "Apagar cenários",
  },
  {
    id: "perfil-fiscal",
    titulo: "Apagar o perfil fiscal",
    descricao:
      "Remove as condições que guardaste: início de atividade, regime de IVA, agregado e deduções. O painel volta a dizer que não sabe.",
    confirmacao: "apagar perfil fiscal",
    acao: "Apagar perfil",
  },
  {
    id: "tudo",
    titulo: "Apagar todos os dados",
    descricao:
      "Tudo o que está em cima, de uma vez: recibos, vencimentos, cenários e perfil fiscal. A conta continua a existir e podes recomeçar do zero.",
    confirmacao: "apagar todos os dados",
    acao: "Apagar tudo",
  },
  {
    id: "conta",
    titulo: "Apagar a conta definitivamente",
    descricao:
      "Apaga os dados todos e a própria conta. Perdes o acesso imediatamente e não há forma de reverter. Se tens uma subscrição ativa, cancela-a primeiro — apagar a conta não cancela a cobrança.",
    confirmacao: "apagar a minha conta",
    acao: "Apagar conta",
    irreversivelTotal: true,
  },
];

export const alvoPorId = (id: string): DefinicaoAlvo | undefined =>
  ALVOS.find((a) => a.id === id);

/**
 * A frase tem de bater certo, sem tolerância a maiúsculas nem a espaços
 * repetidos — mas com tolerância a acentos, porque exigir «cenários» com
 * acento a quem escreve à pressa num telemóvel é fricção sem segurança.
 */
export const normalizarConfirmacao = (s: string): string =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export function confirmacaoValida(alvo: DefinicaoAlvo, escrito: string): boolean {
  return normalizarConfirmacao(escrito) === normalizarConfirmacao(alvo.confirmacao);
}

/**
 * A pessoa só consegue escrever o que a frase pede.
 *
 * Devolve o maior prefixo válido do que foi escrito. Uma tecla que não
 * corresponda simplesmente não entra — não há erro a mostrar porque não
 * chega a haver erro. Serve também para colar: colar outra coisa qualquer
 * não passa a barreira.
 *
 * Devolve o texto do OBJETIVO e não o que foi escrito, para a acentuação e
 * a caixa ficarem corretas mesmo a quem escreveu sem elas.
 */
export function recortarAoPrefixo(alvo: DefinicaoAlvo, escrito: string): string {
  const objetivo = alvo.confirmacao;
  let n = 0;
  while (
    n < escrito.length &&
    n < objetivo.length &&
    normalizarConfirmacao(escrito[n]) === normalizarConfirmacao(objetivo[n])
  ) {
    n += 1;
  }
  return objetivo.slice(0, n);
}
