// ═══════════════════════════════════════════════════════════════════════
//  RISCO — sete dimensões, avaliadas em separado
//  ---------------------------------------------------------------------
//  Uma etiqueta só — «moderado» — esconde que a mesma pessoa pode aceitar
//  volatilidade de receita e não aceitar nenhum risco regulatório. Aqui
//  cada dimensão tem o seu nível, a sua explicação e a sua comparação com
//  a tolerância declarada.
//
//  O nível NÃO se soma num número de risco. O que se faz com ele é
//  comparar com a tolerância, e é essa comparação que entra no score.
// ═══════════════════════════════════════════════════════════════════════

import { toleranciaDe, type DimensaoRisco, type OpportunityContext } from "../contexto/tipos";
import type { CandidatoBruto } from "./gerador";
import type { AvaliacaoProcura, AvaliacaoRegulatoria, RiscoAvaliado } from "./tipos";

const DIMENSOES: readonly DimensaoRisco[] = Object.freeze([
  "financeiro",
  "procura",
  "regulatorio",
  "operacional",
  "volatilidade",
  "dependencia-clientes",
  "sazonalidade",
  "concorrencia",
]);

export const ROTULO_RISCO: Readonly<Record<DimensaoRisco, string>> = Object.freeze({
  financeiro: "Risco financeiro",
  procura: "Risco de procura",
  regulatorio: "Risco regulatório",
  operacional: "Risco operacional",
  volatilidade: "Volatilidade da receita",
  "dependencia-clientes": "Dependência de poucos clientes",
  sazonalidade: "Sazonalidade",
  concorrencia: "Intensidade competitiva",
});

/**
 * A tolerância 0–4 traduzida no nível de risco 0–3 que ainda é aceitável.
 *
 * Muito conservador aceita 0; muito arrojado aceita 3. A tabela é
 * explícita em vez de aritmética para se poder ler e discutir.
 */
const NIVEL_ACEITAVEL: readonly (0 | 1 | 2 | 3)[] = [0, 1, 1, 2, 3];

export function avaliarRiscos(
  candidato: CandidatoBruto,
  contexto: OpportunityContext,
  regulacao: AvaliacaoRegulatoria,
  procura: AvaliacaoProcura,
): readonly RiscoAvaliado[] {
  const proprios = new Set<DimensaoRisco>([
    ...candidato.problema.riscosProprios,
    ...candidato.modelo.riscosProprios,
  ]);

  const nivelDe = (
    dimensao: DimensaoRisco,
  ): { nivel: 0 | 1 | 2 | 3; nota: string; apurado?: boolean } => {
    switch (dimensao) {
      case "regulatorio":
        return {
          nivel: regulacao.barreira,
          nota:
            regulacao.barreira === 0
              ? "Nenhum requisito regulatório identificado para esta composição."
              : `${regulacao.requisitos.length} ${regulacao.requisitos.length === 1 ? "requisito identificado" : "requisitos identificados"}${regulacao.temIncerteza ? ", e pelo menos um depende do caso concreto" : ""}.`,
        };

      case "sazonalidade":
        return {
          nivel: candidato.problema.sazonalidade,
          nota:
            candidato.problema.sazonalidade >= 2
              ? "A procura concentra-se em parte do ano, e a tesouraria tem de aguentar os meses vazios."
              : "Procura distribuída pelo ano, tanto quanto o problema deixa antever.",
        };

      case "financeiro": {
        const minimo = candidato.modelo.capitalTipico.min;
        const nivel = minimo >= 5000 ? 3 : minimo >= 2000 ? 2 : minimo >= 500 ? 1 : 0;
        return {
          nivel,
          nota:
            nivel >= 2
              ? "Exige capital antes de existir receita, e esse capital fica preso se o modelo não pegar."
              : "Arranca com pouco capital exposto.",
        };
      }

      case "procura":
        return {
          nivel: candidato.problema.procuraObservavel ? 1 : 3,
          nota: candidato.problema.procuraObservavel
            ? "Existe fonte pública que mede a intensidade deste problema, mesmo que não esteja ligada a esta composição."
            : "Nenhuma fonte pública mede a procura disto. Só falar com clientes responde — e é aí que a maioria descobre que não há.",
        };

      case "concorrencia":
        // ── DEIXOU DE SER CONSTANTE, E CONTINUA PRUDENTE ─────────────
        //  Este ramo devolvia sempre 2, com a nota prudente de que a
        //  concorrência real era desconhecida. A prudência estava certa
        //  — devolver 0 diria «não há concorrência», que é a leitura
        //  mais perigosa possível. O efeito era outro: a dimensão não
        //  separava candidato nenhum e, para quem declarava perfil muito
        //  conservador (nível aceitável = 0), marcava TODAS as hipóteses
        //  como fora de tolerância. Um terço dos candidatos apresentados
        //  arrastava uma objeção fatal por acumulação.
        //
        //  Com a densidade de operadores ligada, a maior parte das
        //  hipóteses já tem resposta. Quando não tem, o nível continua a
        //  ser 2 mas fica marcado como NÃO APURADO — e o que não foi
        //  apurado não conta para a tolerância. Assumir por prudência é
        //  legítimo; punir por uma suposição não é.
        switch (procura.leitura) {
          case "procura-com-muita-oferta":
            return {
              nivel: 3,
              apurado: true,
              nota: "A densidade de operadores desta zona está acima do normal do país. É um mercado servido: entrar exige uma diferença que se explique numa frase.",
            };
          case "procura-com-pouca-oferta":
            return {
              nivel: 1,
              apurado: true,
              nota: "A densidade de operadores desta zona está abaixo do normal do país, e há procura publicada. É o sinal competitivo mais favorável que dados oficiais conseguem dar.",
            };
          case "pouca-procura":
            return {
              nivel: 2,
              apurado: true,
              nota: "Pouca procura observada: a concorrência conta menos do que a existência do mercado.",
            };
          default:
            return {
              nivel: 2,
              apurado: false,
              nota: "Não há densidade de operadores apurada para esta hipótese. Assume-se moderada por prudência — e, por não estar apurada, não conta contra a tua tolerância.",
            };
        }

      case "dependencia-clientes":
        return {
          nivel: proprios.has("dependencia-clientes") ? 2 : 1,
          nota: proprios.has("dependencia-clientes")
            ? "O modelo tende a concentrar a receita em poucos clientes; perder um dói a sério."
            : "A receita reparte-se por mais clientes, o que reduz o impacto de perder um.",
        };

      case "operacional":
        return {
          nivel: candidato.modelo.precisaEquipa ? 3 : proprios.has("operacional") ? 2 : 1,
          nota: candidato.modelo.precisaEquipa
            ? "Depende de pessoas aparecerem — e a taxa de faltas é o que costuma matar operações com equipa."
            : "A execução depende sobretudo de ti, o que é mais previsível e menos escalável.",
        };

      case "volatilidade":
        return {
          nivel: candidato.modelo.padrao === "pontual" ? 3 : candidato.modelo.padrao === "recorrente" ? 1 : 2,
          nota:
            candidato.modelo.padrao === "pontual"
              ? "Receita por trabalho: cada mês recomeça do zero."
              : "Receita repetida, que dá visibilidade sobre o mês seguinte.",
        };
    }
  };

  return DIMENSOES.map((dimensao) => {
    const { nivel, nota, apurado = true } = nivelDe(dimensao);
    const aceitavel = NIVEL_ACEITAVEL[toleranciaDe(contexto, dimensao)]!;
    return { dimensao, nivel, nota, apurado, dentroDaTolerancia: nivel <= aceitavel };
  });
}

/**
 * Quantas dimensões APURADAS excedem a tolerância declarada.
 *
 * O filtro por `apurado` é o que impede uma suposição de custar pontos:
 * um nível assumido por prudência serve de aviso na ficha e não entra na
 * conta que baixa o score. A distinção é a mesma do resto do motor —
 * ausência de conhecimento não é uma afirmação sobre o negócio.
 */
export function riscosForaDaTolerancia(riscos: readonly RiscoAvaliado[]): number {
  return riscos.filter((item) => item.apurado && !item.dentroDaTolerancia).length;
}

/** Riscos assumidos por prudência, que a ficha mostra como aviso. */
export function riscosPorApurar(riscos: readonly RiscoAvaliado[]): readonly RiscoAvaliado[] {
  return riscos.filter((item) => !item.apurado);
}
