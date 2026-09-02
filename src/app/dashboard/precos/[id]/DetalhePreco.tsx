"use client";

// ─────────────────────────────────────────────────────────────────────────
//  «QUANDO GUARDASTE» vs «COM AS REGRAS DE HOJE».
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ RECALCULAR PARA LER É ÚTIL. RECALCULAR POR CIMA É APAGAR HISTÓRIA.   │
//  │                                                                     │
//  │ A lista já recalculava — e tinha de recalcular, senão comparava dois │
//  │ anos fiscais sem o dizer. O que faltava era conservar e mostrar o    │
//  │ resultado com que a decisão foi tomada, e deixar a substituição ser  │
//  │ uma ação explícita, com o delta à frente.                            │
//  │                                                                     │
//  │ Aqui não se grava nada sozinho: reabrir é ler.                       │
//  └─────────────────────────────────────────────────────────────────────┘
// ─────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fmt, pct } from "@/lib/format";
import { ArrowLeft, ArrowRight, Warning } from "@/components/ui/Icons";
import {
  guardarPreco,
  lerPrecosGuardados,
  type PrecoGuardado,
} from "@/lib/store/precos-guardados";
import {
  cenarioPorChave,
  precificar,
  REVISAO_PRICING,
  type ContextoPreco,
} from "@/lib/pricing";
import SimuladorPrecoLazy from "@/app/ferramentas/calcular-preco/lazy";

const ANO_DAS_REGRAS = Number(REVISAO_PRICING.slice(0, 4));

export default function DetalhePreco({ id }: { id: string }) {
  const [item, setItem] = useState<PrecoGuardado<ContextoPreco> | null>(null);
  const [carregado, setCarregado] = useState(false);
  const [atualizado, setAtualizado] = useState(false);
  const [aEditar, setAEditar] = useState(false);

  useEffect(() => {
    setItem(lerPrecosGuardados<ContextoPreco>().find((i) => i.id === id) ?? null);
    setCarregado(true);
  }, [id]);

  /**
   * O recálculo é DEFENSIVO de propósito.
   *
   * O contexto vem do cofre, que é um ficheiro de texto no browser de
   * alguém: pode ter sido escrito por uma versão anterior do esquema, ter
   * sido truncado a meio de uma gravação, ou ter ficado com um cenário que
   * já não existe. `precificar` tem todo o direito de rebentar com isso —
   * o que não pode acontecer é a página inteira desaparecer por causa
   * disso, deixando a pessoa sem o resultado ORIGINAL, que está guardado
   * e é perfeitamente legível.
   */
  const hoje = useMemo(() => {
    if (!item) return null;
    try {
      return precificar(item.contexto);
    } catch {
      return null;
    }
  }, [item]);

  if (!carregado) {
    return <div className="mx-auto h-40 max-w-3xl animate-pulse rounded-4xl bg-stone-100 motion-reduce:animate-none dark:bg-stone-800/50" />;
  }

  if (!item) {
    return (
      <div className="mx-auto max-w-2xl rounded-4xl border border-stone-200 border-dashed bg-white p-8 text-center dark:border-stone-700 dark:bg-stone-900">
        <h1 className="font-display text-lg font-semibold text-stone-800 dark:text-stone-100">
          Este preço não está neste dispositivo
        </h1>
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          Os preços guardados vivem no aparelho onde foram calculados — não são sincronizados. Se o guardaste noutro
          browser ou telemóvel, é lá que está.
        </p>
        <Link
          href="/dashboard/precos"
          className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          Ver os meus preços <ArrowRight size={13} />
        </Link>
      </div>
    );
  }

  const pvpHoje = hoje?.ok ? hoje.pvp : null;
  const delta = pvpHoje === null ? null : pvpHoje - item.pvp;
  const mudou = delta !== null && Math.abs(delta) > 0.005;
  const anoGuardado = item.anoFiscal ?? Number(item.em.slice(0, 4));

  const atualizar = () => {
    if (!hoje?.ok) return;
    guardarPreco<ContextoPreco>({
      ...item,
      em: new Date().toISOString(),
      pvp: hoje.pvp,
      margem: hoje.margem.margem,
      lucroMensal: hoje.margem.lucroMensal,
      anoFiscal: ANO_DAS_REGRAS,
    });
    setItem(lerPrecosGuardados<ContextoPreco>().find((i) => i.id === id) ?? null);
    setAtualizado(true);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/dashboard/precos"
        className="mb-4 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-brand dark:text-stone-400"
      >
        <ArrowLeft size={14} /> Os meus preços
      </Link>

      <header className="mb-6">
        <div className="eyebrow mb-2 text-brand">O teu negócio</div>
        <h1 className="font-display text-3xl font-semibold text-stone-800 dark:text-stone-100">{item.nome}</h1>
        <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">
          {cenarioPorChave(item.cenario as never).rotulo} · guardado a{" "}
          <time dateTime={item.em}>{new Date(item.em).toLocaleDateString("pt-PT")}</time>
          {item.anoFiscal ? ` · regras de ${item.anoFiscal}` : ""}
        </p>
      </header>

      {/* ── Os dois resultados, lado a lado ─────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Quando guardaste
          </p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-stone-800 dark:text-stone-50">
            {fmt(item.pvp)}
          </p>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Margem {pct(item.margem)} · {fmt(item.lucroMensal)} por mês
          </p>
        </div>

        <div className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-800 dark:bg-stone-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Com as regras de {ANO_DAS_REGRAS}
          </p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-stone-800 dark:text-stone-50">
            {pvpHoje === null ? "—" : fmt(pvpHoje)}
          </p>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            {hoje?.ok
              ? mudou
                ? `${delta! > 0 ? "+" : "−"}${fmt(Math.abs(delta!))} face ao que guardaste`
                : "Igual ao que guardaste."
              : "Já não há preço possível com as taxas de hoje."}
          </p>
        </div>
      </div>

      {!hoje?.ok && (
        <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-stone-600 dark:text-stone-300">
          <Warning size={14} className="mt-0.5 flex-shrink-0 text-alert-text" />
          O motor não consegue formar um preço com este contexto e as regras atuais. Abre a edição para veres qual
          fração deixou de caber — não é um erro da aplicação, é um diagnóstico.
        </p>
      )}

      {mudou && anoGuardado < ANO_DAS_REGRAS && (
        <div className="mt-4 rounded-2xl border border-alert-border bg-alert-bg px-4 py-3">
          <p className="text-sm font-semibold text-alert-text">Este preço foi decidido com regras anteriores</p>
          <p className="mt-0.5 text-xs leading-relaxed text-alert-text/80">
            O número de cima é o que tinhas quando decidiste; o de baixo é o que darias hoje. Atualizar substitui o
            resultado guardado — o contexto e as tuas respostas ficam como estão.
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={atualizar}
          disabled={!hoje?.ok || !mudou}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          Atualizar este preço
        </button>
        <button
          type="button"
          onClick={() => setAEditar((v) => !v)}
          aria-expanded={aEditar}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-600 transition-colors hover:border-brand/40 hover:text-brand dark:border-stone-700 dark:text-stone-300"
        >
          {aEditar ? "Fechar a edição" : "Rever os números"}
        </button>
      </div>

      {/* `role="status"`: anuncia-se uma vez, sem interromper. */}
      <p role="status" className="mt-2 min-h-[1.25rem] text-xs font-medium text-brand">
        {atualizado ? "Preço atualizado com as regras atuais." : ""}
      </p>

      {aEditar && (
        <div className="mt-5">
          <SimuladorPrecoLazy cenarioInicial={item.cenario} />
        </div>
      )}
    </div>
  );
}
