import { NextResponse, type NextRequest } from "next/server";
import { abrirEstado, trocarCodigo, COOKIE_ESTADO } from "@/lib/fiz/oauth.server";
import { guardarLigacao } from "@/lib/fiz/session.server";
import { comparaSegura } from "@/lib/fiz/tokens.server";
import { fizServerConfig } from "@/lib/fiz/config";
import { guardaFiz } from "@/lib/fiz/gate.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Retorno da autorização na FIZ.
 *
 * É uma navegação do browser, por isso responde sempre com um
 * redirecionamento — nunca com JSON. O resultado viaja como um parâmetro
 * de estado (`fiz=ligado` / `fiz=erro`), nunca com dados do utilizador.
 */
export async function GET(req: NextRequest) {
  // ⚠️ RC-FIZ-002 — porta do servidor. Esta rota aceita ou transporta dados;
  // com a integração desligada não pode sequer ler o corpo do pedido.
  const fechada = guardaFiz();
  if (fechada) return fechada;

  const { appUrl } = fizServerConfig();
  const parametros = req.nextUrl.searchParams;

  const paraDestino = (caminho: string, resultado: string) => {
    const destino = new URL(caminho, appUrl);
    destino.searchParams.set("fiz", resultado);
    const resposta = NextResponse.redirect(destino);
    resposta.cookies.delete(COOKIE_ESTADO);
    return resposta;
  };

  const selado = req.cookies.get(COOKIE_ESTADO)?.value;
  if (!selado) return paraDestino("/dashboard", "erro");

  let regresso = "/dashboard";
  try {
    const estado = abrirEstado(selado);
    regresso = estado.regressoInterno;

    // O utilizador pode ter recusado a autorização na FIZ.
    if (parametros.get("error")) return paraDestino(regresso, "cancelado");

    const codigo = parametros.get("code");
    const stateRecebido = parametros.get("state");
    if (!codigo || !stateRecebido || !comparaSegura(stateRecebido, estado.state)) {
      return paraDestino(regresso, "erro");
    }

    const tokens = await trocarCodigo(codigo, estado.codeVerifier);
    await guardarLigacao({
      userId: estado.userId,
      partnerUserId: tokens.partnerUserId ?? estado.userId,
      scopes: tokens.scopes,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    });

    return paraDestino(regresso, "ligado");
  } catch {
    // Sem detalhes no URL: o utilizador vê uma mensagem na página de destino.
    return paraDestino(regresso, "erro");
  }
}
