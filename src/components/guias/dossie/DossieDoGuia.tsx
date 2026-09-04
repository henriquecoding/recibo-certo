"use client";

// ═══════════════════════════════════════════════════════════════════════
//  LEVAR ISTO A UM CONTABILISTA — a porta que os Guias nunca tiveram
//  ---------------------------------------------------------------------
//  O segundo destino de um Guia. Não é um link que a pessoa manda: é um
//  documento de trabalho — a projeção versionada do guia que ela leu, mais
//  o que ela respondeu e marcou — que segue com consentimento, fica preso
//  à VERSÃO LIDA, e do outro lado tem uma consola onde se extrai e se pede.
//
//  ⚠️ RECEBE DADOS, NÃO IMPORTA CATÁLOGOS. A `ProjecaoDeGuia` chega por
//  props, já feita no servidor. Importar `projecao.servidor.ts` aqui
//  traria `catalogo.ts` + `conteudo.ts` + `dados-motor.ts` — meio
//  megabyte — para desenhar uma folha que a maior parte das visitas nem
//  abre. É a regra de `atalhos.servidor.ts`, e `dossie:fronteira`
//  verifica-a.
//
//  ⚠️ A FOLHA ENTRA POR `next/dynamic`, dentro de um `ErrorBoundary`. Este
//  ficheiro é só o botão: leve, servido em 169 páginas. O que é pesado —
//  composição, formatos, camada de dados — só chega quando alguém carrega.
//
//  ⚠️ NÃO VERIFICA O PLANO, e não pode passar a verificar. Ver
//  `PARTILHA_NUNCA_EXIGE_PLUS` em `contabilistas/vinculo.ts`.
// ═══════════════════════════════════════════════════════════════════════

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { useAuth } from "@/lib/supabase/auth";
import { registar } from "@/lib/analytics/cliente";
import Button from "@/components/ui/Button";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { Briefcase } from "@/components/ui/Icons";
import type { ProjecaoDeGuia } from "@/lib/guias/dossie";

const FolhaDossie = dynamic(() => import("./FolhaDossie"), { ssr: false });

interface Props {
  projecao: ProjecaoDeGuia;
  /** `principal` desenha um cartão; `secundaria` uma linha de texto. */
  variante: "principal" | "secundaria";
  /** O motivo da rota, em pt-PT. Só aparece na variante principal. */
  motivo?: string;
  /** A rota que o guia escolheu — vai na medição, nunca no ecrã. */
  rota?: "contabilista" | "fiz";
}

export default function DossieDoGuia({ projecao, variante, motivo, rota = "contabilista" }: Props) {
  const [aberto, setAberto] = useState(false);
  const { user } = useAuth();

  const abrir = useCallback(() => {
    setAberto(true);
    registar("guide_dossier_start", {
      guide_id: projecao.guia.slug,
      route: rota,
      user_state: user ? "autenticado" : "anonimo",
    });
  }, [projecao.guia.slug, rota, user]);

  return (
    <>
      {variante === "principal" ? (
        <section
          aria-labelledby={`dossie-${projecao.guia.slug}`}
          className="mt-10 rounded-4xl border border-stone-200 bg-white p-5 shadow-card dark:border-stone-700 dark:bg-stone-900 sm:p-6"
        >
          <h2
            id={`dossie-${projecao.guia.slug}`}
            className="flex items-center gap-2 font-display text-lg font-semibold text-ink"
          >
            <Briefcase size={18} className="text-brand" aria-hidden />
            Levar isto a um contabilista
          </h2>
          {motivo && (
            <p className="mt-1.5 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{motivo}</p>
          )}
          <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            Preparamos um dossiê com o que este guia responde, a base legal, os elementos a
            reunir e os pontos que dependem do teu caso — e ficas a escolher o que segue.{" "}
            <strong className="text-stone-800 dark:text-stone-100">
              Não custa nada e não precisas de plano nenhum.
            </strong>
          </p>
          <Button size="sm" className="mt-4" onClick={abrir}>
            Preparar o dossiê
          </Button>
        </section>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          ou{" "}
          <button
            type="button"
            onClick={abrir}
            className="font-semibold text-brand-dark underline underline-offset-2 dark:text-brand"
          >
            levar isto a um contabilista
          </button>{" "}
          — preparamos o dossiê deste guia e escolhes o que segue.
        </p>
      )}

      {aberto && (
        <ErrorBoundary etiqueta="a folha do dossiê">
          <FolhaDossie projecao={projecao} onFechar={() => setAberto(false)} />
        </ErrorBoundary>
      )}
    </>
  );
}
