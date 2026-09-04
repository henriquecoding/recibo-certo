// ═══════════════════════════════════════════════════════════════════════
//  ABRIR UM DOSSIÊ POR LIGAÇÃO (D3) — a única porta pública
//  ---------------------------------------------------------------------
//  `dossie_ligacoes` tem RLS ligado e NENHUMA política para `anon`. Com RLS
//  ligado e sem política não há caminho — é a doutrina de `partner_events`,
//  e é o que distingue uma garantia de um `USING` bem escrito. Um `USING`
//  abre-se um dia; o que não existe não se abre por engano.
//
//  Por isso a leitura pública passa por aqui:
//
//    1. o token chega no CORPO do pedido, nunca no URL (o browser mantém-no
//       no fragmento, que não viaja no `Referer` nem em logs);
//    2. esta rota calcula o sha-256 — a base nunca vê o token;
//    3. a RPC de `service_role` verifica revogação e expiração, conta o
//       acesso e devolve o dossiê.
//
//  Limite de tentativas por IP: sem ele, o identificador é público e o
//  token seria adivinhável à força bruta com tempo suficiente. Com ele, não
//  é — 32 bytes aleatórios a 20 tentativas por minuto não se descobrem.
// ═══════════════════════════════════════════════════════════════════════

import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Tentativas por IP e por minuto. */
const LIMITE = 20;
const JANELA_MS = 60_000;

const MOTIVO: Record<string, string> = {
  inexistente: "Esta ligação não existe. Confirma o endereço com quem to enviou.",
  revogada: "Esta ligação foi revogada por quem a criou.",
  expirada: "Esta ligação expirou. Pede uma nova a quem ta enviou.",
};

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limite = rateLimit(`dossie:abrir:${ip}`, LIMITE, JANELA_MS);
  if (!limite.ok) {
    return NextResponse.json(
      { erro: "Demasiadas tentativas. Espera um pouco." },
      { status: 429, headers: { "retry-after": String(limite.retryAfter) } },
    );
  }

  let corpo: { id?: unknown; token?: unknown };
  try {
    corpo = (await req.json()) as typeof corpo;
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }

  const id = typeof corpo.id === "string" ? corpo.id : "";
  const token = typeof corpo.token === "string" ? corpo.token : "";
  if (!UUID.test(id) || token.length < 20 || token.length > 200) {
    return NextResponse.json({ erro: MOTIVO.inexistente }, { status: 404 });
  }

  const sb = supabaseAdmin();
  if (!sb) {
    return NextResponse.json({ erro: "Serviço indisponível." }, { status: 503 });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await sb.rpc("abrir_dossie_por_token", {
    p_id: id,
    p_token_hash: tokenHash,
  });

  if (error) {
    return NextResponse.json({ erro: "Não foi possível abrir o dossiê." }, { status: 500 });
  }

  const r = (data ?? {}) as {
    ok?: boolean; motivo?: string; dossie?: unknown;
    guia_slug?: string; etiqueta?: string | null; expira_em?: string; acessos?: number;
  };

  if (!r.ok) {
    // 404 para os três motivos, e de propósito: distinguir «não existe» de
    // «revogada» na resposta HTTP dava a quem tenta às cegas a confirmação
    // de que aquele identificador existe.
    return NextResponse.json({ erro: MOTIVO[r.motivo ?? ""] ?? MOTIVO.inexistente }, { status: 404 });
  }

  return NextResponse.json({
    dossie: r.dossie,
    guiaSlug: r.guia_slug,
    etiqueta: r.etiqueta ?? null,
    expiraEm: r.expira_em,
    acessos: r.acessos ?? 1,
  });
}
