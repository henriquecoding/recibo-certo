// ═══════════════════════════════════════════════════════════════════════
//  REDIRECIONADOR DE PARCERIA  ·  GET /ir/<parceiro>?s=…&v=…&g=…&i=…
//  ---------------------------------------------------------------------
//  Porquê um redirecionador em vez do link direto no HTML:
//
//   1. UM SÍTIO PARA MUDAR. Se o parceiro mudar o formato do link, muda-se
//      uma linha na base de dados e não 60 componentes.
//   2. MEDIÇÃO SEM JAVASCRIPT DE TERCEIROS. O clique é registado no
//      servidor. Funciona com JS desligado, com bloqueadores, e não exige
//      consentimento porque não guarda nada no equipamento do utilizador.
//   3. O CÓDIGO DE AFILIADO NÃO FICA EM HTML ESTÁTICO. Não é raspado, não é
//      copiado por agregadores, não aparece em caches de pesquisa.
//   4. VALIDAÇÃO NO MOMENTO CERTO. Domínio, dados sensíveis e estado da
//      parceria são verificados a cada clique, não quando o admin gravou o
//      formulário.
//
//  Nenhum `Set-Cookie` sai daqui. O cookie de atribuição é posto pelo
//  parceiro, no domínio dele, DEPOIS do redirecionamento.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import {
  parceriaAtiva,
  parceriaUtilizavel,
  registarClique,
} from "@/lib/parcerias/catalogo.server";
import {
  construirLinkAfiliado,
  gerarClickId,
  classificarDispositivo,
} from "@/lib/parcerias/link.server";
import { ParceriaError, type CodigoParceria } from "@/lib/parcerias/errors";
import type { FizIntent } from "@/lib/guias/manifests";

// `nodejs` porque se lê o Supabase com a service role; `force-dynamic` para
// que nenhuma camada de cache do Next transforme o 302 numa resposta estática.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INTENTS: readonly string[] = [
  "START_FREELANCER",
  "CONFIGURE_FREELANCER",
  "CONFIGURE_VAT",
  "CONFIGURE_SOCIAL_SECURITY",
  "PREPARE_IRS",
  "START_COMPANY",
  "FIND_ACCOUNTANT",
];

/** Cabeçalhos comuns: nunca cacheado, nunca indexado. */
function cabecalhos(): Record<string, string> {
  return {
    "Cache-Control": "no-store, max-age=0",
    "X-Robots-Tag": "noindex, nofollow",
  };
}

/**
 * Quando algo corre mal, o utilizador vai para uma página nossa que explica.
 * Nunca um 404 — a pessoa clicou num botão legítimo — e nunca um destino
 * inventado.
 */
function paraExplicacao(pedido: Request, motivo: CodigoParceria): NextResponse {
  const destino = new URL("/parceiros/indisponivel", pedido.url);
  destino.searchParams.set("motivo", motivo);
  // 302, nunca 301: um 301 fica cacheado no browser e impede mudar o destino.
  return NextResponse.redirect(destino, { status: 302, headers: cabecalhos() });
}

export async function GET(
  pedido: Request,
  ctx: { params: Promise<{ parceiro: string }> },
): Promise<NextResponse> {
  const { parceiro: key } = await ctx.params;
  const url = new URL(pedido.url);

  const superficie = url.searchParams.get("s") ?? "desconhecida";
  const variante = url.searchParams.get("v");
  const slug = url.searchParams.get("g");
  const intentBruto = url.searchParams.get("i");
  // `d=registo` manda para o formulário de inscrição em vez da homepage.
  const destino = url.searchParams.get("d") === "registo" ? ("registo" as const) : ("site" as const);
  const intent = intentBruto && INTENTS.includes(intentBruto) ? (intentBruto as FizIntent) : undefined;

  const parceria = await parceriaAtiva(key);
  if (!parceria) return paraExplicacao(pedido, "parceiro_desconhecido");
  if (!parceria.ativo) return paraExplicacao(pedido, "parceiro_inativo");
  if (!parceria.linkAfiliado) return paraExplicacao(pedido, "sem_link");
  if (!parceriaUtilizavel(parceria)) return paraExplicacao(pedido, "fora_da_janela");

  const clickId = gerarClickId();

  let link;
  try {
    link = construirLinkAfiliado({
      parceiro: parceria,
      superficie,
      variante: variante ?? undefined,
      slug: slug ?? undefined,
      intent,
      clickId,
      destino,
    });
  } catch (erro) {
    const codigo = erro instanceof ParceriaError ? erro.codigo : "destino_recusado";
    return paraExplicacao(pedido, codigo);
  }

  // O registo do clique NÃO bloqueia o redirecionamento. Se o Supabase
  // estiver lento ou em baixo, a pessoa segue à mesma para o parceiro.
  await registarClique({
    parceiroId: parceria.id,
    clickId,
    superficie,
    variante,
    origemSlug: slug,
    intent: intent ?? null,
    destinoHost: link.host,
    destinoCaminho: link.caminho,
    dispositivo: classificarDispositivo(pedido.headers.get("user-agent")),
  });

  return NextResponse.redirect(link.url, { status: 302, headers: cabecalhos() });
}
