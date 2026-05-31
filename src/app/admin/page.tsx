"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listarParceirosTodos, contarUtilizadores, type PartnerRow } from "@/lib/supabase/admin";
import { ShieldCheck, ArrowRight, Check } from "@/components/ui/Icons";

export default function AdminHome() {
  const [parceiros, setParceiros] = useState<PartnerRow[]>([]);
  const [nUtilizadores, setNUtilizadores] = useState(0);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    Promise.all([listarParceirosTodos(), contarUtilizadores()])
      .then(([p, u]) => {
        setParceiros(p);
        setNUtilizadores(u);
        setCarregado(true);
      })
      .catch(() => setCarregado(true));
  }, []);

  const ativos = parceiros.filter((p) => p.ativo).length;

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <p className="eyebrow mb-1 text-brand">Administração</p>
        <h1 className="font-display text-3xl font-semibold text-stone-800">Visão geral</h1>
        <p className="mt-1 text-sm text-stone-500">Estado do site e atalhos rápidos.</p>
      </header>

      {/* Estatísticas */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Parceiros ativos" value={carregado ? ativos : "—"} total={carregado ? parceiros.length : undefined} cor="brand" />
        <StatCard label="Total de parceiros" value={carregado ? parceiros.length : "—"} cor="stone" />
        <StatCard label="Utilizadores registados" value={carregado ? nUtilizadores : "—"} cor="stone" />
      </div>

      {/* Acções rápidas */}
      <div className="grid gap-4 sm:grid-cols-2">
        <ActionCard
          href="/admin/parceiros"
          titulo="Gerir parceiros"
          descricao="Adicionar, editar, activar ou desactivar os parceiros exibidos no site."
          icon={<ShieldCheck size={20} />}
        />
        <ActionCard
          href="/admin/parceiros/novo"
          titulo="Novo parceiro"
          descricao="Criar um parceiro novo para aparecer nas páginas do dashboard."
          icon={<Check size={20} />}
        />
      </div>

      {/* Lista rápida de parceiros activos */}
      {carregado && parceiros.length > 0 && (
        <div className="mt-8 rounded-4xl border border-stone-100 bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-700">Parceiros configurados</h2>
            <Link href="/admin/parceiros" className="flex items-center gap-1 text-xs font-medium text-brand hover:gap-1.5 transition-all">
              Ver todos <ArrowRight size={11} />
            </Link>
          </div>
          <ul className="space-y-2">
            {parceiros.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-stone-50 bg-stone-50/50 px-3.5 py-2.5">
                <span className="text-sm font-medium text-stone-700">{p.nome}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-stone-400">{p.contextos.join(", ")}</span>
                  <span className={`h-2 w-2 flex-shrink-0 rounded-full ${p.ativo ? "bg-brand" : "bg-stone-300"}`} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, total, cor }: { label: string; value: number | string; total?: number; cor: "brand" | "stone" }) {
  return (
    <div className="rounded-4xl border border-stone-100 bg-white p-5 shadow-card">
      <div className="text-xs font-medium uppercase tracking-wider text-stone-400">{label}</div>
      <div className={`mt-1 font-display text-3xl font-semibold tabular-nums ${cor === "brand" ? "text-brand" : "text-stone-800"}`}>
        {value}
        {total !== undefined && <span className="ml-1 text-lg font-normal text-stone-400">/{total}</span>}
      </div>
    </div>
  );
}

function ActionCard({ href, titulo, descricao, icon }: { href: string; titulo: string; descricao: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="group flex items-start gap-4 rounded-4xl border border-stone-100 bg-white p-5 shadow-card transition-all hover:shadow-lift">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-stone-800 group-hover:text-brand transition-colors">
          {titulo} <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{descricao}</p>
      </div>
    </Link>
  );
}
