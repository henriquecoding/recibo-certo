// ═══════════════════════════════════════════════════════════════════════
//  PLATAFORMA DE CONTABILISTAS — tipos partilhados
//  ---------------------------------------------------------------------
//  Uma só definição de cada estado, usada pelo domínio, pelas rotas de API
//  e pela interface. Os mesmos nomes aparecem nas restrições CHECK da
//  migração 042: quando um estado novo aparecer aqui sem aparecer lá, a
//  base de dados recusa a escrita — que é o comportamento certo.
//
//  Ver `docs/PLATAFORMA-CONTABILISTAS.md`.
// ═══════════════════════════════════════════════════════════════════════

/** Estado de uma conta de contabilista. Só a administração o altera. */
export type EstadoContabilista = "pendente" | "aprovado" | "recusado" | "suspenso";

/** Estado do vínculo entre um cliente e um contabilista. */
export type EstadoVinculo = "convidado" | "pendente" | "ativo" | "pausado" | "terminado";

/**
 * Ciclo de vida de um agendamento.
 *
 * `realizada` é o único estado que carimba o cartão de fidelidade, e só o
 * contabilista o pode marcar — se o cliente pudesse, o cartão enchia-se
 * sozinho.
 */
export type EstadoAgendamento =
  | "pedido"
  | "confirmado"
  | "realizada"
  | "cancelado_cliente"
  | "cancelado_contabilista"
  | "nao_compareceu";

/** Os dois estados em que o horário fica mesmo ocupado na agenda. */
export const ESTADOS_OCUPAM_AGENDA: readonly EstadoAgendamento[] = ["pedido", "confirmado"];

export type Modalidade = "presencial" | "online";

/** Estado de uma partilha de dados simulados. */
export type EstadoPartilha = "enviada" | "vista" | "revogada";

/**
 * Que ferramenta gerou os dados partilhados. Serve para o contabilista saber
 * o que está a ler e para a interface escolher a apresentação.
 */
export type TipoPartilha =
  | "simulador_irs"
  | "recibos_verdes"
  | "recibo_vencimento"
  | "comparador_regimes"
  | "simulador_empresa"
  | "simulador_herancas"
  | "cenario_guardado"
  | "resumo_anual";

export type EstadoCupao = "disponivel" | "usado" | "expirado";

/** Estado de uma candidatura a conta de contabilista. */
export type EstadoPedido = "pendente" | "em_analise" | "aprovado" | "recusado";

// ─── Registos ──────────────────────────────────────────────────────────

/** Perfil público + configuração comercial de um contabilista. */
export interface Contabilista {
  userId: string;
  slug: string;
  nome: string;
  /** Número de inscrição na Ordem dos Contabilistas Certificados, se público. */
  occ: string | null;
  bio: string;
  distrito: string | null;
  concelho: string | null;
  especialidades: string[];
  modalidades: Modalidade[];
  emailContacto: string | null;
  telefone: string | null;
  website: string | null;
  estado: EstadoContabilista;
  aceitaNovosClientes: boolean;
  /** Preço da consulta, em cêntimos. É sobre este valor que o cupão incide. */
  precoConsultaCents: number;
  duracaoConsultaMin: number;
  fidelidadeMeta: number;
  fidelidadeDescontoPct: number;
  fidelidadeAtiva: boolean;
  criadoEm: string;
}

export interface Vinculo {
  id: string;
  contabilistaId: string;
  clienteId: string;
  estado: EstadoVinculo;
  criadoEm: string;
  /** Quem iniciou: o cliente pediu, ou o contabilista convidou. */
  origem: "cliente" | "contabilista";
}

export interface Agendamento {
  id: string;
  contabilistaId: string;
  clienteId: string;
  inicio: string;
  fim: string;
  estado: EstadoAgendamento;
  modalidade: Modalidade;
  assunto: string | null;
  criadoEm: string;
}

export interface Partilha {
  id: string;
  contabilistaId: string;
  clienteId: string;
  tipo: TipoPartilha;
  titulo: string;
  /** Cópia imutável do que foi enviado. Nunca um apontador para os dados vivos. */
  conteudo: Record<string, unknown>;
  estado: EstadoPartilha;
  consentimentoVersao: string;
  criadoEm: string;
}

export interface CartaoFidelidade {
  id: string;
  contabilistaId: string;
  clienteId: string;
  carimbos: number;
  meta: number;
  /** Percentagem congelada na abertura do cartão — ver `fidelidade.ts`. */
  descontoPct: number;
  completo: boolean;
}

export interface Cupao {
  id: string;
  codigo: string;
  contabilistaId: string;
  clienteId: string;
  percentagem: number;
  /** Preço da consulta no instante da emissão, em cêntimos. */
  valorBaseCents: number;
  estado: EstadoCupao;
  criadoEm: string;
  expiraEm: string;
}
