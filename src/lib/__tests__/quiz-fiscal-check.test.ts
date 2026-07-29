// ═══════════════════════════════════════════════════════════════════════
//  quiz:fiscal-check — o quiz deixa de envelhecer em silêncio
//  ---------------------------------------------------------------------
//  Nenhum dos 13 ficheiros de perguntas importa `fiscal-data.ts`: os valores
//  fiscais estão cravados em strings dentro dos enunciados e das explicações.
//  O projeto promete que «é impossível publicar dados internamente
//  inconsistentes» — e é verdade para os simuladores, porque
//  `assertFiscalDataIntegrity()` falha o build. Mas o quiz contornava essa
//  garantia: em janeiro de 2027 o simulador atualiza-se sozinho e o quiz
//  continuaria a ensinar os números de 2026, sem ninguém dar por isso.
//
//  Esta é a barreira de curto prazo que o relatório pediu: uma tabela de
//  literais vigiados, cruzada com `fiscal-data.ts`. Quando um parâmetro
//  fiscal muda, o teste falha e diz exatamente quantas perguntas — e quais —
//  precisam de ser reescritas.
//
//  A solução de raiz é interpolar os valores nos enunciados, como os três
//  `gerador-*.ts` já fazem. Onde isso for feito, a entrada correspondente
//  desta tabela deixa de encontrar ocorrências e o próprio teste avisa que
//  pode ser retirada.
// ═══════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ADICIONAL_SOLIDARIEDADE,
  DEDUCAO_ESPECIFICA_DEPENDENTE,
  DERRAMA_MAX,
  DISPENSA_RETENCAO_LIMITE,
  DIVIDENDOS_TAXA,
  ESCALOES_IRS,
  IAS,
  IRC_LIMITE_PME,
  IRC_TAXA_GERAL,
  IRC_TAXA_PME,
  IRS_JOVEM_TETO_CALC,
  IVA_ISENCAO_LIMITE,
  IVA_TAXAS,
  REGIME_SIMPLIFICADO,
  RETENCAO,
  SMN,
  SS_BASE_MAX_MENSAL,
  SS_COEFICIENTE,
  SS_DEPENDENTE,
  SS_TAXA,
} from "../fiscal-data";

const DIR_QUIZ = join(process.cwd(), "src/lib/quiz-fiscal");

/**
 * Milhares com PONTO e decimais com vírgula — a convenção usada nos
 * enunciados. `toLocaleString("pt-PT")` não serve tal e qual: não agrupa
 * números de quatro dígitos (dá «8342», não «8.342») e usa espaço fino como
 * separador. Aqui o agrupamento é explícito, para bater com o que está
 * escrito no banco.
 */
const agrupar = (parteInteira: string) => parteInteira.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const eur = (n: number, casas = 2) => {
  const [int, dec] = n.toFixed(casas).split(".");
  return `${agrupar(int)},${dec}`;
};
/** Inteiro com separador de milhares: 15.000, 29.542. */
const inteiro = (n: number) => agrupar(String(Math.round(n)));
/** Percentagem à portuguesa, sem zeros supérfluos: 23%, 11,5%, 23,75%. */
const perc = (taxa: number) => `${String(+(taxa * 100).toFixed(3)).replace(".", ",")}%`;

interface LiteralVigiado {
  /** Nome do parâmetro, para a mensagem de erro ser acionável. */
  rotulo: string;
  /** Como o valor aparece hoje nos enunciados. */
  literal: string;
  /** O mesmo valor, derivado de `fiscal-data.ts`. */
  atual: () => string;
}

/**
 * Os literais que aparecem escritos à mão no banco. Cada um tem de continuar
 * a coincidir com o que `fiscal-data.ts` diz.
 */
const LITERAIS_VIGIADOS: LiteralVigiado[] = [
  { rotulo: "IAS", literal: "537,13", atual: () => eur(IAS.value) },
  { rotulo: "Teto do IRS Jovem (55 × IAS)", literal: "29.542", atual: () => inteiro(IRS_JOVEM_TETO_CALC) },
  { rotulo: "1.º escalão de IRS", literal: "8.342", atual: () => inteiro(ESCALOES_IRS.value[0].ate ?? 0) },
  { rotulo: "1.ª taxa do Art. 68.º", literal: "12,5%", atual: () => perc(ESCALOES_IRS.value[0].taxa) },
  { rotulo: "Dedução específica da categoria A", literal: "4.587,09", atual: () => eur(DEDUCAO_ESPECIFICA_DEPENDENTE.value) },
  { rotulo: "Limiar de isenção de IVA (Art. 53.º)", literal: "15.000", atual: () => inteiro(IVA_ISENCAO_LIMITE.value) },
  { rotulo: "Excesso de 25% do Art. 53.º", literal: "18.750", atual: () => inteiro(IVA_ISENCAO_LIMITE.value * 1.25) },
  { rotulo: "Limiar de dispensa de retenção", literal: "15.000", atual: () => inteiro(DISPENSA_RETENCAO_LIMITE.value) },
  { rotulo: "Retenção — Art. 151.º", literal: "23%", atual: () => perc(RETENCAO.art151.value) },
  { rotulo: "Retenção — outras atividades", literal: "11,5%", atual: () => perc(RETENCAO.outros.value) },
  { rotulo: "Retenção — direitos de autor", literal: "16,5%", atual: () => perc(RETENCAO.diretosAutor.value) },
  { rotulo: "Taxa contributiva do independente", literal: "21,4%", atual: () => perc(SS_TAXA.value) },
  { rotulo: "Coeficiente de SS — prestação de serviços", literal: "70%", atual: () => perc(SS_COEFICIENTE.servicos.value) },
  { rotulo: "Base máxima mensal de SS (12 × IAS)", literal: "6.445,56", atual: () => eur(SS_BASE_MAX_MENSAL.value) },
  { rotulo: "TSU do trabalhador", literal: "11%", atual: () => perc(SS_DEPENDENTE.trabalhador.value) },
  { rotulo: "TSU da entidade empregadora", literal: "23,75%", atual: () => perc(SS_DEPENDENTE.entidade.value) },
  { rotulo: "Salário mínimo nacional", literal: "920", atual: () => inteiro(SMN.value) },
  { rotulo: "IVA normal — continente", literal: "23%", atual: () => perc(IVA_TAXAS.continente.value.normal) },
  { rotulo: "IVA intermédia — continente", literal: "13%", atual: () => perc(IVA_TAXAS.continente.value.intermedia) },
  { rotulo: "IVA reduzida — continente", literal: "6%", atual: () => perc(IVA_TAXAS.continente.value.reduzida) },
  { rotulo: "IVA normal — Madeira", literal: "22%", atual: () => perc(IVA_TAXAS.madeira.value.normal) },
  { rotulo: "IVA normal — Açores", literal: "16%", atual: () => perc(IVA_TAXAS.acores.value.normal) },
  { rotulo: "Limite do regime simplificado", literal: "200.000", atual: () => inteiro(REGIME_SIMPLIFICADO.limite.value) },
  { rotulo: "IRC — taxa PME", literal: "15%", atual: () => perc(IRC_TAXA_PME.value) },
  { rotulo: "IRC — taxa geral", literal: "19%", atual: () => perc(IRC_TAXA_GERAL.value) },
  { rotulo: "IRC — limite do escalão PME", literal: "50.000", atual: () => inteiro(IRC_LIMITE_PME.value) },
  { rotulo: "Derrama municipal — teto", literal: "1,5%", atual: () => perc(DERRAMA_MAX.value) },
  { rotulo: "Taxa liberatória sobre dividendos", literal: "28%", atual: () => perc(DIVIDENDOS_TAXA.value) },
  { rotulo: "Adicional de solidariedade — 1.º limiar", literal: "80.000", atual: () => inteiro(ADICIONAL_SOLIDARIEDADE.limiar1.value) },
  { rotulo: "Adicional de solidariedade — 2.º limiar", literal: "250.000", atual: () => inteiro(ADICIONAL_SOLIDARIEDADE.limiar2.value) },
];

/** Texto de todos os ficheiros de perguntas, concatenado. */
function textoDoBanco(): string {
  return readdirSync(DIR_QUIZ)
    .filter((f) => f.startsWith("perguntas-") && f.endsWith(".ts"))
    .map((f) => readFileSync(join(DIR_QUIZ, f), "utf8"))
    .join("\n");
}

describe("quiz:fiscal-check — os números do quiz batem com o motor fiscal", () => {
  const texto = textoDoBanco();

  it("todo o literal vigiado continua a coincidir com `fiscal-data.ts`", () => {
    const divergentes = LITERAIS_VIGIADOS.filter((l) => l.literal !== l.atual()).map((l) => {
      const ocorrencias = texto.split(l.literal).length - 1;
      return (
        `${l.rotulo}: o banco diz «${l.literal}» e o motor diz «${l.atual()}» ` +
        `(${ocorrencias} ocorrência(s) a corrigir nos ficheiros perguntas-*.ts)`
      );
    });
    expect(divergentes).toEqual([]);
  });

  it("nenhuma vigilância é código morto — todo o literal aparece no banco", () => {
    // Se um literal deixar de aparecer, ou foi interpolado (bom, e a entrada
    // pode sair da tabela) ou a pergunta desapareceu. Nos dois casos convém
    // saber, para a tabela não dar uma falsa sensação de cobertura.
    const semOcorrencias = LITERAIS_VIGIADOS.filter((l) => !texto.includes(l.literal)).map(
      (l) => `${l.rotulo} («${l.literal}»)`,
    );
    expect(semOcorrencias).toEqual([]);
  });

  it("o piso revogado de 4.104 € nunca aparece como dedução da categoria A", () => {
    // O piso fixo foi eliminado pela Lei n.º 45-A/2024. Continua legítimo no
    // contexto do `max(4.104; 8,54 × IAS)` do Art. 31.º para a categoria B —
    // o que não pode voltar é apresentá-lo como a dedução da categoria A,
    // que é o que uma pergunta fazia e o simulador contradizia.
    const linhas = texto.split("\n");
    const suspeitas = linhas.filter((linha) => {
      if (!linha.includes("4.104")) return false;
      const temContextoMax = /max\(|máx\(|8,54/.test(linha);
      const falaCategoriaA = /categoria A|trabalho dependente/i.test(linha);
      return falaCategoriaA && !temContextoMax;
    });
    expect(suspeitas).toEqual([]);
  });
});
