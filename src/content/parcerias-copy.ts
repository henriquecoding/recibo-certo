// ═══════════════════════════════════════════════════════════════════════
//  COPY DAS SUPERFÍCIES DE PARCERIA — valores por omissão
//  ---------------------------------------------------------------------
//  O texto que aparece ao utilizador vive em `partner_placements`, para poder
//  ser corrigido sem deploy. Estes são os valores de recurso para quando o
//  Supabase não responde — não são a fonte de verdade, são o piso.
//
//  ⚠️ REGRA DE MODO. Em modo LIGACAO nada é transportado. Qualquer frase que
//  prometa transporte de dados é FALSA aqui, e é por isso que
//  `parcerias:copy` mantém uma lista negra de expressões: «campo a campo»,
//  «sem repetir dados», «segue contigo». A frase mais errada que o site
//  chegou a ter interpolava um valor calculado numa promessa de que esse
//  valor ia seguir. Não seguia.
//
//  ⚠️ NÃO PUBLICAR NÚMERO DE CERTIFICAÇÃO AT. Não foi possível confirmar em
//  fonte pública o número de certificação da FIZ. É exatamente o tipo de
//  afirmação que o `guias:claims` existe para impedir, e é pior num bloco
//  comercial do que no corpo de um Guia.
//
//  ⚠️ A PALAVRA «CONTABILISTA» NÃO ANUNCIA UM PARCEIRO. Metade destas linhas
//  vendia a FIZ como «contabilistas certificados» — e o site TEM
//  contabilistas: um diretório com perfis aprovados, vínculo sem plano pago e
//  uma ordem que não se compra (`lib/contabilistas/diretorio.ts`). Anunciar um
//  parceiro pago com a mesma palavra que descreve o nosso diretório punha os
//  dois a competir pelo mesmo clique, e o que perdia era o nosso — para mais
//  contra a hierarquia de `escolherRota()`, onde o contabilista vem ANTES da
//  FIZ. Aqui a FIZ é descrita pelo que executa: emitir, faturar, declarar,
//  cumprir prazos. Quem precisa de julgamento profissional vai para
//  `/contabilistas`, que não é publicidade. Verificado por `parcerias:copy`.
// ═══════════════════════════════════════════════════════════════════════

import type { Superficie } from "./parcerias-destinos";

export interface CopyParceria {
  titulo: string;
  sub: string;
  cta: string;
  /** A linha curta de divulgação, dentro do próprio bloco. */
  nota: string;
}

/**
 * Divulgação em modo LIGACAO.
 *
 * O texto anterior — «A parceria é remunerada» — descreve um acordo comercial
 * genérico. Não diz que ESTE link paga comissão POR ESTA subscrição, que é o
 * que a cl. 11.2 do Contrato de Afiliado exige, a par da identificação como
 * publicidade.
 */
export const DIVULGACAO_LIGACAO =
  "Ligação de afiliado (#publicidade): se subscreveres a FIZ através daqui, recebemos uma comissão. " +
  "Não muda o preço para ti e não altera o que escrevemos nos Guias.";

/** Nota curta, para caber dentro de um ato de demonstração. */
export const NOTA_LIGACAO =
  "Ligação de afiliado. Recebemos comissão se subscreveres — não muda o teu preço.";

const CTA_GENERICO = "Conhecer a FIZ";

export const COPY_POR_SUPERFICIE: Partial<Record<Superficie, CopyParceria>> = {
  "demo.hero": {
    titulo: "Emitir e declarar com a FIZ",
    sub: "Faturação certificada, IVA e Segurança Social tratados por quem executa",
    cta: CTA_GENERICO,
    nota: NOTA_LIGACAO,
  },
  "demo.hero.faixa": {
    titulo: "A conta é nossa. Emitir e declarar é com a FIZ.",
    sub: "Faturação, IVA e Segurança Social tratados no serviço deles, com preço e contrato próprios.",
    cta: CTA_GENERICO,
    nota: NOTA_LIGACAO,
  },
  "demo.irs": {
    titulo: "A estimativa é nossa. A entrega é da FIZ.",
    sub: "Faturação e obrigações executadas por quem as trata todos os meses.",
    cta: CTA_GENERICO,
    nota: NOTA_LIGACAO,
  },
  "demo.irs.faixa": {
    titulo: "A estimativa é nossa. A entrega é da FIZ.",
    sub: "Faturação e obrigações executadas por quem as trata todos os meses.",
    cta: CTA_GENERICO,
    nota: NOTA_LIGACAO,
  },
  "precos.faixa": {
    titulo: "Precisas de quem execute?",
    sub: "A FIZ trata da faturação, do IVA e das obrigações de quem passa recibos verdes.",
    cta: CTA_GENERICO,
    nota: NOTA_LIGACAO,
  },
};

/** Copy de recurso dos três cartões do Hero, por perfil. */
export const COPY_HERO: Record<string, CopyParceria> = {
  freelancer: {
    titulo: "Emitir e declarar com a FIZ",
    sub: "Faturação certificada, IVA e Segurança Social tratados por quem executa",
    cta: CTA_GENERICO,
    nota: NOTA_LIGACAO,
  },
  empresa: {
    titulo: "Constituir e manter com a FIZ",
    sub: "Contabilidade organizada e obrigações da sociedade",
    cta: "Ver a FIZ para empresas",
    nota: NOTA_LIGACAO,
  },
  comparacao: {
    titulo: "Executar a mudança com a FIZ",
    sub: "Depois de decidires, é quem emite e declara no regime novo",
    cta: CTA_GENERICO,
    nota: NOTA_LIGACAO,
  },
};

export function copyDaSuperficie(superficie: Superficie): CopyParceria {
  return (
    COPY_POR_SUPERFICIE[superficie] ?? {
      titulo: "Continuar com a FIZ",
      sub: "Emitir, faturar e declarar, no serviço e no contrato deles.",
      cta: CTA_GENERICO,
      nota: NOTA_LIGACAO,
    }
  );
}

/**
 * Expressões que prometem transporte de dados. Em modo LIGACAO nenhuma pode
 * aparecer na copy — é o que `parcerias:copy` verifica.
 */
export const EXPRESSOES_DE_HANDOFF: readonly string[] = [
  "campo a campo",
  "sem repetir dados",
  "segue contigo",
  "não a voltares a introduzir",
];
