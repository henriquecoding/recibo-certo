"use client";

// ═══════════════════════════════════════════════════════════════════════
//  OS MEUS PREÇOS — a grelha que faltava
//  ---------------------------------------------------------------------
//  Ninguém põe preço a um produto. Põe preço a um catálogo. E a pergunta
//  que só aparece quando há mais do que um é a que decide o negócio:
//  QUAL destes é que está a pagar as contas?
//
//  A ferramenta respondia sempre à mesma pergunta — «quanto cobro por
//  isto?» — e esquecia-a a seguir. Comparar obrigava a recalcular tudo de
//  cabeça, produto a produto, ou a passá-los para uma folha de Excel que
//  não conhece nem o Art. 53.º nem a Segurança Social.
//
//  ── PORQUE É QUE ISTO VIVE NO DASHBOARD ─────────────────────────────
//  Porque é o sítio onde os dados de uma pessoa já vivem, e onde o resto
//  do produto já sabe que não se indexa. `/ferramentas/*` é público e
//  entra no sitemap; uma lista com os custos de fornecedor de alguém não
//  pertence a esse lado da casa, mesmo que fique só no dispositivo.
//
//  Local e só local, como tudo o que esta ferramenta guarda.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fmt, pct } from "@/lib/format";
import {
  apagarPrecoGuardado,
  lerPrecosGuardados,
  MAXIMO_GUARDADOS,
  type PrecoGuardado,
} from "@/lib/store/precos-guardados";
import { cenarioPorChave, precificar, type ContextoPreco } from "@/lib/pricing";
import { ArrowRight, Coin, Close, Warning, Info } from "@/components/ui/Icons";
import RascunhoEmCurso from "./RascunhoEmCurso";

type Ordem = "recentes" | "margem" | "mes";

export default function PrecosGuardadosPage() {
  const [itens, setItens] = useState<PrecoGuardado<ContextoPreco>[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [ordem, setOrdem] = useState<Ordem>("recentes");

  useEffect(() => {
    setItens(lerPrecosGuardados<ContextoPreco>());
    setCarregado(true);
  }, []);

  /**
   * Os números são recalculados à entrada, não lidos do que ficou
   * guardado.
   *
   * Não é desconfiança do que foi gravado: é que as taxas mudam. Um preço
   * guardado em janeiro com a tabela de IRS de 2025 continuaria a
   * anunciar a margem de 2025 ao lado de um guardado hoje, e a comparação
   * — que é a razão de esta página existir — estaria a comparar dois anos
   * fiscais diferentes sem o dizer.
   */
  const linhas = useMemo(() => {
    const calculadas = itens.map((i) => {
      const r = precificar(i.contexto);
      return {
        item: i,
        pvp: r.ok ? r.pvp : 0,
        margem: r.ok ? r.margem.margem : 0,
        lucroUnidade: r.ok ? r.margem.lucroUnidade : 0,
        lucroMensal: r.ok ? r.margem.lucroMensal : 0,
        contribuicao: r.ok ? r.margem.contribuicaoUnidade : 0,
        ok: r.ok,
        mudou: r.ok && Math.abs(r.pvp - i.pvp) > 0.005,
      };
    });

    if (ordem === "margem") return [...calculadas].sort((a, b) => b.margem - a.margem);
    if (ordem === "mes") return [...calculadas].sort((a, b) => b.lucroMensal - a.lucroMensal);
    return calculadas;
  }, [itens, ordem]);

  const totalMensal = linhas.reduce((s, l) => s + l.lucroMensal, 0);
  const emPrejuizo = linhas.filter((l) => l.ok && l.lucroUnidade < 0);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white">
            <Coin size={18} />
          </span>
          <span className="eyebrow text-brand">Comparar</span>
        </div>
        <h1 className="font-display mb-2 text-3xl font-semibold text-ink dark:text-stone-50">Os meus preços</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Os produtos e serviços a que já puseste preço, lado a lado. Os números são recalculados com as taxas de hoje —
          um preço guardado o ano passado não pode comparar-se com um de agora sem isso.
        </p>
        <Link
          href="/dashboard/precos/novo"
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-glow transition-all hover:shadow-float motion-reduce:transition-none"
        >
          Calcular um preço
          <ArrowRight size={15} />
        </Link>
      </header>

      {/* O rascunho a decorrer vem PRIMEIRO: quem chega aqui a meio de um
          cálculo não pode ter de descobrir sozinho que ele ainda existe. */}
      <RascunhoEmCurso />

      {!carregado ? (
        <div className="h-40 animate-pulse rounded-4xl bg-stone-100 dark:bg-stone-800/50" />
      ) : itens.length === 0 ? (
        <Vazio />
      ) : (
        <>
          {/* ── O que a comparação revela ─────────────────────────────
              Um total e um alarme. É o que só se vê com a lista toda à
              frente, e a razão de a página existir. */}
          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-4xl border border-stone-100 bg-white p-4 shadow-card dark:border-stone-800 dark:bg-stone-900">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Se vendesses todos ao volume que esperas
              </p>
              <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink dark:text-stone-50">
                {fmt(totalMensal)}
                <span className="ml-1.5 text-sm font-normal text-stone-500 dark:text-stone-400">por mês</span>
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                Lucro operacional somado, já depois de impostos. Não é faturação.
              </p>
            </div>

            <div
              className={`rounded-4xl border p-4 ${
                emPrejuizo.length > 0
                  ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30"
                  : "border-stone-100 bg-white shadow-card dark:border-stone-800 dark:bg-stone-900"
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                A perder dinheiro em cada venda
              </p>
              <p
                className={`mt-1 font-display text-2xl font-semibold tabular-nums ${
                  emPrejuizo.length > 0 ? "text-red-600 dark:text-red-400" : "text-ink dark:text-stone-50"
                }`}
              >
                {emPrejuizo.length}
                <span className="ml-1.5 text-sm font-normal text-stone-500 dark:text-stone-400">
                  de {linhas.length}
                </span>
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                {emPrejuizo.length > 0
                  ? `${emPrejuizo.map((l) => l.item.nome).join(", ")} — vender mais só aumenta a perda.`
                  : "Todos cobrem os custos que lhes cabem."}
              </p>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {itens.length} de {MAXIMO_GUARDADOS} guardados
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["recentes", "Mais recentes"],
                  ["margem", "Melhor margem"],
                  ["mes", "Mais lucro por mês"],
                ] as const
              ).map(([chave, rotulo]) => (
                <button
                  key={chave}
                  type="button"
                  aria-pressed={ordem === chave}
                  onClick={() => setOrdem(chave)}
                  className={`min-h-[36px] rounded-xl border px-3 py-2 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                    ordem === chave
                      ? "border-brand-dark bg-brand-dark text-white"
                      : "border-stone-200 bg-white text-stone-600 hover:border-brand dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
                  }`}
                >
                  {rotulo}
                </button>
              ))}
            </div>
          </div>

          {/* A tabela transborda em ecrãs estreitos; quem navega por
              teclado tem de poder chegar ao scroll. */}
          <div
            className="overflow-x-auto rounded-4xl border border-stone-100 bg-white shadow-card dark:border-stone-800 dark:bg-stone-900"
            tabIndex={0}
            role="region"
            aria-label="Tabela dos preços guardados"
          >
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <caption className="sr-only">Comparação dos preços guardados</caption>
              <thead>
                <tr className="border-b border-stone-100 text-left dark:border-stone-800">
                  <Th>Produto</Th>
                  <Th alinhar="right">Preço</Th>
                  <Th alinhar="right">Margem</Th>
                  <Th alinhar="right">Por venda</Th>
                  <Th alinhar="right">Por mês</Th>
                  <Th alinhar="right">
                    <span className="sr-only">Ações</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.item.id} className="border-b border-stone-50 last:border-0 dark:border-stone-800/50">
                    <th scope="row" className="py-3 pl-4 pr-3 text-left font-normal">
                      <span className="block text-sm font-semibold text-stone-800 dark:text-stone-100">
                        {l.item.nome}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-tight text-stone-500 dark:text-stone-400">
                        {cenarioPorChave(l.item.cenario as never).rotulo.toLowerCase()} ·{" "}
                        {new Date(l.item.em).toLocaleDateString("pt-PT")}
                      </span>
                      {l.mudou ? (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-alert-bg px-1.5 py-0.5 text-[10px] font-semibold text-alert-text">
                          <Info size={10} />
                          era {fmt(l.item.pvp)} quando guardaste
                        </span>
                      ) : null}
                    </th>
                    <Td destaque>{l.ok ? fmt(l.pvp) : "—"}</Td>
                    <Td alerta={l.margem < 0}>{l.ok ? pct(l.margem) : "—"}</Td>
                    <Td alerta={l.lucroUnidade < 0}>{l.ok ? fmt(l.lucroUnidade) : "—"}</Td>
                    <Td alerta={l.lucroMensal < 0}>{l.ok ? fmt(l.lucroMensal) : "—"}</Td>
                    <td className="py-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/dashboard/precos/${encodeURIComponent(l.item.id)}`}
                          className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-xs font-semibold text-brand-dark underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-brand-mint"
                        >
                          Rever
                          <ArrowRight size={11} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setItens(apagarPrecoGuardado<ContextoPreco>(l.item.id))}
                          aria-label={`Apagar ${l.item.nome}`}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition-colors hover:border-red-300 hover:text-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-stone-700 dark:text-stone-400"
                        >
                          <Close size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {linhas.some((l) => !l.ok) ? (
            <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
              <Warning size={14} className="mt-0.5 flex-shrink-0 text-alert-text dark:text-alert" />
              Um ou mais destes já não têm preço possível com as taxas de hoje. Abre-os para veres qual fração passou a
              não caber.
            </p>
          ) : null}

          <p className="mt-4 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
            Esta lista fica no teu dispositivo. Não é enviada para lado nenhum, nem sincronizada entre aparelhos — e
            desaparece se limpares os dados do browser.
          </p>
        </>
      )}
    </div>
  );
}

function Vazio() {
  return (
    <div className="rounded-4xl border border-dashed border-stone-200 bg-white p-8 text-center dark:border-stone-700 dark:bg-stone-900">
      <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-light text-brand-dark dark:bg-brand/15 dark:text-brand">
        <Coin size={20} />
      </span>
      <h2 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">
        Ainda não guardaste nenhum preço
      </h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-stone-500 dark:text-stone-400">
        Calcula o preço de um produto ou serviço e carrega em «Guardar». A partir do segundo, esta página compara-os —
        que é quando a pergunta interessante aparece: qual deles está mesmo a pagar as contas?
      </p>
      <Link
        href="/dashboard/precos/novo"
        className="mt-4 inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        Calcular um preço
        <ArrowRight size={13} />
      </Link>
    </div>
  );
}

function Th({ children, alinhar }: { children: React.ReactNode; alinhar?: "right" }) {
  return (
    <th
      scope="col"
      className={`px-3 pb-2 pt-4 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400 ${
        alinhar === "right" ? "text-right" : ""
      } first:pl-4 last:pr-4`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  destaque,
  alerta,
}: {
  children: React.ReactNode;
  destaque?: boolean;
  alerta?: boolean;
}) {
  return (
    <td
      className={`px-3 py-3 text-right tabular-nums ${
        alerta
          ? "text-red-600 dark:text-red-400"
          : destaque
            ? "font-semibold text-stone-800 dark:text-stone-100"
            : "text-stone-600 dark:text-stone-300"
      }`}
    >
      {children}
    </td>
  );
}
