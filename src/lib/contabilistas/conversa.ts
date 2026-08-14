// ═══════════════════════════════════════════════════════════════════════
//  CONVERSA E AVISOS — acesso a dados, sob RLS
//  ---------------------------------------------------------------------
//  Como o resto de `dados.ts`: nenhuma verificação de permissão vive aqui.
//  Quem autoriza é a migração 044 — uma verificação em JavaScript seria uma
//  segunda opinião que ninguém consulta, porque o browser está do lado de
//  quem a quiser contornar.
//
//  O Realtime é do Supabase e vem incluído no plano gratuito. Não há aqui
//  nenhum serviço de terceiros: a conversa entre um contabilista e o seu
//  cliente é informação fiscal, e sai da nossa base de dados para lado
//  nenhum.
// ═══════════════════════════════════════════════════════════════════════

import { getSupabase } from "@/lib/supabase/client";

type Linha = Record<string, unknown>;

/** Teto por ficheiro. O mesmo número está num CHECK da migração 044. */
export const ANEXO_MAX_BYTES = 10 * 1024 * 1024;
/** Teto por mensagem. O mesmo número está num gatilho da migração 044. */
export const ANEXOS_MAX = 5;
export const MENSAGEM_MAX = 4000;

export const TIPOS_ANEXO_ACEITES = [
  "application/pdf",
  "image/jpeg", "image/png", "image/webp", "image/heic",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
] as const;

export interface Anexo {
  id: string;
  caminho: string;
  nome: string;
  bytes: number;
  tipoMime: string;
}

export interface Mensagem {
  id: string;
  vinculoId: string;
  autorId: string;
  corpo: string;
  lidaEm: string | null;
  criadoEm: string;
  anexos: Anexo[];
}

function paraMensagem(l: Linha): Mensagem {
  const anexos = (l.anexos as Linha[] | null) ?? [];
  return {
    id: l.id as string,
    vinculoId: l.vinculo_id as string,
    autorId: l.autor_id as string,
    corpo: l.corpo as string,
    lidaEm: (l.lida_em as string | null) ?? null,
    criadoEm: l.criado_em as string,
    anexos: anexos.map((a) => ({
      id: a.id as string,
      caminho: a.caminho as string,
      nome: a.nome as string,
      bytes: a.bytes as number,
      tipoMime: a.tipo_mime as string,
    })),
  };
}

export async function listarMensagens(vinculoId: string): Promise<Mensagem[]> {
  const { data, error } = await getSupabase()
    .from("contabilista_mensagens")
    .select("id, vinculo_id, autor_id, corpo, lida_em, criado_em, anexos:contabilista_anexos(id, caminho, nome, bytes, tipo_mime)")
    .eq("vinculo_id", vinculoId)
    .order("criado_em", { ascending: true })
    .limit(500);

  if (error) throw new Error(error.message);
  return (data ?? []).map((l) => paraMensagem(l as unknown as Linha));
}

export interface ResultadoEnvio {
  erro?: string;
  /** Ficheiros que não seguiram, e porquê. O envio do texto não é desfeito. */
  recusados?: string[];
}

/**
 * Envia uma mensagem, e a seguir os anexos.
 *
 * A ordem importa: a mensagem primeiro, os ficheiros depois. Se um anexo
 * falhar, o que a pessoa escreveu já está lá — o contrário deixaria uma
 * pergunta por fazer só porque um PDF era grande demais.
 */
export async function enviarMensagem(p: {
  vinculoId: string;
  autorId: string;
  corpo: string;
  ficheiros?: File[];
}): Promise<ResultadoEnvio> {
  const corpo = p.corpo.trim().slice(0, MENSAGEM_MAX);
  if (!corpo) return { erro: "Escreve alguma coisa." };

  const sb = getSupabase();
  const { data, error } = await sb
    .from("contabilista_mensagens")
    .insert({ vinculo_id: p.vinculoId, autor_id: p.autorId, corpo })
    .select("id")
    .single();

  if (error || !data) return { erro: error?.message ?? "Não foi possível enviar." };

  const mensagemId = (data as unknown as Linha).id as string;
  const recusados: string[] = [];

  for (const f of (p.ficheiros ?? []).slice(0, ANEXOS_MAX)) {
    if (f.size > ANEXO_MAX_BYTES) { recusados.push(`${f.name} (acima de 10 MB)`); continue; }
    if (!(TIPOS_ANEXO_ACEITES as readonly string[]).includes(f.type)) {
      recusados.push(`${f.name} (formato não aceite)`); continue;
    }

    // O caminho começa pelo id do vínculo: é assim que a política do balde
    // sabe quem pode ler, e é o que faz terminar o acompanhamento fechar
    // também os ficheiros.
    const nomeSeguro = f.name.replace(/[^\w.\-]/g, "_").slice(-80);
    const caminho = `${p.vinculoId}/${mensagemId}-${Date.now()}-${nomeSeguro}`;

    const { error: erroUp } = await sb.storage
      .from("contabilista-anexos")
      .upload(caminho, f, { upsert: false, contentType: f.type });
    if (erroUp) { recusados.push(`${f.name} (${erroUp.message})`); continue; }

    const { error: erroLinha } = await sb.from("contabilista_anexos").insert({
      mensagem_id: mensagemId,
      caminho,
      nome: f.name.slice(0, 200),
      bytes: f.size,
      tipo_mime: f.type,
    });
    if (erroLinha) recusados.push(`${f.name} (${erroLinha.message})`);
  }

  return recusados.length > 0 ? { recusados } : {};
}

/** Marca como lidas as mensagens do OUTRO. As próprias nunca contam. */
export async function marcarLidas(vinculoId: string, meuId: string): Promise<void> {
  await getSupabase()
    .from("contabilista_mensagens")
    .update({ lida_em: new Date().toISOString() })
    .eq("vinculo_id", vinculoId)
    .neq("autor_id", meuId)
    .is("lida_em", null);
}

/** URL assinado, válido cinco minutos. Nunca se guarda — assina-se na hora. */
export async function urlDoAnexo(caminho: string): Promise<string | null> {
  const { data } = await getSupabase()
    .storage.from("contabilista-anexos").createSignedUrl(caminho, 300);
  return data?.signedUrl ?? null;
}

/**
 * Escuta mensagens novas de uma conversa.
 *
 * Devolve a função de cancelamento. Quem chama TEM de a usar na limpeza do
 * efeito: um canal por montagem que nunca fecha esgota as ligações
 * simultâneas do plano, e o sintoma aparece longe da causa.
 */
export function escutarMensagens(
  vinculoId: string,
  aoChegar: (m: Mensagem) => void
): () => void {
  const sb = getSupabase();
  const canal = sb
    .channel(`conversa:${vinculoId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "contabilista_mensagens", filter: `vinculo_id=eq.${vinculoId}` },
      (evento) => aoChegar(paraMensagem(evento.new as Linha))
    )
    .subscribe();

  return () => { void sb.removeChannel(canal); };
}

// ─── Notificações ──────────────────────────────────────────────────────

export type TipoNotificacao =
  | "vinculo_pedido" | "vinculo_aceite" | "mensagem"
  | "consulta_pedida" | "consulta_confirmada" | "consulta_cancelada"
  | "partilha_recebida" | "cupao_ganho" | "candidatura_decidida";

export interface Notificacao {
  id: string;
  tipo: TipoNotificacao;
  titulo: string;
  corpo: string | null;
  url: string | null;
  lidaEm: string | null;
  criadoEm: string;
}

function paraNotificacao(l: Linha): Notificacao {
  return {
    id: l.id as string,
    tipo: l.tipo as TipoNotificacao,
    titulo: l.titulo as string,
    corpo: (l.corpo as string | null) ?? null,
    url: (l.url as string | null) ?? null,
    lidaEm: (l.lida_em as string | null) ?? null,
    criadoEm: l.criado_em as string,
  };
}

export async function listarNotificacoes(limite = 30): Promise<Notificacao[]> {
  const { data, error } = await getSupabase()
    .from("notificacoes")
    .select("id, tipo, titulo, corpo, url, lida_em, criado_em")
    .order("criado_em", { ascending: false })
    .limit(limite);
  if (error) throw new Error(error.message);
  return (data ?? []).map((l) => paraNotificacao(l as unknown as Linha));
}

export async function marcarNotificacaoLida(id: string): Promise<void> {
  await getSupabase()
    .from("notificacoes").update({ lida_em: new Date().toISOString() }).eq("id", id);
}

export async function marcarTodasLidas(): Promise<void> {
  await getSupabase()
    .from("notificacoes")
    .update({ lida_em: new Date().toISOString() })
    .is("lida_em", null);
}

export function escutarNotificacoes(
  userId: string,
  aoChegar: (n: Notificacao) => void
): () => void {
  const sb = getSupabase();
  const canal = sb
    .channel(`avisos:${userId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notificacoes", filter: `user_id=eq.${userId}` },
      (evento) => aoChegar(paraNotificacao(evento.new as Linha))
    )
    .subscribe();

  return () => { void sb.removeChannel(canal); };
}

/** "2,4 MB" — o tamanho de um anexo, como se lê. */
export function tamanhoLegivel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

// Não há aqui nenhuma função para «avisar o outro lado», e é de propósito.
//
// Havia: o browser chamava `/api/contabilistas/avisar` a seguir a escrever.
// Isso tinha dois defeitos ao mesmo tempo — fechar o separador logo a seguir
// e o aviso não chegar, ou saber um id de vínculo e o aviso chegar sem que
// nada tivesse acontecido.
//
// Desde a migração 047 o aviso nasce da mesma transação que escreve o facto:
// as RPCs avisam, e os INSERT que não são transições (pedido de vínculo,
// mensagem, simulação) têm gatilho. Não há maneira de pedir um aviso sem
// escrever a linha, nem de escrever a linha sem o aviso.
