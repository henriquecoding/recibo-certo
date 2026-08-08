// ═══════════════════════════════════════════════════════════════════════
//  GET /api/admin/painel — o scorecard semanal do §8.3
//  ---------------------------------------------------------------------
//  «Sem medição, qualquer debate entre SEO, Reddit, YouTube, subscrição ou
//  leads será uma disputa de opiniões.» Esta rota é o outro lado da
//  camada de eventos: apura a DVM, a ativação e a cobertura da
//  instrumentação a partir do que foi realmente recebido.
//
//  Duas escolhas que decidem se o painel é honesto:
//
//   · A JANELA É `recebido_em`, o relógio do servidor. `ocorrido_em` vem
//     do cliente e um relógio adiantado põe eventos na semana errada.
//
//   · «SEM DADOS» É UMA RESPOSTA VÁLIDA. Enquanto não houver eventos, os
//     blocos devolvem `null` e a interface diz que não sabe. Um painel que
//     mostra 0% quando devia dizer «ainda não medimos isto» é pior do que
//     painel nenhum: dá a sensação de conhecimento sem o conhecimento.
// ═══════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { pedidoDeAdmin } from "@/lib/supabase/verify-request-admin";
import { apurarDVM, taxaDeAtivacao, type EventoParaDVM } from "@/lib/analytics/dvm";
import { CATALOGO, type NomeEvento } from "@/lib/analytics/eventos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Teto de segurança: uma janela de 30 dias não deve puxar meio milhão de linhas. */
const MAX_LINHAS = 50_000;

interface Linha {
  nome: NomeEvento;
  ator: string;
  sessao: string;
  props: Record<string, unknown> | null;
  recebido_em: string;
}

export async function GET(req: Request) {
  if (!(await pedidoDeAdmin(req))) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    return NextResponse.json({ erro: "Medição não configurada." }, { status: 503 });
  }

  const dias = Math.min(Math.max(Number(new URL(req.url).searchParams.get("dias") ?? 7), 1), 90);
  const desde = new Date(Date.now() - dias * 86_400_000).toISOString();

  const sb = createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await sb
    .from("analytics_eventos")
    .select("nome, ator, sessao, props, recebido_em")
    .gte("recebido_em", desde)
    .order("recebido_em", { ascending: false })
    .limit(MAX_LINHAS);

  if (error) {
    return NextResponse.json({ erro: "Não foi possível ler os eventos." }, { status: 500 });
  }

  const linhas = (data ?? []) as Linha[];

  // ── DVM ───────────────────────────────────────────────────────────
  const paraDVM: EventoParaDVM[] = linhas
    .filter((l) => l.nome === "simulator_complete" || l.nome === "result_view")
    .map((l) => ({
      nome: l.nome,
      ator: l.ator,
      sessao: l.sessao,
      tool_id: typeof l.props?.tool_id === "string" ? l.props.tool_id : undefined,
      confidence_state: l.props?.confidence_state as EventoParaDVM["confidence_state"],
      em: l.recebido_em,
    }));

  const dvm = apurarDVM(paraDVM);
  const starts = linhas.filter((l) => l.nome === "simulator_start").length;

  // ── Contagem por evento e cobertura da instrumentação ──────────────
  const porEvento: Record<string, number> = {};
  for (const l of linhas) porEvento[l.nome] = (porEvento[l.nome] ?? 0) + 1;

  const doCliente = (Object.keys(CATALOGO) as NomeEvento[]).filter(
    (n) => CATALOGO[n].origem === "cliente",
  );
  const recebidos = doCliente.filter((n) => (porEvento[n] ?? 0) > 0);

  // ── Origem ────────────────────────────────────────────────────────
  const porOrigem: Record<string, number> = {};
  for (const l of linhas) {
    const fonte = typeof l.props?.source === "string" ? l.props.source : "(desconhecida)";
    porOrigem[fonte] = (porOrigem[fonte] ?? 0) + 1;
  }

  const temDados = linhas.length > 0;

  return NextResponse.json({
    janela: { dias, desde },
    temDados,
    truncado: linhas.length >= MAX_LINHAS,
    eventos: { total: linhas.length, porEvento, porOrigem },
    cobertura: {
      esperados: doCliente.length,
      recebidos: recebidos.length,
      emFalta: doCliente.filter((n) => !recebidos.includes(n)),
    },
    dvm: temDados
      ? {
          utilizadores: dvm.dvm,
          decisoes: dvm.decisoes,
          porFerramenta: dvm.porFerramenta,
          decisoesPorUtilizador: dvm.dvm > 0 ? dvm.decisoes / dvm.dvm : null,
        }
      : null,
    ativacao: starts > 0 ? taxaDeAtivacao(dvm.dvm, starts) : null,
    starts,
  });
}
