"use client";

// ═══════════════════════════════════════════════════════════════════════
//  PROVAR NO TEU MERCADO — a parte que nenhuma fonte pública substitui
//  ---------------------------------------------------------------------
//  Este painel vem do checkpoint anterior e fica intacto no que importa:
//  é o único sítio onde uma hipótese pode passar de leitura a facto.
//
//  As três regras, que não mudam:
//   1. Entrevista NÃO é prova de mercado. Conta-se, mostra-se, e não
//      promove nada — «parece interessante» nunca foi uma venda.
//   2. Prova é orçamento aceite, pré-venda, piloto pago ou venda.
//   3. Operação exige repetição, contribuição positiva OBSERVADA e
//      dinheiro recebido. As três.
//
//  O que muda face ao ecrã anterior: uma composição gerada pelo motor
//  também se pode provar. A prova é indexada pelo id do candidato quando
//  não há dossier curado equivalente — porque provar uma hipótese que
//  ninguém escreveu é exatamente o que se quer que aconteça.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import {
  addProof,
  newHypothesis,
  PROOF_LABELS,
  PROOF_VALIDITY_DAYS,
  removeProof,
  summarizeProofs,
  type MarketHypothesis,
  type MarketProofKind,
} from "@/lib/negocio/market/hipoteses";
import type { MarketRegion } from "@/lib/negocio/market/geografia";
import { Plus, Trash } from "@/components/ui/Icons";

const ORDEM: readonly MarketProofKind[] = ["interview", "accepted_quote", "pre_sale", "paid_pilot", "sale"];

function novoId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `prova_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function ProvaLocal({
  hipoteseId,
  hipotese,
  regiao,
  onChange,
}: {
  hipoteseId: string;
  hipotese?: MarketHypothesis;
  regiao: MarketRegion;
  onChange: (proxima: MarketHypothesis) => void;
}) {
  // O instante de referência só existe depois da montagem: o servidor e o
  // cliente não podem discordar sobre que dia é hoje.
  const [agora, setAgora] = useState("");
  useEffect(() => setAgora(new Date().toISOString()), []);
  const [dia, setDia] = useState("");
  useEffect(() => setDia((atual) => atual || agora.slice(0, 10)), [agora]);

  const [tipo, setTipo] = useState<MarketProofKind>("interview");
  const [recebido, setRecebido] = useState(false);
  const [margem, setMargem] = useState(false);

  const resumo = hipotese && agora ? summarizeProofs(hipotese, agora) : null;
  const paga = tipo === "paid_pilot" || tipo === "sale" || tipo === "pre_sale";

  const registar = () => {
    const base = hipotese ?? newHypothesis(hipoteseId, regiao);
    onChange(
      addProof(base, {
        id: novoId(),
        kind: tipo,
        occurredAt: dia,
        ...(paga ? { paymentReceived: recebido, positiveContribution: margem } : {}),
      }),
    );
    setRecebido(false);
    setMargem(false);
  };

  return (
    <div className="rounded-3xl border border-stone-100 p-4 dark:border-stone-800">
      <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">Registar o que já provaste</p>
      <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
        Fica tudo neste dispositivo. Uma entrevista conta-se, mas não promove a hipótese — só orçamento
        aceite, pré-venda, piloto pago ou venda o fazem. As provas valem {PROOF_VALIDITY_DAYS} dias.
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {ORDEM.map((kind) => (
          <button
            key={kind}
            type="button"
            aria-pressed={tipo === kind}
            onClick={() => setTipo(kind)}
            className={`min-h-[36px] rounded-full border px-3 text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              tipo === kind
                ? "border-brand bg-brand text-white"
                : "border-stone-200 text-stone-600 dark:border-stone-700 dark:text-stone-300"
            }`}
          >
            {PROOF_LABELS[kind]}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="min-w-[9rem] flex-1 text-[11px] font-semibold text-stone-600 dark:text-stone-300 sm:max-w-[14rem]">
          Quando aconteceu
          <input
            type="date"
            value={dia}
            max={agora ? agora.slice(0, 10) : undefined}
            onChange={(evento) => setDia(evento.target.value)}
            className="mt-1 block h-9 w-full rounded-xl border border-stone-200 bg-white px-2.5 text-xs text-ink focus:border-brand focus:outline-none dark:border-stone-700 dark:bg-stone-950"
          />
        </label>
        <button
          type="button"
          onClick={registar}
          disabled={!dia}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-brand-deep px-3.5 text-[11px] font-semibold text-white disabled:opacity-40"
        >
          <Plus size={12} /> Registar
        </button>
      </div>

      {paga ? (
        <div className="mt-2 space-y-1.5">
          {[
            { on: recebido, set: setRecebido, label: "O dinheiro entrou mesmo" },
            { on: margem, set: setMargem, label: "A margem observada foi positiva depois dos custos reais" },
          ].map((item) => (
            <label
              key={item.label}
              className="flex items-start gap-2 text-[11px] leading-snug text-stone-600 dark:text-stone-300"
            >
              <input
                type="checkbox"
                checked={item.on}
                onChange={(evento) => item.set(evento.target.checked)}
                className="mt-0.5 h-4 w-4 flex-none accent-brand"
              />
              {item.label}
            </label>
          ))}
        </div>
      ) : null}

      {hipotese?.proofs.length ? (
        <ul className="mt-3 space-y-1.5 border-t border-stone-100 pt-3 dark:border-stone-800">
          {hipotese.proofs.slice(0, 6).map((prova) => (
            <li key={prova.id} className="flex items-center justify-between gap-2 text-[11px] text-stone-600 dark:text-stone-300">
              <span>
                {PROOF_LABELS[prova.kind]} · {prova.occurredAt}
                {prova.paymentReceived ? " · recebido" : ""}
              </span>
              <button
                type="button"
                onClick={() => onChange(removeProof(hipotese, prova.id))}
                aria-label={`Apagar ${PROOF_LABELS[prova.kind]} de ${prova.occurredAt}`}
                className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full text-stone-400 hover:text-red-600"
              >
                <Trash size={13} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {resumo ? (
        <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
          {resumo.currentInterviews} {resumo.currentInterviews === 1 ? "entrevista" : "entrevistas"} ·{" "}
          {resumo.currentMarketProofs} {resumo.currentMarketProofs === 1 ? "prova de mercado" : "provas de mercado"}{" "}
          válidas
          {resumo.expired > 0 ? ` · ${resumo.expired} fora de validade` : ""}.
          {resumo.currentMarketProofs > 0
            ? " Isto deixou de ser uma hipótese: alguém pagou."
            : " Enquanto não houver prova paga, continua a ser uma hipótese."}
        </p>
      ) : null}
    </div>
  );
}
