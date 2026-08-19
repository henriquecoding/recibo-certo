// ═══════════════════════════════════════════════════════════════════════
//  OS BLOCOS DO MODO PRECISO — o que está lá dentro, dito por fora
//  ---------------------------------------------------------------------
//  Dez acordeões fechados, todos com o mesmo aspeto, nenhum a dizer o que
//  tem lá dentro nem o que muda no preço. O resultado observável eram dois
//  comportamentos, ambos maus:
//
//   · quem os abria todos desistia a meio;
//   · quem não abria nenhum levava um preço calculado com zero custos
//     fixos e zero comissões, apresentado como recomendação.
//
//  A NN/g diz a mesma coisa a partir da investigação: as pessoas acreditam
//  que dar mais informação produz mais exatidão, mas precisam de saber
//  QUAL informação vale o esforço. Um acordeão anónimo não lhes diz.
//
//  Por isso cada bloco declara aqui quatro coisas:
//
//    titulo/descricao  o que já dizia
//    porque            a razão de existir, numa frase de pessoa
//    oQueMuda          que número do resultado é que ele mexe
//    resumo(contexto)  o estado — «por preencher» ou «3 itens · 320 €/mês»
//
//  E declara os avisos do motor que o apontam como em falta, para o bloco
//  se destacar sozinho quando for ele que está a faltar. É o mesmo
//  princípio de `perguntas.ts`: dados, não `if` espalhado pelo JSX.
// ═══════════════════════════════════════════════════════════════════════

import type { ContextoPreco } from "./tipos";
import type { BlocoAvancado } from "./perguntas";

export interface MetaBloco {
  titulo: string;
  descricao: string;
  /** Que número do resultado é que este bloco mexe. Três a cinco palavras. */
  oQueMuda: string;
  /** `true` quando a pessoa já pôs aqui dados dela. */
  preenchido: (c: ContextoPreco) => boolean;
  /** O estado, para quem lê o cabeçalho fechado. */
  resumo: (c: ContextoPreco) => string;
  /** Avisos do motor que apontam este bloco como em falta. */
  avisos?: readonly string[];
  /**
   * Repor este bloco nos valores de partida do cenário.
   *
   * «Mudar de cenário» apagava tudo, e era a única saída de quem se
   * enganou num bloco. Repor é cirúrgico: devolve estes campos — e só
   * estes — ao que o cenário trazia.
   */
  repor: (c: ContextoPreco, base: ContextoPreco) => void;
}

const euros = (n: number): string => `${(Number.isFinite(n) ? n : 0).toFixed(2).replace(".", ",")} €`;
const pcto = (n: number): string => `${((Number.isFinite(n) ? n : 0) * 100).toFixed(0)}%`;
const positivo = (n: number | undefined): boolean => (n ?? 0) > 0;

export const BLOCOS: Record<BlocoAvancado, MetaBloco> = {
  fiscalidade: {
    titulo: "O teu enquadramento fiscal",
    descricao: "O que mais muda o preço em Portugal — e o que nenhuma calculadora pergunta",
    oQueMuda: "muda o preço todo",
    preenchido: (c) => c.vendedor.tipo !== "nao_sei" || positivo(c.vendedor.faturacaoAnualPrevista),
    resumo: (c) => {
      if (c.vendedor.tipo === "nao_sei") return "por preencher";
      const partes = [ROTULO_TIPO[c.vendedor.tipo] ?? c.vendedor.tipo];
      if (positivo(c.vendedor.faturacaoAnualPrevista)) {
        partes.push(`${euros(c.vendedor.faturacaoAnualPrevista!)}/ano`);
      }
      return partes.join(" · ");
    },
    avisos: ["sem-faturacao-anual", "isencao-art53-duplo-efeito", "zona-minimo-existencia"],
    repor: (c, base) => {
      c.vendedor = structuredClone(base.vendedor);
      c.canal.cliente = base.canal.cliente;
      c.produto.escalaoVenda = base.produto.escalaoVenda;
    },
  },

  custos_fixos: {
    titulo: "Contas que pagas mesmo sem vender",
    descricao: "Renda, contabilidade, software, seguros — repartidas por cada venda",
    oQueMuda: "muda o preço mínimo e o equilíbrio",
    preenchido: (c) => c.custos.fixos.length > 0,
    resumo: (c) => {
      if (c.custos.fixos.length === 0) return "por preencher";
      const total = c.custos.fixos.reduce((s, f) => s + f.mensal, 0);
      return `${c.custos.fixos.length} ${c.custos.fixos.length === 1 ? "conta" : "contas"} · ${euros(total)}/mês`;
    },
    avisos: ["sem-custos-fixos", "nao-cobre-fixos"],
    repor: (c, base) => void (c.custos.fixos = structuredClone(base.custos.fixos)),
  },

  custos_variaveis: {
    titulo: "Custos que só existem quando vendes",
    descricao: "Embalagem, etiquetas, portes, consumíveis, desperdício",
    oQueMuda: "muda o piso e a margem",
    preenchido: (c) =>
      c.custos.variaveis.length > 0 || positivo(c.custos.portesAbsorvidos) || positivo(c.custos.desperdicio),
    resumo: (c) => {
      const partes: string[] = [];
      if (c.custos.variaveis.length > 0) {
        const total = c.custos.variaveis.reduce((s, v) => s + v.porUnidade, 0);
        partes.push(`${euros(total)}/un.`);
      }
      if (positivo(c.custos.portesAbsorvidos)) partes.push(`portes ${euros(c.custos.portesAbsorvidos!)}`);
      if (positivo(c.custos.desperdicio)) partes.push(`quebra ${pcto(c.custos.desperdicio!)}`);
      return partes.length > 0 ? partes.join(" · ") : "por preencher";
    },
    repor: (c, base) => {
      c.custos.variaveis = structuredClone(base.custos.variaveis);
      c.custos.portesAbsorvidos = base.custos.portesAbsorvidos;
      c.custos.desperdicio = base.custos.desperdicio;
    },
  },

  desperdicio: {
    titulo: "Desperdício e quebra",
    descricao: "O que se perde antes de chegar a vender",
    oQueMuda: "sobe o custo por unidade",
    preenchido: (c) => positivo(c.custos.desperdicio),
    resumo: (c) => (positivo(c.custos.desperdicio) ? pcto(c.custos.desperdicio!) : "por preencher"),
    repor: (c, base) => void (c.custos.desperdicio = base.custos.desperdicio),
  },

  escaloes: {
    titulo: "Compras mais barato em quantidade?",
    descricao: "O custo por unidade que o fornecedor dá a partir de cada quantidade",
    oQueMuda: "muda o custo ao volume que esperas",
    preenchido: (c) => (c.custos.escaloes?.length ?? 0) > 0,
    resumo: (c) => {
      const n = c.custos.escaloes?.length ?? 0;
      return n === 0 ? "por preencher" : `${n} ${n === 1 ? "escalão" : "escalões"}`;
    },
    repor: (c, base) => void (c.custos.escaloes = structuredClone(base.custos.escaloes)),
  },

  comissoes: {
    titulo: "Comissões e meios de pagamento",
    descricao: "Incidem sobre o valor total da encomenda, com IVA",
    oQueMuda: "muda quanto te sobra de cada venda",
    preenchido: (c) =>
      (c.canal.marketplaceId !== undefined && c.canal.marketplaceId !== "nenhum") ||
      (c.canal.metodoPagamentoId !== undefined && c.canal.metodoPagamentoId !== "nenhum") ||
      positivo(c.canal.afiliadoPercentagem) ||
      positivo(c.canal.comissaoFixa),
    resumo: (c) => {
      const partes: string[] = [];
      if (c.canal.marketplaceId && c.canal.marketplaceId !== "nenhum") partes.push(c.canal.marketplaceId);
      if (c.canal.metodoPagamentoId && c.canal.metodoPagamentoId !== "nenhum") partes.push(c.canal.metodoPagamentoId);
      if (positivo(c.canal.afiliadoPercentagem)) partes.push(`afiliado ${pcto(c.canal.afiliadoPercentagem!)}`);
      return partes.length > 0 ? partes.join(" · ") : "sem comissões";
    },
    avisos: ["comissao-alta"],
    repor: (c, base) => {
      c.canal = { ...structuredClone(base.canal), cliente: c.canal.cliente };
    },
  },

  pagamento: {
    titulo: "Como recebes",
    descricao: "A taxa de processamento sai antes de o dinheiro chegar à conta",
    oQueMuda: "muda quanto te sobra de cada venda",
    preenchido: (c) => c.canal.metodoPagamentoId !== undefined && c.canal.metodoPagamentoId !== "nenhum",
    resumo: (c) =>
      c.canal.metodoPagamentoId && c.canal.metodoPagamentoId !== "nenhum"
        ? c.canal.metodoPagamentoId
        : "por preencher",
    repor: (c, base) => {
      c.canal.metodoPagamentoId = base.canal.metodoPagamentoId;
      c.canal.pagamentoPercentagem = base.canal.pagamentoPercentagem;
      c.canal.pagamentoFixa = base.canal.pagamentoFixa;
    },
  },

  devolucoes: {
    titulo: "Devoluções",
    descricao: "14 dias de livre resolução — e os portes de ida também são reembolsados",
    oQueMuda: "sobe o custo médio de cada venda",
    preenchido: (c) => positivo(c.custos.taxaDevolucao) || positivo(c.custos.custoDevolucao),
    resumo: (c) =>
      positivo(c.custos.taxaDevolucao)
        ? `${pcto(c.custos.taxaDevolucao!)} · ${euros(c.custos.custoDevolucao ?? 0)} cada`
        : "por preencher",
    avisos: ["devolucoes-online"],
    repor: (c, base) => {
      c.custos.taxaDevolucao = base.custos.taxaDevolucao;
      c.custos.custoDevolucao = base.custos.custoDevolucao;
    },
  },

  tempo_detalhe: {
    titulo: "As tuas horas a sério",
    descricao: "Ninguém fatura todas as horas que trabalha",
    oQueMuda: "muda o valor da tua hora",
    preenchido: (c) => c.tempo !== undefined,
    resumo: (c) =>
      c.tempo
        ? `${c.tempo.horasSemana} h/sem. · ${pcto(c.tempo.taxaFaturavel)} faturáveis`
        : "por preencher",
    avisos: ["capacidade-excedida"],
    repor: (c, base) => void (c.tempo = structuredClone(base.tempo)),
  },

  producao_detalhe: {
    titulo: "Como produzes",
    descricao: "Matérias, mão de obra, energia e depreciação do equipamento",
    oQueMuda: "muda o custo por unidade",
    preenchido: (c) => (c.producao?.materias.length ?? 0) > 0 || positivo(c.producao?.custoHoraMaoObra),
    resumo: (c) => {
      if (!c.producao) return "por preencher";
      const n = c.producao.materias.length;
      const partes: string[] = [];
      if (n > 0) partes.push(`${n} ${n === 1 ? "matéria" : "matérias"}`);
      if (positivo(c.producao.horasPorUnidade)) partes.push(`${c.producao.horasPorUnidade} h/un.`);
      return partes.length > 0 ? partes.join(" · ") : "por preencher";
    },
    repor: (c, base) => void (c.producao = structuredClone(base.producao)),
  },

  cac: {
    titulo: "Custo de trazer o cliente",
    descricao: "Publicidade e aquisição, repartidos pelas vendas que geram",
    oQueMuda: "sobe o custo de cada venda nova",
    preenchido: (c) => positivo(c.custos.cac),
    resumo: (c) => (positivo(c.custos.cac) ? `${euros(c.custos.cac!)} por cliente` : "por preencher"),
    repor: (c, base) => {
      c.custos.cac = base.custos.cac;
      c.custos.fracaoClientesNovos = base.custos.fracaoClientesNovos;
    },
  },

  desconto: {
    titulo: "Desconto ou promoção",
    descricao: "Com a regra legal dos 30 dias e o desconto máximo que aguentas",
    oQueMuda: "diz-te até onde podes descer",
    preenchido: (c) => positivo(c.desconto?.percentagem),
    resumo: (c) =>
      positivo(c.desconto?.percentagem) ? `${pcto(c.desconto!.percentagem)} de desconto` : "por preencher",
    avisos: ["desconto-destroi-margem", "desconto-volume-necessario", "regra-30-dias"],
    repor: (c, base) => void (c.desconto = structuredClone(base.desconto)),
  },
};

const ROTULO_TIPO: Record<string, string> = {
  ti: "trabalhador independente",
  empresa: "empresa",
  particular: "particular",
  nao_sei: "por definir",
};

/**
 * A ordem em que os blocos aparecem.
 *
 * A base é a que o cenário declara em `perguntas.ts` — que já está
 * ordenada por relevância para aquele caso. Por cima dela sobe o que o
 * motor está a apontar como em falta: se há um aviso a dizer que não há
 * custos fixos declarados, o bloco dos custos fixos não pode estar em
 * nono lugar.
 */
export function ordenarBlocos(
  blocos: readonly BlocoAvancado[],
  contexto: ContextoPreco,
  avisos: readonly { id: string }[],
): BlocoAvancado[] {
  const idsAviso = new Set(avisos.map((a) => a.id));
  const apontado = (b: BlocoAvancado) =>
    (BLOCOS[b]?.avisos ?? []).some((id) => idsAviso.has(id)) && !BLOCOS[b].preenchido(contexto);

  return [...blocos].sort((a, b) => Number(apontado(b)) - Number(apontado(a)));
}

/** `true` quando um aviso do motor aponta este bloco como em falta. */
export function blocoDestacado(
  bloco: BlocoAvancado,
  contexto: ContextoPreco,
  avisos: readonly { id: string }[],
): boolean {
  const meta = BLOCOS[bloco];
  if (!meta || meta.preenchido(contexto)) return false;
  const idsAviso = new Set(avisos.map((a) => a.id));
  return (meta.avisos ?? []).some((id) => idsAviso.has(id));
}
