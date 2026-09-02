// ═══════════════════════════════════════════════════════════════════════
//  O QUE SE PODE APAGAR, E O QUE É PRECISO ESCREVER PARA O FAZER
//  ---------------------------------------------------------------------
//  Contrato partilhado pela interface e pela rota que apaga. Vive num sítio
//  só de propósito: se a frase de confirmação estivesse escrita nos dois
//  lados, um dia divergiam — e a divergência mais provável é o servidor
//  aceitar uma frase que a interface já não pede, que é exatamente a
//  proteção a desaparecer sem ninguém dar por isso.
// ═══════════════════════════════════════════════════════════════════════

export type AlvoApagar = "selecao" | "conta";

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

// ⚠️ Havia aqui seis alvos, quatro deles mortos desde que a zona de risco
// passou a trabalhar por conjuntos escolhidos: `recibos`, `vencimentos`,
// `cenarios` e `perfil-fiscal` já não eram usados por lado nenhum, e os
// testes continuavam a confirmar as frases deles.
//
// O que sobrava tinha um defeito pior: escolher UMA coisa pedia à pessoa
// que escrevesse «apagar todos os dados». A frase mentia sobre o que ia
// acontecer — e uma frase de confirmação que descreve mal a ação é o
// contrário de uma confirmação. `selecao` diz o que é: apagar o que foi
// escolhido, seja um ou vinte.
export const ALVOS: DefinicaoAlvo[] = [
  {
    id: "selecao",
    titulo: "Apagar o que escolheste",
    descricao:
      "Apaga exatamente os conjuntos assinalados, e mais nada. A conta continua a existir e o que não escolheste fica onde está.",
    confirmacao: "apagar o que escolhi",
    acao: "Apagar o escolhido",
  },
  {
    id: "conta",
    titulo: "Apagar a conta definitivamente",
    descricao:
      "Apaga os dados todos, os ficheiros que enviaste e a própria conta. A subscrição é cancelada por nós — não continuas a ser cobrado. Perdes o acesso imediatamente e não há forma de reverter.",
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
