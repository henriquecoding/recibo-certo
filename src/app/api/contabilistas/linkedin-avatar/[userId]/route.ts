import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BYTES = 5 * 1024 * 1024;

function origemLinkedInPermitida(valor: string): boolean {
  try {
    const u = new URL(valor);
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    return h === "linkedin.com"
      || h.endsWith(".linkedin.com")
      || h === "licdn.com"
      || h.endsWith(".licdn.com")
      || h === "licdn-ei.com"
      || h.endsWith(".licdn-ei.com");
  } catch {
    return false;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  if (!UUID.test(userId)) return new NextResponse(null, { status: 404 });

  const sb = supabaseAdmin();
  if (!sb) return new NextResponse(null, { status: 503 });

  const { data, error } = await sb
    .from("contabilistas")
    .select("linkedin_avatar_url, linkedin_ligado_em, estado")
    .eq("user_id", userId)
    .eq("estado", "aprovado")
    .maybeSingle();

  if (error || !data?.linkedin_ligado_em || !data.linkedin_avatar_url) {
    return new NextResponse(null, { status: 404 });
  }

  const origem = String(data.linkedin_avatar_url);
  if (!origemLinkedInPermitida(origem)) return new NextResponse(null, { status: 404 });

  try {
    const resposta = await fetch(origem, {
      redirect: "follow",
      headers: { "User-Agent": "ReciboCerto-LinkedIn-Avatar/1.0" },
      signal: AbortSignal.timeout(6_000),
    });

    if (!resposta.ok || !origemLinkedInPermitida(resposta.url)) {
      return new NextResponse(null, { status: 404 });
    }

    const tipo = resposta.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
    if (!tipo.startsWith("image/")) return new NextResponse(null, { status: 415 });

    const tamanhoDeclarado = Number(resposta.headers.get("content-length") ?? "0");
    if (Number.isFinite(tamanhoDeclarado) && tamanhoDeclarado > MAX_BYTES) {
      return new NextResponse(null, { status: 413 });
    }

    // ┌───────────────────────────────────────────────────────────────────┐
    // │ O TETO TEM DE TRAVAR ENQUANTO CHEGA, NÃO DEPOIS DE TER CHEGADO     │
    // │                                                                   │
    // │ `arrayBuffer()` lê o corpo INTEIRO para memória e só depois se     │
    // │ media o tamanho. Com `content-length` a mentir — ou simplesmente   │
    // │ ausente, que é legítimo numa resposta em pedaços — um servidor a   │
    // │ enviar sem fim enchia a função antes de a verificação existir.     │
    // │                                                                   │
    // │ O anfitrião está em lista de permissão, e por isso a               │
    // │ probabilidade é baixa; mas o custo de a probabilidade não ser      │
    // │ zero é a função inteira, e ler em pedaços custa dez linhas.        │
    // └───────────────────────────────────────────────────────────────────┘
    const leitor = resposta.body?.getReader();
    if (!leitor) return new NextResponse(null, { status: 502 });

    const pedacos: Uint8Array[] = [];
    let recebidos = 0;
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      if (!value) continue;
      recebidos += value.byteLength;
      if (recebidos > MAX_BYTES) {
        await leitor.cancel().catch(() => {});
        return new NextResponse(null, { status: 413 });
      }
      pedacos.push(value);
    }

    const bytes = new Uint8Array(recebidos);
    let posicao = 0;
    for (const pedaco of pedacos) {
      bytes.set(pedaco, posicao);
      posicao += pedaco.byteLength;
    }

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": tipo,
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
