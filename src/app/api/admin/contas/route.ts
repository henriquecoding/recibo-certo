// ═══════════════════════════════════════════════════════════════════════
//  GET /api/admin/contas — a lista de contas, para administração
//  PATCH                 — promover ou despromover
//  ---------------------------------------------------------------------
//  DUAS REGRAS QUE GOVERNAM ESTE FICHEIRO
//
//  1. A guarda é do SERVIDOR. `pedidoDeAdmin` valida o token e confirma o
//     `role` na base de dados. O ecrã de administração também verifica,
//     mas isso é conveniência: quem chama a API não passa pelo ecrã.
//
//  2. NUNCA DEVOLVE CONTEÚDO FISCAL. Devolve identidade (email, nome),
//     estado da conta e CONTAGENS. A administração perdeu — de propósito,
//     na migração 038 — o acesso ao conteúdo de recibos, vencimentos e
//     cenários, porque a página de privacidade promete que só o dono lá
//     chega. Uma contagem serve para dar apoio; o conteúdo não é preciso
//     e não é nosso.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { pedidoDeAdmin, adminDoPedido } from "@/lib/supabase/verify-request-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return null;
  return createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface ContaAdmin {
  id: string;
  email: string;
  nome: string | null;
  role: "admin" | "user";
  criadoEm: string | null;
  ultimoAcesso: string | null;
  emailConfirmado: boolean;
  plano: "plus" | "free";
  origemPlus: string | null;
  /** Só contagens. Nunca conteúdo. */
  totais: { recibos: number; vencimentos: number; cenarios: number };
}

export interface AtoDeAdmin {
  id: string;
  ator_email: string | null;
  acao: string;
  alvo_email: string | null;
  detalhe: { de?: string | null; para?: string | null };
  criado_em: string;
}

export async function GET(req: NextRequest) {
  if (!(await pedidoDeAdmin(req))) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const sb = admin();
  if (!sb) return NextResponse.json({ erro: "Não configurado." }, { status: 503 });

  const { data: perfis, error } = await sb
    .from("profiles")
    .select("id, email, nome, role, criado_em")
    .order("criado_em", { ascending: false })
    .limit(500);
  if (error) {
    console.error("[admin/contas] perfis:", error.message);
    return NextResponse.json({ erro: "Falha ao ler contas." }, { status: 500 });
  }

  const ids = (perfis ?? []).map((p) => p.id as string);

  // Estado de autenticação (confirmação de email, último acesso) vive em
  // `auth.users` e só é alcançável pela API de administração.
  const estadoAuth = new Map<string, { ultimo: string | null; confirmado: boolean }>();
  try {
    const { data } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of data?.users ?? []) {
      estadoAuth.set(u.id, {
        ultimo: u.last_sign_in_at ?? null,
        confirmado: Boolean(u.email_confirmed_at ?? u.confirmed_at),
      });
    }
  } catch (e) {
    console.error("[admin/contas] listUsers:", e);
  }

  // As contagens vêm de `admin_totais_por_conta()` (migração 039), que soma
  // do lado do Postgres. Contá-las aqui obrigaria a TRAZER as linhas — e a
  // API corta em 1000 por omissão, pelo que as contagens ficavam erradas em
  // silêncio. Trazer conteúdo fiscal só para o contar também contrariava a
  // migração 038. A função devolve números e mais nada.
  const [subs, totais] = await Promise.all([
    sb.from("subscriptions").select("user_id, status, origem, concessao_termina_em").in("user_id", ids),
    sb.rpc("admin_totais_por_conta"),
  ]);

  if (totais.error) console.error("[admin/contas] totais:", totais.error.message);

  const porConta = new Map<string, { recibos: number; vencimentos: number; cenarios: number }>();
  for (const t of (totais.data ?? []) as {
    user_id: string; recibos: number; vencimentos: number; cenarios: number;
  }[]) {
    porConta.set(t.user_id, {
      recibos: Number(t.recibos) || 0,
      vencimentos: Number(t.vencimentos) || 0,
      cenarios: Number(t.cenarios) || 0,
    });
  }

  const ATIVOS = ["active", "trialing", "past_due"];
  const plusPor = new Map<string, string>();
  for (const s of (subs.data ?? []) as {
    user_id: string; status: string; origem: string | null; concessao_termina_em: string | null;
  }[]) {
    if (!ATIVOS.includes(s.status)) continue;
    if (s.concessao_termina_em && new Date(s.concessao_termina_em) <= new Date()) continue;
    plusPor.set(s.user_id, s.origem ?? "stripe");
  }

  const contas: ContaAdmin[] = (perfis ?? []).map((p) => {
    const id = p.id as string;
    const auth = estadoAuth.get(id);
    return {
      id,
      email: (p.email as string) ?? "—",
      nome: (p.nome as string) ?? null,
      role: ((p.role as string) === "admin" ? "admin" : "user"),
      criadoEm: (p.criado_em as string) ?? null,
      ultimoAcesso: auth?.ultimo ?? null,
      emailConfirmado: auth?.confirmado ?? false,
      plano: plusPor.has(id) ? "plus" : "free",
      origemPlus: plusPor.get(id) ?? null,
      totais: porConta.get(id) ?? { recibos: 0, vencimentos: 0, cenarios: 0 },
    };
  });

  const { data: registo } = await sb
    .from("admin_auditoria")
    .select("id, ator_email, acao, alvo_email, detalhe, criado_em")
    .order("criado_em", { ascending: false })
    .limit(50);

  return NextResponse.json({ contas, total: contas.length, registo: registo ?? [] });
}

export async function PATCH(req: NextRequest) {
  // Aqui interessa QUEM, não só «tinha autorização»: promover alguém a
  // administrador dá-lhe a lista de todas as contas, e um ato desses fica
  // registado com nome próprio.
  const ator = await adminDoPedido(req);
  if (!ator) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }
  const sb = admin();
  if (!sb) return NextResponse.json({ erro: "Não configurado." }, { status: 503 });

  const corpo = await req.json().catch(() => ({}));
  const id = String(corpo?.id ?? "");
  const role = String(corpo?.role ?? "");
  if (!id || (role !== "admin" && role !== "user")) {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }

  // Nunca deixar a base sem administração: despromover o último admin
  // trancava toda a gente fora do painel, sem caminho de volta pela app.
  if (role === "user") {
    const { count } = await sb
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { erro: "Esta é a última conta de administração. Promove outra antes de despromover esta." },
        { status: 409 },
      );
    }
  }

  const { data: antes } = await sb
    .from("profiles")
    .select("email, role")
    .eq("id", id)
    .maybeSingle();

  const { error } = await sb.from("profiles").update({ role }).eq("id", id);
  if (error) {
    console.error("[admin/contas] PATCH:", error.message);
    return NextResponse.json({ erro: "Não foi possível alterar o papel." }, { status: 500 });
  }

  // O registo é escrito DEPOIS da alteração, e a sua falha não desfaz nada:
  // um rasto perdido é mau, mas devolver erro numa alteração que já aconteceu
  // seria pior — deixaria o ecrã a mostrar o contrário do que está na base.
  const { error: erroReg } = await sb.from("admin_auditoria").insert({
    ator_id: ator.id,
    ator_email: ator.email,
    acao: role === "admin" ? "promover_admin" : "despromover_admin",
    alvo_id: id,
    alvo_email: (antes?.email as string) ?? null,
    detalhe: { de: (antes?.role as string) ?? null, para: role },
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  });
  if (erroReg) console.error("[admin/contas] auditoria:", erroReg.message);

  return NextResponse.json({ ok: true, id, role });
}
