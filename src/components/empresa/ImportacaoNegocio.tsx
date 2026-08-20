"use client";

// ═══════════════════════════════════════════════════════════════════════
//  «CONTINUAMOS DE ONDE FICASTE» — o banner de importação
//  ---------------------------------------------------------------------
//  §20 e §114 do relatório. Quem chega ao Simulador de Empresa vindo do
//  Estúdio tem de saber três coisas antes de olhar para um único campo:
//
//   ① que este simulador recebeu um projeto;
//   ② o que veio de lá — e de onde saiu cada número;
//   ③ que pode ignorar tudo isto.
//
//  Sem ③ a importação é uma imposição. Preencher campos por magia, sem
//  saída, é o defeito que §67 chama «preenchimento mágico»: o ecrã fica
//  cheio de números e a pessoa não sabe quais são dela.
//
//  ── MOBILE PRIMEIRO (§76) ──────────────────────────────────────────
//  Em telemóvel abre COLAPSADO: uma frase, uma contagem, um botão. Um
//  mega-resumo aberto por omissão empurrava o primeiro campo para fora
//  do ecrã — e o primeiro campo é o que a pessoa veio preencher.
//
//  ── ACESSIBILIDADE (§75) ───────────────────────────────────────────
//  · o banner é uma região com nome, e recebe foco por programa quando
//    aparece — quem navega por teclado tem de dar por ele;
//  · aplicar ou ignorar anuncia-se por `aria-live`;
//  · os estados não dependem só de cor (ver `DadosHerdados`).
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fmt } from "@/lib/format";
import { ArrowLeft, Info, Sparkle } from "@/components/ui/Icons";
import DadosHerdados, { type LinhaHerdada } from "@/components/ui/DadosHerdados";
import type { HandoffNegocioEmpresaV1 } from "@/lib/negocio/adapters/empresa-handoff";
import { levamos } from "@/lib/negocio/adapters/empresa-handoff";

export default function ImportacaoNegocio({
  handoff,
  aoIgnorar,
}: {
  handoff: HandoffNegocioEmpresaV1;
  /** Repõe os valores por omissão do simulador. A saída tem de existir. */
  aoIgnorar: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [ignorado, setIgnorado] = useState(false);
  const banner = useRef<HTMLElement>(null);

  // O foco vai para o banner quando ele aparece: quem navega por teclado
  // ou leitor de ecrã não pode descobrir a importação por acaso, três
  // campos depois de ela já ter mexido nos valores.
  useEffect(() => {
    banner.current?.focus();
  }, []);

  const nome = handoff.origem.nome;
  const linhas = linhasDe(handoff);

  if (ignorado) {
    return (
      <div
        className="mb-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 dark:border-stone-700 dark:bg-stone-800/50"
        role="status"
      >
        <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-300">
          Importação ignorada. Os campos voltaram aos valores por omissão do simulador.
        </p>
      </div>
    );
  }

  return (
    <section
      ref={banner}
      tabIndex={-1}
      aria-labelledby="importacao-titulo"
      className="mb-4 rounded-4xl border border-brand/25 bg-brand-light/40 p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-brand/25 dark:bg-brand/10 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-brand text-white"
          aria-hidden
        >
          <Sparkle size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id="importacao-titulo"
            className="font-display text-base font-semibold text-brand-deep dark:text-brand-mint"
          >
            Continuamos de onde ficaste
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-stone-700 dark:text-stone-200">
            {nome ? (
              <>
                Este simulador recebeu o projeto <strong>{nome}</strong>.{" "}
              </>
            ) : (
              "Este simulador recebeu o teu projeto do Estúdio de Viabilidade. "
            )}
            Importámos {linhas.length} {linhas.length === 1 ? "resposta" : "respostas"} — revê-as antes de continuar.
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          aria-expanded={aberto}
          aria-controls="importacao-detalhe"
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-brand/40 bg-white px-4 text-sm font-semibold text-brand-deep transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:bg-stone-900 dark:text-brand-mint"
        >
          {aberto ? "Esconder dados importados" : "Ver dados importados"}
        </button>
        <button
          type="button"
          onClick={() => {
            aoIgnorar();
            setIgnorado(true);
          }}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-stone-600 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-stone-300"
        >
          Ignorar importação
        </button>
        {/* §24 — o Estúdio continua intacto no cofre local. Voltar não
            reconstrói nada. */}
        <Link
          href="/dashboard/negocio"
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-stone-600 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-stone-300"
        >
          <ArrowLeft size={13} aria-hidden />
          Voltar ao projeto
        </Link>
      </div>

      {aberto ? (
        <div
          id="importacao-detalhe"
          className="mt-4 rounded-2xl border border-stone-100 bg-white p-3 dark:border-stone-800 dark:bg-stone-900 sm:p-4"
        >
          <DadosHerdados
            levamos={linhas}
            faltaDecidir={handoff.pendentes.map((p) => ({ rotulo: p.rotulo, porque: p.porque }))}
            tituloFalta="Falta decidir aqui"
            rodape={
              <>
                {handoff.estrutura.length > 0 ? (
                  <section aria-labelledby="importacao-estrutura" className="border-t border-stone-100 pt-3 dark:border-stone-800">
                    <h4 id="importacao-estrutura" className="eyebrow mb-2 text-stone-500 dark:text-stone-400">
                      De onde vem a estrutura
                    </h4>
                    <ul className="space-y-1">
                      {handoff.estrutura.map((l) => (
                        <li
                          key={`${l.categoria}-${l.rotulo}`}
                          className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs"
                        >
                          <span className="min-w-0 text-stone-600 dark:text-stone-300">{l.rotulo}</span>
                          <span className="flex-shrink-0 tabular-nums text-stone-700 dark:text-stone-200">
                            {fmt(l.valorAnual)}/ano
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {handoff.avisos.length > 0 ? (
                  <ul className="space-y-2 border-t border-stone-100 pt-3 dark:border-stone-800">
                    {handoff.avisos.map((a) => (
                      <li
                        key={a.id}
                        className={`flex items-start gap-1.5 text-[11px] leading-relaxed ${
                          a.severidade === "atencao"
                            ? "text-alert-text"
                            : "text-stone-500 dark:text-stone-400"
                        }`}
                      >
                        <Info size={12} className="mt-0.5 flex-shrink-0" aria-hidden />
                        <span>{a.texto}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            }
          />
        </div>
      ) : null}
    </section>
  );
}

/** Um selo compacto para um campo que veio do projeto (§20). */
export function CampoImportado({ detalhe }: { detalhe?: string }) {
  return (
    <span className="mt-1 inline-flex flex-col gap-0.5">
      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-brand-light/70 px-2 py-0.5 text-[10px] font-semibold text-brand-deep dark:bg-brand/15 dark:text-brand-mint">
        Do teu projeto
      </span>
      {detalhe ? (
        <span className="text-[10px] leading-snug text-stone-500 dark:text-stone-400">{detalhe}</span>
      ) : null}
    </span>
  );
}

function linhasDe(h: HandoffNegocioEmpresaV1): LinhaHerdada[] {
  const valores: Record<string, string | undefined> = {
    faturacaoAnual: h.prefill.faturacaoAnual !== undefined ? fmt(h.prefill.faturacaoAnual) : undefined,
    despesasOper: h.prefill.despesasOper !== undefined ? fmt(h.prefill.despesasOper) : undefined,
    custosEstrutura: h.prefill.custosEstrutura !== undefined ? fmt(h.prefill.custosEstrutura) : undefined,
    localizacao: h.prefill.localNome,
    jaTemEmpresa: h.prefill.jaTemEmpresa === "sim" ? "Sim" : undefined,
    incluirConstituicao: h.prefill.incluirConstituicao === false ? "Não contam" : undefined,
  };

  return levamos(h).map(({ chave, rotulo, proveniencia }) => ({
    rotulo,
    valor: valores[chave],
    origem: proveniencia.texto,
  }));
}
