"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import SimuladorIntegrado from "@/components/SimuladorIntegrado";
import SimuladorPreco from "@/components/precos/SimuladorPreco";
import { precificar, type ContextoPreco } from "@/lib/pricing";
import { baseFiscalDoPreco, type BaseFiscalDoPreco } from "@/lib/negocio/market/preco-handoff";
import { assessMarketEconomics } from "@/lib/negocio/market/pricing-adapter";
import { newHypothesis } from "@/lib/negocio/market/hipoteses";
import { OPPORTUNITY_TEMPLATES } from "@/lib/negocio/market/opportunities";
import { guardarHipotese, lerHipotese } from "@/lib/store/hipoteses-mercado";
import { useHandoffDaBusca } from "@/components/busca/useHandoffDaBusca";
import type { TipoEntidade } from "@/lib/busca/esquema";
import { ArrowLeft, Calculator, Receipt, Sparkle } from "@/components/ui/Icons";

type Vista = "liquido" | "preco";

/**
 * O que esta página aceita da pesquisa — e tem de coincidir com o que a
 * ferramenta declara em `catalogo.ts` (`aceitaEntidades`). O teste
 * `busca:handoff` reprova se os dois deixarem de concordar: uma promessa
 * do catálogo sem consumidor do lado de cá é um preenchimento que nunca
 * acontece.
 */
const DESTINO_BUSCA = "ferramenta:recibos-verdes";
const ACEITA_BUSCA: TipoEntidade[] = ["valor", "periodicidade"];

type PrecoTransferido = BaseFiscalDoPreco & { nome?: string };

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

  /**
   * ┌───────────────────────────────────────────────────────────────────┐
   * │ O CONTEXTO QUE VEM DA PESQUISA — E QUE NUNCA ESTEVE NO ENDEREÇO    │
   * │                                                                   │
   * │ Quem escreveu «quanto me fica de 1 200 € por mês» na barra do      │
   * │ cabeçalho já disse o valor. Voltar a pedi-lo aqui é fazer a mesma  │
   * │ pergunta duas vezes — e é o que transforma um «caminho preparado»  │
   * │ numa promessa que o destino não cumpre.                            │
   * │                                                                   │
   * │ O valor chega por `sessionStorage`, com dez minutos de validade e  │
   * │ consumo único; no endereço viaja um identificador opaco e mais     │
   * │ nada. Ver o quadro em `lib/busca/handoff.ts` para as quatro razões │
   * │ por que uma query string estava fora de questão.                   │
   * └───────────────────────────────────────────────────────────────────┘
   */
  const contexto = useHandoffDaBusca(DESTINO_BUSCA, ACEITA_BUSCA);
  const daBusca = useMemo(() => {
    const valor = typeof contexto?.valor === "number" ? contexto.valor : null;
    if (!valor || valor <= 0) return null;
    // Sem periodicidade não se assume nenhuma: a pesquisa só transporta o
    // valor depois de a pessoa ter respondido «por mês» ou «por ano».
    if (contexto?.periodicidade === "ano") return { mensal: undefined, anual: valor };
    if (contexto?.periodicidade === "mes") return { mensal: valor, anual: undefined };
    return null;
  }, [contexto]);

  // O `?h=` só é aceite quando corresponde a uma hipótese CURADA. Um id
  // arbitrário no URL não pode criar entradas no cofre de quem abre o
  // link — é um parâmetro público e trata-se como tal.
  const hipoteseId = useMemo(() => {
    const bruto = searchParams.get("h");
    return OPPORTUNITY_TEMPLATES.some((item) => item.id === bruto) ? bruto : null;
  }, [searchParams]);

  const usarPreco = (contexto: ContextoPreco) => {
    const resultado = precificar(contexto);
    // A conversão «preço por unidade → valor mensal do recibo» é domínio e
    // vive em `baseFiscalDoPreco`, testada contra o motor real. Aqui só se
    // decide o que fazer com o resultado.
    const base = baseFiscalDoPreco(resultado, contexto.volume.unidadesMes);
    if (!base) return;

    // ── A volta do handoff ────────────────────────────────────────────
    //  Quem chegou aqui a partir de uma hipótese do motor de descoberta
    //  leva a viabilidade de volta: sem isto, o gate ficava eternamente a
    //  pedir «viabilidade económica confirmada» mesmo depois de a pessoa
    //  ter fechado o cenário. Só viaja o veredicto do motor canónico e o
    //  preço líquido — nunca custos, margens ou clientes.
    if (hipoteseId) {
      const avaliacao = assessMarketEconomics(resultado);
      const existente = lerHipotese(hipoteseId);
      guardarHipotese({
        ...(existente ?? newHypothesis(hipoteseId, "portugal")),
        pricing: {
          viable: avaliacao.viable === true,
          priceNet: base.unitario,
          concludedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      });
    }

    setTransferido({ ...base, nome: contexto.produto.nome });
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
              <span className={`mt-0.5 block text-xs ${vista === "liquido" ? "text-white/95" : "text-stone-500 dark:text-stone-400"}`}>
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
              <span className={`mt-0.5 block text-xs ${vista === "preco" ? "text-white/95" : "text-stone-500 dark:text-stone-400"}`}>
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
                    {euro.format(transferido.unitario)} <span className="font-sans text-sm font-medium text-stone-500">por unidade, sem IVA</span>
                  </h2>
                  <p className="mt-1 max-w-xl text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                    {transferido.unidadesMes === 1 ? (
                      <>O simulador abaixo recebeu <strong className="font-semibold text-ink">{euro.format(transferido.mensal)} por mês</strong> como base do recibo, sem IVA. Podes alterar tudo.</>
                    ) : (
                      <>
                        A {transferido.unidadesMes} unidades por mês, isso dá{" "}
                        <strong className="font-semibold text-ink">{euro.format(transferido.mensal)} por mês</strong> sem IVA — foi essa base mensal que passou para o simulador, e não o preço de uma unidade. Podes alterar tudo.
                      </>
                    )}
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
          {/* O preço transferido do motor de formação de preço manda sobre
              o contexto da pesquisa: é mais recente e foi calculado aqui. */}
          <SimuladorIntegrado
            key={
              transferido
                ? `${transferido.mensal}:${transferido.anual}`
                : daBusca
                  ? `busca:${daBusca.mensal ?? ""}:${daBusca.anual ?? ""}`
                  : "sem-preco"
            }
            vista="rv"
            valorInicial={transferido?.mensal ?? daBusca?.mensal}
            faturacaoAnualInicial={transferido?.anual ?? daBusca?.anual}
          />
        </div>
      )}
    </div>
  );
}
