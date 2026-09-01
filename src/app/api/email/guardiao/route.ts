import { NextRequest, NextResponse } from "next/server";
import { enviarEmail } from "@/lib/email/send";
import { emailGuardiaoFiscal, URL_GERIR_AVISOS, type NivelGuardiao } from "@/lib/email/templates";
import { IVA_ISENCAO_LIMITE } from "@/lib/fiscal-data";
import { cronAutorizado } from "@/lib/cron-auth";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { concedePlus, type OrigemConcessao } from "@/lib/stripe/precos-autorizados";

const LIMIT = IVA_ISENCAO_LIMITE.value;
const THRESHOLDS: { nivel: NivelGuardiao; ratio: number }[] = [
  { nivel: "ultrapassado", ratio: 1 },
  { nivel: "critico", ratio: 0.95 },
  { nivel: "preparacao", ratio: 0.9 },
  { nivel: "aviso", ratio: 0.8 },
];

interface SubscriptionGrantRow {
  user_id: string;
  status: string;
  price_id: string | null;
  origem: OrigemConcessao | null;
  ls_subscription_id: string | null;
  stripe_payment_intent: string | null;
  concessao_termina_em: string | null;
  periodo_graca_termina_em: string | null;
  cupao_id: string | null;
  motivo: string | null;
  concedido_por: string | null;
}

// O Supabase devolve no máximo 1000 linhas por pedido. Sem paginar, uma base
// com mais recibos do que isso somava só uma parte da faturação — e o Guardião
// avisaria tarde, ou não avisaria de todo. É uma funcionalidade vendida no
// Plus: falhar em silêncio é o pior resultado possível.
const PAGINA = 1000;

// Um filtro `in(...)` com mil identificadores faz um URL enorme. Em lotes, a
// consulta mantém-se dentro de limites previsíveis.
const LOTE_IDS = 200;

const ENVIOS_EM_PARALELO = 5;

async function paginar<T>(
  consulta: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const todos: T[] = [];
  for (let inicio = 0; ; inicio += PAGINA) {
    const { data, error } = await consulta(inicio, inicio + PAGINA - 1);
    if (error) throw new Error(error.message);
    const lote = data ?? [];
    todos.push(...lote);
    if (lote.length < PAGINA) return todos;
  }
}

function emPedacos<T>(items: readonly T[], tamanho: number): T[][] {
  const pedacos: T[][] = [];
  for (let i = 0; i < items.length; i += tamanho) pedacos.push(items.slice(i, i + tamanho));
  return pedacos;
}

export async function POST(req: NextRequest) {
  if (!cronAutorizado(req)) return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ erro: "Supabase não configurado." }, { status: 500 });
  const year = new Date().getFullYear();

  let grants: SubscriptionGrantRow[];
  let prices: string[];
  try {
    const [grantRows, catalogRows] = await Promise.all([
      paginar<SubscriptionGrantRow>((de, ate) => sb.from("subscriptions").select(
        "id, user_id, status, price_id, origem, ls_subscription_id, stripe_payment_intent, "
        + "concessao_termina_em, periodo_graca_termina_em, cupao_id, motivo, concedido_por",
      ).in("status", ["active", "trialing", "past_due"]).order("id").range(de, ate) as never),
      paginar<{ stripe_price_id: string }>((de, ate) => sb.from("billing_price_catalog")
        .select("stripe_price_id").eq("concede_plus", true)
        .order("stripe_price_id").range(de, ate) as never),
    ]);
    grants = grantRows;
    prices = catalogRows.map((row) => row.stripe_price_id);
  } catch (error) {
    console.error("[email/guardiao] Falha ao confirmar subscrições:",
      error instanceof Error ? error.message : String(error));
    return NextResponse.json({ erro: "Não foi possível confirmar os planos." }, { status: 503 });
  }
  const userIds = [...new Set(grants.filter((row) => concedePlus({
    status: row.status as string,
    priceId: row.price_id as string | null,
    origem: row.origem as OrigemConcessao | null,
    lsSubscriptionId: row.ls_subscription_id as string | null,
    paymentIntent: row.stripe_payment_intent as string | null,
    terminaEm: row.concessao_termina_em as string | null,
    periodoGracaTerminaEm: row.periodo_graca_termina_em as string | null,
    cupaoId: row.cupao_id as string | null,
    motivo: row.motivo as string | null,
    concedidoPor: row.concedido_por as string | null,
  }, prices)).map((row) => row.user_id as string))];
  if (!userIds.length) return NextResponse.json({ msg: "Sem subscritores Plus ativos.", enviados: 0 });

  const receipts: { user_id: string; valor: number }[] = [];
  const previous: { user_id: string; nivel: string }[] = [];
  const profiles: { id: string; email: string | null }[] = [];
  try {
    for (const pedaco of emPedacos(userIds, LOTE_IDS)) {
      receipts.push(...await paginar<{ user_id: string; valor: number }>((de, ate) =>
        sb.from("recibos").select("id, user_id, valor").in("user_id", pedaco)
          .gte("data", `${year}-01-01`).lte("data", `${year}-12-31`)
          .order("id").range(de, ate) as never));
      previous.push(...await paginar<{ user_id: string; nivel: string }>((de, ate) =>
        sb.from("alertas_guardiao").select("id, user_id, nivel").in("user_id", pedaco)
          .eq("ano", year).order("id").range(de, ate) as never));
      profiles.push(...await paginar<{ id: string; email: string | null }>((de, ate) =>
        sb.from("profiles").select("id, email").in("id", pedaco)
          .order("id").range(de, ate) as never));
    }
  } catch (error) {
    console.error("[email/guardiao] Falha ao preparar alertas:",
      error instanceof Error ? error.message : String(error));
    return NextResponse.json({ erro: "Não foi possível preparar os alertas." }, { status: 503 });
  }
  if (!receipts.length) return NextResponse.json({ msg: "Sem recibos para processar.", enviados: 0 });

  const billed = new Map<string, number>();
  for (const receipt of receipts) {
    const id = receipt.user_id as string;
    billed.set(id, (billed.get(id) ?? 0) + Number(receipt.valor));
  }
  const alreadySent = new Set((previous ?? []).map((row) => `${row.user_id}:${row.nivel}`));
  const emails = new Map((profiles ?? []).filter((row) => row.email).map((row) => [row.id as string, row.email as string]));
  const records: { user_id: string; nivel: string; ano: number; faturado: number }[] = [];

  // Decidir primeiro, enviar depois: com mil subscritores, um envio de cada
  // vez não cabia no tempo do cron e os últimos da fila nunca chegavam a ser
  // avisados. A decisão continua igual — só o patamar atual mais alto, e nunca
  // um que já tenha sido enviado este ano.
  const porEnviar = userIds.flatMap((userId) => {
    const total = billed.get(userId) ?? 0;
    const email = emails.get(userId);
    if (!email) return [];
    const ratio = total / LIMIT;
    // Quem entra já acima do limite não deve receber, nos crons seguintes,
    // alertas progressivamente menos graves.
    const threshold = THRESHOLDS.find((item) => ratio >= item.ratio);
    if (!threshold) return [];
    if (alreadySent.has(`${userId}:${threshold.nivel}`)) return [];
    return [{ userId, email, total, ratio, nivel: threshold.nivel }];
  });

  for (const lote of emPedacos(porEnviar, ENVIOS_EM_PARALELO)) {
    const resultados = await Promise.all(lote.map(async (item) => {
      const template = emailGuardiaoFiscal({
        faturado: item.total,
        limite: LIMIT,
        restante: Math.max(0, LIMIT - item.total),
        percentagem: item.ratio,
        nivel: item.nivel,
      });
      const sent = await enviarEmail({
        to: item.email,
        ...template,
        idempotencyKey: `guardiao-${year}-${item.userId}-${item.nivel}`,
        // É um aviso que se subscreve: leva `List-Unsubscribe`, como o
        // Gmail e o Yahoo exigem a quem envia em volume.
        desinscrever: URL_GERIR_AVISOS,
      });
      return sent.erro ? null : {
        user_id: item.userId, nivel: item.nivel, ano: year, faturado: item.total,
      };
    }));
    for (const registo of resultados) if (registo) records.push(registo);
  }

  if (records.length) {
    const { error } = await sb.from("alertas_guardiao").upsert(records, {
      onConflict: "user_id,nivel,ano",
      ignoreDuplicates: true,
    });
    if (error) console.error("[email/guardiao] Emails enviados sem ledger local:", error.message);
  }
  return NextResponse.json({ enviados: records.length, utilizadoresProcessados: userIds.length, ano: year });
}
