// ═══════════════════════════════════════════════════════════════════════
//  OS TRÊS DESTINOS — o transporte do dossiê
//  ---------------------------------------------------------------------
//  D1  o contabilista que a pessoa já tem   → `partilhas` (`dossie_guia`)
//  D2  escolher na plataforma               → `caso_dossies`
//  D3  o contabilista dela, fora daqui      → `dossie_ligacoes`
//
//  ⚠️ Nenhum dos três verifica o plano, e nenhum pode passar a verificar.
//  Ver `PARTILHA_NUNCA_EXIGE_PLUS`: criar um `Entitlement` para isto seria
//  criar a possibilidade de o cobrar.
//
//  ⚠️ D3 E O TOKEN. O token nasce aqui, no browser de quem cria a ligação,
//  e o que é escrito na base é só o sha-256 dele. A base NUNCA vê o token:
//  quem lê a tabela — e a administração lê — não abre dossiê nenhum. O
//  token viaja no FRAGMENTO do endereço (`/d/<id>#<token>`), que o browser
//  não põe no `Referer` nem em logs de servidor. É a lição de
//  `busca/handoff.ts` aplicada a um contexto que persiste.
// ═══════════════════════════════════════════════════════════════════════

import { getSupabase } from "@/lib/supabase/client";
import { partilhar } from "@/lib/contabilistas/dados";
import { CONSENTIMENTO_VERSAO } from "@/lib/contabilistas/vinculo";
import type { DossieDeGuia, EstadoItemPedido, ItemDePedido, PedidoDeElementos } from "./tipos";

/** Quantas ligações opacas por dia. ⚠️ ESPELHO de `limite_ligacoes_dia()`. */
export const LIMITE_LIGACOES_DIA = 10;

/** Quanto dura uma ligação de D3. Prorrogável pela própria pessoa. */
export const DIAS_DE_LIGACAO = 30;

// ─── D1 · partilhar com o vínculo ativo ────────────────────────────────

export async function enviarAoVinculo(p: {
  contabilistaId: string;
  clienteId: string;
  dossie: DossieDeGuia;
  nota?: string;
}): Promise<{ erro?: string }> {
  const { erro } = await partilhar({
    contabilistaId: p.contabilistaId,
    clienteId: p.clienteId,
    tipo: "dossie_guia",
    conteudo: p.dossie,
    titulo: `Dossiê — ${p.dossie.guia.titulo}`,
    nota: p.nota,
  });
  return { erro };
}

// ─── D2 · anexar a um caso ─────────────────────────────────────────────

export async function anexarAoCaso(
  casoId: string,
  dossie: DossieDeGuia,
): Promise<{ erro?: string; id?: string }> {
  const { data, error } = await getSupabase()
    .from("caso_dossies")
    .insert({
      caso_id: casoId,
      guia_slug: dossie.guia.slug,
      guia_revisao: dossie.fixado.revistoEm,
      app_version: dossie.fixado.appVersion,
      dossie,
      impressao: dossie.fixado.impressao,
      consentimento_versao: dossie.consentimento.versao,
      consentimento_seccoes: dossie.consentimento.seccoes,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    // 23505 é o UNIQUE (caso, guia, impressão): o mesmo dossiê não entra
    // duas vezes. Não é um erro para quem o enviou — é a garantia a
    // funcionar, e dizer «falhou» seria mentir.
    if (error.code === "23505") return {};
    return { erro: error.message };
  }
  return { id: (data as { id?: string } | null)?.id };
}

export interface DossieDoCaso {
  id: string;
  casoId: string;
  guiaSlug: string;
  guiaRevisao: string;
  appVersion: string;
  dossie: DossieDeGuia;
  impressao: string;
  retiradoEm: string | null;
  criadoEm: string;
}

export async function listarDossiesDoCaso(casoId: string): Promise<DossieDoCaso[]> {
  const { data } = await getSupabase()
    .from("caso_dossies")
    .select("*")
    .eq("caso_id", casoId)
    .order("criado_em", { ascending: false });
  return ((data ?? []) as Record<string, unknown>[]).map((l) => ({
    id: String(l.id),
    casoId: String(l.caso_id),
    guiaSlug: String(l.guia_slug),
    guiaRevisao: String(l.guia_revisao),
    appVersion: String(l.app_version),
    dossie: l.dossie as DossieDeGuia,
    impressao: String(l.impressao),
    retiradoEm: (l.retirado_em as string | null) ?? null,
    criadoEm: String(l.criado_em),
  }));
}

export async function retirarDossieDoCaso(id: string): Promise<{ erro?: string }> {
  const { error } = await getSupabase()
    .from("caso_dossies")
    .update({ retirado_em: new Date().toISOString() })
    .eq("id", id);
  return { erro: error?.message };
}

// ─── D3 · a ligação opaca ──────────────────────────────────────────────

/** 32 bytes aleatórios em base64url. Nunca previsível, nunca sequencial. */
export function gerarToken(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  let bruto = "";
  for (const b of bytes) bruto += String.fromCharCode(b);
  return btoa(bruto).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** sha-256 hexadecimal. É isto — e só isto — que chega à base de dados. */
export async function hashDoToken(token: string): Promise<string> {
  const buffer = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface LigacaoDeDossie {
  id: string;
  guiaSlug: string;
  guiaRevisao: string;
  etiqueta: string | null;
  impressao: string;
  expiraEm: string;
  revogadaEm: string | null;
  acessos: number;
  ultimoAcesso: string | null;
  criadoEm: string;
}

export async function criarLigacao(p: {
  clienteId: string;
  dossie: DossieDeGuia;
  etiqueta?: string;
  dias?: number;
}): Promise<{ erro?: string; id?: string; token?: string; caminho?: string }> {
  const token = gerarToken();
  const tokenHash = await hashDoToken(token);
  const expira = new Date(Date.now() + (p.dias ?? DIAS_DE_LIGACAO) * 24 * 3600 * 1000);

  const { data, error } = await getSupabase()
    .from("dossie_ligacoes")
    .insert({
      cliente_id: p.clienteId,
      guia_slug: p.dossie.guia.slug,
      guia_revisao: p.dossie.fixado.revistoEm,
      dossie: p.dossie,
      impressao: p.dossie.fixado.impressao,
      token_hash: tokenHash,
      etiqueta: p.etiqueta?.trim().slice(0, 60) || null,
      consentimento_versao: p.dossie.consentimento.versao || CONSENTIMENTO_VERSAO,
      consentimento_seccoes: p.dossie.consentimento.seccoes,
      expira_em: expira.toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      erro: error.code === "23514" && error.message.includes("ligações hoje")
        ? `Já criaste ${LIMITE_LIGACOES_DIA} ligações hoje. Tenta amanhã.`
        : error.message,
    };
  }

  const id = (data as { id?: string } | null)?.id;
  if (!id) return { erro: "Não foi possível criar a ligação." };
  // O token no FRAGMENTO. Nunca na query — ver o cabeçalho deste ficheiro.
  return { id, token, caminho: `/d/${id}#${token}` };
}

export async function listarLigacoes(clienteId: string): Promise<LigacaoDeDossie[]> {
  const { data } = await getSupabase()
    .from("dossie_ligacoes")
    .select("id, guia_slug, guia_revisao, etiqueta, impressao, expira_em, revogada_em, acessos, ultimo_acesso, criado_em")
    .eq("cliente_id", clienteId)
    .order("criado_em", { ascending: false });

  return ((data ?? []) as Record<string, unknown>[]).map((l) => ({
    id: String(l.id),
    guiaSlug: String(l.guia_slug),
    guiaRevisao: String(l.guia_revisao),
    etiqueta: (l.etiqueta as string | null) ?? null,
    impressao: String(l.impressao),
    expiraEm: String(l.expira_em),
    revogadaEm: (l.revogada_em as string | null) ?? null,
    acessos: Number(l.acessos ?? 0),
    ultimoAcesso: (l.ultimo_acesso as string | null) ?? null,
    criadoEm: String(l.criado_em),
  }));
}

/** Revogar corta o acesso no instante. Não apaga o histórico do próprio. */
export async function revogarLigacao(id: string): Promise<{ erro?: string }> {
  const { error } = await getSupabase()
    .from("dossie_ligacoes")
    .update({ revogada_em: new Date().toISOString() })
    .eq("id", id);
  return { erro: error?.message };
}

export async function prorrogarLigacao(id: string, dias = DIAS_DE_LIGACAO): Promise<{ erro?: string }> {
  const { error } = await getSupabase()
    .from("dossie_ligacoes")
    .update({ expira_em: new Date(Date.now() + dias * 24 * 3600 * 1000).toISOString() })
    .eq("id", id);
  return { erro: error?.message };
}

/** O estado de uma ligação, dito como a pessoa o lê. */
export function estadoDaLigacao(l: LigacaoDeDossie): "ativa" | "revogada" | "expirada" {
  if (l.revogadaEm) return "revogada";
  if (new Date(l.expiraEm).getTime() <= Date.now()) return "expirada";
  return "ativa";
}

// ─── A volta · pedidos de elementos ────────────────────────────────────

export type OrigemDoPedido = "partilha" | "caso_dossie" | "ligacao";

export async function criarPedido(p: {
  origem: OrigemDoPedido;
  origemId: string;
  pedido: PedidoDeElementos;
  guiaSlug: string;
}): Promise<{ erro?: string; id?: string }> {
  const { data, error } = await getSupabase().rpc("criar_pedido_de_elementos", {
    p_origem: p.origem,
    p_origem_id: p.origemId,
    p_guia_slug: p.guiaSlug,
    p_impressao: p.pedido.dossie.impressao,
    p_itens: p.pedido.itens.map((i) => ({
      texto: i.texto,
      origem: i.origem,
      item_id: i.itemId ?? null,
      prazo: i.prazo ?? "",
      nota: i.nota ?? null,
    })),
  });
  if (error) return { erro: error.message };
  const r = (data ?? {}) as { ok?: boolean; motivo?: string; pedido_id?: string };
  if (!r.ok) {
    return {
      erro: r.motivo === "sem_itens"
        ? "Escolhe pelo menos um item antes de pedir."
        : r.motivo === "demasiados_itens"
          ? "São itens a mais para um pedido só. Divide em dois."
          : "Não foi possível criar o pedido.",
    };
  }
  return { id: r.pedido_id };
}

export interface PedidoGuardado {
  id: string;
  guiaSlug: string;
  impressao: string;
  estado: "aberto" | "respondido" | "fechado";
  criadoEm: string;
  itens: (ItemDePedido & { id: string })[];
}

/**
 * Os pedidos abertos de uma pessoa, por guia.
 *
 * É isto que faz a volta chegar à `ChecklistGuia`: a pessoa volta ao mesmo
 * sítio onde marcou os itens e encontra lá o trabalho, com prazo.
 */
export async function meusPedidos(guiaSlug?: string): Promise<PedidoGuardado[]> {
  let consulta = getSupabase()
    .from("dossie_pedidos")
    .select("id, guia_slug, impressao, estado, criado_em, dossie_pedido_itens(*)")
    .order("criado_em", { ascending: false });
  if (guiaSlug) consulta = consulta.eq("guia_slug", guiaSlug);

  const { data } = await consulta;
  return ((data ?? []) as Record<string, unknown>[]).map((l) => ({
    id: String(l.id),
    guiaSlug: String(l.guia_slug),
    impressao: String(l.impressao),
    estado: String(l.estado) as PedidoGuardado["estado"],
    criadoEm: String(l.criado_em),
    itens: ((l.dossie_pedido_itens ?? []) as Record<string, unknown>[])
      .map((i) => ({
        id: String(i.id),
        n: Number(i.n),
        texto: String(i.texto),
        origem: String(i.origem) as ItemDePedido["origem"],
        itemId: (i.item_id as string | null) ?? undefined,
        proveniencia: { origem: "pessoa" as const, campo: "nota" as const },
        estado: String(i.estado) as EstadoItemPedido,
        prazo: (i.prazo as string | null) ?? undefined,
        nota: (i.nota as string | null) ?? undefined,
      }))
      .sort((a, b) => a.n - b.n),
  }));
}

/** O cliente responde a um item. O texto do item é imutável — o gatilho garante. */
export async function responderItem(
  itemId: string,
  estado: EstadoItemPedido,
): Promise<{ erro?: string }> {
  const { error } = await getSupabase()
    .from("dossie_pedido_itens")
    .update({ estado, respondido_em: new Date().toISOString() })
    .eq("id", itemId);
  return { erro: error?.message };
}
