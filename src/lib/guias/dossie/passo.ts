// ═══════════════════════════════════════════════════════════════════════
//  O PASSO SEGUINTE DE UM GUIA — uma ação principal, e o motivo à vista
//  ---------------------------------------------------------------------
//  Três achados da auditoria convergem aqui:
//
//   A2 — 29 dos 57 guias estáticos declaravam `FIND_ACCOUNTANT` e
//        encaminhavam esse intent para a FIZ, com o rótulo «Falar com um
//        contabilista certificado» a apontar para um link de afiliado.
//        Mandavam para fora exatamente a intenção que a casa serve, e
//        serve de graça.
//   A3 — 112 dos 169 guias não tinham passo seguinte NENHUM.
//   A4 — `escolherRota()` nunca era chamado num Guia. Quem escolhia a rota
//        era a página: FIZ, sempre que houvesse `fizAction`.
//
//  A REGRA DE COMPOSIÇÃO, e o que a distingue de «mais um botão»
//  ---------------------------------------------------------------------
//  `escolherRota()` decide a HIERARQUIA — quem vem primeiro. Não decide a
//  EXISTÊNCIA do dossiê: o dossiê existe sempre que o guia tem matéria
//  para projetar, porque não depende de capacidade acordada com parceiro
//  nenhum. É nosso, é gratuito, e é isso que o separa da FIZ.
//
//  A única coisa que o faz desaparecer é a guarda de confiança do
//  `routing.ts` — resultado fora de escopo ou página sem resposta. Aí não
//  abre rota nenhuma, e continua a não abrir.
// ═══════════════════════════════════════════════════════════════════════

import { escolherRota, type Encaminhamento, type MotivoRota } from "@/lib/routing";
import type { Archetype, Categoria, GuideStatus } from "@/lib/guias/manifests";

export type DestinoDoGuia = "contabilista" | "fiz" | "nenhum";

export interface SinaisDoGuia {
  categoria: Categoria;
  arquetipo: Archetype;
  estado: GuideStatus;
  /** Afirmações do guia marcadas `review_required`. */
  afirmacoesPorRever: number;
  /** O guia declara uma capacidade da FIZ para esta intenção? */
  temAcaoFiz: boolean;
  /** O guia tem matéria projetável (checklist, critérios, fontes)? */
  temMateria: boolean;
  temContabilistaVinculado?: boolean;
  /** Progresso da checklist, 0..1. Sinal de intenção, não de valor. */
  preparacao?: number;
}

export interface PassoDoGuia {
  encaminhamento: Encaminhamento;
  principal: DestinoDoGuia;
  /** Em texto, nunca em botão do mesmo peso. */
  secundario: DestinoDoGuia;
  /** O motivo, em pt-PT, como o §13.2 da estratégia exige. */
  motivo: string;
}

/**
 * O enquadramento que a página do guia consegue afirmar.
 *
 * É o público do guia, e não um palpite sobre quem está a ler: um guia de
 * «Empresas» trata de uma sociedade, e uma sociedade é, por definição do
 * `routing.ts`, um caso que exige julgamento profissional.
 *
 * `Transversal` fica `undefined` de propósito — não sabemos, e inventar um
 * enquadramento para conseguir uma rota é exatamente o que a hierarquia de
 * confiança existe para impedir.
 */
const ENQUADRAMENTO_POR_CATEGORIA: Record<Categoria, "independente" | "sociedade" | "dependente" | undefined> = {
  Independentes: "independente",
  Empresas: "sociedade",
  "Conta de outrem": "dependente",
  Transversal: undefined,
};

/** A frase que explica a escolha. Nunca vazia, nunca jargão interno. */
function motivoLegivel(m: MotivoRota, s: SinaisDoGuia): string {
  switch (m) {
    case "caso_exige_profissional":
      if (s.afirmacoesPorRever > 0) {
        return s.afirmacoesPorRever === 1
          ? "Este guia tem 1 ponto que depende do caso concreto e exige revisão especializada."
          : `Este guia tem ${s.afirmacoesPorRever} pontos que dependem do caso concreto e exigem revisão especializada.`;
      }
      return "Este assunto envolve uma sociedade — é matéria de contabilista certificado.";
    case "contabilista_vinculado":
      return "Já tens um contabilista ligado. Levar-lhe este caso não custa nada.";
    case "execucao_no_escopo":
      return "Aqui o trabalho é executar, e a FIZ faz esse trabalho.";
    case "utilizador_recorrente":
      return "Podes levar este caso a um contabilista quando quiseres.";
    case "confianca_insuficiente":
      return "Este guia ainda não sustenta uma recomendação. Revê as fontes.";
    case "pergunta_informativa":
      return "Este guia é informativo — não há aqui nada a decidir.";
    case "sem_sinal_suficiente":
    default:
      return "Podes levar este caso a um contabilista, com tudo o que já leste em cima.";
  }
}

export function passoDoGuia(s: SinaisDoGuia): PassoDoGuia {
  const encaminhamento = escolherRota({
    // Um guia RESPONDE — é essa a sua razão de existir, e a resposta curta
    // é verificada no build. O que varia é a confiança editorial: um guia
    // com revisão fiscal pendente é uma estimativa, não uma certeza.
    confianca: s.estado === "published" ? "completo" : "estimado",
    temResultado: s.temMateria,
    // `Transversal` não diz quem está a ler — e por isso a tabela devolve
    // `undefined`. Mas um guia que DECLARA uma capacidade da FIZ está a
    // dizer outra coisa: que aquela matéria é executável no escopo dela, e
    // que isso foi acordado (é o que `requiredCapability` significa). É
    // exatamente o sinal a que `escolherRota()` chama «execução no
    // escopo», e é mais forte do que o público editorial do guia.
    enquadramento:
      ENQUADRAMENTO_POR_CATEGORIA[s.categoria] ?? (s.temAcaoFiz ? "independente" : undefined),
    temContabilistaVinculado: s.temContabilistaVinculado,
    arquetipoDoGuia: s.arquetipo,
    afirmacoesPorRever: s.afirmacoesPorRever,
    preparacao: s.preparacao,
  });

  const motivo = motivoLegivel(encaminhamento.motivo, s);

  // A guarda de confiança mantém-se: sem resposta, nenhuma das duas.
  if (
    encaminhamento.motivo === "confianca_insuficiente" ||
    encaminhamento.motivo === "pergunta_informativa"
  ) {
    return { encaminhamento, principal: "nenhum", secundario: "nenhum", motivo };
  }

  if (encaminhamento.rota === "fiz" && s.temAcaoFiz) {
    return { encaminhamento, principal: "fiz", secundario: "contabilista", motivo };
  }

  // Tudo o resto — `contabilista`, `plus`, `sem_parceiro` por falta de
  // sinal, ou `fiz` num guia que não declara capacidade nenhuma — resolve
  // no destino que não depende de parceiro. A FIZ só entra em segunda
  // linha quando existe mesmo uma capacidade acordada para este guia:
  // oferecê-la sem isso seria prometer um destino que não existe, que é a
  // razão pela qual `derivar.ts` não inventou ações para os 112.
  return {
    encaminhamento,
    principal: "contabilista",
    secundario: s.temAcaoFiz ? "fiz" : "nenhum",
    motivo,
  };
}
