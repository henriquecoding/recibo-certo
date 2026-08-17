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
  /**
   * Identidade declarada pelo próprio — §120 e §139.
   *
   * Nenhum destes campos é calculado, e é essa a razão de existirem em
   * vez de serem inferidos: os anos de experiência não se deduzem da data
   * de registo, e o tempo de resposta é um compromisso e não uma medição.
   * A interface é obrigada a rotulá-los como declarados.
   */
  tituloProfissional: string | null;
  /** Uma linha para o cartão do diretório. Não substitui a bio. */
  apresentacaoCurta: string | null;
  /** Códigos do catálogo fechado (`pt`, `en`, …). Ver `perfil.ts`. */
  idiomas: string[];
  anosExperiencia: number | null;
  respostaMediaHoras: number | null;
  /**
   * Facto administrativo, nunca escrito pelo próprio (§124).
   *
   * Um número no formulário é «informado». «Verificado» exige que alguém
   * o tenha confirmado junto da Ordem — e mudar o número apaga o selo,
   * por trigger.
   */
  occVerificado: boolean;
  linkedinLigado: boolean;
  estado: EstadoContabilista;
  aceitaNovosClientes: boolean;
  /** Preço da consulta, em cêntimos. É sobre este valor que o cupão incide. */
  precoConsultaCents: number;
  duracaoConsultaMin: number;
  fidelidadeMeta: number;
  fidelidadeDescontoPct: number;
  fidelidadeAtiva: boolean;
  /**
   * Se um cliente consegue mesmo pagar-lhe pela plataforma.
   *
   * Vem de `contabilistas_publico.recebe_pagamentos`, que por sua vez vem
   * do `charges_enabled` da conta Stripe. É o ÚNICO facto que sai dessa
   * conta para o lado público: nem o id, nem os requisitos, nem se está em
   * análise. Quem vê `false` não consegue distinguir «nunca ligou» de «tem
   * um documento por enviar», e é isso que se pretende.
   */
  recebePagamentos: boolean;
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
  /**
   * O nome por que o cliente quis ser tratado NESTE vínculo.
   *
   * `null` é um estado legítimo, não um dado em falta: dizer o nome é uma
   * escolha do cliente, e sem ele o painel mostra um identificador curto.
   * Não vem da conta — dois contabilistas podem ver nomes diferentes da
   * mesma pessoa, e terminar o acompanhamento apaga-o (migração 043).
   */
  nomeCliente: string | null;
  /** Recado que o cliente escreveu ao pedir o vínculo. */
  mensagem: string | null;
}

// Aqui esteve `emailCliente`, e a sua ausência é uma decisão, não um
// esquecimento: o vínculo não guarda nenhum canal de contacto do cliente,
// e a coluna deixou de existir na base de dados com a migração da fronteira de contacto.
//
// O motivo não é retenção artificial. É que tudo o que a plataforma promete
// — a partilha que se revoga, o ficheiro que fecha quando o acompanhamento
// acaba, o registo do que foi pedido e quando — vale zero no instante em
// que a conversa muda para um canal onde nada disso existe. Quem
// acrescentar um campo destes outra vez parte a promessa inteira, e o teste
// `13-fronteira-de-contacto.sql` recusa qualquer coluna com nome parecido.

export interface Agendamento {
  id: string;
  contabilistaId: string;
  clienteId: string;
  inicio: string;
  fim: string;
  estado: EstadoAgendamento;
  modalidade: Modalidade;
  assunto: string | null;
  /**
   * Morada da consulta presencial, ou link da chamada.
   *
   * Existia na base de dados desde a migração 042 e a rota de API já a
   * gravava — mas não estava neste tipo, e por isso nenhum ecrã a mostrava.
   * Quem marcava presencial nunca soube a morada.
   */
  localOuLigacao: string | null;
  /**
   * O ponto que o contabilista escolheu no mapa para a consulta presencial.
   *
   * Acompanha a morada, não a substitui: a morada é o que se lê, o ponto é
   * o que abre direito na aplicação de mapas do cliente e o que torna o
   * local verificável. Nulo em consultas online, e nas presenciais
   * anteriores à migração `20260817120000_local_verificado_da_consulta` —
   * que continuam a valer como texto.
   *
   * As duas coordenadas existem juntas ou não existem: meia coordenada é
   * um ponto no mar, e a base recusa-a.
   */
  localLat: number | null;
  localLng: number | null;
  criadoEm: string;
}

/**
 * Como tratar um cliente quando ele não deu nome.
 *
 * Quatro caracteres do id, em maiúsculas: curto, estável e suficiente para
 * distinguir dois clientes numa lista. Não é uma alcunha simpática de
 * propósito — parecer um nome quando não é seria pior do que assumir que
 * não há nome nenhum.
 */
export function tratamentoDoCliente(v: Pick<Vinculo, "nomeCliente" | "clienteId">): string {
  const nome = v.nomeCliente?.trim();
  if (nome) return nome;
  return `Cliente ${v.clienteId.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

export interface Partilha {
  id: string;
  contabilistaId: string;
  clienteId: string;
  tipo: TipoPartilha;
  titulo: string;
  /** Cópia imutável do que foi enviado. Nunca um apontador para os dados vivos. */
  conteudo: Record<string, unknown>;
  /**
   * O que o cliente escreveu ao enviar — «o que queres que ele veja
   * primeiro». É a única parte da partilha escrita por uma pessoa e não
   * calculada por uma ferramenta, e por isso a primeira a ser lida.
   */
  nota: string | null;
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
