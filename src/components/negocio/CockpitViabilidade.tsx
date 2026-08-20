"use client";

// ═══════════════════════════════════════════════════════════════════════
//  ATO 6 — O cockpit
//  ---------------------------------------------------------------------
//  Quatro números, não vinte. §35 é explícito: «não encher a homepage de
//  KPIs». Um painel com dezasseis métricas não informa mais — informa
//  menos, porque nenhuma delas se destaca o suficiente para mudar uma
//  decisão.
//
//  ── P0 #3: A CAUSALIDADE ───────────────────────────────────────────
//  A cascata receita → custos → margem → estrutura → resultado não é
//  decoração: é a única forma de a pessoa perceber ONDE mexer. Um
//  resultado de 1 130 € sem os degraus que lá chegaram é um número para
//  aceitar ou rejeitar, não para trabalhar.
//
//  ── A LINHA QUE NÃO PODE FALTAR ────────────────────────────────────
//  Quando as ofertas têm fiscalidade de trabalhador independente, o
//  resultado operacional NÃO é o que fica à pessoa. Dizê-lo é obrigatório
//  — senão o número mais visível do ecrã está a prometer mais do que
//  entrega.
// ═══════════════════════════════════════════════════════════════════════

import { fmt, pct } from "@/lib/format";
import { ChartProjection, Warning } from "@/components/ui/Icons";
import { EXPLICACAO_CONFIANCA, ROTULO_CONFIANCA } from "@/lib/negocio/viabilidade";
import type { ResultadoNegocio } from "@/lib/negocio/tipos";
import { Cartao, LinhaValor, Metrica, Vazio } from "./atomos";
import BreakEvenNegocio from "./BreakEvenNegocio";

export default function CockpitViabilidade({
  negocio,
  aoAdicionarOferta,
}: {
  negocio: ResultadoNegocio;
  aoAdicionarOferta: () => void;
}) {
  if (negocio.ofertas.length === 0) {
    return (
      <Cartao id="cockpit">
        <Vazio
          icone={<ChartProjection size={18} />}
          titulo="Ainda não há negócio para analisar"
          texto="Assim que houver uma oferta com preço e volume, aparece aqui a receita, o que sobra e quantas vendas pagam a operação."
        />
      </Cartao>
    );
  }

  const lucro = negocio.resultadoOperacionalMes >= 0;

  return (
    <div className="space-y-3" id="cockpit">
      {/* ── Os quatro números ─────────────────────────────────────── */}
      <Cartao>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="eyebrow text-brand">O negócio agora</p>
          <span
            className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300"
            title={EXPLICACAO_CONFIANCA[negocio.confianca]}
          >
            {ROTULO_CONFIANCA[negocio.confianca]}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metrica rotulo="Receita mensal" valor={fmt(negocio.receitaSemIVAMes)} sub="sem IVA" />
          <Metrica rotulo="Margem de contribuição" valor={fmt(negocio.margemContribuicaoMes)} />
          <Metrica
            rotulo="Estrutura"
            valor={fmt(negocio.overheadMes + negocio.custoTrabalhadoresMes)}
            sub="por mês"
          />
          <Metrica
            rotulo="Resultado operacional"
            valor={fmt(negocio.resultadoOperacionalMes)}
            tom={lucro ? "bom" : "mau"}
            destaque
          />
        </dl>

        <p className="mt-3 text-[11px] leading-snug text-stone-500 dark:text-stone-400">
          {EXPLICACAO_CONFIANCA[negocio.confianca]}
        </p>
      </Cartao>

      {/* ── A causalidade ─────────────────────────────────────────── */}
      <Cartao titulo="De onde vem o resultado" descricao="Cada degrau explica o seguinte" id="cascata">
        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          <LinhaValor
            rotulo="Receita das ofertas"
            valor={negocio.receitaSemIVAMes}
            nota="Preço líquido × volume esperado, sem IVA"
          />
          <LinhaValor
            rotulo="Custos variáveis"
            valor={-negocio.custosVariaveisMes}
            nota="Matéria-prima, comissões, portes, devoluções — o que só existe quando vendes"
          />
          <LinhaValor
            rotulo="Margem de contribuição"
            valor={negocio.margemContribuicaoMes}
            nota={`${pct(
              negocio.receitaSemIVAMes > 0 ? negocio.margemContribuicaoMes / negocio.receitaSemIVAMes : 0,
            )} da receita — é o que sobra para pagar a estrutura`}
            forte
          />
          {negocio.overheadMes > 0 ? (
            <LinhaValor rotulo="Custos de estrutura" valor={-negocio.overheadMes} nota="Todos os meses, vendas ou não" />
          ) : null}
          {negocio.custoTrabalhadoresMes > 0 ? (
            <LinhaValor
              rotulo="Pessoal"
              valor={-negocio.custoTrabalhadoresMes}
              nota="Salários e encargos da entidade, repartidos por 12 meses"
            />
          ) : null}
          <LinhaValor rotulo="Resultado operacional" valor={negocio.resultadoOperacionalMes} forte />
        </div>

        {/* ── O que este número ainda não é ────────────────────────── */}
        {negocio.temFiscalidadeVendedor && negocio.encargosVendedorMes > 0 ? (
          <div className="mt-3 rounded-2xl bg-stone-50 p-3 dark:bg-stone-800/50">
            <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
              O resultado operacional é <strong>antes</strong> do imposto sobre o rendimento. O preço das tuas ofertas
              já inclui {fmt(negocio.encargosVendedorMes)} por mês de Segurança Social e IRS — se continuares como
              trabalhador independente, o que te fica é cerca de{" "}
              <strong className="tabular-nums">{fmt(negocio.resultadoDepoisEncargosMes)}</strong> por mês.
            </p>
            <p className="mt-1.5 text-[11px] leading-snug text-stone-500 dark:text-stone-400">
              Mantemos as duas linhas separadas porque é a operacional que serve para comparar independente com
              sociedade: cada uma tem o seu próprio imposto, e somá-los seria contá-los duas vezes.
            </p>
          </div>
        ) : null}
      </Cartao>

      {/* ── Break-even ────────────────────────────────────────────── */}
      <BreakEvenNegocio breakEven={negocio.breakEven} receitaSemIVAMes={negocio.receitaSemIVAMes} />

      {/* ── Capacidade, quando há o que dizer ─────────────────────── */}
      {negocio.capacidade.length > 0 ? (
        <Cartao titulo="Cabe no mês?" descricao="O plano confrontado com o tempo e os limites que existem" id="capacidade">
          <ul className="space-y-2.5">
            {negocio.capacidade.map((c) => (
              <li key={c.ofertaId} className="flex items-start gap-2">
                {c.estado === "excedida" ? (
                  <Warning size={14} className="mt-0.5 flex-shrink-0 text-alert-text" />
                ) : (
                  <span
                    aria-hidden
                    className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${
                      c.estado === "apertada" ? "bg-alert" : "bg-brand"
                    }`}
                  />
                )}
                <p className="min-w-0 text-xs leading-relaxed text-stone-600 dark:text-stone-300">{c.mensagem}</p>
              </li>
            ))}
          </ul>
        </Cartao>
      ) : null}

      {/* ── Avisos graves, colados ao número ──────────────────────── */}
      {negocio.avisos.some((a) => a.severidade !== "info") ? (
        <Cartao titulo="Avisos importantes" id="avisos-negocio">
          <ul className="space-y-3">
            {negocio.avisos
              .filter((a) => a.severidade !== "info")
              .map((a) => (
                <li
                  key={a.id}
                  className={`rounded-2xl px-3 py-2 ${
                    a.severidade === "perigo"
                      ? "bg-red-50 dark:bg-red-950/40"
                      : "bg-alert-bg"
                  }`}
                >
                  <p
                    className={`text-xs font-semibold ${
                      a.severidade === "perigo" ? "text-red-800 dark:text-red-300" : "text-alert-text"
                    }`}
                  >
                    {a.titulo}
                  </p>
                  <p
                    className={`mt-0.5 text-xs leading-relaxed ${
                      a.severidade === "perigo" ? "text-red-800/90 dark:text-red-300/90" : "text-alert-text/90"
                    }`}
                  >
                    {a.texto}
                  </p>
                </li>
              ))}
          </ul>
        </Cartao>
      ) : null}
    </div>
  );
}
