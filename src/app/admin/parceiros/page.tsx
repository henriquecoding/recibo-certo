"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  listarParceirosTodos,
  atualizarParceiro,
  eliminarParceiro,
  type PartnerRow,
} from "@/lib/supabase/admin";
import { Bank, Building, FileSign, Heart, Invoice, Plus, Pencil, Trash, ArrowRight } from "@/components/ui/Icons";
import type { ComponentType } from "react";

const ICON_MAP: Record<PartnerRow["icone"], ComponentType<{ size?: number; className?: string }>> = {
  bank: Bank,
  building: Building,
  "file-sign": FileSign,
  heart: Heart,
  invoice: Invoice,
};

const CONTEXTOS_LABEL: Record<string, string> = {
  dashboard: "Dashboard",
  receitas: "Receitas",
  recibos: "Recibos",
  prazos: "Prazos",
  simulador: "Simulador",
};

export default function AdminParceiros() {
  const [parceiros, setParceiros] = useState<PartnerRow[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const carregar = () =>
    listarParceirosTodos()
      .then(setParceiros)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregado(true));

  useEffect(() => { carregar(); }, []);

  const toggleAtivo = async (p: PartnerRow) => {
    const { erro: e } = await atualizarParceiro(p.id, { ativo: !p.ativo });
    if (e) { setErro(e); return; }
    setParceiros((prev) => prev.map((r) => (r.id === p.id ? { ...r, ativo: !r.ativo } : r)));
  };

  const apagar = async (id: string) => {
    const { erro: e } = await eliminarParceiro(id);
    if (e) { setErro(e); return; }
    setParceiros((prev) => prev.filter((p) => p.id !== id));
    setConfirmDelete(null);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-1 text-brand">Administração</p>
          <h1 className="font-display text-3xl font-semibold text-stone-800">Parceiros</h1>
          <p className="mt-1 text-sm text-stone-500">
            {carregado ? `${parceiros.length} parceiro${parceiros.length !== 1 ? "s" : ""} configurado${parceiros.length !== 1 ? "s" : ""}` : "A carregar…"}
          </p>
        </div>
        <Link
          href="/admin/parceiros/novo"
          className="btn-shine inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition-all hover:shadow-float"
        >
          <Plus size={14} />
          Novo parceiro
        </Link>
      </header>

      {erro && (
        <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>
      )}

      {!carregado ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-4xl border border-stone-100 bg-white" />
          ))}
        </div>
      ) : parceiros.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-4xl border border-dashed border-stone-200 bg-white py-16 text-center">
          <p className="text-sm text-stone-400">Ainda não há parceiros configurados.</p>
          <Link
            href="/admin/parceiros/novo"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:gap-2 transition-all"
          >
            <Plus size={14} /> Criar o primeiro parceiro
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {parceiros.map((p) => {
            const Icon = ICON_MAP[p.icone] ?? Bank;
            return (
              <div
                key={p.id}
                className={`rounded-4xl border bg-white p-5 shadow-card transition-all ${
                  p.ativo ? "border-stone-100" : "border-stone-100 opacity-60"
                }`}
              >
                <div className="flex flex-wrap items-start gap-4">
                  {/* Ícone */}
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-stone-50 text-stone-500">
                    <Icon size={19} />
                  </span>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-stone-800">{p.nome}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        p.ativo ? "bg-brand-light text-brand-dark" : "bg-stone-100 text-stone-400"
                      }`}>
                        {p.ativo ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">{p.descricao}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.contextos.map((c) => (
                        <span key={c} className="rounded-lg bg-stone-50 px-2 py-0.5 text-[11px] font-medium text-stone-500 border border-stone-100">
                          {CONTEXTOS_LABEL[c] ?? c}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Acções */}
                  <div className="flex flex-shrink-0 items-center gap-2">
                    {/* Toggle activo */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={p.ativo}
                      aria-label={p.ativo ? "Desactivar parceiro" : "Activar parceiro"}
                      onClick={() => toggleAtivo(p)}
                      className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                        p.ativo ? "bg-brand" : "bg-stone-200"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                          p.ativo ? "left-[1.375rem]" : "left-0.5"
                        }`}
                      />
                    </button>

                    <Link
                      href={`/admin/parceiros/${p.id}`}
                      aria-label={`Editar ${p.nome}`}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition-all hover:border-brand hover:text-brand"
                    >
                      <Pencil size={15} />
                    </Link>

                    {confirmDelete === p.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => apagar(p.id)}
                          className="rounded-lg bg-red-500 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-600"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(null)}
                          className="rounded-lg px-2 py-1.5 text-xs text-stone-400 transition-colors hover:text-stone-600"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        aria-label={`Eliminar ${p.nome}`}
                        onClick={() => setConfirmDelete(p.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-400 transition-all hover:border-red-300 hover:text-red-500"
                      >
                        <Trash size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* URL */}
                <div className="mt-3 flex items-center gap-1.5 border-t border-stone-50 pt-3">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 truncate text-xs text-stone-400 transition-colors hover:text-brand"
                  >
                    {p.url} <ArrowRight size={10} className="flex-shrink-0" />
                  </a>
                  <span className="ml-auto flex-shrink-0 text-[11px] text-stone-300">
                    ordem {p.ordem}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
