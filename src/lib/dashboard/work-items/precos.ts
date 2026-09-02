"use client";

// ─────────────────────────────────────────────────────────────────────────
//  Preços → itens de trabalho.
//
//  Dois cofres: o rascunho a decorrer (`preco`) e a lista do que já ficou
//  decidido (`precos-guardados`). São coisas diferentes de propósito —
//  recomeçar um cálculo não pode apagar a lista.
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ PORQUE NÃO HÁ «FALTAM 3 CAMPOS» NO CARTÃO                            │
//  │                                                                     │
//  │ Saber quantos campos essenciais faltam obriga a `essenciaisDe()`, e  │
//  │ essa função vive no motor de preço — que é precisamente o que não    │
//  │ pode entrar no chunk da visão geral.                                 │
//  │                                                                     │
//  │ Podia inventar-se um denominador. Não se inventa: o cartão diz       │
//  │ quantos campos foram respondidos, que é uma coisa que o envelope     │
//  │ sabe, e o workspace — que carrega o motor — mostra o que falta.      │
//  │ Um número inventado num cartão de progresso é indistinguível de um   │
//  │ número verdadeiro, e isso é pior do que não ter barra nenhuma.       │
//  └─────────────────────────────────────────────────────────────────────┘
// ─────────────────────────────────────────────────────────────────────────

import { arrayDe, iso, lerEnvelope } from "./leitura";
import type { ItemTrabalho, LeituraTrabalho } from "./tipos";

const HREF = "/dashboard/precos";

const euros = (valor: unknown): string | null =>
  typeof valor === "number" && Number.isFinite(valor)
    ? `${valor.toFixed(2).replace(".", ",")} €`
    : null;

export function itensDePrecos(): LeituraTrabalho {
  const itens: ItemTrabalho[] = [];
  const falhas: LeituraTrabalho["falhas"] = [];

  // ── O rascunho a decorrer ────────────────────────────────────────────
  const rascunho = lerEnvelope<{ versao?: number; contexto?: unknown; respondidos?: unknown; atualizadoEm?: unknown }>("preco");
  if (rascunho.estado === "ilegivel") falhas.push({ dominio: "preco" });
  if (rascunho.estado === "lido") {
    const contexto = rascunho.valor.contexto as { cenario?: unknown } | undefined;
    const respondidos = arrayDe(rascunho.valor.respondidos).filter((r) => typeof r === "string");
    // ┌───────────────────────────────────────────────────────────────┐
    // │ O ENVELOPE v2 NÃO TINHA DATA — E SEM DATA NÃO HÁ «CONTINUAR»   │
    // │                                                               │
    // │ O v3 acrescenta `atualizadoEm`. Um envelope v2 continua a ser  │
    // │ lido (é o que a retrocompatibilidade existe para fazer) e      │
    // │ entra na lista com a data de agora, porque é o mais honesto    │
    // │ que se consegue dizer: sabe-se que existe, não se sabe de      │
    // │ quando. Ao gravar outra vez passa a ter data a sério.          │
    // └───────────────────────────────────────────────────────────────┘
    const atualizadoEm = iso(rascunho.valor.atualizadoEm) ?? new Date().toISOString();
    if (contexto && typeof contexto === "object") {
      itens.push({
        id: "preco:rascunho",
        tipo: "preco",
        titulo: "Cálculo de preço em curso",
        subtitulo:
          respondidos.length === 0
            ? "Ainda sem respostas tuas"
            : `${respondidos.length} ${respondidos.length === 1 ? "campo respondido" : "campos respondidos"}`,
        atualizadoEm,
        estado: respondidos.length === 0 ? "rascunho" : "por-completar",
        href: `${HREF}/novo`,
        fonte: "dispositivo",
        proximaAccao: { label: "Continuar cálculo", href: `${HREF}/novo` },
        versaoEsquema: typeof rascunho.valor.versao === "number" ? rascunho.valor.versao : 2,
      });
    }
  }

  // ── Os preços guardados ──────────────────────────────────────────────
  const guardados = lerEnvelope<{ versao?: number; itens?: unknown }>("precos-guardados");
  if (guardados.estado === "ilegivel") falhas.push({ dominio: "precos-guardados" });
  if (guardados.estado === "lido") {
    for (const bruto of arrayDe(guardados.valor.itens)) {
      if (!bruto || typeof bruto !== "object") continue;
      const p = bruto as { id?: unknown; nome?: unknown; em?: unknown; pvp?: unknown; anoFiscal?: unknown };
      if (typeof p.id !== "string" || typeof p.nome !== "string") continue;
      const atualizadoEm = iso(p.em);
      if (!atualizadoEm) continue;

      // Um preço guardado com um ano fiscal anterior ao corrente foi
      // calculado com regras que já mudaram. Dizer-se-lhe «pronto» era
      // esconder isso; e recalcular por cima era pior (ver ADR-07).
      const anoGuardado = typeof p.anoFiscal === "number" ? p.anoFiscal : Number(atualizadoEm.slice(0, 4));
      const desatualizado = Number.isFinite(anoGuardado) && anoGuardado < new Date().getFullYear();

      itens.push({
        id: `preco:guardado:${p.id}`,
        tipo: "preco",
        titulo: p.nome,
        subtitulo: desatualizado ? `Guardado com as regras de ${anoGuardado}` : undefined,
        atualizadoEm,
        estado: desatualizado ? "desatualizado" : "concluido",
        href: `${HREF}/${encodeURIComponent(p.id)}`,
        fonte: "dispositivo",
        proximaAccao: desatualizado
          ? { label: "Ver o que mudou", href: `${HREF}/${encodeURIComponent(p.id)}` }
          : { label: "Rever preço", href: `${HREF}/${encodeURIComponent(p.id)}` },
        metrica: euros(p.pvp) ? { label: "Preço", valor: euros(p.pvp)! } : undefined,
        versaoEsquema: typeof guardados.valor.versao === "number" ? guardados.valor.versao : 1,
      });
    }
  }

  return { itens, falhas };
}
