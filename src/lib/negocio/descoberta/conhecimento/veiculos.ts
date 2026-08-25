// ═══════════════════════════════════════════════════════════════════════
//  VIATURAS — o que a idade e os quilos significam, com fonte
//  ---------------------------------------------------------------------
//  «Tenho carrinha» não é uma resposta. Uma carrinha de 2004, de dois
//  lugares, com 300 kg de carga útil e uma zona de carga onde não entra
//  uma palete, é um meio real — mas não é o mesmo meio para todos os
//  trabalhos, e o motor tinha-a a valer o mesmo que uma de 2022.
//
//  Este ficheiro dá significado verificável a duas coisas que até aqui
//  eram só campos:
//
//   · a IDADE, através da periodicidade legal da inspeção (DL 144/2017);
//   · os QUILOS, através da definição das faixas que a interface oferece.
//
//  Nenhuma das duas é um veredito sobre a viatura. A idade não torna um
//  meio inadequado — torna concreta a pergunta que falta fazer. E as
//  faixas não medem nada: são RÓTULOS de intervalos, para quem não sabe a
//  carga útil de cor conseguir responder à mesma pergunta.
// ═══════════════════════════════════════════════════════════════════════

import type {
  CapacidadeCargaVeiculo,
  ConfiguracaoVeiculo,
} from "../contexto/tipos";
import type { Proveniencia } from "../proveniencia";

/**
 * Periodicidade da Inspeção Periódica Obrigatória, tal como o IMT a
 * publica. É a única leitura da idade que este motor faz — e é lei, não
 * uma opinião nossa sobre viaturas velhas.
 */
export const PROVENIENCIA_INSPECAO: Proveniencia = Object.freeze({
  origem: "observado",
  fonte: "IMT — Tipos de Inspeções (Decreto-Lei n.º 144/2017, de 29 de novembro)",
  url: "https://www.imt-ip.pt/veiculos/inspecao-de-veiculos/tipos-de-inspecoes/",
  observadoEm: "2026-08-25",
  geografia: "Portugal",
  limitacao:
    "Periodicidade da inspeção de ligeiros. Não cobre o transporte público de passageiros nem regras municipais de circulação, que têm regimes próprios.",
});

/**
 * A partir de que idade a inspeção de um ligeiro passa a ser ANUAL.
 *
 *  · passageiros (M1): 4 anos após a 1.ª matrícula, depois de dois em dois
 *    anos até aos oito, e a partir daí todos os anos;
 *  · mercadorias (N1): 2 anos após a 1.ª matrícula, e depois todos os anos.
 *
 * Uma viatura de mercadorias entra no regime anual muito mais cedo do que
 * um carro de passageiros — o que muda o custo e a disponibilidade de uma
 * operação que dependa dela.
 */
const IDADE_DE_INSPECAO_ANUAL: Readonly<Record<"passageiros" | "mercadorias", number>> =
  Object.freeze({ passageiros: 8, mercadorias: 2 });

/** Idade em anos civis. `null` quando o ano não foi declarado. */
export function idadeDaViatura(
  anoMatricula: number | undefined,
  anoAtual: number,
): number | null {
  if (anoMatricula === undefined || !Number.isFinite(anoMatricula)) return null;
  return Math.max(0, anoAtual - anoMatricula);
}

/**
 * A inspeção já é anual? `null` quando falta o ano da matrícula — que não
 * é «não», é «ainda não perguntámos».
 *
 * Um veículo «misto» é tratado como mercadorias: é o regime mais exigente
 * dos dois, e errar por excesso de cuidado é o lado certo para errar.
 */
export function inspecaoJaEAnual(
  anoMatricula: number | undefined,
  configuracao: ConfiguracaoVeiculo | undefined,
  anoAtual: number,
): boolean | null {
  const idade = idadeDaViatura(anoMatricula, anoAtual);
  if (idade === null) return null;
  const regime =
    configuracao === "mercadorias" || configuracao === "misto"
      ? "mercadorias"
      : "passageiros";
  return idade >= IDADE_DE_INSPECAO_ANUAL[regime];
}

/**
 * O que cada faixa quer dizer em quilogramas.
 *
 * Isto é uma DEFINIÇÃO do rótulo, não uma medição de coisa nenhuma: é o
 * que permite comparar quem respondeu «média» com quem escreveu «780 kg».
 * Quando a pessoa declara os quilos, são os quilos que valem.
 *
 * As fronteiras seguem os escalões que separam operações diferentes: uma
 * bagageira de ligeiro de passageiros, uma carrinha pequena de duas
 * portas, uma carrinha de carga e um veículo que já leva palete completa.
 */
export const KG_DA_FAIXA: Readonly<
  Record<CapacidadeCargaVeiculo, { readonly min: number; readonly max: number | null }>
> = Object.freeze({
  "muito-reduzida": { min: 0, max: 200 },
  reduzida: { min: 200, max: 500 },
  media: { min: 500, max: 1000 },
  elevada: { min: 1000, max: null },
});

export const ORDEM_CARGA: Readonly<Record<CapacidadeCargaVeiculo, number>> =
  Object.freeze({
    "muito-reduzida": 0,
    reduzida: 1,
    media: 2,
    elevada: 3,
  });

const FAIXAS: readonly CapacidadeCargaVeiculo[] = Object.freeze([
  "muito-reduzida",
  "reduzida",
  "media",
  "elevada",
]);

/** A faixa em que uma carga útil declarada cai. */
export function faixaDaCargaUtil(kg: number): CapacidadeCargaVeiculo {
  for (const faixa of FAIXAS) {
    const { max } = KG_DA_FAIXA[faixa];
    if (max === null || kg < max) return faixa;
  }
  return "elevada";
}

/** O piso, em quilos, que uma faixa exigida representa. */
export function kgMinimosDaFaixa(faixa: CapacidadeCargaVeiculo): number {
  return KG_DA_FAIXA[faixa].min;
}

/**
 * Palete europeia — 1200 × 800 mm, norma EN 13698-1.
 *
 * Serve de referência de dimensão porque é a unidade em que o transporte
 * de mercadorias em Portugal realmente se mede. Não é um número nosso.
 */
export const PALETE_EUROPEIA_CM = Object.freeze({ comprimento: 120, largura: 80 });

export const PROVENIENCIA_PALETE: Proveniencia = Object.freeze({
  origem: "observado",
  fonte: "Palete europeia (EUR/EPAL), norma EN 13698-1 — 1200 × 800 mm",
  observadoEm: "2026-08-25",
  limitacao:
    "É a dimensão da palete, não a da zona de carga necessária: carregar por trás exige folga que varia com a viatura.",
});
