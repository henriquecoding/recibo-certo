import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { criarHandoff, previsualizarHandoff, type CampoHandoff, type PropostaHandoff, ROTULO_CAMPO } from "@/lib/fiz/handoff.server";
import { utilizadorDoPedido, servicoSupabase, identidadeDoUtilizador } from "@/lib/fiz/session.server";
import { CAMPOS_IDENTIFICAVEIS } from "@/lib/fiz/handoff-fields";
import { respostaErro, semCache } from "@/lib/fiz/route-helpers.server";
import { POLITICA_CONSENTIMENTO_VERSAO, fizServerConfig } from "@/lib/fiz/config";
import { manifesto } from "@/lib/guias/manifests";
import { versaoDoGuia } from "@/lib/fiz/guide-routing.server";
import type { Intent, ProfilePrefill, SimulationSummary } from "@/lib/fiz/contracts";
import { previewAtivo, destinoDePreview } from "@/lib/fiz/preview.server";
import { rotaDoSimulador, type SimuladorId } from "@/content/fiz-simulator-routes";
import { parceriaAtiva, parceriasAtivas } from "@/lib/parcerias/catalogo.server";
import { guardaFiz } from "@/lib/fiz/gate.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CAMPOS_VALIDOS = Object.keys(ROTULO_CAMPO) as CampoHandoff[];

/**
 * Cria um handoff consentido para a FIZ.
 *
 * NÃO verifica plano nem subscrição: enviar uma simulação para a FIZ é
 * gratuito e não depende do Plus (ponto 8.4 da auditoria e decisão fixa
 * n.º 4). O que é obrigatório é o consentimento explícito, com os campos
 * que o utilizador viu.
 */
export async function POST(req: NextRequest) {
  // ⚠️ RC-FIZ-002 — porta do servidor. Esta rota aceita ou transporta dados;
  // com a integração desligada não pode sequer ler o corpo do pedido.
  const fechada = guardaFiz();
  if (fechada) return fechada;

  try {
    const corpo = (await req.json().catch(() => null)) as {
      slug?: string;
      simulador?: SimuladorId;
      intent?: Intent;
      campos?: string[];
      camposAutorizados?: string[];
      profile?: PropostaHandoff["profile"];
      simulationSummary?: PropostaHandoff["simulationSummary"];
      /** Forma crua vinda dos simuladores, convertida abaixo. */
      valores?: {
        entityType?: string; activityCategory?: string; vatTerritory?: string;
        vatRegimeEstimate?: string; period?: SimulationSummary["period"];
        grossEstimate?: number; vatEstimate?: number; withholdingEstimate?: number;
        socialSecurityEstimate?: number; irsEstimate?: number;
      };
      sourceType?: "guia" | "simulador" | "dashboard";
    } | null;

    // A intenção vem do manifesto/rota, nunca do cliente quando há um
    // simulador identificado — assim ninguém pode pedir uma intenção que a
    // superfície de origem não autoriza.
    const rotaSim = corpo?.simulador ? rotaDoSimulador(corpo.simulador) : undefined;
    const intent: Intent | undefined = rotaSim?.intent ?? corpo?.intent;

    if (!corpo || !intent) {
      return NextResponse.json({ erro: "Falta a intenção do handoff.", codigo: "invalido" }, { status: 400, headers: semCache });
    }

    // ── Defesa em profundidade ──────────────────────────────────────────
    // Em modo LIGACAO não há transporte de dados, e a interface já não abre
    // o diálogo. Isso não chega: uma recusa que vive só no cliente é uma
    // sugestão. Aqui o servidor fecha a porta, com código próprio para o
    // caso ser distinguível de um erro genérico nos registos.
    //
    // ⚠️ O interruptor geral (`PARCERIAS_DESLIGADAS`) tem de RECUSAR, não de
    // saltar a verificação. Isto esteve dentro de um `if (parceriasAtivas())`,
    // o que invertia o seu sentido: com as parcerias desligadas o guarda de
    // modo deixava de correr e a execução seguia para `criarHandoff` — ou
    // seja, o único estado em que NADA pode ser enviado era precisamente o
    // estado em que tudo passava. Um interruptor de emergência que abre a
    // porta é pior do que não existir.
    if (!parceriasAtivas()) {
      return NextResponse.json(
        {
          erro: "As parcerias estão desativadas. Nenhum dado é enviado para fora do Recibo Certo.",
          codigo: "parcerias_desligadas",
        },
        { status: 409, headers: semCache },
      );
    }
    const parceria = await parceriaAtiva("fiz");
    if (!parceria || parceria.modo === "LIGACAO") {
      return NextResponse.json(
        {
          erro:
            "A parceria está em modo de ligação simples: não há transferência de dados. Abre a FIZ pelo botão e a tua simulação fica aqui.",
          codigo: "modo_nao_permite",
        },
        { status: 409, headers: semCache },
      );
    }
    if (corpo.simulador && !rotaSim) {
      return NextResponse.json({ erro: "Simulador desconhecido.", codigo: "nao_encontrado" }, { status: 404, headers: semCache });
    }

    const m = corpo.slug ? manifesto(corpo.slug) : undefined;
    if (corpo.slug && !m) {
      return NextResponse.json({ erro: "Guia desconhecido.", codigo: "nao_encontrado" }, { status: 404, headers: semCache });
    }

    // Duas fronteiras, não uma. A primeira é o vocabulário global (o campo
    // existe?); a segunda é o que ESTE simulador declarou propor. Sem a
    // segunda, bastaria pôr um campo extra no corpo do pedido para o pedir
    // numa superfície que nunca foi desenhada para o oferecer.
    const permitidos = rotaSim
      ? (c: CampoHandoff) => rotaSim.camposPropostos.includes(c)
      : () => true;

    const campos = (corpo.campos ?? []).filter(
      (c): c is CampoHandoff => CAMPOS_VALIDOS.includes(c as CampoHandoff) && permitidos(c as CampoHandoff),
    );
    const autorizados = (corpo.camposAutorizados ?? []).filter(
      (c): c is CampoHandoff => CAMPOS_VALIDOS.includes(c as CampoHandoff) && permitidos(c as CampoHandoff),
    );

    if (autorizados.length === 0) {
      return NextResponse.json(
        { erro: "É preciso autorizar pelo menos um campo antes de continuar.", codigo: "invalido" },
        { status: 422, headers: semCache },
      );
    }

    // Converte os valores crus do simulador para as formas do contrato.
    const perfilDeValores: ProfilePrefill | undefined = corpo.valores
      ? {
          ...(corpo.valores.entityType ? { entityType: corpo.valores.entityType as ProfilePrefill["entityType"] } : {}),
          ...(corpo.valores.activityCategory ? { activityCategory: corpo.valores.activityCategory } : {}),
          ...(corpo.valores.vatTerritory ? { vatTerritory: corpo.valores.vatTerritory as ProfilePrefill["vatTerritory"] } : {}),
          ...(corpo.valores.vatRegimeEstimate ? { vatRegimeEstimate: corpo.valores.vatRegimeEstimate as ProfilePrefill["vatRegimeEstimate"] } : {}),
        }
      : undefined;

    const resumoDeValores: SimulationSummary | undefined =
      corpo.valores?.grossEstimate !== undefined
        ? {
            currency: "EUR",
            period: corpo.valores.period ?? "ANNUAL",
            grossEstimate: corpo.valores.grossEstimate,
            ...(corpo.valores.vatEstimate !== undefined ? { vatEstimate: corpo.valores.vatEstimate } : {}),
            ...(corpo.valores.withholdingEstimate !== undefined ? { withholdingEstimate: corpo.valores.withholdingEstimate } : {}),
            ...(corpo.valores.socialSecurityEstimate !== undefined ? { socialSecurityEstimate: corpo.valores.socialSecurityEstimate } : {}),
            ...(corpo.valores.irsEstimate !== undefined ? { irsEstimate: corpo.valores.irsEstimate } : {}),
          }
        : undefined;

    // ── Identificação ────────────────────────────────────────────────
    // Os valores NUNCA vêm do corpo do pedido. O cliente diz que campos o
    // utilizador autorizou; o servidor relê nome, NIF, email e telefone do
    // perfil autenticado. Sem sessão não há identificação a enviar — e o
    // handoff continua válido com o resto.
    const utilizador = await utilizadorDoPedido(req);
    const pediuIdentificacao = autorizados.some((c) => CAMPOS_IDENTIFICAVEIS.includes(c));
    const identidade = pediuIdentificacao && utilizador
      ? await identidadeDoUtilizador(utilizador)
      : undefined;

    // Um campo autorizado para o qual não temos valor é descartado em
    // silêncio: pedir ao utilizador que volte atrás para desmarcar algo que
    // não existe seria só atrito.
    const identificaveisResolvidos = identidade
      ? CAMPOS_IDENTIFICAVEIS.filter((c) => identidade[c as keyof typeof identidade])
      : [];
    const autorizadosFinal = autorizados.filter(
      (c) => !CAMPOS_IDENTIFICAVEIS.includes(c) || identificaveisResolvidos.includes(c),
    );

    if (autorizadosFinal.length === 0) {
      return NextResponse.json(
        {
          erro: "Não conseguimos confirmar os teus dados de identificação. Escolhe outro campo ou completa o perfil.",
          codigo: "invalido",
        },
        { status: 422, headers: semCache },
      );
    }

    const proposta: PropostaHandoff = {
      intent,
      campos,
      profile: corpo.profile ?? perfilDeValores,
      identity: identidade,
      simulationSummary: corpo.simulationSummary ?? resumoDeValores,
      sourceContext: m
        ? {
            guideSlug: m.slug,
            guideVersion: versaoDoGuia(m.slug),
            topic: m.fizAction?.topic ?? "OTHER",
            intent,
            audience: m.audiences[0] ?? "MIXED",
            placement: "NEXT_STEP",
          }
        : undefined,
    };

    // Pré-visualização: mostra-se o percurso completo, incluindo o ecrã de
    // consentimento, mas nada sai daqui. O destino é uma página nossa.
    if (previewAtivo()) {
      return NextResponse.json(
        {
          url: destinoDePreview(),
          preview: true,
          camposQueSeriamEnviados: autorizadosFinal,
          aviso: "Pré-visualização: nenhum dado foi enviado para a FIZ.",
        },
        { headers: semCache },
      );
    }

    const { handoff, url, consentReceiptId } = await criarHandoff(proposta, autorizadosFinal);

    // Registo de auditoria: guardamos a prova do que foi enviado (hash),
    // nunca os valores. Se o Supabase não estiver disponível, o handoff
    // continua válido — o registo é best-effort e não bloqueia o utilizador.
    const sb = servicoSupabase();
    if (sb) {
      const previsualizado = previsualizarHandoff(proposta).filter((p) => autorizadosFinal.includes(p.campo));
      const hash = createHash("sha256").update(JSON.stringify(previsualizado)).digest("hex");
      const { error } = await sb.from("partner_handoffs").insert({
        user_id: utilizador?.id ?? null,
        external_handoff_id: handoff.externalHandoffId,
        partner_handoff_id: handoff.id,
        source_type: corpo.sourceType ?? (m ? "guia" : "simulador"),
        source_id: m?.slug ?? null,
        intent,
        consent_receipt_id: consentReceiptId,
        consent_policy_version: POLITICA_CONSENTIMENTO_VERSAO,
        consent_fields: autorizadosFinal,
        payload_hash: hash,
        status: "pending",
        expires_at: handoff.expiresAt ?? new Date(Date.now() + fizServerConfig().handoffTtlSegundos * 1000).toISOString(),
      });
      if (error) console.warn("[fiz] handoff criado mas não registado:", error.message);
    }

    return NextResponse.json(
      {
        url,
        handoffId: handoff.id,
        expiraEm: handoff.expiresAt,
        consentReceiptId,
        // O que saiu de facto. Pode ser menos do que o autorizado se algum
        // campo de identificação não tinha valor no perfil.
        camposEnviados: autorizadosFinal,
      },
      { headers: semCache },
    );
  } catch (erro) {
    return respostaErro(erro);
  }
}
