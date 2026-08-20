"use client";

// ═══════════════════════════════════════════════════════════════════════
//  A FORMA DO ANO — §55-57
//  ---------------------------------------------------------------------
//  O domínio já suportava sazonalidade e crescimento composto. A
//  experiência não estava à altura do motor: não havia por onde os
//  configurar, e por isso todos os negócios eram projetados como se
//  vendessem o mesmo em agosto e em dezembro, para sempre.
//
//  ── A PERGUNTA VEM ANTES DOS DOZE CAMPOS (§56) ─────────────────────
//  «As vendas são aproximadamente iguais durante o ano?» Sim fecha o
//  assunto. Só quem responde «não» vê a curva — e vê-a com uma FORMA
//  para arrastar, não doze campos a 1,00 e o convite a inventar doze
//  números do nada.
//
//  ── E «CRESCIMENTO MENSAL %» NÃO É A LINGUAGEM DE NINGUÉM (§57) ────
//  Quase ninguém sabe dizer «2,3% ao mês»; toda a gente sabe dizer
//  «demoro uns meses a arrancar». As três opções são fenómenos
//  diferentes, e o arranque tem TETO — ao contrário de uma taxa composta,
//  que ao 24.º mês dá um número que ninguém previu.
//
//  ── ACESSIBILIDADE ─────────────────────────────────────────────────
//  A curva é editável por TECLADO: cada mês é um `range` com rótulo
//  próprio. Um gráfico que só se arrasta com o rato é um gráfico que
//  metade das pessoas não consegue usar.
// ═══════════════════════════════════════════════════════════════════════

import { CampoNumero, CampoPercentagem } from "@/components/precos/atomos";
import {
  CURVA_UNIFORME,
  MESES_CURTOS,
  curvaComPico,
  curvaSazonal,
  evolucaoDe,
  normalizarCurva,
} from "@/lib/negocio/procura";
import type { ContextoNegocio, EvolucaoProcura, ProcuraNegocio } from "@/lib/negocio/tipos";
import { BotaoTexto, Cartao } from "./atomos";

const EVOLUCOES: { valor: EvolucaoProcura; rotulo: string; sub: string }[] = [
  { valor: "estavel", rotulo: "Estável", sub: "O mesmo volume todos os meses" },
  { valor: "arranque", rotulo: "Arranque gradual", sub: "Demora a chegar ao volume esperado" },
  { valor: "crescimento", rotulo: "Crescimento", sub: "Sobe mês após mês, sem teto" },
];

export default function ProcuraNegocioEditor({
  contexto,
  aoMudar,
}: {
  contexto: ContextoNegocio;
  aoMudar: (patch: Partial<ProcuraNegocio>) => void;
}) {
  const sazonal = contexto.procura.modo === "sazonal";
  const curva = curvaSazonal(contexto);
  const evolucao = evolucaoDe(contexto);

  return (
    <Cartao
      titulo="Como se distribui o ano"
      descricao="O mês fraco é o que decide se há dinheiro para pagar as contas — não a média"
      id="procura"
    >
      {/* ── §56 — a pergunta antes dos doze campos ───────────────── */}
      <fieldset>
        <legend className="text-xs font-semibold text-stone-700 dark:text-stone-200">
          As vendas são aproximadamente iguais durante o ano?
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            { sazonal: false, rotulo: "Sim, mais ou menos" },
            { sazonal: true, rotulo: "Não, há épocas" },
          ].map((op) => {
            const ativo = sazonal === op.sazonal;
            return (
              <button
                key={op.rotulo}
                type="button"
                aria-pressed={ativo}
                onClick={() =>
                  aoMudar(
                    op.sazonal
                      ? {
                          modo: "sazonal",
                          // Uma forma para arrastar, não doze campos vazios.
                          // Pico em julho porque é o mês alto da maior parte
                          // dos negócios com época — e muda-se num segundo.
                          sazonalidade: contexto.procura.sazonalidade ?? curvaComPico(6),
                        }
                      : { modo: "simples" },
                  )
                }
                className={`min-h-[44px] rounded-full border px-4 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                  ativo
                    ? "border-brand bg-brand-light/60 text-brand-deep dark:bg-brand/15 dark:text-brand-mint"
                    : "border-stone-200 text-stone-600 hover:border-stone-300 dark:border-stone-700 dark:text-stone-300"
                }`}
              >
                {op.rotulo}
              </button>
            );
          })}
        </div>
      </fieldset>

      {sazonal ? (
        <div className="mt-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">
              O peso de cada mês
            </p>
            <BotaoTexto onClick={() => aoMudar({ sazonalidade: [...CURVA_UNIFORME] })}>
              Repor uniforme
            </BotaoTexto>
          </div>

          <ul className="grid grid-cols-3 gap-x-3 gap-y-2 sm:grid-cols-4 lg:grid-cols-6">
            {MESES_CURTOS.map((mes, i) => (
              <li key={mes}>
                <label
                  htmlFor={`sazonal-${i}`}
                  className="flex items-baseline justify-between gap-1 text-[11px] text-stone-600 dark:text-stone-300"
                >
                  <span>{mes}</span>
                  <span className="tabular-nums text-stone-500 dark:text-stone-400">
                    {Math.round((curva[i] ?? 1) * 100)}%
                  </span>
                </label>
                <input
                  id={`sazonal-${i}`}
                  type="range"
                  min={0}
                  max={250}
                  step={5}
                  value={Math.round((curva[i] ?? 1) * 100)}
                  onChange={(e) => {
                    const nova = [...curva];
                    nova[i] = Number(e.target.value) / 100;
                    aoMudar({ sazonalidade: nova });
                  }}
                  className="mt-1 h-6 w-full cursor-pointer accent-brand"
                />
              </li>
            ))}
          </ul>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
              100% é um mês médio. O total do ano não muda com a forma — só se redistribui.
            </p>
            <BotaoTexto
              tom="marca"
              onClick={() => aoMudar({ sazonalidade: normalizarCurva(curva) })}
            >
              Reequilibrar para o mesmo total
            </BotaoTexto>
          </div>
        </div>
      ) : null}

      {/* ── §57 — a evolução, em linguagem de quem responde ──────── */}
      <fieldset className="mt-5 border-t border-stone-100 pt-4 dark:border-stone-800">
        <legend className="text-xs font-semibold text-stone-700 dark:text-stone-200">
          Como esperas que evolua?
        </legend>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {EVOLUCOES.map((op) => {
            const ativo = evolucao === op.valor;
            return (
              <button
                key={op.valor}
                type="button"
                aria-pressed={ativo}
                onClick={() =>
                  aoMudar({
                    evolucao: op.valor,
                    // Passar para «estável» limpa a taxa: deixá-la lá fazia
                    // o resultado depender de um número invisível.
                    crescimentoMensal: op.valor === "crescimento" ? contexto.procura.crescimentoMensal ?? 0.02 : 0,
                    arranqueMeses:
                      op.valor === "arranque" ? contexto.procura.arranqueMeses ?? 6 : undefined,
                  })
                }
                className={`min-h-[44px] rounded-2xl border px-3 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                  ativo
                    ? "border-brand bg-brand-light/60 dark:bg-brand/10"
                    : "border-stone-200 bg-white hover:border-stone-300 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-stone-600"
                }`}
              >
                <span
                  className={`block text-sm font-semibold ${
                    ativo ? "text-brand-deep dark:text-brand-mint" : "text-stone-800 dark:text-stone-100"
                  }`}
                >
                  {op.rotulo}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-stone-500 dark:text-stone-400">
                  {op.sub}
                </span>
              </button>
            );
          })}
        </div>

        {/* O número só aparece quando é preciso — e aparece sempre que é
            preciso. Um preset que esconde a premissa é um preset que
            decide por quem responde. */}
        {evolucao === "arranque" ? (
          <div className="mt-3">
            <CampoNumero
              id="arranque-meses"
              rotulo="Meses até ao volume esperado"
              descricao="A partir daí fica lá — um arranque tem teto, ao contrário de uma taxa de crescimento."
              valor={contexto.procura.arranqueMeses ?? 6}
              aoMudar={(v) => aoMudar({ arranqueMeses: Math.max(1, v) })}
              max={36}
            />
          </div>
        ) : null}

        {evolucao === "crescimento" ? (
          <div className="mt-3">
            <CampoPercentagem
              id="crescimento-mensal"
              rotulo="Crescimento por mês"
              descricao="Composto: 2% ao mês são cerca de 27% ao fim de um ano, e 60% ao fim de dois."
              valor={contexto.procura.crescimentoMensal ?? 0.02}
              aoMudar={(v) => aoMudar({ crescimentoMensal: v })}
              max={20}
            />
          </div>
        ) : null}
      </fieldset>
    </Cartao>
  );
}
