"use client";

// ─────────────────────────────────────────────────────────────────────────
//  Descobrir → itens de trabalho.
//
//  Três cofres, três coisas diferentes:
//    · o PERFIL          — guardado por decisão explícita
//    · os INSTANTÂNEOS   — o histórico das análises
//    · as HIPÓTESES      — o que está a ser testado, com provas
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ O QUE ESTE ADAPTADOR NÃO SABE, E É DE PROPÓSITO                      │
//  │                                                                     │
//  │ Não sabe o TÍTULO de uma hipótese. O título compõe-se do grafo de    │
//  │ problemas e modelos de receita, e resolvê-lo aqui obrigaria a        │
//  │ importar o motor de descoberta para o overview.                      │
//  │                                                                     │
//  │ Também não devia sabê-lo por outra razão, mais importante: o título  │
//  │ de uma hipótese é composto a partir das COMPETÊNCIAS e da ZONA de    │
//  │ quem a criou. É perfil, e perfil não sai do workspace.               │
//  │                                                                     │
//  │ O cartão diz «Hipótese em teste» e conta as provas. Quem quiser o    │
//  │ nome abre o workspace, que é onde o motor vive.                      │
//  └─────────────────────────────────────────────────────────────────────┘
// ─────────────────────────────────────────────────────────────────────────

import { arrayDe, iso, lerEnvelope, maisRecente } from "./leitura";
import type { ItemTrabalho, LeituraTrabalho } from "./tipos";

const HREF = "/dashboard/descobrir";

export function itensDeDescoberta(): LeituraTrabalho {
  const itens: ItemTrabalho[] = [];
  const falhas: LeituraTrabalho["falhas"] = [];

  const perfil = lerEnvelope<{ versao?: number; guardadoEm?: string }>("perfil-descoberta");
  const instantaneos = lerEnvelope<{ versao?: number; instantaneos?: unknown }>("instantaneos-descoberta");
  const hipoteses = lerEnvelope<{ versao?: number; hipoteses?: unknown }>("hipoteses-mercado");

  if (perfil.estado === "ilegivel") falhas.push({ dominio: "perfil-descoberta" });
  if (instantaneos.estado === "ilegivel") falhas.push({ dominio: "instantaneos-descoberta" });
  if (hipoteses.estado === "ilegivel") falhas.push({ dominio: "hipoteses-mercado" });

  // ── A análise: perfil guardado e, quando existe, o último instantâneo ──
  const guardadoEm = perfil.estado === "lido" ? iso(perfil.valor.guardadoEm) : null;
  const linhas = instantaneos.estado === "lido" ? arrayDe(instantaneos.valor.instantaneos) : [];
  const ultimaAnalise = linhas
    .map((x) => (x && typeof x === "object" ? iso((x as { geradoEm?: unknown }).geradoEm) : null))
    .filter((d): d is string => d !== null)
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];

  if (guardadoEm || ultimaAnalise) {
    const atualizadoEm = maisRecente(ultimaAnalise, guardadoEm)!;
    const temAnalise = Boolean(ultimaAnalise);
    itens.push({
      id: "descoberta:perfil",
      tipo: "descoberta",
      titulo: temAnalise ? "A tua análise de oportunidades" : "O teu perfil de descoberta",
      subtitulo: temAnalise
        ? `${linhas.length} ${linhas.length === 1 ? "análise guardada" : "análises guardadas"}`
        : "Perfil guardado, análise por correr",
      atualizadoEm,
      estado: temAnalise ? "pronto" : "por-completar",
      href: HREF,
      fonte: "dispositivo",
      proximaAccao: temAnalise
        ? { label: "Rever resultados", href: HREF }
        : { label: "Continuar análise", href: HREF },
      versaoEsquema: 1,
    });
  }

  // ── As hipóteses em teste ────────────────────────────────────────────
  if (hipoteses.estado === "lido") {
    for (const bruta of arrayDe(hipoteses.valor.hipoteses)) {
      if (!bruta || typeof bruta !== "object") continue;
      const h = bruta as { templateId?: unknown; updatedAt?: unknown; createdAt?: unknown; proofs?: unknown };
      if (typeof h.templateId !== "string" || h.templateId.length === 0) continue;
      const atualizadoEm = maisRecente(iso(h.updatedAt), iso(h.createdAt));
      if (!atualizadoEm) continue;

      const provas = arrayDe(h.proofs).length;
      itens.push({
        id: `descoberta:hipotese:${h.templateId}`,
        tipo: "descoberta",
        // Sem título: ver o quadro no topo do ficheiro.
        titulo: "Hipótese em teste",
        subtitulo: provas === 0 ? "Ainda sem provas registadas" : `${provas} ${provas === 1 ? "prova" : "provas"} registadas`,
        atualizadoEm,
        estado: "em-teste",
        href: HREF,
        fonte: "dispositivo",
        proximaAccao: { label: "Registar evidência", href: HREF },
        versaoEsquema: 1,
      });
    }
  }

  return { itens, falhas };
}
