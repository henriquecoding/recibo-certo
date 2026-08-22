// Setores. A CAE indicativa serve para orientar quem vai abrir atividade —
// nunca para a escolher por ela, que é decisão fiscal com consequências.
import type { Setor } from "../tipos";

export const SETORES: readonly Setor[] = Object.freeze([
  { id: "turismo", rotulo: "Turismo e alojamento", caeIndicativa: ["55", "79", "93"], reguladoEmGeral: true },
  { id: "empresas", rotulo: "Serviços a empresas", caeIndicativa: ["70", "74", "82"], reguladoEmGeral: false },
  { id: "pessoas", rotulo: "Pessoas e famílias", caeIndicativa: ["85", "88", "96"], reguladoEmGeral: true },
  { id: "casa", rotulo: "Casa e património", caeIndicativa: ["41", "43", "68", "81"], reguladoEmGeral: false },
  { id: "tecnico", rotulo: "Técnico e manutenção", caeIndicativa: ["33", "43", "95"], reguladoEmGeral: true },
  { id: "digital", rotulo: "Digital e conteúdo", caeIndicativa: ["58", "62", "63", "73"], reguladoEmGeral: false },
  { id: "logistica", rotulo: "Transporte e logística", caeIndicativa: ["49", "52", "53"], reguladoEmGeral: true },
  { id: "alimentar", rotulo: "Alimentar e produção", caeIndicativa: ["10", "11", "56"], reguladoEmGeral: true },
  { id: "campo", rotulo: "Agricultura e território", caeIndicativa: ["01", "02", "81"], reguladoEmGeral: false },
  { id: "publico", rotulo: "Setor público e financiamento", caeIndicativa: ["69", "70", "82"], reguladoEmGeral: false },
  { id: "comercio", rotulo: "Comércio e retalho", caeIndicativa: ["45", "46", "47"], reguladoEmGeral: false },
  { id: "educacao", rotulo: "Educação e formação", caeIndicativa: ["85"], reguladoEmGeral: true },
] as const);

export const SETOR_POR_ID = new Map(SETORES.map((item) => [item.id, item]));
