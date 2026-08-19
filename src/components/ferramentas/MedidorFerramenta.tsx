"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A MEDIÇÃO DE TODAS AS FERRAMENTAS, NUM SÍTIO SÓ
//  ---------------------------------------------------------------------
//  `simulator_complete` e `result_view` estão declarados em
//  `analytics/eventos.ts` desde sempre, cada um com a pergunta do painel
//  semanal a que serve. Nenhum componente da aplicação os disparava — nem
//  um. A North Star do produto é DVM = utilizadores únicos com
//  `simulator_complete` + `result_view` válido, e por isso estava
//  estruturalmente a ZERO: não é que fosse baixa, é que não podia ser
//  outra coisa.
//
//  ── PORQUE É QUE ISTO VIVE NO `ToolShell` ───────────────────────────
//  Porque a alternativa é instrumentar quinze componentes, cada um com a
//  sua ideia do que significa «acabou». Quinze definições de conclusão
//  produzem dados que não se somam — e um painel que soma coisas
//  diferentes é pior do que um painel vazio, porque parece que funciona.
//
//  O `ToolShell` já envolve a zona interativa de todas as ferramentas
//  (`<div id="ferramenta">`). Medir aqui é medir uma vez, da mesma
//  maneira, para todas.
//
//  ── O QUE CONTA COMO «CONCLUÍDO» ────────────────────────────────────
//  Estas ferramentas calculam em tempo real: não há botão «calcular», o
//  resultado existe e vai-se afinando. Para elas, a definição honesta de
//  conclusão é «a pessoa mexeu em alguma coisa e ficou a ver o que
//  aconteceu». É isso que se mede:
//
//    1. houve uma mudança num controlo dentro da zona da ferramenta;
//    2. passaram ESPERA_MS sem sair da página.
//
//  A espera não é cosmética: sem ela, tocar num campo e fechar o
//  separador contava como uma simulação concluída, e a métrica media
//  cliques em vez de decisões.
//
//  ── O QUE NÃO SAI DAQUI ─────────────────────────────────────────────
//  Nenhum valor. O ouvinte lê `event.type`, nunca `event.target.value`,
//  e o payload leva o id da ferramenta e mais nada. A barreira de
//  `pii.ts` recusaria o resto de qualquer forma, mas a regra é anterior à
//  barreira.
//
//  ── QUEM FICA DE FORA, E PORQUÊ ─────────────────────────────────────
//  · `kind: "map"` — um diretório com um mapa não é uma simulação, e
//    contá-lo como tal inflaciona a North Star com navegação;
//  · a calculadora de preço, que mede a sua própria conclusão com uma
//    definição melhor (o essencial do cenário todo respondido) e passa
//    `medir={false}` para não disparar duas vezes.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useRef, type ReactNode } from "react";
import { registar } from "@/lib/analytics/cliente";
import { APP_VERSION } from "@/lib/version";
import { FISCAL_YEAR } from "@/lib/fiscal-year";
import type { ToolDefinition } from "@/lib/ferramentas";

/** Quanto tempo a pessoa tem de ficar depois de mexer. */
const ESPERA_MS = 2_000;

export default function MedidorFerramenta({
  tool,
  children,
}: {
  tool: ToolDefinition;
  children: ReactNode;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const arrancou = useRef(false);
  const concluiu = useRef(false);

  // ── Arranque ───────────────────────────────────────────────────────
  useEffect(() => {
    if (arrancou.current) return;
    arrancou.current = true;
    registar("simulator_start", {
      tool_id: tool.id,
      scenario_type: tool.kind,
      entry_page: typeof window === "undefined" ? "" : window.location.pathname,
      user_state: "anonimo",
    });
  }, [tool.id, tool.kind]);

  // ── Conclusão e vista do resultado ─────────────────────────────────
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;

    let temporizador: number | undefined;

    const aoMudar = () => {
      if (concluiu.current) return;
      window.clearTimeout(temporizador);
      temporizador = window.setTimeout(() => {
        if (concluiu.current) return;
        concluiu.current = true;

        // Os dois eventos que a DVM cruza. Nestas ferramentas coincidem no
        // tempo, e isso é verdade e não um atalho: quando o resultado se
        // recalcula sozinho, concluir a simulação É ver o resultado.
        registar("simulator_complete", {
          tool_id: tool.id,
          fiscal_year: FISCAL_YEAR,
          // `estimado` porque é o que estas ferramentas produzem sem que
          // ninguém confirme o enquadramento fiscal. Quem souber medir
          // melhor mede-se a si próprio, como a calculadora de preço.
          confidence_state: "estimado",
        });
        registar("result_view", {
          tool_id: tool.id,
          result_version: APP_VERSION,
          methodology_version: APP_VERSION,
        });
      }, ESPERA_MS);
    };

    // Captura, para apanhar também os controlos que param a propagação.
    // Só o TIPO do evento é lido; o valor nunca é tocado.
    el.addEventListener("input", aoMudar, true);
    el.addEventListener("change", aoMudar, true);

    return () => {
      window.clearTimeout(temporizador);
      el.removeEventListener("input", aoMudar, true);
      el.removeEventListener("change", aoMudar, true);
    };
  }, [tool.id]);

  return (
    <div ref={caixa} id="ferramenta" className="scroll-mt-24">
      {children}
    </div>
  );
}
