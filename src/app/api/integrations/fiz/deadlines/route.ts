import { NextResponse, type NextRequest } from "next/server";
import { pedirFiz } from "@/lib/fiz/client.server";
import { utilizadorDoPedido, accessTokenValido } from "@/lib/fiz/session.server";
import { respostaErro, naoAutenticado, semCache } from "@/lib/fiz/route-helpers.server";
import type { Deadline, Paged } from "@/lib/fiz/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIA = /^\d{4}-\d{2}-\d{2}$/;

function janelaPadrao(): { de: string; ate: string } {
  const hoje = new Date();
  const fim = new Date(hoje);
  fim.setMonth(fim.getMonth() + 6);
  return { de: hoje.toISOString().slice(0, 10), ate: fim.toISOString().slice(0, 10) };
}

/**
 * Prazos que a FIZ considera aplicáveis ao utilizador ligado.
 *
 * Distinto do calendário fiscal do Guia, que mostra prazos legais gerais:
 * aqui só entram os prazos do contribuinte concreto (ponto 4.7 da auditoria).
 */
export async function GET(req: NextRequest) {
  try {
    const utilizador = await utilizadorDoPedido(req);
    if (!utilizador) return naoAutenticado();

    const padrao = janelaPadrao();
    const pedidoDe = req.nextUrl.searchParams.get("de");
    const pedidoAte = req.nextUrl.searchParams.get("ate");
    const de = pedidoDe && DIA.test(pedidoDe) ? pedidoDe : padrao.de;
    const ate = pedidoAte && DIA.test(pedidoAte) ? pedidoAte : padrao.ate;

    const token = await accessTokenValido(utilizador.id);
    const { dados } = await pedirFiz<Paged<Deadline>>({
      caminho: "/v1/me/deadlines",
      accessTokenUtilizador: token,
      query: { from: de, to: ate, limit: 50 },
    });

    return NextResponse.json(
      { origem: "fiz" as const, prazos: dados?.data ?? [], de, ate, atualizadoEm: new Date().toISOString() },
      { headers: semCache },
    );
  } catch (erro) {
    return respostaErro(erro);
  }
}
