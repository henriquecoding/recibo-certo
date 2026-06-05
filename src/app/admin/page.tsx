"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  listarAnunciosTodos,
  contarUtilizadores,
  contarWaitlist,
  type AnuncioRow,
} from "@/lib/supabase/admin";
import { Megaphone, ArrowRight, Plus, BellAlert, Eye, EyeOff } from "@/components/ui/Icons";

const TIPO_COR: Record<string, string> = {
  parceiro: "bg-emerald-500",
  google_ads: "bg-blue-500",
  banner: "bg-violet-500",
  nativo: "bg-amber-500",
};

const TIPO_LABEL: Record<string, string> = {
  parceiro: "Parceiro",
  google_ads: "Google Ads",
  banner: "Banner",
  nativo: "Nativo",
};

export default function AdminHome() {
  const [anuncios, setAnuncios] = useState<AnuncioRow[]>([]);
  const [nUtilizadores, setNUtilizadores] = useState(0);
  const [nWaitlist, setNWaitlist] = useState(0);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    Promise.all([listarAnunciosTodos(), contarUtilizadores(), contarWaitlist()])
      .then(([a, u, w]) => {
        setAnuncios(a);
        setNUtilizadores(u);
        setNWaitlist(w);
        setCarregado(true);
      })
      .catch(() => setCarregado(true));
  }, []);

  const ativos = anuncios.filter((a) => a.ativo).length;

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <p className="eyebrow mb-1 text-brand">Administração</p>
        <h1 className="font-display text-3xl font-semibold text-stone-800 dark:text-stone-100">
          Visão geral
        </h1>
        <p className="mt-1 text-sm text-stone-500">Estado do site e atalhos rápidos.</p>
      </header>

      {/* Estatísticas */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Anúncios ativos" value={carregado ? ativos : "—"} total={carregado ? anuncios.length : undefined} cor="brand" />
        <StatCard label="Total anúncios" value={carregado ? anuncios.length : "—"} cor="stone" />
        <StatCard label="Utilizadores" value={carregado ? nUtilizadores : "—"} cor="stone" />
        <StatCard label="Lista de espera" value={carregado ? nWaitlist : "—"} cor="stone" />
      </div>

      {/* Acções rápidas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          href="/admin/anuncios"
          titulo="Gerir anúncios"
          descricao="Parceiros, Google Ads, banners e anúncios nativos do site."
          icon={<Megaphone size={20} />}
        />
        <ActionCard
          href="/admin/anuncios/novo"
          titulo="Novo anúncio"
          descricao="Criar um anúncio para aparecer nas páginas do dashboard ou landing."
          icon={<Plus size={20} />}
        />
        <ActionCard
          href="/admin/waitlist"
          titulo="Lista de espera"
          descricao={`${carregado ? nWaitlist : "—"} emails inscritos para o plano Pro.`}
          icon={<BellAlert size={20} />}
        />
      </div>

      {/* Lista rápida de anúncios */}
      {carregado && anuncios.length > 0 && (
        <div className="mt-8 rounded-4xl border border-stone-100 bg-white p-6 shadow-card dark:border-stone-700 dark:bg-stone-800/50">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">
              Anúncios configurados
            </h2>
            <Link
              href="/admin/anuncios"
              className="flex items-center gap-1 text-xs font-medium text-brand transition-all hover:gap-1.5"
            >
              Ver todos <ArrowRight size={11} />
            </Link>
          </div>
          <ul className="space-y-2">
            {anuncios.slice(0, 6).map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-stone-50 bg-stone-50/50 px-3.5 py-2.5 dark:border-stone-700 dark:bg-stone-700/30"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`h-2 w-2 shrink-0 rounded-full ${TIPO_COR[a.tipo] ?? "bg-stone-300"}`} />
                  <span className="truncate text-sm font-medium text-stone-700 dark:text-stone-200">{a.nome}</span>
                  <span className="shrink-0 text-[10px] font-medium text-stone-400">
                    {TIPO_LABEL[a.tipo] ?? a.tipo}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {a.posicoes.slice(0, 2).map((p) => (
                    <span key={p} className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-400 dark:bg-stone-700">
                      {p}
                    </span>
                  ))}
                  {a.ativo ? (
                    <Eye size={13} className="text-brand" />
                  ) : (
                    <EyeOff size={13} className="text-stone-300" />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  total,
  cor,
}: {
  label: string;
  value: number | string;
  total?: number;
  cor: "brand" | "stone";
}) {
  return (
    <div className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-800/50">
      <div className="text-xs font-medium uppercase tracking-wider text-stone-400">{label}</div>
      <div
        className={`mt-1 font-display text-3xl font-semibold tabular-nums ${
          cor === "brand" ? "text-brand" : "text-stone-800 dark:text-stone-100"
        }`}
      >
        {value}
        {total !== undefined && (
          <span className="ml-1 text-lg font-normal text-stone-400">/{total}</span>
        )}
      </div>
    </div>
  );
}

function ActionCard({
  href,
  titulo,
  descricao,
  icon,
}: {
  href: string;
  titulo: string;
  descricao: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-4xl border border-stone-100 bg-white p-5 shadow-card transition-all hover:shadow-lift dark:border-stone-700 dark:bg-stone-800/50"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-stone-800 transition-colors group-hover:text-brand dark:text-stone-100">
          {titulo}
          <ArrowRight size={12} className="opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{descricao}</p>
      </div>
    </Link>
  );
}
