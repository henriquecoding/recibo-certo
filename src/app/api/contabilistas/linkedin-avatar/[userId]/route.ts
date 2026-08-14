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

    const bytes = await resposta.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) return new NextResponse(null, { status: 413 });

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
