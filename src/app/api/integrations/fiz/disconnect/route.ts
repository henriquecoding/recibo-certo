import { NextResponse, type NextRequest } from "next/server";
import { utilizadorDoPedido, accessTokenValido, apagarLigacao } from "@/lib/fiz/session.server";
import { pedirFiz } from "@/lib/fiz/client.server";
import { USER_SCOPES } from "@/lib/fiz/contracts";
import { respostaErro, naoAutenticado, semCache } from "@/lib/fiz/route-helpers.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Desliga a conta FIZ.
 *
 * Revogação bilateral (ponto 7.3 da arquitetura): tenta revogar na FIZ e
 * apaga sempre os tokens do nosso lado. Se a FIZ estiver em baixo, a
 * ligação local é removida na mesma — o utilizador nunca fica preso a uma
 * ligação que pediu para terminar.
 */
export async function POST(req: NextRequest) {
  try {
    const utilizador = await utilizadorDoPedido(req);
    if (!utilizador) return naoAutenticado();

    let revogadaNaFiz = false;
    try {
      const token = await accessTokenValido(utilizador.id);
      await pedirFiz<void>({
        caminho: "/v1/me/connection",
        metodo: "DELETE",
        accessTokenUtilizador: token,
        idempotencyKey: `revoke-${utilizador.id}`,
        cabecalhosExtra: { "x-required-scope": USER_SCOPES.revoke },
      });
      revogadaNaFiz = true;
    } catch {
      // Continuamos: apagar do nosso lado é o que o utilizador pediu.
    }

    await apagarLigacao(utilizador.id);

    return NextResponse.json(
      {
        desligado: true,
        revogadaNaFiz,
        aviso: revogadaNaFiz
          ? undefined
          : "Removemos a ligação deste lado. Confirma na FIZ que o acesso ficou revogado.",
      },
      { headers: semCache },
    );
  } catch (erro) {
    return respostaErro(erro);
  }
}
