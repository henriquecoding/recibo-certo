import { NextResponse, type NextRequest } from "next/server";
import { agenteDeExtracaoBloqueado } from "@/lib/crawler-policy";
import { normalizarFocoHomepage, ROTA_POR_FOCO } from "@/lib/foco-homepage";

/**
 * Caminhos que dizem o que é permitido — e que por isso têm de ser sempre
 * legíveis, incluindo por quem está a ser recusado.
 *
 * `/llms.txt` entrou aqui depois de se medir o óbvio: o ficheiro existe
 * EXCLUSIVAMENTE para explicar a um modelo de linguagem como citar o Recibo
 * Certo, e devolvia 403 a todos eles. Eram 3,9 KB escritos para um público
 * que não os podia ler. Recusar o conteúdo é uma decisão; recusar as
 * instruções sobre como o usar é só uma contradição.
 */
const SINAIS_DE_DIREITOS = new Set([
  "/robots.txt",
  "/.well-known/tdmrep.json",
  "/llms.txt",
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
  if (agenteDeExtracaoBloqueado(userAgent)) {
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

  // Os redirects de `next.config` preservam a query de origem no Next 16.
  // Isso deixaria `?foco=` no destino e criaria um ciclo para Descobrir. O
  // Proxy consegue apagar apenas essa chave, conservar UTMs e emitir um único
  // 307 (temporário até a validação SEO), sem tornar as páginas dinâmicas.
  if (request.nextUrl.pathname === "/") {
    const foco = normalizarFocoHomepage(request.nextUrl.searchParams.get("foco"));
    if (foco) {
      const destino = request.nextUrl.clone();
      destino.pathname = ROTA_POR_FOCO[foco];
      destino.searchParams.delete("foco");
      return NextResponse.redirect(destino, 307);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Os assets internos não precisam de executar Proxy. As páginas, APIs,
  // documentos públicos e restantes recursos continuam cobertos.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
