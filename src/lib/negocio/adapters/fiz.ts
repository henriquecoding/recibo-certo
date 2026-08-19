// ═══════════════════════════════════════════════════════════════════════
//  NEGÓCIO → FIZ (handoff mínimo)
//  ---------------------------------------------------------------------
//  A fronteira do §42 não se atravessa:
//
//      ReciboCerto  compreende · calcula · compara · prepara
//      FIZ          emite · fatura · declara · executa
//
//  O Business Studio melhora o CONTEXTO anterior à execução. Não passa a
//  emitir faturas, e não manda para a FIZ o modelo de negócio inteiro.
//
//  ── O QUE SEGUE, E PORQUÊ TÃO POUCO ────────────────────────────────
//  `FizPlanoAcao` já tem consentimento campo a campo e o servidor relê a
//  identidade — mas nada disso protege contra um adapter generoso. O que
//  sai daqui são os campos do resumo fiscal que a FIZ precisa para abrir
//  atividade, e mais nada:
//
//    · custos de fornecedor       NÃO — segredo comercial
//    · margens por oferta         NÃO — idem
//    · estrutura de preços        NÃO — idem
//    · nomes de ofertas           NÃO — não é preciso para executar
//    · volumes por oferta         NÃO — a projeção anual chega
//
//  Enviar o `ContextoNegocio` inteiro seria o §35 ao contrário: «não
//  enviar o modelo inteiro a parceiros».
// ═══════════════════════════════════════════════════════════════════════

import type { SimuladorId } from "@/content/fiz-simulator-routes";
import { cent } from "@/lib/pricing/numeros";
import type { ContextoNegocio, ResultadoNegocio } from "../tipos";

/** Espelha `ValoresSimulacao` de `FizPlanoAcao` — sem importar o componente. */
export interface ValoresFizNegocio {
  entityType?: string;
  activityCategory?: string;
  vatTerritory?: string;
  vatRegimeEstimate?: string;
  period?: "MONTHLY" | "QUARTERLY" | "ANNUAL" | "ONE_OFF";
  grossEstimate?: number;
  vatEstimate?: number;
  withholdingEstimate?: number;
  socialSecurityEstimate?: number;
  irsEstimate?: number;
}

/**
 * Qual superfície da FIZ serve este caso.
 *
 * Uma sociedade não vai para a rota de recibos verdes: os passos, os
 * documentos e o próprio serviço são outros, e mandar alguém para o sítio
 * errado porque é o que está integrado é o defeito que `routing.ts`
 * documenta na hierarquia.
 */
export function simuladorFizDe(contexto: ContextoNegocio): SimuladorId {
  return contexto.fiscal.enquadramento === "sociedade" ? "simulador-empresa" : "recibos-verdes";
}

export function paraFiz(negocio: ResultadoNegocio, contexto: ContextoNegocio): ValoresFizNegocio {
  const dominante = [...negocio.ofertas].sort((a, b) => b.peso - a.peso)[0];
  const vendedor = dominante?.oferta.pricing.vendedor;

  const valores: ValoresFizNegocio = {
    entityType: contexto.fiscal.enquadramento === "sociedade" ? "COMPANY" : "SELF_EMPLOYED",
    period: "ANNUAL",
    grossEstimate: negocio.receitaSemIVAAno,
  };

  if (vendedor?.atividadeLabel) valores.activityCategory = vendedor.atividadeLabel;
  if (vendedor?.regiao) valores.vatTerritory = vendedor.regiao;
  if (dominante?.preco.regimeIVA && dominante.preco.regimeIVA !== "nao_sei") {
    valores.vatRegimeEstimate = dominante.preco.regimeIVA;
  }

  // O IVA anual projetado é a soma do que se liquida nas ofertas — não o
  // que se ENTREGA (esse é líquido do dedutível, e o negócio não o
  // calcula por não ter o mapa de compras).
  if (negocio.ivaCobradoMes > 0) valores.vatEstimate = cent(negocio.ivaCobradoMes * 12);

  // Retenção e SS só existem quando há mesmo fiscalidade de TI aplicada.
  if (negocio.temFiscalidadeVendedor) {
    const ss = negocio.ofertas.reduce(
      (s, r) => s + (r.preco.fiscal.aplicavel ? r.preco.fiscal.ssPorUnidade * r.unidadesMes : 0),
      0,
    );
    const irs = negocio.ofertas.reduce(
      (s, r) => s + (r.preco.fiscal.aplicavel ? r.preco.fiscal.irsPorUnidade * r.unidadesMes : 0),
      0,
    );
    const retencao = negocio.ofertas.reduce(
      (s, r) => s + (r.preco.fiscal.aplicavel ? r.preco.fiscal.retencaoPorUnidade * r.unidadesMes : 0),
      0,
    );
    if (ss > 0) valores.socialSecurityEstimate = cent(ss * 12);
    if (irs > 0) valores.irsEstimate = cent(irs * 12);
    if (retencao > 0) valores.withholdingEstimate = cent(retencao * 12);
  }

  return valores;
}

/**
 * Os passos que ficam DESTE lado antes de sair para a FIZ.
 *
 * Existe para a distinção do §42 continuar visível no ecrã: estimar e
 * comparar acontecem aqui; abrir atividade e emitir acontecem lá.
 */
export function passosAntesDaFiz(negocio: ResultadoNegocio, contexto: ContextoNegocio): string[] {
  const passos: string[] = [];

  if (negocio.confianca !== "estruturado") {
    passos.push("Confirmar os pressupostos ainda por responder — o número muda com eles.");
  }
  if (negocio.capacidade.some((c) => c.estado === "excedida")) {
    passos.push("Rever o volume: o plano atual pede mais horas do que as que existem no mês.");
  }
  if (contexto.fiscal.enquadramento === "nao_sei") {
    passos.push("Comparar independente com sociedade para o negócio que construíste.");
  }
  passos.push("Guardar o projeto, para poder voltar a ele com os números reais do primeiro trimestre.");

  return passos;
}
