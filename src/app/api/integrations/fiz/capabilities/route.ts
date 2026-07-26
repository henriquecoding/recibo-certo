import { NextResponse } from "next/server";
import { obterCatalogo } from "@/lib/fiz/capabilities.server";
import { estadoIntegracao } from "@/lib/fiz/config";
import { respostaErro, semCache } from "@/lib/fiz/route-helpers.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vista pública do catálogo de capacidades.
 *
 * Devolve apenas o que a interface precisa de saber (chave, rótulo,
 * disponibilidade, públicos e modos de dados). Scopes, chaves de produto e
 * territórios ficam no servidor — não têm utilidade no cliente e revelam
 * detalhes comerciais da FIZ.
 */
export async function GET() {
  try {
    const estado = estadoIntegracao();
    if (estado !== "pronta") {
      return NextResponse.json({ integracao: estado, capacidades: [], degradado: false }, { headers: semCache });
    }

    const { catalogo, degradado } = await obterCatalogo();
    return NextResponse.json(
      {
        integracao: estado,
        versao: catalogo?.version ?? null,
        degradado,
        capacidades: (catalogo?.capabilities ?? []).map((c) => ({
          key: c.key,
          label: c.label,
          availability: c.availability,
          audiences: c.audiences,
          dataModes: c.dataModes,
        })),
      },
      { headers: semCache },
    );
  } catch (erro) {
    return respostaErro(erro);
  }
}
