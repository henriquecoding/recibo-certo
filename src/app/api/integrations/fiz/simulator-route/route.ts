import { NextResponse, type NextRequest } from "next/server";
import { resolverAcaoDoSimulador } from "@/lib/fiz/guide-routing.server";
import { utilizadorDoPedido, obterLigacao } from "@/lib/fiz/session.server";
import { respostaErro, semCache } from "@/lib/fiz/route-helpers.server";
import { rotaDoSimulador, type SimuladorId } from "@/content/fiz-simulator-routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resolve a ação FIZ de um simulador (ponto 12.3 da arquitetura).
 *
 * Como nos Guias: o cliente escolhe um SIMULADOR, nunca um destino. Um id
 * que não conste de `fiz-simulator-routes.ts` é rejeitado — não há forma de
 * pedir uma capacidade arbitrária a partir do browser.
 *
 * Funciona sem sessão: simular e ver o passo seguinte não exige conta.
 */
export async function POST(req: NextRequest) {
  try {
    const corpo = (await req.json().catch(() => ({}))) as { simulador?: string };
    const id = corpo.simulador as SimuladorId | undefined;

    if (!id || !rotaDoSimulador(id)) {
      // `null` e não 404: há simuladores sem ação por decisão de produto, e
      // o cliente trata os dois casos da mesma maneira — não mostra nada.
      return NextResponse.json({ acao: null }, { headers: semCache });
    }

    const utilizador = await utilizadorDoPedido(req);
    const ligacao = utilizador ? await obterLigacao(utilizador.id) : null;

    const acao = await resolverAcaoDoSimulador({
      simulador: id,
      connectionState: ligacao?.estado ?? "NOT_CONNECTED",
    });

    return NextResponse.json({ acao }, { headers: semCache });
  } catch (erro) {
    return respostaErro(erro);
  }
}
