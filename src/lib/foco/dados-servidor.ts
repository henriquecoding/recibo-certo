import "server-only";

// ═══════════════════════════════════════════════════════════════════════
//  OS NÚMEROS DOS TRÊS PALCOS NOVOS — calculados aqui, no servidor
//  ---------------------------------------------------------------------
//  Nenhum destes valores é escrito à mão. Saem dos mesmos motores que as
//  ferramentas usam, e por isso não podem divergir delas.
//
//  Já aconteceu: os cartões do Hero de recibo verde e de vencimento
//  estavam escritos à mão e a Segurança Social de um recibo de 2 000 €
//  tinha 299 € por alguém ter truncado 299,60 em vez de arredondar. Um
//  valor a menos não é grave; o mecanismo que o deixou envelhecer sozinho
//  é que era.
//
//  Para o cliente atravessam só as strings e os números que a demonstração
//  desenha — os motores ficam deste lado da fronteira.
// ═══════════════════════════════════════════════════════════════════════

import { calcular } from "@/lib/fiscal";
import { calcularVencimento, compararCategorias } from "@/lib/fiscal-dependente";
import { proximoPagamentoSS } from "@/lib/fiscal-ss-prazos";
import { AVENCA_SOCIEDADE_ANUAL_MEDIA } from "@/lib/contabilista";
import type { DadosRecibo } from "@/components/foco/recibos/PalcoRecibos";
import type { DadosSalario } from "@/components/foco/salario/PalcoSalario";
import type { DadosEmpresa, PontoComparacao } from "@/components/foco/empresa/PalcoEmpresa";

const RECIBO_EXEMPLO = 2_000;
const SALARIO_EXEMPLO = 1_500;
const FATURACAO_EXEMPLO = 30_000;

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
] as const;

/** «20 de julho», a partir de uma data. */
const porExtenso = (d: Date) => `${d.getDate()} de ${MESES[d.getMonth()]}`;

// ── Recibos verdes ────────────────────────────────────────────────────

/**
 * Um recibo de 2 000 € ao abrigo do Art. 151.º, atividade estabelecida
 * (2.º ano ou seguinte). É o mesmo exemplo que a homepage antiga usava,
 * agora com a data do próximo pagamento à Segurança Social a sério.
 */
export function dadosRecibo(agora = new Date()): DadosRecibo {
  const r = calcular({
    bruto: RECIBO_EXEMPLO,
    tipo: "art151",
    regiao: "continente",
    regimeIVA: "isento",
    baseSS: "servicos",
    dispensaRetencao: false,
    isencaoSSPrimeiroAno: false,
    acumulaEmprego: false,
  });

  const prazo = proximoPagamentoSS(agora);
  const dias = Math.max(
    0,
    Math.ceil((prazo.getTime() - agora.getTime()) / 86_400_000),
  );

  return {
    bruto: r.bruto,
    liquido: r.liquido,
    retencaoIRS: r.retencaoIRS,
    segSocial: r.segSocial,
    taxaRetencao: r.taxaRetencao,
    prazoSS: porExtenso(prazo),
    diasParaPrazo: dias,
  };
}

// ── Salário ───────────────────────────────────────────────────────────

/**
 * O erro encenado é REAL e comum: a entidade aplicou a tabela de retenção
 * sem o dependente que a pessoa declarou. É o tipo de engano que ninguém
 * apanha a olho e que só se vê pondo as duas contas lado a lado — que é
 * exatamente o que este palco existe para fazer.
 *
 * As duas colunas saem do mesmo motor com a única diferença a ser o
 * dependente. Inventar a linha errada à mão seria encenar uma auditoria
 * em vez de a fazer.
 */
export function dadosSalario(): DadosSalario {
  const comDependente = calcularVencimento({
    salarioBruto: SALARIO_EXEMPLO,
    dependentes: 1,
  });
  const semDependente = calcularVencimento({
    salarioBruto: SALARIO_EXEMPLO,
    dependentes: 0,
  });

  const diferencaMensal = Math.abs(comDependente.liquido - semDependente.liquido);

  return {
    bruto: comDependente.bruto,
    ss: comDependente.ssTrabalhador,
    // O recibo aplicou a tabela SEM o dependente — reteve a mais.
    irsRecibo: semDependente.irsRetido,
    irsCerto: comDependente.irsRetido,
    liquidoRecibo: semDependente.liquido,
    liquidoCerto: comDependente.liquido,
    // Catorze meses: doze de vencimento mais os dois subsídios.
    diferencaAnual: diferencaMensal * 14,
    motivo:
      "A retenção foi calculada pela tabela de quem não tem dependentes. Com um dependente declarado, a tabela é outra e a retenção é mais baixa.",
  };
}

// ── Empresa ───────────────────────────────────────────────────────────

/**
 * O eixo vai até 190k, e não até 150k, por uma razão que só se vê a olho.
 *
 * Com o teto em 150k o cruzamento caía aos 93% da largura — encostado à
 * direita, sem nada depois dele. Um ponto de viragem que acontece na
 * moldura não se lê como viragem: lê-se como as duas linhas a acabarem
 * juntas. Com o teto em 190k o cruzamento fica a ~71% e sobram dois
 * pontos para as linhas se separarem depois de se cruzarem — que é a
 * única coisa que este gráfico tem para mostrar.
 */
const ESCADA = [
  15_000, 25_000, 40_000, 55_000, 70_000, 90_000,
  110_000, 130_000, 150_000, 170_000, 190_000,
] as const;

/**
 * Os dois caminhos traçados sobre o mesmo eixo, e o ponto onde se cruzam.
 *
 * `empresaSemCustos` é a mesma sociedade com a contabilidade devolvida ao
 * bolso — não é um cenário real, é o CONTRAFACTUAL de que o ato 3 precisa
 * para mostrar o fosso. Sem ele, «empresa» parece sempre melhor acima de
 * um limiar e ninguém vê o que teve de ser recuperado primeiro.
 */
export function dadosEmpresa(): DadosEmpresa {
  const pontos: PontoComparacao[] = ESCADA.map((faturacao) => {
    const c = compararCategorias({ brutoAnual: faturacao, dependentes: 0 });
    return {
      faturacao,
      freelancer: Math.round(c.freelancer.liquido),
      empresa: Math.round(c.empresa.liquido),
      empresaSemCustos: Math.round(c.empresa.liquido + AVENCA_SOCIEDADE_ANUAL_MEDIA),
    };
  });

  // O cruzamento por varredura fina, e não por interpolação entre os
  // pontos desenhados: o desenho tem onze pontos porque onze chegam para
  // a linha, não porque a resposta viva neles.
  let cruzamento: number | null = null;
  for (let f = ESCADA[0]; f <= ESCADA[ESCADA.length - 1]; f += 1_000) {
    const c = compararCategorias({ brutoAnual: f, dependentes: 0 });
    if (c.empresa.liquido > c.freelancer.liquido) {
      cruzamento = f;
      break;
    }
  }

  const exemplo = compararCategorias({ brutoAnual: FATURACAO_EXEMPLO, dependentes: 0 });

  return {
    pontos,
    cruzamento,
    custoFixo: Math.round(AVENCA_SOCIEDADE_ANUAL_MEDIA),
    exemplo: FATURACAO_EXEMPLO,
    exemploFreelancer: Math.round(exemplo.freelancer.liquido),
    exemploEmpresa: Math.round(exemplo.empresa.liquido),
  };
}
