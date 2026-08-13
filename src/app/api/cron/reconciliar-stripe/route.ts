import { NextRequest, NextResponse } from "next/server";
import { cronAutorizado } from "@/lib/cron-auth";
import { getStripe } from "@/lib/stripe/server";
import { revokeRefundedCharge, syncCheckoutSession, syncSubscription } from "@/lib/billing/projection";
import { resolverPrecoCheckout } from "@/lib/billing/prices";

export const runtime = "nodejs";
export const maxDuration = 60;

const CONCURRENCY = 10;

// A janela de 48 horas de antes só perdoava uma indisponibilidade curta. Uma
// campanha de 1000 lugares, um webhook em dead-letter ou um fim de semana mau
// deixavam um pagamento vitalício sem acesso e sem ninguém a dar por isso.
// Trinta dias, corridos todos os dias, cobrem qualquer um desses casos.
const JANELA_DIAS = 30;

// O cron tem 60 segundos. Em vez de arriscar ser cortado a meio — e perder o
// trabalho já feito sem o registar — pára sozinho antes disso e deixa o resto
// para a corrida seguinte, que volta a varrer a mesma janela.
const ORCAMENTO_MS = 45_000;

export async function GET(req: NextRequest) {
  if (!cronAutorizado(req)) return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  const stripe = getStripe();
  const inicio = Date.now();
  const expirou = () => Date.now() - inicio > ORCAMENTO_MS;
  const desde = Math.floor(Date.now() / 1000) - JANELA_DIAS * 86_400;

  let subscriptions = 0;
  let lifetimeSessions = 0;
  let refunds = 0;
  let truncado = false;
  const errors: string[] = [];

  const emLotes = async <T>(items: readonly T[], run: (item: T) => Promise<void>): Promise<void> => {
    for (let index = 0; index < items.length; index += CONCURRENCY) {
      if (expirou()) { truncado = true; return; }
      await Promise.all(items.slice(index, index + CONCURRENCY).map(run));
    }
  };

  // Percorre uma lista da Stripe até ao fim, sem tecto artificial: o que trava
  // é o orçamento de tempo, não um número escolhido à sorte.
  const percorrer = async <T extends { id: string }>(
    pagina: AsyncIterable<T>,
    aceita: (item: T) => boolean,
    trata: (item: T) => Promise<void>,
    etiqueta: string,
  ): Promise<void> => {
    let lote: T[] = [];
    for await (const item of pagina) {
      if (expirou()) { truncado = true; break; }
      if (!aceita(item)) continue;
      lote.push(item);
      if (lote.length >= CONCURRENCY) {
        await Promise.all(lote.map(async (each) => {
          try { await trata(each); } catch (error) {
            errors.push(`${etiqueta}:${each.id}:${error instanceof Error ? error.message : String(error)}`);
          }
        }));
        lote = [];
      }
    }
    if (lote.length) {
      await Promise.all(lote.map(async (each) => {
        try { await trata(each); } catch (error) {
          errors.push(`${etiqueta}:${each.id}:${error instanceof Error ? error.message : String(error)}`);
        }
      }));
    }
  };

  // Preenche o catálogo de preços antes de tudo o resto. Enquanto estiver
  // vazio, o Postgres não consegue distinguir um preço autorizado de outro
  // qualquer e a migração corre em modo de arranque. Resolver as duas
  // lookup keys valida-as na Stripe e grava-as, fechando esse modo.
  await Promise.all((["mensal", "vitalicio"] as const).map(async (modalidade) => {
    try {
      await resolverPrecoCheckout(modalidade);
    } catch (error) {
      errors.push(`preco:${modalidade}:${error instanceof Error ? error.message : String(error)}`);
    }
  }));

  await percorrer(
    stripe.subscriptions.list({ status: "all", limit: 100 }),
    () => true,
    async (subscription) => { await syncSubscription(subscription.id); subscriptions += 1; },
    "subscription",
  );

  await percorrer(
    stripe.checkout.sessions.list({ created: { gte: desde }, limit: 100 }),
    (session) => session.mode === "payment" && session.payment_status === "paid",
    async (session) => { await syncCheckoutSession(session.id); lifetimeSessions += 1; },
    "checkout",
  );

  // Os reembolsos vitalícios não passavam por aqui. Um `charge.refunded`
  // perdido deixava alguém reembolsado e com o Plus de pé — e a purga dos
  // dados por agendar. `revokeRefundedCharge` lê o estado atual da Stripe,
  // por isso repetir sobre uma cobrança já tratada não faz mal nenhum.
  await percorrer(
    stripe.charges.list({ created: { gte: desde }, limit: 100 }),
    (charge) => charge.refunded || charge.amount_refunded > 0,
    async (charge) => { await revokeRefundedCharge(charge); refunds += 1; },
    "refund",
  );

  const resumo = { subscriptions, lifetimeSessions, refunds, truncado, errors: errors.length };
  if (errors.length) {
    console.error("[cron/reconciliar-stripe]", errors.slice(0, 20));
    return NextResponse.json(resumo, { status: 503 });
  }
  if (truncado) console.warn("[cron/reconciliar-stripe] orçamento esgotado; a corrida seguinte continua.");
  return NextResponse.json(resumo);
}
