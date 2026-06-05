"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import AnuncioForm from "@/components/admin/AnuncioForm";
import { criarAnuncio, type AnuncioInput } from "@/lib/supabase/admin";
import { ArrowLeft } from "@/components/ui/Icons";

export default function NovoAnuncioPage() {
  const router = useRouter();

  async function handleGravar(data: AnuncioInput): Promise<string | undefined> {
    const { erro } = await criarAnuncio(data);
    if (erro) return erro;
    router.push("/admin/anuncios");
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
          Novo anúncio
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Escolhe o tipo e configura o anúncio. O preview atualiza em tempo real.
        </p>
      </div>

      <AnuncioForm onGravar={handleGravar} />
    </div>
  );
}
