"use client";

// ═══════════════════════════════════════════════════════════════════════
//  DESEMPENHO DE UMA PARCERIA — cliques nossos, comissões deles
//  ---------------------------------------------------------------------
//  Duas regras deste painel, e nenhuma é estética:
//
//   · DOIS TOTAIS SEPARADOS, NUNCA SOMADOS. A comissão é provisória durante a
//     janela de validação e pode ser anulada por reembolso. Um número único
//     que inclua o que ainda está por validar é uma previsão apresentada como
//     facto.
//
//   · BRUTO E LÍQUIDO SEPARADOS. Com 25% de retenção na fonte sobre comissões
//     de intermediação, o que entra na conta é ~75% do bruto. Um painel que
//     mostre só o bruto nunca bate com o extrato.
//
//  E uma nota que o painel tem de dizer em voz alta: a divergência entre os
//  nossos cliques e o relatório deles é ESPERADA. Last-click com janela de 90
//  dias significa que um clique de hoje pode virar registo daqui a dois
//  meses, e que outro afiliado pode ficar com a atribuição pelo meio.
//  Esconder a divergência faria com que a primeira reconciliação parecesse um
//  erro nosso.
//
//  Há uma ironia útil aqui: um site que explica retenção na fonte a
//  trabalhadores independentes passa a ter uma retenção na fonte própria para
//  reconciliar.
// ═══════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  buscarParceiro,
  listarCliques,
  listarComissoesGuardadas,
  importarComissoes,
  type PartnerRow,
  type PartnerLinkClickRow,
  type PartnerCommissionRow,
  type PartnerCommissionInput,
  type EstadoComissao,
} from "@/lib/supabase/admin";
import { ROTULO_SUPERFICIE, type Superficie } from "@/content/parcerias-destinos";
import { fmt as eur } from "@/lib/format";
import { lerCsv } from "@/lib/parcerias/csv-comissoes";

/** Retenção na fonte sobre comissões de intermediação. */
const RETENCAO_INTERMEDIACAO = 0.25;

function agrupar<T>(linhas: T[], chave: (l: T) => string): Array<[string, number]> {
  const mapa = new Map<string, number>();
  for (const l of linhas) {
    const k = chave(l) || "—";
    mapa.set(k, (mapa.get(k) ?? 0) + 1);
  }
  return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
}

function Cartao({
  rotulo,
  valor,
  nota,
  tom = "neutro",
}: {
  rotulo: string;
  valor: string;
  nota?: string;
  tom?: "neutro" | "positivo" | "aviso";
}) {
  const cor =
    tom === "positivo"
      ? "text-brand"
      : tom === "aviso"
        ? "text-alert-text"
        : "text-stone-800 dark:text-stone-100";
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">{rotulo}</div>
      <div className={`mt-1 font-display text-2xl font-semibold tabular-nums ${cor}`}>{valor}</div>
      {nota && <p className="mt-1 text-[11px] leading-relaxed text-stone-500">{nota}</p>}
    </div>
  );
}

export default function DesempenhoParceria() {
  const { id } = useParams<{ id: string }>();
  const [parceiro, setParceiro] = useState<PartnerRow | null>(null);
  const [cliques, setCliques] = useState<PartnerLinkClickRow[]>([]);
  const [comissoes, setComissoes] = useState<PartnerCommissionRow[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const recarregar = useCallback(async () => {
    if (!id) return;
    const [p, c, k] = await Promise.all([
      buscarParceiro(id),
      listarCliques(id).catch(() => []),
      listarComissoesGuardadas(id).catch(() => []),
    ]);
    setParceiro(p);
    setCliques(c);
    setComissoes(k);
    setCarregado(true);
  }, [id]);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const totais = useMemo(() => {
    const somar = (f: (c: PartnerCommissionRow) => boolean) =>
      comissoes.filter(f).reduce((s, c) => s + Number(c.valor_comissao), 0);
    const confirmada = somar((c) => c.estado === "confirmada" || c.estado === "paga");
    const pendente = somar((c) => c.estado === "pendente");
    const anulada = somar((c) => c.estado === "anulada");
    return {
      confirmada,
      pendente,
      anulada,
      // O que entra na conta, depois da retenção de 25%.
      confirmadaLiquida: confirmada * (1 - RETENCAO_INTERMEDIACAO),
    };
  }, [comissoes]);

  const porSuperficie = useMemo(() => agrupar(cliques, (c) => c.superficie), [cliques]);
  const porIntent = useMemo(() => agrupar(cliques, (c) => c.intent ?? "—"), [cliques]);
  const porSlug = useMemo(
    () => agrupar(cliques, (c) => c.origem_slug ?? "—").slice(0, 10),
    [cliques],
  );

  const importar = async (ficheiro: File) => {
    const texto = await ficheiro.text();
    const { linhas, erro } = lerCsv(texto);
    if (erro) return setMensagem(erro);
    if (linhas.length === 0) return setMensagem("Nenhuma linha válida no ficheiro.");
    const r = await importarComissoes(linhas.map((l) => ({ ...l, parceiro_id: id })));
    setMensagem(r.erro ? r.erro : `${r.inseridas} linhas importadas.`);
    if (!r.erro) void recarregar();
  };

  const exportar = () => {
    const cab = "data,superficie,variante,intent,origem,dispositivo,destino_host,destino_caminho";
    const corpo = cliques
      .map((c) =>
        [
          c.criado_em,
          c.superficie,
          c.variante ?? "",
          c.intent ?? "",
          c.origem_slug ?? "",
          c.dispositivo ?? "",
          c.destino_host,
          c.destino_caminho ?? "",
        ].join(","),
      )
      .join("\n");
    const blob = new Blob([`${cab}\n${corpo}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cliques-${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!carregado) {
    return <div className="h-96 animate-pulse rounded-4xl border border-stone-100 bg-white shadow-card" />;
  }
  if (!parceiro) return <p className="text-sm text-stone-500">Parceiro não encontrado.</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="eyebrow mb-1 text-brand">Parceiros</p>
        <h1 className="font-display text-2xl font-semibold text-stone-800 dark:text-stone-100">
          Desempenho · {parceiro.nome}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {parceiro.comissao_descricao ?? "Sem condições comerciais registadas."}
        </p>
        <Link href={`/admin/parceiros/${id}`} className="mt-2 inline-block text-sm text-brand hover:underline">
          ← Voltar à configuração
        </Link>
      </header>

      {/* ── Comissões: dois totais, nunca somados ─────────────────────── */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Cartao
          rotulo="Confirmada (bruto)"
          valor={eur(totais.confirmada)}
          tom="positivo"
          nota="Já passou a janela de validação."
        />
        <Cartao
          rotulo="Confirmada (líquido)"
          valor={eur(totais.confirmadaLiquida)}
          tom="positivo"
          nota="Depois da retenção na fonte de 25% sobre comissões de intermediação. É este o valor que bate com o extrato."
        />
        <Cartao
          rotulo="Por validar"
          valor={eur(totais.pendente)}
          tom="aviso"
          nota="Ainda pode desaparecer: um reembolso dentro da janela anula a comissão."
        />
        <Cartao rotulo="Anulada" valor={eur(totais.anulada)} nota="Reembolsos e cancelamentos." />
      </section>

      <p className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-xs leading-relaxed text-stone-600 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-300">
        <strong>A divergência com o relatório do parceiro é esperada.</strong>{" "}
        {parceiro.atribuicao_nota ??
          "A atribuição é last-click com janela de vários dias: um clique de hoje pode virar registo daqui a semanas, e outro afiliado pode ficar com a atribuição pelo meio."}{" "}
        Os cliques abaixo são os nossos; as comissões são as deles. Não têm de bater — têm de ser
        explicáveis.
      </p>

      {/* ── Cliques ───────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Cartao rotulo="Cliques" valor={String(cliques.length)} />
        <Cartao
          rotulo="Superfícies com tráfego"
          valor={String(porSuperficie.length)}
          nota="Saber ONDE converte é o argumento para a fase seguinte, mesmo que o total seja modesto."
        />
        <Cartao rotulo="Comissões registadas" valor={String(comissoes.length)} />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Por superfície
          </h2>
          <ul className="space-y-1 text-sm">
            {porSuperficie.length === 0 && <li className="text-stone-400">Sem cliques ainda.</li>}
            {porSuperficie.map(([k, n]) => (
              <li key={k} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-stone-600 dark:text-stone-300">
                  {ROTULO_SUPERFICIE[k as Superficie] ?? k}
                </span>
                <span className="flex-shrink-0 font-semibold tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Por intenção
          </h2>
          {/* É a intenção que responde à pergunta útil: «os Guias de
              contabilista convertem?» */}
          <ul className="space-y-1 text-sm">
            {porIntent.length === 0 && <li className="text-stone-400">Sem cliques ainda.</li>}
            {porIntent.map(([k, n]) => (
              <li key={k} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-stone-600 dark:text-stone-300">{k}</span>
                <span className="flex-shrink-0 font-semibold tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
          Top 10 origens
        </h2>
        <ul className="space-y-1 text-sm">
          {porSlug.length === 0 && <li className="text-stone-400">Sem cliques ainda.</li>}
          {porSlug.map(([k, n]) => (
            <li key={k} className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate font-mono text-[13px] text-stone-600 dark:text-stone-300">
                {k}
              </span>
              <span className="flex-shrink-0 font-semibold tabular-nums">{n}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Reconciliação ─────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
          Reconciliação
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-stone-300 dark:border-stone-700 dark:text-stone-200">
            Importar CSV do parceiro
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importar(f);
              }}
            />
          </label>
          <button
            type="button"
            onClick={exportar}
            className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-stone-300 dark:border-stone-700 dark:text-stone-200"
          >
            Exportar os nossos cliques
          </button>
        </div>
        {mensagem && (
          <p role="status" className="mt-3 rounded-xl bg-stone-100 px-3 py-2 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-300">
            {mensagem}
          </p>
        )}
        <p className="mt-2 text-[11px] leading-relaxed text-stone-400">
          As colunas do relatório semanal ainda não foram confirmadas pelo parceiro. O leitor aceita
          os nomes mais prováveis e recusa o ficheiro quando não os encontra — em vez de importar
          zeros em silêncio.
        </p>
      </section>
    </div>
  );
}
