// ═══════════════════════════════════════════════════════════════════════
//  POST /api/analytics — receção de eventos de produto
//  ---------------------------------------------------------------------
//  A porta de entrada da camada de medição do §8. O cliente já filtrou por
//  consentimento, catálogo, origem e PII; aqui repete-se a validação toda,
//  porque o cliente é território de quem lá está e um `fetch` à mão passa
//  ao lado de todas as portas do browser.
//
//  Duas garantias que só existem deste lado:
//
//   · EVENTOS DE RECEITA NÃO NASCEM NO BROWSER. `plus_checkout_complete`,
//     `fiz_outcome` e o ciclo de vida das leads são marcados como
//     `origem: "servidor"` no catálogo e recusados aqui. Sem isto,
//     qualquer pessoa com a consola aberta escrevia receita no painel.
//
//   · O RELÓGIO É NOSSO. `ocorrido_em` vem do cliente e fica registado,
//     mas nenhuma janela temporal o usa: `recebido_em` é do servidor.
//
//  Sem Supabase configurado a rota responde 204 e descarta. É deliberado:
//  em pré-visualizações e em ambiente local não há para onde escrever, e
//  falhar aqui encheria a consola de erros sem informar ninguém.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rate-limit";
import { CATALOGO, eventoConhecido } from "@/lib/analytics/eventos";
import { verificarSemPII } from "@/lib/analytics/pii";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Um lote nunca traz mais do que isto — o cliente envia 12 de cada vez. */
const MAX_EVENTOS = 50;
const MAX_CORPO_BYTES = 64 * 1024;

interface EventoRecebido {
  nome: string;
  props: Record<string, unknown>;
  em: string;
  sessao: string;
  ator: string;
}

function ip(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "desconhecido";
}

export async function POST(req: Request) {
  // 120 lotes por minuto e por IP: folgado para uma pessoa a navegar,
  // apertado para quem quiser encher a tabela.
  const limite = rateLimit(`analytics:${ip(req)}`, 120, 60_000);
  if (!limite.ok) {
    return NextResponse.json(
      { erro: "Demasiados pedidos." },
      { status: 429, headers: { "Retry-After": String(limite.retryAfter) } },
    );
  }

  const bruto = await req.text();
  if (bruto.length > MAX_CORPO_BYTES) {
    return NextResponse.json({ erro: "Lote demasiado grande." }, { status: 413 });
  }

  let corpo: { eventos?: unknown };
  try {
    corpo = JSON.parse(bruto) as { eventos?: unknown };
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }

  const entrada = Array.isArray(corpo.eventos) ? corpo.eventos.slice(0, MAX_EVENTOS) : [];
  if (entrada.length === 0) return new NextResponse(null, { status: 204 });

  const validos: EventoRecebido[] = [];
  for (const item of entrada) {
    const e = item as Partial<EventoRecebido>;
    if (typeof e?.nome !== "string" || !eventoConhecido(e.nome)) continue;
    if (CATALOGO[e.nome].origem === "servidor") continue;
    if (typeof e.ator !== "string" || typeof e.sessao !== "string") continue;
    if (e.ator.length > 80 || e.sessao.length > 80) continue;

    const props = e.props && typeof e.props === "object" ? e.props : {};
    if (!verificarSemPII(props).ok) continue;

    const ocorrido = typeof e.em === "string" ? new Date(e.em) : new Date(NaN);
    validos.push({
      nome: e.nome,
      props: props as Record<string, unknown>,
      sessao: e.sessao,
      ator: e.ator,
      em: Number.isNaN(ocorrido.getTime()) ? new Date().toISOString() : ocorrido.toISOString(),
    });
  }

  if (validos.length === 0) return new NextResponse(null, { status: 204 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return new NextResponse(null, { status: 204 });

  const sb = createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await sb.from("analytics_eventos").insert(
    validos.map((e) => ({
      nome: e.nome,
      ator: e.ator,
      sessao: e.sessao,
      props: e.props,
      ocorrido_em: e.em,
    })),
  );

  // Perder um lote de medição é um problema nosso, não do utilizador: a
  // resposta é sempre 204 e o erro fica no log do servidor.
  if (error) console.warn("[analytics] falha ao gravar lote:", error.message);
  return new NextResponse(null, { status: 204 });
}
