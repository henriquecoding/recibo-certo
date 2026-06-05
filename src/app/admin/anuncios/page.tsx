"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  listarAnunciosTodos,
  atualizarAnuncio,
  eliminarAnuncio,
  reordenarAnuncios,
  type AnuncioRow,
  type TipoAnuncio,
} from "@/lib/supabase/admin";
import {
  Plus, Pencil, Trash, Megaphone, GoogleAds, ImageIcon, ShieldCheck,
  GripVertical, Eye, EyeOff, Warning, ChevronUp, ChevronDown, Filter,
} from "@/components/ui/Icons";

const TIPO_META: Record<TipoAnuncio, { label: string; cor: string }> = {
  parceiro: { label: "Parceiro", cor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  google_ads: { label: "Google Ads", cor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  banner: { label: "Banner", cor: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
  nativo: { label: "Nativo", cor: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
};

const POSICAO_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  receitas: "Receitas",
  recibos: "Recibos",
  prazos: "Prazos",
  simulador: "Simulador",
  comparador: "Comparador",
  landing_hero: "Landing Hero",
  landing_pricing: "Landing Preços",
};

type FiltroTipo = "todos" | TipoAnuncio;

export default function AnunciosPage() {
  const [anuncios, setAnuncios] = useState<AnuncioRow[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroTipo>("todos");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      setAnuncios(await listarAnunciosTodos());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar anúncios");
    }
    setCarregando(false);
  }

  useEffect(() => { carregar(); }, []);

  async function toggleAtivo(id: string, ativo: boolean) {
    await atualizarAnuncio(id, { ativo: !ativo });
    setAnuncios((prev) => prev.map((a) => a.id === id ? { ...a, ativo: !ativo } : a));
  }

  async function moverOrdem(id: string, direcao: "up" | "down") {
    const idx = anuncios.findIndex((a) => a.id === id);
    if (idx < 0) return;
    if (direcao === "up" && idx === 0) return;
    if (direcao === "down" && idx === anuncios.length - 1) return;

    const novo = [...anuncios];
    const troca = direcao === "up" ? idx - 1 : idx + 1;
    [novo[idx], novo[troca]] = [novo[troca], novo[idx]];

    const reordenados = novo.map((a, i) => ({ ...a, ordem: i + 1 }));
    setAnuncios(reordenados);
    await reordenarAnuncios(reordenados.map((a) => ({ id: a.id, ordem: a.ordem })));
  }

  async function handleDelete(id: string) {
    const { erro: e } = await eliminarAnuncio(id);
    if (e) { setErro(e); return; }
    setAnuncios((prev) => prev.filter((a) => a.id !== id));
    setConfirmDelete(null);
  }

  const visiveis = filtro === "todos" ? anuncios : anuncios.filter((a) => a.tipo === filtro);
  const counts = {
    todos: anuncios.length,
    parceiro: anuncios.filter((a) => a.tipo === "parceiro").length,
    google_ads: anuncios.filter((a) => a.tipo === "google_ads").length,
    banner: anuncios.filter((a) => a.tipo === "banner").length,
    nativo: anuncios.filter((a) => a.tipo === "nativo").length,
  };

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-stone-400">
            Administração
          </p>
          <h1 className="font-display text-2xl font-bold text-stone-900 dark:text-stone-50">
            Anúncios
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {anuncios.length} {anuncios.length === 1 ? "anúncio configurado" : "anúncios configurados"}
          </p>
        </div>
        <Link
          href="/admin/anuncios/novo"
          className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark"
        >
          <Plus size={14} />
          Novo anúncio
        </Link>
      </div>

      {/* Filtros por tipo */}
      <div className="mb-5 flex items-center gap-1.5 overflow-x-auto pb-1">
        <Filter size={14} className="shrink-0 text-stone-400" />
        {(["todos", "parceiro", "google_ads", "banner", "nativo"] as FiltroTipo[]).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filtro === f
                ? "bg-brand text-white"
                : "bg-white text-stone-500 border border-stone-200 hover:border-stone-300 dark:bg-stone-800 dark:border-stone-700 dark:hover:border-stone-500"
            }`}
          >
            {f === "todos" ? "Todos" : TIPO_META[f as TipoAnuncio].label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              filtro === f ? "bg-white/20 text-white" : "bg-stone-100 text-stone-500 dark:bg-stone-700"
            }`}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* Erro global */}
      {erro && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-400">
          <Warning size={14} className="shrink-0" />
          {erro}
        </div>
      )}

      {/* Lista */}
      {carregando ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-stone-100 dark:bg-stone-800" />
          ))}
        </div>
      ) : visiveis.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 py-16 text-center dark:border-stone-700">
          <Megaphone size={28} className="mb-3 text-stone-300" />
          <p className="text-sm font-medium text-stone-500">
            {filtro === "todos" ? "Ainda não há anúncios configurados." : `Nenhum anúncio do tipo "${TIPO_META[filtro as TipoAnuncio]?.label}".`}
          </p>
          <Link
            href="/admin/anuncios/novo"
            className="mt-4 flex items-center gap-1.5 text-sm font-medium text-brand transition-colors hover:text-brand-dark"
          >
            <Plus size={14} />
            Criar o primeiro anúncio
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {visiveis.map((a, idx) => {
            const meta = TIPO_META[a.tipo];
            return (
              <div
                key={a.id}
                className={`group flex items-center gap-3 rounded-2xl border bg-white px-4 py-3.5 shadow-sm transition-all dark:bg-stone-800/50 ${
                  a.ativo
                    ? "border-stone-200 dark:border-stone-700"
                    : "border-stone-100 opacity-60 dark:border-stone-800"
                }`}
              >
                {/* Reordenação */}
                <div className="flex shrink-0 flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => moverOrdem(a.id, "up")}
                    disabled={idx === 0}
                    className="rounded p-0.5 text-stone-300 transition-colors hover:text-stone-500 disabled:opacity-20 dark:text-stone-600"
                    aria-label="Mover para cima"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <GripVertical size={14} className="text-stone-300 dark:text-stone-600" />
                  <button
                    type="button"
                    onClick={() => moverOrdem(a.id, "down")}
                    disabled={idx === visiveis.length - 1}
                    className="rounded p-0.5 text-stone-300 transition-colors hover:text-stone-500 disabled:opacity-20 dark:text-stone-600"
                    aria-label="Mover para baixo"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                {/* Ícone do tipo */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100 dark:bg-stone-700">
                  {a.tipo === "parceiro" && <ShieldCheck size={17} className="text-emerald-600" />}
                  {a.tipo === "google_ads" && <GoogleAds size={17} className="text-blue-600" />}
                  {a.tipo === "banner" && <ImageIcon size={17} className="text-violet-600" />}
                  {a.tipo === "nativo" && <Megaphone size={17} className="text-amber-600" />}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                      {a.nome}
                    </span>
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${meta.cor}`}>
                      {meta.label}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {a.posicoes.map((p) => (
                      <span
                        key={p}
                        className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-500 dark:bg-stone-700 dark:text-stone-400"
                      >
                        {POSICAO_LABELS[p] ?? p}
                      </span>
                    ))}
                    {a.posicoes.length === 0 && (
                      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-500 dark:bg-amber-900/20">
                        Sem posição definida
                      </span>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleAtivo(a.id, a.ativo)}
                    title={a.ativo ? "Desativar" : "Ativar"}
                    className={`rounded-lg p-2 transition-all ${
                      a.ativo
                        ? "text-brand hover:bg-brand-light"
                        : "text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700"
                    }`}
                  >
                    {a.ativo ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <Link
                    href={`/admin/anuncios/${a.id}`}
                    className="rounded-lg p-2 text-stone-400 transition-all hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-700 dark:hover:text-stone-200"
                    aria-label="Editar"
                  >
                    <Pencil size={15} />
                  </Link>
                  {confirmDelete === a.id ? (
                    <div className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 dark:border-red-800/50 dark:bg-red-900/20">
                      <span className="text-xs text-red-600 dark:text-red-400">Eliminar?</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(a.id)}
                        className="text-xs font-semibold text-red-600 transition-colors hover:text-red-800 dark:text-red-400"
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs font-semibold text-stone-500 transition-colors hover:text-stone-700 dark:text-stone-400"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(a.id)}
                      className="rounded-lg p-2 text-stone-300 transition-all hover:bg-red-50 hover:text-red-500 dark:text-stone-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      aria-label="Eliminar"
                    >
                      <Trash size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
