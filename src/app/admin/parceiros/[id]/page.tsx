"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { buscarParceiro, atualizarParceiro, type PartnerRow } from "@/lib/supabase/admin";
import PartnerForm from "@/components/admin/PartnerForm";
import type { PartnerInput } from "@/lib/supabase/admin";

export default function EditarParceiro() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [parceiro, setParceiro] = useState<PartnerRow | null>(null);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    if (!id) return;
    buscarParceiro(id).then((p) => {
      setParceiro(p);
      setCarregado(true);
    });
  }, [id]);

  const gravar = async (dados: PartnerInput) => {
    const { id: _id, ...rest } = dados;
    const { erro } = await atualizarParceiro(id, rest);
    if (!erro) router.push("/admin/parceiros");
    return erro;
  };

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6">
        <p className="eyebrow mb-1 text-brand">Parceiros</p>
        <h1 className="font-display text-2xl font-semibold text-stone-800">Editar parceiro</h1>
      </header>

      {!carregado ? (
        <div className="h-96 animate-pulse rounded-4xl border border-stone-100 bg-white shadow-card" />
      ) : !parceiro ? (
        <p className="text-sm text-stone-500">Parceiro não encontrado.</p>
      ) : (
        <PartnerForm inicial={parceiro} onGravar={gravar} modoEdicao />
      )}
    </div>
  );
}
