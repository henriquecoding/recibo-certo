"use client";

// ─────────────────────────────────────────────────────────────────────────
//  Cenários guardados → itens de trabalho.
//
//  Um cenário é, por definição, um resultado que alguém decidiu guardar —
//  por isso entra como `concluido`, e a próxima ação é reabri-lo.
//
//  Dois dos sete tipos não são «simulações» quaisquer: `negocio` e
//  `contratacao` são etapas do arco do negócio e ganham o seu próprio
//  tipo de trabalho, para o cartão aparecer ao lado do rascunho local
//  correspondente em vez de os dois se ignorarem.
//
//  A FONTE é lida, nunca assumida: para uma conta Plus os cenários vivem
//  na nuvem, para todas as outras vivem no dispositivo — e o cartão diz
//  qual dos dois, porque a diferença é a promessa de privacidade.
// ─────────────────────────────────────────────────────────────────────────

import { META_TIPO_CENARIO, type Cenario } from "@/lib/store/cenarios";
import { iso } from "./leitura";
import type { ItemTrabalho, LeituraTrabalho, TipoTrabalho } from "./tipos";

const TIPO_DE_CENARIO: Partial<Record<Cenario["tipo"], TipoTrabalho>> = {
  negocio: "negocio",
  contratacao: "contratacao",
};

export function itensDeCenarios(cenarios: readonly Cenario[], naNuvem: boolean): LeituraTrabalho {
  const itens: ItemTrabalho[] = [];

  for (const c of cenarios) {
    const meta = META_TIPO_CENARIO[c.tipo];
    if (!meta) continue;
    const atualizadoEm = iso(c.criadoEm);
    if (!atualizadoEm) continue;

    itens.push({
      id: `cenario:${c.id}`,
      tipo: TIPO_DE_CENARIO[c.tipo] ?? "cenario",
      titulo: c.nome,
      subtitulo: meta.label,
      atualizadoEm,
      estado: "concluido",
      href: meta.rota,
      fonte: naNuvem ? "conta" : "dispositivo",
      proximaAccao: { label: "Abrir", href: meta.rota },
      versaoEsquema: c.versao,
    });
  }

  return { itens, falhas: [] };
}
