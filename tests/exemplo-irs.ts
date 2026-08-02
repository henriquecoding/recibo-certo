// Cenário da declaração: um caso deliberadamente RICO, para que o protótipo
// exercite todas as secções condicionais do documento — várias categorias,
// escalões que chegam ao topo, deduções que batem no limite global do
// Art. 78.º n.º 7, e rendimento estrangeiro com crédito de dupla tributação.
//
// Um exemplo pobre compila sempre. Só um exemplo rico prova que as secções
// condicionais não partem quando existem de facto.

import { simularDeclaracaoIRS, type DeclaracaoInput } from "../src/lib/fiscal";
import { criarProveniencia } from "../src/lib/export/referencia";
import type { DocumentoIRS } from "../src/lib/export/documento-irs";
import type { CabecalhoDeclaracao } from "../src/lib/export-irs";

export const JSON_EXEMPLO_IRS = "src/documentos/irs-exemplo.json";

export const ENTRADA_EXEMPLO: DeclaracaoInput = {
  conjunta: false,
  salarios: { bruto: 88_000, retencoes: 24_600, contribuicoesSS: 9_680 },
  independente: {
    brutoAnual: 26_000,
    tipo: "art151",
    anoAtividade: 4,
    regimeContabilidade: "simplificado",
    retencoesPagas: 5_980,
  },
  capitais: { dividendos: 3_200, juros: 450, retencoes: 1_022 },
  prediais: { rendaAnual: 9_600, despesas: 1_150, habitacao: true, duracao: "5a10" },
  investimentos: { saldo: 2_800 },
  estrangeiros: { rendimento: 4_000, impostoPago: 600 },
  deducoes: {
    saude: 2_400,
    educacao: 1_800,
    gerais: 250,
    rendas: 0,
  },
  ascendentes: 1,
  dependentesLista: [
    { ate3: false, deficiente: false, guarda: 1 },
    { ate3: true, deficiente: false, guarda: 1 },
  ],
  ppr: { valor: 2_000, escalaoIdade: "de35a50" },
  donativos: { valor: 400, fator: 1.25, semLimite: false },
};

export const CABECALHO_EXEMPLO: CabecalhoDeclaracao = {
  nome: "",
  nif: "",
  residencia: "Continente",
  estadoCivil: "Casado",
  tributacao: "Separada",
  dependentes: ["Dependente 1", "Dependente 2 (até 3 anos)"],
  ascendentes: 1,
};

export async function construirDeclaracaoExemplo(): Promise<DocumentoIRS> {
  const resultado = simularDeclaracaoIRS(ENTRADA_EXEMPLO);
  return {
    periodo: "2026",
    proveniencia: await criarProveniencia("irs", { ENTRADA_EXEMPLO }, new Date("2026-08-01T12:00:00Z")),
    resultado,
    cabecalho: CABECALHO_EXEMPLO,
    ambito: [
      "É uma estimativa informativa: não substitui a declaração Modelo 3 entregue à Autoridade Tributária.",
      "Assume que os valores introduzidos estão completos e corretamente enquadrados por categoria.",
      "Não modela benefícios fiscais fora dos indicados, nem regimes negociados caso a caso.",
      "A Segurança Social da categoria B é devida à parte e não entra no apuramento do IRS.",
    ],
  };
}
