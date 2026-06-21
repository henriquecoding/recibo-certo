"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { m } from "motion/react";
import { EASE } from "@/lib/motion";
import {
  efeitoFiscal,
  META_TIPO,
  RETENCAO,
  COEFICIENTE_POR_TIPO,
  ATIVIDADES,
} from "@/lib/fiscal-data";
import { pct } from "@/lib/format";
import ActivityCombobox from "@/components/ui/ActivityCombobox";
import InfoTip from "@/components/ui/InfoTip";
import Badge from "@/components/ui/Badge";
import { Check, ArrowRight } from "@/components/ui/Icons";
import type { Atividade } from "@/lib/fiscal-data";
import Link from "next/link";

const TIPO_BADGE: Record<string, { label: string; tone: "brand" | "neutral" | "alert" | "danger" }> = {
  art151: { label: "Art. 151.º CIRS", tone: "brand" },
  outros: { label: "Categoria B — outros", tone: "neutral" },
  vendas: { label: "Comércio / produção", tone: "neutral" },
  diretosAutor: { label: "Direitos de autor", tone: "danger" },
};

const IMPLICACOES: Record<string, string[]> = {
  art151: [
    "Retenção obrigatória de 23% em cada recibo (clientes empresas)",
    "Coeficiente 0,75 no regime simplificado",
    "Base SS: 70% do rendimento",
    "Pode dispensar retenção abaixo de 15 000 €/ano acumulados",
  ],
  outros: [
    "Retenção de 11,5% em cada recibo (clientes empresas)",
    "Coeficiente 0,35 no regime simplificado",
    "Base SS: 70% do rendimento",
    "Pode dispensar retenção abaixo de 15 000 €/ano acumulados",
  ],
  vendas: [
    "Sem retenção na fonte",
    "Coeficiente 0,15 no regime simplificado (menor tributação)",
    "Base SS: apenas 20% do rendimento",
    "Isento de Segurança Social se principal rendimento for emprego",
  ],
  diretosAutor: [
    "Retenção de 16,5% em cada recibo (clientes empresas)",
    "Coeficiente 0,95 no regime simplificado (maior tributação)",
    "Base SS: 70% do rendimento",
    "Dedução especial de 5% para despesas de produção cultural",
  ],
};

const COMPARACAO_LINHAS = [
  { label: "Retenção na fonte", campo: "retencao" as const },
  { label: "Coeficiente regime simplificado", campo: "coef" as const },
  { label: "Base Segurança Social", campo: "baseSS" as const },
];

export function ComparadorCAE() {
  const searchParams = useSearchParams();
  const [atividade, setAtividade] = useState<Atividade | null>(null);

  useEffect(() => {
    const q = searchParams.get("q");
    if (!q || atividade) return;
    const normalizar = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const qn = normalizar(q);
    const match = (ATIVIDADES as Atividade[]).find((a) => normalizar(a.label) === qn)
      ?? (ATIVIDADES as Atividade[]).find((a) => normalizar(a.label).includes(qn));
    if (match) setAtividade(match);
  }, [searchParams, atividade]);

  const efeito = atividade ? efeitoFiscal(atividade) : null;
  const tipo = atividade?.tipo ?? null;
  const meta = tipo ? META_TIPO[tipo] : null;

  return (
    <div className="rounded-3xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-6 my-8">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4">
        Classificar atividade
      </p>

      <div className="mb-6">
        <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-2">
          Pesquisa a tua atividade ou profissão
        </label>
        <ActivityCombobox value={atividade} onChange={setAtividade} />
        <p className="mt-2 text-xs text-stone-400">
          Inclui 99 atividades da tabela do Art. 151.º CIRS e categorias B do IRS.
        </p>
      </div>

      {efeito && tipo && meta && atividade ? (
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="space-y-5"
        >
          {/* Resultado principal */}
          <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-xs text-stone-400 mb-0.5">{atividade.label}</p>
                <Badge tone={TIPO_BADGE[tipo].tone}>{TIPO_BADGE[tipo].label}</Badge>
              </div>
              <div className="text-right">
                <p className="text-xs text-stone-400 mb-1">Retenção na fonte</p>
                <p className="font-display text-2xl font-semibold text-brand">
                  {pct(RETENCAO[tipo].value)}
                </p>
              </div>
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
              {meta.info}
            </p>
          </div>

          {/* Tabela de métricas */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-stone-100 dark:border-stone-700 bg-white dark:bg-stone-800 p-4 text-center">
              <p className="text-xs text-stone-400 mb-1.5">
                Retenção{" "}
                <InfoTip label="Base legal">Art. 101.º CIRS</InfoTip>
              </p>
              <p className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
                {pct(RETENCAO[tipo].value)}
              </p>
            </div>
            <div className="rounded-2xl border border-stone-100 dark:border-stone-700 bg-white dark:bg-stone-800 p-4 text-center">
              <p className="text-xs text-stone-400 mb-1.5">
                Coeficiente{" "}
                <InfoTip label="Base legal">{efeito.legalCoef}</InfoTip>
              </p>
              <p className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
                {pct(COEFICIENTE_POR_TIPO[tipo])}
              </p>
            </div>
            <div className="rounded-2xl border border-stone-100 dark:border-stone-700 bg-white dark:bg-stone-800 p-4 text-center">
              <p className="text-xs text-stone-400 mb-1.5">
                Base SS{" "}
                <InfoTip label="Base legal">Art. 168.º Cód. Contributivo</InfoTip>
              </p>
              <p className="font-display text-xl font-semibold text-stone-800 dark:text-stone-100">
                {efeito.baseSS === "servicos" ? "70%" : "20%"}
              </p>
            </div>
          </div>

          {/* Implicações */}
          <div className="rounded-2xl border border-stone-100 dark:border-stone-700 bg-white dark:bg-stone-800 p-5">
            <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-3">
              Implicações práticas
            </p>
            <ul className="space-y-2">
              {IMPLICACOES[tipo].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-stone-600 dark:text-stone-400">
                  <Check size={15} className="mt-0.5 flex-shrink-0 text-brand" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* CTA para guias relacionados */}
          <div className="flex flex-wrap gap-3">
            <Link
              href="/guias/retencao-na-fonte"
              className="inline-flex items-center gap-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2.5 text-sm font-semibold text-stone-600 dark:text-stone-300 hover:border-brand hover:text-brand transition-colors"
            >
              Guia de retenção na fonte
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/guias/regime-simplificado"
              className="inline-flex items-center gap-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2.5 text-sm font-semibold text-stone-600 dark:text-stone-300 hover:border-brand hover:text-brand transition-colors"
            >
              Calculadora de regime simplificado
              <ArrowRight size={14} />
            </Link>
          </div>
        </m.div>
      ) : (
        <div className="rounded-2xl border border-dashed border-stone-200 dark:border-stone-700 p-8 text-center">
          <p className="text-sm text-stone-400 mb-1">Pesquisa a tua atividade acima</p>
          <p className="text-xs text-stone-300 dark:text-stone-600">
            Verás a retenção, o coeficiente e a base de Segurança Social aplicável.
          </p>
        </div>
      )}
    </div>
  );
}
