import { NextResponse, type NextRequest } from "next/server";
import { pedirFiz } from "@/lib/fiz/client.server";
import { utilizadorDoPedido, accessTokenValido } from "@/lib/fiz/session.server";
import { respostaErro, naoAutenticado, semCache } from "@/lib/fiz/route-helpers.server";
import type { Obligation, Paged } from "@/lib/fiz/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Obrigações do utilizador ligado, tal como a FIZ as reporta.
 *
 * Estes são ESTADOS RECEBIDOS DA FIZ, não estimativas do ReciboCerto — a
 * interface tem de os identificar como tal (ponto 9.2 da arquitetura).
 * `atualizadoEm` existe para que nunca se apresente um estado antigo como
 * se fosse atual.
 */
export async function GET(req: NextRequest) {
  try {
    const utilizador = await utilizadorDoPedido(req);
    if (!utilizador) return naoAutenticado();

    const token = await accessTokenValido(utilizador.id);
    const { dados } = await pedirFiz<Paged<Obligation>>({
      caminho: "/v1/me/obligations",
      accessTokenUtilizador: token,
      query: { limit: 20 },
    });

    return NextResponse.json(
      { origem: "fiz" as const, obrigacoes: dados?.data ?? [], atualizadoEm: new Date().toISOString() },
      { headers: semCache },
    );
  } catch (erro) {
    return respostaErro(erro);
  }
}
