// ═══════════════════════════════════════════════════════════════════════
//  A LOJA DE DEMONSTRAÇÃO — a base de dados que vive em memória
//  ---------------------------------------------------------------------
//  Isto NÃO é uma coleção de ecrãs com números bonitos: é uma cópia das
//  regras. Confirmar uma consulta aqui exige que ela esteja por confirmar,
//  concluí-la exige que já tenha começado, e concluir com presença carimba
//  o cartão pela MESMA função pura que o servidor usa (`aplicarCarimbo`).
//  Dar um cupão por usado gasta-o e não o devolve.
//
//  A razão de ser assim é simples: uma demonstração que aceita tudo mente
//  sobre o painel real. Quem a abre para validar o produto tem de bater
//  contra as mesmas paredes — incluindo as mensagens de erro, que são as
//  mesmas literais das RPC (migrações 042 e 047).
//
//  O que NÃO está aqui, e é de propósito:
//   · nenhuma escrita sai desta memória. Recarregar a página repõe tudo.
//   · nenhum ficheiro sobe nem desce; anexar devolve o mesmo erro claro.
//   · nenhum canal de Realtime é aberto — as escutas devolvem um adeus vazio.
// ═══════════════════════════════════════════════════════════════════════

import { aplicarCarimbo, cupaoValido, formatarCodigoCupao, normalizarCodigoCupao, valorComDesconto } from "../fidelidade";
import type { Excecao, RegraDisponibilidade } from "../agenda";
import type {
  AnexoDaProposta, Caso, DocumentoDoCaso, MensagemDoCaso, NovaProposta, Proposta,
} from "../casos";
import type { Mensagem, Notificacao } from "../conversa";
import type { EstadoTarefa, Tarefa } from "../trabalho";
import type { NovoTipoConsulta, TipoConsulta } from "../tipos-consulta";
import type {
  Agendamento, Contabilista, EstadoAgendamento, Partilha, Vinculo,
} from "../tipos";
import type { EstadoProgressao } from "../progressao/catalogo";
import type { ImpactoDaRegra, RegraLida, ResultadoPublicacao } from "../fidelidade/dados";
import { validarLayout } from "../dashboard/layout";
import { erroQueImpedeGravar } from "../dashboard/validacao";
import type { WorkspaceLayoutV2, WorkspaceView } from "../dashboard/tipos";
import { semear, type CupaoDemo, type EstadoDemonstracao, type EventoXPDemo } from "./semente";

// ─── O estado ──────────────────────────────────────────────────────────

let estado: EstadoDemonstracao | null = null;

/** Semeado à primeira pergunta, e não ao carregar o módulo. */
function bd(): EstadoDemonstracao {
  if (!estado) estado = semear();
  return estado;
}

/** Volta ao consultório inicial. É o que o botão «Repor» do painel faz. */
export function reporDemonstracao(): void {
  estado = semear();
}

/** Só para os testes: semear com um instante fixo. */
export function semearPara(agora: Date): EstadoDemonstracao {
  estado = semear(agora);
  return estado;
}

// ─── Utilidades ────────────────────────────────────────────────────────

let contador = 0;

/** Um id novo, com forma de UUID, estável dentro da sessão. */
function novoId(): string {
  contador += 1;
  const sufixo = String(contador).padStart(12, "0");
  return `f0000000-0000-4000-8000-${sufixo}`;
}

/** Copia à saída: quem lê não pode alterar a loja sem passar por uma escrita. */
function copiar<T>(v: T): T {
  return structuredClone(v);
}

const agora = () => new Date().toISOString();

// ─── Ficha ─────────────────────────────────────────────────────────────

export async function obterMinhaFicha(): Promise<Contabilista> {
  return copiar(bd().ficha);
}

/** Os mesmos nomes de coluna do `update` real — para não haver dois dialetos. */
export async function atualizarFicha(
  campos: Record<string, unknown>
): Promise<{ erro?: string }> {
  const f = bd().ficha;
  const texto = (v: unknown) => (typeof v === "string" ? v : null);
  const numero = (v: unknown, omissao: number) => (typeof v === "number" ? v : omissao);

  if ("nome" in campos) f.nome = texto(campos.nome) ?? f.nome;
  if ("occ" in campos) f.occ = texto(campos.occ);
  if ("bio" in campos) f.bio = texto(campos.bio) ?? "";
  if ("distrito" in campos) f.distrito = texto(campos.distrito);
  if ("concelho" in campos) f.concelho = texto(campos.concelho);
  if ("especialidades" in campos) f.especialidades = (campos.especialidades as string[]) ?? [];
  if ("modalidades" in campos) f.modalidades = (campos.modalidades as Contabilista["modalidades"]) ?? [];
  if ("email_contacto" in campos) f.emailContacto = texto(campos.email_contacto);
  if ("telefone" in campos) f.telefone = texto(campos.telefone);
  if ("website" in campos) f.website = texto(campos.website);
  if ("aceita_novos_clientes" in campos) f.aceitaNovosClientes = campos.aceita_novos_clientes === true;
  if ("preco_consulta_cents" in campos) f.precoConsultaCents = numero(campos.preco_consulta_cents, f.precoConsultaCents);
  if ("duracao_consulta_min" in campos) f.duracaoConsultaMin = numero(campos.duracao_consulta_min, f.duracaoConsultaMin);
  if ("fidelidade_meta" in campos) f.fidelidadeMeta = numero(campos.fidelidade_meta, f.fidelidadeMeta);
  if ("fidelidade_desconto_pct" in campos) f.fidelidadeDescontoPct = numero(campos.fidelidade_desconto_pct, f.fidelidadeDescontoPct);
  if ("fidelidade_ativa" in campos) f.fidelidadeAtiva = campos.fidelidade_ativa === true;

  return {};
}

// ─── Vínculos ──────────────────────────────────────────────────────────

export async function meusClientes(): Promise<Vinculo[]> {
  return copiar(
    [...bd().vinculos].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
  );
}

/**
 * A mesma tabela de transições da RPC `decidir_vinculo` (migração 047).
 *
 * A precondição de estado é o essencial: aceitar um vínculo que já não está
 * pendente tem de falhar aqui como falha lá, e com a mesma frase.
 */
const TRANSICAO: Record<string, { para: Vinculo["estado"]; de: Vinculo["estado"][] }> = {
  aceitar: { para: "ativo", de: ["pendente", "convidado"] },
  recusar: { para: "terminado", de: ["pendente", "convidado"] },
  pausar: { para: "pausado", de: ["ativo"] },
  reativar: { para: "ativo", de: ["pausado"] },
  terminar: { para: "terminado", de: ["pendente", "convidado", "ativo", "pausado"] },
};

export async function decidirVinculo(
  id: string,
  decisao: "aceitar" | "recusar" | "pausar" | "reativar" | "terminar"
): Promise<{ erro?: string }> {
  const regra = TRANSICAO[decisao];
  const v = bd().vinculos.find((x) => x.id === id);
  if (!regra || !v || !regra.de.includes(v.estado)) {
    return { erro: "Este acompanhamento já não estava nesse estado." };
  }

  v.estado = regra.para;
  // Terminar apaga o nome e o email — a migração 043 faz o mesmo, e é a
  // diferença entre «deixei de acompanhar» e «continuo a ter os dados».
  if (regra.para === "terminado") {
    v.nomeCliente = null;
    v.emailCliente = null;
    v.mensagem = null;
  }
  return {};
}

export async function contagensDoPainel(): Promise<{
  pedidos: number;
  partilhasPorLer: number;
  consultasPorConfirmar: number;
}> {
  const d = bd();
  return {
    pedidos: d.vinculos.filter((v) => v.estado === "pendente").length,
    partilhasPorLer: d.partilhas.filter((p) => p.estado === "enviada").length,
    consultasPorConfirmar: d.agendamentos.filter((a) => a.estado === "pedido").length,
  };
}

// ─── Agenda ────────────────────────────────────────────────────────────

export async function listarAgendamentos(filtro: { desde?: Date } = {}): Promise<Agendamento[]> {
  const limite = filtro.desde?.toISOString();
  return copiar(
    bd().agendamentos
      .filter((a) => !limite || a.inicio >= limite)
      .sort((a, b) => a.inicio.localeCompare(b.inicio))
  );
}

export async function obterDisponibilidade(): Promise<RegraDisponibilidade[]> {
  return copiar([...bd().disponibilidade].sort((a, b) => a.diaSemana - b.diaSemana));
}

export async function guardarDisponibilidade(
  regras: RegraDisponibilidade[]
): Promise<{ erro?: string }> {
  // Substituição integral, como no real: a semana-tipo é um conjunto.
  bd().disponibilidade = copiar(regras);
  return {};
}

export async function obterExcecoes(desde?: string): Promise<Excecao[]> {
  return copiar(bd().excecoes.filter((e) => !desde || e.data >= desde));
}

export async function fecharDia(data: string, motivo?: string): Promise<{ erro?: string }> {
  const d = bd();
  if (d.excecoes.some((e) => e.data === data)) return {};
  d.excecoes.push({ data, motivo: motivo?.slice(0, 200) || undefined });
  return {};
}

export async function reabrirDia(data: string): Promise<{ erro?: string }> {
  const d = bd();
  d.excecoes = d.excecoes.filter((e) => e.data !== data);
  return {};
}

export interface FidelidadeAposConsulta {
  ok?: boolean;
  motivo?: string;
  completou?: boolean;
  carimbos?: number;
  meta?: number;
  percentagem?: number;
}

/**
 * As três RPC de consulta, com as precondições que elas têm.
 *
 * `realizada` carimba na mesma passagem — e usa `aplicarCarimbo`, a função
 * pura que o servidor também usa. Não há aqui uma segunda regra de
 * fidelidade: há a mesma, chamada de outro sítio.
 */
export async function decidirConsulta(
  id: string,
  novoEstado: EstadoAgendamento,
  localOuLigacao?: string
): Promise<{ erro?: string; fidelidade?: FidelidadeAposConsulta | null }> {
  const d = bd();
  const a = d.agendamentos.find((x) => x.id === id);
  if (!a) return { erro: "Esta consulta não é tua." };

  if (novoEstado === "confirmado") {
    if (a.estado !== "pedido") return { erro: "Esta consulta já não estava por confirmar." };
    a.estado = "confirmado";
    if (localOuLigacao?.trim()) a.localOuLigacao = localOuLigacao.trim();
    return { fidelidade: null };
  }

  if (novoEstado === "realizada" || novoEstado === "nao_compareceu") {
    const aberta = a.estado === "pedido" || a.estado === "confirmado";
    const jaComecou = Date.parse(a.inicio) <= Date.now();
    if (!aberta || !jaComecou) {
      return { erro: "Só se conclui uma consulta que já começou e ainda está aberta." };
    }
    a.estado = novoEstado;
    if (novoEstado === "nao_compareceu") return { fidelidade: null };
    return { fidelidade: carimbar(a) };
  }

  // Cancelar.
  if (a.estado !== "pedido" && a.estado !== "confirmado") {
    return { erro: "Esta consulta já não estava por realizar." };
  }
  a.estado = "cancelado_contabilista";
  return { fidelidade: null };
}

/** O que `carimbar_consulta` faz (migração 042), com os mesmos passos. */
function carimbar(a: Agendamento): FidelidadeAposConsulta {
  const d = bd();
  if (!d.ficha.fidelidadeAtiva) return { ok: false, motivo: "fidelidade_inativa" };

  let cartao = d.cartoes.find((c) => c.clienteId === a.clienteId && !c.completo);
  if (!cartao) {
    // Abre-se com a configuração DE AGORA, que fica congelada até ao fim.
    cartao = {
      id: novoId(),
      contabilistaId: d.ficha.userId,
      clienteId: a.clienteId,
      carimbos: 0,
      meta: d.ficha.fidelidadeMeta,
      descontoPct: d.ficha.fidelidadeDescontoPct,
      precoBaseCents: d.ficha.precoConsultaCents,
      completo: false,
    };
    d.cartoes.push(cartao);
  }

  const r = aplicarCarimbo(
    {
      carimbos: cartao.carimbos,
      meta: cartao.meta,
      descontoPct: cartao.descontoPct,
      precoConsultaCents: cartao.precoBaseCents,
    },
    {
      meta: d.ficha.fidelidadeMeta,
      descontoPct: d.ficha.fidelidadeDescontoPct,
      precoConsultaCents: d.ficha.precoConsultaCents,
    }
  );

  cartao.carimbos = r.cartao.carimbos;

  if (!r.completou || !r.cupao) {
    return { ok: true, completou: false, carimbos: cartao.carimbos, meta: cartao.meta };
  }

  cartao.completo = true;
  d.cupoes.unshift({
    id: novoId(),
    codigo: codigoNovo(),
    contabilistaId: d.ficha.userId,
    clienteId: a.clienteId,
    percentagem: r.cupao.percentagem,
    valorBaseCents: r.cupao.valorBaseCents,
    estado: "disponivel",
    expiraEm: new Date(Date.now() + 365 * 86400_000).toISOString(),
    criadoEm: agora(),
  });

  if (r.proximoCartao) {
    d.cartoes.push({
      id: novoId(),
      contabilistaId: d.ficha.userId,
      clienteId: a.clienteId,
      carimbos: r.proximoCartao.carimbos,
      meta: r.proximoCartao.meta,
      descontoPct: r.proximoCartao.descontoPct,
      precoBaseCents: r.proximoCartao.precoConsultaCents,
      completo: false,
    });
  }

  return {
    ok: true,
    completou: true,
    carimbos: cartao.carimbos,
    meta: cartao.meta,
    percentagem: r.cupao.percentagem,
  };
}

function codigoNovo(): string {
  const bytes = new Uint8Array(8);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 8; i++) bytes[i] = (contador * 31 + i * 7) % 251;
  }
  return formatarCodigoCupao(bytes);
}

// ─── Partilhas ─────────────────────────────────────────────────────────

export async function listarPartilhas(): Promise<Partilha[]> {
  return copiar(
    [...bd().partilhas].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
  );
}

export async function marcarPartilhaVista(id: string): Promise<void> {
  const p = bd().partilhas.find((x) => x.id === id);
  if (p && p.estado === "enviada") p.estado = "vista";
}

// ─── Fidelidade ────────────────────────────────────────────────────────

export interface CartaoAberto {
  clienteId: string;
  carimbos: number;
  meta: number;
  descontoPct: number;
  precoBaseCents: number;
}

export async function cartoesAbertos(clienteId?: string): Promise<CartaoAberto[]> {
  return bd().cartoes
    .filter((c) => !c.completo && (!clienteId || c.clienteId === clienteId))
    .map((c) => ({
      clienteId: c.clienteId,
      carimbos: c.carimbos,
      meta: c.meta,
      descontoPct: c.descontoPct,
      precoBaseCents: c.precoBaseCents,
    }));
}

export async function meusCupoes(): Promise<CupaoDemo[]> {
  return copiar(
    [...bd().cupoes].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
  );
}

export interface ResultadoCupao {
  erro?: string;
  percentagem?: number;
  baseCents?: number;
  finalCents?: number;
}

/**
 * Dar um cupão por usado — e gastá-lo.
 *
 * Não há aqui uma versão «só a espreitar»: no real, validar consome. Uma
 * demonstração que devolvesse o cupão ao fim de um segundo ensinava o
 * contrário do que a rota faz.
 */
export async function usarCupao(codigoBruto: string): Promise<ResultadoCupao> {
  const codigo = normalizarCodigoCupao(codigoBruto);
  if (!codigo) return { erro: "O código tem oito caracteres, no formato RC-XXXX-XXXX." };

  const c = bd().cupoes.find((x) => x.codigo === codigo);
  if (!c) return { erro: "Não há nenhum cupão com esse código." };
  if (!cupaoValido(c.estado, c.expiraEm)) {
    return { erro: c.estado === "usado" ? "Este cupão já foi usado." : "Este cupão já expirou." };
  }

  c.estado = "usado";
  const valor = valorComDesconto(c.valorBaseCents, c.percentagem);
  return {
    percentagem: c.percentagem,
    baseCents: valor.baseCents,
    finalCents: valor.finalCents,
  };
}

// ─── Trabalho ──────────────────────────────────────────────────────────

export async function listarTarefas(): Promise<Tarefa[]> {
  return copiar([...bd().tarefas].sort((a, b) => a.ordem - b.ordem));
}

export async function criarTarefa(p: {
  titulo: string;
  vinculoId?: string | null;
  prazo?: string | null;
  etiquetas?: string[];
  notas?: string;
}): Promise<{ erro?: string; id?: string }> {
  const d = bd();
  const id = novoId();
  d.tarefas.push({
    id,
    vinculoId: p.vinculoId ?? null,
    titulo: p.titulo.trim().slice(0, 200),
    notas: p.notas?.trim().slice(0, 2000) || null,
    estado: "por_tratar",
    prazo: p.prazo || null,
    etiquetas: p.etiquetas ?? [],
    obrigacao: null,
    ordem: d.tarefas.length + 1,
    passos: [],
  });
  return { id };
}

export async function moverTarefa(id: string, novoEstado: EstadoTarefa): Promise<{ erro?: string }> {
  const t = bd().tarefas.find((x) => x.id === id);
  if (!t) return { erro: "Esta tarefa já não existe." };
  t.estado = novoEstado;
  return {};
}

export async function apagarTarefa(id: string): Promise<{ erro?: string }> {
  const d = bd();
  d.tarefas = d.tarefas.filter((t) => t.id !== id);
  return {};
}

export async function acrescentarPasso(
  tarefaId: string, texto: string, ordem: number
): Promise<{ erro?: string }> {
  const t = bd().tarefas.find((x) => x.id === tarefaId);
  if (!t) return { erro: "Esta tarefa já não existe." };
  t.passos.push({ id: novoId(), texto: texto.trim().slice(0, 200), feito: false, ordem });
  return {};
}

export async function alternarPasso(id: string, feito: boolean): Promise<{ erro?: string }> {
  for (const t of bd().tarefas) {
    const p = t.passos.find((x) => x.id === id);
    if (p) { p.feito = feito; return {}; }
  }
  return { erro: "Este passo já não existe." };
}

// ─── Tipos de consulta ─────────────────────────────────────────────────

export async function listarTiposConsulta(): Promise<TipoConsulta[]> {
  return copiar([...bd().tiposConsulta].sort((a, b) => a.ordem - b.ordem));
}

export async function criarTipoConsulta(t: NovoTipoConsulta): Promise<{ erro?: string; id?: string }> {
  const nome = t.nome.trim();
  if (nome.length < 2) return { erro: "Dá um nome ao tipo de consulta." };
  if (t.duracaoMin < 15 || t.duracaoMin > 240) return { erro: "A duração vai de 15 a 240 minutos." };

  const d = bd();
  const id = novoId();
  d.tiposConsulta.push({
    id,
    contabilistaId: d.ficha.userId,
    nome: nome.slice(0, 80),
    descricao: t.descricao?.trim().slice(0, 300) || null,
    duracaoMin: t.duracaoMin,
    precoCents: Math.max(0, Math.round(t.precoCents)),
    ativo: true,
    ordem: d.tiposConsulta.length + 1,
  });
  return { id };
}

export async function atualizarTipoConsulta(
  id: string,
  campos: Record<string, unknown>
): Promise<{ erro?: string }> {
  const t = bd().tiposConsulta.find((x) => x.id === id);
  if (!t) return { erro: "Este tipo de consulta já não existe." };
  if (typeof campos.nome === "string") t.nome = campos.nome;
  if ("descricao" in campos) t.descricao = (campos.descricao as string | null) ?? null;
  if (typeof campos.duracao_min === "number") t.duracaoMin = campos.duracao_min;
  if (typeof campos.preco_cents === "number") t.precoCents = campos.preco_cents;
  if (typeof campos.ativo === "boolean") t.ativo = campos.ativo;
  if (typeof campos.ordem === "number") t.ordem = campos.ordem;
  return {};
}

export async function apagarTipoConsulta(id: string): Promise<{ erro?: string }> {
  const d = bd();
  d.tiposConsulta = d.tiposConsulta.filter((t) => t.id !== id);
  return {};
}

// ─── Casos ─────────────────────────────────────────────────────────────

export async function listarCasos(): Promise<Caso[]> {
  return copiar(
    [...bd().casos].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
  );
}

export async function listarMensagensDoCaso(casoId: string): Promise<MensagemDoCaso[]> {
  return copiar(
    bd().mensagensDeCaso
      .filter((m) => m.casoId === casoId)
      .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))
  );
}

export async function listarPropostas(casoId: string): Promise<Proposta[]> {
  return copiar(
    bd().propostas
      .filter((p) => p.casoId === casoId)
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
  );
}

/**
 * Uma mensagem do contabilista nasce `submetida`, nunca aprovada.
 *
 * É a regra que faz a intermediação existir: o que ele escreve passa por
 * revisão antes de chegar ao cliente. Na demonstração fica igual — parada à
 * espera de revisão, com o rótulo que o painel real mostra.
 */
export async function submeterMensagem(
  casoId: string, autorId: string, papel: "cliente" | "contabilista", corpo: string
): Promise<{ erro?: string }> {
  const texto = corpo.trim().slice(0, 4000);
  if (!texto) return { erro: "Escreve alguma coisa." };

  bd().mensagensDeCaso.push({
    id: novoId(),
    casoId,
    autorId,
    autorPapel: papel,
    corpo: texto,
    corpoEncaminhado: null,
    estado: "submetida",
    notaRevisao: null,
    criadoEm: agora(),
  });
  return {};
}

export async function enviarProposta(p: NovaProposta): Promise<{ erro?: string }> {
  if (!Number.isFinite(p.valorCents) || p.valorCents <= 0) return { erro: "Diz que valor propões." };

  const d = bd();
  d.propostas.unshift({
    id: novoId(),
    casoId: p.casoId,
    contabilistaId: p.contabilistaId,
    corpo: p.corpo.trim(),
    valorCents: Math.max(0, Math.round(p.valorCents)),
    ivaIncluido: p.ivaIncluido,
    prazoExecucao: p.prazoExecucao?.trim() || null,
    validadeAte: p.validadeAte || null,
    estado: "enviada",
    lidaAteAoFimEm: null,
    confirmacaoEm: null,
    decididaEm: null,
    motivo: null,
    criadoEm: agora(),
  });

  const caso = d.casos.find((c) => c.id === p.casoId);
  if (caso && caso.estado === "encaminhado") caso.estado = "com_proposta";
  return {};
}

export async function listarDocumentosDoCaso(casoId: string): Promise<DocumentoDoCaso[]> {
  // Na demonstração o caso é um só, tal como no real só chega o que já foi
  // libertado pela administração.
  void casoId;
  return copiar(bd().documentos.filter((d) => d.libertadoEm !== null));
}

export async function listarAnexosDaProposta(propostaId: string): Promise<AnexoDaProposta[]> {
  const existe = bd().propostas.some((p) => p.id === propostaId && p.estado !== "enviada");
  return existe ? copiar(bd().anexosDeProposta) : [];
}

// ─── Conversa ──────────────────────────────────────────────────────────

export async function listarMensagens(vinculoId: string): Promise<Mensagem[]> {
  return copiar(
    bd().conversas
      .filter((m) => m.vinculoId === vinculoId)
      .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))
  );
}

export async function enviarMensagem(p: {
  vinculoId: string;
  autorId: string;
  corpo: string;
  ficheiros?: File[];
}): Promise<{ erro?: string; recusados?: string[] }> {
  const corpo = p.corpo.trim().slice(0, 4000);
  if (!corpo) return { erro: "Escreve alguma coisa." };

  bd().conversas.push({
    id: novoId(),
    vinculoId: p.vinculoId,
    autorId: p.autorId,
    corpo,
    lidaEm: null,
    criadoEm: agora(),
    anexos: [],
  });

  // O texto segue; os ficheiros não — não há armazenamento nenhum atrás
  // disto. É a mesma forma de resposta do real (o envio do texto nunca é
  // desfeito por causa de um anexo), com um motivo honesto.
  const ficheiros = p.ficheiros ?? [];
  if (ficheiros.length === 0) return {};
  return { recusados: ficheiros.map((f) => `${f.name} (a demonstração não guarda ficheiros)`) };
}

export async function marcarLidas(vinculoId: string, meuId: string): Promise<void> {
  for (const m of bd().conversas) {
    if (m.vinculoId === vinculoId && m.autorId !== meuId && !m.lidaEm) m.lidaEm = agora();
  }
}

// ─── Notificações ──────────────────────────────────────────────────────

export async function listarNotificacoes(limite = 30): Promise<Notificacao[]> {
  return copiar(
    [...bd().notificacoes]
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
      .slice(0, limite)
  );
}

export async function marcarNotificacaoLida(id: string): Promise<void> {
  const n = bd().notificacoes.find((x) => x.id === id);
  if (n && !n.lidaEm) n.lidaEm = agora();
}

export async function marcarTodasLidas(): Promise<void> {
  for (const n of bd().notificacoes) if (!n.lidaEm) n.lidaEm = agora();
}

// ─── LinkedIn ──────────────────────────────────────────────────────────

export async function obterEstadoLinkedIn(): Promise<{
  ligado: boolean; fotoDaIdentidade: string | null; erro?: string;
}> {
  const l = bd().linkedin;
  return { ligado: l.ligado, fotoDaIdentidade: l.avatarUrl };
}

export async function obterLinkedInPublico(): Promise<{ url: string | null; avatarUrl: string | null }> {
  const l = bd().linkedin;
  return { url: l.url, avatarUrl: l.avatarUrl };
}

/**
 * Ligar o LinkedIn sai do ReciboCerto — e a demonstração não sai.
 *
 * Este é o único sítio do painel onde a demonstração não pode imitar o
 * comportamento, porque o comportamento é ir para outro site. Diz-se em vez
 * de fingir: um botão que parecesse funcionar e não ligasse nada seria pior
 * do que um botão que explica porquê.
 */
export async function ligarLinkedIn(): Promise<{ erro?: string }> {
  return { erro: "Na demonstração não se liga o LinkedIn: isso sai do ReciboCerto para o consentimento real." };
}

export async function desligarLinkedIn(): Promise<{ erro?: string }> {
  const l = bd().linkedin;
  l.ligado = false;
  l.avatarUrl = null;
  return {};
}

export async function renovarLinkedIn(): Promise<{ erro?: string }> {
  return { erro: "Na demonstração não se renova a autorização: isso sai do ReciboCerto." };
}

export async function sincronizarLinkedIn(): Promise<{ ligado: boolean; avatarUrl: string | null; erro?: string }> {
  const l = bd().linkedin;
  return { ligado: l.ligado, avatarUrl: l.avatarUrl };
}

export async function guardarUrlLinkedIn(url: string): Promise<{ erro?: string; url?: string }> {
  const l = bd().linkedin;
  l.url = url.trim() || null;
  return { url: l.url ?? "" };
}

// ─── Progressão ────────────────────────────────────────────────────────
//
// Leitura, e só leitura — igual ao painel real, e pela mesma razão: a
// migração não dá escrita a `authenticated`, e a demonstração que aceitasse
// um `+20 XP` a pedido mentia sobre a única coisa que aqui é uma garantia.
//
// Em particular NÃO há `desbloquearPatamar()`. A cobrança não está ligada
// e um botão que funcionasse na demonstração daria a entender que funciona
// no painel real.

export async function obterProgressao(): Promise<EstadoProgressao> {
  return copiar(bd().progressao);
}

export async function listarEventosXP(limite = 8): Promise<EventoXPDemo[]> {
  return copiar(
    [...bd().eventosXP]
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
      .slice(0, Math.max(1, limite))
  );
}

// ─── Fidelidade V2: regras versionadas ─────────────────────────────────
//
// A imutabilidade é a mesma do painel real: publicar não é editar. Uma
// regra publicada fecha-se (`substituidaEm`) e nasce outra com versão
// seguinte — e republicar exatamente o mesmo NÃO cria versão nova, como a
// RPC também não cria.

export async function regraCorrente(): Promise<RegraLida | null> {
  return copiar(bd().regrasFidelidade.find((r) => r.substituidaEm === null) ?? null);
}

export async function historicoDeRegras(): Promise<RegraLida[]> {
  return copiar([...bd().regrasFidelidade].sort((a, b) => b.versao - a.versao));
}

export async function impactoDaRegraNova(): Promise<ImpactoDaRegra> {
  const d = bd();
  const comCartao = new Set(d.cartoes.filter((c) => !c.completo).map((c) => c.clienteId));
  const comBeneficio = new Set(
    d.cupoes.filter((c) => c.estado === "disponivel").map((c) => c.clienteId),
  );
  return {
    cartoesEmCurso: d.cartoes.filter((c) => !c.completo).length,
    beneficiosPendentes: d.cupoes.filter((c) => c.estado === "disponivel").length,
    clientesSemCiclo: d.vinculos.filter(
      (v) => v.estado === "ativo" && !comCartao.has(v.clienteId) && !comBeneficio.has(v.clienteId),
    ).length,
  };
}

export async function publicarRegra(p: {
  meta: number;
  descontoPct: number;
  ativa: boolean;
  exigePagamento: boolean;
}): Promise<ResultadoPublicacao> {
  const d = bd();
  if (p.meta < 3 || p.meta > 12) return { ok: false, motivo: "meta_fora_de_limites" };
  if (p.descontoPct < 10 || p.descontoPct > 50) return { ok: false, motivo: "desconto_fora_de_limites" };

  const corrente = d.regrasFidelidade.find((r) => r.substituidaEm === null);
  if (
    corrente &&
    corrente.meta === p.meta &&
    corrente.descontoPct === p.descontoPct &&
    corrente.exigePagamento === p.exigePagamento &&
    corrente.ativa === p.ativa
  ) {
    return { ok: true, inalterada: true, versao: corrente.versao, regraId: corrente.id };
  }

  if (corrente) {
    corrente.substituidaEm = agora();
    corrente.ativa = false;
  }
  const versao = Math.max(0, ...d.regrasFidelidade.map((r) => r.versao)) + 1;
  const nova: RegraLida = {
    id: novoId(),
    versao,
    meta: p.meta,
    descontoPct: p.descontoPct,
    exigePagamento: p.exigePagamento,
    ativa: p.ativa,
    validadeDias: 365,
    publicadaEm: agora(),
    substituidaEm: null,
  };
  d.regrasFidelidade.push(nova);
  return { ok: true, versao, regraId: nova.id };
}

// ─── Vistas do painel modular ──────────────────────────────────────────
//
// A demonstração bate contra as MESMAS paredes do painel real: guardar
// com uma revisão antiga devolve `layout_desatualizado`, e um layout com
// geometria impossível é recusado pela mesma validação. Uma demonstração
// que aceita qualquer layout não prova nada sobre a gravação verdadeira.

export async function listarVistas(): Promise<WorkspaceView[]> {
  return copiar([...bd().vistas].sort((a, b) => a.ordem - b.ordem));
}

export async function guardarLayout(
  vistaId: string,
  revisionEsperada: number,
  layout: WorkspaceLayoutV2,
): Promise<{ ok: boolean; revision?: number; motivo?: string; detalhe?: string }> {
  const vista = bd().vistas.find((v) => v.id === vistaId);
  if (!vista) return { ok: false, motivo: "vista_inexistente" };
  if (vista.revision !== revisionEsperada) {
    return { ok: false, motivo: "layout_desatualizado", revision: vista.revision };
  }
  const v = validarLayout(layout);
  // Recusa só o que o SQL recusa. Sobreposição NÃO é motivo de recusa: é
  // o estado normal a meio de uma edição, e `validarLayout` já devolve o
  // layout compactado. Ver `dashboard/validacao.ts`.
  const impedimento = erroQueImpedeGravar(v);
  if (impedimento) {
    return { ok: false, motivo: "layout_invalido", detalhe: impedimento };
  }
  vista.revision += 1;
  vista.layout = { ...v.layout, revision: vista.revision };
  return { ok: true, revision: vista.revision };
}

export async function criarVista(
  nome: string,
  copiarDe?: string,
): Promise<{ erro?: string; id?: string }> {
  const estado = bd();
  const limpo = nome.trim().slice(0, 60);
  if (limpo.length < 1) return { erro: "Dá um nome à vista." };
  if (estado.vistas.some((v) => v.nome.toLowerCase() === limpo.toLowerCase())) {
    return { erro: "Já tens uma vista com esse nome." };
  }
  if (estado.vistas.length >= 8) return { erro: "Chegaste ao limite de vistas." };

  const base = copiarDe ? estado.vistas.find((v) => v.id === copiarDe) : undefined;
  const id = novoId();
  estado.vistas.push({
    id,
    nome: limpo,
    ordem: estado.vistas.length,
    principal: false,
    sistema: false,
    revision: 1,
    layout: base
      ? copiar({ ...base.layout, revision: 1 })
      : validarLayout({
          version: 2, revision: 1,
          grid: {
            desktop: { columns: 12, rowHeight: 52, gap: 12 },
            tablet: { columns: 8, rowHeight: 52, gap: 12 },
          },
          items: [],
        }).layout,
  });
  return { id };
}

export async function renomearVista(vistaId: string, nome: string): Promise<{ erro?: string }> {
  const estado = bd();
  const vista = estado.vistas.find((v) => v.id === vistaId);
  if (!vista) return { erro: "Essa vista já não existe." };
  const limpo = nome.trim().slice(0, 60);
  if (limpo.length < 1) return { erro: "Dá um nome à vista." };
  if (estado.vistas.some((v) => v.id !== vistaId && v.nome.toLowerCase() === limpo.toLowerCase())) {
    return { erro: "Já tens uma vista com esse nome." };
  }
  vista.nome = limpo;
  return {};
}

export async function definirVistaPrincipal(vistaId: string): Promise<{ erro?: string }> {
  const estado = bd();
  if (!estado.vistas.some((v) => v.id === vistaId)) return { erro: "Essa vista já não existe." };
  for (const v of estado.vistas) v.principal = v.id === vistaId;
  return {};
}

export async function apagarVista(vistaId: string): Promise<{ erro?: string }> {
  const estado = bd();
  const vista = estado.vistas.find((v) => v.id === vistaId);
  if (!vista) return {};
  // A mesma regra da RLS real: as vistas de sistema não se apagam.
  if (vista.sistema) return { erro: "As vistas de partida não podem ser apagadas." };
  estado.vistas = estado.vistas.filter((v) => v.id !== vistaId);
  return {};
}

// ─── O que não existe fora da base de dados ────────────────────────────

/** Sem armazenamento, não há nada para descarregar. Diz-se, não se finge. */
export async function semFicheiro(): Promise<null> {
  return null;
}

export async function envioRecusado(): Promise<{ erro?: string }> {
  return { erro: "A demonstração não guarda ficheiros. No painel real este envio funciona." };
}

/** As escutas de Realtime não abrem canal nenhum, e devolvem o adeus vazio. */
export function semEscuta(): () => void {
  return () => {};
}
