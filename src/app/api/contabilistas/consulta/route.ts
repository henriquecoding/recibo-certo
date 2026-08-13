// ═══════════════════════════════════════════════════════════════════════
//  PATCH /api/contabilistas/consulta — marcar realizada e carimbar
//  ---------------------------------------------------------------------
//  Marcar uma consulta como realizada é o que enche o cartão de fidelidade.
//  Por isso não é uma escrita como as outras:
//
//   · o cliente NÃO o pode fazer (a política RLS obriga-o a `estado =
//     'cancelado_cliente'`) — senão carimbava o cartão sozinho;
//   · o carimbo NÃO é escrito pelo cliente nem pelo contabilista, mas por
//     `carimbar_consulta`, com a chave de serviço;
//   · carimbar duas vezes a mesma consulta é impossível por
//     `UNIQUE (agendamento_id)`, e não por esta rota se lembrar de verificar.
//
//  O que esta rota acrescenta é a confirmação de identidade: quem pede tem
//  mesmo de ser o contabilista DAQUELA consulta.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import {
  supabaseServico,
  utilizadorDoPedido,
  contabilistaAprovadoDoPedido,
  gerarCodigoCupao,
} from "@/lib/contabilistas/servidor";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { avisarOutraParte } from "@/lib/contabilistas/avisar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Estados que o contabilista pode atribuir a uma consulta sua. */
const ESTADOS_PERMITIDOS = new Set([
  "confirmado", "realizada", "cancelado_contabilista", "nao_compareceu",
]);

export async function PATCH(req: Request) {
  const userId = await utilizadorDoPedido(req);
  if (!userId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const limite = rateLimit(`contabilista:consulta:${userId}:${clientIp(req)}`, 120, 60_000);
  if (!limite.ok) {
    return NextResponse.json(
      { erro: "Demasiados pedidos. Tenta daqui a pouco." },
      { status: 429, headers: { "Retry-After": String(limite.retryAfter) } }
    );
  }

  const sb = supabaseServico();
  if (!sb) return NextResponse.json({ erro: "Serviço indisponível." }, { status: 503 });

  const cc = await contabilistaAprovadoDoPedido(sb, userId);
  if (!cc) return NextResponse.json({ erro: "Sem autorização." }, { status: 403 });

  let corpo: { agendamentoId?: string; estado?: string; localOuLigacao?: string };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }

  const agendamentoId = typeof corpo.agendamentoId === "string" ? corpo.agendamentoId : "";
  const estado = typeof corpo.estado === "string" ? corpo.estado : "";
  if (!agendamentoId || !ESTADOS_PERMITIDOS.has(estado)) {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }

  // A consulta tem de ser DESTE contabilista. Sem esta verificação, a chave
  // de serviço escrevia em qualquer agendamento da plataforma.
  const { data: ag, error: erroAg } = await sb
    .from("agendamentos")
    .select("id, contabilista_id, cliente_id, estado, inicio")
    .eq("id", agendamentoId)
    .maybeSingle();

  if (erroAg || !ag) {
    return NextResponse.json({ erro: "Consulta não encontrada." }, { status: 404 });
  }
  if (ag.contabilista_id !== cc.userId) {
    return NextResponse.json({ erro: "Sem autorização." }, { status: 403 });
  }

  // Uma consulta cancelada não volta atrás por esta via: reabrir um horário
  // já libertado podia colidir com outro que entretanto o ocupou.
  if (ag.estado === "cancelado_cliente" || ag.estado === "cancelado_contabilista") {
    return NextResponse.json({ erro: "Esta consulta já foi cancelada." }, { status: 409 });
  }

  // Não se marca como realizada uma consulta que ainda não começou.
  if (estado === "realizada" && new Date(ag.inicio as string).getTime() > Date.now()) {
    return NextResponse.json(
      { erro: "Esta consulta ainda não começou." },
      { status: 409 }
    );
  }

  const atualizacao: Record<string, unknown> = {
    estado,
    atualizado_em: new Date().toISOString(),
  };
  if (typeof corpo.localOuLigacao === "string") {
    atualizacao.local_ou_ligacao = corpo.localOuLigacao.trim().slice(0, 500) || null;
  }

  const { error: erroUp } = await sb
    .from("agendamentos").update(atualizacao).eq("id", agendamentoId);

  if (erroUp) {
    console.error("[contabilistas/consulta] update:", erroUp.message);
    return NextResponse.json({ erro: "Não foi possível atualizar a consulta." }, { status: 500 });
  }

  // O cliente é avisado da decisão. Correr aqui e não no browser garante
  // que o aviso acontece mesmo que quem clicou feche o separador a seguir.
  const vinculo = await vinculoDe(sb, cc.userId, ag.cliente_id as string);
  if (vinculo && (estado === "confirmado" || estado === "cancelado_contabilista")) {
    await avisarOutraParte({
      sb,
      tipo: estado === "confirmado" ? "consulta_confirmada" : "consulta_cancelada",
      vinculoId: vinculo,
      autorId: cc.userId,
    });
  }

  if (estado !== "realizada") {
    return NextResponse.json({ ok: true, estado });
  }

  // Carimbar. A função é idempotente; se o cartão estiver desligado devolve
  // `fidelidade_inativa` e não é erro nenhum — é uma escolha do contabilista.
  const { data: resultado, error: erroCarimbo } = await sb.rpc("carimbar_consulta", {
    p_agendamento_id: agendamentoId,
    p_codigo_cupao: gerarCodigoCupao(),
  });

  if (erroCarimbo) {
    // A consulta FICA marcada como realizada. Falhar aqui e devolver erro
    // faria o contabilista repetir a operação para corrigir o cartão, e o
    // ecrã já mostra a consulta como realizada — que é a verdade.
    console.error("[contabilistas/consulta] carimbo:", erroCarimbo.message);
    return NextResponse.json({ ok: true, estado, fidelidade: null });
  }

  const fecho = resultado as { completou?: boolean } | null;
  if (fecho?.completou && vinculo) {
    await avisarOutraParte({ sb, tipo: "cupao_ganho", vinculoId: vinculo, autorId: cc.userId });
  }

  return NextResponse.json({ ok: true, estado, fidelidade: resultado ?? null });
}


/** O vínculo vivo entre estas duas pessoas, se houver. */
async function vinculoDe(
  sb: NonNullable<ReturnType<typeof supabaseServico>>,
  contabilistaId: string,
  clienteId: string
): Promise<string | null> {
  const { data } = await sb
    .from("contabilista_vinculos")
    .select("id")
    .eq("contabilista_id", contabilistaId)
    .eq("cliente_id", clienteId)
    .neq("estado", "terminado")
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}
