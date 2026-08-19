"use client";

// ═══════════════════════════════════════════════════════════════════════
//  «As tuas horas a sério».
//  ---------------------------------------------------------------------
//  O bloco que corrige o erro mais comum de quem vende tempo: dividir o
//  rendimento pretendido por 160 horas. Ninguém fatura 160 horas por mês.
//  Tiram-se férias, feriados, semanas sem clientes e a fatia de tempo que
//  é proposta, prospeção, administração, deslocação e pós-venda.
//
//  A âncora dos 50–75% não é um palpite nosso: vem de
//  `TAXA_FATURAVEL_PADRAO`, em `pricing/regras.ts`, com fonte e data.
// ═══════════════════════════════════════════════════════════════════════

import { TAXA_FATURAVEL_PADRAO, calcularTempo } from "@/lib/pricing";
import { CampoNumero, CampoPercentagem } from "../atomos";
import type { PropsBloco } from "./tipos";

export default function Tempo({ contexto, atualizar }: PropsBloco) {
  if (!contexto.tempo) return null;

  // A mesma aritmética do motor, não uma cópia dela: as férias, os
  // feriados e as semanas sem clientes saem todos daqui. Os custos fixos
  // e a fração fiscal ficam a zero porque aqui só interessam as HORAS —
  // o valor/hora é do resultado, não deste bloco.
  const horasUteis = calcularTempo({ tempo: contexto.tempo, custosFixosAnuais: 0, fracaoFiscal: 0 })
    ?.horasProdutivasMes ?? 0;

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoNumero
          id="horas-semana"
          rotulo="Horas de trabalho por semana"
          descricao="As que trabalhas, não as que faturas — a fatia faturável é o campo ao lado."
          valor={contexto.tempo.horasSemana}
          aoMudar={(v) => atualizar("horas-semana", (c) => void (c.tempo && (c.tempo.horasSemana = v)))}
          sufixo="h"
          max={100}
        />
        <CampoPercentagem
          id="taxa-faturavel"
          rotulo="Percentagem de horas faturáveis"
          ajuda={`${TAXA_FATURAVEL_PADRAO.descricao} Fonte: ${TAXA_FATURAVEL_PADRAO.fonte}.`}
          descricao="O resto é proposta, prospeção, administração, deslocação, formação e pós-venda. Entre 50% e 75% é o intervalo defensável."
          valor={contexto.tempo.taxaFaturavel}
          aoMudar={(v) => atualizar("taxa-faturavel", (c) => void (c.tempo && (c.tempo.taxaFaturavel = v)))}
          max={100}
        />
        <CampoNumero
          id="semanas-ferias"
          rotulo="Semanas de férias"
          descricao="Não tens férias pagas: se não trabalhas, não faturas. Por isso as férias entram no preço."
          valor={contexto.tempo.semanasFerias}
          aoMudar={(v) => atualizar("semanas-ferias", (c) => void (c.tempo && (c.tempo.semanasFerias = v)))}
          sufixo="sem."
          decimais={1}
          max={30}
        />
        <CampoNumero
          id="semanas-sem-cliente"
          rotulo="Semanas por ano sem clientes"
          descricao="Sazonalidade, arranque, o mês em que ninguém responde. Uma estimativa honesta protege o preço."
          valor={contexto.tempo.semanasSemCliente}
          aoMudar={(v) => atualizar("semanas-sem-cliente", (c) => void (c.tempo && (c.tempo.semanasSemCliente = v)))}
          sufixo="sem."
          decimais={1}
          max={40}
        />
      </div>

      {horasUteis > 0 ? (
        <p className="mt-3 rounded-xl bg-stone-50 px-3 py-2.5 text-xs leading-relaxed text-stone-600 dark:bg-stone-800/40 dark:text-stone-400">
          Com estes números sobram-te{" "}
          <strong className="font-semibold tabular-nums text-stone-800 dark:text-stone-100">
            {horasUteis.toFixed(0)} horas faturáveis por mês
          </strong>
          , não {contexto.tempo.horasSemana * 4}. É por elas que o teu rendimento se divide.
        </p>
      ) : null}
    </div>
  );
}
