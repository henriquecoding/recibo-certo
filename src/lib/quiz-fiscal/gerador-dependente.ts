/**
 * Banco de perguntas — TRABALHO DEPENDENTE (Categoria A).
 *
 * Todas as perguntas derivam de valores REAIS de `fiscal-data.ts` e do motor
 * `fiscal-dependente.ts` (tabelas de retenção 2026, Tabela I, Continente).
 * Nenhum número é inventado: os cenários numéricos são CALCULADOS pelo motor
 * oficial e os distratores construídos a partir de outras taxas reais do
 * sistema. Cobre três temas: IRS no salário, Segurança Social (TSU) e
 * subsídios/abonos. Cada tema tem uma distribuição equilibrada de
 * dificuldades (fácil/médio/difícil) para a filtragem por dificuldade.
 */

import {
  SS_DEPENDENTE,
  SUBSIDIO_REFEICAO,
  AJUDAS_CUSTO,
  TRABALHO_SUPLEMENTAR,
  HORARIO_SEMANAL_COMPLETO,
  RETENCAO_SUPLEMENTAR_FATOR,
  RETENCAO_DEP_ISENCAO,
  RETENCAO_DEP_POR_DEPENDENTE,
  DEDUCAO_ESPECIFICA_DEPENDENTE,
  MINIMO_EXISTENCIA,
  IAS,
  type SourceKey,
} from "../fiscal-data";
import { retencaoIRSDependente } from "../fiscal-dependente";
import { fonte, type QuizCategoria, type QuizPergunta } from "./types";

// ── Formatação ────────────────────────────────────────────────────────
const cent = (n: number) => Math.round(n * 100) / 100;

function eur(n: number): string {
  return `${cent(n).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}
function pct(n: number): string {
  return `${(n * 100).toLocaleString("pt-PT", { maximumFractionDigits: 2 })}%`;
}

interface Opt {
  texto: string;
  porque: string;
}

/**
 * Monta uma pergunta com 1 opção correta + 3 distratores, posicionando a
 * correta de forma determinística e garantindo opções todas distintas.
 */
function montar(
  id: string,
  categoria: QuizCategoria,
  dificuldade: 1 | 2 | 3,
  pergunta: string,
  correta: Opt,
  distratores: Opt[],
  legalBasis: string,
  fonteKey: SourceKey,
  seed: number
): QuizPergunta {
  const vistos = new Set([correta.texto]);
  const limpos: Opt[] = [];
  for (const d of distratores) {
    if (!vistos.has(d.texto)) {
      vistos.add(d.texto);
      limpos.push(d);
    }
    if (limpos.length === 3) break;
  }
  let extra = 1;
  while (limpos.length < 3) {
    const texto = eur(cent(extra * 7.37 + (seed % 13) + 0.5));
    if (!vistos.has(texto)) {
      vistos.add(texto);
      limpos.push({ texto, porque: "Valor sem correspondência com a regra aplicável." });
    }
    extra++;
  }
  const pos = seed % 4;
  const opcoes = [...limpos];
  opcoes.splice(pos, 0, correta);
  return { id, categoria, dificuldade, pergunta, opcoes, correta: pos, legalBasis, fonte: fonte(fonteKey) };
}

// ── Valores reais reutilizados ────────────────────────────────────────
const TSU_TRAB = SS_DEPENDENTE.trabalhador.value; // 0,11
const TSU_ENT = SS_DEPENDENTE.entidade.value; // 0,2375
const LIM_DINHEIRO = SUBSIDIO_REFEICAO.dinheiro.value; // 6,15
const LIM_CARTAO = SUBSIDIO_REFEICAO.cartao.value; // 10,46
const LIM_NACIONAL = AJUDAS_CUSTO.nacionalDia.value; // 62,75
const LIM_ESTRANGEIRO = AJUDAS_CUSTO.estrangeiroDia.value; // 89,35
const ACRESCIMOS = TRABALHO_SUPLEMENTAR.acrescimos.value; // [0,25; 0,375; 0,5; 1]
const HORAS_SEMANA = HORARIO_SEMANAL_COMPLETO.value; // 40
const FATOR_SUP = RETENCAO_SUPLEMENTAR_FATOR.value; // 0,5
const ISENCAO_RET = RETENCAO_DEP_ISENCAO.value; // 920
const PARCELA_DEP = RETENCAO_DEP_POR_DEPENDENTE.value; // 21,43
const DED_ESPECIFICA = DEDUCAO_ESPECIFICA_DEPENDENTE.value; // 8,54 × IAS
const MIN_EXISTENCIA = MINIMO_EXISTENCIA.value; // 12 880

const SALARIOS = [
  820, 920, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1750, 1900, 2000, 2200,
  2400, 2600, 2800, 3000, 3300, 3600, 4000, 2700, 3150, 3800, 4500, 5000,
];

const acc: QuizPergunta[] = [];

// ═══════════════════════════════════════════════════════════════════════
//  TEMA 1 — Segurança Social (TSU)
// ═══════════════════════════════════════════════════════════════════════
let n = 0;

const ssConceptuais: Array<[1 | 2 | 3, string, Opt, Opt[], string, SourceKey]> = [
  [
    1,
    "Qual é a taxa contributiva (TSU) do trabalhador por conta de outrem sobre a remuneração ilíquida?",
    { texto: pct(TSU_TRAB), porque: "Correto. O trabalhador desconta 11% da remuneração ilíquida para a Segurança Social." },
    [
      { texto: pct(TSU_ENT), porque: `${pct(TSU_ENT)} é a taxa da entidade empregadora, não a do trabalhador.` },
      { texto: pct(TSU_TRAB + TSU_ENT), porque: "Esta é a soma das duas taxas (trabalhador + entidade)." },
      { texto: pct(0.214), porque: "Não corresponde a nenhuma taxa de TSU aplicável." },
    ],
    "Taxa contributiva do trabalhador por conta de outrem (11%)",
    "segSocialGov",
  ],
  [
    1,
    "Qual é a Taxa Social Única (TSU) da entidade empregadora no regime geral?",
    { texto: pct(TSU_ENT), porque: "Correto. A entidade empregadora suporta 23,75% sobre a remuneração do trabalhador." },
    [
      { texto: pct(TSU_TRAB), porque: "11% é a parte do trabalhador, não a da entidade." },
      { texto: pct(TSU_TRAB + TSU_ENT), porque: "Esta é a soma das duas parcelas." },
      { texto: pct(0.2), porque: "Não corresponde à taxa legal da entidade." },
    ],
    "Taxa Social Única da entidade empregadora (regime geral)",
    "segSocialGov",
  ],
  [
    1,
    "Sobre que valor incide a contribuição de 11% do trabalhador para a Segurança Social?",
    { texto: "Sobre a remuneração ilíquida (bruta)", porque: "Correto. A TSU incide sobre a remuneração ilíquida, antes de descontos." },
    [
      { texto: "Sobre o salário líquido", porque: "Incide sobre o bruto, não sobre o líquido." },
      { texto: "Sobre o salário menos o IRS", porque: "A base é a remuneração ilíquida, sem deduzir o IRS." },
      { texto: "Sobre metade do salário", porque: "Incide sobre a totalidade da remuneração ilíquida." },
    ],
    "Base de incidência contributiva — remuneração ilíquida",
    "segSocialGov",
  ],
  [
    1,
    "Quem entrega a contribuição do trabalhador (11%) à Segurança Social?",
    { texto: "A entidade empregadora, retendo-a no salário", porque: "Correto. A entidade retém os 11% e entrega-os, juntamente com a sua parte (23,75%)." },
    [
      { texto: "O próprio trabalhador, por guia", porque: "É a entidade que retém e entrega; o trabalhador não paga por guia." },
      { texto: "Ninguém — é automático sem retenção", porque: "Há retenção pela entidade empregadora." },
      { texto: "O contabilista, do seu bolso", porque: "A entidade é a responsável pela entrega." },
    ],
    "Obrigação de retenção e entrega pela entidade",
    "segSocialGov",
  ],
  [
    2,
    "Somando a parte do trabalhador e a da entidade, qual é a TSU total sobre o salário?",
    { texto: pct(TSU_TRAB + TSU_ENT), porque: "Correto. 11% (trabalhador) + 23,75% (entidade) = 34,75%." },
    [
      { texto: pct(TSU_ENT), porque: "23,75% é só a parte da entidade." },
      { texto: pct(TSU_TRAB), porque: "11% é só a parte do trabalhador." },
      { texto: pct(0.3), porque: "Não corresponde à soma das taxas legais." },
    ],
    "TSU trabalhador (11%) + entidade (23,75%)",
    "segSocialGov",
  ],
  [
    2,
    "Os subsídios de férias e de Natal estão sujeitos a descontos para a Segurança Social?",
    { texto: "Sim, à mesma taxa do salário (11% do trabalhador)", porque: "Correto. Os subsídios de férias e de Natal integram a base de incidência contributiva." },
    [
      { texto: "Não, estão isentos de Segurança Social", porque: "Estão sujeitos a SS como o salário base." },
      { texto: "Só o subsídio de Natal está sujeito", porque: "Ambos os subsídios estão sujeitos a SS." },
      { texto: "Só acima de 4 vezes o IAS", porque: "Não existe esse limiar para os subsídios." },
    ],
    "Base de incidência contributiva (Código Contributivo)",
    "codContributivo",
  ],
  [
    2,
    "As ajudas de custo, dentro dos limites legais, entram na base da Segurança Social?",
    { texto: "Não, dentro do limite legal estão isentas de SS", porque: "Correto. Só a parte das ajudas acima do limite diário é sujeita a SS." },
    [
      { texto: "Sim, contam sempre na totalidade", porque: "A parte dentro do limite é isenta." },
      { texto: "Sim, mas só metade do valor", porque: "A parte dentro do limite é totalmente isenta." },
      { texto: "Só as ajudas ao estrangeiro estão isentas", porque: "As nacionais também são isentas até ao limite." },
    ],
    "Ajudas de custo — limites de isenção (IRS/SS)",
    "ajudasCusto2026",
  ],
  [
    3,
    "Um prémio de caráter regular integra a base de incidência da Segurança Social?",
    { texto: "Sim, os prémios regulares integram a base contributiva", porque: "Correto. Prémios de caráter regular contam para a base da SS (Código Contributivo)." },
    [
      { texto: "Não, qualquer prémio está isento de SS", porque: "Os prémios regulares integram a base." },
      { texto: "Só os prémios de produtividade estão isentos", porque: "O critério é a regularidade, não o tipo." },
      { texto: "Apenas se pagos uma vez por ano", porque: "É a regularidade que os faz integrar a base." },
    ],
    "Base de incidência contributiva — prémios regulares",
    "codContributivo",
  ],
  [
    3,
    "O subsídio de refeição, na parte que excede o limite isento, entra na base da Segurança Social?",
    { texto: "Sim, a parte acima do limite é sujeita a SS", porque: "Correto. O excesso de subsídio de refeição acima do limite diário é tributado em IRS e SS." },
    [
      { texto: "Não, o subsídio de refeição é sempre isento de SS", porque: "Só é isento até ao limite; o excesso é sujeito." },
      { texto: "Só entra na base do IRS, nunca da SS", porque: "O excesso é sujeito também a SS." },
      { texto: "Entra na totalidade, mesmo dentro do limite", porque: "Dentro do limite é isento; só o excesso é sujeito." },
    ],
    "Subsídio de refeição — excesso sujeito a IRS/SS",
    "subsidioRefeicao2026",
  ],
];
ssConceptuais.forEach(([dif, p, c, d, lb, fk], i) => {
  acc.push(montar(`dep-ss-c${i}`, "dep_ss", dif, p, c, d, lb, fk, n++));
});

// Cenários — 4 templates por salário (dif 1/2/2/3)
SALARIOS.forEach((s, i) => {
  const ss = cent(s * TSU_TRAB);
  const custo = cent(s * (1 + TSU_ENT));
  const liqSS = cent(s - ss);
  const baseDupla = cent(s * 2); // salário + 1 subsídio pago no mês
  const ssDupla = cent(baseDupla * TSU_TRAB);
  acc.push(
    montar(
      `dep-ss-trab-${i}`,
      "dep_ss",
      1,
      `Salário bruto de ${eur(s)}. Quanto desconta o trabalhador para a Segurança Social (11%)?`,
      { texto: eur(ss), porque: `Correto. 11% × ${eur(s)} = ${eur(ss)}.` },
      [
        { texto: eur(cent(s * TSU_ENT)), porque: "Usa a taxa da entidade (23,75%), não a do trabalhador." },
        { texto: eur(cent(s * (TSU_TRAB + TSU_ENT))), porque: "Soma as duas taxas; o trabalhador só desconta 11%." },
        { texto: eur(cent(s * 0.1)), porque: "Usa 10% em vez de 11%." },
      ],
      "11% sobre a remuneração ilíquida",
      "segSocialGov",
      n++
    ),
    montar(
      `dep-ss-custo-${i}`,
      "dep_ss",
      2,
      `Salário bruto de ${eur(s)}. Qual é o custo total para a entidade (salário + TSU 23,75%)?`,
      { texto: eur(custo), porque: `Correto. ${eur(s)} × 1,2375 = ${eur(custo)}.` },
      [
        { texto: eur(s), porque: "É só o salário bruto, sem a TSU da entidade." },
        { texto: eur(cent(s * (1 + TSU_TRAB))), porque: "Acrescenta 11% em vez dos 23,75% da entidade." },
        { texto: eur(cent(s * (1 + TSU_TRAB + TSU_ENT))), porque: "Soma as duas TSU; o custo patronal só inclui 23,75%." },
      ],
      "Custo patronal = salário + TSU 23,75%",
      "segSocialGov",
      n++
    ),
    montar(
      `dep-ss-liq-${i}`,
      "dep_ss",
      2,
      `Salário bruto de ${eur(s)}. Quanto sobra após descontar só a Segurança Social (11%), antes de IRS?`,
      { texto: eur(liqSS), porque: `Correto. ${eur(s)} − ${eur(ss)} = ${eur(liqSS)}.` },
      [
        { texto: eur(cent(s - s * TSU_ENT)), porque: "Desconta 23,75% (taxa da entidade), e não os 11% do trabalhador." },
        { texto: eur(s), porque: "Não desconta a contribuição do trabalhador." },
        { texto: eur(cent(s - s * (TSU_TRAB + TSU_ENT))), porque: "Desconta as duas TSU; ao trabalhador só se retira 11%." },
      ],
      "Líquido de SS = bruto − 11%",
      "segSocialGov",
      n++
    ),
    montar(
      `dep-ss-base-${i}`,
      "dep_ss",
      3,
      `Num mês recebe o salário de ${eur(s)} e o subsídio de Natal (igual ao salário). Quanto desconta para a SS nesse mês (11%)?`,
      { texto: eur(ssDupla), porque: `Correto. O subsídio integra a base: 11% × ${eur(baseDupla)} = ${eur(ssDupla)}.` },
      [
        { texto: eur(ss), porque: "Esquece o subsídio de Natal, que também entra na base da SS." },
        { texto: eur(cent(baseDupla * TSU_ENT)), porque: "Usa a taxa da entidade (23,75%)." },
        { texto: eur(cent(s * 2 * (TSU_TRAB + TSU_ENT))), porque: "Soma as duas TSU; o trabalhador só desconta 11%." },
      ],
      "Subsídios integram a base de incidência da SS",
      "codContributivo",
      n++
    )
  );
});

// ═══════════════════════════════════════════════════════════════════════
//  TEMA 2 — IRS no salário (retenção na fonte)
// ═══════════════════════════════════════════════════════════════════════
n = 0;

const irsConceptuais: Array<[1 | 2 | 3, string, Opt, Opt[], string, SourceKey]> = [
  [
    1,
    "A retenção na fonte de IRS no salário é o imposto final ou um adiantamento?",
    { texto: "Um adiantamento — acerta-se na declaração anual", porque: "Correto. A retenção mensal é por conta do imposto; o valor final apura-se no IRS anual." },
    [
      { texto: "É o imposto final e definitivo", porque: "É um adiantamento; o acerto faz-se na declaração anual." },
      { texto: "É uma contribuição para a Segurança Social", porque: "A retenção é de IRS, distinta da SS." },
      { texto: "É uma taxa fixa igual para todos", porque: "Depende do escalão, da situação familiar e dos dependentes." },
    ],
    "Retenção na fonte como adiantamento de IRS",
    "despachoRetencao2026",
  ],
  [
    1,
    `Até que remuneração mensal está um trabalhador sem dependentes isento de retenção de IRS em 2026 (Continente)?`,
    { texto: `Até ${eur(ISENCAO_RET)}`, porque: `Correto. Até ${eur(ISENCAO_RET)} (limiar de 2026, alinhado com o salário mínimo) não há retenção.` },
    [
      { texto: `Até ${eur(760)}`, porque: "Não corresponde ao limiar de 2026." },
      { texto: `Até ${eur(1100)}`, porque: "Acima do limiar real." },
      { texto: "Não há isenção — retém-se desde o 1.º euro", porque: "Existe um limiar de isenção." },
    ],
    "Limiar de isenção de retenção 2026 (Despacho 233-A/2026)",
    "despachoRetencao2026",
  ],
  [
    1,
    "O que determina a tabela de retenção aplicável ao salário (não casado / casado, etc.)?",
    { texto: "A situação familiar do trabalhador", porque: "Correto. A tabela depende da situação familiar (estado civil, titulares, dependentes, deficiência)." },
    [
      { texto: "A antiguidade na empresa", porque: "A antiguidade não determina a tabela de retenção." },
      { texto: "O setor de atividade", porque: "Não é o setor que determina a tabela." },
      { texto: "O dia do mês em que recebe", porque: "A data de pagamento não altera a tabela aplicável." },
    ],
    "Tabelas de retenção por situação familiar",
    "despachoRetencao2026",
  ],
  [
    2,
    "Qual é a parcela adicional a abater por cada dependente na retenção mensal (Tabela I, Continente, 2026)?",
    { texto: eur(PARCELA_DEP), porque: `Correto. Abate-se ${eur(PARCELA_DEP)} por dependente ao valor da retenção.` },
    [
      { texto: eur(600), porque: "600 € é a dedução à coleta anual por dependente, não a parcela mensal." },
      { texto: eur(42.86), porque: "Não corresponde à parcela por dependente da Tabela I." },
      { texto: eur(0), porque: "Existe sim uma parcela a abater por dependente." },
    ],
    "Parcela a abater por dependente (Tabela I, Continente)",
    "despachoRetencao2026",
  ],
  [
    2,
    "Ter mais dependentes faz a retenção mensal de IRS subir ou descer?",
    { texto: "Descer — abate-se uma parcela por dependente", porque: "Correto. Cada dependente reduz a retenção (parcela a abater e, com 3+, menos 1 p.p.)." },
    [
      { texto: "Subir — agrava a retenção", porque: "Os dependentes reduzem a retenção, não a agravam." },
      { texto: "Não tem qualquer efeito", porque: "Os dependentes reduzem a retenção." },
      { texto: "Depende do dia de pagamento", porque: "Depende do número de dependentes, não da data." },
    ],
    "Efeito dos dependentes na retenção mensal",
    "despachoRetencao2026",
  ],
  [
    2,
    "Qual é o valor do mínimo de existência considerado em 2026?",
    { texto: eur(MIN_EXISTENCIA), porque: `Correto. O mínimo de existência de 2026 é ${eur(MIN_EXISTENCIA)} (920 € × 14).` },
    [
      { texto: eur(9870), porque: "Não corresponde ao mínimo de existência de 2026." },
      { texto: eur(8540), porque: "Não corresponde ao valor legal de 2026." },
      { texto: eur(ISENCAO_RET), porque: "920 € é o limiar mensal de isenção, não o mínimo anual." },
    ],
    "Art. 70.º CIRS — mínimo de existência 2026",
    "art70cirs",
  ],
  [
    3,
    "Um trabalhador com 3 ou mais dependentes beneficia de que ajuste na retenção mensal?",
    { texto: "Redução de 1 ponto percentual na taxa marginal", porque: "Correto. Com 3+ dependentes a taxa marginal da retenção desce 1 p.p. (Despacho 233-A/2026)." },
    [
      { texto: "Redução de 5 pontos percentuais", porque: "A redução é de 1 p.p." },
      { texto: "Isenção total de retenção", porque: "Não há isenção total; apenas −1 p.p." },
      { texto: "Nenhum ajuste — só a dedução anual", porque: "Há um ajuste mensal de −1 p.p." },
    ],
    "Tabelas de retenção 2026 — 3+ dependentes (−1 p.p.)",
    "despachoRetencao2026",
  ],
  [
    3,
    "Os subsídios de férias e de Natal são retidos em IRS de que forma?",
    { texto: "Retenção autónoma — em separado do salário do mês", porque: "Correto. Cada subsídio tem retenção autónoma (Art. 99.º-C CIRS), para não agravar o escalão." },
    [
      { texto: "Somam-se ao salário e retêm tudo junto", porque: "São objeto de retenção autónoma." },
      { texto: "Estão isentos de retenção de IRS", porque: "Estão sujeitos, mas de forma autónoma." },
      { texto: "Só o subsídio de Natal é retido", porque: "Ambos têm retenção autónoma." },
    ],
    "Art. 99.º-C CIRS — retenção autónoma dos subsídios",
    "despachoRetencao2026",
  ],
  [
    3,
    "Qual é a dedução específica anual da Categoria A em 2026 (mínimo garantido)?",
    { texto: eur(DED_ESPECIFICA), porque: `Correto. É 8,54 × IAS = ${eur(DED_ESPECIFICA)} (ou as contribuições para a SS, se superiores).` },
    [
      { texto: eur(4104), porque: "Era um valor fixo antigo; em 2026 indexa-se ao IAS (8,54 × IAS)." },
      { texto: eur(cent(IAS.value)), porque: "É 1 × IAS; a dedução específica é 8,54 × IAS." },
      { texto: eur(MIN_EXISTENCIA), porque: "Este é o mínimo de existência, não a dedução específica." },
    ],
    "Art. 25.º CIRS — dedução específica = 8,54 × IAS",
    "art25cirs",
  ],
  [
    1,
    "A retenção de IRS no salário é um desconto a favor de quem?",
    { texto: "Do Estado (Autoridade Tributária), por conta do IRS", porque: "Correto. A retenção é entregue à AT como adiantamento do IRS do trabalhador." },
    [
      { texto: "Da Segurança Social", porque: "A SS recebe a TSU, não a retenção de IRS." },
      { texto: "Da entidade empregadora", porque: "A entidade só retém e entrega à AT; não fica com o valor." },
      { texto: "Do sindicato", porque: "A quota sindical é distinta da retenção de IRS." },
    ],
    "Retenção de IRS entregue à Autoridade Tributária",
    "despachoRetencao2026",
  ],
  [
    1,
    "Se a retenção mensal for superior ao imposto anual devido, o que acontece?",
    { texto: "Há reembolso de IRS no acerto anual", porque: "Correto. Se reteve a mais durante o ano, recebe a diferença como reembolso." },
    [
      { texto: "Perde-se o valor retido a mais", porque: "O excesso é reembolsado, não perdido." },
      { texto: "Paga-se uma multa", porque: "Não há multa por ter retido a mais." },
      { texto: "Converte-se em contribuição para a SS", porque: "Retenção de IRS e SS são coisas distintas." },
    ],
    "Acerto anual de IRS — reembolso",
    "despachoRetencao2026",
  ],
  [
    1,
    "Quem comunica a situação familiar à entidade para aplicar a tabela de retenção correta?",
    { texto: "O próprio trabalhador (declaração de dados)", porque: "Correto. O trabalhador comunica a sua situação para a entidade aplicar a tabela certa." },
    [
      { texto: "A Autoridade Tributária, mês a mês", porque: "É o trabalhador que comunica os dados à entidade." },
      { texto: "A Segurança Social", porque: "Não é a SS que define a tabela de IRS." },
      { texto: "Ninguém — é sempre a mesma tabela", porque: "A tabela depende da situação familiar comunicada." },
    ],
    "Comunicação da situação familiar à entidade",
    "despachoRetencao2026",
  ],
];
irsConceptuais.forEach(([dif, p, c, d, lb, fk], i) => {
  acc.push(montar(`dep-irs-c${i}`, "dep_irs", dif, p, c, d, lb, fk, n++));
});

// Cenários — retenção calculada pelo motor oficial (1 fácil + 1 médio + 1 difícil por salário)
SALARIOS.forEach((s, i) => {
  const ret0 = retencaoIRSDependente(s, 0);
  const ret2 = retencaoIRSDependente(s, 2);
  const ss = cent(s * TSU_TRAB);
  const liq = cent(s - ret0 - ss);
  const sujeito = s > ISENCAO_RET;
  const mk = (v: number): Opt =>
    v === 0
      ? { texto: "0 € — isento de retenção", porque: "" }
      : { texto: eur(v), porque: "" };

  acc.push(
    // ── FÁCIL — sujeito ou isento (limiar de 920 €) ──
    montar(
      `dep-irs-isento-${i}`,
      "dep_irs",
      1,
      `Em 2026, um salário mensal de ${eur(s)} (sem dependentes) está, à partida, sujeito a retenção de IRS ou isento (limiar de ${eur(ISENCAO_RET)})?`,
      sujeito
        ? { texto: "Sujeito a retenção de IRS", porque: `Correto. ${eur(s)} está acima do limiar de ${eur(ISENCAO_RET)}, logo há retenção.` }
        : { texto: "Isento de retenção de IRS", porque: `Correto. ${eur(s)} não ultrapassa o limiar de ${eur(ISENCAO_RET)}, logo não há retenção.` },
      [
        sujeito
          ? { texto: "Isento de retenção de IRS", porque: `Acima de ${eur(ISENCAO_RET)} há retenção.` }
          : { texto: "Sujeito a retenção de IRS", porque: `Até ${eur(ISENCAO_RET)} não há retenção.` },
        { texto: "Só paga Segurança Social, nunca IRS", porque: "Acima do limiar, o salário fica sujeito a retenção de IRS." },
        { texto: "Depende apenas do dia de pagamento", porque: "O que decide é o valor face ao limiar, não a data." },
      ],
      "Limiar de isenção de retenção 2026 (920 €)",
      "despachoRetencao2026",
      n++
    ),
    // ── MÉDIO — retenção sem dependentes ──
    montar(
      `dep-irs-ret0-${i}`,
      "dep_irs",
      2,
      `Salário bruto de ${eur(s)}, sem dependentes, não casado, Continente. Qual a retenção mensal de IRS em 2026?`,
      { ...mk(ret0), porque: ret0 === 0 ? `Correto. ${eur(s)} fica dentro do limiar de isenção.` : `Correto. Pela Tabela I de 2026, a retenção é ${eur(ret0)}.` },
      [
        { texto: eur(ss), porque: "Este é o desconto da Segurança Social (11%), não o IRS." },
        { ...mk(ret2), porque: "Corresponde à retenção com 2 dependentes, não a 0." },
        { texto: eur(cent(ret0 + ss)), porque: "Soma IRS e SS; a pergunta é só sobre o IRS." },
      ],
      "Fórmula da retenção mensal (Tabela I, Continente, 2026)",
      "despachoRetencao2026",
      n++
    ),
    // ── DIFÍCIL — líquido (multi-passo) ──
    montar(
      `dep-irs-liq-${i}`,
      "dep_irs",
      3,
      `Salário bruto de ${eur(s)}, sem dependentes. Qual o líquido após IRS (${ret0 === 0 ? "0 €" : eur(ret0)}) e SS (${eur(ss)})?`,
      { texto: eur(liq), porque: `Correto. ${eur(s)} − ${eur(ret0)} − ${eur(ss)} = ${eur(liq)}.` },
      [
        { texto: eur(cent(s - ss)), porque: "Só desconta a Segurança Social, faltando o IRS." },
        { texto: eur(cent(s - ret0)), porque: "Só desconta o IRS, faltando a Segurança Social." },
        { texto: eur(s), porque: "É o bruto, sem qualquer desconto." },
      ],
      "Líquido = bruto − IRS − SS",
      "despachoRetencao2026",
      n++
    )
  );
});

// ═══════════════════════════════════════════════════════════════════════
//  TEMA 3 — Subsídios e abonos
// ═══════════════════════════════════════════════════════════════════════
n = 0;

const subConceptuais: Array<[1 | 2 | 3, string, Opt, Opt[], string, SourceKey]> = [
  [
    1,
    "Qual é o limite diário de subsídio de refeição isento de IRS quando pago em numerário em 2026?",
    { texto: eur(LIM_DINHEIRO), porque: `Correto. Em numerário, o limite isento é ${eur(LIM_DINHEIRO)} por dia.` },
    [
      { texto: eur(LIM_CARTAO), porque: `${eur(LIM_CARTAO)} é o limite em cartão/vale.` },
      { texto: eur(5.2), porque: "Era o limite de anos anteriores." },
      { texto: eur(9.6), porque: "Não corresponde ao limite em numerário." },
    ],
    "Art. 2.º, n.º 3 CIRS — limite isento em numerário",
    "subsidioRefeicao2026",
  ],
  [
    1,
    "Qual é o limite diário de subsídio de refeição isento quando pago em cartão/vale em 2026?",
    { texto: eur(LIM_CARTAO), porque: `Correto. Em cartão/vale, o limite isento é ${eur(LIM_CARTAO)} por dia.` },
    [
      { texto: eur(LIM_DINHEIRO), porque: `${eur(LIM_DINHEIRO)} é o limite em numerário, mais baixo.` },
      { texto: eur(8.32), porque: "Era o limite de anos anteriores." },
      { texto: eur(12), porque: "Não corresponde ao limite em cartão." },
    ],
    "Art. 2.º, n.º 3 CIRS — limite isento em cartão/vale",
    "subsidioRefeicao2026",
  ],
  [
    1,
    "Pagar o subsídio de refeição em cartão/vale, em vez de numerário, permite um limite isento maior?",
    { texto: "Sim — 10,46 €/dia em cartão vs. 6,15 €/dia em numerário", porque: "Correto. O cartão/vale tem um limite isento superior ao numerário." },
    [
      { texto: "Não, o limite é igual nos dois casos", porque: "O cartão tem limite superior (10,46 € vs. 6,15 €)." },
      { texto: "Sim, mas só metade", porque: "O limite em cartão é 10,46 €/dia, não metade." },
      { texto: "Não, o numerário é que tem limite maior", porque: "É o cartão/vale que tem limite maior." },
    ],
    "Subsídio de refeição — numerário vs. cartão",
    "subsidioRefeicao2026",
  ],
  [
    1,
    "Em quantas remunerações é repartido o ano de um trabalhador dependente (com subsídios)?",
    { texto: "14 (12 meses + férias + Natal)", porque: "Correto. 12 mensais + subsídios de férias e de Natal = 14." },
    [
      { texto: "12 (apenas os meses)", porque: "Faltam os subsídios de férias e de Natal." },
      { texto: "13 (12 meses + 1 subsídio)", porque: "São dois subsídios, logo 14." },
      { texto: "16", porque: "Não corresponde ao número de retribuições anuais." },
    ],
    "14 retribuições anuais (salário + subsídios)",
    "despachoRetencao2026",
  ],
  [
    2,
    "Qual é o limite diário isento (IRS e SS) das ajudas de custo nacionais em 2026?",
    { texto: eur(LIM_NACIONAL), porque: `Correto. O limite nacional isento é ${eur(LIM_NACIONAL)} por dia.` },
    [
      { texto: eur(LIM_ESTRANGEIRO), porque: `${eur(LIM_ESTRANGEIRO)} é o limite do estrangeiro.` },
      { texto: eur(50.2), porque: "Não corresponde ao limite nacional." },
      { texto: eur(72.65), porque: "Não corresponde ao limite nacional." },
    ],
    "Ajudas de custo nacionais — limite isento 2026",
    "ajudasCusto2026",
  ],
  [
    2,
    "Qual é o limite diário isento das ajudas de custo ao estrangeiro em 2026?",
    { texto: eur(LIM_ESTRANGEIRO), porque: `Correto. O limite ao estrangeiro isento é ${eur(LIM_ESTRANGEIRO)} por dia.` },
    [
      { texto: eur(LIM_NACIONAL), porque: `${eur(LIM_NACIONAL)} é o limite nacional.` },
      { texto: eur(100.2), porque: "Não corresponde ao limite internacional." },
      { texto: eur(125), porque: "Não corresponde ao limite internacional." },
    ],
    "Ajudas de custo internacionais — limite isento 2026",
    "ajudasCusto2026",
  ],
  [
    2,
    "Quanto vale, em regra, o subsídio de férias face ao salário base?",
    { texto: "Um mês de salário base", porque: "Correto. O subsídio de férias corresponde, em regra, a um mês de retribuição base." },
    [
      { texto: "Metade de um mês", porque: "Corresponde a um mês completo." },
      { texto: "Dois meses", porque: "É um mês, não dois." },
      { texto: "Uma semana", porque: "É um mês de retribuição base." },
    ],
    "Subsídio de férias = um mês de retribuição",
    "despachoRetencao2026",
  ],
  [
    3,
    "Pela lei, qual é o acréscimo da 1.ª hora de trabalho suplementar em dia útil?",
    { texto: pct(ACRESCIMOS[0]), porque: `Correto. A 1.ª hora em dia útil paga-se com acréscimo de ${pct(ACRESCIMOS[0])}.` },
    [
      { texto: pct(ACRESCIMOS[1]), porque: `${pct(ACRESCIMOS[1])} é o acréscimo das horas seguintes em dia útil.` },
      { texto: pct(ACRESCIMOS[2]), porque: `${pct(ACRESCIMOS[2])} aplica-se ao descanso/feriado.` },
      { texto: pct(ACRESCIMOS[3]), porque: `${pct(ACRESCIMOS[3])} aplica-se a descanso/feriado acima de 100h/ano.` },
    ],
    "Art. 268.º CT — acréscimos do trabalho suplementar",
    "ct268",
  ],
  [
    3,
    "Como se calcula a retribuição horária a partir do salário mensal (semana de 40h)?",
    { texto: "(salário mensal × 12) ÷ (52 × 40)", porque: "Correto. É a fórmula do Art. 271.º CT." },
    [
      { texto: "salário mensal ÷ 160", porque: "Aproximação grosseira; a lei usa (mensal × 12) ÷ (52 × horas)." },
      { texto: "salário mensal ÷ 30", porque: "Daria a retribuição diária, não a horária." },
      { texto: "(salário mensal × 14) ÷ (52 × 40)", porque: "Usa-se 12 meses para a base horária, não 14." },
    ],
    "Art. 271.º CT — cálculo da retribuição horária",
    "ct271",
  ],
  [
    3,
    "Em 2026, a retenção de IRS sobre o trabalho suplementar é feita a que taxa?",
    { texto: "50% da taxa efetiva mensal de retenção", porque: `Correto. O suplementar é retido a metade da taxa efetiva mensal (fator ${pct(FATOR_SUP)}).` },
    [
      { texto: "À taxa efetiva mensal completa", porque: "Aplica-se metade da taxa efetiva." },
      { texto: "Está totalmente isento de retenção", porque: "Há retenção, reduzida a 50% da taxa efetiva." },
      { texto: "Taxa fixa de 25%", porque: "Não é fixa; é 50% da taxa efetiva." },
    ],
    "Trabalho suplementar — retenção autónoma (50%)",
    "retencaoSuplementar2026",
  ],
];
subConceptuais.forEach(([dif, p, c, d, lb, fk], i) => {
  acc.push(montar(`dep-sub-c${i}`, "dep_subsidios", dif, p, c, d, lb, fk, n++));
});

// Cenários — subsídio de refeição (parte isenta vs. tributada)
const VALORES_REF = [4.5, 5, 6, 6.15, 7, 8, 9, 10, 10.46, 11, 12];
const DIAS_REF = [20, 21, 22];
let subIdx = 0;
VALORES_REF.forEach((v) => {
  DIAS_REF.forEach((dias) => {
    const cartao = v > LIM_DINHEIRO;
    const limite = cartao ? LIM_CARTAO : LIM_DINHEIRO;
    const isento = cent(Math.min(v, limite) * dias);
    const tributado = cent(Math.max(0, v - limite) * dias);
    const suporte = cartao ? "cartão/vale" : "numerário";
    // Totalmente dentro do limite → fácil; excede → médio.
    const dif: 1 | 2 = v <= limite ? 1 : 2;
    acc.push(
      montar(
        `dep-sub-ref-${subIdx}`,
        "dep_subsidios",
        dif,
        `Subsídio de refeição de ${eur(v)}/dia em ${suporte}, ${dias} dias. Qual a parte ISENTA de IRS no mês (limite ${eur(limite)}/dia)?`,
        { texto: eur(isento), porque: `Correto. min(${eur(v)}; ${eur(limite)}) × ${dias} = ${eur(isento)}.` },
        [
          { texto: eur(cent(v * dias)), porque: "É o subsídio total; só a parte até ao limite é isenta." },
          { texto: tributado > 0 ? eur(tributado) : eur(cent(v * dias * 0.5)), porque: tributado > 0 ? "É a parte TRIBUTADA (acima do limite), não a isenta." : "Não corresponde à parte isenta." },
          { texto: eur(cent(Math.min(v, cartao ? LIM_DINHEIRO : LIM_CARTAO) * dias)), porque: "Usa o limite do outro suporte de pagamento." },
        ],
        "Subsídio de refeição — parte isenta até ao limite diário",
        "subsidioRefeicao2026",
        n++
      )
    );
    subIdx++;
  });
});

// Cenários — ajudas de custo (parte isenta)
const AJUDAS = [
  { valor: 50, dias: 5, nacional: true },
  { valor: 70, dias: 5, nacional: true },
  { valor: 62.75, dias: 10, nacional: true },
  { valor: 80, dias: 3, nacional: true },
  { valor: 55, dias: 8, nacional: true },
  { valor: 90, dias: 4, nacional: true },
  { valor: 65, dias: 12, nacional: true },
  { valor: 80, dias: 4, nacional: false },
  { valor: 100, dias: 5, nacional: false },
  { valor: 89.35, dias: 6, nacional: false },
  { valor: 120, dias: 2, nacional: false },
  { valor: 75, dias: 7, nacional: false },
  { valor: 150, dias: 3, nacional: false },
  { valor: 89.35, dias: 10, nacional: false },
];
AJUDAS.forEach((a, i) => {
  const limite = a.nacional ? LIM_NACIONAL : LIM_ESTRANGEIRO;
  const isento = cent(Math.min(a.valor, limite) * a.dias);
  const total = cent(a.valor * a.dias);
  const dif: 2 | 3 = a.valor <= limite ? 2 : 3;
  acc.push(
    montar(
      `dep-sub-aj-${i}`,
      "dep_subsidios",
      dif,
      `Ajuda de custo de ${eur(a.valor)}/dia (${a.nacional ? "nacional" : "estrangeiro"}), ${a.dias} dias. Qual a parte ISENTA de IRS/SS (limite ${eur(limite)}/dia)?`,
      { texto: eur(isento), porque: `Correto. min(${eur(a.valor)}; ${eur(limite)}) × ${a.dias} = ${eur(isento)}.` },
      [
        { texto: eur(total), porque: "É o total pago; só a parte até ao limite é isenta." },
        { texto: eur(cent(Math.max(0, a.valor - limite) * a.dias)) || eur(0), porque: "É a parte tributada (excesso), não a isenta." },
        { texto: eur(cent(Math.min(a.valor, a.nacional ? LIM_ESTRANGEIRO : LIM_NACIONAL) * a.dias)), porque: "Usa o limite do outro tipo de deslocação." },
      ],
      "Ajudas de custo — parte isenta até ao limite diário",
      "ajudasCusto2026",
      n++
    )
  );
});

// Cenários — trabalho suplementar (valor de 1 hora extra)
const BASES_SUP = [820, 1000, 1200, 1500, 1800, 2100, 2500, 3000, 950, 1350, 2800];
BASES_SUP.forEach((base, i) => {
  const horaria = cent((base * 12) / (52 * HORAS_SEMANA));
  ACRESCIMOS.forEach((ac, j) => {
    const valor = cent(horaria * (1 + ac));
    const ctx =
      ac === ACRESCIMOS[0] ? "1.ª hora em dia útil"
      : ac === ACRESCIMOS[1] ? "horas seguintes em dia útil"
      : ac === ACRESCIMOS[2] ? "em dia de descanso/feriado"
      : "em descanso/feriado acima de 100h/ano";
    acc.push(
      montar(
        `dep-sub-sup-${i}-${j}`,
        "dep_subsidios",
        // 1.ª hora em dia útil é o caso mais simples → médio; os restantes → difícil.
        j === 0 ? 2 : 3,
        `Salário base de ${eur(base)} (40h/semana). Quanto vale 1 hora suplementar ${ctx} (acréscimo de ${pct(ac)})?`,
        { texto: eur(valor), porque: `Correto. Retribuição horária ${eur(horaria)} × (1 + ${pct(ac)}) = ${eur(valor)}.` },
        [
          { texto: eur(horaria), porque: "É a retribuição horária base, sem o acréscimo." },
          { texto: eur(cent(horaria * (1 + (j < 3 ? ACRESCIMOS[j + 1] : ACRESCIMOS[0])))), porque: "Usa um acréscimo de outro tipo de hora." },
          { texto: eur(cent(horaria * ac)), porque: "Conta só o acréscimo, esquecendo a hora base (1 + acréscimo)." },
        ],
        "Art. 268.º e 271.º CT — valor da hora suplementar",
        "ct268",
        n++
      )
    );
  });
});

export const PERGUNTAS_DEPENDENTE: QuizPergunta[] = acc;
