"use client";

import { SS_TAXA, SS_COEFICIENTE, SS_ISENCAO_PRIMEIRO_ANO_MESES } from "@/lib/fiscal-data";
import { fmt } from "@/lib/format";
import { type Recibo } from "@/lib/store/recibos";
import { Warning } from "@/components/ui/Icons";

// ── Funções puras exportáveis para testes ────────────────────────────────────

export function calcularSS(rendimentoTrimestre: number): number {
  return rendimentoTrimestre * SS_COEFICIENTE.servicos.value * SS_TAXA.value;
}

export function prazoSS(trimestreIndex: number, ano: number): Date {
  // trimestreIndex: 0 = Jan-Mar, 1 = Abr-Jun, 2 = Jul-Set, 3 = Out-Dez
  switch (trimestreIndex) {
    case 0: return new Date(ano, 9, 20);      // 1.o tri -> 20 outubro
    case 1: return new Date(ano, 9, 20);      // 2.o tri -> 20 outubro
    case 2: return new Date(ano + 1, 0, 20); // 3.o tri -> 20 janeiro seguinte
    case 3: return new Date(ano + 1, 3, 20); // 4.o tri -> 20 abril seguinte
    default: return new Date(ano, 9, 20);
  }
}

function trimestreAtual(mes: number): number {
  return Math.floor(mes / 3); // 0-indexed
}

function recibosDoTrimestre(recibos: Recibo[], tri: number, ano: number): Recibo[] {
  const inicio = tri * 3;
  return recibos.filter((r) => {
    const d = new Date(r.data + "T00:00:00");
    return d.getFullYear() === ano &&
           d.getMonth()    >= inicio &&
           d.getMonth()    <= inicio + 2;
  });
}

function diasEntreHoje(data: Date): number {
  return Math.ceil((data.getTime() - Date.now()) / 86_400_000);
}

function nomeTrimestre(tri: number): string {
  return ["1.o", "2.o", "3.o", "4.o"][tri] ?? "";
}

// ── Componente ───────────────────────────────────────────────────────────────

export default function GuardiaoSS({
  recibos,
  primeiroAno = false,
}: {
  recibos: Recibo[];
  primeiroAno?: boolean;
}) {
  const hoje       = new Date();
  const ano        = hoje.getFullYear();
  const mesAtual   = hoje.getMonth();
  const tri        = trimestreAtual(mesAtual);
  const prazo      = prazoSS(tri, ano);
  const dias       = diasEntreHoje(prazo);
  const nTri       = nomeTrimestre(tri);
  const isencaoMeses = SS_ISENCAO_PRIMEIRO_ANO_MESES.value; // geralmente 12

  // Verificar isenção do 1.o ano
  if (primeiroAno && isencaoMeses > 0) {
    return (
      <div className="rounded-4xl border border-brand/20 bg-brand-light p-6 shadow-card dark:bg-brand/10">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">
          Segurança Social — {nTri} Trimestre
        </h2>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Estás isento de contribuições de SS durante os primeiros {isencaoMeses} meses de atividade.
        </p>
      </div>
    );
  }

  const recibosT    = recibosDoTrimestre(recibos, tri, ano);
  const rendimentoT = recibosT.reduce((s, r) => s + r.valor, 0);
  const base        = rendimentoT * SS_COEFICIENTE.servicos.value;
  const valorSS     = calcularSS(rendimentoT);

  // Badge de prazo
  const badgePrazo =
    dias <= 7  ? { label: `Urgente — vence em ${dias} dias`, cls: "bg-clay-bg text-clay-text" } :
    dias <= 30 ? { label: `Prazo em ${dias} dias`, cls: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" } :
    null;

  return (
    <div className="rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            Segurança Social — {nTri} Trimestre
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Prazo: {prazo.toLocaleDateString("pt-PT", { day: "numeric", month: "long" })}
          </p>
        </div>
        {badgePrazo && (
          <span className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold ${badgePrazo.cls}`}>
            <Warning size={12} />
            {badgePrazo.label}
          </span>
        )}
      </div>

      {/* Valor em destaque */}
      <div className="mb-5">
        <p className="text-xs text-stone-400 mb-0.5">Reservar para SS</p>
        <p className="font-display text-3xl font-semibold text-stone-800 dark:text-stone-100">
          {fmt(valorSS)}
        </p>
      </div>

      {/* Breakdown do cálculo */}
      <div className="space-y-2 rounded-2xl bg-stone-50 p-4 dark:bg-stone-800/50">
        <div className="flex justify-between text-xs">
          <span className="text-stone-500">Rendimento do trimestre</span>
          <span className="font-medium text-stone-700 dark:text-stone-300">{fmt(rendimentoT)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-stone-500">Base de incidência (70 %)</span>
          <span className="font-medium text-stone-700 dark:text-stone-300">{fmt(base)}</span>
        </div>
        <div className="flex justify-between text-xs border-t border-stone-200 pt-2 dark:border-stone-700">
          <span className="font-semibold text-stone-600 dark:text-stone-400">
            Contribuição SS ({(SS_TAXA.value * 100).toFixed(1)} %)
          </span>
          <span className="font-bold text-stone-800 dark:text-stone-100">{fmt(valorSS)}</span>
        </div>
      </div>

      {/* Callout informativo */}
      <p className="mt-3 text-[11px] leading-relaxed text-stone-400">
        Este valor é estimativo. A base de cálculo oficial usa os rendimentos dos 3 meses anteriores ao
        trimestre de referência — confirma na Segurança Social Direta.
      </p>
    </div>
  );
}
