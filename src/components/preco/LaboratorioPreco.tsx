"use client";

import { useState } from "react";
import { m } from "motion/react";
import { ArrowRight, Info, ShieldCheck } from "@/components/ui/Icons";
import Link from "next/link";
import type { CenarioDemoPreco } from "@/lib/pricing/demo-homepage.servidor";

// ═══════════════════════════════════════════════════════════════════════
//  O LABORATÓRIO — a mesma peça, quatro situações
//  ---------------------------------------------------------------------
//  Não calcula nada. Todos os cenários vêm da engine, resolvidos no
//  servidor (`cenariosDemoPreco()`), e este componente só troca entre eles.
//  É deliberado: cada um destes números depende de regras (isenção do
//  Art. 53.º, comissão sobre o bruto, SS sobre a faturação) que não têm
//  forma fechada curta, e reimplementá-las aqui para poupar um `props` era
//  garantir que um dia divergiam da ferramenta a sério.
// ═══════════════════════════════════════════════════════════════════════

const eur = (n: number) =>
  `${n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const pct1 = (n: number) =>
  `${(n * 100).toLocaleString("pt-PT", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

function Variacao({ valor }: { valor: number }) {
  if (valor === 0) {
    // `text-stone-400` falhava o contraste no escuro sobre o cartão
    // selecionado (`dark:bg-brand/15`) — é o tier terciário que o
    // DESIGN.md diz nunca ter passado AA. Um degrau acima resolve nos dois
    // temas sem mexer no token.
    return (
      <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-300">
        referência
      </span>
    );
  }
  const sobe = valor > 0;
  // Sem verde no lado descendente, e é deliberado.
  //
  // Verde lê-se «melhor», e um preço mais baixo aqui não é melhor: no caso
  // da isenção do Art. 53.º o consumidor paga menos porque o vendedor
  // deixou de liquidar IVA — e, ao mesmo tempo, deixou de o deduzir nas
  // compras. Pintar essa descida de verde dizia com a cor o contrário do
  // que a explicação diz por palavras. Estes números são DIREÇÃO, não
  // veredicto: o sinal chega, a valência não.
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
        sobe
          ? "bg-categoria-areia-bg text-categoria-areia-text dark:bg-stone-800 dark:text-[#e7c98e]"
          : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
      }`}
    >
      {sobe ? "+" : "−"} {eur(Math.abs(valor))}
    </span>
  );
}

export default function LaboratorioPreco({ cenarios }: { cenarios: CenarioDemoPreco[] }) {
  const [ativo, setAtivo] = useState(0);
  const cenario = cenarios[ativo] ?? cenarios[0];
  const maiorPVP = Math.max(...cenarios.map((c) => c.pvp));

  return (
    <section
      id="como-se-forma"
      className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24"
      aria-labelledby="laboratorio-preco-titulo"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <div className="eyebrow mb-3 text-brand">O laboratório</div>
          <h2
            id="laboratorio-preco-titulo"
            className="text-balance font-display display-2 font-semibold text-ink"
          >
            O preço certo depende de onde vendes e de como estás enquadrado.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone-600">
            A mesma peça, com os mesmos custos e o mesmo lucro pretendido, precisa de preços
            diferentes conforme o canal e o regime. Escolhe uma situação e vê o que muda — e porquê.
          </p>
        </div>

        <div className="mt-9 grid gap-4 lg:grid-cols-[minmax(0,.95fr)_minmax(0,1.35fr)] lg:items-start">
          {/* Os cenários */}
          <div
            role="tablist"
            aria-label="Situações de venda"
            aria-orientation="vertical"
            className="flex flex-col gap-2"
          >
            {cenarios.map((c, i) => {
              const on = i === ativo;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  id={`cenario-tab-${c.id}`}
                  aria-selected={on}
                  aria-controls="cenario-painel"
                  onClick={() => setAtivo(i)}
                  className={`focus-marca group grid min-h-[64px] grid-cols-[1fr_auto] items-center gap-3 rounded-3xl border px-4 py-3.5 text-left transition-all ${
                    on
                      ? "border-brand bg-brand-light shadow-card dark:bg-brand/15"
                      : "border-stone-200 bg-white hover:border-brand/40 dark:border-stone-700 dark:bg-stone-900"
                  }`}
                >
                  <span className="min-w-0">
                    <span
                      className={`block text-sm font-semibold ${on ? "text-brand-dark dark:text-brand-mint" : "text-stone-800 dark:text-stone-100"}`}
                    >
                      {c.rotulo}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-stone-500">
                      {c.pergunta}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <span className="font-display text-base font-semibold tabular-nums text-ink">
                      {eur(c.pvp)}
                    </span>
                    <Variacao valor={c.variacaoPVP} />
                  </span>
                </button>
              );
            })}
          </div>

          {/* O painel */}
          <div
            role="tabpanel"
            id="cenario-painel"
            aria-labelledby={`cenario-tab-${cenario.id}`}
            className="rounded-4xl border border-stone-100 bg-white p-5 shadow-lift dark:border-stone-800 dark:bg-stone-900 sm:p-7"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="font-display text-xl font-semibold text-ink">{cenario.rotulo}</h3>
              <span className="text-xs text-stone-400">preço ao consumidor, com IVA</span>
            </div>

            <m.div
              key={cenario.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="mt-3"
            >
              <div className="font-display text-[clamp(2.6rem,8vw,3.4rem)] font-semibold leading-none tracking-[-.04em] tabular-nums text-ink">
                {eur(cenario.pvp)}
              </div>

              {/* As barras comparadas — a diferença vê-se antes de se ler */}
              <ul className="mt-5 space-y-2.5" aria-hidden>
                {cenarios.map((c) => (
                  <li key={c.id} className="grid grid-cols-[7.5rem_1fr_4.5rem] items-center gap-2">
                    <span
                      className={`truncate text-[11px] ${c.id === cenario.id ? "font-semibold text-stone-700 dark:text-stone-200" : "text-stone-400"}`}
                    >
                      {c.rotulo}
                    </span>
                    <span className="h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                      <m.span
                        className={`block h-full rounded-full ${c.id === cenario.id ? "bg-brand" : "bg-stone-300 dark:bg-stone-700"}`}
                        initial={false}
                        animate={{ width: `${(c.pvp / maiorPVP) * 100}%` }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </span>
                    <span
                      className={`text-right text-[11px] tabular-nums ${c.id === cenario.id ? "font-semibold text-stone-700 dark:text-stone-200" : "text-stone-400"}`}
                    >
                      {eur(c.pvp)}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-stone-100 pt-5 dark:border-stone-800">
                {[
                  { rotulo: "Preço líquido", valor: eur(cenario.liquido), nota: "sem IVA" },
                  { rotulo: "Lucro por venda", valor: eur(cenario.lucro), nota: "depois de tudo" },
                  { rotulo: "Margem", valor: pct1(cenario.margem), nota: "sobre o líquido" },
                ].map((metrica) => (
                  <div key={metrica.rotulo} className="min-w-0">
                    <dt className="text-[10px] leading-tight text-stone-400">{metrica.rotulo}</dt>
                    <dd className="mt-1 font-display text-lg font-semibold tabular-nums text-ink">
                      {metrica.valor}
                    </dd>
                    <dd className="text-[10px] text-stone-400">{metrica.nota}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-5 flex items-start gap-2.5 rounded-3xl bg-stone-50 p-4 dark:bg-stone-800/60">
                <Info size={15} className="mt-0.5 flex-shrink-0 text-brand" />
                <div>
                  <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                    {cenario.explicacao}
                  </p>
                  <p className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-medium text-stone-400">
                    <ShieldCheck size={11} className="text-brand" />
                    {cenario.fonte}
                  </p>
                </div>
              </div>
            </m.div>

            <Link
              href="/ferramentas/calcular-preco"
              className="focus-marca mt-5 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-brand no-underline hover:text-brand-dark"
            >
              Testar com os meus canais e o meu regime <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
