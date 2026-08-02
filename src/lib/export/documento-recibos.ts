// ─────────────────────────────────────────────────────────────────────
//  Mapa de recibos — o modelo único que alimenta o PDF
//  ---------------------------------------------------------------------
//  Substitui o caminho antigo: `window.open` + `window.print()`, que falhava
//  em silêncio atrás de um bloqueador de pop-ups, saía com a fonte do sistema
//  de quem imprimia, não levava marcação de acessibilidade nenhuma e não
//  deixava rasto de proveniência. Num produto pago, um botão que às vezes não
//  faz nada é pior do que um botão que não existe.
//
//  Aqui o documento é composto no servidor pelo mesmo motor do relatório de
//  vencimento, com as mesmas normas (PDF/A-2a + PDF/UA-1) e a mesma linha de
//  verificação.
// ─────────────────────────────────────────────────────────────────────

import { calcularRecibo, type Recibo } from "@/lib/store/recibos";
import { META_TIPO } from "@/lib/fiscal-data";
import { cent, dataExtenso, dataPT, eur, pctDoc } from "./dinheiro";
import type { Proveniencia } from "./referencia";

export interface DocumentoRecibos {
  /** O período que o mapa cobre, já escrito — «2026» ou «Janeiro a Junho de 2026». */
  periodo: string;
  proveniencia: Proveniencia;
  recibos: Recibo[];
  /** O que o utilizador tinha filtrado ao exportar: sem isto o mapa não é verificável. */
  filtros: { rotulo: string; valor: string }[];
  ambito: string[];
}

interface LinhaRecibo {
  data: string;
  cliente: string;
  tipo: string;
  bruto: number;
  iva: number;
  retencao: number;
  ss: number;
  liquido: number;
}

function linhas(recibos: readonly Recibo[]): LinhaRecibo[] {
  return recibos.map((r) => {
    const c = calcularRecibo(r);
    return {
      // dd/mm/aaaa: o mapa vai para um contabilista português, e o ISO é o
      // dialeto de máquina — vive no CSV, não numa coluna que alguém lê.
      data: dataPT(r.data),
      // Um recibo sem cliente preenchido é um facto, não um espaço em branco.
      cliente: r.cliente?.trim() || "—",
      tipo: META_TIPO[r.tipo].label,
      bruto: cent(c.bruto),
      iva: cent(c.iva),
      retencao: cent(c.retencaoIRS),
      ss: cent(c.segSocial),
      liquido: cent(c.liquido),
    };
  });
}

function somar(ls: readonly LinhaRecibo[]) {
  const zero = { bruto: 0, iva: 0, retencao: 0, ss: 0, liquido: 0 };
  const t = ls.reduce(
    (a, l) => ({
      bruto: a.bruto + l.bruto,
      iva: a.iva + l.iva,
      retencao: a.retencao + l.retencao,
      ss: a.ss + l.ss,
      liquido: a.liquido + l.liquido,
    }),
    zero,
  );
  return {
    bruto: cent(t.bruto),
    iva: cent(t.iva),
    retencao: cent(t.retencao),
    ss: cent(t.ss),
    liquido: cent(t.liquido),
  };
}

/**
 * Os clientes que mais pesam.
 *
 * Não é enfeite: quem passa recibos verdes tem de saber a sua concentração de
 * risco. Perder um cliente que vale 60% da faturação é um acontecimento
 * diferente de perder um que vale 4%, e o mapa é o sítio onde isso se vê.
 */
function porCliente(ls: readonly LinhaRecibo[], total: number) {
  const acumulado = new Map<string, { bruto: number; quantos: number }>();
  for (const l of ls) {
    const atual = acumulado.get(l.cliente) ?? { bruto: 0, quantos: 0 };
    acumulado.set(l.cliente, { bruto: cent(atual.bruto + l.bruto), quantos: atual.quantos + 1 });
  }
  return [...acumulado.entries()]
    .map(([cliente, v]) => ({
      cliente,
      bruto: v.bruto,
      quantos: v.quantos,
      peso: total > 0 ? v.bruto / total : 0,
      pesoTexto: pctDoc(total > 0 ? v.bruto / total : 0),
    }))
    .sort((a, b) => b.bruto - a.bruto);
}

/** O que o Typst recebe. Tudo já arredondado e escrito em pt-PT. */
export function dadosTypst(doc: DocumentoRecibos) {
  const ls = linhas(doc.recibos);
  const total = somar(ls);
  const clientes = porCliente(ls, total.bruto);
  // Cinco chegam para ler a concentração; a cauda vira uma linha só, para o
  // total continuar a fechar com a tabela acima.
  const topo = clientes.slice(0, 5);
  const cauda = clientes.slice(5);

  return {
    periodo: doc.periodo,
    proveniencia: { ...doc.proveniencia, emitidoEm: dataExtenso(doc.proveniencia.emitidoEm) },
    quantos: ls.length,
    // A frase da capa escreve-se aqui, não no Typst: lá, juntar texto a um
    // valor formatado obriga a somar string com conteúdo, o que não compila —
    // e a formatação do dinheiro tem de sair do mesmo sítio que a das tabelas.
    resposta: {
      rotulo: "Líquido do período",
      // Número cru: quem compõe a capa é que escolhe o corpo dos cêntimos.
      valor: total.liquido,
      contexto: `de ${eur(total.bruto)} faturados em ${ls.length} ${ls.length === 1 ? "recibo" : "recibos"}`,
    },
    filtros: doc.filtros,
    linhas: ls,
    total,
    clientes: {
      distintos: clientes.length,
      // Formatado aqui e não no Typst: o «100,0 %» da linha de total tem de sair
      // do mesmo formatador das outras linhas, ou o espaço antes do símbolo
      // muda a meio da coluna.
      pesoTotalTexto: pctDoc(1),
      topo,
      cauda:
        cauda.length > 0
          ? {
              quantos: cauda.length,
              bruto: cent(cauda.reduce((s, c) => s + c.bruto, 0)),
              pesoTexto: pctDoc(total.bruto > 0 ? cauda.reduce((s, c) => s + c.bruto, 0) / total.bruto : 0),
            }
          : null,
    },
    // O maior peso de um só cliente — a frase que o leitor precisa de ver.
    concentracao: topo.length > 0 ? { cliente: topo[0].cliente, pesoTexto: topo[0].pesoTexto } : null,
    liquidoMedio: ls.length > 0 ? eur(cent(total.liquido / ls.length)) : eur(0),
    ambito: doc.ambito,
  };
}
