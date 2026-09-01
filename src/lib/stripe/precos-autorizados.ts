// Decisão pura de acesso. O servidor acrescenta os preços confirmados na
// Stripe e persistidos em billing_price_catalog; as variáveis mantêm apenas
// compatibilidade com instalações antigas.

let avisado = false;

function separarIds(valores: ReadonlyArray<string | undefined>): string[] {
  return valores.flatMap((valor) => valor?.split(",") ?? [])
    .map((valor) => valor.trim())
    .filter((valor) => /^price_[A-Za-z0-9_]+$/.test(valor));
}

export function precosAutorizados(adicionais: readonly string[] = []): string[] {
  const ids = [...new Set(separarIds([
    process.env.STRIPE_PRICE_PLUS_MONTHLY,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_PLUS_MONTHLY,
    process.env.STRIPE_PRICE_PLUS_LEGACY,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_PLUS_LEGACY,
    process.env.STRIPE_PRICE_PLUS_LIFETIME,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_PLUS_LIFETIME,
    ...adicionais,
  ]))];

  if (ids.length === 0 && !avisado) {
    avisado = true;
    console.error("[billing] Nenhum preço Stripe verificado; acessos Stripe falham fechados.");
  }
  return ids;
}

export function precosLegados(): string[] {
  return [...new Set(separarIds([
    process.env.STRIPE_PRICE_PLUS_LEGACY,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_PLUS_LEGACY,
  ]))];
}

export function precoConcedePlus(
  priceId: string | null | undefined,
  adicionais: readonly string[] = [],
): boolean {
  return Boolean(priceId && precosAutorizados(adicionais).includes(priceId));
}

export const ESTADOS_COM_ACESSO = ["active", "trialing", "past_due"] as const;
export type EstadoComAcesso = (typeof ESTADOS_COM_ACESSO)[number];
export type OrigemConcessao = "stripe" | "lemon_squeezy" | "cupao" | "vitalicio" | "manual";

export interface LinhaConcessao {
  status: string | null | undefined;
  priceId: string | null | undefined;
  origem?: OrigemConcessao | null;
  lsSubscriptionId?: string | null;
  paymentIntent?: string | null;
  terminaEm?: string | null;
  periodoGracaTerminaEm?: string | null;
  cupaoId?: string | null;
  motivo?: string | null;
  concedidoPor?: string | null;
}

export function concedePlus(
  input: LinhaConcessao,
  precosConfirmados: readonly string[] = [],
  agora: Date = new Date(),
): boolean {
  if (!input.status || !(ESTADOS_COM_ACESSO as readonly string[]).includes(input.status)) return false;
  if (input.terminaEm && new Date(input.terminaEm) <= agora) return false;
  if (
    input.status === "past_due"
    && (!input.periodoGracaTerminaEm || new Date(input.periodoGracaTerminaEm) <= agora)
  ) return false;

  switch (input.origem ?? "stripe") {
    case "stripe":
      return precoConcedePlus(input.priceId, precosConfirmados);
    case "vitalicio":
      return Boolean(input.paymentIntent) && precoConcedePlus(input.priceId, precosConfirmados);
    case "lemon_squeezy":
      return Boolean(input.lsSubscriptionId);
    case "cupao":
      return Boolean(input.cupaoId && input.terminaEm);
    case "manual":
      return Boolean(input.motivo?.trim() && input.concedidoPor);
    default:
      return false;
  }
}

export function eVitalicio(origem: OrigemConcessao | null | undefined): boolean {
  return origem === "vitalicio" || origem === "manual";
}

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
  etiqueta: string;
  mensagem: string;
  temAcesso: boolean;
  requerAcao: boolean;
  tom: "neutro" | "positivo" | "aviso" | "alerta";
}

export function descreverEstado(
  status: string | null | undefined,
  temSessao: boolean,
  periodoGracaTerminaEm?: string | null,
): DescricaoEstado {
  if (!temSessao) return {
    estado: "sem-conta", etiqueta: "Sem conta",
    mensagem: "Estás a usar o Recibo Certo sem conta. Os dados ficam guardados neste dispositivo.",
    temAcesso: false, requerAcao: false, tom: "neutro",
  };

  if (status === "active") return {
    estado: "ativo", etiqueta: "Plus ativo",
    mensagem: "A tua subscrição está ativa. Histórico na nuvem, cenários ilimitados e exportações.",
    temAcesso: true, requerAcao: false, tom: "positivo",
  };
  if (status === "trialing") return {
    estado: "periodo-experimental", etiqueta: "Período experimental",
    mensagem: "Estás a experimentar o Plus. No fim do período, a subscrição começa a ser cobrada.",
    temAcesso: true, requerAcao: false, tom: "positivo",
  };
  if (status === "past_due") {
    const dentroDaGraca = periodoGracaTerminaEm
      ? new Date(periodoGracaTerminaEm) > new Date()
      : false;
    return {
      estado: "pagamento-em-atraso",
      etiqueta: dentroDaGraca ? "Pagamento em atraso" : "Acesso suspenso",
      mensagem: dentroDaGraca
        ? `O último pagamento falhou. Manténs o acesso durante ${DIAS_PERIODO_GRACA} dias enquanto atualizas o método de pagamento.`
        : "O período de graça terminou. Atualiza o método de pagamento no portal para recuperar o Plus.",
      temAcesso: dentroDaGraca, requerAcao: true, tom: dentroDaGraca ? "aviso" : "alerta",
    };
  }
  if (status === "canceled" || status === "unpaid" || status === "paused") return {
    estado: "cancelado", etiqueta: "Subscrição sem acesso",
    mensagem: "O Plus não está ativo. Os dados mantêm-se durante a janela de retenção indicada na conta.",
    temAcesso: false, requerAcao: status !== "canceled", tom: "neutro",
  };
  if (status === "incomplete" || status === "incomplete_expired") return {
    estado: "incompleto", etiqueta: "Subscrição por concluir",
    mensagem: "O pagamento não chegou a ser confirmado. Podes tentar novamente.",
    temAcesso: false, requerAcao: true, tom: "aviso",
  };
  return {
    estado: "gratis", etiqueta: "Plano grátis",
    mensagem: "Calculadoras e guias sem limite; o Plus acrescenta nuvem e exportações.",
    temAcesso: false, requerAcao: false, tom: "neutro",
  };
}
