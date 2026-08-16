// ═══════════════════════════════════════════════════════════════════════
//  POST /api/contabilistas/desbloqueio — comprar o próximo patamar
//  ---------------------------------------------------------------------
//  Esta é a ÚNICA cobrança do painel onde a plataforma é o comerciante:
//  o serviço é dela. Não passa por Connect e não tem `application_fee`.
//
//  A máquina de decisão já existia em SQL desde a migração
//  `20260815233000` e não se reescreve aqui:
//
//    `criar_intencao_desbloqueio` — escolhe o alvo (§68: só o PRÓXIMO
//      patamar), calcula o desconto por créditos, reserva os créditos no
//      ledger e devolve a intenção. O browser não escolhe patamar nem
//      preço, e é isso que a §72 exige.
//
//    `aplicar_compra_patamar` — chamada pelo webhook. Trata o caso §70: se
//      o XP alcançou o patamar durante o checkout, marca `needs_refund` e
//      NUNCA transfere o pagamento para o patamar seguinte.
//
//  Aqui só se junta a Stripe ao meio.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import {
  supabaseServico,
  utilizadorDoPedido,
  contabilistaAprovadoDoPedido,
} from "@/lib/contabilistas/servidor";
import { stripeConfigurado } from "@/lib/stripe/server";
import { checkoutDoDesbloqueio } from "@/lib/stripe/connect";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MOTIVO: Record<string, string> = {
  sem_permissao: "Sem autorização.",
  compra_indisponivel: "O desbloqueio pago ainda não está disponível.",
  sem_patamar_seguinte: "Já estás no patamar mais alto.",
  compra_em_curso: "Já tens uma compra a decorrer. Termina-a ou espera que expire.",
};

export async function POST(req: Request) {
  const userId = await utilizadorDoPedido(req);
  if (!userId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  if (!stripeConfigurado()) {
    return NextResponse.json({ erro: "Pagamentos indisponíveis." }, { status: 503 });
  }

  const limite = rateLimit(`desbloqueio:${userId}:${clientIp(req)}`, 8, 60_000);
  if (!limite.ok) {
    return NextResponse.json(
      { erro: "Demasiados pedidos. Tenta daqui a pouco." },
      { status: 429, headers: { "Retry-After": String(limite.retryAfter) } },
    );
  }

  const sb = supabaseServico();
  if (!sb) return NextResponse.json({ erro: "Serviço indisponível." }, { status: 503 });

  const cc = await contabilistaAprovadoDoPedido(sb, userId);
  if (!cc) return NextResponse.json({ erro: "Sem autorização." }, { status: 403 });

  let corpo: { creditos?: number };
  try {
    corpo = await req.json();
  } catch {
    corpo = {};
  }

  // ── 1. A intenção. Quem escolhe o alvo e o preço é o SQL.
  //
  // A RPC corre com a identidade de quem chama (`auth.uid()`), por isso
  // usa-se o cliente com o token do pedido e não a chave de serviço.
  const { criarIntencaoComoUtilizador } = await import("@/lib/contabilistas/servidor");
  const intencao = await criarIntencaoComoUtilizador(req, corpo.creditos ?? 0);

  if (intencao.erro) return NextResponse.json({ erro: intencao.erro }, { status: 500 });
  const r = intencao.dados;
  if (!r?.ok) {
    return NextResponse.json(
      { erro: MOTIVO[r?.motivo ?? ""] ?? "Não foi possível preparar a compra." },
      { status: 400 },
    );
  }

  // ── 2. O Checkout, na conta da plataforma.
  try {
    const { data: ficha } = await sb
      .from("contabilistas")
      .select("email_contacto")
      .eq("user_id", userId)
      .maybeSingle();

    const sessao = await checkoutDoDesbloqueio({
      compraId: r.compraId!,
      contabilistaId: userId,
      patamar: r.targetTier!,
      precoFinalCents: r.finalCents!,
      descontoPct: r.descontoPct ?? 0,
      email: (ficha?.email_contacto as string | null) ?? null,
    });

    const { error } = await sb.rpc("marcar_checkout_desbloqueio", {
      p_compra: r.compraId,
      p_sessao: sessao.id,
    });
    if (error) {
      return NextResponse.json(
        { erro: "Não foi possível registar a compra. Tenta outra vez." },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: sessao.url });
  } catch (e) {
    return NextResponse.json(
      { erro: e instanceof Error ? e.message : "Não foi possível abrir o pagamento." },
      { status: 502 },
    );
  }
}
