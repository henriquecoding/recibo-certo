"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  buscarParceiro,
  atualizarParceiro,
  listarPlacements,
  guardarPlacement,
  eliminarPlacement,
  type PartnerRow,
} from "@/lib/supabase/admin";
import PartnerForm from "@/components/admin/PartnerForm";
import Link from "next/link";
import type { PartnerInput } from "@/lib/supabase/admin";
import type { Superficie } from "@/content/parcerias-destinos";

export default function EditarParceiro() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [parceiro, setParceiro] = useState<PartnerRow | null>(null);
  const [superficies, setSuperficies] = useState<Superficie[]>([]);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([buscarParceiro(id), listarPlacements(id).catch(() => [])]).then(
      ([p, places]) => {
        setParceiro(p);
        setSuperficies(places.filter((x) => x.ativo).map((x) => x.superficie as Superficie));
        setCarregado(true);
      },
    );
  }, [id]);

  const gravar = async (dados: PartnerInput) => {
    const { id: _id, ...rest } = dados;
    const { erro } = await atualizarParceiro(id, rest);
    return erro;
  };

  // As superfícies vivem noutra tabela: gravam-se depois do parceiro, e é
  // aqui que a lista escolhida no formulário vira linhas em
  // `partner_placements`. Uma superfície desticada é APAGADA, não desativada:
  // a linha só existe enquanto for uma decisão em vigor.
  const gravarSuperficies = async (escolhidas: Superficie[]) => {
    const atuais = await listarPlacements(id).catch(() => []);
    const atuaisChaves = new Set(atuais.map((p) => p.superficie));

    for (const s of escolhidas) {
      if (atuaisChaves.has(s)) {
        const existente = atuais.find((p) => p.superficie === s)!;
        if (!existente.ativo) {
          const { erro } = await guardarPlacement({ ...existente, ativo: true });
          if (erro) return erro;
        }
        continue;
      }
      const { erro } = await guardarPlacement({
        id: `${id}:${s}:padrao`,
        parceiro_id: id,
        superficie: s,
        variante: "padrao",
        criativo_id: null,
        copy_titulo: null,
        copy_sub: null,
        copy_cta: null,
        copy_nota: null,
        divulgacao: null,
        ativo: true,
        ordem: 0,
      });
      if (erro) return erro;
    }

    for (const p of atuais) {
      if (!escolhidas.includes(p.superficie as Superficie)) {
        const { erro } = await eliminarPlacement(p.id);
        if (erro) return erro;
      }
    }
    router.push("/admin/parceiros");
    return undefined;
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
        <>
          <div className="mb-4 flex justify-end">
            <Link
              href={`/admin/parceiros/${id}/desempenho`}
              className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:border-stone-300 dark:border-stone-700 dark:text-stone-300"
            >
              Ver desempenho
            </Link>
          </div>
          <PartnerForm
            inicial={parceiro}
            onGravar={gravar}
            modoEdicao
            superficiesIniciais={superficies}
            onGravarSuperficies={gravarSuperficies}
          />
        </>
      )}
    </div>
  );
}
