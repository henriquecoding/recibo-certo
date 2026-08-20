"use client";

// ═══════════════════════════════════════════════════════════════════════
//  ATO 8 — A caixa
//  ---------------------------------------------------------------------
//  P1 #7: separar lucro de liquidez. Um negócio pode ser lucrativo e ficar
//  sem dinheiro em abril — fatura a 60 dias, paga a 30, e o ano fecha bem
//  depois de a conta ter ficado vazia.
//
//  ── A FRASE NÃO É OPCIONAL ─────────────────────────────────────────
//  «Projeção de caixa, não saldo bancário real» aparece SEMPRE, e vem de
//  `PROJECAO_NAO_E_SALDO` para poder ser verificada por teste. Sem ela,
//  um saldo mínimo de −1 850 € parece um extrato.
//
//  ── ABRE A PEDIDO ──────────────────────────────────────────────────
//  Só quando a pessoa a pede, e a pergunta é feita em voz alta antes.
//  Seis campos novos à entrada, para responder a uma pergunta que ainda
//  ninguém fez, é exatamente o que a revelação progressiva evita.
// ═══════════════════════════════════════════════════════════════════════

import { fmt } from "@/lib/format";
import { CampoEuros, CampoNumero } from "@/components/precos/atomos";
import { Warning } from "@/components/ui/Icons";
import { explicarMes, PROJECAO_NAO_E_SALDO } from "@/lib/negocio/caixa";
import type { CaixaNegocio, ResultadoCaixa } from "@/lib/negocio/tipos";
import { BotaoSecundario, Cartao, Metrica } from "./atomos";

export default function ProjecaoCaixa({
  caixa,
  resultado,
  aoAtivar,
  aoMudar,
}: {
  caixa?: CaixaNegocio;
  resultado?: ResultadoCaixa;
  aoAtivar: () => void;
  aoMudar: (patch: Partial<CaixaNegocio>) => void;
}) {
  if (!caixa || !resultado) {
    return (
      <Cartao id="caixa">
        <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
          Queres saber se tens dinheiro para atravessar os primeiros meses?
        </p>
        <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
          O lucro diz se o modelo funciona. A caixa diz se se sobrevive até lá — e são coisas diferentes: um negócio
          rentável pode ficar sem dinheiro antes de receber a primeira fatura.
        </p>
        <div className="mt-3">
          <BotaoSecundario onClick={aoAtivar}>Projetar a caixa</BotaoSecundario>
        </div>
      </Cartao>
    );
  }

  const buraco = resultado.saldoMinimo < 0;
  const maiorAbs = Math.max(...resultado.meses.map((m) => Math.abs(m.saldoFim)), 1);
  // Os cinco fluxos que mais pesam no pior mês. Mais do que cinco deixa
  // de ser uma explicação e passa a ser um extrato.
  const piorMes = explicarMes(resultado, resultado.mesDoSaldoMinimo).slice(0, 5);

  return (
    <div className="space-y-3" id="caixa">
      <Cartao titulo="Os prazos" descricao="Quando o dinheiro entra e sai — não quanto, isso já está calculado">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CampoEuros
            id="caixa-saldo"
            rotulo="Dinheiro com que começas"
            descricao="Poupanças ou capital social já disponível"
            valor={caixa.saldoInicial}
            aoMudar={(v) => aoMudar({ saldoInicial: v })}
            max={1000000}
          />
          <CampoEuros
            id="caixa-financiamento"
            rotulo="Financiamento inicial"
            descricao="Empréstimo ou apoio já garantido"
            valor={caixa.financiamentoInicial ?? 0}
            aoMudar={(v) => aoMudar({ financiamentoInicial: v })}
            max={1000000}
          />
          <CampoNumero
            id="caixa-recebimento"
            rotulo="Prazo de recebimento"
            descricao="Dias entre faturar e receber"
            valor={caixa.prazoRecebimentoDias}
            aoMudar={(v) => aoMudar({ prazoRecebimentoDias: v })}
            sufixo="dias"
            max={365}
          />
          <CampoNumero
            id="caixa-fornecedor"
            rotulo="Prazo de pagamento"
            descricao="Dias que tens para pagar aos fornecedores"
            valor={caixa.prazoFornecedorDias}
            aoMudar={(v) => aoMudar({ prazoFornecedorDias: v })}
            sufixo="dias"
            max={365}
          />
        </div>
      </Cartao>

      <Cartao>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Metrica rotulo="Mês de menor caixa" valor={resultado.rotuloDoMesMinimo} />
          <Metrica
            rotulo="Saldo mínimo projetado"
            valor={fmt(resultado.saldoMinimo)}
            tom={buraco ? "mau" : "bom"}
            destaque
          />
          <Metrica
            rotulo={buraco ? "Capital adicional necessário" : "Meses até estabilizar"}
            valor={
              buraco
                ? `≈ ${fmt(resultado.capitalAdicionalNecessario)}`
                : resultado.mesesAteEquilibrio
                  ? `${resultado.mesesAteEquilibrio}.º mês`
                  : "—"
            }
            tom={buraco ? "aviso" : "neutro"}
          />
        </dl>

        {buraco ? (
          <p className="mt-3 flex items-start gap-2 rounded-2xl bg-alert-bg px-3 py-2 text-xs leading-relaxed text-alert-text">
            <Warning size={14} className="mt-px flex-shrink-0" aria-hidden />
            <span>
              Em {resultado.rotuloDoMesMinimo} a conta chega a {fmt(resultado.saldoMinimo)}. Isto não é prejuízo — é
              falta de dinheiro no momento certo. Precisas de cerca de{" "}
              {fmt(resultado.capitalAdicionalNecessario)} de folga para atravessar o período, ou de encurtar o prazo de
              recebimento.
            </span>
          </p>
        ) : null}

        {/* ── PORQUÊ esse mês (§52) ───────────────────────────────────
            Uma linha a descer não é acionável; «o buraco é o IVA do 4.º
            trimestre mais o subsídio de férias» é. É para isto que os
            fluxos são etiquetados. */}
        {piorMes.length > 0 ? (
          <div className="mt-3 rounded-2xl border border-stone-100 p-3 dark:border-stone-800">
            <p className="eyebrow mb-2 text-stone-500 dark:text-stone-400">
              O que pesa em {resultado.rotuloDoMesMinimo}
            </p>
            <dl className="space-y-1">
              {piorMes.map((f, i) => (
                <div
                  key={`${f.tipo}-${f.origem}-${i}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-3"
                >
                  <dt className="min-w-0 text-xs text-stone-600 dark:text-stone-300">{f.origem}</dt>
                  <dd
                    className={`flex-shrink-0 text-xs tabular-nums ${
                      f.valor < 0 ? "text-alert-text" : "text-brand-dark dark:text-brand-mint"
                    }`}
                  >
                    {f.valor < 0 ? "−" : "+"}
                    {fmt(Math.abs(f.valor))}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        {/* ── A curva ────────────────────────────────────────────── */}
        <div className="mt-4">
          <h4 className="sr-only">Saldo projetado mês a mês</h4>
          {/* ⚠️ `<div>`, não `<ul>`. Um `role="img"` numa lista remove-lhe
              a semântica de lista e deixa os `<li>` órfãos — violação
              `serious` do axe, doze vezes, uma por mês projetado. Isto é
              um gráfico, e um gráfico não é uma lista: o equivalente
              textual vive no `aria-label` e na tabela por baixo. */}
          <div className="flex items-end gap-0.5" role="img" aria-label={resumoTextual(resultado)}>
            {resultado.meses.map((m) => {
              const altura = Math.max(2, (Math.abs(m.saldoFim) / maiorAbs) * 100);
              return (
                <div
                  key={m.mes}
                  className="flex min-w-0 flex-1 flex-col justify-end"
                  style={{ height: 72 }}
                  title={`${m.rotulo}: ${fmt(m.saldoFim)}`}
                >
                  <span
                    className={`block w-full rounded-sm ${
                      m.saldoFim < 0 ? "bg-red-400 dark:bg-red-500" : "bg-brand"
                    }`}
                    style={{ height: `${altura}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-stone-500 dark:text-stone-400">
            <span>{resultado.meses[0]?.rotulo}</span>
            <span>{resultado.meses[resultado.meses.length - 1]?.rotulo}</span>
          </div>
        </div>

        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-semibold text-stone-600 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-stone-300">
            Ver mês a mês em tabela
          </summary>
          <div
            className="mt-2 overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Projeção de caixa mês a mês"
          >
            <table className="w-full min-w-[26rem] text-left text-xs">
              <caption className="sr-only">Projeção de caixa mês a mês</caption>
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-700">
                  <th scope="col" className="py-1.5 pr-2 font-semibold text-stone-600 dark:text-stone-300">
                    Mês
                  </th>
                  <th scope="col" className="py-1.5 pr-2 text-right font-semibold text-stone-600 dark:text-stone-300">
                    Entra
                  </th>
                  <th scope="col" className="py-1.5 pr-2 text-right font-semibold text-stone-600 dark:text-stone-300">
                    Sai
                  </th>
                  <th scope="col" className="py-1.5 text-right font-semibold text-stone-600 dark:text-stone-300">
                    Saldo
                  </th>
                </tr>
              </thead>
              <tbody>
                {resultado.meses.map((m) => (
                  <tr key={m.mes} className="border-b border-stone-100 dark:border-stone-800">
                    <th scope="row" className="py-1.5 pr-2 font-normal text-stone-600 dark:text-stone-300">
                      {m.rotulo}
                    </th>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-stone-600 dark:text-stone-300">
                      {fmt(m.recebimentos)}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-stone-600 dark:text-stone-300">
                      {fmt(m.pagamentos + m.investimentos)}
                    </td>
                    <td
                      className={`py-1.5 text-right tabular-nums ${
                        m.saldoFim < 0 ? "text-red-700 dark:text-red-400" : "text-stone-800 dark:text-stone-100"
                      }`}
                    >
                      {fmt(m.saldoFim)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>

        <p className="mt-3 border-t border-stone-100 pt-3 text-[11px] leading-relaxed text-stone-500 dark:border-stone-800 dark:text-stone-400">
          {PROJECAO_NAO_E_SALDO}
        </p>
      </Cartao>
    </div>
  );
}

/** O equivalente textual da curva. Obrigatório: §26. */
function resumoTextual(r: ResultadoCaixa): string {
  const inicio = r.meses[0];
  const fim = r.meses[r.meses.length - 1];
  return `Saldo projetado ao longo de ${r.meses.length} meses. Começa em ${fmt(
    inicio?.saldoFim ?? 0,
  )} no fim de ${inicio?.rotulo}, chega ao mínimo de ${fmt(r.saldoMinimo)} em ${
    r.rotuloDoMesMinimo
  } e termina em ${fmt(fim?.saldoFim ?? 0)} em ${fim?.rotulo}.`;
}
