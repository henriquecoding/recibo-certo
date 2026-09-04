// ═══════════════════════════════════════════════════════════════════════
//  PEDIR ELEMENTOS A PARTIR DE UMA LIGAÇÃO (D3)
//  ---------------------------------------------------------------------
//  Quem abre uma ligação não tem conta. Para poder devolver trabalho — que
//  é o que faz do motor um motor e não uma exportação — precisa de um
//  caminho de escrita, e esse caminho tem de ser estreito:
//
//   · exige o TOKEN outra vez, e o token só existe em quem tem a ligação;
//   · UM pedido por ligação. É a recomendação do §14.5, e existe para uma
//     ligação partilhada não virar um canal de mensagens sem remetente;
//   · o `contabilista_id` fica NULO — não sabemos quem é, e a copy do lado
//     do cliente diz exatamente isso;
//   · o texto de cada item é imutável depois de escrito (gatilho na base).
// ═══════════════════════════════════════════════════════════════════════

import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIMITE = 5;
const JANELA_MS = 60_000;

interface ItemDoPedido {
  texto?: unknown;
  origem?: unknown;
  item_id?: unknown;
  prazo?: unknown;
  nota?: unknown;
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limite = rateLimit(`dossie:pedir:${ip}`, LIMITE, JANELA_MS);
  if (!limite.ok) {
    return NextResponse.json(
      { erro: "Demasiados pedidos. Espera um pouco." },
      { status: 429, headers: { "retry-after": String(limite.retryAfter) } },
    );
  }

  let corpo: { id?: unknown; token?: unknown; itens?: unknown };
  try {
    corpo = (await req.json()) as typeof corpo;
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }

  const id = typeof corpo.id === "string" ? corpo.id : "";
  const token = typeof corpo.token === "string" ? corpo.token : "";
  const itens = Array.isArray(corpo.itens) ? (corpo.itens as ItemDoPedido[]) : [];
  if (!UUID.test(id) || token.length < 20 || itens.length === 0 || itens.length > 60) {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }

  const sb = supabaseAdmin();
  if (!sb) return NextResponse.json({ erro: "Serviço indisponível." }, { status: 503 });

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data: ligacao } = await sb
    .from("dossie_ligacoes")
    .select("id, guia_slug, impressao, revogada_em, expira_em")
    .eq("id", id)
    .eq("token_hash", tokenHash)
    .maybeSingle();

  const l = ligacao as {
    id: string; guia_slug: string; impressao: string;
    revogada_em: string | null; expira_em: string;
  } | null;

  if (!l || l.revogada_em || new Date(l.expira_em).getTime() <= Date.now()) {
    return NextResponse.json({ erro: "Esta ligação já não está ativa." }, { status: 404 });
  }

  // Um pedido por ligação. Não é um limite técnico — é a fronteira que
  // impede uma ligação de leitura de se transformar num canal aberto.
  const { count } = await sb
    .from("dossie_pedidos")
    .select("id", { count: "exact", head: true })
    .eq("ligacao_id", l.id);
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { erro: "Já foi enviado um pedido a partir desta ligação." },
      { status: 409 },
    );
  }

  const { data, error } = await sb.rpc("criar_pedido_de_elementos", {
    p_origem: "ligacao",
    p_origem_id: l.id,
    p_guia_slug: l.guia_slug,
    p_impressao: l.impressao,
    p_itens: itens.slice(0, 60).map((i) => ({
      texto: String(i.texto ?? "").slice(0, 400),
      origem: i.origem === "profissional" ? "profissional" : "guia",
      item_id: typeof i.item_id === "string" ? i.item_id : null,
      prazo: typeof i.prazo === "string" ? i.prazo : "",
      nota: typeof i.nota === "string" ? i.nota.slice(0, 400) : null,
    })),
  });

  if (error) return NextResponse.json({ erro: "Não foi possível enviar o pedido." }, { status: 500 });

  const r = (data ?? {}) as { ok?: boolean; pedido_id?: string; motivo?: string };
  if (!r.ok) return NextResponse.json({ erro: "Não foi possível enviar o pedido." }, { status: 400 });

  await sb.from("dossie_acessos").insert({ ligacao_id: l.id, acao: "pedido" });

  return NextResponse.json({ ok: true, id: r.pedido_id });
}
