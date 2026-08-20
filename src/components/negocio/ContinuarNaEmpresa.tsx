"use client";

// ═══════════════════════════════════════════════════════════════════════
//  «QUERES VER ESTE MESMO NEGÓCIO COMO EMPRESA?»
//  ---------------------------------------------------------------------
//  §19 e §113 do relatório. A saída do Estúdio para o Simulador de
//  Empresa era um `<Link>` — mudava de página e deixava o trabalho para
//  trás. A pessoa acabava de definir faturação, custos, estrutura, equipa
//  e região, e chegava a campos vazios.
//
//  ── PORQUE É QUE HÁ UMA REVISÃO ANTES DE NAVEGAR ───────────────────
//  Porque preencher campos por magia é pior do que não os preencher. §67:
//  a pessoa tem de saber, ANTES de sair, o que vai levar e o que ainda
//  vai ter de decidir. Duas colunas, nunca uma lista só: o que é dela e o
//  que é uma pergunta da fase seguinte não podem ter a mesma tipografia.
//
//  ── E NÃO VAI NADA NO URL (§10) ────────────────────────────────────
//  O handoff é escrito no cofre local, com TTL e consumo único. Um
//  `?faturacao=80000` ficava no histórico, nos logs e no que se cola num
//  chat.
//
//  ── O QUE ESTE COMPONENTE NÃO DECIDE ───────────────────────────────
//  Não recomenda abrir sociedade. §35: uma diferença de líquido não
//  captura contabilidade organizada obrigatória, obrigações declarativas
//  nem irreversibilidade. Isto é uma porta, não um conselho.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fmt } from "@/lib/format";
import { registar } from "@/lib/analytics/cliente";
import {
  criarHandoffEmpresa,
  levamos as levamosDo,
  type HandoffNegocioEmpresaV1,
} from "@/lib/negocio/adapters/empresa-handoff";
import { sociedadeValeAPena } from "@/lib/negocio/adapters/empresa";
import { guardarHandoffEmpresa } from "@/lib/store/handoff-negocio-empresa";
import DadosHerdados, { type LinhaHerdada } from "@/components/ui/DadosHerdados";
import { ArrowRight, Building, Info } from "@/components/ui/Icons";
import type { ContextoNegocio, ResultadoNegocio } from "@/lib/negocio/tipos";
import { BotaoSecundario, Cartao } from "./atomos";
import { FERRAMENTA_NEGOCIO } from "./medicao";

const ROTA_EMPRESA = "/ferramentas/simulador-empresa";

export default function ContinuarNaEmpresa({
  negocio,
  contexto,
}: {
  negocio: ResultadoNegocio;
  contexto: ContextoNegocio;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);

  const handoff = useMemo(() => criarHandoffEmpresa(contexto, negocio), [contexto, negocio]);

  // Sem volume de negócios não há nada para levar — e um convite que
  // promete continuidade e entrega campos vazios é pior do que não
  // existir. §65: `bloqueado`.
  if (handoff.estado === "bloqueado") return null;
  if (!sociedadeValeAPena(negocio, contexto)) return null;

  const linhas = linhasDe(handoff);

  const continuar = () => {
    const gravou = guardarHandoffEmpresa(handoff);
    // Nenhum valor sai daqui (§74): só a FORMA do que se leva.
    registar("simulator_step", {
      tool_id: FERRAMENTA_NEGOCIO,
      step_id: "handoff_empresa_confirmado",
      outcome: gravou ? "ok" : "erro",
      error_code: gravou ? undefined : "sem_armazenamento",
    });
    router.push(ROTA_EMPRESA);
  };

  return (
    <Cartao id="continuar-empresa">
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand-mint"
          aria-hidden
        >
          <Building size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-semibold text-stone-800 dark:text-stone-100">
            Queres ver este mesmo negócio como empresa?
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            Já temos o teu volume de negócios, os custos da operação, a estrutura e a equipa. No Simulador de Empresa
            decides só o que pertence à sociedade: gerência, dividendos, localização, tributação autónoma e benefícios.
          </p>
        </div>
      </div>

      {/* ── A revisão, antes de sair (§19) ───────────────────────── */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => {
            const proximo = !aberto;
            setAberto(proximo);
            if (proximo) {
              registar("simulator_step", {
                tool_id: FERRAMENTA_NEGOCIO,
                step_id: "handoff_empresa_revisto",
                outcome: "ok",
              });
            }
          }}
          aria-expanded={aberto}
          aria-controls="revisao-handoff"
          className="inline-flex min-h-[40px] w-full items-center justify-between gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-3 text-left text-sm font-semibold text-stone-700 transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-200"
        >
          <span>
            {aberto ? "Esconder o que vamos levar" : "Ver o que vamos levar"}
            <span className="ml-1.5 font-normal text-stone-500 dark:text-stone-400">
              {linhas.length} {linhas.length === 1 ? "resposta" : "respostas"}
            </span>
          </span>
          <ArrowRight
            size={14}
            aria-hidden
            className={`flex-shrink-0 text-stone-400 transition-transform ${aberto ? "rotate-90" : ""}`}
          />
        </button>

        {aberto ? (
          <div
            id="revisao-handoff"
            className="mt-3 rounded-2xl border border-stone-100 bg-white p-3 dark:border-stone-800 dark:bg-stone-900"
          >
            <DadosHerdados
              levamos={linhas}
              faltaDecidir={handoff.pendentes.map((p) => ({ rotulo: p.rotulo, porque: p.porque }))}
              rodape={
                handoff.avisos.length > 0 ? (
                  <ul className="space-y-2 border-t border-stone-100 pt-3 dark:border-stone-800">
                    {handoff.avisos.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-start gap-1.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400"
                      >
                        <Info size={12} className="mt-0.5 flex-shrink-0" aria-hidden />
                        <span>{a.texto}</span>
                      </li>
                    ))}
                  </ul>
                ) : null
              }
            />
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={continuar}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-900"
        >
          Continuar com estes dados
          <ArrowRight size={15} aria-hidden />
        </button>
        <BotaoSecundario
          onClick={() => {
            registar("simulator_step", {
              tool_id: FERRAMENTA_NEGOCIO,
              step_id: "handoff_empresa_ignorado",
              outcome: "ok",
            });
            router.push(ROTA_EMPRESA);
          }}
        >
          Ir sem levar nada
        </BotaoSecundario>
      </div>

      {handoff.estado === "parcial" ? (
        <p className="mt-2 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
          Ainda há pressupostos por confirmar no projeto. Podes continuar — mas a estrutura da sociedade vai ser
          decidida sobre eles.
        </p>
      ) : null}
    </Cartao>
  );
}

/** As linhas de «vamos levar», com o valor formatado quando existe. */
function linhasDe(h: HandoffNegocioEmpresaV1): LinhaHerdada[] {
  const valores: Record<string, string | undefined> = {
    faturacaoAnual: fmt(h.prefill.faturacaoAnual ?? 0),
    despesasOper: fmt(h.prefill.despesasOper ?? 0),
    custosEstrutura: fmt(h.prefill.custosEstrutura ?? 0),
    localizacao: h.prefill.localNome,
    jaTemEmpresa: h.prefill.jaTemEmpresa === "sim" ? "Sim" : undefined,
    incluirConstituicao: h.prefill.incluirConstituicao === false ? "Não contam" : undefined,
  };

  return levamosDo(h).map(({ chave, rotulo, proveniencia }) => ({
    rotulo,
    valor: valores[chave],
    origem: proveniencia.texto,
  }));
}
