"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A MEDIÇÃO DESTA FERRAMENTA
//  ---------------------------------------------------------------------
//  A ferramenta disparava `simulator_start` e mais nada. `simulator_step`,
//  `simulator_complete` e `result_view` estavam declarados em
//  `analytics/eventos.ts` desde sempre, com a pergunta do painel a que
//  servem, e nunca eram chamados.
//
//  A consequência não é «faltam gráficos»: é que a North Star do produto
//  — DVM = utilizadores únicos com `simulator_complete` + `result_view`
//  válido — estava estruturalmente a zero para esta ferramenta, e não
//  havia nenhum dado sobre onde é que as pessoas desistem. Reestruturar
//  uma interface sem medir se melhorou é adivinhar duas vezes.
//
//  ── O QUE NÃO ENTRA AQUI ────────────────────────────────────────────
//  Nenhum valor. Nem custo, nem margem, nem preço, nem faturação. A
//  barreira de `pii.ts` recusa-os de qualquer forma, no cliente e no
//  servidor, mas a regra é anterior à barreira: o que se mede é a FORMA
//  do percurso — que cenário, que passo, que confiança — e não o negócio
//  de quem o percorre.
//
//  Eventos NOVOS não se inventam: os quatro que isto usa já estavam
//  declarados no catálogo. Um dicionário paralelo seria o mesmo defeito
//  que o catálogo de ferramentas corrigiu.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useRef } from "react";
import { registar } from "@/lib/analytics/cliente";
import { APP_VERSION } from "@/lib/version";
import type { CenarioInicial, EstadoPreenchimento } from "@/lib/pricing";

const FERRAMENTA = "calcular-preco";

/** Os três estados da interface, traduzidos para o vocabulário do catálogo. */
const CONFIANCA = {
  exemplo: "estimado",
  estimado: "estimado",
  completo: "completo",
} as const;

/**
 * Regista o arranque, cada passo, a conclusão e a vista do resultado.
 *
 * Todos os eventos são idempotentes por natureza: `simulator_complete` e
 * `result_view` disparam UMA vez por sessão de simulação, e um passo
 * dispara uma vez por campo. Sem isso, um simulador que recalcula a cada
 * tecla produziria centenas de eventos por minuto e a métrica mediria a
 * velocidade de escrita de quem a usa.
 */
export function useMedicaoPreco({
  cenario,
  estado,
  respondidos,
  temPreco,
}: {
  cenario: CenarioInicial | null;
  estado: EstadoPreenchimento;
  respondidos: ReadonlySet<string>;
  /** `false` quando o solver não conseguiu resolver — não há resultado a ver. */
  temPreco: boolean;
}) {
  const iniciado = useRef(false);
  const completou = useRef(false);
  const viuResultado = useRef(false);
  const passosDados = useRef<Set<string>>(new Set());

  // ── Arranque ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!cenario || iniciado.current) return;
    iniciado.current = true;
    registar("simulator_start", {
      tool_id: FERRAMENTA,
      scenario_type: cenario,
      entry_page: typeof window === "undefined" ? "" : window.location.pathname,
      user_state: "anonimo",
    });
  }, [cenario]);

  // ── Cada campo respondido pela primeira vez ───────────────────────
  //  `step_id` é o nome do campo — um rótulo NOSSO, nunca o que a pessoa
  //  lá escreveu. É o que permite responder à pergunta que a
  //  reestruturação levantou: quais dos blocos avançados é que alguém
  //  chega mesmo a abrir?
  useEffect(() => {
    if (!cenario) return;
    for (const campo of respondidos) {
      if (passosDados.current.has(campo)) continue;
      passosDados.current.add(campo);
      registar("simulator_step", {
        tool_id: FERRAMENTA,
        step_id: campo,
        outcome: "ok",
      });
    }
  }, [cenario, respondidos]);

  // ── Conclusão ─────────────────────────────────────────────────────
  //  Só quando o essencial do cenário está TODO respondido. É a
  //  definição que `preenchimento.ts` já usa para deixar de chamar
  //  estimativa ao número — e é a única honesta: um `complete` disparado
  //  à primeira tecla mediria intenção, não conclusão.
  useEffect(() => {
    if (!cenario || completou.current || estado !== "completo") return;
    completou.current = true;
    registar("simulator_complete", {
      tool_id: FERRAMENTA,
      fiscal_year: new Date().getFullYear(),
      confidence_state: CONFIANCA[estado],
    });
  }, [cenario, estado]);

  // ── Vista do resultado ────────────────────────────────────────────
  //  Não dispara sobre o número de exemplo: um resultado que a pessoa
  //  não alimentou não é um resultado visto, é um cartaz.
  useEffect(() => {
    if (!cenario || viuResultado.current || !temPreco || estado === "exemplo") return;
    viuResultado.current = true;
    registar("result_view", {
      tool_id: FERRAMENTA,
      result_version: APP_VERSION,
      methodology_version: APP_VERSION,
    });
  }, [cenario, estado, temPreco]);

  // Recomeçar ou mudar de cenário reabre a contagem: é outra simulação.
  const reiniciar = () => {
    completou.current = false;
    viuResultado.current = false;
    passosDados.current = new Set();
  };

  return { reiniciar };
}

/** Guardar, copiar e imprimir — as três saídas locais do resultado. */
export function registarAcaoResultado(accao: "guardar" | "copiar" | "imprimir") {
  if (accao === "guardar") {
    registar("result_save", {
      tool_id: FERRAMENTA,
      action: "guardar_local",
      account_state: "anonimo",
      paywall_state: "sem_paywall",
    });
    return;
  }
  registar("result_export", {
    tool_id: FERRAMENTA,
    action: accao,
    account_state: "anonimo",
    paywall_state: "sem_paywall",
    export_type: accao === "copiar" ? "texto" : "impressao",
  });
}
