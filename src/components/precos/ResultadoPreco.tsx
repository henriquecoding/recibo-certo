"use client";

// ═══════════════════════════════════════════════════════════════════════
//  O RESULTADO COMO OBJETO VISUAL
//  ---------------------------------------------------------------------
//  Princípio 1 do design system: mostrar o dinheiro antes do imposto. O
//  número que a pessoa veio buscar domina o ecrã; tudo o resto é contexto
//  que se abre quando ela quiser.
//
//  A hierarquia é deliberada e responde por ordem às quatro perguntas:
//    1. quanto devo cobrar     → o número grande
//    2. quanto me custa        → a barra «a cada venda»
//    3. quanto vou ganhar      → o lucro por venda e por mês
//    4. quanto preciso vender  → o ponto de equilíbrio
//
//  A faixa aparece imediatamente a seguir porque um número sozinho é falsa
//  precisão: os dados que o alimentam têm incerteza, e escondê-la seria
//  prometer uma exatidão que a aritmética não tem.
// ═══════════════════════════════════════════════════════════════════════

import { m } from "motion/react";
import { EASE } from "@/lib/motion";
import { fmt, pct } from "@/lib/format";
import type { ResultadoPreco as Resultado } from "@/lib/pricing";
import type { ConversaoSociedade, Tesouraria, LinhaTesouraria } from "@/lib/pricing";
import { Warning, Info, CheckTrend, Calendar, ArrowRight } from "@/components/ui/Icons";
import Badge from "@/components/ui/Badge";

const CORES_ANCORA: Record<string, string> = {
  piso: "bg-red-400",
  minimo: "bg-alert-border",
  recomendado: "bg-brand",
  confortavel: "bg-brand-mint",
};

export default function ResultadoPreco({
  resultado,
  temFiscalidade,
  exemplo = false,
}: {
  resultado: Resultado;
  temFiscalidade: boolean;
  /**
   * `true` enquanto a pessoa ainda não personalizou nada. O número existe —
   * o motor calcula sempre — mas sai dos valores por omissão do cenário, e
   * apresentá-lo como «quanto deves cobrar» é dar autoridade de conselho a
   * algo que ninguém introduziu. Nesse estado o cartão diz o que é.
   */
  exemplo?: boolean;
}) {
  if (!resultado.ok) {
    return (
      <div className="rounded-4xl border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-950/30">
        <div className="mb-2 flex items-center gap-2">
          <Warning size={18} className="flex-shrink-0 text-red-600" />
          <h2 className="font-display text-lg font-semibold text-red-900 dark:text-red-200">
            Não há preço possível com estes números
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-red-800 dark:text-red-300">{resultado.motivoTexto}</p>
      </div>
    );
  }

  const { faixa, margem, breakEven, custo } = resultado;
  const recomendado = faixa.ancoras.find((a) => a.chave === "recomendado");
  const ancorasOrdenadas = [...faixa.ancoras].sort((a, b) => a.pvp - b.pvp);
  const maximo = ancorasOrdenadas.length > 0 ? ancorasOrdenadas[ancorasOrdenadas.length - 1].pvp : 1;

  const decomposicao = [
    { rotulo: "Custo", valor: custo.direto, cor: "bg-stone-400" },
    {
      rotulo: "Custos de venda",
      valor: Math.max(0, custo.variaveisTotais - custo.direto - impostosDoVendedor(resultado)),
      cor: "bg-stone-300",
    },
    ...(temFiscalidade
      ? [{ rotulo: "Impostos teus", valor: impostosDoVendedor(resultado), cor: "bg-alert-border" }]
      : []),
    { rotulo: "Contas fixas", valor: custo.fixosPorUnidade, cor: "bg-stone-200" },
    { rotulo: temFiscalidade ? "Fica para ti" : "Margem", valor: Math.max(0, margem.lucroUnidade), cor: "bg-brand" },
  ].filter((d) => d.valor > 0.004);

  const totalBarra = decomposicao.reduce((s, d) => s + d.valor, 0) || 1;

  return (
    <m.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      aria-label="Resultado"
      className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900 sm:p-7"
    >
      {/* ── O número ─────────────────────────────────────────────── */}
      <p
        className={`eyebrow mb-2 ${
          exemplo ? "text-stone-600 dark:text-stone-400" : "text-brand-dark dark:text-brand-mint"
        }`}
      >
        {exemplo ? "Um exemplo, por enquanto" : "Quanto deves cobrar"}
      </p>
      {exemplo ? (
        <p className="mb-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
          Ainda não nos disseste nada sobre o teu caso, por isso este número sai dos valores de partida deste cenário —
          não do teu negócio.{" "}
          <strong className="font-semibold text-stone-800 dark:text-stone-100">
            Preenche o essencial aí em cima
          </strong>{" "}
          e ele passa a ser teu.
        </p>
      ) : null}
      {/* Desemfatizar com COR, nunca com `opacity`.
          Havia aqui um `opacity-60` que dizia bem o que queria dizer — «este
          número ainda não é teu» — e cegava quem precisa de contraste: o
          cinzento da legenda caía de 4,5:1 para 2,38:1. A opacidade mistura o
          texto com o fundo sem que nenhuma regra de cor o denuncie, por isso
          escapa a quem lê o CSS e só aparece no medidor. Trocar o tom faz o
          mesmo efeito visual e continua legível. */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          className={`font-display text-4xl font-semibold tabular-nums sm:text-5xl ${
            exemplo ? "text-stone-500 dark:text-stone-400" : "text-ink dark:text-stone-50"
          }`}
        >
          {fmt(resultado.pvp)}
        </span>
        <span className="text-sm text-stone-500 dark:text-stone-400">
          {resultado.taxaIVA > 0 ? (
            <>
              com IVA · <span className="tabular-nums">{fmt(resultado.precoLiquido)}</span> sem IVA
            </>
          ) : (
            "sem IVA — estás isento"
          )}
        </span>
      </div>

      {/* ── Faixa ────────────────────────────────────────────────── */}
      {ancorasOrdenadas.length > 1 && (
        <div className="mt-5">
          <div
            className="flex h-1.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
            aria-hidden="true"
          >
            {ancorasOrdenadas.map((a, i) => {
              const anterior = i === 0 ? 0 : ancorasOrdenadas[i - 1].pvp;
              const largura = ((a.pvp - anterior) / maximo) * 100;
              return (
                <span
                  key={a.chave}
                  className={`${CORES_ANCORA[a.chave] ?? "bg-stone-300"} h-full`}
                  style={{ width: `${Math.max(2, largura)}%` }}
                />
              );
            })}
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {ancorasOrdenadas.map((a) => (
              <li key={a.chave} className="flex items-start gap-2.5">
                <span
                  aria-hidden="true"
                  className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${CORES_ANCORA[a.chave] ?? "bg-stone-300"}`}
                />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-semibold tabular-nums text-stone-800 dark:text-stone-100">
                      {fmt(a.pvp)}
                    </span>
                    <span className="text-xs font-medium text-stone-500 dark:text-stone-400">{a.rotulo}</span>
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                    {a.explicacao}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── A cada venda ─────────────────────────────────────────── */}
      <div className="mt-7 border-t border-stone-100 pt-5 dark:border-stone-800">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">A cada venda</p>
        <div className="flex h-3 w-full overflow-hidden rounded-full" aria-hidden="true">
          {decomposicao.map((d) => (
            <span key={d.rotulo} className={`${d.cor} h-full`} style={{ width: `${(d.valor / totalBarra) * 100}%` }} />
          ))}
        </div>
        <ul className="mt-3 space-y-1.5">
          {decomposicao.map((d) => (
            <li key={d.rotulo} className="flex items-center gap-2.5 text-sm">
              <span aria-hidden="true" className={`h-2.5 w-2.5 flex-shrink-0 rounded-sm ${d.cor}`} />
              <span className="min-w-0 flex-1 truncate text-stone-600 dark:text-stone-400">{d.rotulo}</span>
              <span className="flex-shrink-0 font-semibold tabular-nums text-stone-800 dark:text-stone-100">
                {fmt(d.valor)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Números-chave ────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metrica
          rotulo="Margem"
          valor={pct(margem.margem)}
          nota="sobre o preço sem IVA"
          alerta={margem.margem < 0}
        />
        <Metrica
          rotulo="Markup"
          valor={pct(margem.markup)}
          nota="acrescentado ao custo"
        />
        <Metrica
          rotulo="Lucro por mês"
          valor={fmt(margem.lucroMensal)}
          nota="ao volume que esperas"
          alerta={margem.lucroMensal < 0}
        />
        <Metrica
          rotulo="Equilíbrio"
          valor={breakEven.possivel ? `${breakEven.unidades}` : "—"}
          nota={
            breakEven.possivel
              ? breakEven.unidades === 0
                ? "sem custos fixos"
                : "vendas por mês"
              : "não existe"
          }
          alerta={!breakEven.possivel}
        />
      </div>

      {/* ── Tesouraria: o mesmo dinheiro, mas com data ───────────── */}
      {resultado.tesouraria ? <BlocoTesouraria t={resultado.tesouraria} /> : null}

      {/* ── Sociedade: do lucro operacional ao teu bolso ─────────── */}
      {resultado.sociedade ? <BlocoSociedade s={resultado.sociedade} /> : null}

      {breakEven.nota ? (
        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
          <Info size={14} className="mt-0.5 flex-shrink-0 text-stone-500 dark:text-stone-400" />
          {breakEven.nota}
        </p>
      ) : null}

      {/* ── Veredicto sobre o preço pensado ──────────────────────── */}
      {resultado.veredicto ? (
        <div
          className={`mt-6 rounded-2xl border p-4 ${
            resultado.veredicto.classificacao === "abaixo_do_piso"
              ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30"
              : resultado.veredicto.classificacao === "abaixo_do_minimo"
                ? "border-alert-border bg-alert-bg dark:border-alert-border/40 dark:bg-alert-text/10"
                : "border-brand-light bg-brand-light/40 dark:border-brand/30 dark:bg-brand/10"
          }`}
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-stone-800 dark:text-stone-100">
            {resultado.veredicto.classificacao === "alinhado" ||
            resultado.veredicto.classificacao === "acima_do_recomendado" ? (
              <CheckTrend size={16} className="flex-shrink-0 text-brand" />
            ) : (
              <Warning size={16} className="flex-shrink-0 text-alert-text dark:text-alert" />
            )}
            {resultado.veredicto.titulo}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            {resultado.veredicto.texto}
          </p>
        </div>
      ) : null}

      {/* ── Preços psicológicos ──────────────────────────────────── */}
      {faixa.psicologicos.length > 0 && recomendado ? (
        <div className="mt-6 border-t border-stone-100 pt-5 dark:border-stone-800">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Se preferires um preço redondo
          </p>
          <p className="mb-3 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            Sugestões comerciais. Não substituem o preço recomendado — mostram o que cada terminação custa em margem.
          </p>
          <div className="flex flex-wrap gap-2">
            {faixa.psicologicos.map((p) => (
              <span
                key={p.pvp}
                className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs dark:border-stone-700 dark:bg-stone-800"
              >
                <span className="font-semibold tabular-nums text-stone-800 dark:text-stone-100">{fmt(p.pvp)}</span>
                <span className="ml-2 tabular-nums text-stone-500 dark:text-stone-400">{pct(p.margem)} margem</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </m.section>
  );
}

function Metrica({
  rotulo,
  valor,
  nota,
  alerta,
}: {
  rotulo: string;
  valor: string;
  nota: string;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-stone-100 bg-stone-50 p-3 dark:border-stone-800 dark:bg-stone-800/40">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">{rotulo}</p>
      <p
        className={`mt-1 text-lg font-semibold tabular-nums ${
          alerta ? "text-red-600 dark:text-red-400" : "text-stone-800 dark:text-stone-100"
        }`}
      >
        {valor}
      </p>
      <p className="mt-0.5 text-[11px] leading-tight text-stone-500 dark:text-stone-400">{nota}</p>
    </div>
  );
}

/** Segurança Social + IRS marginal por unidade. Zero para quem não é TI. */
function impostosDoVendedor(r: Resultado): number {
  return r.fiscal.aplicavel ? r.fiscal.ssPorUnidade + r.fiscal.irsPorUnidade : 0;
}


/**
 * Do lucro operacional ao que chega ao dono.
 *
 * A regra de apresentação, que vale mais do que o layout: o lucro retido
 * aparece SEMPRE ao lado do líquido pessoal, e o total é a soma dos dois.
 * Mostrar só o que passou para a conta pessoal faria uma sociedade parecer
 * pior do que é — e empurraria a pessoa para uma decisão fiscal errada.
 */
function BlocoSociedade({ s }: { s: ConversaoSociedade }) {
  const linhas = [
    { rotulo: "Faturação projetada no ano", valor: s.faturacaoAnual, tom: "neutro" as const },
    { rotulo: "Despesas do negócio", valor: -s.despesasAnuais, tom: "sai" as const },
    { rotulo: "Lucro antes de IRC", valor: s.lucroTributavel, tom: "neutro" as const },
    { rotulo: "IRC, derrama e tributações autónomas", valor: -s.ircTotal, tom: "sai" as const },
  ];

  return (
    <section
      aria-label="O que chega ao dono da sociedade"
      className="mt-6 rounded-2xl border border-stone-100 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-800/40"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">
          E disto, quanto te chega?
        </h3>
        <Badge tone="neutral">estimativa anual</Badge>
      </div>

      <dl className="space-y-1.5 text-sm">
        {linhas.map((l) => (
          <div key={l.rotulo} className="flex items-baseline justify-between gap-3">
            <dt className="min-w-0 text-stone-600 dark:text-stone-400">{l.rotulo}</dt>
            <dd
              className={`flex-shrink-0 font-semibold tabular-nums ${
                l.tom === "sai" ? "text-clay-text" : "text-stone-800 dark:text-stone-100"
              }`}
            >
              {fmt(l.valor)}
            </dd>
          </div>
        ))}
      </dl>

      {/* As DUAS medidas, sempre juntas. */}
      <div className="mt-3 grid gap-2 border-t border-stone-200 pt-3 dark:border-stone-700 sm:grid-cols-2">
        <div className="rounded-xl bg-white p-3 dark:bg-stone-900">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-600 dark:text-stone-400">
            Chega à tua conta
          </p>
          <p className="mt-0.5 font-display text-lg font-semibold tabular-nums text-stone-800 dark:text-stone-100">
            {fmt(s.liquidoPessoal)}
          </p>
        </div>
        <div className="rounded-xl bg-white p-3 dark:bg-stone-900">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-600 dark:text-stone-400">
            Fica na empresa
          </p>
          <p className="mt-0.5 font-display text-lg font-semibold tabular-nums text-stone-800 dark:text-stone-100">
            {fmt(s.lucroRetido)}
          </p>
        </div>
      </div>

      <p className="mt-2.5 rounded-xl bg-brand-light px-3 py-2.5 text-sm text-brand-dark dark:bg-brand/15 dark:text-brand-mint">
        <strong className="font-semibold">Somando os dois: {fmt(s.riquezaTotal)}.</strong> O que fica na empresa não é
        dinheiro perdido — continua a ser teu, noutro bolso.
      </p>

      <ul className="mt-2.5 space-y-1">
        {s.notas.map((n) => (
          <li key={n} className="flex items-start gap-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
            <Info size={13} className="mt-0.5 flex-shrink-0" />
            <span>{n}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}


/** «daqui a 12 dias», mas legível quando é hoje ou amanhã. */
function quando(dias: number): string {
  if (dias <= 0) return "hoje";
  if (dias === 1) return "amanhã";
  return `daqui a ${dias} dias`;
}

const DATA_CURTA = { day: "numeric", month: "short" } as const;

function dataLegivel(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-PT", DATA_CURTA);
}

/**
 * Quanto sai, e QUANDO.
 *
 * É aqui que a ferramenta deixa de ser uma calculadora. Saber que se
 * reserva 18% de tudo é abstrato; saber que a 25 de novembro saem 340 € é
 * uma coisa que se pode fazer. Por isso o número grande é a reserva mensal
 * — a única ação concreta — e as datas vêm a seguir como consequência.
 *
 * As linhas sem valor não são falhas: entregar a declaração não é pagar, e
 * dizê-lo evita que a pessoa reserve o dinheiro duas vezes.
 */
function BlocoTesouraria({ t }: { t: Tesouraria }) {
  const parcelas = [
    { rotulo: "IVA", valor: t.ivaMensal },
    { rotulo: "Segurança Social", valor: t.ssMensal },
  ].filter((p) => p.valor > 0);

  return (
    <section
      aria-label="Quando sai o dinheiro"
      className="mt-6 rounded-2xl border border-stone-100 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-800/40"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-800 dark:text-stone-100">
          <Calendar size={15} className="flex-shrink-0 text-stone-600 dark:text-stone-400" />
          E quando é que isto sai da tua conta?
        </h3>
        <Badge tone="neutral">estimativa</Badge>
      </div>

      {/* A única ação concreta: quanto pôr de lado todos os meses. */}
      <div className="rounded-xl bg-white p-3 dark:bg-stone-900">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-600 dark:text-stone-400">
          Guardar por mês
        </p>
        <p className="mt-0.5 font-display text-2xl font-semibold tabular-nums text-stone-800 dark:text-stone-100">
          {fmt(t.reservaMensal)}
        </p>
        {parcelas.length > 0 ? (
          <p className="mt-0.5 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
            {parcelas.map((p) => `${fmt(p.valor)} de ${p.rotulo}`).join(" + ")}
          </p>
        ) : null}
      </div>

      {t.proximos.length > 0 ? (
        <ol className="mt-3 space-y-1.5">
          {t.proximos.map((l) => (
            <LinhaPrazo key={l.id} l={l} />
          ))}
        </ol>
      ) : null}

      <ul className="mt-2.5 space-y-1">
        {t.notas.map((n) => (
          <li key={n} className="flex items-start gap-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
            <Info size={13} className="mt-0.5 flex-shrink-0" />
            <span>{n}</span>
          </li>
        ))}
      </ul>

      <a
        href="/dashboard/prazos"
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold text-brand-dark underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand dark:text-brand-mint"
      >
        Ver o calendário completo
        <ArrowRight size={12} className="flex-shrink-0" />
      </a>
    </section>
  );
}

function LinhaPrazo({ l }: { l: LinhaTesouraria }) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-xl bg-white px-3 py-2 dark:bg-stone-900">
      <div className="min-w-0">
        <p className="text-sm font-medium leading-snug text-stone-800 dark:text-stone-100">{l.titulo}</p>
        <p className="mt-0.5 text-[11px] leading-tight text-stone-600 dark:text-stone-400">
          <span className="font-semibold">{dataLegivel(l.data)}</span>
          <span aria-hidden="true"> · </span>
          {quando(l.diasAte)}
        </p>
        {l.porqueSemValor ? (
          <p className="mt-1 text-[11px] leading-tight text-stone-600 dark:text-stone-400">{l.porqueSemValor}</p>
        ) : null}
      </div>
      <p className="flex-shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-stone-800 dark:text-stone-100">
        {l.valor === null ? (
          <span aria-label="sem valor a pagar nesta data" className="text-stone-600 dark:text-stone-400">
            —
          </span>
        ) : (
          fmt(l.valor)
        )}
      </p>
    </li>
  );
}
