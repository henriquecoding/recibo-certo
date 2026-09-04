// ═══════════════════════════════════════════════════════════════════════
//  AS ÁREAS DE UM CASO — vocabulário puro, sem base de dados atrás
//  ---------------------------------------------------------------------
//  `AreaDoCaso` vivia em `casos.ts`, ao lado das funções que falam com o
//  Supabase. Enquanto só o painel a usava, isso não custava nada. Deixou de
//  ser verdade quando o motor de dossiê passou a precisar dela para
//  traduzir a arrumação editorial dos Guias na triagem da plataforma: um
//  módulo do lado do GUIA passava a arrastar `casos.ts` — e com ele
//  `@/lib/supabase/client` — só por causa de um `import type`.
//
//  `import type` desaparece na compilação e não pesa um byte no bundle. O
//  que ele deixa é uma ARESTA no grafo, e é a aresta que interessa: quem
//  vier a seguir lê «este ficheiro depende da camada de dados» e escreve
//  código em cima disso. `contabilistas-demonstracao.test.ts` verifica-a e
//  reprova-a — e faz bem.
//
//  Aqui não há nada que toque em dados: são oito palavras e o que elas
//  querem dizer a quem as lê. `casos.ts` reexporta-as, e por isso nada do
//  que já as importava tem de mudar.
// ═══════════════════════════════════════════════════════════════════════

export type AreaDoCaso =
  | "irs" | "iva" | "contabilidade_organizada" | "inicio_atividade"
  | "seguranca_social" | "empresa" | "herancas" | "outro";

/** As áreas, como a pessoa as lê. Nunca o valor da base de dados. */
export const AREAS: { id: AreaDoCaso; titulo: string; ajuda: string }[] = [
  { id: "irs", titulo: "IRS", ajuda: "Declaração anual, reembolsos, retenções." },
  { id: "iva", titulo: "IVA", ajuda: "Declarações periódicas, isenções, regularizações." },
  { id: "inicio_atividade", titulo: "Início de atividade", ajuda: "Abrir atividade, escolher CAE, primeiro ano." },
  { id: "seguranca_social", titulo: "Segurança Social", ajuda: "Escalões, isenções, trimestrais." },
  { id: "contabilidade_organizada", titulo: "Contabilidade organizada", ajuda: "Passar de simplificado, ou já lá estar." },
  { id: "empresa", titulo: "Empresa", ajuda: "Constituir sociedade, IRC, distribuição de lucros." },
  { id: "herancas", titulo: "Heranças", ajuda: "Partilhas, imposto do selo, imóveis." },
  { id: "outro", titulo: "Outra coisa", ajuda: "Descreve na tua situação." },
];

/** O título de uma área, para quem só tem o identificador. */
export const tituloDaArea = (id: AreaDoCaso): string =>
  AREAS.find((a) => a.id === id)?.titulo ?? "Outra coisa";
