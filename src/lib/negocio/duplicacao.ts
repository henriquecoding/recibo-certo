// ═══════════════════════════════════════════════════════════════════════
//  DUPLA CONTAGEM — o defeito que ninguém vê no ecrã
//  ---------------------------------------------------------------------
//  A pricing engine aceita custos FIXOS por oferta (`custos.fixos`), e o
//  modelo de negócio precisa de custos de ESTRUTURA. São as duas coisas
//  certas: 150 €/mês de contabilidade repartidos por uma oferta dão-lhe o
//  preço mínimo correto, e 150 €/mês de contabilidade na estrutura dão o
//  break-even correto do negócio.
//
//  O problema é tê-los nos dois sítios. Aí o resultado operacional fica
//  150 € abaixo da verdade todos os meses, e não há nada no ecrã que o
//  explique: os dois números estão certos onde estão.
//
//  ── A REGRA §8 DO RELATÓRIO ────────────────────────────────────────
//  «Nunca corrigir silenciosamente.» Este módulo DETETA e PROPÕE; quem
//  decide é a pessoa, com as três saídas à vista:
//
//      [Mover para a empresa]  [Manter só nesta oferta]  [Cancelar]
//
//  Corrigir sozinhos seria mexer num número que a pessoa introduziu à
//  mão, e ela reencontrá-lo-ia diferente sem saber porquê.
// ═══════════════════════════════════════════════════════════════════════

import { cent, num } from "@/lib/pricing/numeros";
import type {
  ContextoNegocio,
  CustoEstrutura,
  DuplicacaoCusto,
  OfertaNegocio,
} from "./tipos";

/**
 * Normaliza um rótulo para comparação: minúsculas, sem acentos, sem
 * pontuação e sem as palavras de ligação que só servem para escrever.
 *
 * «Contabilidade» e «contabilidade (avença)» são a mesma despesa escrita
 * por duas pessoas diferentes — ou pela mesma pessoa em dois dias.
 */
export function normalizarRotulo(rotulo: string): string {
  return rotulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((p) => p.length > 2 && !LIGACOES.has(p))
    .sort()
    .join(" ")
    .trim();
}

const LIGACOES = new Set([
  "com", "sem", "por", "para", "dos", "das", "mes", "mensal", "anual",
  "the", "and", "que", "uma", "uns", "umas", "meu", "minha", "nos", "nas",
]);

/**
 * Sinónimos que valem por identidade. Curta de propósito: uma lista longa
 * começa a fundir despesas diferentes, e um falso positivo aqui manda a
 * pessoa apagar um custo real.
 */
const FAMILIAS: readonly (readonly string[])[] = [
  ["contabilidade", "contabilista", "toc", "cc", "avenca"],
  ["software", "assinaturas", "subscricoes", "licencas", "saas"],
  ["sede", "escritorio", "coworking", "renda", "espaco"],
  ["seguro", "seguros", "responsabilidade"],
  ["marketing", "publicidade", "anuncios", "ads"],
  ["telecomunicacoes", "internet", "telemovel", "telefone"],
];

const familiaDe = (chave: string): string | null => {
  const palavras = chave.split(" ");
  for (const familia of FAMILIAS) {
    if (palavras.some((p) => familia.includes(p))) return familia[0];
  }
  return null;
};

/** Duas despesas são «a mesma» se partilham chave normalizada ou família. */
export function mesmaDespesa(a: string, b: string): boolean {
  const ca = normalizarRotulo(a);
  const cb = normalizarRotulo(b);
  if (!ca || !cb) return false;
  if (ca === cb) return true;
  const fa = familiaDe(ca);
  const fb = familiaDe(cb);
  return fa !== null && fa === fb;
}

/**
 * Todas as duplicações entre os custos fixos das ofertas e o overhead da
 * estrutura.
 *
 * Pura e sem efeitos: devolve o diagnóstico, nunca altera o contexto.
 */
export function detetarDuplicacoes(contexto: ContextoNegocio): DuplicacaoCusto[] {
  const estrutura = contexto.estrutura?.overheadMensal ?? [];
  if (estrutura.length === 0) return [];

  const encontradas: DuplicacaoCusto[] = [];

  for (const oferta of contexto.ofertas) {
    // Um custo marcado como «só desta oferta» é uma decisão já tomada: a
    // pessoa disse que quer os dois, e voltar a perguntar é ruído.
    for (const fixo of oferta.pricing.custos?.fixos ?? []) {
      if (num(fixo.mensal) <= 0) continue;
      for (const custo of estrutura) {
        if (custo.escopo === "oferta") continue;
        if (num(custo.mensal) <= 0) continue;
        if (!mesmaDespesa(fixo.rotulo, custo.rotulo)) continue;

        encontradas.push({
          chave: normalizarRotulo(custo.rotulo),
          rotuloOferta: fixo.rotulo,
          rotuloEstrutura: custo.rotulo,
          ofertaId: oferta.id,
          ofertaNome: oferta.nome,
          custoEstruturaId: custo.id,
          // O menor dos dois, por prudência: dizer que se conta a dobrar
          // o maior valor exagera o problema num sítio onde exagerar
          // custa credibilidade.
          valorDuplicado: cent(Math.min(num(fixo.mensal), num(custo.mensal))),
          mensagem: `Já tens «${fixo.rotulo}» dentro do preço de ${oferta.nome} e «${custo.rotulo}» nos custos da estrutura. Assim, ${fmt(
            Math.min(num(fixo.mensal), num(custo.mensal)),
          )} por mês estão a ser contados duas vezes.`,
        });
      }
    }
  }

  return encontradas;
}

/**
 * Resolve uma duplicação movendo a despesa para a estrutura: tira-a do
 * `ContextoPreco` da oferta e deixa-a só no overhead.
 *
 * Devolve um contexto NOVO — nada é mutado, para que a interface possa
 * oferecer «cancelar» sem ter de desfazer nada.
 */
export function moverParaEstrutura(
  contexto: ContextoNegocio,
  duplicacao: DuplicacaoCusto,
): ContextoNegocio {
  return {
    ...contexto,
    ofertas: contexto.ofertas.map((o) =>
      o.id !== duplicacao.ofertaId
        ? o
        : ({
            ...o,
            pricing: {
              ...o.pricing,
              custos: {
                ...o.pricing.custos,
                fixos: (o.pricing.custos.fixos ?? []).filter(
                  (f) => f.rotulo !== duplicacao.rotuloOferta,
                ),
              },
            },
          } satisfies OfertaNegocio),
    ),
    meta: { ...contexto.meta, atualizadoEm: new Date().toISOString() },
  };
}

/**
 * Resolve mantendo a despesa só na oferta: marca o custo de estrutura
 * como sendo daquela oferta, para não voltar a perguntar nem a somar.
 */
export function manterNaOferta(
  contexto: ContextoNegocio,
  duplicacao: DuplicacaoCusto,
): ContextoNegocio {
  return {
    ...contexto,
    estrutura: {
      ...contexto.estrutura,
      overheadMensal: contexto.estrutura.overheadMensal.map((c) =>
        c.id !== duplicacao.custoEstruturaId ? c : ({ ...c, escopo: "oferta" } satisfies CustoEstrutura),
      ),
    },
    meta: { ...contexto.meta, atualizadoEm: new Date().toISOString() },
  };
}

const fmt = (n: number): string => `${cent(n).toFixed(2).replace(".", ",")} €`;
