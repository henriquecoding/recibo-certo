// ═══════════════════════════════════════════════════════════════════════
//  NEGÓCIO → MOTOR DE EMPRESA
//  ---------------------------------------------------------------------
//  Este ficheiro NÃO calcula IRC. Não calcula derrama, nem tributação
//  autónoma, nem dividendos, nem Segurança Social do gerente. Tudo isso
//  vive em `fiscal-empresa.ts` e continua a viver lá.
//
//  O que este ficheiro faz é responder a UMA pergunta com rigor:
//
//      «Que número é que eu ponho em `faturacao` e em `despesasOper`?»
//
//  ── AS DUAS MANEIRAS DE ERRAR ──────────────────────────────────────
//
//  ① Pôr `receitaCliente` em `faturacao`.
//     O motor espera volume de negócios, que é SEM IVA. Com IVA a 23%,
//     a faturação sai 23% acima da real, o lucro tributável também, e o
//     IRC de uma PME sobe com ele. O erro não dá nenhum sinal: 61 800 €
//     e 76 014 € são ambos números plausíveis para uma empresa nova.
//
//  ② Pôr os encargos de trabalhador independente em `despesasOper`.
//     A Segurança Social e o IRS que a pricing engine embutiu no preço
//     são de uma PESSOA em recibos verdes. Uma sociedade não os paga —
//     paga IRC, e depois TSU sobre o salário do gerente, que o motor já
//     calcula. Metê-los aqui daria à sociedade uma despesa inventada e
//     baixaria o IRC com ela.
//
//  `agregar.ts` já separou as duas coisas. Este adapter só tem de não as
//  voltar a juntar.
// ═══════════════════════════════════════════════════════════════════════

import type { OpcoesEmpresaGuiado } from "@/lib/fiscal-empresa";
import { cent } from "@/lib/pricing/numeros";
import type { ContextoNegocio, ResultadoNegocio } from "../tipos";

export interface EntradaEmpresa {
  /** Volume de negócios anual, SEM IVA. */
  faturacao: number;
  /** Custos operacionais anuais, sem impostos sobre o rendimento. */
  despesasOper: number;
  /** O que a interface deve mostrar como origem de cada número. */
  proveniencia: { rotulo: string; valor: number; origem: string }[];
}

/**
 * Os campos do motor de empresa que o negócio consegue preencher.
 *
 * Deliberadamente PARCIAL: salário do gerente, dividendos, viatura, RFAI,
 * SIFIDE, imóvel e localização não saem do modelo comercial — são
 * decisões da fase seguinte, e inventá-las aqui daria ao ecrã seguinte
 * números que ninguém escolheu.
 */
export function paraEmpresa(negocio: ResultadoNegocio): Partial<OpcoesEmpresaGuiado> {
  return {
    faturacao: negocio.receitaSemIVAAno,
    despesasOper: negocio.custosOperacionaisAno,
  };
}

/** A mesma conversão, com a proveniência para a interface mostrar. */
export function entradaEmpresa(negocio: ResultadoNegocio): EntradaEmpresa {
  return {
    faturacao: negocio.receitaSemIVAAno,
    despesasOper: negocio.custosOperacionaisAno,
    proveniencia: [
      {
        rotulo: "Volume de negócios (sem IVA)",
        valor: negocio.receitaSemIVAAno,
        origem: `${negocio.ofertas.length} ${
          negocio.ofertas.length === 1 ? "oferta" : "ofertas"
        } × volume esperado × 12 meses`,
      },
      {
        rotulo: "IVA liquidado",
        valor: cent(negocio.ivaCobradoMes * 12),
        origem: "Fora da faturação — é do Estado, não da empresa",
      },
      {
        rotulo: "Custos operacionais",
        valor: negocio.custosOperacionaisAno,
        origem: "Custos variáveis das ofertas + estrutura + trabalhadores",
      },
      {
        rotulo: "Resultado antes de impostos",
        valor: negocio.resultadoOperacionalAno,
        origem: "O que o motor de empresa vai tributar",
      },
    ],
  };
}

/**
 * Sinal de que faz sentido sequer abrir a fase de sociedade.
 *
 * Não é um conselho — é uma pergunta bem colocada. Recomendar abrir
 * sociedade só porque deu mais líquido é uma das coisas que o §35 do
 * relatório proíbe: há custos de estrutura, obrigações e irreversibilidade
 * que um número não captura.
 */
export function sociedadeValeAPena(negocio: ResultadoNegocio, contexto: ContextoNegocio): boolean {
  if (contexto.fiscal.enquadramento === "sociedade") return true;
  if (contexto.fiscal.enquadramento === "independente") return contexto.fiscal.compararAlternativas;
  // Abaixo de um resultado que não paga a estrutura de uma sociedade, a
  // comparação é teórica. O valor não é uma taxa nem uma regra: é o
  // limiar a partir do qual a pergunta deixa de ser académica.
  return negocio.resultadoOperacionalAno > 0;
}
