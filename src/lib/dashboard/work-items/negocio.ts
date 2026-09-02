"use client";

// ─────────────────────────────────────────────────────────────────────────
//  Projeto de negócio → item de trabalho.
//
//  O rascunho do estúdio é o dado mais sensível que este produto guarda no
//  browser: custos de fornecedor, margens, volumes e a estrutura de custos
//  inteira. Daqui sai um cartão com o nome que a pessoa deu, a data e
//  quantas ofertas tem — nada do que está lá dentro.
//
//  O projeto pode existir em dois sítios ao mesmo tempo: o rascunho local
//  (automático) e um cenário `negocio` guardado por decisão explícita. A
//  deduplicação é do agregador, que vê os dois.
// ─────────────────────────────────────────────────────────────────────────

import { arrayDe, iso, lerEnvelope } from "./leitura";
import type { ItemTrabalho, LeituraTrabalho } from "./tipos";

const HREF = "/dashboard/negocio";

export function itensDeNegocio(): LeituraTrabalho {
  const leitura = lerEnvelope<{ versao?: number; contexto?: unknown }>("negocio");
  if (leitura.estado === "ilegivel") return { itens: [], falhas: [{ dominio: "negocio" }] };
  if (leitura.estado === "vazio") return { itens: [], falhas: [] };

  const contexto = leitura.valor.contexto;
  if (!contexto || typeof contexto !== "object") return { itens: [], falhas: [{ dominio: "negocio" }] };

  const c = contexto as {
    id?: unknown;
    nome?: unknown;
    ofertas?: unknown;
    respondidos?: unknown;
    versao?: unknown;
    meta?: { criadoEm?: unknown; atualizadoEm?: unknown };
  };
  const atualizadoEm = iso(c.meta?.atualizadoEm) ?? iso(c.meta?.criadoEm);
  if (!atualizadoEm) return { itens: [], falhas: [{ dominio: "negocio" }] };

  const ofertas = arrayDe(c.ofertas).length;
  const respondidos = arrayDe(c.respondidos).length;
  const temSubstancia = ofertas > 0 || respondidos > 0;

  return {
    falhas: [],
    itens: [
      {
        id: `negocio:${typeof c.id === "string" ? c.id : "rascunho"}`,
        tipo: "negocio",
        titulo: typeof c.nome === "string" && c.nome.trim() ? c.nome : "Projeto de negócio",
        subtitulo: ofertas > 0 ? `${ofertas} ${ofertas === 1 ? "oferta" : "ofertas"}` : "Sem ofertas ainda",
        atualizadoEm,
        estado: temSubstancia ? "por-completar" : "rascunho",
        href: HREF,
        fonte: "dispositivo",
        proximaAccao: { label: temSubstancia ? "Continuar projeto" : "Começar o projeto", href: HREF },
        versaoEsquema: typeof c.versao === "number" ? c.versao : 2,
      },
    ],
  };
}
