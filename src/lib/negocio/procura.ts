// ═══════════════════════════════════════════════════════════════════════
//  A PROCURA AO LONGO DO TEMPO — sazonalidade e evolução
//  ---------------------------------------------------------------------
//  §55-57 do relatório. O domínio já suportava sazonalidade e crescimento
//  composto; a experiência não estava à altura do motor. Ninguém
//  configurava nenhum dos dois, e por isso todos os negócios eram
//  projetados como se vendessem exatamente o mesmo em agosto e em
//  dezembro, para sempre.
//
//  ── AS DUAS COISAS QUE SE CONFUNDEM ────────────────────────────────
//  · SAZONALIDADE — a forma do ano. Repete-se todos os anos;
//  · EVOLUÇÃO     — para onde o negócio vai. Não se repete.
//
//  Um restaurante com agosto forte e janeiro fraco tem sazonalidade sem
//  crescimento. Um negócio que arranca devagar tem evolução sem
//  sazonalidade. São eixos independentes, e multiplicam-se.
//
//  ── E O ARRANQUE NÃO É UMA TAXA ────────────────────────────────────
//  Um arranque tem TETO: chega-se ao volume esperado e fica-se lá. Uma
//  taxa composta não pára nunca — ao 24.º mês, 3%/mês dá o dobro. Usar a
//  segunda para modelar o primeiro produz um número que ninguém previu.
// ═══════════════════════════════════════════════════════════════════════

import { fracao, num } from "@/lib/pricing/numeros";
import type { ContextoNegocio, EvolucaoProcura } from "./tipos";

/** Doze meses iguais. É o ponto de partida de qualquer curva. */
export const CURVA_UNIFORME: readonly number[] = Array.from({ length: 12 }, () => 1);

export const MESES_CURTOS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
] as const;

/**
 * A curva de sazonalidade que vale para este negócio.
 *
 * A do negócio ganha à das ofertas: quem respondeu «as vendas não são
 * iguais durante o ano» estava a falar do negócio inteiro. Sem nenhuma,
 * o ano é uniforme — e isso aparece no livro de pressupostos.
 */
export function curvaSazonal(contexto: ContextoNegocio): number[] {
  if (contexto.procura.modo !== "sazonal") return [...CURVA_UNIFORME];

  const doNegocio = contexto.procura.sazonalidade;
  if (Array.isArray(doNegocio) && doNegocio.length === 12) {
    return doNegocio.map((f) => fracao(f, 0, 5));
  }

  // Média simples das curvas por oferta. Uma média ponderada pela receita
  // exigiria recalcular o agregado a cada mês, e a diferença não
  // justifica o custo.
  const porOferta = contexto.ofertas
    .map((o) => o.sazonalidade)
    .filter((s): s is number[] => Array.isArray(s) && s.length === 12);

  if (porOferta.length === 0) return [...CURVA_UNIFORME];

  return Array.from({ length: 12 }, (_, i) =>
    porOferta.reduce((s, f) => s + fracao(f[i], 0, 5), 0) / porOferta.length,
  );
}

/** O fator sazonal de um mês do ano (0 = janeiro). */
export function fatorSazonal(contexto: ContextoNegocio, mesDoAno: number): number {
  return curvaSazonal(contexto)[((mesDoAno % 12) + 12) % 12] ?? 1;
}

/**
 * O fator de EVOLUÇÃO do mês `mes` (1 = primeiro mês de atividade).
 *
 * Não inclui sazonalidade — são eixos independentes, e a caixa
 * multiplica-os.
 */
export function fatorEvolucao(contexto: ContextoNegocio, mes: number): number {
  if (mes < 1) return 0;
  const evolucao = evolucaoDe(contexto);

  if (evolucao === "arranque") {
    const meses = Math.max(1, Math.round(num(contexto.procura.arranqueMeses) || 6));
    // Linear até ao volume esperado, e depois fica lá. O teto é o ponto
    // todo: sem ele isto era uma taxa composta com outro nome.
    return Math.min(1, mes / meses);
  }

  if (evolucao === "crescimento") {
    return Math.pow(1 + num(contexto.procura.crescimentoMensal), mes - 1);
  }

  return 1;
}

/** A escala completa de um mês: evolução × sazonalidade. */
export function escalaDoMes(contexto: ContextoNegocio, mes: number): number {
  if (mes < 1) return 0;
  return fatorEvolucao(contexto, mes) * fatorSazonal(contexto, (mes - 1) % 12);
}

/**
 * A evolução declarada.
 *
 * Um `crescimentoMensal` guardado sem `evolucao` — de um projeto anterior
 * a este contrato — continua a valer como crescimento. Ignorá-lo seria
 * apagar uma resposta que a pessoa deu.
 */
export function evolucaoDe(contexto: ContextoNegocio): EvolucaoProcura {
  const declarada = contexto.procura.evolucao;
  if (declarada) return declarada;
  return num(contexto.procura.crescimentoMensal) !== 0 ? "crescimento" : "estavel";
}

/** A procura foi mesmo configurada, ou está tudo por omissão? */
export function procuraConfigurada(contexto: ContextoNegocio): boolean {
  return contexto.procura.modo === "sazonal" || evolucaoDe(contexto) !== "estavel";
}

// ─── Curvas de partida ─────────────────────────────────────────────────

/**
 * Uma curva plausível para começar a afinar, dado um mês de pico.
 *
 * ⚠️ NÃO é um dado de mercado nem uma previsão. É uma FORMA para a pessoa
 * arrastar — a alternativa era abrir doze campos a 1,00 e pedir-lhe que
 * inventasse doze números do nada. A curva conta sempre 12,00 no total,
 * para o ano não mudar de volume só por se ter dado forma ao ano.
 */
export function curvaComPico(mesDePico: number, intensidade = 0.4): number[] {
  const pico = ((mesDePico % 12) + 12) % 12;
  const bruta = Array.from({ length: 12 }, (_, i) => {
    // Distância circular ao pico: 0 no pico, 6 no mês oposto.
    const d = Math.min(Math.abs(i - pico), 12 - Math.abs(i - pico));
    return 1 + intensidade * Math.cos((d / 6) * Math.PI);
  });
  const soma = bruta.reduce((s, x) => s + x, 0);
  return bruta.map((x) => Math.round(((x * 12) / soma) * 100) / 100);
}

/**
 * Normaliza uma curva para que a soma seja 12.
 *
 * Sem isto, dar forma ao ano mudava também o VOLUME do ano — e a pessoa
 * via a receita anual saltar por ter arrastado uma barra de agosto.
 */
export function normalizarCurva(curva: readonly number[]): number[] {
  const limpa = Array.from({ length: 12 }, (_, i) => fracao(curva[i] ?? 1, 0, 5));
  const soma = limpa.reduce((s, x) => s + x, 0);
  if (soma <= 0) return [...CURVA_UNIFORME];
  return limpa.map((x) => Math.round(((x * 12) / soma) * 100) / 100);
}
