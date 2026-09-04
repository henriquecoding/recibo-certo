import "server-only";

// ═══════════════════════════════════════════════════════════════════════
//  A PROJEÇÃO — o Guia visto por quem o vai receber
//  ---------------------------------------------------------------------
//  Este módulo lê os catálogos (manifestos, aplicabilidade, afirmações,
//  fontes, dados do ano, avisos) e devolve as SECÇÕES de um dossiê. Não
//  escreve conteúdo nenhum: o `texto` de cada item é a string publicada,
//  tal e qual, e `dossie:fidelidade` reprova qualquer divergência.
//
//  ⚠️ É `server-only` de propósito. Importar `catalogo.ts` + `conteudo.ts`
//  + `dados-motor.ts` num componente de cliente traz meio megabyte — foi
//  exatamente isso que `atalhos.servidor.ts` documentou e fechou. A folha
//  de composição recebe a projeção JÁ FEITA, por props.
//
//  O QUE NÃO É PROJETADO AQUI, E PORQUÊ
//   · `simulacao` — vive no `localStorage` do dispositivo (`bagagem.ts`) e
//     o servidor não a conhece nem deve conhecer;
//   · `historico` — é o que mudou DESDE a composição, e no instante da
//     composição é vazio por definição. Calcula-se na leitura
//     (`alteracoesDesde`), que é onde tem significado.
// ═══════════════════════════════════════════════════════════════════════

import { APP_VERSION } from "@/lib/version";
import { FISCAL_YEAR } from "@/lib/fiscal-year";
import { ARQUETIPOS, manifesto, type GuideManifest } from "@/lib/guias/manifests";
import { aplicabilidade } from "@/lib/guias/aplicabilidade";
import { claimsDoGuia, type LegalClaim } from "@/lib/guias/claims";
import { fontesDoGuia } from "@/lib/guias";
import { historicoDoGuia } from "@/lib/guias/historico";
import { guiaExpansao } from "@/lib/guias/expansao/catalogo";
import { CONTEUDO_EXPANSAO } from "@/lib/guias/expansao/conteudo";
import { dadosDoGuia } from "@/lib/guias/expansao/dados";
import { DATA_EXPANSAO } from "@/lib/guias/expansao/derivar";
import type { DadoDoMotor } from "@/lib/guias/expansao/dados-motor";
import { gerarPrazos, type CategoriaPrazo } from "@/lib/prazos";
import type { AreaDoCaso } from "@/lib/contabilistas/areas";
import { resolverArea } from "./area";
import { perguntasDoGuia } from "./perguntas";
import { TITULO_SECCAO, type CabecalhoDoGuia, type IdSeccao, type ItemDossie, type ProjecaoDeGuia, type Proveniencia, type SeccaoDossie } from "./tipos";

// ─── Proveniência editorial ────────────────────────────────────────────

/**
 * De onde vem o texto editorial de um guia.
 *
 * Nos 112 da expansão é o pacote verificado a 6 de agosto de 2026, e
 * dizê-lo permite ao destinatário saber que aquele texto tem data. Nos
 * outros é o registo editorial — o manifesto.
 */
function provenienciaEditorial(slug: string): Proveniencia {
  return guiaExpansao(slug)
    ? { origem: "pacote", guia: slug, verificadoEm: DATA_EXPANSAO }
    : { origem: "manifesto", slug };
}

function provenienciaDeAfirmacao(c: LegalClaim): Proveniencia {
  return {
    origem: "afirmacao",
    claimId: c.id,
    fonteIds: c.sourceIds,
    confianca: c.confidence,
    severidade: c.reviewSeverity,
    vigencia: { de: c.appliesFrom, ate: c.appliesUntil },
  };
}

/** Uma secção com itens; nada quando não há itens (§4.3, regra 2). */
function seccao(id: IdSeccao, itens: ItemDossie[]): SeccaoDossie | null {
  if (itens.length === 0) return null;
  return { id, titulo: TITULO_SECCAO[id], itens, incluida: true };
}

// ─── As categorias de prazo que uma área conhece ───────────────────────

/**
 * `AreaDoCaso` → `CategoriaPrazo`.
 *
 * O calendário fiscal tem três categorias e a plataforma tem oito áreas;
 * só três se correspondem, e é uma tabela e não uma adivinha. As outras
 * cinco não recebem prazos do calendário nacional — receber-los-iam sem
 * relação com a matéria, que é a definição de ruído.
 */
const CATEGORIA_PRAZO_POR_AREA: Partial<Record<AreaDoCaso, CategoriaPrazo>> = {
  irs: "irs",
  iva: "iva",
  seguranca_social: "ss",
};

/**
 * Quantos prazos do calendário nacional entram, no máximo.
 *
 * O calendário inteiro num dossiê é o oposto do que o dossiê promete: em
 * vez de dizer o que interessa àquele caso, despeja a agenda toda e o
 * leitor volta a ter de a filtrar.
 */
const MAXIMO_PRAZOS_DO_CALENDARIO = 6;

// ─── A projeção ────────────────────────────────────────────────────────

export function projetarGuia(slug: string): ProjecaoDeGuia | null {
  const m = manifesto(slug);
  if (!m) return null;

  const a = aplicabilidade(slug);
  const claims = claimsDoGuia(slug);
  const fontes = fontesDoGuia(slug).oficiais;
  const editorial = provenienciaEditorial(slug);
  const area = resolverArea(slug, m.hub);

  const guia: CabecalhoDoGuia = {
    slug: m.slug,
    titulo: m.title,
    arquetipo: m.archetype,
    categoria: m.categoria,
    hub: m.hub,
    area,
  };

  const seccoes: SeccaoDossie[] = [];
  const empurra = (s: SeccaoDossie | null) => { if (s) seccoes.push(s); };

  // ── resumo ───────────────────────────────────────────────────────────
  //  Dois itens aqui; a folha acrescenta a SITUAÇÃO (a nota da pessoa) e o
  //  QUE FALTA (contagens do que ela respondeu). São os quatro campos do
  //  §6.1, e nunca mais do que quatro.
  const resumo: ItemDossie[] = [
    {
      id: "resumo.enquadramento",
      texto: `${m.categoria} · ${ARQUETIPOS[m.archetype].rotulo} · guia «${m.title}», versão de ${m.lastReviewedAt}`,
      proveniencia: { origem: "manifesto", slug: m.slug },
    },
  ];
  if (a?.respostaCurta) {
    const daResposta = claims.find((c) => c.statement === a.respostaCurta);
    resumo.push({
      id: "resumo.resposta",
      texto: a.respostaCurta,
      proveniencia: daResposta ? provenienciaDeAfirmacao(daResposta) : editorial,
    });
  }
  empurra(seccao("resumo", resumo));

  // ── elementos ────────────────────────────────────────────────────────
  //  A checklist do guia, numerada. A numeração é a convenção PBC e não é
  //  decoração: é o que faz o cliente responder «o 3 já tenho» em vez de
  //  reescrever o item.
  const elementos = a?.checklist ?? [];
  empurra(
    seccao(
      "elementos",
      elementos.map((texto, i) => ({
        id: `elementos.${i}`,
        texto,
        numero: i + 1,
        proveniencia: editorial,
      })),
    ),
  );

  // ── julgamento ───────────────────────────────────────────────────────
  //  O achado com maior valor do relatório: a agenda da consulta já está
  //  escrita, guia a guia, revista, com base legal. Ordenada por
  //  severidade — o que pode custar um direito vem primeiro.
  const ORDEM_SEVERIDADE = { critical: 0, high: 1, normal: 2 } as const;
  const porRever = claims
    .filter((c) => c.confidence === "review_required")
    .sort((x, y) => ORDEM_SEVERIDADE[x.reviewSeverity] - ORDEM_SEVERIDADE[y.reviewSeverity]);
  empurra(
    seccao(
      "julgamento",
      porRever.map((c) => ({
        id: c.id,
        texto: c.statement,
        peso: c.reviewSeverity,
        proveniencia: provenienciaDeAfirmacao(c),
      })),
    ),
  );

  // ── prazos ───────────────────────────────────────────────────────────
  //  Só o que tem data. Primeiro o que é DESTE guia — vigências que
  //  expiram, o período do próprio manifesto — e só depois o calendário
  //  nacional, e mesmo esse só nos guias que declaram a ferramenta de
  //  prazos. Um guia sobre penhoras não precisa da agenda do IVA.
  const prazos: ItemDossie[] = [];
  for (const c of claims) {
    if (!c.appliesUntil) continue;
    prazos.push({
      id: `prazos.${c.id}`,
      texto: c.statement,
      quando: { de: c.appliesFrom, ate: c.appliesUntil },
      proveniencia: provenienciaDeAfirmacao(c),
    });
  }
  if (m.effectiveTo) {
    prazos.push({
      id: "prazos.vigencia-do-guia",
      texto: `O conteúdo deste guia aplica-se até ${m.effectiveTo}.`,
      quando: { de: m.effectiveFrom, ate: m.effectiveTo },
      proveniencia: { origem: "manifesto", slug: m.slug },
    });
  }
  const categoria = CATEGORIA_PRAZO_POR_AREA[area];
  if (categoria && (m.hub === "prazos" || m.relatedToolIds.includes("prazos"))) {
    for (const p of gerarPrazos(FISCAL_YEAR)
      .filter((x) => x.categoria === categoria)
      .slice(0, MAXIMO_PRAZOS_DO_CALENDARIO)) {
      prazos.push({
        id: `prazos.calendario.${p.id}`,
        texto: `${p.titulo} — ${p.descricao}`,
        quando: { de: p.data, ate: p.data },
        proveniencia: { origem: "manifesto", slug: m.slug },
      });
    }
  }
  empurra(seccao("prazos", prazos));

  // ── números ──────────────────────────────────────────────────────────
  //  `origem: "motor"` primeiro, e os retidos NUNCA entram: um valor que o
  //  pacote marcou «confirmar» não se publica na página, e um dossiê é
  //  publicação como qualquer outra.
  const numeros: ItemDossie[] = [];
  const dados = dadosDoGuia(slug);
  if (dados.origem === "motor") {
    for (const d of dados.publicaveis as DadoDoMotor[]) {
      numeros.push({
        id: `numeros.${d.binding}.${numeros.length}`,
        texto: `${d.label}: ${d.valor}${d.nota ? ` (${d.nota})` : ""}`,
        ruleKey: d.binding,
        ano: FISCAL_YEAR,
        proveniencia: { origem: "motor", ruleKey: d.binding, ano: FISCAL_YEAR },
      });
    }
  } else {
    for (const [i, d] of dados.publicaveis.entries()) {
      numeros.push({
        id: `numeros.pacote.${i}`,
        texto: `${d.label}: ${d.valor}${d.nota ? ` (${d.nota})` : ""}`,
        ano: FISCAL_YEAR,
        proveniencia: editorial,
      });
    }
  }
  // Nos 57 guias antigos os números vivem nas afirmações com `ruleKey`. As
  // que exigem revisão ficam de fora: já estão em `julgamento`, e um item
  // repetido em duas secções conta duas vezes na seleção da consola.
  for (const c of claims) {
    if (!c.ruleKey || c.confidence === "review_required") continue;
    numeros.push({
      id: `numeros.${c.id}`,
      texto: c.statement,
      ruleKey: c.ruleKey,
      ano: new Date(c.appliesFrom).getFullYear(),
      proveniencia: { origem: "motor", ruleKey: c.ruleKey, ano: new Date(c.appliesFrom).getFullYear() },
    });
  }
  empurra(seccao("numeros", numeros));

  // ── base legal ───────────────────────────────────────────────────────
  //  Já vêm ordenadas por autoridade — a mesma ordem da página, porque a
  //  ordem É informação: quem cita começa pelo diploma, não pelo portal.
  empurra(
    seccao(
      "base_legal",
      fontes.map((f) => ({
        id: `base_legal.${f.id}`,
        texto: `${f.title}${f.article ? `, ${f.article}` : ""}`,
        fonte: {
          fonteId: f.id as never,
          autoridade: f.authority,
          titulo: f.title,
          artigo: f.article,
          url: f.url,
          verificadaEm: f.lastCheckedAt,
        },
        proveniencia: {
          origem: "fonte",
          fonteId: f.id as never,
          autoridade: f.authority,
          verificadaEm: f.lastCheckedAt,
        },
      })),
    ),
  );

  // ── avisos ───────────────────────────────────────────────────────────
  const avisos = CONTEUDO_EXPANSAO[slug]?.avisos ?? [];
  empurra(
    seccao(
      "avisos",
      avisos.map((texto, i) => ({
        id: `avisos.${i}`,
        texto,
        proveniencia: { origem: "pacote", guia: slug, verificadoEm: DATA_EXPANSAO },
      })),
    ),
  );

  return {
    guia,
    fixado: {
      revistoEm: m.lastReviewedAt,
      aplicavelDe: m.effectiveFrom,
      aplicavelAte: m.effectiveTo,
      appVersion: APP_VERSION,
    },
    editorial,
    perguntas: perguntasDoGuia(a?.aplicaSe ?? [], a?.naoAplicaSe ?? []),
    elementos,
    seccoes,
    sinais: {
      afirmacoesPorRever: porRever.length,
      elementos: elementos.length,
      perguntas: (a?.aplicaSe.length ?? 0) + (a?.naoAplicaSe.length ?? 0),
      fontes: fontes.length,
    },
    relacionados: relacionadosDe(m),
  };
}

function relacionadosDe(m: GuideManifest): { slug: string; titulo: string }[] {
  return m.relatedGuideIds
    .map((id) => manifesto(id))
    .filter((x): x is GuideManifest => Boolean(x))
    .slice(0, 4)
    .map((x) => ({ slug: x.slug, titulo: x.title }));
}

/**
 * O que mudou no guia desde que o dossiê foi composto.
 *
 * Calculado na LEITURA e não na composição: no instante em que o dossiê
 * nasce, a resposta é sempre «nada». É três semanas depois que a pergunta
 * tem valor — e é aí que a consola a faz.
 */
export function alteracoesDesde(slug: string, revistoEm: string): ItemDossie[] {
  return historicoDoGuia(slug)
    .filter((h) => h.data > revistoEm)
    .map((h, i) => ({
      id: `historico.${i}`,
      texto: h.descricao,
      data: h.data,
      tipo: h.tipo,
      proveniencia: { origem: "manifesto", slug } satisfies Proveniencia,
    }));
}
