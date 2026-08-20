"use client";

// ═══════════════════════════════════════════════════════════════════════
//  «CONTRATAR AGORA, MAIS TARDE, OU NÃO?» — §88-90
//  ---------------------------------------------------------------------
//  Com o custo e a capacidade os dois no modelo, a contratação deixa de
//  ser um número e passa a poder ser uma decisão. Faltava a pergunta.
//
//  ── PORQUE É QUE NÃO HÁ VENCEDOR ───────────────────────────────────
//  §80: o motor pode encontrar um ótimo matemático, e apresentá-lo como
//  conselho seria esconder tudo o que ele não sabe — se a procura espera
//  seis meses, se a pessoa certa está disponível nessa altura, quanto
//  custa um cliente que se perdeu por não haver quem o servisse.
//
//  A tabela mostra o trade-off. A decisão é de quem a lê.
//
//  ── E É CARO, POR ISSO SÓ CORRE A PEDIDO ───────────────────────────
//  São três agregações completas com projeção de caixa. Nada disto pesa
//  em quem nunca faz a pergunta.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import { fmt } from "@/lib/format";
import {
  compararContratacao,
  custoMedioPorHora,
  custoPorHoraDaEquipa,
  diferencaEntre,
} from "@/lib/negocio/contratacao";
import { Info } from "@/components/ui/Icons";
import type { ContextoNegocio } from "@/lib/negocio/tipos";
import { BotaoSecundario, Cartao } from "./atomos";

export default function DecisaoContratar({ contexto }: { contexto: ContextoNegocio }) {
  const postos = (contexto.estrutura?.trabalhadores ?? []).filter(
    (t) => (t.remuneracao?.salarioBaseMensal ?? 0) > 0,
  );
  const [alvo, setAlvo] = useState<string | null>(null);

  const comparacao = useMemo(
    () => (alvo ? compararContratacao(contexto, alvo) : null),
    [contexto, alvo],
  );
  const porHora = useMemo(() => custoPorHoraDaEquipa(contexto), [contexto]);
  const medio = useMemo(() => custoMedioPorHora(contexto), [contexto]);

  if (postos.length === 0) return null;

  return (
    <Cartao
      titulo="Contratar agora, mais tarde, ou não"
      descricao="O mesmo negócio nos três cenários — sem escolher por ti"
      id="decisao-contratar"
    >
      {/* ── §89 — o custo por hora produtiva ─────────────────────── */}
      {medio !== null ? (
        <div className="mb-4 rounded-2xl bg-stone-50 p-3 dark:bg-stone-800/50">
          <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">
            Cada hora faturável da equipa custa <span className="tabular-nums">{fmt(medio)}</span>
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
            Já sem as férias e sem as 40 horas anuais de formação. Se cobras por hora, é este o chão: abaixo dele,
            cada hora entregue por esta pessoa perde dinheiro.
          </p>
          {porHora.filter((p) => p.custoHora !== null).length > 1 ? (
            <dl className="mt-2 space-y-0.5">
              {porHora
                .filter((p) => p.custoHora !== null)
                .map((p) => (
                  <div key={p.trabalhadorId} className="flex items-baseline justify-between gap-3">
                    <dt className="min-w-0 text-[11px] text-stone-600 dark:text-stone-300">{p.funcao}</dt>
                    <dd className="flex-shrink-0 text-[11px] tabular-nums text-stone-700 dark:text-stone-200">
                      {fmt(p.custoHora!)}/h
                    </dd>
                  </div>
                ))}
            </dl>
          ) : null}
        </div>
      ) : null}

      {/* ── A escolha do posto a comparar ────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {postos.map((t) => {
          const ativo = alvo === t.id;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={ativo}
              onClick={() => setAlvo(ativo ? null : t.id)}
              className={`min-h-[40px] rounded-full border px-4 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                ativo
                  ? "border-brand bg-brand-light/60 text-brand-deep dark:bg-brand/15 dark:text-brand-mint"
                  : "border-stone-200 text-stone-600 hover:border-stone-300 dark:border-stone-700 dark:text-stone-300"
              }`}
            >
              {ativo ? "Fechar" : "Testar"} {t.funcao?.trim() || "posto sem nome"}
            </button>
          );
        })}
      </div>

      {comparacao ? (
        <div className="mt-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-xs">
              <caption className="sr-only">
                Comparação dos três cenários de contratação de {comparacao.posto.funcao}
              </caption>
              <thead>
                <tr className="border-b border-stone-100 dark:border-stone-800">
                  <th scope="col" className="py-2 pr-2 font-semibold text-stone-500 dark:text-stone-400">
                    Cenário
                  </th>
                  <th scope="col" className="py-2 px-2 text-right font-semibold text-stone-500 dark:text-stone-400">
                    Resultado/mês
                  </th>
                  <th scope="col" className="py-2 px-2 text-right font-semibold text-stone-500 dark:text-stone-400">
                    Capacidade
                  </th>
                  <th scope="col" className="py-2 pl-2 text-right font-semibold text-stone-500 dark:text-stone-400">
                    Capital preciso
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparacao.cenarios.map((c) => (
                  <tr key={c.quando} className="border-b border-stone-50 last:border-0 dark:border-stone-800/50">
                    <th scope="row" className="py-2 pr-2 font-medium text-stone-800 dark:text-stone-100">
                      {c.rotulo}
                    </th>
                    <td className="py-2 px-2 text-right tabular-nums text-stone-700 dark:text-stone-200">
                      {fmt(c.resultadoOperacionalMes)}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-stone-700 dark:text-stone-200">
                      {c.capacidadeEquipaMes > 0 ? `+${Math.round(c.capacidadeEquipaMes)} h` : "—"}
                    </td>
                    <td className="py-2 pl-2 text-right tabular-nums text-stone-700 dark:text-stone-200">
                      {c.capitalNecessario > 0 ? fmt(c.capitalNecessario) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-stone-600 dark:text-stone-300">
            <Info size={12} className="mt-0.5 flex-shrink-0" aria-hidden />
            <span>{leitura(comparacao)}</span>
          </p>

          <p className="mt-2 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
            Não escolhemos por ti: contratar mais tarde poupa dinheiro e deixa procura por servir; contratar já custa
            e permite entregar. Qual vale mais depende de coisas que este modelo não sabe — se a procura espera, se a
            pessoa certa está disponível daqui a meses, quanto custa um cliente perdido.
          </p>

          <div className="mt-3">
            <BotaoSecundario onClick={() => setAlvo(null)}>Fechar comparação</BotaoSecundario>
          </div>
        </div>
      ) : null}
    </Cartao>
  );
}

/** A frase que diz o que muda, sem dizer o que fazer. */
function leitura(c: ReturnType<typeof compararContratacao>): string {
  if (!c) return "";
  const [nunca, agora, depois] = c.cenarios;
  const jaVsNunca = diferencaEntre(nunca, agora);
  const depoisVsJa = diferencaEntre(agora, depois);

  const custo = `Contratar ${c.posto.funcao} custa ${fmt(Math.abs(jaVsNunca.resultado))} por mês de resultado`;

  if (!c.produtivo) {
    return `${custo}, e não acrescenta capacidade — declaraste que este posto não entrega horas faturáveis. Adiar para o mês ${
      c.mesDepois + 1
    } melhora o primeiro ano em ${fmt(Math.abs(depoisVsJa.resultado))} por mês.`;
  }

  return `${custo} e acrescenta ${Math.round(agora.capacidadeEquipaMes)} horas faturáveis. Adiar para o mês ${
    c.mesDepois + 1
  } melhora o primeiro ano em ${fmt(
    Math.abs(depoisVsJa.resultado),
  )} por mês — mas essas horas só existem a partir daí.`;
}
