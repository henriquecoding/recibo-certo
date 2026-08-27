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
import { REGIME_SIMPLIFICADO } from "@/lib/fiscal-data";
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

// ┌───────────────────────────────────────────────────────────────────────┐
// │ A CONTABILIDADE ERA NARRADA E NÃO ERA DESCONTADA                      │
// │                                                                       │
// │ O palco dizia, por palavras e em `sr-only`, que «ter empresa custa    │
// │ cerca de 1 920 € por ano em contabilidade, antes de qualquer          │
// │ imposto, e é esse custo que empurra o ponto de viragem para a         │
// │ direita». Mas `compararCategorias` recebia o cenário SEM              │
// │ `custosEmpresa`, e o seu valor por omissão é zero. O ponto de         │
// │ viragem publicado era o de uma sociedade que não paga contabilista.   │
// │                                                                       │
// │ `empresaSemCustos` — o «contrafactual» — era `liquido + avença`, ou   │
// │ seja: um custo que nunca tinha sido subtraído, somado de volta. Não   │
// │ havia fosso nenhum para mostrar porque não havia fosso nenhum.        │
// │                                                                       │
// │ Com a avença contada, a viragem passa de ~148 000 € para ~180 500 €.  │
// │ É uma resposta diferente e é a verdadeira — e diz uma coisa que a     │
// │ anterior escondia: com os lucros todos retirados, a sociedade só      │
// │ passa à frente perto do TETO do regime simplificado.                  │
// └───────────────────────────────────────────────────────────────────────┘

/**
 * A escala vai de 15 000 € ao limite legal do regime simplificado.
 *
 * O teto não é uma escolha de enquadramento: acima de
 * `REGIME_SIMPLIFICADO.limite` (Art. 28.º do CIRS) a contabilidade
 * organizada deixa de ser opcional e a pergunta deste palco — «simplificado
 * ou sociedade?» — deixa de ter as duas respostas que compara. Parar
 * exatamente aí é a única fronteira honesta que a escala pode ter.
 */
const ESCALA_MIN = 15_000;
const ESCALA_MAX = REGIME_SIMPLIFICADO.limite.value;
const DEGRAU = 5_000;

/** Os pressupostos da cena, num sítio só. Ver a secção «Fontes» da página. */
const PRESSUPOSTOS = {
  dependentes: 0,
  custosEmpresa: AVENCA_SOCIEDADE_ANUAL_MEDIA,
} as const;

/**
 * Um cenário, com a repartição de cada euro nos dois caminhos.
 *
 * As duas repartições somam, cada uma, a faturação — é isso que permite
 * desenhar duas colunas da MESMA altura e deixar a comparação a cargo do
 * tamanho da fatia que fica. Não é uma coincidência aritmética a explorar:
 * é a identidade do próprio motor (`bruto = líquido + o que sai`), e o
 * teste `foco-empresa-interacao` exige que continue a fechar.
 */
const pontoEmpresa = (faturacao: number): PontoComparacao => {
  const c = compararCategorias({ brutoAnual: faturacao, ...PRESSUPOSTOS });
  return {
    faturacao,
    freelancer: Math.round(c.freelancer.liquido),
    empresa: Math.round(c.empresa.liquido),
    rv: {
      irs: Math.round(c.freelancer.irs),
      ss: Math.round(c.freelancer.ss),
    },
    soc: {
      // IRC e derrama juntos: a derrama são 1,5% do lucro e sozinha nunca
      // chega a ser uma fatia visível. Separá-la seria uma linha de legenda
      // a apontar para dois pixéis.
      irc: Math.round(c.empresa.irc + c.empresa.derrama),
      dividendos: Math.round(c.empresa.dividendos),
      contabilidade: Math.round(c.empresa.custosEmpresa),
    },
  };
};

/**
 * A faturação a partir da qual a sociedade passa à frente.
 *
 * Varre em dois passos — degraus de 5 000 € para encontrar o intervalo,
 * depois 250 € dentro dele. A varredura fina de ponta a ponta custava
 * ~370 simulações fiscais por pedido numa rota que é dinâmica; esta custa
 * menos de sessenta e dá a mesma resposta ao quarto de milhar.
 */
function encontrarViragem(): number | null {
  const ganha = (f: number) => {
    const c = compararCategorias({ brutoAnual: f, ...PRESSUPOSTOS });
    return c.empresa.liquido > c.freelancer.liquido;
  };
  let anterior = ESCALA_MIN;
  for (let f = ESCALA_MIN; f <= ESCALA_MAX; f += DEGRAU) {
    if (ganha(f)) {
      for (let fino = anterior; fino <= f; fino += 250) if (ganha(fino)) return fino;
      return f;
    }
    anterior = f;
  }
  return null;
}

/** Memória do processo: a cena não depende da data nem do pedido. */
let cacheEmpresa: DadosEmpresa | null = null;

/**
 * Os dois caminhos repartidos euro a euro, e o ponto onde se cruzam.
 *
 * Tudo o que atravessa a fronteira já são respostas: o browser escolhe
 * entre cenários calculados aqui e nunca reimplementa a conta a cada pixel
 * nem recebe o motor fiscal no pacote.
 */
export function dadosEmpresa(): DadosEmpresa {
  if (cacheEmpresa) return cacheEmpresa;

  const cruzamento = encontrarViragem();
  const degraus = Array.from(
    { length: Math.floor((ESCALA_MAX - ESCALA_MIN) / DEGRAU) + 1 },
    (_, indice) => ESCALA_MIN + indice * DEGRAU,
  );

  // O ponto exato da viragem entra na régua mesmo quando não cai num dos
  // degraus de 5 000 €. Assim é possível pousar precisamente na resposta
  // que o palco destaca — sem interpolar nem arredondar no cliente.
  const cenarios = [...new Set([...degraus, ...(cruzamento ? [cruzamento] : [])])]
    .sort((a, b) => a - b)
    .map(pontoEmpresa);

  const exemplo = compararCategorias({ brutoAnual: FATURACAO_EXEMPLO, ...PRESSUPOSTOS });

  cacheEmpresa = {
    cenarios,
    cruzamento,
    limiteSimplificado: ESCALA_MAX,
    custoFixo: Math.round(AVENCA_SOCIEDADE_ANUAL_MEDIA),
    exemplo: FATURACAO_EXEMPLO,
    exemploFreelancer: Math.round(exemplo.freelancer.liquido),
    exemploEmpresa: Math.round(exemplo.empresa.liquido),
  };
  return cacheEmpresa;
}
