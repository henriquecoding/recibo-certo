// ═══════════════════════════════════════════════════════════════════════
//  APAGAR OS MEUS DADOS — e, se for o caso, a minha conta
//  ---------------------------------------------------------------------
//  A regra que governa tudo: o `user_id` NUNCA vem do corpo do pedido.
//  Nem sequer é passado — `apagar_conjuntos` lê-o de `auth.uid()`, do lado
//  da base de dados. Uma rota que apaga não tem segunda oportunidade, e um
//  id vindo do cliente seria a maneira mais direta de dar a qualquer
//  pessoa autenticada o poder de apagar os dados de outra.
//
//  O que esta rota faz, e por esta ordem:
//
//    1. pergunta que ficheiros vão sair (depois de as linhas saírem, já
//       ninguém sabe a que vínculo pertenciam);
//    2. manda apagar as linhas — UMA transação, do lado da base de dados;
//    3. remove os ficheiros do armazenamento;
//    4. cancela a subscrição, se a conta vai sair;
//    5. apaga a conta, em último lugar.
//
//  A ordem não é arbitrária. A conta sai no fim para que, se alguma coisa
//  falhar antes, a pessoa ainda tenha por onde tentar outra vez. E a
//  subscrição é cancelada por nós: a versão anterior desta página dizia
//  «se tens uma subscrição ativa, cancela-a primeiro», o que era empurrar
//  para quem sai o trabalho de não continuar a ser cobrado.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse, type NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { confirmacaoValida, alvoPorId } from "@/lib/conta/apagar";
import { APAGAVEIS, conjuntoPorId } from "@/lib/conta/catalogo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function obterUtilizador(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const sb = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data } = await sb.auth.getUser();
  return data.user ? { user: data.user, sb } : null;
}

function admin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return null;
  return createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(req: NextRequest) {
  const sessao = await obterUtilizador(req);
  if (!sessao) {
    return NextResponse.json({ erro: "Autenticação necessária." }, { status: 401 });
  }
  const { user, sb: comoUtilizador } = sessao;

  const corpo = await req.json().catch(() => ({}));

  // A conta é o único alvo que continua a ser um alvo: apagar a conta não
  // é «apagar mais um conjunto», é sair. Tudo o resto passou a ser uma
  // escolha de conjuntos, que é o que a pessoa pediu para poder afinar.
  const apagarConta = corpo?.alvo === "conta";
  const escolhidos: string[] = apagarConta
    ? [...APAGAVEIS]
    : (Array.isArray(corpo?.conjuntos) ? corpo.conjuntos : [])
        .filter((c: unknown): c is string => typeof c === "string")
        .filter((c: string) => APAGAVEIS.includes(c));

  if (escolhidos.length === 0) {
    return NextResponse.json({ erro: "Escolhe pelo menos uma coisa para apagar." }, { status: 400 });
  }

  // A frase é validada AQUI também, e não só na interface: um pedido feito
  // fora do browser passaria por cima de qualquer confirmação visual.
  //
  // `selecao` e não `tudo`: pedir «apagar todos os dados» a quem escolheu
  // uma coisa era uma frase de confirmação que descrevia mal a ação.
  const alvo = alvoPorId(apagarConta ? "conta" : "selecao");
  if (!alvo || !confirmacaoValida(alvo, String(corpo?.confirmacao ?? ""))) {
    return NextResponse.json(
      { erro: "A confirmação não corresponde ao que foi pedido." },
      { status: 400 },
    );
  }

  const sb = admin();
  if (!sb) return NextResponse.json({ erro: "Serviço indisponível." }, { status: 503 });

  // ── 1. Os ficheiros, antes de as linhas saírem ───────────────────
  // Depois de o vínculo desaparecer não há como saber que caminhos lhe
  // pertenciam, e os bytes ficariam no armazenamento para sempre.
  const { data: ficheiros } = await comoUtilizador.rpc("ficheiros_do_utilizador", {
    p_conjuntos: escolhidos,
  });
  const aRemover = (ficheiros ?? []) as { balde: string; caminho: string }[];

  // ── 2. As linhas, numa transação ─────────────────────────────────
  const { data, error } = await comoUtilizador.rpc("apagar_conjuntos", {
    p_conjuntos: escolhidos,
  });
  if (error) {
    console.error("[conta/apagar] transação:", error.message);
    return NextResponse.json(
      { erro: "Não foi possível apagar. Nada foi perdido — a operação é uma só e reverteu." },
      { status: 500 },
    );
  }
  const r = (data ?? {}) as { ok?: boolean; motivo?: string; linhas?: Record<string, number> };
  if (!r.ok) {
    return NextResponse.json({ erro: "Não foi possível apagar." }, { status: 409 });
  }

  // ── 3. Os ficheiros ──────────────────────────────────────────────
  const porBalde = new Map<string, string[]>();
  for (const f of aRemover) {
    porBalde.set(f.balde, [...(porBalde.get(f.balde) ?? []), f.caminho]);
  }
  let ficheirosRemovidos = 0;
  for (const [balde, caminhos] of porBalde) {
    for (let i = 0; i < caminhos.length; i += 100) {
      const lote = caminhos.slice(i, i + 100);
      const { error: erroFich } = await sb.storage.from(balde).remove(lote);
      // As linhas já saíram. Falhar aqui não desfaz nada e não pode
      // transformar um apagamento feito numa resposta de erro — fica no
      // registo, e a varredura de órfãos apanha o que sobrar.
      if (erroFich) console.error("[conta/apagar] ficheiros:", balde, erroFich.message);
      else ficheirosRemovidos += lote.length;
    }
  }

  if (!apagarConta) {
    console.info("[conta/apagar] conjuntos:", {
      quantos: escolhidos.length, ficheiros: ficheirosRemovidos,
    });
    return NextResponse.json({
      ok: true,
      conjuntos: escolhidos,
      linhas: r.linhas ?? {},
      ficheiros: ficheirosRemovidos,
    });
  }

  // ── 4. A subscrição ──────────────────────────────────────────────
  const subscricao = await cancelarSubscricao(sb, user.id);

  // ── 5. A conta, em último lugar ──────────────────────────────────
  const { error: erroConta } = await sb.auth.admin.deleteUser(user.id);
  if (erroConta) {
    console.error("[conta/apagar] conta:", erroConta.message);
    return NextResponse.json(
      {
        erro: "Os dados foram apagados, mas a conta não. Escreve-nos e removemo-la.",
        linhas: r.linhas ?? {},
      },
      { status: 500 },
    );
  }

  console.info("[conta/apagar] conta apagada:", {
    ficheiros: ficheirosRemovidos, subscricao,
  });
  return NextResponse.json({
    ok: true,
    conta: true,
    linhas: r.linhas ?? {},
    ficheiros: ficheirosRemovidos,
    subscricao,
  });
}

/**
 * Cancela a subscrição, se houver.
 *
 * Idempotente por construção: cancelar uma subscrição já cancelada é uma
 * resposta do fornecedor a dizer que já está, e não um erro. Nunca lança —
 * uma falha aqui não pode impedir alguém de sair.
 */
async function cancelarSubscricao(sb: SupabaseClient, userId: string): Promise<string> {
  try {
    const { data } = await sb
      .from("subscriptions")
      .select("stripe_subscription_id, status")
      .eq("user_id", userId)
      .maybeSingle();

    const id = data?.stripe_subscription_id as string | undefined;
    if (!id) return "sem_subscricao";
    if (data?.status === "canceled") return "ja_cancelada";
    if (!process.env.STRIPE_SECRET_KEY) return "sem_stripe";

    const { getStripe } = await import("@/lib/stripe/server");
    await getStripe().subscriptions.cancel(id);
    return "cancelada";
  } catch (e) {
    const msg = (e as Error).message;
    // «No such subscription» é a resposta a cancelar o que já não existe.
    if (/No such subscription/i.test(msg)) return "ja_nao_existia";
    console.error("[conta/apagar] subscrição:", msg);
    return "falhou";
  }
}

/** O inventário: o que existe, para a pessoa escolher com o que existe à frente. */
export async function GET(req: NextRequest) {
  const sessao = await obterUtilizador(req);
  if (!sessao) {
    return NextResponse.json({ erro: "Autenticação necessária." }, { status: 401 });
  }

  const { data, error } = await sessao.sb.rpc("inventario_do_utilizador");
  if (error) {
    console.error("[conta/apagar] inventário:", error.message);
    return NextResponse.json({ erro: "Não foi possível ler o inventário." }, { status: 500 });
  }

  const inventario = (data ?? {}) as Record<string, number>;
  // Só o que o catálogo conhece: uma chave a mais aqui seria uma linha a
  // mais na interface, sem título nem descrição.
  const limpo: Record<string, number> = {};
  for (const [id, n] of Object.entries(inventario)) {
    if (conjuntoPorId(id)) limpo[id] = n;
  }
  return NextResponse.json({ inventario: limpo });
}
