// ═══════════════════════════════════════════════════════════════════════
//  /api/contabilistas/stripe — a conta de recebimentos do contabilista
//  ---------------------------------------------------------------------
//  GET   → o estado da conta (existe? já pode cobrar? o que falta?)
//  POST  → cria a conta se não existir e devolve o link de onboarding
//  PUT   → devolve o link do painel Stripe de quem já está pronto
//
//  Tudo com a chave de serviço, e tudo depois de `contabilistaAprovadoDoPedido`.
//  A tabela `contabilista_stripe` não tem política de escrita nenhuma: quem
//  escreve é isto e o webhook, e mais ninguém. É a lição da migração 024 —
//  validar quem pede não chega, é preciso validar o que é escrito.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import {
  supabaseServico,
  utilizadorDoPedido,
  contabilistaAprovadoDoPedido,
} from "@/lib/contabilistas/servidor";
import { stripeConfigurado } from "@/lib/stripe/server";
import {
  criarContaConnect, lerEstadoDaConta, linkDeOnboarding, linkDoPainelStripe,
} from "@/lib/stripe/connect";
import { getStripe } from "@/lib/stripe/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ficha {
  user_id: string;
  nome: string;
  email_contacto: string | null;
}

async function contexto(req: Request) {
  const userId = await utilizadorDoPedido(req);
  if (!userId) return { erro: NextResponse.json({ erro: "Não autenticado." }, { status: 401 }) };

  if (!stripeConfigurado()) {
    return { erro: NextResponse.json({ erro: "Pagamentos indisponíveis." }, { status: 503 }) };
  }

  const sb = supabaseServico();
  if (!sb) return { erro: NextResponse.json({ erro: "Serviço indisponível." }, { status: 503 }) };

  const cc = await contabilistaAprovadoDoPedido(sb, userId);
  if (!cc) return { erro: NextResponse.json({ erro: "Sem autorização." }, { status: 403 }) };

  return { userId, sb };
}

/** O que já sabemos da conta, sem falar com a Stripe. */
export async function GET(req: Request) {
  const ctx = await contexto(req);
  if ("erro" in ctx) return ctx.erro;
  const { sb, userId } = ctx;

  const { data } = await sb
    .from("contabilista_stripe")
    .select("stripe_account_id, charges_enabled, payouts_enabled, details_submitted, requisitos")
    .eq("contabilista_id", userId)
    .maybeSingle();

  if (!data) return NextResponse.json({ ligada: false });

  return NextResponse.json({
    ligada: true,
    podeCobrar: Boolean(data.charges_enabled),
    podeReceber: Boolean(data.payouts_enabled),
    dadosSubmetidos: Boolean(data.details_submitted),
    requisitos: (data.requisitos as string[]) ?? [],
  });
}

/** Criar a conta (se ainda não existir) e abrir o onboarding. */
export async function POST(req: Request) {
  const ctx = await contexto(req);
  if ("erro" in ctx) return ctx.erro;
  const { sb, userId } = ctx;

  const limite = rateLimit(`stripe:onboarding:${userId}:${clientIp(req)}`, 10, 60_000);
  if (!limite.ok) {
    return NextResponse.json(
      { erro: "Demasiados pedidos. Tenta daqui a pouco." },
      { status: 429, headers: { "Retry-After": String(limite.retryAfter) } },
    );
  }

  const { data: existente } = await sb
    .from("contabilista_stripe")
    .select("stripe_account_id")
    .eq("contabilista_id", userId)
    .maybeSingle();

  let accountId = existente?.stripe_account_id as string | undefined;

  if (!accountId) {
    const { data: ficha } = await sb
      .from("contabilistas")
      .select("user_id, nome, email_contacto")
      .eq("user_id", userId)
      .maybeSingle<Ficha>();

    if (!ficha) return NextResponse.json({ erro: "Ficha não encontrada." }, { status: 404 });

    try {
      const conta = await criarContaConnect({
        email: ficha.email_contacto,
        nome: ficha.nome,
        contabilistaId: userId,
      });
      accountId = conta.id;

      const estado = lerEstadoDaConta(conta);
      // `upsert` e não `insert`: dois cliques seguidos não podem deixar uma
      // conta Stripe órfã sem linha que a aponte.
      const { error } = await sb.from("contabilista_stripe").upsert(
        {
          contabilista_id: userId,
          stripe_account_id: estado.stripeAccountId,
          charges_enabled: estado.chargesEnabled,
          payouts_enabled: estado.payoutsEnabled,
          details_submitted: estado.detailsSubmitted,
          requisitos: estado.requisitos,
        },
        { onConflict: "contabilista_id" },
      );
      if (error) throw new Error(error.message);
    } catch (e) {
      return NextResponse.json(
        { erro: e instanceof Error ? e.message : "Não foi possível criar a conta." },
        { status: 502 },
      );
    }
  }

  try {
    const url = await linkDeOnboarding(accountId);
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json(
      { erro: e instanceof Error ? e.message : "Não foi possível abrir o formulário." },
      { status: 502 },
    );
  }
}

/**
 * O painel Stripe de quem já está ligado, e a sincronização do estado.
 *
 * O webhook `account.updated` é a fonte normal, mas quem acaba de voltar do
 * onboarding quer ver o resultado já. Uma leitura à Stripe aqui evita a
 * pessoa ficar a olhar para «em análise» quando já pode cobrar.
 */
export async function PUT(req: Request) {
  const ctx = await contexto(req);
  if ("erro" in ctx) return ctx.erro;
  const { sb, userId } = ctx;

  const { data } = await sb
    .from("contabilista_stripe")
    .select("stripe_account_id")
    .eq("contabilista_id", userId)
    .maybeSingle();

  const accountId = data?.stripe_account_id as string | undefined;
  if (!accountId) return NextResponse.json({ erro: "Conta não ligada." }, { status: 404 });

  try {
    const conta = await getStripe().accounts.retrieve(accountId);
    const estado = lerEstadoDaConta(conta);

    await sb
      .from("contabilista_stripe")
      .update({
        charges_enabled: estado.chargesEnabled,
        payouts_enabled: estado.payoutsEnabled,
        details_submitted: estado.detailsSubmitted,
        requisitos: estado.requisitos,
        atualizado_em: new Date().toISOString(),
      })
      .eq("contabilista_id", userId);

    // Só quem já submeteu tem painel para abrir. Antes disso o link da
    // Stripe devolve erro, e mostrar esse erro seria culpar a pessoa por
    // não ter acabado um formulário que ainda está a preencher.
    const url = estado.detailsSubmitted ? await linkDoPainelStripe(accountId) : null;

    return NextResponse.json({
      podeCobrar: estado.chargesEnabled,
      podeReceber: estado.payoutsEnabled,
      dadosSubmetidos: estado.detailsSubmitted,
      requisitos: estado.requisitos,
      url,
    });
  } catch (e) {
    return NextResponse.json(
      { erro: e instanceof Error ? e.message : "Não foi possível sincronizar." },
      { status: 502 },
    );
  }
}
