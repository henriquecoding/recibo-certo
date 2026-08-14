// ═══════════════════════════════════════════════════════════════════════
//  POST /api/contabilistas/cupao — dar um cupão por usado
//  ---------------------------------------------------------------------
//  Quem marca o cupão como usado é o CONTABILISTA, não o cliente: é ele que
//  aplica o desconto e é ele que sabe que o aplicou. Se o cliente o pudesse
//  fazer, gastava o cupão sem receber nada em troca.
//
//  ⚠️ O ReciboCerto NÃO cobra a consulta nem processa o pagamento. Isto
//  regista que o desconto foi dado; não o executa. O acordo é entre as duas
//  pessoas, e a interface diz isso.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import {
  supabaseServico,
  utilizadorDoPedido,
  contabilistaAprovadoDoPedido,
} from "@/lib/contabilistas/servidor";
import { normalizarCodigoCupao, cupaoValido, valorComDesconto } from "@/lib/contabilistas/fidelidade";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const userId = await utilizadorDoPedido(req);
  if (!userId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  // Um limite apertado: adivinhar códigos é a única forma de atacar isto,
  // e ninguém precisa de validar 30 cupões por minuto.
  const limite = rateLimit(`contabilista:cupao:${userId}:${clientIp(req)}`, 30, 60_000);
  if (!limite.ok) {
    return NextResponse.json(
      { erro: "Demasiadas tentativas. Tenta daqui a pouco." },
      { status: 429, headers: { "Retry-After": String(limite.retryAfter) } }
    );
  }

  const sb = supabaseServico();
  if (!sb) return NextResponse.json({ erro: "Serviço indisponível." }, { status: 503 });

  const cc = await contabilistaAprovadoDoPedido(sb, userId);
  if (!cc) return NextResponse.json({ erro: "Sem autorização." }, { status: 403 });

  let corpo: { codigo?: string; agendamentoId?: string };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }

  const codigo = normalizarCodigoCupao(typeof corpo.codigo === "string" ? corpo.codigo : "");
  if (!codigo) return NextResponse.json({ erro: "Código inválido." }, { status: 400 });

  const { data: cupao, error } = await sb
    .from("fidelidade_cupoes")
    .select("id, contabilista_id, cliente_id, percentagem, valor_base_cents, estado, expira_em")
    .eq("codigo", codigo)
    // Um cupão só é resgatável por quem o emitiu. Sem este filtro, um
    // contabilista dava por usado o cupão de um colega.
    .eq("contabilista_id", cc.userId)
    .maybeSingle();

  if (error) {
    console.error("[contabilistas/cupao] leitura:", error.message);
    return NextResponse.json({ erro: "Não foi possível validar o cupão." }, { status: 500 });
  }
  if (!cupao) return NextResponse.json({ erro: "Cupão não encontrado." }, { status: 404 });

  if (!cupaoValido(cupao.estado as string, cupao.expira_em as string)) {
    const motivo = cupao.estado === "usado" ? "Este cupão já foi utilizado." : "Este cupão expirou.";
    return NextResponse.json({ erro: motivo }, { status: 409 });
  }

  const atualizacao: Record<string, unknown> = {
    estado: "usado",
    usado_em: new Date().toISOString(),
  };
  if (typeof corpo.agendamentoId === "string" && corpo.agendamentoId) {
    atualizacao.usado_agendamento_id = corpo.agendamentoId;
  }

  // `eq("estado", "disponivel")` fecha a corrida: dois pedidos ao mesmo
  // tempo, e só o primeiro encontra o cupão disponível para atualizar.
  const { data: usado, error: erroUp } = await sb
    .from("fidelidade_cupoes")
    .update(atualizacao)
    .eq("id", cupao.id)
    .eq("estado", "disponivel")
    .select("id")
    .maybeSingle();

  if (erroUp) {
    console.error("[contabilistas/cupao] update:", erroUp.message);
    return NextResponse.json({ erro: "Não foi possível registar o cupão." }, { status: 500 });
  }
  if (!usado) {
    return NextResponse.json({ erro: "Este cupão já foi utilizado." }, { status: 409 });
  }

  const valores = valorComDesconto(
    cupao.valor_base_cents as number,
    cupao.percentagem as number
  );

  return NextResponse.json({ ok: true, codigo, ...valores });
}
