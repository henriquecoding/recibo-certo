// ═══════════════════════════════════════════════════════════════════════
//  POST /api/contabilistas/avisar — tocar o sino do outro lado
//  ---------------------------------------------------------------------
//  Quem chama diz «fiz X no vínculo Y». O destinatário e o texto NÃO vêm no
//  pedido: são escolhidos pelo servidor a partir de um catálogo fechado
//  (`avisar.ts`). Um campo de texto livre vindo do cliente seria um canal
//  para escrever o que se quisesse na app de outra pessoa, com o nosso nome
//  em cima.
//
//  A rota confirma que quem pede é mesmo parte do vínculo antes de a chave
//  de serviço escrever seja o que for.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { supabaseServico, utilizadorDoPedido } from "@/lib/contabilistas/servidor";
import { avisarOutraParte, type TipoAviso } from "@/lib/contabilistas/avisar";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPOS: TipoAviso[] = [
  "vinculo_pedido", "vinculo_aceite", "mensagem",
  "consulta_pedida", "consulta_confirmada", "consulta_cancelada",
  "partilha_recebida", "cupao_ganho",
];

export async function POST(req: Request) {
  const userId = await utilizadorDoPedido(req);
  if (!userId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  // Uma conversa animada são dezenas de mensagens por hora; mil não são.
  const limite = rateLimit(`contabilista:avisar:${userId}:${clientIp(req)}`, 60, 60_000);
  if (!limite.ok) {
    return NextResponse.json(
      { erro: "Demasiados pedidos." },
      { status: 429, headers: { "Retry-After": String(limite.retryAfter) } }
    );
  }

  const sb = supabaseServico();
  if (!sb) return NextResponse.json({ erro: "Serviço indisponível." }, { status: 503 });

  let corpo: { tipo?: string; vinculoId?: string };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }

  const tipo = corpo.tipo as TipoAviso;
  const vinculoId = typeof corpo.vinculoId === "string" ? corpo.vinculoId : "";
  if (!vinculoId || !TIPOS.includes(tipo)) {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }

  const r = await avisarOutraParte({ sb, tipo, vinculoId, autorId: userId });

  // Um aviso que não se conseguiu dar NÃO é um erro para quem chamou: a
  // escrita que o motivou já aconteceu, e devolver 500 faria a interface
  // mostrar uma falha numa operação que correu bem.
  if (!r.ok) console.warn("[avisar]", tipo, r.motivo);
  return NextResponse.json({ ok: r.ok });
}
