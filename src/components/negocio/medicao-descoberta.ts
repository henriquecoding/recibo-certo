"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A MEDIÇÃO DO MOTOR DE DESCOBERTA
//  ---------------------------------------------------------------------
//  A ferramenta nasceu sem medição nenhuma, e a disciplina de crescimento
//  é explícita: em fluxos novos a medição é obrigatória. Sem ela não há
//  como saber se alguém chega a ver um dossier, quanto mais se chega a
//  provar alguma coisa — e a escada de decisão do relatório mestre §12 é
//  precisamente o que este ficheiro instrumenta.
//
//  Não há eventos novos. `tool_id` novo e `step_id` próprios sobre os
//  eventos que já existem — inventar vocabulário seria o defeito que o
//  dicionário de `analytics/eventos.ts` existe para impedir.
//
//  ── O QUE NUNCA SAI DAQUI ──────────────────────────────────────────
//  A zona escolhida · competências · capital · a hipótese que está a ser
//  testada · datas de entrevistas ou vendas · qualquer valor. Uma zona
//  cruzada com uma hipótese e uma venda datada identifica uma pessoa num
//  concelho pequeno, e a barreira de `pii.ts` não conhece essa
//  combinação — a regra é anterior à barreira.
//
//  O que sai: em que passo se está, quantas provas existem EM BALDE, e o
//  estado do gate, que é público e igual para toda a gente.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useRef } from "react";
import { registar } from "@/lib/analytics/cliente";

import { APP_VERSION } from "@/lib/version";
import type { MarketOpportunityState } from "@/lib/negocio/market/tipos";

export const FERRAMENTA_DESCOBERTA = "descobrir-negocio";

/**
 * O estado do gate no vocabulário de confiança do catálogo.
 *
 * `template` e `stale` são `estimado`: existe um dossier, não existe
 * evidência que o sustente. `contradicted` é `fora_de_escopo` porque é
 * exatamente isso — uma hipótese que o motor deixou de suportar, e sobre
 * a qual nenhuma rota comercial pode ser aberta.
 */
const CONFIANCA: Readonly<Record<MarketOpportunityState, "estimado" | "completo" | "fora_de_escopo">> = {
  template: "estimado",
  signal_detected: "estimado",
  candidate: "estimado",
  evidence_qualified: "completo",
  user_validated: "completo",
  operating: "completo",
  stale: "estimado",
  contradicted: "fora_de_escopo",
};

export interface SinaisDeMedicaoDescoberta {
  ativo: boolean;
  /** Há um dossier aberto neste momento? */
  dossierAberto: boolean;
  /** Estados do gate de todas as hipóteses visíveis, já calculados. */
  estados: readonly MarketOpportunityState[];
  /** Quantas hipóteses têm pelo menos uma prova registada. */
  hipotesesComProva: number;
  /** Quantas têm prova comercial atual — não entrevista. */
  hipotesesComProvaPaga: number;
  /** Alguma hipótese já trouxe um cenário de preço concluído. */
  temPrecoConcluido: boolean;
  /** Alguma tem os requisitos críticos confirmados. */
  temRequisitosRevistos: boolean;
}

export function useMedicaoDescoberta({
  ativo,
  dossierAberto,
  estados,
  hipotesesComProva,
  hipotesesComProvaPaga,
  temPrecoConcluido,
  temRequisitosRevistos,
}: SinaisDeMedicaoDescoberta) {
  const iniciado = useRef(false);
  const completou = useRef(false);
  const viuResultado = useRef(false);
  const passos = useRef<Set<string>>(new Set());

  // ── Arranque ────────────────────────────────────────────────────
  useEffect(() => {
    if (!ativo || iniciado.current) return;
    iniciado.current = true;
    registar("simulator_start", {
      // O cenário é a ferramenta, nunca a hipótese que a pessoa abriu.
      scenario_type: "descoberta_negocio",
      tool_id: FERRAMENTA_DESCOBERTA,
      entry_page: typeof window === "undefined" ? "" : window.location.pathname,
      user_state: "anonimo",
    });
  }, [ativo]);

  // ── A escada de decisão do §12 ──────────────────────────────────
  //  Deliberadamente sem «clicou no cartão»: o relatório diz para não
  //  otimizar cliques no cartão, e um evento que existe acaba sempre por
  //  ser otimizado por alguém.
  useEffect(() => {
    if (!ativo) return;

    const melhor = estados.includes("evidence_qualified") || estados.includes("user_validated");
    const marcos: readonly [string, boolean][] = [
      ["dossier_aberto", dossierAberto],
      ["sinal_oficial_visto", estados.some((estado) => estado !== "template")],
      ["hipotese_guardada", hipotesesComProva > 0],
      ["requisitos_revistos", temRequisitosRevistos],
      ["preco_concluido", temPrecoConcluido],
      ["prova_paga_registada", hipotesesComProvaPaga > 0],
      ["hipotese_sustentada", melhor],
    ];

    for (const [id, atingido] of marcos) {
      if (!atingido || passos.current.has(id)) continue;
      passos.current.add(id);
      registar("simulator_step", {
        tool_id: FERRAMENTA_DESCOBERTA,
        step_id: id,
        outcome: "ok",
      });
    }
  }, [
    ativo,
    dossierAberto,
    estados,
    hipotesesComProva,
    hipotesesComProvaPaga,
    temPrecoConcluido,
    temRequisitosRevistos,
  ]);

  // ── Conclusão ───────────────────────────────────────────────────
  //  Não é «abriu a ferramenta». É a definição do relatório: a hipótese
  //  atravessou o gate com preço viável e requisitos conhecidos, ou
  //  alguém já pagou. Menos do que isso não é uma decisão tomada.
  useEffect(() => {
    if (!ativo || completou.current) return;
    const decidiu = estados.some(
      (estado) =>
        estado === "evidence_qualified" || estado === "user_validated" || estado === "operating",
    );
    if (!decidiu) return;
    completou.current = true;
    registar("simulator_complete", {
      tool_id: FERRAMENTA_DESCOBERTA,
      fiscal_year: new Date().getFullYear(),
      confidence_state: "completo",
    });
  }, [ativo, estados]);

  // ── Vista do resultado ──────────────────────────────────────────
  //  Só quando existe evidência externa a olhar. Um catálogo de cinco
  //  ideias sem um único sinal é um cartaz, não um resultado.
  useEffect(() => {
    if (!ativo || viuResultado.current || !dossierAberto) return;
    const comSinal = estados.filter((estado) => estado !== "template");
    if (comSinal.length === 0) return;
    viuResultado.current = true;
    registar("result_view", {
      tool_id: FERRAMENTA_DESCOBERTA,
      result_version: APP_VERSION,
      methodology_version: APP_VERSION,
    });
  }, [ativo, dossierAberto, estados]);
}

/** O estado do gate traduzido para a confiança do catálogo de eventos. */
export const confiancaDoEstado = (estado: MarketOpportunityState) => CONFIANCA[estado];

/**
 * Uma prova registada — a única ação desta ferramenta que persiste algo.
 *
 * `result_save` tem forma fixa no catálogo e é isso que é enviado. Houve
 * aqui a tentação de acrescentar um balde com o número de provas por um
 * cast; um campo não declarado a entrar num evento declarado é
 * exatamente o que o dicionário existe para impedir, e a contagem já está
 * coberta pelos marcos de `simulator_step`.
 */
export function registarProvaGuardada() {
  registar("result_save", {
    tool_id: FERRAMENTA_DESCOBERTA,
    action: "guardar_local",
    account_state: "anonimo",
    paywall_state: "sem_paywall",
  });
}
