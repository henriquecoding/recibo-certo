import { NextResponse, type NextRequest } from "next/server";
import { iniciarAutorizacao, COOKIE_ESTADO, DURACAO_COOKIE_SEGUNDOS, regressoSeguro } from "@/lib/fiz/oauth.server";
import { utilizadorDoPedido } from "@/lib/fiz/session.server";
import { respostaErro, naoAutenticado, semCache } from "@/lib/fiz/route-helpers.server";
import { SCOPES_LIGACAO_BASICA, SCOPES_SOB_PROCURA } from "@/lib/fiz/contracts";
import { guardaFiz } from "@/lib/fiz/gate.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Inicia a ligação da conta FIZ.
 *
 * Devolve o URL de autorização em vez de redirecionar: o pedido traz o
 * cabeçalho Authorization da sessão Supabase, que uma navegação normal do
 * browser não teria. O cliente faz o redirecionamento a seguir.
 */
export async function POST(req: NextRequest) {
  // ⚠️ RC-FIZ-002 — porta do servidor. Esta rota aceita ou transporta dados;
  // com a integração desligada não pode sequer ler o corpo do pedido.
  const fechada = guardaFiz();
  if (fechada) return fechada;

  try {
    const utilizador = await utilizadorDoPedido(req);
    if (!utilizador) return naoAutenticado();

    const corpo = (await req.json().catch(() => ({}))) as { regresso?: string; scopesExtra?: string[] };

    // Ponto 7.2: a ligação básica não pede permissões de escrita. Scopes
    // adicionais só são aceites se constarem da lista sob procura.
    const extra = (corpo.scopesExtra ?? []).filter((s) => SCOPES_SOB_PROCURA.includes(s));
    const scopes = [...new Set([...SCOPES_LIGACAO_BASICA, ...extra])];

    const { url, cookie } = iniciarAutorizacao(utilizador.id, regressoSeguro(corpo.regresso), scopes);

    const resposta = NextResponse.json({ url, scopes }, { headers: semCache });
    resposta.cookies.set(COOKIE_ESTADO, cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/integrations/fiz",
      maxAge: DURACAO_COOKIE_SEGUNDOS,
    });
    return resposta;
  } catch (erro) {
    return respostaErro(erro);
  }
}
