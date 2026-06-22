"use client";

import { DISPENSA_RETENCAO_LIMITE, RETENCAO, ATIVIDADES, efeitoFiscal, type TipoAtividade } from "@/lib/fiscal-data";
import { fmt, pct } from "@/lib/format";
import { type Recibo } from "@/lib/store/recibos";
import { ShieldCheck, Warning } from "@/components/ui/Icons";

function taxaRetencaoDoRecibo(r: Recibo): number {
  if (r.atividade) {
    const ativ = ATIVIDADES.find((a) => a.label === r.atividade);
    if (ativ) return efeitoFiscal(ativ).retencao;
  }
  return RETENCAO[r.tipo].value;
}

function tipoDominante(recibos: Recibo[]): TipoAtividade {
  if (recibos.length === 0) return "art151";
  const contagem: Record<string, number> = {};
  for (const r of recibos) {
    const t = r.atividade
      ? (ATIVIDADES.find((a) => a.label === r.atividade)?.tipo ?? r.tipo)
      : r.tipo;
    contagem[t] = (contagem[t] ?? 0) + 1;
  }
  let max = 0;
  let tipo: TipoAtividade = "art151";
  for (const [t, n] of Object.entries(contagem)) {
    if (n > max) { max = n; tipo = t as TipoAtividade; }
  }
  return tipo;
}

export default function GuardiaoRetencao({
  recibos,
}: {
  recibos: Recibo[];
}) {
  const ano = new Date().getFullYear();
  const limite = DISPENSA_RETENCAO_LIMITE.value;

  const doAno = recibos.filter(
    (r) => new Date(r.data + "T00:00:00").getFullYear() === ano,
  );
  const tipo = tipoDominante(doAno);
  const taxa = RETENCAO[tipo].value;
  const taxaPct = pct(taxa);

  const faturado = doAno.reduce((s, r) => s + r.valor, 0);

  const temMultiplasTaxas = (() => {
    const taxas = new Set(doAno.map(taxaRetencaoDoRecibo));
    return taxas.size > 1;
  })();

  const ratio = faturado / limite;

  const estado: "normal" | "aviso" | "ativo" =
    faturado >= limite   ? "ativo"  :
    ratio    >= 0.85     ? "aviso"  :
    "normal";

  const config = {
    normal: {
      border: "border-stone-100 dark:border-stone-800",
      bg:     "bg-white dark:bg-stone-900",
      badge:  { label: "Dispensado de reter", cls: "bg-brand/10 text-brand-dark dark:text-brand-mint" },
      icon:   <ShieldCheck size={16} className="text-brand" />,
      texto:  "Podes indicar nas faturas a entidades nacionais que não há retenção na fonte (Art. 101.º-B do CIRS).",
    },
    aviso: {
      border: "border-amber-200 dark:border-amber-800/40",
      bg:     "bg-amber-50 dark:bg-amber-950/20",
      badge:  { label: "Atenção", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
      icon:   <Warning size={16} className="text-amber-600" />,
      texto:  `Estás próximo do limite. Ao ultrapassares ${fmt(limite)}, as entidades contratantes passarão a reter ${taxaPct} sobre os teus honorários.`,
    },
    ativo: {
      border: "border-alert-text/30",
      bg:     "bg-alert-bg dark:bg-amber-950/20",
      badge:  { label: "Retenção obrigatória", cls: "bg-alert-text/10 text-alert-text" },
      icon:   <Warning size={16} className="text-alert-text" />,
      texto:  `As entidades com contabilidade organizada devem reter ${taxaPct} nos teus recibos. Certifica-te de que o teu cliente está a aplicar corretamente.`,
    },
  }[estado];

  return (
    <div className={`rounded-4xl border p-6 shadow-card ${config.border} ${config.bg}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
          Retenção na Fonte
        </h2>
        <span className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold ${config.badge.cls}`}>
          {config.icon}
          {config.badge.label}
        </span>
      </div>

      <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400 mb-4">
        {config.texto}
      </p>

      {/* Progresso visual */}
      <div className="space-y-1.5 mb-3">
        <div className="flex justify-between text-xs text-stone-400">
          <span>{fmt(faturado)} faturado</span>
          <span>limite {fmt(limite)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              estado === "ativo" ? "bg-alert-text" :
              estado === "aviso" ? "bg-amber-400" :
              "bg-brand"
            }`}
            style={{ width: `${Math.min(100, ratio * 100).toFixed(1)}%` }}
          />
        </div>
      </div>

      {/* Detalhe fiscal */}
      <div className="rounded-2xl bg-stone-50 dark:bg-stone-800/50 p-3 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-stone-500">Taxa de retenção aplicável</span>
          <span className="font-semibold text-stone-700 dark:text-stone-300">{taxaPct}</span>
        </div>
        {temMultiplasTaxas && (
          <div className="flex justify-between text-xs">
            <span className="text-stone-500">Taxas mistas</span>
            <span className="font-medium text-amber-600 dark:text-amber-400">Vários tipos de atividade</span>
          </div>
        )}
        <div className="flex justify-between text-xs">
          <span className="text-stone-500">Base legal</span>
          <span className="font-medium text-stone-600 dark:text-stone-400">Art. 101.º-B CIRS</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-stone-500">Exceção: imposto &lt;25 EUR</span>
          <span className="font-medium text-stone-600 dark:text-stone-400">Sempre dispensada</span>
        </div>
        <p className="pt-1 text-[10px] text-stone-400">
          Clientes estrangeiros e particulares: nunca há retenção, independentemente do volume.
        </p>
      </div>
    </div>
  );
}
