import { NextResponse, type NextRequest } from "next/server";
import { resolverAcaoDoGuia } from "@/lib/fiz/guide-routing.server";
import { utilizadorDoPedido, obterLigacao } from "@/lib/fiz/session.server";
import { respostaErro, semCache } from "@/lib/fiz/route-helpers.server";
import { manifesto } from "@/lib/guias/manifests";
import type { GuideAudience } from "@/lib/guias/claims";
import type { Placement } from "@/lib/fiz/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLACEMENTS: Placement[] = ["CONTEXT_ACTION", "APPLY_TO_CASE", "NEXT_STEP", "SEARCH_RESULT", "CATEGORY"];
const AUDIENCES: GuideAudience[] = ["TI", "ENI", "COMPANY", "EMPLOYEE", "MIXED"];

/**
 * Resolve a ação FIZ de um Guia.
 *
 * Aceita apenas um slug que exista nos manifestos: o cliente nunca escolhe
 * um destino, escolhe um Guia. Funciona sem sessão — ler um Guia e ver a
 * próxima ação não exige conta nem subscrição.
 */
export async function POST(req: NextRequest) {
  try {
    const corpo = (await req.json().catch(() => ({}))) as {
      slug?: string;
      audience?: string;
      placement?: string;
    };

    const slug = typeof corpo.slug === "string" ? corpo.slug : "";
    if (!manifesto(slug)) {
      return NextResponse.json({ erro: "Guia desconhecido.", codigo: "nao_encontrado" }, { status: 404, headers: semCache });
    }

    const utilizador = await utilizadorDoPedido(req);
    const ligacao = utilizador ? await obterLigacao(utilizador.id) : null;

    const acao = await resolverAcaoDoGuia({
      slug,
      audience: AUDIENCES.includes(corpo.audience as GuideAudience) ? (corpo.audience as GuideAudience) : undefined,
      placement: PLACEMENTS.includes(corpo.placement as Placement) ? (corpo.placement as Placement) : "NEXT_STEP",
      connectionState: ligacao?.estado ?? "NOT_CONNECTED",
    });

    // `null` é uma resposta legítima: há Guias sem ação FIZ por decisão
    // editorial. O cliente simplesmente não mostra nada.
    return NextResponse.json({ acao }, { headers: semCache });
  } catch (erro) {
    return respostaErro(erro);
  }
}
