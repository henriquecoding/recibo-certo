"use client";

// ═══════════════════════════════════════════════════════════════════════
//  ATO 0 — «Em que ponto estás?»
//  ---------------------------------------------------------------------
//  Três portas, e cada uma abre noutro sítio. Não é uma pergunta de
//  segmentação: é o que impede a ferramenta de fazer a pessoa errada
//  responder à pergunta errada.
//
//   · quem tem uma IDEIA não sabe o preço — começa pela oferta;
//   · quem JÁ VENDE sabe-o — traz o preço e quer validá-lo;
//   · quem JÁ TEM EMPRESA não quer voltar ao princípio — salta para a
//     estrutura e a otimização.
//
//  Perguntar «quanto vais faturar?» às três é o defeito que o relatório
//  inteiro existe para corrigir.
// ═══════════════════════════════════════════════════════════════════════

import { m } from "motion/react";
import { EASE } from "@/lib/motion";
import { ArrowRight, Building, Lightbulb, Receipt } from "@/components/ui/Icons";
import type { MaturidadeNegocio } from "@/lib/negocio/tipos";

const PORTAS: {
  chave: MaturidadeNegocio;
  rotulo: string;
  exemplo: string;
  aSeguir: string;
  Icone: typeof Lightbulb;
}[] = [
  {
    chave: "ideia",
    rotulo: "Tenho uma ideia",
    exemplo: "Ainda não vendi nada e quero saber se as contas fecham",
    aSeguir: "Começamos pelo que vais vender e a que preço",
    Icone: Lightbulb,
  },
  {
    chave: "ja_vendo",
    rotulo: "Já vendo",
    exemplo: "Tenho clientes e quero perceber se estou a cobrar bem",
    aSeguir: "Partimos do teu preço atual e validamos as contas",
    Icone: Receipt,
  },
  {
    chave: "empresa_existente",
    rotulo: "Já tenho empresa",
    exemplo: "Quero otimizar a estrutura, os custos ou a tesouraria",
    aSeguir: "Saltamos para a estrutura e a comparação fiscal",
    Icone: Building,
  },
];

export default function SeletorMaturidade({
  aoEscolher,
}: {
  aoEscolher: (m: MaturidadeNegocio) => void;
}) {
  return (
    <m.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      aria-labelledby="maturidade-titulo"
    >
      <h2 id="maturidade-titulo" className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
        Em que ponto estás?
      </h2>
      <p className="mb-6 mt-1 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
        O negócio começa antes da empresa. Diz-nos o que queres vender — construímos contigo o preço, o volume
        necessário e as contas da operação, e só depois comparamos as formas de começar.
      </p>

      <ul className="space-y-3">
        {PORTAS.map((porta) => (
          <li key={porta.chave}>
            <button
              type="button"
              onClick={() => aoEscolher(porta.chave)}
              className="group flex w-full items-start gap-3 rounded-4xl border border-stone-100 bg-white p-4 text-left shadow-card transition-all hover:border-brand hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-800 dark:bg-stone-900"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
                <porta.Icone size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-stone-800 dark:text-stone-100">{porta.rotulo}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                  {porta.exemplo}
                </span>
                {/* O que vem a seguir, dito ANTES de se escolher: é a
                    diferença entre um botão e uma decisão informada. */}
                <span className="mt-1.5 block text-[11px] leading-relaxed text-brand-dark dark:text-brand-mint">
                  {porta.aSeguir}
                </span>
              </span>
              <ArrowRight
                size={15}
                className="mt-1 flex-shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
              />
            </button>
          </li>
        ))}
      </ul>
    </m.section>
  );
}
