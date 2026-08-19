"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O CAMINHO DE TRÁS PARA A FRENTE
//  ---------------------------------------------------------------------
//  `motores/objetivo.ts` tem 215 linhas, está exportado e está testado
//  desde o primeiro dia. Nunca foi chamado por interface nenhuma. O
//  `pricing-ux-flow.md` descreve-o como o «Nível 4» da ferramenta:
//
//    «Quero ganhar 2 000 € por mês. O que tenho de cobrar?»
//    «Consigo cobrar 25 €. Quantas tenho de vender?»
//
//  São as duas perguntas que as pessoas fazem mesmo — «qual é o meu
//  preço?» é a tradução que já fizeram para o vocabulário da calculadora.
//
//  A armadilha que este módulo evita, e que já custou 52% de preço a
//  mais: o «lucro» que o solver devolve JÁ É líquido de Segurança Social
//  e de IRS, porque essas frações entram nele como `v`. Repor os impostos
//  outra vez aqui fazia a conta duas vezes. O alvo entra tal como vem.
// ═══════════════════════════════════════════════════════════════════════

import { useMemo, useState } from "react";
import { fmt, pct } from "@/lib/format";
import {
  precoParaGanhar,
  unidadesParaGanhar,
  type ContextoPreco,
  type ResultadoPreco,
} from "@/lib/pricing";
import { CampoEuros, Segmentado } from "./atomos";
import { Target, Info } from "@/components/ui/Icons";

type Modo = "quanto_cobrar" | "quantas_vender";

export default function ObjetivoInvertido({
  contexto,
  resultado,
  aoAdotarPreco,
}: {
  contexto: ContextoPreco;
  resultado: ResultadoPreco;
  /** Adotar o preço necessário como o preço da pessoa. */
  aoAdotarPreco?: (pvp: number) => void;
}) {
  const [modo, setModo] = useState<Modo>("quanto_cobrar");
  const [ganho, setGanho] = useState(() => Math.max(500, Math.round(resultado.margem.lucroMensal || 1000)));
  const [precoPraticado, setPrecoPraticado] = useState(() => Math.max(1, Math.round(resultado.pvp)));

  const resposta = useMemo(
    () =>
      modo === "quanto_cobrar"
        ? precoParaGanhar(contexto, ganho)
        : unidadesParaGanhar(contexto, precoPraticado, ganho),
    [contexto, ganho, modo, precoPraticado],
  );

  return (
    <section
      aria-label="Objetivo invertido"
      className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900"
    >
      <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold text-stone-800 dark:text-stone-100">
        <Target size={16} className="flex-shrink-0 text-stone-500 dark:text-stone-400" />
        Começar pelo fim
      </h2>
      <p className="mb-4 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
        Em vez de partir do custo, parte do que queres ganhar. É a pergunta que as pessoas fazem mesmo.
      </p>

      <Segmentado
        rotulo="O que queres descobrir"
        colunas={2}
        opcoes={[
          { valor: "quanto_cobrar", rotulo: "Quanto cobrar", sub: "sei o volume" },
          { valor: "quantas_vender", rotulo: "Quantas vender", sub: "sei o preço" },
        ]}
        valor={modo}
        aoMudar={(v) => setModo(v as Modo)}
      />

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <CampoEuros
          id="objetivo-ganho-mensal"
          rotulo="Quanto queres ganhar por mês"
          descricao="Já depois de impostos — o que fica mesmo para ti."
          valor={ganho}
          aoMudar={setGanho}
          max={100_000}
        />
        {modo === "quanto_cobrar" ? (
          /* Leitura, não campo. Um input que não muda nada é pior do que
             não haver input: quem lhe mexe fica à espera de ver o número
             reagir. O volume é do bloco essencial e é lá que se muda. */
          <div className="min-w-0">
            <span className="mb-1.5 block text-xs font-semibold text-stone-600 dark:text-stone-400">
              Vendas por mês que esperas
            </span>
            <p className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm font-medium tabular-nums text-stone-700 dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-200">
              {contexto.volume.unidadesMes} /mês
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
              É o volume que declaraste no essencial. Muda-o lá para o mudar aqui.
            </p>
          </div>
        ) : (
          <CampoEuros
            id="objetivo-preco-praticado"
            rotulo="O preço que consegues cobrar"
            descricao="Com IVA, tal como o cliente o vê."
            valor={precoPraticado}
            aoMudar={setPrecoPraticado}
            max={1_000_000}
          />
        )}
      </div>

      <div className="mt-4 rounded-2xl bg-stone-50 p-4 dark:bg-stone-800/40">
        {!resposta.ok ? (
          <p className="flex items-start gap-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            <Info size={15} className="mt-0.5 flex-shrink-0 text-stone-500 dark:text-stone-400" />
            {resposta.motivo ?? "Faltam dados para responder."}
          </p>
        ) : modo === "quanto_cobrar" ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Terias de cobrar
            </p>
            <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-ink dark:text-stone-50">
              {fmt(resposta.pvpNecessario ?? 0)}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
              por unidade, a {contexto.volume.unidadesMes} vendas por mês — o que dá{" "}
              {pct(resposta.margemResultante ?? 0)} de margem.
              {resultado.pvp > 0 ? (
                <>
                  {" "}
                  São{" "}
                  <strong className="font-semibold">
                    {fmt(Math.abs((resposta.pvpNecessario ?? 0) - resultado.pvp))}
                  </strong>{" "}
                  {(resposta.pvpNecessario ?? 0) >= resultado.pvp ? "acima" : "abaixo"} do preço que a ferramenta
                  recomenda.
                </>
              ) : null}
            </p>
            {aoAdotarPreco && (resposta.pvpNecessario ?? 0) > 0 ? (
              <button
                type="button"
                onClick={() => aoAdotarPreco(resposta.pvpNecessario!)}
                className="mt-3 inline-flex min-h-[36px] items-center rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                Usar este preço
              </button>
            ) : null}
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Terias de vender
            </p>
            <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-ink dark:text-stone-50">
              {resposta.unidadesNecessarias ?? 0}
              <span className="ml-1.5 text-base font-normal text-stone-500 dark:text-stone-400">por mês</span>
            </p>
            <p className="mt-1 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
              a {fmt(precoPraticado)} cada, o que dá{" "}
              {fmt(resposta.faturacaoMensalNecessaria ?? 0)} de faturação por mês.
              {contexto.volume.unidadesMes > 0 ? (
                <>
                  {" "}
                  Estás a contar com {contexto.volume.unidadesMes} —{" "}
                  <strong className="font-semibold">
                    {(resposta.unidadesNecessarias ?? 0) > contexto.volume.unidadesMes
                      ? `faltam ${(resposta.unidadesNecessarias ?? 0) - contexto.volume.unidadesMes}`
                      : "já chega"}
                  </strong>
                  .
                </>
              ) : null}
            </p>
          </>
        )}
      </div>

      {resposta.explicacao.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {resposta.explicacao.map((l, i) => (
            <li
              key={`${l.rotulo}-${i}`}
              className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-stone-500 dark:text-stone-400"
            >
              <span>{l.rotulo}</span>
              <span className="tabular-nums">{fmt(l.valor)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
