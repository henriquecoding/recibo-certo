"use client";

import { SS_TAXA, SS_COEFICIENTE, SS_ISENCAO_PRIMEIRO_ANO_MESES, ATIVIDADES, efeitoFiscal, type BaseSS } from "@/lib/fiscal-data";
import { fmt } from "@/lib/format";
import { type Recibo } from "@/lib/store/recibos";
import { Warning } from "@/components/ui/Icons";

function baseSsDoRecibo(r: Recibo): BaseSS {
  if (r.atividade) {
    const ativ = ATIVIDADES.find((a) => a.label === r.atividade);
    if (ativ) return efeitoFiscal(ativ).baseSS;
  }
  return r.baseSS;
}

export function calcularSS(rendimentoTrimestre: number, baseSS: BaseSS = "servicos"): number {
  return rendimentoTrimestre * SS_COEFICIENTE[baseSS].value * SS_TAXA.value;
}

/**
 * Prazo da DECLARAÇÃO trimestral de rendimentos à Segurança Social:
 * até ao último dia do mês seguinte ao fim do trimestre.
 * Q1 (jan–mar) → 30 abr · Q2 → 31 jul · Q3 → 31 out · Q4 → 31 jan (ano+1).
 * O PAGAMENTO não é trimestral: a contribuição é MENSAL, entre o dia 10 e
 * o dia 20 do mês seguinte àquele a que respeita (Art. 154.º Código
 * Contributivo). Ver `pagamentoMensalSS`.
 */
export function prazoDeclaracaoSS(trimestreIndex: number, ano: number): Date {
  switch (trimestreIndex) {
    case 0: return new Date(ano, 3, 30);
    case 1: return new Date(ano, 6, 31);
    case 2: return new Date(ano, 9, 31);
    case 3: return new Date(ano + 1, 0, 31);
    default: return new Date(ano, 3, 30);
  }
}

/**
 * Data-limite (dia 20) do pagamento mensal seguinte a partir de uma data de
 * referência: a contribuição do mês M paga-se entre 10 e 20 de M+1.
 */
export function proximoPagamentoSS(ref: Date): Date {
  const alvo = new Date(ref.getFullYear(), ref.getMonth(), 20);
  if (ref.getDate() > 20) alvo.setMonth(alvo.getMonth() + 1);
  return alvo;
}

function trimestreAtual(mes: number): number {
  return Math.floor(mes / 3);
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

export default function GuardiaoSS({
  recibos,
  primeiroAno = false,
  acumulaEmprego = false,
}: {
  recibos: Recibo[];
  primeiroAno?: boolean;
  acumulaEmprego?: boolean;
}) {
  const hoje       = new Date();
  const ano        = hoje.getFullYear();
  const mesAtual   = hoje.getMonth();
  const tri        = trimestreAtual(mesAtual);
  const prazoDecl  = prazoDeclaracaoSS(tri, ano);
  const dias       = diasEntreHoje(prazoDecl);
  const proxPag    = proximoPagamentoSS(hoje);
  const nTri       = nomeTrimestre(tri);
  const isencaoMeses = SS_ISENCAO_PRIMEIRO_ANO_MESES.value;

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

  if (acumulaEmprego) {
    return (
      <div className="rounded-4xl border border-brand/20 bg-brand-light p-6 shadow-card dark:bg-brand/10">
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">
          Segurança Social — {nTri} Trimestre
        </h2>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Acumulas com trabalho dependente — a SS já está coberta pelo teu empregador.
        </p>
      </div>
    );
  }

  const recibosT = recibosDoTrimestre(recibos, tri, ano);

  const valorSSPorBase = recibosT.reduce(
    (acc, r) => {
      const bs = baseSsDoRecibo(r);
      const coef = SS_COEFICIENTE[bs].value;
      acc.baseServicos += bs === "servicos" ? r.valor * coef : 0;
      acc.baseBens += bs === "bens" ? r.valor * coef : 0;
      acc.rendimento += r.valor;
      return acc;
    },
    { baseServicos: 0, baseBens: 0, rendimento: 0 },
  );

  const baseTotal = valorSSPorBase.baseServicos + valorSSPorBase.baseBens;
  const valorSS = baseTotal * SS_TAXA.value;
  const temBens = valorSSPorBase.baseBens > 0;
  const temServicos = valorSSPorBase.baseServicos > 0;
  const baseMista = temBens && temServicos;

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
            Declarar até {prazoDecl.toLocaleDateString("pt-PT", { day: "numeric", month: "long" })} · pagamento mensal (dia 10–20)
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
          <span className="font-medium text-stone-700 dark:text-stone-300">{fmt(valorSSPorBase.rendimento)}</span>
        </div>
        {baseMista ? (
          <>
            <div className="flex justify-between text-xs">
              <span className="text-stone-500">Base serviços (70%)</span>
              <span className="font-medium text-stone-700 dark:text-stone-300">{fmt(valorSSPorBase.baseServicos)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-stone-500">Base bens (20%)</span>
              <span className="font-medium text-stone-700 dark:text-stone-300">{fmt(valorSSPorBase.baseBens)}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between text-xs">
            <span className="text-stone-500">Base de incidência ({temBens ? "20" : "70"} %)</span>
            <span className="font-medium text-stone-700 dark:text-stone-300">{fmt(baseTotal)}</span>
          </div>
        )}
        <div className="flex justify-between text-xs border-t border-stone-200 pt-2 dark:border-stone-700">
          <span className="font-semibold text-stone-600 dark:text-stone-400">
            Contribuição SS ({(SS_TAXA.value * 100).toFixed(1)} %)
          </span>
          <span className="font-bold text-stone-800 dark:text-stone-100">{fmt(valorSS)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-stone-500">Equivale a ~{fmt(valorSS / 3)}/mês</span>
          <span className="text-stone-500">próximo pagamento até {proxPag.toLocaleDateString("pt-PT", { day: "numeric", month: "short" })}</span>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-stone-400">
        Este valor é estimativo e serve para reservares o trimestre inteiro. Na prática, a declaração é
        trimestral (jan, abr, jul e out, até ao fim do mês) e a contribuição paga-se TODOS os meses,
        entre o dia 10 e o dia 20 do mês seguinte, com base nos rendimentos declarados no trimestre
        anterior — confirma os valores na Segurança Social Direta.
      </p>
    </div>
  );
}
