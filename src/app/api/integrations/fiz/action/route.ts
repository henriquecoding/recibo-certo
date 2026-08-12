import { NextResponse, type NextRequest } from "next/server";
import { pedirFiz } from "@/lib/fiz/client.server";
import { utilizadorDoPedido, accessTokenValido } from "@/lib/fiz/session.server";
import { respostaErro, naoAutenticado, semCache } from "@/lib/fiz/route-helpers.server";
import { fizServerConfig } from "@/lib/fiz/config";
import { regressoSeguro } from "@/lib/fiz/oauth.server";
import { guardaFiz } from "@/lib/fiz/gate.server";
import {
  destinoFizValido,
  urlSemDadosSensiveis,
  type ActionResourceType,
  type ActionSession,
  type CreateActionSessionRequest,
} from "@/lib/fiz/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPOS: ActionResourceType[] = ["OBLIGATION", "DECLARATION", "INVOICE_DRAFT", "ACCOUNT"];

/**
 * Cria uma sessão de ação: um deep link efémero que abre a FIZ no sítio certo.
 *
 * Qualquer revisão, confirmação, submissão ou operação irreversível acontece
 * DENTRO da FIZ (ponto 15.3 da arquitetura). Esta rota só abre a porta.
 */
export async function POST(req: NextRequest) {
  // ⚠️ RC-FIZ-002 — porta do servidor. Esta rota aceita ou transporta dados;
  // com a integração desligada não pode sequer ler o corpo do pedido.
  const fechada = guardaFiz();
  if (fechada) return fechada;

  try {
    const utilizador = await utilizadorDoPedido(req);
    if (!utilizador) return naoAutenticado();

    const corpo = (await req.json().catch(() => ({}))) as {
      resourceType?: string;
      resourceId?: string;
      regresso?: string;
    };

    if (!TIPOS.includes(corpo.resourceType as ActionResourceType) || !corpo.resourceId) {
      return NextResponse.json(
        { erro: "Ação inválida.", codigo: "invalido" },
        { status: 400, headers: semCache },
      );
    }

    const pedido: CreateActionSessionRequest = {
      resourceType: corpo.resourceType as ActionResourceType,
      resourceId: corpo.resourceId,
      returnUrl: new URL(regressoSeguro(corpo.regresso), fizServerConfig().appUrl).toString(),
    };

    const token = await accessTokenValido(utilizador.id);
    const { dados } = await pedirFiz<ActionSession>({
      caminho: "/v1/me/action-sessions",
      metodo: "POST",
      accessTokenUtilizador: token,
      corpo: pedido,
    });

    // Mesmas guardas do handoff: o destino tem de ser da FIZ e não pode
    // transportar dados pessoais na query string.
    if (!dados?.url || !destinoFizValido(dados.url) || !urlSemDadosSensiveis(dados.url)) {
      return NextResponse.json(
        { erro: "Bloqueámos um destino que não reconhecemos como sendo da FIZ.", codigo: "destino_recusado" },
        { status: 502, headers: semCache },
      );
    }

    return NextResponse.json({ url: dados.url, expiraEm: dados.expiresAt }, { headers: semCache });
  } catch (erro) {
    return respostaErro(erro);
  }
}
