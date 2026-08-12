"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  prazosAvaliados,
  diasAte,
  META_CATEGORIA,
  META_NATUREZA,
  FONTES_PRAZOS,
  type PrazoAvaliado,
  type CategoriaPrazo,
  type Aplicabilidade,
} from "@/lib/prazos";
import { usePreferenciasFiscais, perfilPrazos } from "@/lib/store/preferencias-fiscais";
import { usePrazosCumpridos } from "@/lib/store/prazos-cumpridos";
import CalendarioPrazos from "@/components/dashboard/CalendarioPrazos";
import { Calendar, LayoutGrid, Check, Warning, ArrowRight } from "@/components/ui/Icons";
import PartnerSpot from "@/components/dashboard/PartnerSpot";
import InfoTip from "@/components/ui/InfoTip";

const FILTROS: { id: CategoriaPrazo | "todos"; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "ss", label: "Segurança Social" },
  { id: "iva", label: "IVA" },
  { id: "irs", label: "IRS" },
];

type Vista = "calendario" | "lista";
/** O que a pessoa quer ver: o que lhe aplica, ou o calendário todo. */
type Ambito = "meus" | "todos";

const ETIQUETA_APLICABILIDADE: Record<Aplicabilidade, { label: string; cls: string }> = {
  aplicavel: { label: "Aplica-se a ti", cls: "bg-brand/10 text-brand-dark dark:text-brand-mint" },
  "nao-aplicavel": { label: "Não se aplica", cls: "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400" },
  "preciso-de-informacao": { label: "Preciso de saber mais", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
};

export default function PrazosPage() {
  const [mounted, setMounted] = useState(false);
  const [filtro, setFiltro] = useState<CategoriaPrazo | "todos">("todos");
  const [vista, setVista] = useState<Vista>("calendario");
  const [ambito, setAmbito] = useState<Ambito>("meus");
  const { prefs, carregado: prefsCarregado } = usePreferenciasFiscais();
  const { estaCumprido, marcar, carregado: cumprCarregado } = usePrazosCumpridos();

  useEffect(() => setMounted(true), []);

  const anoBase = new Date().getFullYear();

  // Cada obrigação traz o veredicto de aplicabilidade ao perfil. Sem perfil,
  // o motor devolve "preciso de informação" em vez de assumir (RC-P1-05).
  const todos = useMemo<PrazoAvaliado[]>(() => {
    if (!mounted || !prefsCarregado) return [];
    const perfil = perfilPrazos(prefs);
    return [...prazosAvaliados(anoBase, perfil), ...prazosAvaliados(anoBase + 1, perfil)];
  }, [mounted, prefsCarregado, prefs, anoBase]);

  const filtrados = useMemo(
    () =>
      todos.filter(
        (p) =>
          (filtro === "todos" || p.categoria === filtro) &&
          (ambito === "todos" || p.aplicabilidade !== "nao-aplicavel"),
      ),
    [todos, filtro, ambito],
  );
  const proximos = useMemo(() => filtrados.filter((p) => diasAte(p.data) >= 0), [filtrados]);

  const porConfirmar = useMemo(
    () => new Set(todos.filter((p) => p.aplicabilidade === "preciso-de-informacao").map((p) => p.categoria)),
    [todos],
  );

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-stone-400">
            {ambito === "meus" ? "As tuas obrigações" : "Calendário geral"} · {anoBase}
          </p>
          <h1 className="font-display text-3xl font-semibold text-stone-800 dark:text-stone-100">Prazos fiscais</h1>
          <p className="mt-1 max-w-2xl text-sm text-stone-500 dark:text-stone-400">
            {ambito === "meus"
              ? "Só o que se aplica ao teu enquadramento. Marca o que já entregaste para não voltares a pensar nisso."
              : "Todas as obrigações do calendário oficial, incluindo as que não te dizem respeito."}
          </p>
        </div>
        {/* Alternar vista */}
        <div className="flex items-center gap-1 rounded-xl border border-stone-200 bg-white p-1 dark:border-stone-700 dark:bg-stone-900">
          {([
            { id: "calendario", label: "Calendário", Icon: Calendar },
            { id: "lista", label: "Lista", Icon: LayoutGrid },
          ] as const).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={vista === id}
              onClick={() => setVista(id)}
              className={`flex min-h-9 items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all ${
                vista === id ? "bg-brand text-white" : "text-stone-500 hover:bg-stone-50 dark:text-stone-400 dark:hover:bg-stone-800"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Âmbito: o meu enquadramento vs o calendário todo */}
      <div className="mb-4 flex flex-wrap items-center gap-1 rounded-xl border border-stone-200 bg-white p-1 dark:border-stone-700 dark:bg-stone-900 sm:inline-flex">
        {([
          { id: "meus", label: "As minhas obrigações" },
          { id: "todos", label: "Calendário geral" },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={ambito === id}
            onClick={() => setAmbito(id)}
            className={`min-h-9 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all ${
              ambito === id ? "bg-brand text-white" : "text-stone-500 hover:bg-stone-50 dark:text-stone-400 dark:hover:bg-stone-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Quando faltam dados, dizemo-lo — em vez de mostrar tudo como se fosse
          da pessoa. */}
      {mounted && porConfirmar.size > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400"><Warning size={17} /></span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Algumas destas obrigações podem não ser tuas
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                Sem o teu regime de IVA e sem saber se tens pagamentos por conta liquidados, não conseguimos
                distinguir o que te aplica do que não te aplica.
              </p>
              <Link
                href="/dashboard/perfil"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
              >
                Completar o perfil fiscal <ArrowRight size={11} />
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filtro === f.id}
            onClick={() => setFiltro(f.id)}
            className={`min-h-9 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
              filtro === f.id
                ? "bg-brand text-white"
                : "border border-stone-200 bg-white text-stone-500 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 dark:hover:border-stone-600"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!mounted || !prefsCarregado ? (
        <div className="p-10 text-center text-sm text-stone-400">A carregar…</div>
      ) : vista === "calendario" ? (
        <CalendarioPrazos prazos={filtrados} />
      ) : proximos.length === 0 ? (
        <div className="rounded-4xl border border-dashed border-stone-200 bg-white p-8 text-center dark:border-stone-700 dark:bg-stone-900">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Nada à vista neste filtro. Experimenta o calendário geral para veres todas as obrigações.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {proximos.map((p) => {
            const dias = diasAte(p.data);
            const meta = META_CATEGORIA[p.categoria];
            const anoDoPrazo = Number(p.data.slice(0, 4));
            const feito = cumprCarregado && estaCumprido(p.id, anoDoPrazo);
            const urgente = dias <= 7 && !feito;
            const etiqueta = ETIQUETA_APLICABILIDADE[p.aplicabilidade];
            return (
              <li
                key={p.id}
                className={`flex flex-col gap-3 rounded-2xl border p-4 transition-all hover:shadow-soft sm:flex-row sm:items-center sm:gap-4 ${
                  feito
                    ? "border-brand/20 bg-brand-light/40 dark:bg-brand/5"
                    : urgente
                      ? "border-alert-border bg-alert-bg"
                      : "border-stone-100 bg-white dark:border-stone-800 dark:bg-stone-900"
                }`}
              >
                <div className="flex w-14 flex-shrink-0 flex-col items-center justify-center">
                  {feito ? (
                    <span className="text-brand"><Check size={22} /></span>
                  ) : (
                    <>
                      <span className={`font-display text-xl font-semibold ${urgente ? "text-alert-text" : "text-brand"}`}>{dias}</span>
                      <span className={`text-[10px] uppercase tracking-wide ${urgente ? "text-alert-text/70" : "text-stone-400"}`}>
                        {dias === 1 ? "dia" : "dias"}
                      </span>
                    </>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex flex-wrap items-center gap-2">
                    <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: meta.cor }} />
                    <span className="text-xs font-medium text-stone-400">{meta.label}</span>
                    {/* Declarar e pagar são obrigações distintas — o rótulo diz qual é. */}
                    <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                      {META_NATUREZA[p.natureza].label}
                    </span>
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${etiqueta.cls}`}>
                      {etiqueta.label}
                    </span>
                  </div>
                  <div className={`text-sm font-semibold ${feito ? "text-stone-500 line-through dark:text-stone-400" : "text-stone-800 dark:text-stone-100"}`}>
                    {p.titulo}
                  </div>
                  <div className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{p.descricao}</div>
                  <div className="mt-1 text-[11px] text-stone-400">
                    {p.motivo}
                    {p.dataBase && ` · Prazo legal a ${p.dataBase.slice(8)}/${p.dataBase.slice(5, 7)}, transferido para o dia útil seguinte.`}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-stone-400">
                    <span>{p.base}</span>
                    <span aria-hidden>·</span>
                    <a
                      href={FONTES_PRAZOS[p.fonte].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-brand hover:underline"
                    >
                      {FONTES_PRAZOS[p.fonte].label}
                    </a>
                    <span aria-hidden>·</span>
                    <span>revisto em {p.revistoEm}</span>
                  </div>
                </div>

                <div className="flex flex-shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                  <span className="text-xs text-stone-400">
                    {new Date(p.data + "T00:00:00").toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })}
                  </span>
                  {/* Estado de cumprimento: sem isto o calendário não sabe o que
                      já foi feito e a saúde fiscal não podia falar em
                      organização (RC-P1-05). */}
                  <label className="flex min-h-9 cursor-pointer items-center gap-1.5 text-xs font-medium text-stone-500 dark:text-stone-400">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-stone-300 text-brand focus:ring-brand"
                      checked={feito}
                      onChange={(e) => marcar(p.id, anoDoPrazo, e.target.checked)}
                    />
                    Já tratei
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-8 max-w-sm">
        <PartnerSpot context="prazos" />
      </div>

      <p className="mt-6 flex flex-wrap items-center gap-1 text-xs leading-relaxed text-stone-400">
        Datas da Agenda Fiscal oficial, com transferência para o dia útil seguinte quando caem a fim de semana ou
        feriado.
        <InfoTip>
          Cada obrigação mostra a base legal, a fonte oficial e a data em que a regra foi conferida. Casos
          particulares podem variar — confirma no Portal das Finanças e na Segurança Social Direta.
        </InfoTip>
      </p>
    </div>
  );
}
