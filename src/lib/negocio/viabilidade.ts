// ═══════════════════════════════════════════════════════════════════════
//  VIABILIDADE — o ponto de equilíbrio e a robustez do mix
//  ---------------------------------------------------------------------
//  O break-even de UMA oferta é uma divisão. O de um NEGÓCIO com três
//  ofertas de margens diferentes não é: depende do mix, porque vender
//  mais workshops e menos consultoria muda o número.
//
//  ── COMO SE RESOLVE SEM INVENTAR ───────────────────────────────────
//  Mantendo o mix atual. A «venda média» do negócio tem uma contribuição
//  média — a contribuição total a dividir pelas unidades totais — e o
//  break-even é quantas vendas médias pagam a estrutura.
//
//  É uma aproximação HONESTA e diz-se que o é: se o mix mudar, o número
//  muda. A alternativa — otimizar o mix — daria um número mais bonito e
//  menos verdadeiro, porque nenhum negócio escolhe o mix que quer.
//
//  ── O CASO QUE A FÓRMULA NÃO COBRE ─────────────────────────────────
//  Contribuição ≤ 0. Aí não há ponto de equilíbrio nenhum: vender mais
//  afunda mais. `Infinity` seria defensável e inútil — a mesma decisão
//  que `pricing/motores/breakeven.ts` já tomou, e pela mesma razão.
// ═══════════════════════════════════════════════════════════════════════

import { cent, dividir, num, unidades } from "@/lib/pricing/numeros";
import { agregar, temTrabalhadorValido, type AgregadoNegocio } from "./agregar";
import { capacidadeDaEquipa, diagnosticarCapacidade, gargaloDeHoras } from "./capacidade";
import { detetarDuplicacoes } from "./duplicacao";
import { levantarPressupostos } from "./pressupostos";
import { analisarSensibilidade } from "./sensibilidade";
import { projetarCaixa } from "./caixa";
import type {
  AvisoNegocio,
  BreakEvenNegocio,
  ConfiancaNegocio,
  ContextoNegocio,
  DiagnosticoConcentracao,
  ResultadoNegocio,
  ResultadoOfertaNegocio,
} from "./tipos";

// ─── Break-even global ─────────────────────────────────────────────────

export function calcularBreakEvenNegocio(a: AgregadoNegocio): BreakEvenNegocio {
  const fixos = Math.max(0, a.custosFixosMes);
  const vendasEsperadas = a.unidadesMes;

  const contribuicaoMedia = dividir(a.margemContribuicaoMes, vendasEsperadas);
  const receitaMedia = dividir(a.receitaSemIVAMes, vendasEsperadas);

  if (vendasEsperadas <= 0) {
    // ── O negócio declarado em bloco (§6) ─────────────────────────
    //  Há faturação e não há unidades: quem trabalha a partir da
    //  contabilidade não conta vendas, conta volume de negócios. Dizer-lhe
    //  «0 vendas por mês» seria uma resposta errada com ar de resposta.
    if (a.receitaSemIVAMes > 0) return equilibrioEmReceita(a, fixos);

    return {
      possivel: false,
      base: "unidades",
      vendasMes: 0,
      receitaSemIVAMes: 0,
      vendasEsperadasMes: 0,
      folgaVendas: 0,
      progresso: 0,
      nota: "Ainda não há vendas planeadas. Diz quantas contas vender de cada oferta e o ponto de equilíbrio aparece.",
    };
  }

  if (contribuicaoMedia <= 0) {
    return {
      possivel: false,
      base: "unidades",
      vendasMes: 0,
      receitaSemIVAMes: 0,
      vendasEsperadasMes: vendasEsperadas,
      folgaVendas: 0,
      progresso: 0,
      nota:
        "Ao preço e aos custos atuais, cada venda não cobre sequer os custos variáveis. Não há ponto de equilíbrio: vender mais aumenta o prejuízo em vez de o reduzir. O problema está no preço ou no custo, não no volume.",
    };
  }

  if (fixos <= 0) {
    return {
      possivel: true,
      base: "unidades",
      vendasMes: 0,
      receitaSemIVAMes: 0,
      vendasEsperadasMes: vendasEsperadas,
      folgaVendas: vendasEsperadas,
      progresso: 1,
      nota:
        "Não declaraste custos de estrutura, por isso qualquer venda com margem já dá lucro. Vale a pena confirmar: contabilidade, software, seguros e sede contam mesmo nos meses sem vendas.",
    };
  }

  const vendasMes = unidades(dividir(fixos, contribuicaoMedia));
  const folga = vendasEsperadas - vendasMes;

  return {
    possivel: true,
    base: "unidades",
    vendasMes,
    receitaSemIVAMes: cent(vendasMes * receitaMedia),
    vendasEsperadasMes: vendasEsperadas,
    folgaVendas: folga,
    progresso: dividir(vendasEsperadas, vendasMes),
    nota:
      folga < 0
        ? `Ao ritmo que esperas faltam ${Math.abs(folga)} vendas por mês para as contas fecharem.`
        : undefined,
  };
}

/**
 * O ponto de equilíbrio de quem declarou o negócio em bloco.
 *
 * A conta é a mesma do manual — custos fixos a dividir pela taxa de
 * margem de contribuição — mas a resposta vem em euros de faturação, que
 * é a única unidade que este caso tem. `vendasMes` fica a zero e
 * `base: "receita"` diz à interface para não falar de vendas.
 */
function equilibrioEmReceita(a: AgregadoNegocio, fixos: number): BreakEvenNegocio {
  const taxa = dividir(a.margemContribuicaoMes, a.receitaSemIVAMes);

  if (taxa <= 0) {
    return {
      possivel: false,
      base: "receita",
      vendasMes: 0,
      receitaSemIVAMes: 0,
      vendasEsperadasMes: 0,
      folgaVendas: 0,
      progresso: 0,
      nota:
        "Os custos da atividade consomem toda a faturação declarada. Não há ponto de equilíbrio: faturar mais aumenta o prejuízo. O problema está no preço ou no custo, não no volume.",
    };
  }

  if (fixos <= 0) {
    return {
      possivel: true,
      base: "receita",
      vendasMes: 0,
      receitaSemIVAMes: 0,
      vendasEsperadasMes: 0,
      folgaVendas: 0,
      progresso: 1,
      nota:
        "Não declaraste custos de estrutura, por isso toda a margem já é lucro. Vale a pena confirmar: contabilidade, software, seguros e sede contam mesmo nos meses fracos.",
    };
  }

  const necessaria = cent(dividir(fixos, taxa));
  const folga = cent(a.receitaSemIVAMes - necessaria);

  return {
    possivel: true,
    base: "receita",
    vendasMes: 0,
    receitaSemIVAMes: necessaria,
    vendasEsperadasMes: 0,
    folgaVendas: 0,
    progresso: dividir(a.receitaSemIVAMes, necessaria),
    nota:
      folga < 0
        ? `Faltam ${fmt(Math.abs(folga))} de faturação por mês para as contas fecharem.`
        : `Acima de ${fmt(necessaria)} por mês de volume de negócios, a estrutura está paga.`,
  };
}

// ─── Concentração ──────────────────────────────────────────────────────

/**
 * Quanto do negócio depende de uma só oferta.
 *
 * ⚠️ Isto NÃO é um risco fiscal e não se apresenta como tal. É
 * operacional: se 80% da receita vem de uma coisa, um mês mau nessa coisa
 * é um mês mau no negócio inteiro.
 */
export function diagnosticarConcentracao(
  ofertas: readonly ResultadoOfertaNegocio[],
): DiagnosticoConcentracao {
  const ativas = ofertas.filter((o) => o.mensal.receitaSemIVA > 0);

  if (ativas.length === 0) {
    return {
      estado: "unica",
      maiorPeso: 0,
      maiorNome: "",
      hhi: 0,
      mensagem: "Ainda não há receita planeada para avaliar a concentração.",
    };
  }

  const maior = ativas.reduce((m, o) => (o.peso > m.peso ? o : m), ativas[0]);
  const hhi = ativas.reduce((s, o) => s + o.peso * o.peso, 0);

  if (ativas.length === 1) {
    return {
      estado: "unica",
      maiorPeso: 1,
      maiorNome: maior.oferta.nome,
      hhi: 1,
      mensagem: `Todo o negócio depende de ${maior.oferta.nome}. Não é necessariamente mau — muitos negócios começam assim — mas significa que um mês mau nesta oferta é um mês mau em tudo.`,
    };
  }

  const estado = maior.peso >= 0.7 ? "concentrada" : maior.peso >= 0.45 ? "moderada" : "diversificada";
  const pct = (maior.peso * 100).toFixed(0);

  return {
    estado,
    maiorPeso: maior.peso,
    maiorNome: maior.oferta.nome,
    hhi,
    mensagem:
      estado === "concentrada"
        ? `${pct}% da receita vem de ${maior.oferta.nome}. Se essa procura cair, cai o negócio quase todo — vale a pena saber o que farias nesse mês.`
        : estado === "moderada"
          ? `${maior.oferta.nome} pesa ${pct}% da receita. É a oferta a proteger primeiro: é a que paga a maior parte da estrutura.`
          : `A receita está repartida — a maior oferta (${maior.oferta.nome}) pesa ${pct}%. Nenhuma queda isolada derruba o negócio.`,
  };
}

// ─── Confiança ─────────────────────────────────────────────────────────

/**
 * O estado de confiança do resultado.
 *
 * Estados semânticos, nunca uma percentagem: «83% confiável» inventaria
 * precisão sobre dados que a pessoa estimou de cabeça. É a mesma decisão
 * que `pricing/preenchimento.ts` tomou, com os mesmos três degraus.
 */
export function confiancaDe(contexto: ContextoNegocio, a: AgregadoNegocio): ConfiancaNegocio {
  const temEstrutura =
    (contexto.estrutura?.overheadMensal?.length ?? 0) > 0 ||
    temTrabalhadorValido(contexto.estrutura) ||
    contexto.respondidos.includes("estrutura-sem-custos");

  // ── O negócio declarado em bloco (§6, §86) ──────────────────────
  //  Um volume de negócios escrito por quem já fatura é trabalho da
  //  pessoa, não um exemplo nosso — e não passa por `respondidos` das
  //  ofertas porque não há ofertas. Mas também não é «real» só porque foi
  //  escrito: pode ser uma estimativa, e a proveniência diz «declarado
  //  pelo utilizador», nunca «real».
  const temBase = (contexto.base?.volumeAnual ?? 0) > 0;

  if (contexto.ofertas.length === 0) {
    if (!temBase) return "exploratorio";
    return temEstrutura ? "estruturado" : "estimado";
  }

  // Uma oferta conta como respondida quando a pessoa mexeu nos campos
  // essenciais dela — o mesmo critério da pricing engine, guardado por
  // oferta em `respondidos`.
  const ofertasComTrabalho = contexto.ofertas.filter((o) => o.respondidos.length > 0);
  if (ofertasComTrabalho.length === 0) return temBase ? "estimado" : "exploratorio";

  const temVolume = a.unidadesMes > 0 || temBase;

  if (ofertasComTrabalho.length === contexto.ofertas.length && temVolume && temEstrutura) {
    return "estruturado";
  }
  return "estimado";
}


export const ROTULO_CONFIANCA: Record<ConfiancaNegocio, string> = {
  exploratorio: "Exploratório",
  estimado: "Estimado",
  estruturado: "Estruturado",
};

export const EXPLICACAO_CONFIANCA: Record<ConfiancaNegocio, string> = {
  exploratorio: "Os números vêm dos exemplos do cenário. Responde a alguma coisa e passam a ser teus.",
  estimado: "Já há trabalho teu aqui, mas faltam pressupostos importantes por confirmar.",
  estruturado: "Ofertas, volumes e estrutura respondidos. É o cenário mais fiável que esta ferramenta consegue montar.",
};

// ─── Avisos ────────────────────────────────────────────────────────────

function reunirAvisos(contexto: ContextoNegocio, a: AgregadoNegocio, breakEven: BreakEvenNegocio): AvisoNegocio[] {
  const avisos: AvisoNegocio[] = [];

  for (const r of a.ofertas) {
    if (!r.ok) {
      avisos.push({
        id: `oferta-sem-preco-${r.oferta.id}`,
        severidade: "perigo",
        titulo: `${r.oferta.nome}: não há preço possível`,
        texto:
          r.preco.motivoTexto ??
          "Entre comissões, impostos e a margem pedida, não sobra nada de cada euro cobrado. Esta oferta não entra nas contas até o cenário mudar.",
        ofertaId: r.oferta.id,
      });
      continue;
    }
    if (r.contribuicaoMes < 0) {
      avisos.push({
        id: `oferta-contribuicao-negativa-${r.oferta.id}`,
        severidade: "perigo",
        titulo: `${r.oferta.nome} tira dinheiro em cada venda`,
        texto: `Cada venda custa mais do que rende. Ao volume que planeaste, são ${fmt(
          Math.abs(r.contribuicaoMes),
        )} por mês a sair — e vender mais piora, não melhora.`,
        ofertaId: r.oferta.id,
      });
    }
  }

  // Um resultado negativo é um resultado negativo, venha de ofertas ou de
  // uma base declarada. Prender o aviso a `ofertas.length > 0` fazia o
  // percurso de «já tenho empresa» esconder exatamente o que a pessoa veio
  // saber.
  if (a.resultadoOperacionalMes < 0 && (a.ofertas.length > 0 || a.receitaBaseMes > 0)) {
    avisos.push({
      id: "resultado-negativo",
      severidade: "perigo",
      titulo: "Neste cenário o negócio dá prejuízo",
      texto: `A margem de contribuição (${fmt(a.margemContribuicaoMes)}/mês) não chega para pagar a estrutura (${fmt(
        a.custosFixosMes,
      )}/mês). Faltam ${fmt(Math.abs(a.resultadoOperacionalMes))} por mês.`,
    });
  }

  if (breakEven.possivel && breakEven.folgaVendas < 0) {
    avisos.push({
      id: "abaixo-do-equilibrio",
      severidade: "atencao",
      titulo: "O volume esperado fica abaixo do ponto de equilíbrio",
      texto: `Precisas de ${breakEven.vendasMes} vendas por mês e planeaste ${breakEven.vendasEsperadasMes}. Faltam ${Math.abs(
        breakEven.folgaVendas,
      )}.`,
    });
  }

  const duplicacoes = detetarDuplicacoes(contexto);
  for (const d of duplicacoes) {
    avisos.push({
      id: `duplicacao-${d.ofertaId}-${d.custoEstruturaId}`,
      severidade: "atencao",
      titulo: "O mesmo custo está a ser contado duas vezes",
      texto: d.mensagem,
      ofertaId: d.ofertaId,
    });
  }

  if (a.temFiscalidadeVendedor && a.encargosVendedorMes > 0) {
    avisos.push({
      id: "encargos-vendedor",
      severidade: "info",
      titulo: "O resultado operacional ainda não é o que te fica",
      texto: `O preço das tuas ofertas já inclui ${fmt(
        a.encargosVendedorMes,
      )}/mês de Segurança Social e IRS. O resultado operacional está antes disso — é o número que serve para comparar independente com empresa, porque cada um deles tem o seu próprio imposto.`,
    });
  }

  return avisos;
}

// ─── O orquestrador ────────────────────────────────────────────────────

export interface OpcoesAnalise {
  /** Correr a sensibilidade (P1). Fora do caminho crítico do primeiro ecrã. */
  comSensibilidade?: boolean;
  /** Correr a projeção de caixa (P2). Só quando a pessoa a pede. */
  comCaixa?: boolean;
}

/**
 * O resultado completo de um negócio.
 *
 * Função pura e síncrona. Nada aqui calcula imposto: as ofertas passam
 * por `precificar()`, e a fiscalidade da sociedade ou a comparação de
 * regimes ficam para os adaptadores, que chamam os motores que já
 * existem.
 */
export function analisarNegocio(
  contexto: ContextoNegocio,
  opcoes: OpcoesAnalise = {},
): ResultadoNegocio {
  const a = agregar(contexto);
  const breakEven = calcularBreakEvenNegocio(a);

  // §40 — quem foi contratado para produzir acrescenta ao teto de horas.
  // Sem isto, contratar só subia o custo, e a ferramenta dizia sempre que
  // era má ideia.
  const equipa = capacidadeDaEquipa(contexto.estrutura);
  const capacidade = diagnosticarCapacidade(a.ofertas);
  const gargalo = gargaloDeHoras(a.ofertas, equipa);
  if (gargalo) capacidade.unshift(gargalo);

  const avisos = reunirAvisos(contexto, a, breakEven);

  for (const c of capacidade) {
    if (c.estado === "excedida") {
      avisos.push({
        id: `capacidade-${c.ofertaId}`,
        severidade: "atencao",
        titulo: "Este plano não cabe no mês",
        texto: c.mensagem,
        ofertaId: c.ofertaId === "__horas__" ? undefined : c.ofertaId,
      });
    }
  }

  return {
    ofertas: a.ofertas,

    receitaClienteMes: a.receitaClienteMes,
    receitaSemIVAMes: a.receitaSemIVAMes,
    ivaCobradoMes: a.ivaCobradoMes,
    custosVariaveisMes: a.custosVariaveisMes,
    margemContribuicaoMes: a.margemContribuicaoMes,
    overheadMes: a.overheadMes,
    custoTrabalhadoresMes: a.custoTrabalhadoresMes,
    resultadoOperacionalMes: a.resultadoOperacionalMes,

    receitaSemIVAAno: cent(a.receitaSemIVAMes * 12),
    custosOperacionaisAno: cent((a.custosVariaveisMes + a.custosFixosMes) * 12),
    resultadoOperacionalAno: cent(a.resultadoOperacionalMes * 12),

    encargosVendedorMes: a.encargosVendedorMes,
    resultadoDepoisEncargosMes: a.resultadoDepoisEncargosMes,
    temFiscalidadeVendedor: a.temFiscalidadeVendedor,

    breakEven,
    capacidade,
    capacidadeEquipaMes: equipa.horasMes,
    concentracao: diagnosticarConcentracao(a.ofertas),
    sensibilidade: opcoes.comSensibilidade ? analisarSensibilidade(contexto) : undefined,
    caixa: opcoes.comCaixa ? projetarCaixa(contexto, a) : undefined,

    confianca: confiancaDe(contexto, a),
    pressupostos: levantarPressupostos(contexto, a),
    avisos,
  };
}

const fmt = (n: number): string => `${cent(num(n)).toFixed(2).replace(".", ",")} €`;
