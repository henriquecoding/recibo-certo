"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A MEDIÇÃO DO ESTÚDIO
//  ---------------------------------------------------------------------
//  §39: a North Star deste módulo não é «clicou em abrir empresa». É uma
//  decisão VERIFICADA:
//
//      business_model_complete
//        = oferta completa + volume + estrutura + resultado visto
//
//  E mede-se com os eventos que JÁ EXISTEM no catálogo — `tool_id =
//  construir-negocio`, `step_id` novos. Inventar eventos seria o mesmo
//  defeito que o dicionário de `analytics/eventos.ts` existe para
//  impedir: dois vocabulários, a divergir ao terceiro painel.
//
//  ── O QUE NUNCA SAI DAQUI (§25) ────────────────────────────────────
//  Nome do negócio · nome das ofertas · preço · receita · custos ·
//  margem · volume · localização exata · texto livre.
//
//  O que sai: em que passo se está, quantas ofertas há EM BALDE, o estado
//  de confiança, e se a caixa e a comparação chegaram a ser abertas. A
//  barreira de `pii.ts` recusaria os outros de qualquer maneira — mas a
//  regra é anterior à barreira.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useRef } from "react";
import { registar } from "@/lib/analytics/cliente";
import { baldeDeContagem } from "@/lib/analytics/eventos";
import { APP_VERSION } from "@/lib/version";
import type { ConfiancaNegocio } from "@/lib/negocio/tipos";

export const FERRAMENTA_NEGOCIO = "construir-negocio";

/** Os estados do estúdio no vocabulário do catálogo de eventos. */
const CONFIANCA = {
  exploratorio: "estimado",
  estimado: "estimado",
  estruturado: "completo",
} as const;

export function useMedicaoNegocio({
  ativo,
  confianca,
  numeroOfertas,
  temEstrutura,
  temResultado,
  temCaixa,
}: {
  ativo: boolean;
  confianca: ConfiancaNegocio;
  numeroOfertas: number;
  temEstrutura: boolean;
  temResultado: boolean;
  temCaixa: boolean;
}) {
  const iniciado = useRef(false);
  const completou = useRef(false);
  const viuResultado = useRef(false);
  const passos = useRef<Set<string>>(new Set());

  // ── Arranque ────────────────────────────────────────────────────
  useEffect(() => {
    if (!ativo || iniciado.current) return;
    iniciado.current = true;
    registar("simulator_start", {
      tool_id: FERRAMENTA_NEGOCIO,
      // O tipo de cenário é o estúdio, não o negócio da pessoa.
      scenario_type: "estudio_negocio",
      entry_page: typeof window === "undefined" ? "" : window.location.pathname,
      user_state: "anonimo",
    });
  }, [ativo]);

  // ── Os marcos da jornada ────────────────────────────────────────
  //  `step_id` é um rótulo NOSSO. `offer_count_bucket` é um balde, nunca
  //  a contagem exata: com uma contagem, três ofertas num nicho pequeno
  //  chegam a identificar alguém.
  useEffect(() => {
    if (!ativo) return;

    const marcos: [string, boolean][] = [
      ["primeira_oferta", numeroOfertas >= 1],
      ["varias_ofertas", numeroOfertas >= 2],
      ["estrutura_declarada", temEstrutura],
      ["resultado_calculado", temResultado],
      ["caixa_projetada", temCaixa],
    ];

    for (const [id, atingido] of marcos) {
      if (!atingido || passos.current.has(id)) continue;
      passos.current.add(id);
      registar("simulator_step", { tool_id: FERRAMENTA_NEGOCIO, step_id: id, outcome: "ok" });
    }
  }, [ativo, numeroOfertas, temEstrutura, temResultado, temCaixa]);

  // ── Conclusão — a definição do §39, e não menos ─────────────────
  useEffect(() => {
    if (!ativo || completou.current) return;
    const completo = numeroOfertas >= 1 && temResultado && temEstrutura && confianca === "estruturado";
    if (!completo) return;
    completou.current = true;
    registar("simulator_complete", {
      tool_id: FERRAMENTA_NEGOCIO,
      fiscal_year: new Date().getFullYear(),
      confidence_state: CONFIANCA[confianca],
    });
  }, [ativo, confianca, numeroOfertas, temEstrutura, temResultado]);

  // ── Vista do resultado ──────────────────────────────────────────
  //  Nunca sobre um cenário exploratório: um resultado que saiu dos
  //  exemplos não é um resultado visto, é um cartaz.
  useEffect(() => {
    if (!ativo || viuResultado.current || !temResultado || confianca === "exploratorio") return;
    viuResultado.current = true;
    registar("result_view", {
      tool_id: FERRAMENTA_NEGOCIO,
      result_version: APP_VERSION,
      methodology_version: APP_VERSION,
    });
  }, [ativo, confianca, temResultado]);
}

/** O balde de ofertas, para quem precisar dele fora do hook. */
export const baldeDeOfertas = (n: number): string => baldeDeContagem(n);

/** Guardar o projeto — a única saída que persiste alguma coisa. */
export function registarProjetoGuardado(naNuvem: boolean) {
  registar("result_save", {
    tool_id: FERRAMENTA_NEGOCIO,
    action: naNuvem ? "guardar_nuvem" : "guardar_local",
    account_state: naNuvem ? "plus" : "anonimo",
    paywall_state: "sem_paywall",
  });
}
