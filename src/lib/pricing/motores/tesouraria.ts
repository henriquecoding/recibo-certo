// ═══════════════════════════════════════════════════════════════════════
//  CALENDÁRIO DE TESOURARIA — quanto sai, e QUANDO
//  ---------------------------------------------------------------------
//  O resultado já sabia quanto reservar por mês em IVA e Segurança Social.
//  `prazos.ts` já sabia as datas. Faltava juntá-los — e é essa junção que
//  transforma «reserva 15% de tudo o que faturas» em «a 20 de novembro
//  saem-te 340 €», que é literalmente o que o produto promete vender:
//  tranquilidade, não cálculos.
//
//  ── O QUE ESTE MOTOR NÃO FAZ ─────────────────────────────────────────
//
//  Não reinventa datas nem regras de aplicabilidade. Chama
//  `prazosAplicaveis()`, que já sabe ajustar fins de semana e feriados e já
//  sabe que quem está isento de IVA não entrega declaração periódica, nem
//  quem está no primeiro ano de atividade paga Segurança Social.
//  Aqui só se responde a uma pergunta que `prazos.ts` não podia responder
//  sozinho: QUANTO, a este preço.
//
//  ── DECLARAR NÃO É PAGAR ─────────────────────────────────────────────
//
//  `prazos.ts` separa as duas obrigações porque têm datas diferentes: a
//  declaração periódica de IVA entrega-se até dia 20, o imposto paga-se
//  até dia 25. O dinheiro sai UMA vez — no pagamento. Pôr a quantia nas
//  duas linhas duplicaria a reserva que a pessoa faz, e é exatamente o
//  erro que este comentário existe para impedir de voltar.
//
//  ── E O QUE NÃO INVENTA ──────────────────────────────────────────────
//
//  Só entram no calendário as obrigações cuja quantia SE DERIVA do preço:
//  IVA e Segurança Social. O IRS não entra — o que se paga depende do ano
//  inteiro e da liquidação da AT, não deste preço. Fica a nota a dizê-lo e
//  o calendário completo continua em `/prazos`, que é onde ele mora.
// ═══════════════════════════════════════════════════════════════════════

import { prazosAplicaveis, diasAte, type PerfilPrazos, type NaturezaPrazo } from "../../prazos";
import type { ContextoPreco } from "../tipos";
import { naoNegativo, num } from "../numeros";

export interface LinhaTesouraria {
  id: string;
  titulo: string;
  /** ISO yyyy-mm-dd, já ajustada por fim de semana e feriado. */
  data: string;
  diasAte: number;
  categoria: "iva" | "ss";
  natureza: NaturezaPrazo;
  /**
   * Quanto sai. `null` nas declarações, porque entregar não é pagar — e
   * nesse caso `porqueSemValor` di-lo, em vez de mostrar um zero que a
   * pessoa leria como «não devo nada».
   */
  valor: number | null;
  porqueSemValor?: string;
  base: string;
}

export interface Tesouraria {
  /** Quanto reservar por mês, somando tudo o que é periódico. */
  reservaMensal: number;
  ivaMensal: number;
  ssMensal: number;
  /** Os próximos prazos, com quantia quando ela se deriva do preço. */
  proximos: LinhaTesouraria[];
  estimativa: true;
  notas: string[];
}

export interface EntradaTesouraria {
  contexto: ContextoPreco;
  /** IVA liquidado por unidade vendida. */
  ivaPorUnidade: number;
  /** Segurança Social por unidade, do motor fiscal. */
  ssPorUnidade: number;
  /** Vende com IVA? (isento não entrega declaração periódica) */
  liquidaIVA: boolean;
  /** Periodicidade do Art. 41.º, quando o motor de IVA a conhece. */
  periodicidade: "mensal" | "trimestral" | null;
  /** Hoje — injetável para os testes não dependerem do calendário real. */
  hoje?: Date;
  /** Quantos prazos devolver. */
  limite?: number;
}

/** O perfil que `prazos.ts` espera, derivado do contexto de preço. */
function perfilDe(e: EntradaTesouraria): PerfilPrazos {
  const v = e.contexto.vendedor;
  return {
    regimeIVA: !e.liquidaIVA
      ? "isento"
      : e.periodicidade === "mensal"
        ? "normal-mensal"
        : "normal-trimestral",
    // As contribuições de trabalhador independente são de quem é
    // trabalhador independente. Uma sociedade tem outras obrigações — e
    // por isso o motor fiscal já lhe devolve zero de Segurança Social.
    atividadeAberta: v.tipo === "ti",
    // Não sabemos, e não se inventa. `prazos.ts` trata `null` como
    // «não afirmes» e deixa o pagamento por conta de fora.
    pagamentosPorConta: null,
    isencaoSSPrimeiroAno: !!v.isencaoSSPrimeiroAno,
  };
}

/** Quantos meses de atividade cabem no período a que um pagamento respeita. */
function mesesDoPeriodo(
  categoria: "iva" | "ss",
  periodicidade: "mensal" | "trimestral" | null,
): number {
  // O IVA acompanha o regime: um mês no mensal, um trimestre no trimestral.
  if (categoria === "iva") return periodicidade === "mensal" ? 1 : 3;
  // A Segurança Social DECLARA-SE por trimestre mas PAGA-SE todos os meses
  // (Art. 43.º do Código dos Regimes Contributivos). O que entra aqui é o
  // pagamento — logo, um mês.
  return 1;
}

/**
 * Calendário de tesouraria a partir do preço.
 *
 * Devolve `null` quando não há volume — sem ele, «quanto sai» seria uma
 * invenção — ou quando nada sai (isento de IVA e sem Segurança Social),
 * porque um calendário de zeros não informa ninguém.
 */
export function calcularTesouraria(e: EntradaTesouraria): Tesouraria | null {
  const unidadesMes = Math.max(0, num(e.contexto.volume?.unidadesMes));
  if (unidadesMes <= 0) return null;

  const ivaMensal = naoNegativo(e.ivaPorUnidade) * unidadesMes;
  const ssMensal = naoNegativo(e.ssPorUnidade) * unidadesMes;
  const reservaMensal = ivaMensal + ssMensal;
  if (reservaMensal <= 0) return null;

  const hoje = e.hoje ?? new Date();
  const perfil = perfilDe(e);

  // O ano corrente e o seguinte, para o calendário não secar em dezembro.
  const candidatos = [
    ...prazosAplicaveis(hoje.getFullYear(), perfil),
    ...prazosAplicaveis(hoje.getFullYear() + 1, perfil),
  ];

  const proximos = candidatos
    .filter((p) => p.categoria === "iva" || p.categoria === "ss")
    .filter((p) => diasAte(p.data, hoje) >= 0)
    .sort((a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id))
    .slice(0, Math.max(1, e.limite ?? 5))
    .map((p): LinhaTesouraria => {
      const categoria = p.categoria === "iva" ? "iva" : "ss";
      const linha: LinhaTesouraria = {
        id: p.id,
        titulo: p.titulo,
        data: p.data,
        diasAte: diasAte(p.data, hoje),
        categoria,
        natureza: p.natureza,
        valor: null,
        base: p.base,
      };

      // Só o pagamento leva quantia. A declaração é um ato, não uma saída.
      if (p.natureza === "pagamento") {
        const mensal = categoria === "iva" ? ivaMensal : ssMensal;
        return { ...linha, valor: mensal * mesesDoPeriodo(categoria, e.periodicidade) };
      }

      return {
        ...linha,
        porqueSemValor:
          categoria === "iva"
            ? "Entregar a declaração não é pagar. O dinheiro sai na data do pagamento, logo a seguir."
            : "Declaras o trimestre; a contribuição paga-se todos os meses, na linha do pagamento.",
      };
    });

  const notas: string[] = [
    "Estes valores saem do preço e do volume que indicaste. Se num mês vendes mais do que noutro, a data mantém-se e o valor muda.",
  ];
  if (ivaMensal > 0) {
    notas.push(
      "O IVA que cobras nunca foi teu: entra na tua conta e sai para o Estado. Guardá-lo à parte é a diferença entre ter o dinheiro no dia do pagamento e não ter.",
    );
  }
  notas.push(
    "O IRS não está aqui porque não sai deste preço — depende do teu ano inteiro e da liquidação da AT. O calendário completo está em Prazos.",
  );

  return { reservaMensal, ivaMensal, ssMensal, proximos, estimativa: true, notas };
}
