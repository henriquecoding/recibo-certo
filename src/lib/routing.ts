// ═══════════════════════════════════════════════════════════════════════
//  ROUTING COMERCIAL — uma rota de cada vez, e sempre com motivo
//  ---------------------------------------------------------------------
//  §7.3 do relatório, com as fronteiras do §13. Quatro rotas, mutuamente
//  exclusivas — o §12.3 é explícito: «o routing deve ser mutuamente
//  exclusivo para evitar dupla contagem».
//
//  A ordem de avaliação não é arbitrária; é a hierarquia de confiança:
//
//   1. SEM PARCEIRO ganha sempre. Se o resultado tem baixa confiança ou a
//      pergunta é informativa, nenhuma rota comercial abre. Monetizar uma
//      dúvida mal resolvida é exatamente a «ansiedade» que o §12.1 proíbe
//      monetizar.
//   2. O CONTABILISTA DA PRÓPRIA PESSOA, quando existe vínculo ativo. Não é
//      uma lead: é alguém que ela escolheu, e a quem pode enviar o resultado
//      sem pagar nada.
//   3. CONTABILISTA vem antes da FIZ. Um caso que exige julgamento
//      profissional — Lda, contabilidade organizada, multi-jurisdição,
//      herança — não se resolve com execução de faturação, e mandá-lo para
//      a FIZ seria empurrar alguém para a ferramenta errada porque a
//      ferramenta errada é a que já está integrada.
//   4. FIZ para execução dentro do escopo.
//   5. PLUS para quem quer memória e planeamento.
//
//  Cada decisão devolve um `motivo` legível. É o mesmo código que o §8.1
//  manda enviar em `fiz_click.reason`, e o mesmo que o §13.2 exige que
//  seja visível («reason code visível»). O utilizador tem direito a saber
//  porque é que lhe estamos a sugerir aquilo.
// ═══════════════════════════════════════════════════════════════════════

import type { EstadoConfianca, Rota } from "@/lib/analytics/eventos";

export type MotivoRota =
  | "confianca_insuficiente"
  | "pergunta_informativa"
  | "contabilista_vinculado"
  | "caso_exige_profissional"
  | "execucao_no_escopo"
  | "utilizador_recorrente"
  | "sem_sinal_suficiente";

export interface SinaisDoUtilizador {
  /** Confiança do resultado que a pessoa acabou de ver. */
  confianca: EstadoConfianca;
  /** Houve mesmo um resultado, ou isto é uma página informativa? */
  temResultado: boolean;
  /** Enquadramento apurado pelo simulador. */
  enquadramento?: "independente" | "eni" | "sociedade" | "dependente" | "desconhecido";
  /** Sinais que empurram para julgamento profissional. */
  contabilidadeOrganizada?: boolean;
  multiJurisdicao?: boolean;
  heranca?: boolean;
  /** O utilizador marcou o caso como complexo, ou o motor detetou-o. */
  casoComplexo?: boolean;
  /** Tem histórico connosco — decisões anteriores guardadas. */
  decisoesAnteriores?: number;
  /** Já é subscritor. */
  ehPlus?: boolean;
  /**
   * A pessoa já tem um contabilista ligado na plataforma, com vínculo ativo.
   *
   * Não é o mesmo que «o caso exige um profissional»: aqui há alguém que ela
   * própria escolheu, e para quem pode enviar o resultado sem custo nenhum.
   */
  temContabilistaVinculado?: boolean;
}

export interface Encaminhamento {
  rota: Rota;
  motivo: MotivoRota;
  /** A frase mostrada ao utilizador, em pt-PT. */
  mensagem: string;
  /** Que dados podem seguir nesta rota — e nunca mais do que isto. */
  dados: string;
  /**
   * `true` quando a rota exige consentimento específico antes de qualquer
   * partilha. Só a rota de contabilista o exige: a FIZ é um deep link que
   * a pessoa segue por vontade própria, e o Plus é uma compra.
   */
  exigeConsentimento: boolean;
}

const MENSAGENS: Record<Rota, Omit<Encaminhamento, "rota" | "motivo">> = {
  fiz: {
    mensagem:
      "Já percebeu o cenário. Pode executar na FIZ — a passagem é gratuita e é uma parceria afiliada.",
    dados: "Contexto mínimo do cenário, por deep link. Nenhum dado pessoal segue sem ação sua.",
    exigeConsentimento: false,
  },
  contabilista: {
    mensagem:
      "Este caso beneficia de avaliação profissional. Escolha se quer ser contactado.",
    dados:
      "Formulário mínimo, com o destinatário identificado e os campos exatos à vista antes de enviar.",
    exigeConsentimento: true,
  },
  sem_parceiro: {
    mensagem:
      "Reveja as premissas e as fontes, ou procure apoio oficial. Não há aqui nada a vender.",
    dados: "Nenhuma partilha comercial.",
    exigeConsentimento: false,
  },
  plus: {
    mensagem:
      "Guarde, compare, exporte e acompanhe as próximas decisões.",
    dados: "Conta e pagamento. Não condiciona nem altera a passagem para a FIZ.",
    exigeConsentimento: false,
  },
};

/**
 * Escolhe a rota. Função pura: a mesma entrada dá sempre a mesma saída, o
 * que a torna testável e — mais importante — auditável quando alguém
 * perguntar porque é que viu determinada sugestão.
 */
export function escolherRota(s: SinaisDoUtilizador): Encaminhamento {
  const monta = (rota: Rota, motivo: MotivoRota): Encaminhamento => ({
    rota,
    motivo,
    ...MENSAGENS[rota],
  });

  // 1. Confiança primeiro. Um resultado fora de escopo não sustenta
  //    nenhuma recomendação comercial.
  if (s.confianca === "fora_de_escopo") {
    return monta("sem_parceiro", "confianca_insuficiente");
  }
  if (!s.temResultado) {
    return monta("sem_parceiro", "pergunta_informativa");
  }

  // 2. O contabilista da própria pessoa ganha à FIZ.
  //
  //    Entra DEPOIS das duas guardas de confiança, de propósito: ter
  //    contabilista não transforma um resultado fora de escopo em conselho
  //    bom, e mandar-lhe um cálculo que sabemos mau seria pior do que não
  //    mandar nada.
  //
  //    Entra ANTES da FIZ porque não é uma lead vendida — é alguém que a
  //    pessoa já escolheu, e enviar-lhe o resultado é gratuito (ver
  //    `PARTILHA_NUNCA_EXIGE_PLUS` em `contabilistas/vinculo.ts`).
  if (s.temContabilistaVinculado === true) {
    return monta("contabilista", "contabilista_vinculado");
  }

  // 3. Julgamento profissional. §13.2: «Apenas casos fora da rota FIZ ou
  //    com necessidade profissional clara.»
  const exigeProfissional =
    s.enquadramento === "sociedade" ||
    s.contabilidadeOrganizada === true ||
    s.multiJurisdicao === true ||
    s.heranca === true ||
    s.casoComplexo === true;
  if (exigeProfissional) {
    return monta("contabilista", "caso_exige_profissional");
  }

  // 4. Execução dentro do escopo da FIZ.
  const executaNaFiz = s.enquadramento === "independente" || s.enquadramento === "eni";
  if (executaNaFiz) {
    return monta("fiz", "execucao_no_escopo");
  }

  // 5. Memória e planeamento. Quem já paga não precisa que lho vendam
  //    outra vez — e continuar a mostrar-lhe o Plus é ruído, não oferta.
  if (!s.ehPlus && (s.decisoesAnteriores ?? 0) >= 2) {
    return monta("plus", "utilizador_recorrente");
  }

  return monta("sem_parceiro", "sem_sinal_suficiente");
}

// ─── §13.1 — a fronteira que nunca se atravessa ────────────────────────

/**
 * O que o Recibo Certo NUNCA pode comunicar. Não é uma nota de rodapé:
 * cada uma destas frases seria uma afirmação falsa sobre o estado fiscal
 * de alguém, e é essa a diferença entre uma simulação e uma submissão.
 *
 * Está em código para poder ser verificado por teste sobre a copy —
 * `parcerias:copy` já faz isso para os cartões da FIZ.
 */
export const NUNCA_COMUNICAR: readonly string[] = [
  "Que uma simulação foi submetida ou aceite oficialmente.",
  "Que o estado local equivale a confirmação da AT ou da Segurança Social.",
  "Que a FIZ está incluída no Plus, ou que é gratuita para além da passagem.",
];

/** A repartição de responsabilidades do §13.1, para a página pública. */
export const FRONTEIRA = {
  reciboCerto: "Compreende, calcula, compara, explica, guarda e prepara.",
  fiz: "Emite, fatura, declara e executa, no seu próprio serviço e contrato.",
  contabilista: "Resolve exceções de elevada complexidade ou com obrigação profissional.",
} as const;

// ─── §13.3 — política de afiliados adjacentes ──────────────────────────

export const POLITICA_AFILIADOS: readonly string[] = [
  "Só recomendar um produto que resolve uma tarefa imediatamente adjacente ao cenário: conta profissional, seguro pertinente ou software complementar.",
  "Separar a seleção editorial da negociação comercial, e documentar critério, alternativas e remuneração.",
  "Rotular antes do clique, usar rel=\"sponsored nofollow\" quando aplicável e medir a utilidade depois do clique.",
  "Remover o parceiro com queixas, fraca adequação, dados opacos ou incentivos que prejudiquem o utilizador.",
  "Limitar a concentração: nenhuma fonte comercial pode ameaçar a independência do motor ou do conteúdo.",
];

/**
 * §12.6 — o que não fazer. Lista curta, para ser lida antes de cada
 * decisão de monetização, e não depois de a ter tomado.
 */
export const MONETIZACAO_PROIBIDA: readonly string[] = [
  "Publicidade programática dentro de resultados, páginas de elevada ansiedade ou fluxos de dados pessoais.",
  "Vender a mesma lead a vários contabilistas, ou partilhar dados antes de consentimento específico.",
  "Ordenar parceiros pelo valor pago, sem rótulo e sem critérios de adequação.",
  "Criar cinco planos e extras antes de compreender a recorrência do único Plus.",
  "Lançar API com promessa de responsabilidade e SLA antes de versionamento, observabilidade, contratos e suporte.",
];
