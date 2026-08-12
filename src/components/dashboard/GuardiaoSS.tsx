"use client";

import Link from "next/link";
import { SS_TAXA } from "@/lib/fiscal-data";
import { fmt } from "@/lib/format";
import { type Recibo } from "@/lib/recibos-contrato";
import { avaliarSS, type CondicaoSS } from "@/lib/fiscal-ss-guardiao";
import { prazoDeclaracaoSS, proximoPagamentoSS } from "@/lib/fiscal-ss-prazos";
import { type PreferenciasFiscais } from "@/lib/store/preferencias-fiscais";
import { Warning, Check, ArrowRight } from "@/components/ui/Icons";

const NOME_TRIMESTRE = ["1.º", "2.º", "3.º", "4.º"];

const ICONE_CONDICAO: Record<CondicaoSS["estado"], React.ReactNode> = {
  cumprida: <Check size={12} className="text-brand" />,
  "nao-cumprida": <Warning size={12} className="text-alert-text" />,
  "por-confirmar": <Warning size={12} className="text-stone-400" />,
};

export default function GuardiaoSS({
  recibos,
  ano,
  prefs,
}: {
  recibos: Recibo[];
  ano: number;
  prefs: PreferenciasFiscais;
}) {
  const hoje = new Date();
  // A decisão vive em `fiscal-ss-guardiao.ts`: a dispensa por acumulação
  // depende de três condições cumulativas do Art. 157.º, e o primeiro ano
  // deriva da data real de início. Um booleano não zera a reserva de ninguém
  // (RC-P0-08).
  const v = avaliarSS({
    recibos,
    ano,
    dataInicioAtividade: prefs.dataInicioAtividade,
    acumulaEmprego: prefs.acumulaEmprego,
    entidadesDistintas:
      prefs.acumulacaoEntidadesDistintas === "nao-sei" ? null : prefs.acumulacaoEntidadesDistintas === "sim",
    remuneracaoDependenteMensal: prefs.remuneracaoDependenteMensal,
    hoje,
  });

  const prazoDecl = prazoDeclaracaoSS(v.trimestre, ano);
  const proxPag = proximoPagamentoSS(hoje);
  const dias = Math.ceil((prazoDecl.getTime() - hoje.getTime()) / 86_400_000);
  const nTri = NOME_TRIMESTRE[v.trimestre] ?? "";

  const badgePrazo =
    dias <= 7
      ? { label: `Urgente — vence em ${dias} dias`, cls: "bg-clay-bg text-clay-text" }
      : dias <= 30
        ? { label: `Prazo em ${dias} dias`, cls: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" }
        : null;

  const moldura =
    v.severidade === "alerta"
      ? "border-alert-text/30 bg-alert-bg dark:bg-amber-950/20"
      : v.severidade === "aviso"
        ? "border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20"
        : v.estado === "isencao-primeiro-ano" || v.estado === "dispensa-acumulacao"
          ? "border-brand/20 bg-brand-light dark:bg-brand/10"
          : "border-stone-100 bg-white dark:border-stone-800 dark:bg-stone-900";

  return (
    <div className={`rounded-4xl border p-6 shadow-card ${moldura}`}>
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            Segurança Social — {nTri} trimestre
          </h2>
          <p className="mt-0.5 text-xs text-stone-400">
            Declarar até {prazoDecl.toLocaleDateString("pt-PT", { day: "numeric", month: "long" })} · pagamento mensal (dia 10–20)
          </p>
        </div>
        {badgePrazo && (
          <span className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold ${badgePrazo.cls}`}>
            <Warning size={12} />
            {badgePrazo.label}
          </span>
        )}
      </div>

      <p className="mb-1 text-sm font-semibold text-stone-800 dark:text-stone-100">{v.titulo}</p>
      <p className="mb-4 text-xs leading-relaxed text-stone-500 dark:text-stone-400">{v.mensagem}</p>

      {/* Valor em destaque — nunca zero por suposição. */}
      <div className="mb-5">
        <p className="mb-0.5 text-xs text-stone-400">Reservar para SS</p>
        <p className="font-display text-3xl font-semibold text-stone-800 dark:text-stone-100">{fmt(v.valorReservar)}</p>
      </div>

      {/* Condições da dispensa por acumulação, uma a uma. */}
      {v.condicoes.length > 0 && (
        <ul className="mb-4 space-y-2 rounded-2xl bg-white/60 p-3 dark:bg-stone-800/50">
          {v.condicoes.map((c) => (
            <li key={c.label} className="flex items-start gap-2">
              <span className="mt-0.5 flex-shrink-0">{ICONE_CONDICAO[c.estado]}</span>
              <span className="min-w-0">
                <span className="block text-xs font-medium text-stone-700 dark:text-stone-300">{c.label}</span>
                <span className="block text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">{c.detalhe}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Breakdown do cálculo */}
      {v.rendimentoTrimestre > 0 && (
        <div className="space-y-2 rounded-2xl bg-stone-50 p-4 dark:bg-stone-800/50">
          <div className="flex justify-between text-xs">
            <span className="text-stone-500">Rendimento do trimestre</span>
            <span className="font-medium text-stone-700 dark:text-stone-300">{fmt(v.rendimentoTrimestre)}</span>
          </div>
          {v.baseServicos > 0 && v.baseBens > 0 ? (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-stone-500">Base serviços (70%)</span>
                <span className="font-medium text-stone-700 dark:text-stone-300">{fmt(v.baseServicos)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-stone-500">Base bens (20%)</span>
                <span className="font-medium text-stone-700 dark:text-stone-300">{fmt(v.baseBens)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-xs">
              <span className="text-stone-500">Base de incidência ({v.baseBens > 0 ? "20" : "70"} %)</span>
              <span className="font-medium text-stone-700 dark:text-stone-300">{fmt(v.baseTotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-xs">
            <span className="text-stone-500">Rendimento relevante médio</span>
            <span className="font-medium text-stone-700 dark:text-stone-300">
              {fmt(v.rendimentoRelevanteMedioMensal)}/mês · limite {fmt(v.limiteAcumulacao)}
            </span>
          </div>
          <div className="flex justify-between border-t border-stone-200 pt-2 text-xs dark:border-stone-700">
            <span className="font-semibold text-stone-600 dark:text-stone-400">
              Contribuição SS ({(SS_TAXA.value * 100).toFixed(1)} %)
            </span>
            <span className="font-bold text-stone-800 dark:text-stone-100">{fmt(v.valorReservar)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-stone-500">Equivale a ~{fmt(v.valorReservar / 3)}/mês</span>
            <span className="text-stone-500">
              próximo pagamento até {proxPag.toLocaleDateString("pt-PT", { day: "numeric", month: "short" })}
            </span>
          </div>
        </div>
      )}

      {v.emFalta.length > 0 && (
        <div className="mt-3 rounded-xl border border-stone-200 bg-white/60 p-3 dark:border-stone-700 dark:bg-stone-800/40">
          <p className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">Para confirmarmos, falta saber:</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {v.emFalta.map((f) => (
              <li key={f} className="text-[11px] text-stone-500 dark:text-stone-400">{f}</li>
            ))}
          </ul>
          <Link href="/dashboard/perfil" className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline">
            Completar no perfil fiscal <ArrowRight size={10} />
          </Link>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-stone-400">
        Valor estimativo para reservares o trimestre inteiro. A declaração é trimestral (jan, abr, jul e out, até ao
        fim do mês) e a contribuição paga-se todos os meses, entre o dia 10 e o dia 20, com base nos rendimentos
        declarados no trimestre anterior — confirma na Segurança Social Direta.
      </p>
    </div>
  );
}
