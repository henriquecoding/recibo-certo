// ═══════════════════════════════════════════════════════════════════════
//  POST /api/contabilistas/descarregar — o ficheiro, a quem pode agora
//  ---------------------------------------------------------------------
//  Substitui o URL assinado que o browser pedia ao armazenamento. O
//  problema desse não era a duração — era que a assinatura sobrevive à
//  autorização que a produziu: terminar o acompanhamento fecha o acesso a
//  tudo, mas um URL assinado um segundo antes continuava a funcionar
//  durante os cinco minutos seguintes.
//
//  Aqui a pergunta é feita no instante do pedido, com a identidade de quem
//  pede (`anexo_legivel`, migração 050). Só depois de ela responder que sim
//  é que a chave de serviço vai buscar os bytes.
//
//  Os três cabeçalhos da resposta não são decoração:
//
//   · `Content-Disposition: attachment` — o ficheiro descarrega, não abre.
//     Um HTML servido do nosso domínio é XSS; um PDF aberto no separador
//     partilha a origem com a sessão de quem o abriu.
//   · `X-Content-Type-Options: nosniff` — o browser não adivinha o tipo a
//     partir do conteúdo, e portanto não decide sozinho executá-lo.
//   · `Cache-Control: private, no-store` — um ficheiro fiscal não fica em
//     cache partilhada, nem em disco depois de a sessão acabar.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { supabaseServico, supabaseDoPedido, utilizadorDoPedido } from "@/lib/contabilistas/servidor";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BALDES = {
  anexo: "contabilista-anexos",
  documento: "contabilista-documentos",
} as const;

export async function POST(req: Request) {
  const userId = await utilizadorDoPedido(req);
  if (!userId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const limite = rateLimit(`contabilista:descarregar:${userId}:${clientIp(req)}`, 60, 60_000);
  if (!limite.ok) {
    return NextResponse.json(
      { erro: "Demasiados pedidos." },
      { status: 429, headers: { "Retry-After": String(limite.retryAfter) } }
    );
  }

  const sb = supabaseServico();
  const comoUtilizador = supabaseDoPedido(req);
  if (!sb || !comoUtilizador) {
    return NextResponse.json({ erro: "Serviço indisponível." }, { status: 503 });
  }

  let corpo: { caminho?: string; tipo?: string };
  try { corpo = await req.json(); }
  catch { return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 }); }

  const caminho = typeof corpo.caminho === "string" ? corpo.caminho : "";
  const tipo = corpo.tipo === "documento" ? "documento" : "anexo";
  if (!caminho) return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });

  // A pergunta é feita AGORA, com a identidade de quem pede. E é feita à
  // base de dados, e não a esta rota: as regras de quem vê o quê vivem lá,
  // e duplicá-las aqui era criar um sítio onde poderiam divergir.
  const { data, error } = await comoUtilizador.rpc(
    tipo === "documento" ? "documento_legivel_por_admin" : "anexo_legivel",
    { p_caminho: caminho },
  );
  if (error) {
    console.error("[descarregar] autorização:", error.message);
    return NextResponse.json({ erro: "Não foi possível verificar o acesso." }, { status: 500 });
  }

  const r = (data ?? {}) as { ok?: boolean; motivo?: string; nome?: string; tipo?: string };
  if (!r.ok) {
    // «Não existe» e «não é teu» respondem o mesmo, de propósito: a
    // diferença entre as duas diz a quem tenta se o ficheiro existe.
    return NextResponse.json({ erro: "Ficheiro indisponível." }, { status: 404 });
  }

  const { data: ficheiro, error: erroLer } = await sb.storage.from(BALDES[tipo]).download(caminho);
  if (erroLer || !ficheiro) {
    return NextResponse.json({ erro: "Ficheiro indisponível." }, { status: 404 });
  }

  return new NextResponse(ficheiro.stream() as ReadableStream, {
    headers: {
      // O tipo é o que ficou GUARDADO depois de os bytes serem verificados
      // (migração 048), e não o que o pedido diz.
      "Content-Type": r.tipo ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(r.nome ?? "ficheiro")}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
    },
  });
}
