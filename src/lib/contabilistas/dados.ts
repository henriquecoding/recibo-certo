// ═══════════════════════════════════════════════════════════════════════
//  ACESSO A DADOS — pelo cliente, sob RLS
//  ---------------------------------------------------------------------
//  Tudo aqui corre com a chave publicável e a sessão da pessoa. Não há
//  nenhuma verificação de permissão neste ficheiro, e isso é de propósito:
//  quem autoriza é a base de dados (migração 042). Uma verificação em
//  JavaScript seria uma segunda opinião que ninguém consulta — o browser
//  está do lado de quem a quiser contornar.
//
//  O que NÃO passa por aqui: aprovar contabilistas, carimbar cartões e dar
//  cupões por usados. Essas escritas estão fechadas ao cliente e vivem em
//  `/api/*` com a chave de serviço.
// ═══════════════════════════════════════════════════════════════════════

import { getSupabase } from "@/lib/supabase/client";
import type {
  Agendamento, Contabilista, ContactosPrivados, EstadoAgendamento, EstadoVinculo,
  Modalidade, Partilha, TipoPartilha, Vinculo,
} from "./tipos";
import type { Excecao, RegraDisponibilidade } from "./agenda";
import type { EstadoProgressao } from "./progressao/catalogo";
import { CONSENTIMENTO_VERSAO, sanitizarConteudoPartilha, tituloPorOmissao } from "./vinculo";

type Linha = Record<string, unknown>;

/**
 * O selo, para as duas origens possíveis de uma linha.
 *
 * A view `contabilistas_publico` já traz `occ_verificado` calculado, e
 * nesse caso é essa a resposta. A tabela traz as colunas em bruto — e
 * repetir aqui a mesma conta é o que impede o painel do próprio de dizer
 * «verificado» sobre um selo que o perfil público já deixou de mostrar.
 */
function seloValido(l: Linha): boolean {
  if (typeof l.occ_verificado === "boolean") return l.occ_verificado;

  const ate = l.occ_verificado_ate as string | null | undefined;
  const confirmado = l.occ_numero_confirmado as string | null | undefined;
  if (!ate || !confirmado) return false;
  if (new Date(ate).getTime() <= Date.now()) return false;

  const daFicha = String(l.occ ?? "").replace(/\D+/g, "").replace(/^0+/, "");
  return Boolean(daFicha) && daFicha === confirmado;
}

function paraContabilista(l: Linha): Contabilista {
  return {
    userId: l.user_id as string,
    slug: l.slug as string,
    nome: l.nome as string,
    occ: (l.occ as string | null) ?? null,
    bio: (l.bio as string) ?? "",
    distrito: (l.distrito as string | null) ?? null,
    concelho: (l.concelho as string | null) ?? null,
    especialidades: (l.especialidades as string[]) ?? [],
    modalidades: ((l.modalidades as string[]) ?? []) as Modalidade[],
    emailContacto: (l.email_contacto as string | null) ?? null,
    telefone: (l.telefone as string | null) ?? null,
    website: (l.website as string | null) ?? null,
    tituloProfissional: (l.titulo_profissional as string | null) ?? null,
    apresentacaoCurta: (l.apresentacao_curta as string | null) ?? null,
    idiomas: (l.idiomas as string[]) ?? [],
    anosExperiencia: (l.anos_experiencia as number | null) ?? null,
    respostaMediaHoras: (l.resposta_media_horas as number | null) ?? null,
    // A VIEW já calculou o selo com a validade. A tabela não — quem lê a
    // ficha própria tem as colunas em bruto e a conta é feita aqui, com a
    // mesma regra: há selo enquanto a validade não passou E o número
    // verificado for ainda o da ficha.
    occVerificado: seloValido(l),
    occMetodo: (l.occ_verificado_metodo as Contabilista["occMetodo"]) ?? null,
    occVerificadoEm: (l.occ_verificado_em as string | null) ?? null,
    occValidoAte: (l.occ_verificado_ate as string | null) ?? null,
    perfilBlocos: l.perfil_blocos ?? [],
    perfilTermos: l.perfil_termos ?? [],
    cobertura: l.cobertura ?? null,
    linkedinLigado: Boolean(l.linkedin_ligado ?? l.linkedin_ligado_em),
    estado: l.estado as Contabilista["estado"],
    aceitaNovosClientes: Boolean(l.aceita_novos_clientes),
    precoConsultaCents: (l.preco_consulta_cents as number) ?? 0,
    duracaoConsultaMin: (l.duracao_consulta_min as number) ?? 60,
    fidelidadeMeta: (l.fidelidade_meta as number) ?? 5,
    fidelidadeDescontoPct: (l.fidelidade_desconto_pct as number) ?? 10,
    fidelidadeAtiva: Boolean(l.fidelidade_ativa),
    recebePagamentos: Boolean(l.recebe_pagamentos),
    criadoEm: (l.criado_em as string) ?? "",
  };
}

/**
 * As colunas da ficha PRÓPRIA, lidas da tabela.
 *
 * Serve o painel e o editor de perfil, onde o contabilista precisa de ver
 * o seu `estado` (para saber que está suspenso) e o seu telefone. A
 * política `contabilistas_proprio_le` é que autoriza esta leitura.
 */
const CAMPOS_DA_FICHA =
  "user_id, slug, nome, occ, bio, distrito, concelho, especialidades, modalidades, " +
  "email_contacto, telefone, website, estado, aceita_novos_clientes, " +
  "preco_consulta_cents, duracao_consulta_min, fidelidade_meta, fidelidade_desconto_pct, " +
  "fidelidade_ativa, criado_em, " +
  "titulo_profissional, apresentacao_curta, idiomas, anos_experiencia, " +
  "resposta_media_horas, linkedin_ligado_em, " +
  // A verificação, com tudo o que ela precisa de dizer: método, prazo e
  // o número que foi realmente confirmado. Sem o número confirmado o
  // painel não consegue distinguir «verificado» de «verificado outro
  // número», que é a única diferença que interessa.
  "occ_verificado_em, occ_verificado_metodo, occ_verificado_ate, " +
  "occ_numero_confirmado, occ_pedido_em, occ_recusa_motivo, occ_recusado_em, " +
  // O perfil composto.
  "perfil_blocos, perfil_termos, cobertura";

/**
 * O contrato público é uma VIEW, não a tabela.
 *
 * A tabela está fechada a `anon` desde
 * `20260820165708_o_contrato_publico_fecha_a_tabela.sql`: nem política,
 * nem privilégio. Antes disso, uma política dava a linha INTEIRA a quem
 * não tinha sessão nenhuma — escolhia linhas, não colunas — e saíam o
 * telefone, o `linkedin_subject` (o identificador OIDC) e o `pedido_id`.
 *
 * `contabilistas_publico` diz as colunas uma a uma, e uma coluna nova em
 * `contabilistas` já não nasce pública.
 */
const VISTA_PUBLICA = "contabilistas_publico";

/**
 * Nenhum canal direto vem da view — os três saem por
 * `contactos_do_contabilista`, a quem tem vínculo vivo.
 *
 * Forçá-los a `null` aqui não é defensivo por hábito: o tipo
 * `Contabilista` é o mesmo para a ficha própria (que os tem) e para a
 * pública (que não), e sem isto um `undefined` da view lia-se como «não
 * preenchido» em vez de «não é teu».
 */
function paraContabilistaPublico(l: Linha): Contabilista {
  return paraContabilista({
    ...l,
    // A view só contém linhas aprovadas — é a sua cláusula WHERE.
    estado: "aprovado",
    email_contacto: null,
    telefone: null,
    website: null,
  });
}

// ─── Diretório público ─────────────────────────────────────────────────

export interface FiltroDiretorio {
  distrito?: string | null;
  especialidade?: string | null;
  procura?: string;
  soAceitaNovos?: boolean;
}

export async function listarContabilistas(f: FiltroDiretorio = {}): Promise<Contabilista[]> {
  let q = getSupabase()
    .from(VISTA_PUBLICA)
    .select("*")
    .order("nome");

  if (f.distrito) q = q.eq("distrito", f.distrito);
  if (f.soAceitaNovos) q = q.eq("aceita_novos_clientes", true);
  if (f.especialidade) q = q.contains("especialidades", [f.especialidade]);
  if (f.procura?.trim()) {
    const p = f.procura.trim().replace(/[%,]/g, "");
    if (p) q = q.or(`nome.ilike.%${p}%,concelho.ilike.%${p}%,distrito.ilike.%${p}%`);
  }

  const { data, error } = await q.limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map((l) => paraContabilistaPublico(l as unknown as Linha));
}

export async function obterContabilistaPorSlug(slug: string): Promise<Contabilista | null> {
  const { data } = await getSupabase()
    .from(VISTA_PUBLICA)
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data ? paraContabilistaPublico(data as unknown as Linha) : null;
}

/** A ficha do próprio, em qualquer estado — para saber que está suspenso. */
export async function obterMinhaFicha(userId: string): Promise<Contabilista | null> {
  const { data } = await getSupabase()
    .from("contabilistas")
    .select(CAMPOS_DA_FICHA)
    .eq("user_id", userId)
    .maybeSingle();
  return data ? paraContabilista(data as unknown as Linha) : null;
}

export async function atualizarFicha(
  userId: string,
  campos: Partial<{
    nome: string; occ: string | null; bio: string; distrito: string | null;
    concelho: string | null; especialidades: string[]; modalidades: string[];
    email_contacto: string | null; telefone: string | null; website: string | null;
    aceita_novos_clientes: boolean; preco_consulta_cents: number;
    duracao_consulta_min: number; fidelidade_meta: number;
    fidelidade_desconto_pct: number; fidelidade_ativa: boolean;
    titulo_profissional: string | null; apresentacao_curta: string | null;
    idiomas: string[]; anos_experiencia: number | null;
    resposta_media_horas: number | null;
    perfil_blocos: unknown[]; perfil_termos: unknown[];
    cobertura: Record<string, unknown> | null;
  }>
): Promise<{ erro?: string }> {
  const { error } = await getSupabase()
    .from("contabilistas").update(campos).eq("user_id", userId);
  return error ? { erro: error.message } : {};
}

// ─── Candidatura ───────────────────────────────────────────────────────

export interface DadosCandidatura {
  nome: string;
  emailContacto: string;
  telefone?: string;
  mensagem: string;
  credenciais?: string;
  documentos?: string[];
}

export async function submeterCandidatura(
  userId: string,
  d: DadosCandidatura
): Promise<{ erro?: string }> {
  const { error } = await getSupabase().from("contabilista_pedidos").insert({
    user_id: userId,
    nome: d.nome.trim(),
    email_contacto: d.emailContacto.trim(),
    telefone: d.telefone?.trim() || null,
    mensagem: d.mensagem.trim(),
    credenciais: d.credenciais?.trim() || null,
    documentos: d.documentos ?? [],
  });
  if (!error) return {};
  // A restrição de um pedido aberto por pessoa fala em índice; a mensagem
  // que a pessoa lê tem de falar da situação dela.
  if (error.code === "23505") return { erro: "Já tens uma candidatura em análise." };
  return { erro: error.message };
}

export async function minhasCandidaturas(userId: string): Promise<Linha[]> {
  const { data } = await getSupabase()
    .from("contabilista_pedidos")
    .select("id, nome, estado, motivo_decisao, criado_em, decidido_em")
    .eq("user_id", userId)
    .order("criado_em", { ascending: false });
  return (data ?? []) as unknown as Linha[];
}

// ─── Vínculos ──────────────────────────────────────────────────────────

function paraVinculo(l: Linha): Vinculo {
  return {
    id: l.id as string,
    contabilistaId: l.contabilista_id as string,
    clienteId: l.cliente_id as string,
    estado: l.estado as EstadoVinculo,
    criadoEm: l.criado_em as string,
    origem: l.origem as "cliente" | "contabilista",
    nomeCliente: (l.nome_cliente as string | null) ?? null,
    mensagem: (l.mensagem as string | null) ?? null,
  };
}

export interface PedidoDeVinculo {
  contabilistaId: string;
  clienteId: string;
  mensagem?: string;
  /** Como o cliente quer ser tratado. Opcional — ver `tratamentoDoCliente`. */
  nomeCliente?: string;
}

export async function pedirVinculo(
  p: PedidoDeVinculo
): Promise<{ erro?: string; vinculoId?: string }> {
  const { data, error } = await getSupabase().from("contabilista_vinculos").insert({
    contabilista_id: p.contabilistaId,
    cliente_id: p.clienteId,
    origem: "cliente",
    mensagem: p.mensagem?.trim().slice(0, 1000) || null,
    nome_cliente: p.nomeCliente?.trim().slice(0, 80) || null,
  }).select("id").single();

  if (!error && data) return { vinculoId: (data as unknown as Linha).id as string };
  if (error?.code === "23505") return { erro: "Já tens um pedido com este contabilista." };
  return { erro: error?.message ?? "Não foi possível enviar o pedido." };
}

/**
 * O vínculo vivo do cliente, se houver. Um cliente tem no máximo um por CC.
 *
 * São duas leituras e não um `join` embutido, de propósito. O cliente não
 * tem política de leitura sobre a ficha do contabilista — tinha-a por
 * arrastamento, através da política pública do diretório. Quando essa
 * política sair, um `join` à tabela devolvia `null` e a área do cliente
 * ficava sem o nome de quem o acompanha. A view não depende dela.
 */
export async function meuVinculo(clienteId: string): Promise<
  (Vinculo & { contabilista: Contabilista | null }) | null
> {
  const { data } = await getSupabase()
    .from("contabilista_vinculos")
    .select("*")
    .eq("cliente_id", clienteId)
    .neq("estado", "terminado")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const vinculo = paraVinculo(data as unknown as Linha);

  const { data: ficha } = await getSupabase()
    .from(VISTA_PUBLICA)
    .select("*")
    .eq("user_id", vinculo.contabilistaId)
    .maybeSingle();

  return {
    ...vinculo,
    contabilista: ficha ? paraContabilistaPublico(ficha as unknown as Linha) : null,
  };
}

/**
 * Os três canais diretos do contabilista, para quem tem vínculo vivo.
 *
 * Email, telefone e site não estão no contrato público, e a razão é a
 * mesma para os três: um canal direto abre-se com a aceitação, não com a
 * pesquisa. Publicá-los seria dá-los a quem os recolhe em massa sem os
 * dar a quem os procura.
 *
 * Devolve `null` quando não há relação — e é a base de dados que o
 * decide, não este ficheiro: a função exige vínculo vivo (`ativo` ou
 * `pausado`) e o contabilista aprovado. Um pedido pendente não conta, um
 * vínculo terminado deixa de contar, e uma suspensão corta no instante.
 */
export async function contactosDoContabilista(
  contabilistaId: string
): Promise<ContactosPrivados | null> {
  const { data, error } = await getSupabase()
    .rpc("contactos_do_contabilista", { p_contabilista: contabilistaId });
  if (error) return null;

  const [linha] = (data ?? []) as unknown as Linha[];
  if (!linha) return null;

  const contactos: ContactosPrivados = {
    emailContacto: (linha.email_contacto as string | null) ?? null,
    telefone: (linha.telefone as string | null) ?? null,
    website: (linha.website as string | null) ?? null,
  };
  // Uma linha com os três campos vazios diz «tens acesso e ele não
  // preencheu nada». Para quem chama é a mesma coisa que não haver
  // contacto, e devolver o objeto obrigava cada ecrã a repetir esta
  // verificação para não desenhar um bloco vazio.
  const algum = contactos.emailContacto ?? contactos.telefone ?? contactos.website;
  return algum ? contactos : null;
}

/** O cliente corrige o nome por que quer ser tratado, sem terminar nada. */
export async function atualizarIdentidadeNoVinculo(
  id: string,
  campos: { nomeCliente?: string | null }
): Promise<{ erro?: string }> {
  const dados: Linha = {};
  if (campos.nomeCliente !== undefined) {
    dados.nome_cliente = campos.nomeCliente?.trim().slice(0, 80) || null;
  }
  if (Object.keys(dados).length === 0) return {};
  const { error } = await getSupabase()
    .from("contabilista_vinculos").update(dados).eq("id", id);
  return error ? { erro: error.message } : {};
}

export async function terminarVinculo(id: string): Promise<{ erro?: string }> {
  return decidirVinculo(id, "terminar");
}

/**
 * Transições do vínculo, por comando.
 *
 * A precondição de estado vive no `WHERE` da função (migração 047): dois
 * cliques simultâneos não escrevem por cima um do outro — o segundo não
 * encontra linha e é recusado.
 */
export async function decidirVinculo(
  id: string,
  decisao: "aceitar" | "recusar" | "pausar" | "reativar" | "terminar"
): Promise<{ erro?: string }> {
  const { data, error } = await getSupabase().rpc("decidir_vinculo", {
    p_vinculo: id,
    p_decisao: decisao,
  });
  if (error) return { erro: error.message };
  const r = (data ?? {}) as { ok?: boolean; motivo?: string };
  if (r.ok) return {};
  return {
    erro: r.motivo === "transicao_nao_permitida"
      ? "Este acompanhamento já não estava nesse estado."
      : "Não foi possível concluir.",
  };
}

/**
 * Uma linha por cliente, com consultas, envios e cartão já contados.
 *
 * A página de clientes derivava isto em JavaScript a partir de três
 * leituras — e `listarAgendamentos` ordena por `inicio` ASCENDENTE com
 * `limit(300)`, pelo que guardava as consultas MAIS ANTIGAS. Acima desse
 * número, «última consulta» e «próxima consulta» ficavam simplesmente
 * errados, sem aviso, e são as colunas por que a tabela ordena.
 *
 * A agregação vive agora em SQL (`resumo_clientes_do_contabilista`).
 * `resumirClientes` continua a existir: é o que a demonstração usa, e é
 * onde as regras estão escritas de forma testável.
 */
export async function resumoDeClientes(): Promise<ResumoClienteLido[]> {
  const { data, error } = await getSupabase().rpc("resumo_clientes_do_contabilista");
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as Linha[]).map((r) => ({
    vinculo: {
      id: r.vinculo_id as string,
      contabilistaId: "",
      clienteId: r.cliente_id as string,
      estado: r.estado as EstadoVinculo,
      criadoEm: r.criado_em as string,
      origem: r.origem as "cliente" | "contabilista",
      nomeCliente: (r.nome_cliente as string | null) ?? null,
      mensagem: (r.mensagem as string | null) ?? null,
    },
    consultasRealizadas: (r.consultas_realizadas as number) ?? 0,
    ultima: (r.ultima as string | null) ?? null,
    proxima: (r.proxima as string | null) ?? null,
    partilhas: (r.partilhas as number) ?? 0,
    partilhasPorLer: (r.partilhas_por_ler as number) ?? 0,
    cartao:
      r.cartao_meta === null || r.cartao_meta === undefined
        ? null
        : {
            carimbos: (r.cartao_carimbos as number) ?? 0,
            meta: r.cartao_meta as number,
            descontoPct: (r.cartao_desconto_pct as number) ?? 0,
            precoBaseCents: (r.cartao_preco_base as number) ?? 0,
          },
  }));
}

/** O que a RPC devolve, antes de `tratamentoDoCliente` entrar. */
export interface ResumoClienteLido {
  vinculo: Vinculo;
  consultasRealizadas: number;
  ultima: string | null;
  proxima: string | null;
  partilhas: number;
  partilhasPorLer: number;
  cartao: {
    carimbos: number; meta: number; descontoPct: number; precoBaseCents: number;
  } | null;
}

/** Os clientes de um contabilista, com o email de contacto de cada vínculo. */
export async function meusClientes(contabilistaId: string): Promise<Vinculo[]> {
  const { data, error } = await getSupabase()
    .from("contabilista_vinculos")
    .select("*")
    .eq("contabilista_id", contabilistaId)
    .order("criado_em", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((l) => paraVinculo(l as unknown as Linha));
}

/**
 * O que está à espera de resposta, para a navegação do painel.
 *
 * Três contagens, sem trazer uma linha sequer: `head: true` pede ao
 * PostgREST só o cabeçalho com o total. A navegação precisa de saber
 * QUANTOS, não QUAIS — e trazer as linhas todas para escrever um número
 * ao lado de «Clientes» seria pagar a lista inteira em cada página.
 *
 * Falhar aqui não pode partir o painel: uma contagem que não veio é um
 * zero, e o ecrã por baixo continua a dizer a verdade.
 */
export async function contagensDoPainel(contabilistaId: string): Promise<{
  pedidos: number;
  partilhasPorLer: number;
  consultasPorConfirmar: number;
}> {
  const sb = getSupabase();
  const so = (n: number | null, erro: unknown) => (erro ? 0 : n ?? 0);

  try {
    const [v, p, a] = await Promise.all([
      sb.from("contabilista_vinculos").select("id", { count: "exact", head: true })
        .eq("contabilista_id", contabilistaId).eq("estado", "pendente"),
      sb.from("partilhas").select("id", { count: "exact", head: true })
        .eq("contabilista_id", contabilistaId).eq("estado", "enviada"),
      sb.from("agendamentos").select("id", { count: "exact", head: true })
        .eq("contabilista_id", contabilistaId).eq("estado", "pedido"),
    ]);

    return {
      pedidos: so(v.count, v.error),
      partilhasPorLer: so(p.count, p.error),
      consultasPorConfirmar: so(a.count, a.error),
    };
  } catch {
    return { pedidos: 0, partilhasPorLer: 0, consultasPorConfirmar: 0 };
  }
}

// ─── Disponibilidade ───────────────────────────────────────────────────

export async function obterDisponibilidade(
  contabilistaId: string
): Promise<RegraDisponibilidade[]> {
  const { data } = await getSupabase()
    .from("contabilista_disponibilidade")
    .select("dia_semana, hora_inicio, hora_fim, duracao_min, intervalo_min")
    .eq("contabilista_id", contabilistaId)
    .order("dia_semana");

  return (data ?? []).map((l) => {
    const r = l as Linha;
    return {
      diaSemana: r.dia_semana as number,
      // A base guarda `time` como "09:00:00"; a agenda fala em "09:00".
      inicio: String(r.hora_inicio).slice(0, 5),
      fim: String(r.hora_fim).slice(0, 5),
      duracaoMin: r.duracao_min as number,
      intervaloMin: (r.intervalo_min as number) ?? 0,
    };
  });
}

/**
 * Substitui a semana-tipo. Uma transação, não duas escritas.
 *
 * Isto era um DELETE seguido de um INSERT a partir do browser. Se o INSERT
 * falhasse — rede, validação, RLS — a semana-tipo já tinha desaparecido e o
 * contabilista ficava sem horários publicados, com ninguém a conseguir
 * marcar consulta. A RPC `guardar_disponibilidade` (migração
 * `20260816120000`) valida tudo ANTES de apagar seja o que for.
 */
export async function guardarDisponibilidade(
  _contabilistaId: string,
  regras: RegraDisponibilidade[]
): Promise<{ erro?: string }> {
  const { data, error } = await getSupabase().rpc("guardar_disponibilidade", {
    p_regras: regras.map((r) => ({
      diaSemana: r.diaSemana,
      inicio: r.inicio,
      fim: r.fim,
      duracaoMin: r.duracaoMin,
      intervaloMin: r.intervaloMin ?? 0,
    })),
  });

  if (error) return { erro: error.message };
  const r = (data ?? {}) as { ok?: boolean; motivo?: string };
  if (r.ok) return {};
  return { erro: MOTIVO_DISPONIBILIDADE[r.motivo ?? ""] ?? "Não foi possível guardar a semana-tipo." };
}

const MOTIVO_DISPONIBILIDADE: Record<string, string> = {
  sem_permissao: "A sessão perdeu a autorização. Entra outra vez.",
  formato_invalido: "Não foi possível ler os períodos.",
  periodos_a_mais: "São períodos a mais para uma semana. O limite é 60.",
  dia_invalido: "Há um período num dia que não existe.",
  hora_invalida: "Há uma hora mal escrita. Usa o formato 09:00.",
  fim_antes_do_inicio: "A hora de fim tem de ser depois da hora de início.",
  duracao_invalida: "A duração da consulta tem de estar entre 1 e 480 minutos.",
  intervalo_invalido: "O intervalo entre consultas tem de estar entre 0 e 240 minutos.",
  periodo_mais_curto_que_a_consulta: "O intervalo é mais curto do que a duração da consulta.",
};

export async function obterExcecoes(contabilistaId: string, desde?: string): Promise<Excecao[]> {
  let q = getSupabase()
    .from("contabilista_excecoes")
    .select("data, hora_inicio, hora_fim, motivo")
    .eq("contabilista_id", contabilistaId)
    .order("data");
  if (desde) q = q.gte("data", desde);

  const { data } = await q;
  return (data ?? []).map((l) => {
    const r = l as Linha;
    return {
      data: String(r.data),
      inicio: r.hora_inicio ? String(r.hora_inicio).slice(0, 5) : undefined,
      fim: r.hora_fim ? String(r.hora_fim).slice(0, 5) : undefined,
      motivo: (r.motivo as string | null) ?? undefined,
    };
  });
}

export async function fecharDia(
  contabilistaId: string,
  data: string,
  motivo?: string
): Promise<{ erro?: string }> {
  const { error } = await getSupabase().from("contabilista_excecoes").insert({
    contabilista_id: contabilistaId,
    data,
    motivo: motivo?.slice(0, 200) || null,
  });
  return error ? { erro: error.message } : {};
}

export async function reabrirDia(contabilistaId: string, data: string): Promise<{ erro?: string }> {
  const { error } = await getSupabase()
    .from("contabilista_excecoes").delete()
    .eq("contabilista_id", contabilistaId).eq("data", data);
  return error ? { erro: error.message } : {};
}

// ─── Agendamentos ──────────────────────────────────────────────────────

function paraAgendamento(l: Linha): Agendamento {
  return {
    id: l.id as string,
    contabilistaId: l.contabilista_id as string,
    clienteId: l.cliente_id as string,
    inicio: l.inicio as string,
    fim: l.fim as string,
    estado: l.estado as EstadoAgendamento,
    modalidade: l.modalidade as Modalidade,
    assunto: (l.assunto as string | null) ?? null,
    localOuLigacao: (l.local_ou_ligacao as string | null) ?? null,
    localLat: numeroOuNulo(l.local_lat),
    localLng: numeroOuNulo(l.local_lng),
    criadoEm: (l.criado_em as string) ?? "",
  };
}

/** `double precision` pode chegar como número ou como texto do PostgREST. */
function numeroOuNulo(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Horários já ocupados, para o motor de slots não os oferecer.
 *
 * Leem-se pela RLS: um cliente não vê os agendamentos de outro. Por isso a
 * lista chega vazia para quem ainda não é cliente — e é a restrição GIST
 * que impede a marcação por cima, não esta leitura.
 */
export async function ocupadosDe(
  contabilistaId: string,
  de: Date,
  ate: Date
): Promise<{ inicio: string; fim: string }[]> {
  const { data } = await getSupabase()
    .from("agendamentos")
    .select("inicio, fim")
    .eq("contabilista_id", contabilistaId)
    .in("estado", ["pedido", "confirmado"])
    .gte("inicio", de.toISOString())
    .lte("inicio", ate.toISOString());

  return (data ?? []).map((l) => ({
    inicio: (l as unknown as Linha).inicio as string,
    fim: (l as unknown as Linha).fim as string,
  }));
}

/**
 * Marca uma consulta.
 *
 * Passa pela RPC `marcar_consulta` e não por um INSERT: desde a migração
 * 047 a escrita direta em `agendamentos` está revogada. A política sabia
 * QUEM escrevia; não sabia se o horário estava publicado, se havia
 * antecedência, nem se a duração era a do período. A função sabe.
 */
export async function marcarConsulta(p: {
  contabilistaId: string;
  inicio: string;
  fim: string;
  modalidade: Modalidade;
  assunto?: string;
  tipoConsultaId?: string | null;
}): Promise<{ erro?: string; id?: string }> {
  const { data, error } = await getSupabase().rpc("marcar_consulta", {
    p_contabilista: p.contabilistaId,
    p_inicio: p.inicio,
    p_fim: p.fim,
    p_modalidade: p.modalidade,
    p_assunto: p.assunto?.trim().slice(0, 500) || null,
    p_tipo: p.tipoConsultaId ?? null,
  });

  if (error) return { erro: error.message };
  const r = (data ?? {}) as { ok?: boolean; motivo?: string; id?: string };
  if (r.ok) return { id: r.id };
  return { erro: MOTIVO_MARCACAO[r.motivo ?? ""] ?? "Não foi possível marcar." };
}

/** O que cada motivo da RPC quer dizer para quem está a marcar. */
const MOTIVO_MARCACAO: Record<string, string> = {
  sem_vinculo_ativo: "Precisas de ser cliente deste contabilista.",
  horario_ocupado: "Esse horário acabou de ser ocupado. Escolhe outro.",
  horario_nao_publicado: "Esse horário não está entre os que o contabilista publicou.",
  sem_antecedencia: "É preciso marcar com pelo menos 12 horas de antecedência.",
  fora_da_janela: "Só se pode marcar até 60 dias para a frente.",
  modalidade_invalida: "Escolhe presencial ou online.",
  tipo_invalido: "Esse tipo de consulta já não está disponível.",
  nao_autenticado: "Entra na tua conta para marcares.",
};

export async function cancelarConsulta(id: string): Promise<{ erro?: string }> {
  const { data, error } = await getSupabase().rpc("cancelar_consulta", { p_agendamento: id });
  if (error) return { erro: error.message };
  const r = (data ?? {}) as { ok?: boolean; motivo?: string };
  if (r.ok) return {};
  return {
    erro: r.motivo === "ja_fechada"
      ? "Esta consulta já não estava por realizar."
      : "Não foi possível cancelar.",
  };
}

/** O que o cartão de fidelidade ficou a valer depois de uma consulta. */
export interface FidelidadeAposConsulta {
  ok?: boolean;
  motivo?: string;
  completou?: boolean;
  carimbos?: number;
  meta?: number;
  percentagem?: number;
}

/**
 * O contabilista decide o que fazer a uma consulta sua.
 *
 * Cada decisão é uma RPC diferente porque cada uma tem regras diferentes:
 * confirmar exige que ainda esteja por confirmar, concluir exige que já
 * tenha começado, e concluir com presença carimba o cartão na MESMA
 * transação. Isto era uma rota que fazia as três coisas com a chave de
 * serviço; agora é a base de dados a decidir, com a identidade de quem pede.
 */
/**
 * Extras de conclusão, quando a consulta se dá por realizada.
 *
 * ⚠️ `precoCents` é OBRIGATÓRIO a partir da Fidelidade V2: a RPC recusa com
 * `preco_obrigatorio` se vier nulo. É o preço REAL daquela consulta, e é
 * sobre ele que o desconto do benefício incide — a §14.1 tirou ao preço
 * global o papel de fonte de verdade da fidelidade.
 */
export interface ConclusaoDaConsulta {
  precoCents: number;
  /** Id do benefício a resgatar nesta consulta, se a pessoa o aplicar. */
  cupaoId?: string | null;
}

/**
 * O local com que uma consulta é confirmada, ou corrigida depois.
 *
 * O ponto viaja com a morada e nunca sozinho: a RPC recusa meia coordenada
 * com `ponto_incompleto`, e o tipo diz o mesmo antes de sair do browser.
 */
export interface LocalEscolhido {
  texto: string;
  lat?: number | null;
  lng?: number | null;
}

export async function decidirConsulta(
  id: string,
  estado: EstadoAgendamento,
  local?: LocalEscolhido,
  conclusao?: ConclusaoDaConsulta
): Promise<{ erro?: string; fidelidade?: FidelidadeAposConsulta | null }> {
  const sb = getSupabase();

  const chamada =
    estado === "confirmado"
      ? sb.rpc("confirmar_consulta", {
          p_agendamento: id,
          p_local: local?.texto ?? null,
          p_lat: local?.lat ?? null,
          p_lng: local?.lng ?? null,
        })
      : estado === "realizada"
        ? sb.rpc("concluir_consulta", {
            p_agendamento: id,
            p_compareceu: true,
            // Sem preço a RPC devolve `preco_obrigatorio`. Passá-lo aqui é o
            // que liga o ecrã ao contrato novo; a UI recolhe-o antes.
            p_preco_cents: conclusao?.precoCents ?? null,
            p_cupao: conclusao?.cupaoId ?? null,
          })
        : estado === "nao_compareceu"
          ? sb.rpc("concluir_consulta", { p_agendamento: id, p_compareceu: false })
          : sb.rpc("cancelar_consulta", { p_agendamento: id });

  const { data, error } = await chamada;
  if (error) return { erro: error.message };

  const r = (data ?? {}) as { ok?: boolean; motivo?: string; fidelidade?: FidelidadeAposConsulta | null };
  if (r.ok) return { fidelidade: r.fidelidade ?? null };
  return { erro: MOTIVO_CONSULTA[r.motivo ?? ""] ?? "Não foi possível atualizar a consulta." };
}

const MOTIVO_CONSULTA: Record<string, string> = {
  nao_estava_por_confirmar: "Esta consulta já não estava por confirmar.",
  nao_concluivel: "Só se conclui uma consulta que já começou e ainda está aberta.",
  ja_fechada: "Esta consulta já não estava por realizar.",
  sem_autorizacao: "Esta consulta não é tua.",
  preco_obrigatorio: "Indica o valor real desta consulta antes de a dar por realizada.",
  cupao_invalido: "Esse benefício não é deste cliente, ou já foi usado.",
  cupao_expirado: "Esse benefício já passou da validade.",
  ponto_incompleto: "O ponto do mapa ficou a meio. Volta a escolher o local.",
  local_vazio: "Escreve onde é, ou qual é o link da chamada.",
  nao_editavel: "Só se muda o local de uma consulta que ainda vai acontecer.",
};

/**
 * Corrigir o local sem reconfirmar a consulta.
 *
 * Existe porque salas mudam e links expiram: até aqui o campo só se
 * escrevia no instante da confirmação, e quem confirmasse primeiro ficava
 * sem maneira de dizer ao cliente onde é. O cliente é avisado.
 */
export async function definirLocalConsulta(
  id: string,
  local: LocalEscolhido
): Promise<{ erro?: string }> {
  const { data, error } = await getSupabase().rpc("definir_local_consulta", {
    p_agendamento: id,
    p_local: local.texto,
    p_lat: local.lat ?? null,
    p_lng: local.lng ?? null,
  });
  if (error) return { erro: error.message };

  const r = (data ?? {}) as { ok?: boolean; motivo?: string };
  if (r.ok) return {};
  return { erro: MOTIVO_CONSULTA[r.motivo ?? ""] ?? "Não foi possível guardar o local." };
}

export async function listarAgendamentos(filtro: {
  contabilistaId?: string;
  clienteId?: string;
  desde?: Date;
}): Promise<Agendamento[]> {
  let q = getSupabase().from("agendamentos").select("*").order("inicio");
  if (filtro.contabilistaId) q = q.eq("contabilista_id", filtro.contabilistaId);
  if (filtro.clienteId) q = q.eq("cliente_id", filtro.clienteId);
  if (filtro.desde) q = q.gte("inicio", filtro.desde.toISOString());

  const { data, error } = await q.limit(300);
  if (error) throw new Error(error.message);
  return (data ?? []).map((l) => paraAgendamento(l as unknown as Linha));
}

// ─── Partilhas ─────────────────────────────────────────────────────────

function paraPartilha(l: Linha): Partilha {
  return {
    id: l.id as string,
    contabilistaId: l.contabilista_id as string,
    clienteId: l.cliente_id as string,
    tipo: l.tipo as TipoPartilha,
    titulo: l.titulo as string,
    conteudo: (l.conteudo as Record<string, unknown>) ?? {},
    nota: (l.nota_cliente as string | null) ?? null,
    estado: l.estado as Partilha["estado"],
    consentimentoVersao: l.consentimento_versao as string,
    criadoEm: l.criado_em as string,
  };
}

/**
 * Envia uma simulação ao contabilista vinculado.
 *
 * ⚠️ NÃO verifica o plano, e não pode passar a verificar. Ver
 * `PARTILHA_NUNCA_EXIGE_PLUS` em `./vinculo.ts`, coberto por teste.
 */
export async function partilhar(p: {
  contabilistaId: string;
  clienteId: string;
  tipo: TipoPartilha;
  conteudo: unknown;
  titulo?: string;
  nota?: string;
}): Promise<{ erro?: string; removidos?: string[] }> {
  const limpo = sanitizarConteudoPartilha(p.tipo, p.conteudo);
  if (limpo.erro) return { erro: limpo.erro };

  const { error } = await getSupabase().from("partilhas").insert({
    contabilista_id: p.contabilistaId,
    cliente_id: p.clienteId,
    tipo: p.tipo,
    titulo: p.titulo?.trim().slice(0, 200) || tituloPorOmissao(p.tipo),
    conteudo: limpo.conteudo,
    nota_cliente: p.nota?.trim().slice(0, 2000) || null,
    consentimento_versao: CONSENTIMENTO_VERSAO,
  });

  if (error) return { erro: error.message };
  return { removidos: limpo.removidos };
}

export async function listarPartilhas(filtro: {
  contabilistaId?: string;
  clienteId?: string;
}): Promise<Partilha[]> {
  let q = getSupabase().from("partilhas").select("*").order("criado_em", { ascending: false });
  if (filtro.contabilistaId) q = q.eq("contabilista_id", filtro.contabilistaId);
  if (filtro.clienteId) q = q.eq("cliente_id", filtro.clienteId);

  const { data, error } = await q.limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map((l) => paraPartilha(l as unknown as Linha));
}

export async function revogarPartilha(id: string): Promise<{ erro?: string }> {
  const { error } = await getSupabase()
    .from("partilhas")
    .update({ estado: "revogada", revogada_em: new Date().toISOString() })
    .eq("id", id);
  return error ? { erro: error.message } : {};
}

export async function marcarPartilhaVista(id: string): Promise<void> {
  await getSupabase()
    .from("partilhas")
    .update({ estado: "vista", vista_em: new Date().toISOString() })
    .eq("id", id);
}

// ─── Fidelidade (só leitura — quem escreve é o servidor) ───────────────

export interface CartaoLido {
  id: string;
  contabilistaId: string;
  clienteId: string;
  carimbos: number;
  meta: number;
  descontoPct: number;
  precoBaseCents: number;
  completo: boolean;
}

export async function meuCartao(
  clienteId: string,
  contabilistaId: string
): Promise<CartaoLido | null> {
  const { data } = await getSupabase()
    .from("fidelidade_cartoes")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("contabilista_id", contabilistaId)
    .eq("completo", false)
    .maybeSingle();

  if (!data) return null;
  const l = data as unknown as Linha;
  return {
    id: l.id as string,
    contabilistaId: l.contabilista_id as string,
    clienteId: l.cliente_id as string,
    carimbos: l.carimbos as number,
    meta: l.meta as number,
    descontoPct: l.desconto_pct as number,
    precoBaseCents: l.preco_base_cents as number,
    completo: Boolean(l.completo),
  };
}

/** Um cartão a meio, como as listas do painel precisam dele. */
export interface CartaoAberto {
  clienteId: string;
  carimbos: number;
  meta: number;
  descontoPct: number;
  precoBaseCents: number;
}

/**
 * Os cartões por completar deste contabilista.
 *
 * Vivia escrito à mão em dois ecrãs — a lista de clientes e a ficha de um
 * cliente — cada um com o seu `select` e a sua conversão. Duas cópias da
 * mesma leitura são duas oportunidades de divergirem, e nenhuma delas
 * passava pela camada de dados: a demonstração do painel não as conseguia
 * responder, porque não havia função nenhuma para responder.
 */
export async function cartoesAbertos(
  contabilistaId: string,
  clienteId?: string
): Promise<CartaoAberto[]> {
  let q = getSupabase()
    .from("fidelidade_cartoes")
    .select("cliente_id, carimbos, meta, desconto_pct, preco_base_cents")
    .eq("contabilista_id", contabilistaId)
    .eq("completo", false);
  if (clienteId) q = q.eq("cliente_id", clienteId);

  const { data } = await q;
  return (data ?? []).map((l) => {
    const r = l as unknown as Linha;
    return {
      clienteId: r.cliente_id as string,
      carimbos: r.carimbos as number,
      meta: r.meta as number,
      descontoPct: r.desconto_pct as number,
      precoBaseCents: r.preco_base_cents as number,
    };
  });
}

export interface CupaoLido {
  id: string;
  codigo: string;
  contabilistaId: string;
  clienteId: string;
  percentagem: number;
  valorBaseCents: number;
  estado: "disponivel" | "usado" | "expirado";
  expiraEm: string;
  criadoEm: string;
}

export async function meusCupoes(filtro: {
  clienteId?: string;
  contabilistaId?: string;
}): Promise<CupaoLido[]> {
  let q = getSupabase()
    .from("fidelidade_cupoes")
    .select("id, codigo, contabilista_id, cliente_id, percentagem, valor_base_cents, estado, expira_em, criado_em")
    .order("criado_em", { ascending: false });
  if (filtro.clienteId) q = q.eq("cliente_id", filtro.clienteId);
  if (filtro.contabilistaId) q = q.eq("contabilista_id", filtro.contabilistaId);

  const { data } = await q.limit(100);
  return (data ?? []).map((l) => {
    const r = l as Linha;
    return {
      id: r.id as string,
      codigo: r.codigo as string,
      contabilistaId: r.contabilista_id as string,
      clienteId: r.cliente_id as string,
      percentagem: r.percentagem as number,
      valorBaseCents: r.valor_base_cents as number,
      estado: r.estado as CupaoLido["estado"],
      expiraEm: r.expira_em as string,
      criadoEm: r.criado_em as string,
    };
  });
}

// ─── Progressão e comissão ─────────────────────────────────────────────
//
// Duas leituras, e NENHUMA escrita. A migração
// `20260815233000_progressao_comissao_contabilistas.sql` não dá política de
// INSERT nem de UPDATE a `authenticated` sobre estas tabelas: XP, créditos
// e patamares nascem de RPCs do servidor. Foi a lição da migração 024 —
// validar quem escreve não chega, é preciso validar o que é escrito.

export const ESTADO_PROGRESSAO_INICIAL: EstadoProgressao = {
  xp: 0,
  clientesElegiveis: 0,
  creditosDisponiveis: 0,
  creditosReservados: 0,
  patamarConquistado: 1,
  patamarComprado: 1,
  eFundador: false,
};

export async function obterProgressao(contabilistaId: string): Promise<EstadoProgressao> {
  // As duas leituras em paralelo. O lugar de fundador não vive na mesma
  // tabela de propósito — é a chave de um benefício, e não um contador —
  // mas MUDA o número que o ecrã mostra, e por isso vem junto.
  const sb = getSupabase();
  const [progressao, fundador] = await Promise.all([
    sb.from("contabilista_progressao")
      .select("xp, clientes_elegiveis, creditos_disponiveis, creditos_reservados, highest_earned_tier, highest_purchased_tier")
      .eq("contabilista_id", contabilistaId)
      .maybeSingle(),
    sb.from("contabilista_fundadores")
      .select("numero")
      .eq("contabilista_id", contabilistaId)
      .is("libertado_em", null)
      .maybeSingle(),
  ]);

  const eFundador = Boolean(fundador.data);

  // Sem linha é um estado legítimo: quem ainda não gerou XP não tem
  // registo. Devolver o inicial evita um ecrã vazio onde a resposta certa
  // é «estás no patamar Base» — mas o benefício de fundador conta na
  // mesma, porque não depende de ter havido trabalho nenhum.
  if (!progressao.data) return { ...ESTADO_PROGRESSAO_INICIAL, eFundador };
  const r = progressao.data as unknown as Linha;
  return {
    xp: (r.xp as number) ?? 0,
    clientesElegiveis: (r.clientes_elegiveis as number) ?? 0,
    creditosDisponiveis: (r.creditos_disponiveis as number) ?? 0,
    creditosReservados: (r.creditos_reservados as number) ?? 0,
    patamarConquistado: (r.highest_earned_tier as number) ?? 1,
    patamarComprado: (r.highest_purchased_tier as number) ?? 1,
    eFundador,
  };
}

/** Um evento do ledger de XP, como o painel o lê. */
export type TipoEventoXP =
  | "service_completed"
  | "new_client_first_service"
  | "loyalty_cycle_completed"
  | "admin_adjustment"
  | "reversal";

export interface EventoXPLido {
  id: string;
  tipo: TipoEventoXP;
  xp: number;
  /** Eventos de sombra medem sem contar — não entram no XP em vigor. */
  shadow: boolean;
  criadoEm: string;
}

export async function listarEventosXP(
  contabilistaId: string,
  limite = 8
): Promise<EventoXPLido[]> {
  const { data } = await getSupabase()
    .from("progressao_eventos")
    .select("id, tipo, xp_delta, shadow, criado_em")
    .eq("contabilista_id", contabilistaId)
    .order("criado_em", { ascending: false })
    .limit(Math.min(50, Math.max(1, limite)));

  return (data ?? []).map((l) => {
    const r = l as Linha;
    return {
      id: r.id as string,
      tipo: r.tipo as TipoEventoXP,
      xp: (r.xp_delta as number) ?? 0,
      shadow: Boolean(r.shadow),
      criadoEm: r.criado_em as string,
    };
  });
}
