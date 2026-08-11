import { NextResponse, type NextRequest } from "next/server";
import { pedirFiz } from "@/lib/fiz/client.server";
import { utilizadorDoPedido, accessTokenValido } from "@/lib/fiz/session.server";
import { respostaErro, naoAutenticado, semCache } from "@/lib/fiz/route-helpers.server";
import type { Declaration, Paged } from "@/lib/fiz/contracts";
import { guardaFiz } from "@/lib/fiz/gate.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Estado das declarações (IVA, Segurança Social, IRS) na FIZ.
 *
 * O Recibo Certo apresenta este estado, nunca o produz: uma estimativa
 * nossa jamais pode aparecer como declaração submetida (ponto 4.3 da
 * arquitetura).
 */
export async function GET(req: NextRequest) {
  // ⚠️ RC-FIZ-002 — porta do servidor. Esta rota aceita ou transporta dados;
  // com a integração desligada não pode sequer ler o corpo do pedido.
  const fechada = guardaFiz();
  if (fechada) return fechada;

  try {
    const utilizador = await utilizadorDoPedido(req);
    if (!utilizador) return naoAutenticado();

    const token = await accessTokenValido(utilizador.id);
    const { dados } = await pedirFiz<Paged<Declaration>>({
      caminho: "/v1/me/declarations",
      accessTokenUtilizador: token,
      query: { limit: 20 },
    });

    return NextResponse.json(
      { origem: "fiz" as const, declaracoes: dados?.data ?? [], atualizadoEm: new Date().toISOString() },
      { headers: semCache },
    );
  } catch (erro) {
    return respostaErro(erro);
  }
}
