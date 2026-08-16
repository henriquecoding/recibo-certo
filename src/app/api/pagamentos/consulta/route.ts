// ═══════════════════════════════════════════════════════════════════════
//  POST /api/pagamentos/consulta — o cliente paga o contabilista
//  ---------------------------------------------------------------------
//  O browser manda um id de agendamento e, se quiser, um id de benefício.
//  NÃO manda o valor. O preço nasce em `preparar_pagamento_consulta`, do
//  lado da base de dados, a partir do catálogo do contabilista ou do preço
//  real que ele fixou ao concluir a consulta.
//
//  Um preço que viajasse pelo browser era um preço editável no browser, e
//  a comissão calculada sobre ele era uma comissão editável no browser.
//
//  A cobrança é DIRETA: nasce na conta Stripe do contabilista, ele é o
//  comerciante, e a nossa comissão sai como `application_fee_amount`. Ver
//  `src/lib/stripe/connect.ts`.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { supabaseServico, utilizadorDoPedido } from "@/lib/contabilistas/servidor";
import { stripeConfigurado } from "@/lib/stripe/server";
import { checkoutDaConsulta } from "@/lib/stripe/connect";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** O que cada recusa da RPC quer dizer para quem está a pagar. */
const MOTIVO: Record<string, string> = {
  agendamento_inexistente: "Essa consulta já não existe.",
  nao_e_teu: "Essa consulta não é tua.",
  consulta_cancelada: "Essa consulta foi cancelada.",
  ja_pago: "Esta consulta já está paga.",
  contabilista_sem_pagamentos:
    "Este contabilista ainda não ativou os pagamentos pelo Recibo Certo. Combina com ele outra forma.",
  tipo_nao_cobra: "Este tipo de consulta não se paga por aqui.",
  sem_valor_a_cobrar: "Ainda não há valor definido para esta consulta.",
  nada_a_cobrar: "Não há nada a pagar nesta consulta.",
  cupao_invalido: "Esse benefício não é teu, ou já foi usado.",
  cupao_expirado: "Esse benefício já passou da validade.",
};

export async function POST(req: Request) {
  const userId = await utilizadorDoPedido(req);
  if (!userId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  if (!stripeConfigurado()) {
    return NextResponse.json({ erro: "Pagamentos indisponíveis." }, { status: 503 });
  }

  const limite = rateLimit(`pagamento:consulta:${userId}:${clientIp(req)}`, 12, 60_000);
  if (!limite.ok) {
    return NextResponse.json(
      { erro: "Demasiados pedidos. Tenta daqui a pouco." },
      { status: 429, headers: { "Retry-After": String(limite.retryAfter) } },
    );
  }

  let corpo: { agendamentoId?: string; cupaoId?: string | null };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }

  const agendamentoId = corpo.agendamentoId?.trim();
  if (!agendamentoId) {
    return NextResponse.json({ erro: "Falta a consulta." }, { status: 400 });
  }

  const sb = supabaseServico();
  if (!sb) return NextResponse.json({ erro: "Serviço indisponível." }, { status: 503 });

  // ── 1. O valor e a comissão nascem aqui.
  const { data, error } = await sb.rpc("preparar_pagamento_consulta", {
    p_cliente: userId,
    p_agendamento: agendamentoId,
    p_cupao: corpo.cupaoId ?? null,
  });
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  const r = (data ?? {}) as {
    ok?: boolean; motivo?: string;
    pagamentoId?: string; stripeAccountId?: string;
    liquidoCents?: number; comissaoCents?: number; descricao?: string;
  };
  if (!r.ok) {
    return NextResponse.json(
      { erro: MOTIVO[r.motivo ?? ""] ?? "Não foi possível preparar o pagamento." },
      { status: 400 },
    );
  }

  // ── 2. O nome do contabilista, para o cliente saber a quem paga.
  const { data: ag } = await sb
    .from("agendamentos")
    .select("contabilista_id")
    .eq("id", agendamentoId)
    .maybeSingle();
  const { data: ficha } = await sb
    .from("contabilistas")
    .select("nome")
    .eq("user_id", ag?.contabilista_id ?? "")
    .maybeSingle();

  // ── 3. O Checkout, na conta dele.
  try {
    const sessao = await checkoutDaConsulta({
      stripeAccountId: r.stripeAccountId!,
      pagamentoId: r.pagamentoId!,
      liquidoCents: r.liquidoCents!,
      comissaoCents: r.comissaoCents!,
      descricao: r.descricao ?? "Consulta",
      nomeContabilista: (ficha?.nome as string) ?? "o teu contabilista",
    });

    const { error: erroMarcar } = await sb.rpc("marcar_checkout_pagamento", {
      p_pagamento: r.pagamentoId,
      p_sessao: sessao.id,
    });
    // Falhar aqui é grave: a sessão existe na Stripe e nós não a sabemos
    // ligar a nada. Melhor recusar agora do que aceitar um pagamento que o
    // webhook não vai conseguir reconhecer.
    if (erroMarcar) {
      return NextResponse.json(
        { erro: "Não foi possível registar o pagamento. Tenta outra vez." },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: sessao.url });
  } catch (e) {
    // Falhar a criar a sessão deixa um pagamento pendente SEM sessão. Não
    // se encerra aqui: `preparar_pagamento_consulta` reaproveita esse lugar
    // na tentativa seguinte, e é isso que faz um segundo clique funcionar
    // em vez de chocar com o índice único.
    return NextResponse.json(
      { erro: e instanceof Error ? e.message : "Não foi possível abrir o pagamento." },
      { status: 502 },
    );
  }
}
