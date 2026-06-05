"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import AnuncioForm from "@/components/admin/AnuncioForm";
import { buscarAnuncio, atualizarAnuncio, type AnuncioRow, type AnuncioInput } from "@/lib/supabase/admin";
import { ArrowLeft, Warning } from "@/components/ui/Icons";

export default function EditarAnuncioPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [anuncio, setAnuncio] = useState<AnuncioRow | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    buscarAnuncio(id).then((a) => {
      setAnuncio(a);
      setCarregando(false);
    }).catch((e) => {
      setErro(e instanceof Error ? e.message : "Erro ao carregar anúncio");
      setCarregando(false);
    });
  }, [id]);

  async function handleGravar(data: AnuncioInput): Promise<string | undefined> {
    const { erro: e } = await atualizarAnuncio(id, data);
    if (e) return e;
    router.push("/admin/anuncios");
  }

  if (carregando) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <div className="mb-2 h-3 w-16 animate-pulse rounded bg-stone-200" />
          <div className="h-7 w-48 animate-pulse rounded bg-stone-200" />
        </div>
        <div className="h-96 animate-pulse rounded-2xl bg-stone-100" />
      </div>
    );
  }

  if (erro || !anuncio) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 py-16 text-center dark:border-red-800/50 dark:bg-red-900/20">
          <Warning size={24} className="mb-3 text-red-400" />
          <p className="text-sm text-red-600 dark:text-red-400">{erro ?? "Anúncio não encontrado."}</p>
          <Link href="/admin/anuncios" className="mt-4 text-sm font-medium text-brand hover:text-brand-dark">
            Voltar à lista
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <Link
          href="/admin/anuncios"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300"
        >
          <ArrowLeft size={13} />
          Anúncios
        </Link>
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-stone-400">
          Administração
        </p>
        <h1 className="font-display text-2xl font-bold text-stone-900 dark:text-stone-50">
          Editar anúncio
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          <span className="font-medium text-stone-700 dark:text-stone-300">{anuncio.nome}</span>
          {" — "}o preview atualiza em tempo real à medida que editas.
        </p>
      </div>

      <AnuncioForm inicial={anuncio} modoEdicao onGravar={handleGravar} />
    </div>
  );
}
