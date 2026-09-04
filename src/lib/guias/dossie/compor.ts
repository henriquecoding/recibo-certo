// ═══════════════════════════════════════════════════════════════════════
//  A COMPOSIÇÃO — projeção + o que a pessoa respondeu = dossiê
//  ---------------------------------------------------------------------
//  Puro e sem catálogos: corre no browser, na folha de composição, e é o
//  último sítio onde alguém pode mudar o que segue.
//
//  DUAS REGRAS QUE IMPEDEM A DEGRADAÇÃO SILENCIOSA (§4.3)
//
//   1. NADA É REESCRITO. O `texto` de um item é a string publicada. Sem
//      resumos, sem paráfrases, sem geração. O único texto que nasce aqui
//      é aritmética sobre o que a pessoa respondeu — «4 elementos por
//      reunir» — e isso é contagem, não conteúdo.
//
//   2. NADA É INVENTADO POR AUSÊNCIA. Um guia sem avisos não gera secção
//      `avisos` vazia: gera dossiê sem essa secção.
//
//  E a regra do §10.2, que é a diferença entre minimização real e teatro:
//  **uma secção não consentida não é composta.** Não é escondida na
//  leitura, não é filtrada na apresentação — não existe no objeto.
// ═══════════════════════════════════════════════════════════════════════

import { CONSENTIMENTO_VERSAO } from "@/lib/contabilistas/vinculo";
import type { Bagagem } from "@/lib/contabilistas/bagagem";
import { sanitizarTexto } from "@/lib/feedback-sanitize";
import { comRespostas, type RespostasDeGuia } from "./perguntas";
import { sanitizarSeccao } from "./fronteira";
import { impressaoDe } from "./impressao";
import {
  ORDEM_SECCOES, SECCOES_MINIMAS, TITULO_SECCAO,
  type DossieDeGuia, type EstadoElemento, type IdSeccao, type ItemDossie,
  type ProjecaoDeGuia, type SeccaoDossie,
} from "./tipos";

/**
 * Quanto tempo dura o consentimento desta passagem.
 *
 * Trinta dias é o prazo do §10.3, e é o mesmo para os três destinos ainda
 * que só o D3 o use para cortar o acesso: o registo de consentimento tem
 * de dizer «até quando», mesmo quando quem governa a validade é o vínculo
 * ou o caso. É o campo que a ISO/IEC TS 27560 exige e que
 * `partilhas.consentimento_versao` sozinho não dava.
 */
export const DIAS_DE_CONSENTIMENTO = 30;

/** O tamanho máximo da nota da pessoa. Curta, de propósito. */
export const NOTA_MAX = 600;

export interface RespostasDoDossie {
  /** Indexadas por `PerguntaDeGuia.id`. */
  respostas: RespostasDeGuia;
  /** Estado por elemento, indexado pela posição na checklist publicada. */
  elementos: Record<number, EstadoElemento>;
  /** O que a pessoa escreveu. Sanitizada e limitada antes de entrar. */
  nota?: string;
  /** As secções que ela deixou seguir. */
  incluidas: readonly IdSeccao[];
  /** A bagagem do dispositivo, quando `simulacao` foi consentida. */
  simulacao?: Bagagem | null;
}

/** O estado inicial: tudo em «não sei», tudo por marcar, nada escrito. */
export function respostasIniciais(p: ProjecaoDeGuia): RespostasDoDossie {
  return {
    respostas: {},
    elementos: {},
    nota: "",
    // As secções que o guia tem, menos a simulação — que é a única com
    // valores fiscais e nasce DESLIGADA, com um passo explícito (§14.4).
    incluidas: p.seccoes.map((s) => s.id),
  };
}

// ─── A composição ──────────────────────────────────────────────────────

export async function comporDossie(
  projecao: ProjecaoDeGuia,
  r: RespostasDoDossie,
  agora: Date = new Date(),
): Promise<DossieDeGuia> {
  const incluidas = new Set<IdSeccao>(r.incluidas);
  // As duas secções mínimas seguem sempre: sem `resumo` o destinatário não
  // sabe de que caso se trata, e sem `base_legal` o dossiê passa a ser
  // opinião. Desligá-las não é minimizar — é tornar o dossiê inútil.
  for (const obrigatoria of SECCOES_MINIMAS) incluidas.add(obrigatoria);

  const nota = limparNota(r.nota);
  const perguntas = comRespostas(projecao.perguntas, r.respostas);
  const porResponder = perguntas.filter((p) => p.resposta === "nao_sei").length;
  const porReunir = projecao.elementos.filter(
    (_, i) => (r.elementos[i] ?? "nao_sei") === "por_reunir",
  ).length;
  const julgamento = projecao.seccoes.find((s) => s.id === "julgamento")?.itens.length ?? 0;

  const compostas: SeccaoDossie[] = [];

  for (const id of ORDEM_SECCOES) {
    if (!incluidas.has(id)) continue;

    if (id === "resumo") {
      const base = projecao.seccoes.find((s) => s.id === "resumo");
      if (!base) continue;
      const itens: ItemDossie[] = [];
      // SITUAÇÃO vem primeiro porque é o que a pessoa quer dizer, e o
      // resto é enquadramento. É a ordem do SBAR e a ordem por que
      // qualquer pessoa conta um problema.
      if (nota) {
        itens.push({
          id: "resumo.situacao",
          texto: nota,
          proveniencia: { origem: "pessoa", campo: "nota" },
        });
      }
      itens.push(...base.itens);
      itens.push({
        id: "resumo.falta",
        texto: oQueFalta({ porReunir, porResponder, julgamento }),
        proveniencia: { origem: "pessoa", campo: "resposta" },
      });
      compostas.push({ id, titulo: TITULO_SECCAO[id], itens, incluida: true });
      continue;
    }

    if (id === "aplicabilidade") {
      if (perguntas.length === 0) continue;
      compostas.push({
        id,
        titulo: TITULO_SECCAO[id],
        // «Não sei» primeiro: é por aí que a consulta começa, e pô-lo no
        // fim seria enterrar a informação mais útil do dossiê.
        itens: [...perguntas]
          .sort((a, b) => Number(b.resposta === "nao_sei") - Number(a.resposta === "nao_sei"))
          .map((p) => ({
            id: p.id,
            texto: p.texto,
            sentido: p.sentido,
            // O TEXTO é do guia; a RESPOSTA é da pessoa e viaja no campo
            // `resposta`. Marcar o item inteiro como «pessoa» apagaria a
            // origem editorial do critério, e o profissional deixaria de
            // saber que a pergunta foi escrita por quem redigiu o guia.
            resposta: p.resposta,
            proveniencia: projecao.editorial,
          })),
        incluida: true,
      });
      continue;
    }

    if (id === "elementos") {
      const base = projecao.seccoes.find((s) => s.id === "elementos");
      if (!base) continue;
      compostas.push({
        id,
        titulo: TITULO_SECCAO[id],
        itens: base.itens.map((item, i) => ({
          ...item,
          estado: r.elementos[i] ?? "nao_sei",
        })),
        incluida: true,
      });
      continue;
    }

    if (id === "simulacao") {
      const itens = itensDaSimulacao(r.simulacao ?? null);
      if (itens.length === 0) continue;
      compostas.push({ id, titulo: TITULO_SECCAO[id], itens, incluida: true });
      continue;
    }

    // `historico` nunca é composto: é o que mudou DESDE a composição, e
    // nesse instante é vazio por definição. Calcula-se na leitura.
    if (id === "historico") continue;

    const base = projecao.seccoes.find((s) => s.id === id);
    if (base) compostas.push({ ...base, incluida: true });
  }

  const seccoes = compostas.map(sanitizarSeccao);

  const impressao = await impressaoDe({
    slug: projecao.guia.slug,
    revistoEm: projecao.fixado.revistoEm,
    appVersion: projecao.fixado.appVersion,
    seccoes,
    nota: nota || undefined,
  });

  const expira = new Date(agora.getTime() + DIAS_DE_CONSENTIMENTO * 24 * 3600 * 1000);

  return {
    versao: 1,
    guia: projecao.guia,
    fixado: {
      revistoEm: projecao.fixado.revistoEm,
      aplicavelDe: projecao.fixado.aplicavelDe,
      aplicavelAte: projecao.fixado.aplicavelAte,
      appVersion: projecao.fixado.appVersion,
      compostoEm: agora.toISOString(),
      impressao,
    },
    seccoes,
    nota: nota || undefined,
    consentimento: {
      versao: CONSENTIMENTO_VERSAO,
      seccoes: seccoes.map((s) => s.id),
      em: agora.toISOString(),
      expiraEm: expira.toISOString(),
    },
  };
}

// ─── Peças ─────────────────────────────────────────────────────────────

/**
 * A quarta linha do «caso em dez linhas».
 *
 * É contagem, não conteúdo: diz ao profissional onde o caso está em vez de
 * o obrigar a percorrer as secções para descobrir. Quando não falta nada,
 * diz isso — em vez de desaparecer e deixar a dúvida.
 */
export function oQueFalta(n: { porReunir: number; porResponder: number; julgamento: number }): string {
  const partes: string[] = [];
  if (n.porReunir > 0) partes.push(`${n.porReunir} ${n.porReunir === 1 ? "elemento por reunir" : "elementos por reunir"}`);
  if (n.porResponder > 0) partes.push(`${n.porResponder} ${n.porResponder === 1 ? "pergunta" : "perguntas"} em «não sei»`);
  if (n.julgamento > 0) partes.push(`${n.julgamento} ${n.julgamento === 1 ? "ponto que exige" : "pontos que exigem"} julgamento profissional`);
  return partes.length === 0 ? "Sem pendências assinaladas." : partes.join(" · ");
}

/** A nota da pessoa, sanitizada e curta. Nunca `undefined` por acidente. */
export function limparNota(bruta: string | undefined): string {
  if (!bruta) return "";
  return sanitizarTexto(bruta).slice(0, NOTA_MAX).trim();
}

/**
 * A bagagem, já sanitizada na origem, virada em itens.
 *
 * Não se volta a filtrar aqui: `guardarBagagem()` aplica
 * `sanitizarConteudoPartilha()` ANTES de escrever no disco, e duplicar a
 * lista branca era criar duas listas para divergirem.
 */
export function itensDaSimulacao(bagagem: Bagagem | null): ItemDossie[] {
  if (!bagagem) return [];
  return Object.entries(bagagem.conteudo).map(([chave, valor], i) => ({
    id: `simulacao.${i}`,
    texto: `${humanizar(chave)}: ${formatar(valor)}`,
    proveniencia: { origem: "pessoa", campo: "simulacao" as const },
  }));
}

function humanizar(chave: string): string {
  const s = chave.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatar(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(v);
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return `${v.length} ${v.length === 1 ? "item" : "itens"}`;
  return "—";
}
