"use client";

import { useEffect, useState } from "react";
import PartnerCard from "@/components/ui/PartnerCard";
import { getPartnerForContext, dismissPartner, type Partner } from "@/lib/partners";
import { supabaseConfigurado } from "@/lib/supabase/client";
import { listarParceirosAtivos } from "@/lib/supabase/admin";

function rowToPartner(row: Awaited<ReturnType<typeof listarParceirosAtivos>>[number]): Partner {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao,
    url: row.url,
    cta: row.cta,
    contextos: row.contextos,
    icone: row.icone,
  };
}

export default function PartnerSpot({ context }: { context: string }) {
  const [partner, setPartner] = useState<Partner | null>(null);

  useEffect(() => {
    async function init() {
      if (supabaseConfigurado()) {
        try {
          const rows = await listarParceirosAtivos();
          const catalog = rows.map(rowToPartner);
          setPartner(getPartnerForContext(context, catalog));
          return;
        } catch {
          // Supabase falhou → fallback estático
        }
      }
      setPartner(getPartnerForContext(context));
    }
    init();
  }, [context]);

  if (!partner) return null;

  return (
    <PartnerCard
      partner={partner}
      onDismiss={() => {
        dismissPartner(partner.id);
        setPartner(null);
      }}
    />
  );
}
