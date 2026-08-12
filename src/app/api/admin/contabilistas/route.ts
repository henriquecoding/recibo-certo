// ═══════════════════════════════════════════════════════════════════════
//  /api/admin/contabilistas — a fila de candidaturas e a decisão
//  ---------------------------------------------------------------------
//  Aprovar é o ato que cria a conta de contabilista. Por isso a linha em
//  `contabilistas` NASCE aqui, com a chave de serviço, e não há nenhuma
//  política de INSERT que permita a alguém criá-la para si próprio.
//
//  Cada decisão entra em `admin_auditoria` (migração 040): numa
//  investigação, a ausência de registo é indistinguível da ausência de
//  acesso indevido, e as duas coisas não são iguais.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { adminDoPedido } from "@/lib/supabase/verify-request-admin";
import { supabaseServico, slugLivre } from "@/lib/contabilistas/servidor";
import { CONFIG_FIDELIDADE_INICIAL } from "@/lib/contabilistas/fidelidade";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ESTADOS_PEDIDO = ["pendente", "em_analise", "aprovado", "recusado"] as const;
type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];

export async function GET(req: Request) {
  const ator = await adminDoPedido(req);
  if (!ator) return NextResponse.json({ erro: "Sem autorização." }, { status: 403 });

  const sb = supabaseServico();
  if (!sb) return NextResponse.json({ erro: "Serviço indisponível." }, { status: 503 });

  const url = new URL(req.url);
  const estado = url.searchParams.get("estado");

  let q = sb
    .from("contabilista_pedidos")
    .select("*")
    .order("criado_em", { ascending: false })
    .limit(200);

  if (estado && (ESTADOS_PEDIDO as readonly string[]).includes(estado)) {
    q = q.eq("estado", estado);
  }

  const { data, error } = await q;
  if (error) {
    console.error("[admin/contabilistas] GET:", error.message);
    return NextResponse.json({ erro: "Não foi possível carregar as candidaturas." }, { status: 500 });
  }

  // Contas já criadas, para a fila mostrar quem já está aprovado e em que estado.
  const { data: contas } = await sb
    .from("contabilistas")
    .select("user_id, slug, nome, estado, criado_em")
    .order("criado_em", { ascending: false })
    .limit(200);

  return NextResponse.json({ pedidos: data ?? [], contas: contas ?? [] });
}

export async function PATCH(req: Request) {
  const ator = await adminDoPedido(req);
  if (!ator) return NextResponse.json({ erro: "Sem autorização." }, { status: 403 });

  const sb = supabaseServico();
  if (!sb) return NextResponse.json({ erro: "Serviço indisponível." }, { status: 503 });

  let corpo: { pedidoId?: string; decisao?: string; motivo?: string; userId?: string };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }

  const motivo = typeof corpo.motivo === "string" ? corpo.motivo.trim().slice(0, 2000) : "";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  // ── Suspender ou reativar uma conta já existente ───────────────────
  if (corpo.decisao === "suspender" || corpo.decisao === "reativar") {
    const userId = typeof corpo.userId === "string" ? corpo.userId : "";
    if (!userId) return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });

    // Suspender sem motivo deixa a pessoa sem saber o que corrigir.
    if (corpo.decisao === "suspender" && motivo.length < 5) {
      return NextResponse.json({ erro: "Indica o motivo da suspensão." }, { status: 400 });
    }

    const novoEstado = corpo.decisao === "suspender" ? "suspenso" : "aprovado";
    const { data: antes } = await sb
      .from("contabilistas").select("nome, estado").eq("user_id", userId).maybeSingle();

    const { error } = await sb
      .from("contabilistas").update({ estado: novoEstado }).eq("user_id", userId);
    if (error) {
      console.error("[admin/contabilistas] suspender:", error.message);
      return NextResponse.json({ erro: "Não foi possível alterar a conta." }, { status: 500 });
    }

    await registar(sb, ator, `contabilista_${corpo.decisao}`, userId, {
      de: antes?.estado ?? null, para: novoEstado, motivo: motivo || null,
    }, ip);

    return NextResponse.json({ ok: true, estado: novoEstado });
  }

  // ── Decidir uma candidatura ────────────────────────────────────────
  const pedidoId = typeof corpo.pedidoId === "string" ? corpo.pedidoId : "";
  const decisao = corpo.decisao;
  if (!pedidoId || (decisao !== "aprovar" && decisao !== "recusar" && decisao !== "em_analise")) {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }

  const { data: pedido, error: erroPedido } = await sb
    .from("contabilista_pedidos")
    .select("id, user_id, nome, email_contacto, estado")
    .eq("id", pedidoId)
    .maybeSingle();

  if (erroPedido || !pedido) {
    return NextResponse.json({ erro: "Candidatura não encontrada." }, { status: 404 });
  }
  if (pedido.estado === "aprovado") {
    return NextResponse.json({ erro: "Esta candidatura já foi aprovada." }, { status: 409 });
  }

  if (decisao === "em_analise") {
    await sb.from("contabilista_pedidos")
      .update({ estado: "em_analise", atualizado_em: new Date().toISOString() })
      .eq("id", pedidoId);
    await registar(sb, ator, "contabilista_pedido_em_analise", pedido.user_id as string, {}, ip);
    return NextResponse.json({ ok: true, estado: "em_analise" });
  }

  if (decisao === "recusar") {
    // Recusar sem motivo deixa a pessoa sem saber o que corrigir para voltar
    // a candidatar-se. A recusa não apaga nada — a candidatura fica legível
    // para o próprio, com o motivo.
    if (motivo.length < 5) {
      return NextResponse.json({ erro: "Indica o motivo da recusa." }, { status: 400 });
    }
    const { error } = await sb.from("contabilista_pedidos").update({
      estado: "recusado",
      motivo_decisao: motivo,
      decidido_por: ator.id,
      decidido_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    }).eq("id", pedidoId);
    if (error) {
      console.error("[admin/contabilistas] recusar:", error.message);
      return NextResponse.json({ erro: "Não foi possível recusar." }, { status: 500 });
    }
    await registar(sb, ator, "contabilista_pedido_recusado", pedido.user_id as string,
      { motivo }, ip);
    return NextResponse.json({ ok: true, estado: "recusado" });
  }

  // ── Aprovar: cria a conta ──────────────────────────────────────────
  const { data: jaExiste } = await sb
    .from("contabilistas").select("user_id, estado").eq("user_id", pedido.user_id).maybeSingle();

  if (jaExiste) {
    // Já houve conta (recusada ou suspensa): reabre-se em vez de duplicar.
    const { error } = await sb
      .from("contabilistas").update({ estado: "aprovado" }).eq("user_id", pedido.user_id);
    if (error) {
      console.error("[admin/contabilistas] reabrir:", error.message);
      return NextResponse.json({ erro: "Não foi possível aprovar." }, { status: 500 });
    }
  } else {
    const slug = await slugLivre(sb, pedido.nome as string);
    const { error } = await sb.from("contabilistas").insert({
      user_id: pedido.user_id,
      pedido_id: pedido.id,
      slug,
      nome: pedido.nome,
      email_contacto: pedido.email_contacto,
      estado: "aprovado",
      // O cartão de fidelidade começa desligado e a 10%: quem aprova não
      // decide o preço nem a promessa comercial de outra pessoa.
      fidelidade_desconto_pct: CONFIG_FIDELIDADE_INICIAL.descontoPct,
      fidelidade_ativa: false,
    });
    if (error) {
      console.error("[admin/contabilistas] aprovar:", error.message);
      return NextResponse.json({ erro: "Não foi possível criar a conta." }, { status: 500 });
    }
  }

  await sb.from("contabilista_pedidos").update({
    estado: "aprovado",
    motivo_decisao: motivo || null,
    decidido_por: ator.id,
    decidido_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  }).eq("id", pedidoId);

  await registar(sb, ator, "contabilista_pedido_aprovado", pedido.user_id as string,
    { nome: pedido.nome }, ip);

  return NextResponse.json({ ok: true, estado: "aprovado" });
}

/**
 * O rasto é escrito DEPOIS do ato, e a sua falha não o desfaz: um registo
 * perdido é mau, mas devolver erro numa alteração que já aconteceu seria
 * pior — deixaria o ecrã a mostrar o contrário do que está na base.
 */
async function registar(
  sb: NonNullable<ReturnType<typeof supabaseServico>>,
  ator: { id: string; email: string | null },
  acao: string,
  alvoId: string,
  detalhe: Record<string, unknown>,
  ip: string | null
): Promise<void> {
  const { error } = await sb.from("admin_auditoria").insert({
    ator_id: ator.id,
    ator_email: ator.email,
    acao,
    alvo_id: alvoId,
    detalhe,
    ip,
  });
  if (error) console.error("[admin/contabilistas] auditoria:", error.message);
}
