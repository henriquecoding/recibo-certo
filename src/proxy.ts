import { NextResponse, type NextRequest } from "next/server";
import { agenteDeExtracaoBloqueado } from "@/lib/crawler-policy";

const SINAIS_DE_DIREITOS = new Set([
  "/robots.txt",
  "/.well-known/tdmrep.json",
]);

/**
 * Recusa agentes que se identificam como crawlers de IA/extracção.
 *
 * Isto complementa robots.txt com enforcement HTTP. Não consegue impedir um
 * atacante de fingir ser um browser normal; esse limite é inerente a qualquer
 * site público e está documentado em docs/PROTECAO-ATIVOS.md.
 */
export function proxy(request: NextRequest) {
  if (SINAIS_DE_DIREITOS.has(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const userAgent = request.headers.get("user-agent") ?? "";
  if (!agenteDeExtracaoBloqueado(userAgent)) {
    return NextResponse.next();
  }

  return new NextResponse("A extração automatizada deste conteúdo não está autorizada.", {
    status: 403,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow, noai, noimageai",
      "tdm-reservation": "1",
      "Vary": "User-Agent",
    },
  });
}

export const config = {
  // Os assets internos não precisam de executar Proxy. As páginas, APIs,
  // documentos públicos e restantes recursos continuam cobertos.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
