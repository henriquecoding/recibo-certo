"use client";

// ─────────────────────────────────────────────────────────────────────
//  Medição da pesquisa — a consulta NUNCA sai do dispositivo.
//
//  Este módulo existe para haver um sítio, e um só, onde se decide o que
//  é observável de uma pesquisa. Espalhar `registar(...)` pelos
//  componentes acabaria, mais cedo do que tarde, com alguém a mandar a
//  frase escrita «só para depurar». Aqui a frase entra e não sai: as
//  funções recebem a consulta e devolvem baldes.
// ─────────────────────────────────────────────────────────────────────

import { registar } from "@/lib/analytics/cliente";
import { baldeDeComprimento, baldeDeContagem, baldeDeTempo, type ClasseViewport } from "@/lib/analytics/eventos";
import { VERSAO_INDICE, type FiltroIntencao } from "./esquema";
import type { PlanoBusca } from "./plano";
import { tokens } from "./normalizar";

export interface ContextoMedicao {
  viewport: ClasseViewport;
  pathname: string;
}

/**
 * A família da rota, e não a rota.
 *
 * `/guias/heranca-imovel-partilha` diz o que a pessoa estava a ler; num
 * conjunto pequeno de sessões isso reidentifica. `/guias` responde à
 * pergunta do painel («de onde se pesquisa mais?») sem o fazer.
 */
export function grupoDeRota(pathname: string): string {
  const primeiro = pathname.split("/").filter(Boolean)[0];
  return primeiro ? `/${primeiro}` : "/";
}

export function classeDeViewport(largura: number): ClasseViewport {
  if (largura >= 1024) return "secretaria";
  return largura >= 768 ? "tablet" : "movel";
}

const contexto = (ctx: ContextoMedicao) => ({
  viewport_class: ctx.viewport,
  route_group: grupoDeRota(ctx.pathname),
});

export function medirAbertura(ctx: ContextoMedicao, indiceEmMemoria: boolean) {
  registar("header_search_open", { ...contexto(ctx), load_state: indiceEmMemoria ? "quente" : "frio" });
}

export function medirConsulta(ctx: ContextoMedicao, consulta: string, intencao: FiltroIntencao, resultados: number) {
  registar("header_search_submit", {
    ...contexto(ctx),
    length_bucket: baldeDeComprimento(consulta.trim().length),
    token_count: tokens(consulta).length,
    intent: intencao,
  });
  if (resultados === 0) {
    registar("header_search_zero_results", {
      ...contexto(ctx),
      length_bucket: baldeDeComprimento(consulta.trim().length),
      intent: intencao,
      corpus_version: VERSAO_INDICE,
    });
  }
}

export function medirClique(
  ctx: ContextoMedicao,
  { id, tipo, posicao, intencao }: { id: string; tipo: string; posicao: number; intencao: FiltroIntencao },
) {
  registar("header_search_result_click", {
    ...contexto(ctx),
    document_id: id,
    kind: tipo,
    rank: posicao,
    intent: intencao,
  });
}

export function medirAbandono(
  ctx: ContextoMedicao,
  { tinhaConsulta, resultados, duracaoMs }: { tinhaConsulta: boolean; resultados: number; duracaoMs: number },
) {
  registar("header_search_abandon", {
    ...contexto(ctx),
    had_query: tinhaConsulta,
    result_count_bucket: baldeDeContagem(resultados),
    duration_bucket: baldeDeTempo(duracaoMs),
  });
}

export function medirNavegacao(itemId: string, viewport: ClasseViewport) {
  registar("header_nav_click", { item_id: itemId, viewport_class: viewport });
}

/* ─── A moldura ───────────────────────────────────────────────────── */

/**
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ MEDE-SE A DECISÃO, NUNCA A LEITURA                                   │
 * │                                                                     │
 * │ Estas funções recebem o `PlanoBusca` — que não transporta valores,   │
 * │ só tipos de entidade — e dele tiram forma: que família, que          │
 * │ confiança, quantas entidades, que pergunta se fez. A frase da pessoa │
 * │ não passa por aqui nem podia: não há nenhum parâmetro onde ela       │
 * │ caiba, e a barreira de `pii.ts` recusaria uma chave com «valor» no   │
 * │ nome mesmo que houvesse.                                            │
 * │                                                                     │
 * │ `nenhum` em vez de omitir: um campo ausente e um campo a dizer «não  │
 * │ reconheci nada» são a mesma linha no painel e duas perguntas         │
 * │ diferentes — «quantas consultas não têm família?» só se responde se  │
 * │ a ausência for um valor.                                            │
 * └─────────────────────────────────────────────────────────────────────┘
 */
export function medirPlano(ctx: ContextoMedicao, plano: PlanoBusca) {
  registar("header_search_intent_recognized", {
    ...contexto(ctx),
    domain: plano.dominio ?? "nenhum",
    intent: plano.intencao ?? "nenhuma",
    plan_state: plano.estado,
    confidence: plano.confianca,
    renderer: plano.principal?.renderer ?? "nenhum",
    entity_count: plano.entidades.length,
  });

  if (plano.clarificacao) {
    registar("header_search_clarification_shown", {
      ...contexto(ctx),
      kind: plano.clarificacao.tipo,
      domain: plano.dominio ?? "nenhum",
    });
  }
}

export function medirResposta(ctx: ContextoMedicao, tipo: string, opcao: string) {
  registar("header_search_clarification_answered", { ...contexto(ctx), kind: tipo, answer: opcao });
}

export function medirAcaoPreparada(
  ctx: ContextoMedicao,
  { id, renderer, confianca, campos }: { id: string; renderer: string; confianca: string; campos: number },
) {
  registar("header_search_prepared_action_open", {
    ...contexto(ctx),
    document_id: id,
    renderer,
    confidence: confianca,
    handoff_field_count: campos,
  });
}

export function medirAlternativa(ctx: ContextoMedicao, id: string, posicao: number) {
  registar("header_search_alternate_path_click", { ...contexto(ctx), document_id: id, rank: posicao });
}

export function medirApoio(ctx: ContextoMedicao, principal: boolean, filtros: number) {
  registar("header_search_professional_support_open", {
    ...contexto(ctx),
    as_primary: principal,
    filter_count: filtros,
  });
}
