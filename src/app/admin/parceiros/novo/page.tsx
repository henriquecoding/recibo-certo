"use client";

import { useRouter } from "next/navigation";
import { criarParceiro } from "@/lib/supabase/admin";
import PartnerForm from "@/components/admin/PartnerForm";
import type { PartnerInput } from "@/lib/supabase/admin";

export default function NovoParceiro() {
  const router = useRouter();

  const gravar = async (dados: PartnerInput) => {
    const { erro } = await criarParceiro(dados);
    if (!erro) router.push("/admin/parceiros");
    return erro;
  };

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6">
        <p className="eyebrow mb-1 text-brand">Parceiros</p>
        <h1 className="font-display text-2xl font-semibold text-stone-800">Novo parceiro</h1>
      </header>
      <PartnerForm onGravar={gravar} />
    </div>
  );
}
