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
  Agendamento, Contabilista, EstadoAgendamento, EstadoVinculo,
  Modalidade, Partilha, TipoPartilha, Vinculo,
} from "./tipos";
import type { Excecao, RegraDisponibilidade } from "./agenda";
import { CONSENTIMENTO_VERSAO, sanitizarConteudoPartilha, tituloPorOmissao } from "./vinculo";

type Linha = Record<string, unknown>;

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
    estado: l.estado as Contabilista["estado"],
    aceitaNovosClientes: Boolean(l.aceita_novos_clientes),
    precoConsultaCents: (l.preco_consulta_cents as number) ?? 0,
    duracaoConsultaMin: (l.duracao_consulta_min as number) ?? 60,
    fidelidadeMeta: (l.fidelidade_meta as number) ?? 5,
    fidelidadeDescontoPct: (l.fidelidade_desconto_pct as number) ?? 10,
    fidelidadeAtiva: Boolean(l.fidelidade_ativa),
    criadoEm: (l.criado_em as string) ?? "",
  };
}

const CAMPOS_PUBLICOS =
  "user_id, slug, nome, occ, bio, distrito, concelho, especialidades, modalidades, " +
  "email_contacto, telefone, website, estado, aceita_novos_clientes, " +
  "preco_consulta_cents, duracao_consulta_min, fidelidade_meta, fidelidade_desconto_pct, " +
  "fidelidade_ativa, criado_em";

// ─── Diretório público ─────────────────────────────────────────────────

export interface FiltroDiretorio {
  distrito?: string | null;
  especialidade?: string | null;
  procura?: string;
  soAceitaNovos?: boolean;
}

export async function listarContabilistas(f: FiltroDiretorio = {}): Promise<Contabilista[]> {
  let q = getSupabase()
    .from("contabilistas")
    .select(CAMPOS_PUBLICOS)
    .eq("estado", "aprovado")
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
  return (data ?? []).map((l) => paraContabilista(l as unknown as Linha));
}

export async function obterContabilistaPorSlug(slug: string): Promise<Contabilista | null> {
  const { data } = await getSupabase()
    .from("contabilistas")
    .select(CAMPOS_PUBLICOS)
    .eq("slug", slug)
    .eq("estado", "aprovado")
    .maybeSingle();
  return data ? paraContabilista(data as unknown as Linha) : null;
}

/** A ficha do próprio, em qualquer estado — para saber que está suspenso. */
export async function obterMinhaFicha(userId: string): Promise<Contabilista | null> {
  const { data } = await getSupabase()
    .from("contabilistas")
    .select(CAMPOS_PUBLICOS)
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
    emailCliente: (l.email_cliente as string | null) ?? null,
    mensagem: (l.mensagem as string | null) ?? null,
  };
}

export interface PedidoDeVinculo {
  contabilistaId: string;
  clienteId: string;
  mensagem?: string;
  /** Como o cliente quer ser tratado. Opcional — ver `tratamentoDoCliente`. */
  nomeCliente?: string;
  emailCliente?: string;
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
    email_cliente: p.emailCliente?.trim().slice(0, 180) || null,
  }).select("id").single();

  if (!error && data) return { vinculoId: (data as unknown as Linha).id as string };
  if (error?.code === "23505") return { erro: "Já tens um pedido com este contabilista." };
  return { erro: error?.message ?? "Não foi possível enviar o pedido." };
}

/** O vínculo vivo do cliente, se houver. Um cliente tem no máximo um por CC. */
export async function meuVinculo(clienteId: string): Promise<
  (Vinculo & { contabilista: Contabilista | null }) | null
> {
  const { data } = await getSupabase()
    .from("contabilista_vinculos")
    .select("*, contabilista:contabilista_id (" + CAMPOS_PUBLICOS + ")")
    .eq("cliente_id", clienteId)
    .neq("estado", "terminado")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const l = data as unknown as Linha;
  const cc = l.contabilista as Linha | null;
  return { ...paraVinculo(l), contabilista: cc ? paraContabilista(cc) : null };
}

/** O cliente corrige o nome por que quer ser tratado, sem terminar nada. */
export async function atualizarIdentidadeNoVinculo(
  id: string,
  campos: { nomeCliente?: string | null; emailCliente?: string | null }
): Promise<{ erro?: string }> {
  const dados: Linha = {};
  if (campos.nomeCliente !== undefined) {
    dados.nome_cliente = campos.nomeCliente?.trim().slice(0, 80) || null;
  }
  if (campos.emailCliente !== undefined) {
    dados.email_cliente = campos.emailCliente?.trim().slice(0, 180) || null;
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

export async function guardarDisponibilidade(
  contabilistaId: string,
  regras: RegraDisponibilidade[]
): Promise<{ erro?: string }> {
  const sb = getSupabase();
  // Substituição integral: a semana-tipo é um conjunto, não um histórico.
  const { error: erroApagar } = await sb
    .from("contabilista_disponibilidade").delete().eq("contabilista_id", contabilistaId);
  if (erroApagar) return { erro: erroApagar.message };

  if (regras.length === 0) return {};

  const { error } = await sb.from("contabilista_disponibilidade").insert(
    regras.map((r) => ({
      contabilista_id: contabilistaId,
      dia_semana: r.diaSemana,
      hora_inicio: r.inicio,
      hora_fim: r.fim,
      duracao_min: r.duracaoMin,
      intervalo_min: r.intervaloMin ?? 0,
    }))
  );
  return error ? { erro: error.message } : {};
}

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
    criadoEm: (l.criado_em as string) ?? "",
  };
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
export async function decidirConsulta(
  id: string,
  estado: EstadoAgendamento,
  localOuLigacao?: string
): Promise<{ erro?: string; fidelidade?: FidelidadeAposConsulta | null }> {
  const sb = getSupabase();

  const chamada =
    estado === "confirmado"
      ? sb.rpc("confirmar_consulta", { p_agendamento: id, p_local: localOuLigacao ?? null })
      : estado === "realizada"
        ? sb.rpc("concluir_consulta", { p_agendamento: id, p_compareceu: true })
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
};

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
