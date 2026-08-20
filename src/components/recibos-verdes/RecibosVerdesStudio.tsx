"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import SimuladorIntegrado from "@/components/SimuladorIntegrado";
import SimuladorPreco from "@/components/precos/SimuladorPreco";
import { precificar, type ContextoPreco } from "@/lib/pricing";
import { ArrowLeft, Calculator, Receipt, Sparkle } from "@/components/ui/Icons";

type Vista = "liquido" | "preco";

interface PrecoTransferido {
  liquido: number;
  anual: number;
  unidadesMes: number;
  nome?: string;
}

const euro = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

/**
 * Uma só jornada para as duas perguntas reais de quem passa recibos:
 * «quanto me fica?» e, antes dela, «quanto tenho de cobrar?». O cálculo
 * continua em dois motores canónicos; esta composição só transfere a saída.
 */
export default function RecibosVerdesStudio() {
  const searchParams = useSearchParams();
  const [vista, setVista] = useState<Vista>(() =>
    searchParams.get("modo") === "preco" ? "preco" : "liquido",
  );
  const [transferido, setTransferido] = useState<PrecoTransferido | null>(null);

  const usarPreco = (contexto: ContextoPreco) => {
    const resultado = precificar(contexto);
    if (!resultado.ok || resultado.precoLiquido <= 0) return;
    setTransferido({
      liquido: resultado.precoLiquido,
      anual: resultado.precoLiquido * contexto.volume.unidadesMes * 12,
      unidadesMes: contexto.volume.unidadesMes,
      nome: contexto.produto.nome,
    });
    setVista("liquido");
    requestAnimationFrame(() => document.getElementById("resultado-preco-transferido")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className="space-y-5">
      <section
        aria-label="Escolher o ponto de partida"
        className="rounded-4xl border border-stone-100 bg-white p-2 shadow-card dark:border-stone-800 dark:bg-stone-900"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            aria-pressed={vista === "liquido"}
            onClick={() => setVista("liquido")}
            className={`flex min-h-[72px] items-center gap-3 rounded-3xl px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              vista === "liquido"
                ? "bg-brand text-white shadow-card"
                : "text-stone-600 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
            }`}
          >
            <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-2xl ${vista === "liquido" ? "bg-white/15" : "bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand"}`}>
              <Receipt size={19} />
            </span>
            <span>
              <strong className="block text-sm">Já sei quanto vou faturar</strong>
              <span className={`mt-0.5 block text-xs ${vista === "liquido" ? "text-white/75" : "text-stone-500 dark:text-stone-400"}`}>
                Do valor do recibo ao líquido real
              </span>
            </span>
          </button>

          <button
            type="button"
            aria-pressed={vista === "preco"}
            onClick={() => setVista("preco")}
            className={`flex min-h-[72px] items-center gap-3 rounded-3xl px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              vista === "preco"
                ? "bg-brand-deep text-white shadow-card"
                : "text-stone-600 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
            }`}
          >
            <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-2xl ${vista === "preco" ? "bg-white/15" : "bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand"}`}>
              <Sparkle size={19} />
            </span>
            <span>
              <strong className="block text-sm">Ainda não sei quanto cobrar</strong>
              <span className={`mt-0.5 block text-xs ${vista === "preco" ? "text-white/75" : "text-stone-500 dark:text-stone-400"}`}>
                Custos, tempo, margem e impostos primeiro
              </span>
            </span>
          </button>
        </div>
      </section>

      {vista === "preco" ? (
        <div className="space-y-4">
          <div className="rounded-3xl border border-brand-light bg-brand-light/40 px-5 py-4 dark:border-brand/20 dark:bg-brand/10">
            <div className="flex items-start gap-3">
              <Calculator size={18} className="mt-0.5 flex-none text-brand-dark dark:text-brand-mint" />
              <div>
                <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Primeiro forma um preço sustentável</h2>
                <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                  É exatamente o mesmo Pricing Engine usado no simulador de empresas. No fim, o preço sem IVA passa para o cálculo fiscal — sem copiar fórmulas nem voltar a escrever o valor.
                </p>
              </div>
            </div>
          </div>
          <SimuladorPreco
            cenarioInicial={searchParams.get("cenario")}
            superficie="recibos-verdes"
            rotuloConcluir="Usar este preço no recibo verde"
            aoConcluir={usarPreco}
            aoCancelar={() => setVista("liquido")}
          />
        </div>
      ) : (
        <div className="space-y-5">
          {transferido ? (
            <section
              id="resultado-preco-transferido"
              aria-live="polite"
              className="scroll-mt-24 rounded-4xl border border-brand-light bg-gradient-to-br from-brand-light/80 to-white p-5 shadow-card dark:border-brand/25 dark:from-brand/15 dark:to-stone-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="eyebrow text-brand-dark dark:text-brand-mint">Preço calculado, agora com fiscalidade</p>
                  <h2 className="font-display mt-1 text-2xl font-semibold text-ink">
                    {euro.format(transferido.liquido)} <span className="font-sans text-sm font-medium text-stone-500">sem IVA</span>
                  </h2>
                  <p className="mt-1 max-w-xl text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                    O simulador abaixo recebeu este valor como base do recibo. A projeção anual usa {transferido.unidadesMes} {transferido.unidadesMes === 1 ? "unidade" : "unidades"} por mês e pode ser alterada.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setVista("preco")}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-brand/30 bg-white px-4 text-xs font-semibold text-brand-dark hover:border-brand dark:bg-stone-900 dark:text-brand-mint"
                >
                  <ArrowLeft size={13} /> Rever o preço
                </button>
              </div>
            </section>
          ) : null}
          <SimuladorIntegrado
            key={transferido ? `${transferido.liquido}:${transferido.anual}` : "sem-preco"}
            vista="rv"
            valorInicial={transferido?.liquido}
            faturacaoAnualInicial={transferido?.anual}
          />
        </div>
      )}
    </div>
  );
}
