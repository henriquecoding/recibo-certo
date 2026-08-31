// ═══════════════════════════════════════════════════════════════════════
//  CARTÃO DE FIDELIDADE — o motor, puro e testável
//  ---------------------------------------------------------------------
//  Um carimbo por consulta realizada. Ao atingir a meta, o cliente ganha um
//  cupão de desconto sobre o preço que o contabilista configurou.
//
//  O que este módulo NÃO faz, de propósito: escrever na base de dados. As
//  transições são funções puras; quem as persiste é o servidor, com a chave
//  de serviço. Foi essa a lição da migração 024 (os prémios do quiz eram
//  escritos pelo cliente e qualquer pessoa se auto-oferecia três meses de
//  Pro): validar QUEM escreve não chega, é preciso validar O QUE é escrito —
//  e para isso o cálculo tem de viver num sítio onde o cliente não chega.
//
//  ⚠️ O cupão é um acordo entre o cliente e o contabilista. O Recibo Certo
//  regista-o e mostra-o; NÃO cobra a consulta, não processa o pagamento e
//  não garante o desconto. A interface tem de dizer isto.
// ═══════════════════════════════════════════════════════════════════════

/** Desconto mínimo. O enunciado do produto começa nos 10%. */
export const DESCONTO_MIN_PCT = 10;
/** Desconto máximo que o contabilista pode configurar. */
export const DESCONTO_MAX_PCT = 50;
/** Valor de partida de um perfil novo. */
export const DESCONTO_INICIAL_PCT = 10;

/** Consultas necessárias para completar um cartão. */
export const META_MIN = 3;
export const META_MAX = 12;
export const META_INICIAL = 5;

/** Validade de um cupão emitido, em dias. */
export const VALIDADE_CUPAO_DIAS = 365;

export interface ConfigFidelidade {
  /** Percentagem de desconto ao completar o cartão (10 a 50). */
  descontoPct: number;
  /** Consultas por cartão (3 a 12). */
  meta: number;
  /** Preço da consulta, em cêntimos inteiros. */
  precoConsultaCents: number;
  ativa: boolean;
}

export const CONFIG_FIDELIDADE_INICIAL: ConfigFidelidade = {
  descontoPct: DESCONTO_INICIAL_PCT,
  meta: META_INICIAL,
  precoConsultaCents: 0,
  ativa: false,
};

// ─── Validação ─────────────────────────────────────────────────────────

export interface ResultadoValidacao {
  ok: boolean;
  erros: string[];
}

/**
 * Valida a configuração antes de a gravar. As mesmas fronteiras estão em
 * restrições CHECK na migração 042 — isto é a mensagem legível, aquilo é a
 * garantia. Nunca só isto.
 */
export function validarConfigFidelidade(c: ConfigFidelidade): ResultadoValidacao {
  const erros: string[] = [];

  if (!Number.isInteger(c.descontoPct)) {
    erros.push("A percentagem de desconto tem de ser um número inteiro.");
  } else if (c.descontoPct < DESCONTO_MIN_PCT || c.descontoPct > DESCONTO_MAX_PCT) {
    erros.push(`O desconto tem de estar entre ${DESCONTO_MIN_PCT}% e ${DESCONTO_MAX_PCT}%.`);
  }

  if (!Number.isInteger(c.meta)) {
    erros.push("O número de consultas do cartão tem de ser um número inteiro.");
  } else if (c.meta < META_MIN || c.meta > META_MAX) {
    erros.push(`O cartão tem de ter entre ${META_MIN} e ${META_MAX} consultas.`);
  }

  if (!Number.isInteger(c.precoConsultaCents) || c.precoConsultaCents < 0) {
    erros.push("O preço da consulta tem de ser um valor válido.");
  } else if (c.ativa && c.precoConsultaCents <= 0) {
    // Sem preço não há «valor original» sobre o qual descontar, e um cupão de
    // 20% sobre nada é uma promessa vazia.
    erros.push("Define o preço da consulta antes de ativar o cartão de fidelidade.");
  }

  return { ok: erros.length === 0, erros };
}

/** Aproxima um valor para dentro das fronteiras, para sliders e inputs. */
export function normalizarDesconto(v: number): number {
  if (!Number.isFinite(v)) return DESCONTO_INICIAL_PCT;
  return Math.min(DESCONTO_MAX_PCT, Math.max(DESCONTO_MIN_PCT, Math.round(v)));
}

export function normalizarMeta(v: number): number {
  if (!Number.isFinite(v)) return META_INICIAL;
  return Math.min(META_MAX, Math.max(META_MIN, Math.round(v)));
}

// ─── Progresso ─────────────────────────────────────────────────────────

export interface Progresso {
  carimbos: number;
  meta: number;
  faltam: number;
  completo: boolean;
  /** 0 a 1, para barras e anéis de progresso. */
  fracao: number;
}

export function progresso(carimbos: number, meta: number): Progresso {
  const m = Math.max(1, Math.trunc(meta));
  const c = Math.min(m, Math.max(0, Math.trunc(carimbos)));
  return {
    carimbos: c,
    meta: m,
    faltam: Math.max(0, m - c),
    completo: c >= m,
    fracao: c / m,
  };
}

// ─── Transição: carimbar ───────────────────────────────────────────────

export interface EstadoCartao {
  carimbos: number;
  meta: number;
  /**
   * Percentagem congelada na ABERTURA do cartão.
   *
   * Não se lê a configuração atual do contabilista no momento de emitir: quem
   * começou um cartão de 20% não pode ver a promessa cair para 10% na última
   * consulta. Mudar a configuração afeta cartões novos, nunca os que já estão
   * a decorrer.
   */
  descontoPct: number;
  precoConsultaCents: number;
}

export interface ResultadoCarimbo {
  cartao: EstadoCartao;
  /** True quando este carimbo fechou o cartão. */
  completou: boolean;
  /** O cupão a emitir, quando `completou`. */
  cupao: { percentagem: number; valorBaseCents: number } | null;
  /** Quando o cartão fecha, abre-se outro — devolvido já com zero carimbos. */
  proximoCartao: EstadoCartao | null;
}

/**
 * Aplica um carimbo. Função pura: a mesma entrada dá sempre a mesma saída.
 *
 * A idempotência NÃO vive aqui — vive na restrição `UNIQUE (agendamento_id)`
 * de `fidelidade_carimbos`. Carimbar duas vezes a mesma consulta viola uma
 * restrição da base de dados em vez de depender de esta função ser chamada o
 * número certo de vezes.
 *
 * @param cartaoNovo configuração em vigor, para o cartão que abre a seguir.
 */
export function aplicarCarimbo(
  cartao: EstadoCartao,
  cartaoNovo?: Partial<EstadoCartao>
): ResultadoCarimbo {
  const meta = Math.max(1, Math.trunc(cartao.meta));
  const carimbos = Math.max(0, Math.trunc(cartao.carimbos)) + 1;

  if (carimbos < meta) {
    return {
      cartao: { ...cartao, meta, carimbos },
      completou: false,
      cupao: null,
      proximoCartao: null,
    };
  }

  return {
    cartao: { ...cartao, meta, carimbos: meta },
    completou: true,
    cupao: {
      percentagem: cartao.descontoPct,
      valorBaseCents: cartao.precoConsultaCents,
    },
    proximoCartao: {
      carimbos: 0,
      meta: cartaoNovo?.meta ?? meta,
      descontoPct: cartaoNovo?.descontoPct ?? cartao.descontoPct,
      precoConsultaCents: cartaoNovo?.precoConsultaCents ?? cartao.precoConsultaCents,
    },
  };
}

// ─── Dinheiro ──────────────────────────────────────────────────────────

export interface ValorComDesconto {
  baseCents: number;
  descontoCents: number;
  finalCents: number;
  percentagem: number;
}

/**
 * Aplica a percentagem ao preço. Tudo em cêntimos inteiros: em vírgula
 * flutuante, 0,1 + 0,2 não é 0,3, e um cêntimo perdido numa fatura é um erro
 * visível para quem a recebe.
 */
export function valorComDesconto(baseCents: number, percentagem: number): ValorComDesconto {
  const base = Math.max(0, Math.trunc(baseCents));
  const pct = Math.min(100, Math.max(0, percentagem));
  const desconto = Math.round((base * pct) / 100);
  return {
    baseCents: base,
    descontoCents: desconto,
    finalCents: base - desconto,
    percentagem: pct,
  };
}

/** "125,00 €" a partir de cêntimos. */
export function eurosDeCents(cents: number): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Math.trunc(cents) / 100);
}

// ─── Código do cupão ───────────────────────────────────────────────────

/** Alfabeto sem caracteres ambíguos (0/O, 1/I/L) — o código é lido em voz alta. */
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * Formata bytes aleatórios num código legível: `RC-XXXX-XXXX`.
 *
 * Recebe os bytes em vez de os gerar para continuar a ser uma função pura —
 * quem chama passa `crypto.getRandomValues`, e o teste passa bytes fixos.
 */
export function formatarCodigoCupao(bytes: Uint8Array): string {
  const letras: string[] = [];
  for (let i = 0; i < 8; i++) {
    letras.push(ALFABETO[(bytes[i] ?? 0) % ALFABETO.length]);
  }
  return `RC-${letras.slice(0, 4).join("")}-${letras.slice(4).join("")}`;
}

/** Aceita o código escrito à mão: espaços a mais, minúsculas, hífens em falta. */
export function normalizarCodigoCupao(bruto: string): string {
  const limpo = bruto.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const semPrefixo = limpo.startsWith("RC") ? limpo.slice(2) : limpo;
  if (semPrefixo.length !== 8) return "";
  return `RC-${semPrefixo.slice(0, 4)}-${semPrefixo.slice(4)}`;
}

/** Um cupão só vale se estiver disponível e dentro da validade. */
export function cupaoValido(
  estado: string,
  expiraEm: string,
  agora: Date = new Date()
): boolean {
  if (estado !== "disponivel") return false;
  const limite = Date.parse(expiraEm);
  return Number.isFinite(limite) && limite > agora.getTime();
}
