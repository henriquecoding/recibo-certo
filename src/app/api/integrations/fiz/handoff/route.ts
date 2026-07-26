import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { criarHandoff, previsualizarHandoff, type CampoHandoff, type PropostaHandoff, ROTULO_CAMPO } from "@/lib/fiz/handoff.server";
import { utilizadorDoPedido, servicoSupabase } from "@/lib/fiz/session.server";
import { respostaErro, semCache } from "@/lib/fiz/route-helpers.server";
import { POLITICA_CONSENTIMENTO_VERSAO, fizServerConfig } from "@/lib/fiz/config";
import { manifesto } from "@/lib/guias/manifests";
import { versaoDoGuia } from "@/lib/fiz/guide-routing.server";
import type { Intent } from "@/lib/fiz/contracts";

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
  try {
    const corpo = (await req.json().catch(() => null)) as {
      slug?: string;
      intent?: Intent;
      campos?: string[];
      camposAutorizados?: string[];
      profile?: PropostaHandoff["profile"];
      simulationSummary?: PropostaHandoff["simulationSummary"];
      sourceType?: "guia" | "simulador" | "dashboard";
    } | null;

    if (!corpo?.intent) {
      return NextResponse.json({ erro: "Falta a intenção do handoff.", codigo: "invalido" }, { status: 400, headers: semCache });
    }

    const m = corpo.slug ? manifesto(corpo.slug) : undefined;
    if (corpo.slug && !m) {
      return NextResponse.json({ erro: "Guia desconhecido.", codigo: "nao_encontrado" }, { status: 404, headers: semCache });
    }

    const campos = (corpo.campos ?? []).filter((c): c is CampoHandoff => CAMPOS_VALIDOS.includes(c as CampoHandoff));
    const autorizados = (corpo.camposAutorizados ?? []).filter((c): c is CampoHandoff =>
      CAMPOS_VALIDOS.includes(c as CampoHandoff),
    );

    if (autorizados.length === 0) {
      return NextResponse.json(
        { erro: "É preciso autorizar pelo menos um campo antes de continuar.", codigo: "invalido" },
        { status: 422, headers: semCache },
      );
    }

    const proposta: PropostaHandoff = {
      intent: corpo.intent,
      campos,
      profile: corpo.profile,
      simulationSummary: corpo.simulationSummary,
      sourceContext: m
        ? {
            guideSlug: m.slug,
            guideVersion: versaoDoGuia(m.slug),
            topic: m.fizAction?.topic ?? "OTHER",
            intent: corpo.intent,
            audience: m.audiences[0] ?? "MIXED",
            placement: "NEXT_STEP",
          }
        : undefined,
    };

    const { handoff, url, consentReceiptId } = await criarHandoff(proposta, autorizados);

    // Registo de auditoria: guardamos a prova do que foi enviado (hash),
    // nunca os valores. Se o Supabase não estiver disponível, o handoff
    // continua válido — o registo é best-effort e não bloqueia o utilizador.
    const utilizador = await utilizadorDoPedido(req);
    const sb = servicoSupabase();
    if (sb) {
      const previsualizado = previsualizarHandoff(proposta).filter((p) => autorizados.includes(p.campo));
      const hash = createHash("sha256").update(JSON.stringify(previsualizado)).digest("hex");
      const { error } = await sb.from("partner_handoffs").insert({
        user_id: utilizador?.id ?? null,
        external_handoff_id: handoff.externalHandoffId,
        partner_handoff_id: handoff.id,
        source_type: corpo.sourceType ?? (m ? "guia" : "simulador"),
        source_id: m?.slug ?? null,
        intent: corpo.intent,
        consent_receipt_id: consentReceiptId,
        consent_policy_version: POLITICA_CONSENTIMENTO_VERSAO,
        consent_fields: autorizados,
        payload_hash: hash,
        status: "pending",
        expires_at: handoff.expiresAt ?? new Date(Date.now() + fizServerConfig().handoffTtlSegundos * 1000).toISOString(),
      });
      if (error) console.warn("[fiz] handoff criado mas não registado:", error.message);
    }

    return NextResponse.json(
      { url, handoffId: handoff.id, expiraEm: handoff.expiresAt, consentReceiptId },
      { headers: semCache },
    );
  } catch (erro) {
    return respostaErro(erro);
  }
}
