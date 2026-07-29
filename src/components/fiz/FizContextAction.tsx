"use client";

import { useEffect, useState } from "react";
import { fizAtiva } from "@/lib/fiz/flag";
import { ArrowRight } from "@/components/ui/Icons";
import FizLogo from "./FizLogo";

// ─────────────────────────────────────────────────────────────────────────
//  Ação contextual — a versão discreta do encaminhamento para a FIZ.
//
//  Colocada logo a seguir à secção que explica uma obrigação, para quem já
//  percebeu e quer executar sem chegar ao fim do Guia (ponto 5.2 da
//  arquitetura). Não substitui a explicação nem as fontes: é uma linha.
//
//  Só aparece quando o catálogo confirma que a ação existe.
// ─────────────────────────────────────────────────────────────────────────

interface FizContextActionProps {
  slug: string;
  /** Texto próprio do contexto; se omitido usa o rótulo devolvido pela FIZ. */
  texto?: string;
}

interface RespostaAcao {
  acao: { estado: string; rotulo: string } | null;
}

const ESTADOS_ACIONAVEIS = ["disponivel_ligado", "disponivel_por_ligar", "disponivel_criar_conta", "requer_plano_fiz"];

export default function FizContextAction({ slug, texto }: FizContextActionProps) {
  const [rotulo, setRotulo] = useState<string | null>(null);

  useEffect(() => {
    if (!fizAtiva()) return;
    let ativo = true;
    fetch("/api/integrations/fiz/guide-route", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, placement: "CONTEXT_ACTION" }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: RespostaAcao | null) => {
        if (ativo && d?.acao && ESTADOS_ACIONAVEIS.includes(d.acao.estado)) setRotulo(texto ?? d.acao.rotulo);
      })
      .catch(() => {
        /* falha silenciosa: o parágrafo do Guia fica como está */
      });
    return () => {
      ativo = false;
    };
  }, [slug, texto]);

  if (!rotulo) return null;

  return (
    <a
      href="/dashboard/conta?ligar=fiz"
      rel="nofollow sponsored"
      className="group my-4 flex min-h-[44px] items-center gap-3 rounded-2xl border border-fiz-200 bg-fiz-50 px-4 py-3 transition-colors hover:border-fiz-400"
    >
      <FizLogo size={20} className="flex-shrink-0 rounded-md" decorativo />
      <span className="min-w-0 flex-1 text-sm font-medium text-stone-800 dark:text-stone-100">{rotulo}</span>
      <ArrowRight size={15} className="flex-shrink-0 text-fiz-700 transition-transform group-hover:translate-x-0.5" />
    </a>
  );
}
