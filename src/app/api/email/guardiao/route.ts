// ═══════════════════════════════════════════════════════════════════════
//  GUARDIÃO FISCAL — o aviso do limite de isenção de IVA
//  ---------------------------------------------------------------------
//  ⚠️ ESTA ROTA NUNCA TINHA CORRIDO EM PRODUÇÃO.
//
//  Existia desde a migração 007, com tabela de idempotência, paginação,
//  confirmação de plano e um template de email escrito. E era `POST`, sem
//  entrada nenhuma em `vercel.json`. Os Cron Jobs do Vercel fazem GET e só
//  GET: nem chamavam esta rota, nem podiam. Nada falhava — simplesmente
//  nada acontecia, e a funcionalidade que o Plus vende («avisamos-te antes
//  de passares o limite») nunca avisou ninguém.
//
//  Duas correções, e as duas são precisas:
//    · um handler GET (o POST fica, para quem a chame à mão);
//    · a entrada em `vercel.json`, sem a qual continuava a não correr.
//
//  ── E passa a acender o sino ───────────────────────────────────────
//
//  Só saía por email. Quem tivesse os avisos filtrados, ou lesse no
//  telemóvel e arquivasse, ficava sem nada — e voltava ao painel sem
//  encontrar em lado nenhum a informação que o produto lhe tinha mandado.
//
//  O sino recebe o mesmo aviso, pela porta única (`avisar_utilizador_uma_vez`),
//  com a mesma garantia de não repetir: uma chave por ano e por nível. É o
//  primeiro tipo de aviso deste produto que não depende de haver um
//  contabilista do outro lado — ou seja, o primeiro que interessa à
//  generalidade de quem cá está.
// ═══════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { enviarEmail } from "@/lib/email/send";
import { emailGuardiaoFiscal, URL_GERIR_AVISOS, type NivelGuardiao } from "@/lib/email/templates";
import { IVA_ISENCAO_LIMITE } from "@/lib/fiscal-data";
import { cronAutorizado } from "@/lib/cron-auth";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { concedePlus, type OrigemConcessao } from "@/lib/stripe/precos-autorizados";
import { chaveGuardiao } from "@/lib/notificacoes/catalogo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
  //
  // A decisão de QUEM está num patamar deixou de exigir email: o sino avisa
  // toda a gente que lá esteja, e o email só quem tem endereço. Eram a mesma
  // lista, e isso significava que uma conta sem email em `profiles` não
  // recebia aviso nenhum — nem o que não precisa de email nenhum.
  const noPatamar = userIds.flatMap((userId) => {
    const total = billed.get(userId) ?? 0;
    const ratio = total / LIMIT;
    // Quem entra já acima do limite não deve receber, nos crons seguintes,
    // alertas progressivamente menos graves.
    const threshold = THRESHOLDS.find((item) => ratio >= item.ratio);
    if (!threshold) return [];
    return [{ userId, total, ratio, nivel: threshold.nivel }];
  });

  // ── O sino ────────────────────────────────────────────────────────
  //
  // Antes do email, e independente dele. A deduplicação é da base de
  // dados (`chave` única por conta) e não desta lista: o cron corre todos
  // os dias e a mesma pessoa continua acima de 80% todos os dias.
  //
  // Uma falha aqui não pode impedir o email — são dois canais, e o que
  // interessa é que pelo menos um chegue. Fica registada e segue.
  let acesos = 0;
  for (const lote of emPedacos(noPatamar, ENVIOS_EM_PARALELO)) {
    const resultados = await Promise.all(lote.map(async (item) => {
      const pct = Math.round(item.ratio * 100);
      const { data, error } = await sb.rpc("avisar_utilizador_uma_vez", {
        p_destino: item.userId,
        p_tipo: "guardiao_iva",
        p_titulo: item.nivel === "ultrapassado"
          ? "Passaste o limite de isenção de IVA"
          : `Já faturaste ${pct}% do limite de isenção de IVA`,
        p_corpo: item.nivel === "ultrapassado"
          ? "A isenção termina. Altera o regime no Portal das Finanças para não levares coima."
          : `Faltam ${Math.max(0, LIMIT - item.total).toLocaleString("pt-PT", {
              style: "currency", currency: "EUR", maximumFractionDigits: 0,
            })} para o limite.`,
        p_url: "/dashboard",
        p_chave: chaveGuardiao(year, item.nivel),
      });
      if (error) {
        console.error("[email/guardiao] sino:", error.message);
        return false;
      }
      return data === true;
    }));
    acesos += resultados.filter(Boolean).length;
  }

  // ── O email ───────────────────────────────────────────────────────
  //
  // Esta rota não passa pela fila de `notificacoes` — tem template próprio
  // e livro de registo próprio (`alertas_guardiao`) —, por isso o gatilho
  // que respeita a preferência de email não a apanha. Pergunta-se aqui, em
  // lote: uma consulta por pessoa num cron de mil seriam mil consultas.
  //
  // Falhar a pergunta NÃO é «manda a toda a gente»: um erro que resulta em
  // email para quem o desligou é o pior lado por onde errar, e é o que
  // leva ao botão de spam. Sem resposta, este ciclo não manda email
  // nenhum — o sino já acendeu, e amanhã tenta outra vez.
  const { data: optIn, error: erroOptIn } = await sb.rpc("contas_com_avisos_por_email", {
    p_users: noPatamar.map((i) => i.userId),
  });
  if (erroOptIn) {
    console.error("[email/guardiao] preferências:", erroOptIn.message);
    return NextResponse.json({
      erro: "Não foi possível confirmar quem quer avisos por email.",
      acesos, noPatamar: noPatamar.length, enviados: 0,
    }, { status: 503 });
  }
  const podeReceberEmail = new Set(
    ((optIn ?? []) as { user_id: string }[]).map((r) => r.user_id),
  );

  const porEnviar = noPatamar.flatMap((item) => {
    const email = emails.get(item.userId);
    if (!email) return [];
    if (!podeReceberEmail.has(item.userId)) return [];
    if (alreadySent.has(`${item.userId}:${item.nivel}`)) return [];
    return [{ ...item, email }];
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

  // Contagens, nunca destinatários: isto fica nos registos da Vercel.
  console.info("[email/guardiao]", {
    processados: userIds.length, noPatamar: noPatamar.length,
    acesos, enviados: records.length, ano: year,
  });
  return NextResponse.json({
    enviados: records.length,
    acesos,
    noPatamar: noPatamar.length,
    utilizadoresProcessados: userIds.length,
    ano: year,
  });
}

/**
 * O Cron Job do Vercel faz GET, e só GET.
 *
 * Era esta a razão de a rota nunca ter corrido: estava só em `POST`, e
 * portanto não havia agendamento possível — nem sequer um que falhasse de
 * forma visível. O corpo é o mesmo; o `POST` fica para quem a dispare à
 * mão a partir de um terminal.
 */
export async function GET(req: NextRequest) {
  return POST(req);
}
