import { NextResponse, type NextRequest } from "next/server";
import { pedirFiz } from "@/lib/fiz/client.server";
import { utilizadorDoPedido, accessTokenValido, obterLigacao } from "@/lib/fiz/session.server";
import { respostaErro, naoAutenticado, semCache } from "@/lib/fiz/route-helpers.server";
import { USER_SCOPES, type CreateInvoiceDraftRequest, type InvoiceDraft } from "@/lib/fiz/contracts";
import { guardaFiz } from "@/lib/fiz/gate.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cria um RASCUNHO de documento na FIZ.
 *
 * Ponto 10 da arquitetura: o Recibo Certo cria apenas rascunhos reversíveis.
 * A emissão, a certificação e a comunicação à AT acontecem na FIZ, com
 * revisão do utilizador. Nenhuma emissão ocorre em silêncio durante uma
 * simulação — daí este endpoint exigir o scope de escrita de rascunhos, que
 * não faz parte da ligação básica e só é pedido quando o utilizador escolhe
 * explicitamente esta funcionalidade.
 */
export async function POST(req: NextRequest) {
  // ⚠️ RC-FIZ-002 — porta do servidor. Esta rota aceita ou transporta dados;
  // com a integração desligada não pode sequer ler o corpo do pedido.
  const fechada = guardaFiz();
  if (fechada) return fechada;

  try {
    const utilizador = await utilizadorDoPedido(req);
    if (!utilizador) return naoAutenticado();

    // Verificação de scope ANTES de chamar a FIZ: melhor uma mensagem clara
    // do que um 403 opaco vindo do outro lado.
    const ligacao = await obterLigacao(utilizador.id);
    if (!ligacao.scopes.includes(USER_SCOPES.invoiceDrafts)) {
      return NextResponse.json(
        {
          erro: "A tua ligação à FIZ ainda não autoriza criar rascunhos. Volta a ligar a conta e concede essa permissão.",
          codigo: "nao_autorizado",
          scopeEmFalta: USER_SCOPES.invoiceDrafts,
        },
        { status: 403, headers: semCache },
      );
    }

    const corpo = (await req.json().catch(() => null)) as CreateInvoiceDraftRequest | null;
    if (!corpo?.documentType || !corpo.customer?.name || !Array.isArray(corpo.lines) || corpo.lines.length === 0) {
      return NextResponse.json(
        { erro: "Faltam dados para preparar o rascunho.", codigo: "invalido" },
        { status: 400, headers: semCache },
      );
    }

    const token = await accessTokenValido(utilizador.id);
    const { dados } = await pedirFiz<InvoiceDraft>({
      caminho: "/v1/me/invoice-drafts",
      metodo: "POST",
      accessTokenUtilizador: token,
      corpo,
    });

    // O contrato garante `status: DRAFT` e `reviewRequired: true`. Se
    // alguma vez chegar outra coisa, é um incidente — não emitimos nada em
    // nome do utilizador sem revisão dele.
    if (!dados || dados.status !== "DRAFT" || dados.reviewRequired !== true) {
      console.error("[fiz] resposta de rascunho fora do contrato");
      return NextResponse.json(
        { erro: "A FIZ devolveu um documento que não é um rascunho. Não avançámos.", codigo: "conflito" },
        { status: 409, headers: semCache },
      );
    }

    return NextResponse.json(
      {
        rascunhoId: dados.id,
        precisaRevisao: true,
        aviso: "Isto é um rascunho. Revê e emite na FIZ — nada foi comunicado à Autoridade Tributária.",
      },
      { headers: semCache },
    );
  } catch (erro) {
    return respostaErro(erro);
  }
}
