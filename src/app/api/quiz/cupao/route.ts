// ═══════════════════════════════════════════════════════════════════════
//  POST /api/quiz/cupao — ativa um cupão e entrega mesmo o Pro
//  ---------------------------------------------------------------------
//  A versão anterior marcava o cupão como «ativado», tentava escrever em
//  `subscriptions` — escrita que a RLS rejeita, porque essa tabela só tem
//  policies de leitura para o utilizador — e devolvia `{}` sem ler o erro.
//  Resultado: o utilizador via a mensagem de sucesso, perdia o cupão e não
//  recebia nada, sem forma de recuperar.
//
//  Aqui as duas escritas acontecem do lado do servidor, com `service_role`,
//  e por uma ordem que não deixa o cupão queimado se a subscrição falhar:
//  primeiro a subscrição, só depois a marcação do cupão.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { supabaseServico, utilizadorDoPedido } from "@/lib/quiz-fiscal/server";
import { fimDaConcessao } from "@/lib/plus/concessao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const userId = await utilizadorDoPedido(req);
  if (!userId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const sb = supabaseServico();
  if (!sb) return NextResponse.json({ erro: "Serviço indisponível." }, { status: 503 });

  let corpo: { cupaoId?: string };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }
  const cupaoId = typeof corpo.cupaoId === "string" ? corpo.cupaoId : "";
  if (!cupaoId) return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });

  // O cupão tem de ser DESTE utilizador, estar disponível e não estar expirado.
  const { data: cupao, error: errCupao } = await sb
    .from("quiz_cupoes")
    .select("id, meses, expira_em")
    .eq("id", cupaoId)
    .eq("user_id", userId)
    .eq("estado", "disponivel")
    .maybeSingle();

  if (errCupao) return NextResponse.json({ erro: errCupao.message }, { status: 500 });
  if (!cupao) return NextResponse.json({ erro: "Cupão não encontrado ou já utilizado." }, { status: 404 });
  if (cupao.expira_em && new Date(cupao.expira_em) < new Date()) {
    return NextResponse.json({ erro: "Este cupão expirou." }, { status: 409 });
  }

  const agora = new Date();
  const fim = fimDaConcessao(cupao.meses, agora);

  // 1) Entregar o prémio PRIMEIRO. Se falhar, o cupão continua disponível e
  //    o utilizador pode tentar de novo — que é exatamente o que não
  //    acontecia antes.
  //
  // `onConflict: "cupao_id"` e não `"user_id"`: `user_id` não tem constraint
  // única (só um índice normal), e o PostgreSQL recusa um ON CONFLICT sem
  // restrição correspondente — era isto que fazia TODA a ativação dar 500.
  // `cupao_id` é também a chave certa em substância: ativar o mesmo cupão
  // duas vezes não pode gerar duas concessões, e quem já paga por Stripe não
  // perde a linha da subscrição ao resgatar um prémio.
  //
  // `concessao_termina_em` é o que faz isto acabar. Sem provedor não há
  // webhook a mudar o `status`, e sem esta data a concessão era Plus eterno.
  const { error: errSub } = await sb.from("subscriptions").upsert(
    {
      user_id: userId,
      cupao_id: cupaoId,
      status: "active",
      intervalo: "monthly",
      inicio: agora.toISOString(),
      concessao_termina_em: fim.toISOString(),
    },
    { onConflict: "cupao_id" },
  );
  if (errSub) {
    return NextResponse.json(
      { erro: "Não foi possível ativar o plano. O cupão continua disponível — tenta de novo." },
      { status: 500 },
    );
  }

  // 2) Só agora se queima o cupão. A condição `estado = disponivel` no
  //    próprio UPDATE evita que dois pedidos simultâneos o usem duas vezes.
  const { data: marcado, error: errUpdate } = await sb
    .from("quiz_cupoes")
    .update({ estado: "ativado", ativado_em: agora.toISOString() })
    .eq("id", cupaoId)
    .eq("user_id", userId)
    .eq("estado", "disponivel")
    .select("id");

  if (errUpdate) return NextResponse.json({ erro: errUpdate.message }, { status: 500 });
  if (!marcado || marcado.length === 0) {
    return NextResponse.json({ erro: "Cupão já utilizado." }, { status: 409 });
  }

  return NextResponse.json({ ok: true, ativoAte: fim.toISOString() });
}
