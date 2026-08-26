import "server-only";

// ═══════════════════════════════════════════════════════════════════════
//  AS CINCO RESPOSTAS — o que a bússola mostra ao lado de cada pergunta
//  ---------------------------------------------------------------------
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ PORQUE É QUE A BÚSSOLA PRECISAVA DISTO                              │
//  │                                                                     │
//  │ A primeira versão era uma lista de cinco perguntas e cinco setas.   │
//  │ Cumpria a recomendação da NN/g — entradas por tarefa e não por      │
//  │ audiência — e falhava a outra metade: **pedia cinco cliques às      │
//  │ cegas.** Nada na página dizia o que havia atrás de cada uma.        │
//  │                                                                     │
//  │ Jakob Nielsen mede em 10 segundos o tempo que uma página tem para   │
//  │ comunicar a sua proposta de valor. Cinco perguntas sem resposta     │
//  │ gastam esses 10 segundos a prometer que existe uma resposta.        │
//  │                                                                     │
//  │ Agora cada pergunta traz a sua resposta ao lado, com o número       │
//  │ verdadeiro. Apontar é o gesto; a resposta é o argumento.            │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  ── Nenhum destes números é escrito à mão ────────────────────────────
//
//  Saem dos mesmos motores que as ferramentas usam. Se uma taxa mudar em
//  `fiscal-data.ts`, muda aqui sem ninguém tocar neste ficheiro — que é a
//  regra 1 do CLAUDE.md aplicada também à montra.
//
//  Para o cliente atravessam só strings já formatadas: os motores ficam
//  deste lado da fronteira.
// ═══════════════════════════════════════════════════════════════════════

import { IVA_TAXAS } from "@/lib/fiscal-data";
import { cenariosDemoPreco } from "@/lib/pricing/demo-homepage.servidor";
import { COMPETENCIA_POR_ID } from "@/lib/negocio/descoberta/conhecimento/dados/competencias";
import { MODELO_POR_ID } from "@/lib/negocio/descoberta/conhecimento/dados/modelos";
import { PROBLEMA_POR_ID } from "@/lib/negocio/descoberta/conhecimento/dados/problemas";
import { referenciaCurada } from "@/lib/negocio/descoberta/conhecimento/seeds";
import type { FocoHomepage } from "@/lib/foco-homepage";
import { dadosRecibo, dadosSalario, dadosEmpresa } from "./dados-servidor";

/** Uma linha do painel: o que é, e quanto. */
export interface LinhaResposta {
  rotulo: string;
  valor: string;
  /**
   * O tom da linha — e o tom é informação, não decoração.
   *
   * `sai` é dinheiro que deixa de ser teu, `fica` é o que sobra, `data`
   * é o que tem prazo, `neutro` é contexto. Sem isto, três linhas de
   * euros parecem-se todas e o painel deixa de dizer o que separa umas
   * das outras.
   */
  tom?: "sai" | "fica" | "data" | "neutro";
}

export interface RespostaDoFoco {
  /**
   * O número (ou a frase) em corpo grande. É a RESPOSTA à pergunta, não
   * um resumo dela — se ler-se isto não responde à pergunta ao lado, a
   * resposta está errada.
   */
  destaque: string;
  /** O que o destaque é. Sempre com o pressuposto de onde saiu. */
  legenda: string;
  /** Duas a três linhas, nunca mais: um painel não é uma tabela. */
  linhas: LinhaResposta[];
  /** A base legal ou a fonte. A promessa da homepage é esta linha. */
  base: string;
}

const eur = (n: number) =>
  `${n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
/** Sem cêntimos — para valores anuais, onde dois decimais são ruído. */
const eur0 = (n: number) => `${Math.round(n).toLocaleString("pt-PT")} €`;
const pct = (f: number) => `${Math.round(f * 100)} %`;

/**
 * O exemplo editorial de «Descobrir».
 *
 * É o mesmo par (problema × modelo) que o palco encena, lido do mesmo
 * grafo. Não há aqui um negócio inventado: se o dossier deixar de existir
 * no grafo, isto rebenta no build em vez de servir uma hipótese fantasma.
 */
function respostaDescobrir(): RespostaDoFoco {
  const problema = PROBLEMA_POR_ID.get("processos-dispersos-micro");
  const modelo = MODELO_POR_ID.get("projeto");
  const competencia = COMPETENCIA_POR_ID.get("organizacao");
  const dossier = referenciaCurada("processos-dispersos-micro", "projeto");

  if (!problema || !modelo || !competencia || !dossier) {
    throw new Error(
      "O exemplo da bússola deixou de existir no grafo de descoberta. " +
        "Ver src/lib/negocio/descoberta/conhecimento/seeds.ts.",
    );
  }

  return {
    destaque: dossier.template.title,
    legenda: "uma hipótese composta a partir do que sabes fazer — não escolhida de uma lista",
    linhas: [
      { rotulo: "Competência", valor: competencia.rotulo, tom: "neutro" },
      { rotulo: "Como cobra", valor: modelo.rotulo, tom: "neutro" },
      {
        rotulo: "Primeiro teste",
        valor: problema.comoValidar[1] ?? problema.comoValidar[0],
        tom: "data",
      },
    ],
    base: "Grafo de descoberta — cada número com proveniência declarada",
  };
}

function respostaPreco(): RespostaDoFoco {
  const direta = cenariosDemoPreco().find((c) => c.id === "direta");
  if (!direta) throw new Error("O cenário de venda direta desapareceu da demonstração de preço.");

  return {
    destaque: eur(direta.pvp),
    legenda: "o preço ao público de uma peça cujos custos e margem estão declarados",
    linhas: [
      { rotulo: "Sem IVA", valor: eur(direta.liquido), tom: "neutro" },
      { rotulo: "Lucro por unidade", valor: eur(direta.lucro), tom: "fica" },
      { rotulo: "Margem", valor: pct(direta.margem), tom: "fica" },
    ],
    base: IVA_TAXAS.continente.legalBasis,
  };
}

function respostaRecibos(): RespostaDoFoco {
  const r = dadosRecibo();
  return {
    destaque: eur(r.liquido),
    legenda: `é o que fica de um recibo de ${eur0(r.bruto)} ao abrigo do Art. 151.º`,
    linhas: [
      { rotulo: `Retenção de IRS (${pct(r.taxaRetencao)})`, valor: `− ${eur(r.retencaoIRS)}`, tom: "sai" },
      { rotulo: "Segurança Social", valor: `− ${eur(r.segSocial)}`, tom: "sai" },
      { rotulo: "Sai da conta a", valor: r.prazoSS, tom: "data" },
    ],
    base: "Art. 151.º CIRS e Art. 168.º do Código Contributivo",
  };
}

function respostaSalario(): RespostaDoFoco {
  const s = dadosSalario();
  return {
    // ── A resposta a «está certo?» é «neste, não» ──────────────────
    //  Mostrar o líquido certo respondia a outra pergunta. O que esta
    //  ferramenta faz é encontrar a diferença, e a diferença é que tem
    //  de estar em corpo grande.
    destaque: eur(s.diferencaAnual),
    legenda: `retidos a mais num ano, num vencimento de ${eur0(s.bruto)} com um dependente declarado`,
    linhas: [
      { rotulo: "O recibo pagou", valor: eur(s.liquidoRecibo), tom: "sai" },
      { rotulo: "Devia ter pago", valor: eur(s.liquidoCerto), tom: "fica" },
      { rotulo: "Contas feitas sobre", valor: "14 meses", tom: "neutro" },
    ],
    base: "Tabelas de retenção na fonte de 2026, Continente",
  };
}

function respostaEmpresa(): RespostaDoFoco {
  const e = dadosEmpresa();
  return {
    destaque: e.cruzamento ? `${eur0(e.cruzamento)}/ano` : "Depende do teu caso",
    legenda: e.cruzamento
      ? "é a faturação a partir da qual a sociedade passa os recibos verdes"
      : "abaixo deste eixo os recibos verdes não são ultrapassados",
    linhas: [
      { rotulo: "Custo fixo de ter empresa", valor: `− ${eur0(e.custoFixo)}/ano`, tom: "sai" },
      { rotulo: `A ${eur0(e.exemplo)}, recibos verdes`, valor: eur0(e.exemploFreelancer), tom: "fica" },
      { rotulo: `A ${eur0(e.exemplo)}, sociedade`, valor: eur0(e.exemploEmpresa), tom: "sai" },
    ],
    base: "IRC PME, derrama municipal e IRS sobre dividendos",
  };
}

/**
 * As cinco respostas, resolvidas uma vez por pedido.
 *
 * A ordem das chaves não importa — o que importa é serem cinco, e o tipo
 * garante-o: acrescentar um foco a `FOCOS` sem lhe dar resposta deixa de
 * compilar.
 */
export function respostasDosFocos(): Record<FocoHomepage, RespostaDoFoco> {
  return {
    descobrir: respostaDescobrir(),
    preco: respostaPreco(),
    recibos: respostaRecibos(),
    salario: respostaSalario(),
    empresa: respostaEmpresa(),
  };
}
