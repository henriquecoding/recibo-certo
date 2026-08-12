// ═══════════════════════════════════════════════════════════════════════
//  QUE PREÇOS PODEM CONCEDER O PLUS — RC-BILL-002 (parte da allowlist)
//  ---------------------------------------------------------------------
//  A projeção de subscrições guardava o `price_id` mas ninguém o consultava:
//  bastava existir uma subscrição `active`, `trialing` ou `past_due`
//  associada ao utilizador para o Plus ser concedido. Qualquer preço servia —
//  um preço de teste, um preço antigo de outro produto, um preço criado à mão
//  no painel da Stripe, ou um preço de 0 €.
//
//  Aqui a pergunta passa a ser explícita: este preço está autorizado a
//  conceder o Plus?
//
//  ── Porque falha FECHADA ────────────────────────────────────────────────
//  Sem allowlist configurada, nada concede. Parece arriscado — revogar acesso
//  a quem paga por causa de uma variável em falta seria grave — mas não é:
//  `STRIPE_PRICE_PLUS_MONTHLY` é a MESMA variável que o checkout precisa para
//  existir. Num ambiente onde há subscrições, ela está definida por
//  construção; se não estiver, ninguém conseguiu subscrever de todo.
//
//  E a ausência é ruidosa, não silenciosa: `console.error` uma vez por
//  processo, em vez de deixar o sistema a decidir sozinho.
//
//  ── O que isto NÃO resolve ──────────────────────────────────────────────
//  O resto do RC-BILL-002 — ledger de `event_id`, ordem de chegada dos
//  eventos e dead-letter para pagamentos sem utilizador — fica para a Onda 1.
//  Esta é a parte que o relatório manda fazer nas primeiras 24 horas, porque é
//  a que separa "pagou o produto certo" de "tem uma subscrição qualquer".

// As variáveis que podem conter um preço autorizado estão lidas literalmente
// em `precosAutorizados()`. A versão `NEXT_PUBLIC_` existe porque a decisão
// também tem de ser tomada no browser, onde o provider decide o que mostrar.
// Não é uma fuga: um ID de preço aparece no URL do checkout da Stripe a
// qualquer pessoa que carregue em "subscrever". O que é secreto é a chave, não
// o catálogo.

let avisado = false;

/**
 * Os IDs de preço autorizados a conceder o Plus.
 *
 * Lido a cada chamada e não guardado em módulo: em serverless o processo
 * sobrevive entre pedidos, e uma variável corrigida no painel deve valer sem
 * esperar por um arranque a frio.
 */
export function precosAutorizados(): string[] {
  // `process.env[nome]` com índice dinâmico NÃO funciona no browser: o Next
  // substitui `process.env.NEXT_PUBLIC_X` literalmente, no build, e um acesso
  // por variável nunca é substituído. Daí a leitura literal.
  const brutos = [
    process.env.STRIPE_PRICE_PLUS_MONTHLY,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_PLUS_MONTHLY,
    process.env.STRIPE_PRICE_PLUS_LEGACY,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_PLUS_LEGACY,
  ];
  const ids = [...new Set(brutos.map((v) => v?.trim()).filter((v): v is string => Boolean(v && v.startsWith("price_"))))];

  if (ids.length === 0 && !avisado) {
    avisado = true;
    console.error(
      "[stripe] Nenhum preço autorizado configurado (STRIPE_PRICE_PLUS_MONTHLY). " +
        "Nenhuma subscrição concede Plus até isto ser corrigido.",
    );
  }
  return ids;
}

/**
 * Este preço pode conceder o Plus?
 *
 * `null`/`undefined` devolve `false` de propósito: uma subscrição cujo preço
 * não conseguimos identificar não é uma subscrição que possamos honrar.
 */
export function precoConcedePlus(priceId: string | null | undefined): boolean {
  if (!priceId) return false;
  return precosAutorizados().includes(priceId);
}

/** Estados de subscrição que, com preço autorizado, dão acesso. */
export const ESTADOS_COM_ACESSO = ["active", "trialing", "past_due"] as const;
export type EstadoComAcesso = (typeof ESTADOS_COM_ACESSO)[number];

/**
 * A decisão completa, num sítio só: estado E preço.
 *
 * É esta a função que qualquer superfície deve usar para saber se alguém tem
 * Plus — nunca o estado sozinho, que foi exatamente o erro que o relatório
 * encontrou.
 */
export function concedePlus(input: { status: string | null | undefined; priceId: string | null | undefined }): boolean {
  if (!input.status) return false;
  if (!(ESTADOS_COM_ACESSO as readonly string[]).includes(input.status)) return false;
  return precoConcedePlus(input.priceId);
}

// ─── Máquina de estados da subscrição (RC-P1-11) ───────────────────────
//
// A página de conta mostrava "A experimentar" para QUALQUER estado que não
// fosse ativo — incluindo pagamento em atraso e subscrição cancelada — e o
// `past_due` recebia o Plus sem que ninguém explicasse porquê. O período de
// graça é uma decisão de produto: fica escrita, com prazo, e cada estado tem
// a sua mensagem.

/**
 * Dias em que o acesso se mantém depois de um pagamento falhar.
 *
 * Não é um acidente do código: preferimos que quem tem um cartão expirado
 * continue a ver o seu histórico enquanto resolve, em vez de perder o acesso
 * ao que já pagou. O Stripe tenta cobrar de novo dentro desta janela.
 */
export const DIAS_PERIODO_GRACA = 14;

export type EstadoConta =
  | "sem-conta"
  | "gratis"
  | "ativo"
  | "periodo-experimental"
  | "pagamento-em-atraso"
  | "cancelado"
  | "incompleto";

export interface DescricaoEstado {
  estado: EstadoConta;
  /** Rótulo curto para o cartão da conta. */
  etiqueta: string;
  /** Explicação em pt-PT do que está a acontecer. */
  mensagem: string;
  /** Tem acesso às funcionalidades do Plus? */
  temAcesso: boolean;
  /** Precisa de ação de quem lê. */
  requerAcao: boolean;
  tom: "neutro" | "positivo" | "aviso" | "alerta";
}

/** Traduz o estado bruto do Stripe numa descrição para a interface. */
export function descreverEstado(
  status: string | null | undefined,
  temSessao: boolean,
): DescricaoEstado {
  if (!temSessao) {
    return {
      estado: "sem-conta",
      etiqueta: "Sem conta",
      mensagem: "Estás a usar o ReciboCerto sem conta. Os dados ficam guardados neste dispositivo.",
      temAcesso: false,
      requerAcao: false,
      tom: "neutro",
    };
  }

  switch (status) {
    case "active":
      return {
        estado: "ativo",
        etiqueta: "Plus ativo",
        mensagem: "A tua subscrição está ativa. Histórico na nuvem, cenários ilimitados e exportações.",
        temAcesso: true,
        requerAcao: false,
        tom: "positivo",
      };
    case "trialing":
      return {
        estado: "periodo-experimental",
        etiqueta: "Período experimental",
        mensagem: "Estás a experimentar o Plus. No fim do período, a subscrição começa a ser cobrada.",
        temAcesso: true,
        requerAcao: false,
        tom: "positivo",
      };
    case "past_due":
      return {
        estado: "pagamento-em-atraso",
        etiqueta: "Pagamento em atraso",
        mensagem:
          `O último pagamento não foi concluído. Mantens o acesso durante ${DIAS_PERIODO_GRACA} dias enquanto ` +
          "resolves — atualiza o método de pagamento para não o perderes.",
        temAcesso: true,
        requerAcao: true,
        tom: "aviso",
      };
    case "canceled":
      return {
        estado: "cancelado",
        etiqueta: "Subscrição cancelada",
        mensagem:
          "A subscrição foi cancelada. Os teus dados continuam guardados, mas as funcionalidades do Plus deixaram " +
          "de estar disponíveis.",
        temAcesso: false,
        requerAcao: false,
        tom: "neutro",
      };
    case "incomplete":
    case "incomplete_expired":
      return {
        estado: "incompleto",
        etiqueta: "Subscrição por concluir",
        mensagem: "A subscrição ficou a meio — o pagamento não chegou a ser confirmado. Podes tentar de novo.",
        temAcesso: false,
        requerAcao: true,
        tom: "aviso",
      };
    default:
      return {
        estado: "gratis",
        etiqueta: "Plano grátis",
        mensagem: "Estás no plano grátis. Calculadoras e guias sem limite; o Plus acrescenta nuvem e exportações.",
        temAcesso: false,
        requerAcao: false,
        tom: "neutro",
      };
  }
}
