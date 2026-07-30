// ═══════════════════════════════════════════════════════════════════════
//  LEITOR DO CSV DE COMISSÕES DO PARCEIRO
//  ---------------------------------------------------------------------
//  Vivia dentro do `page.tsx` do painel de desempenho, onde não havia forma
//  de lhe escrever um teste. É lógica de dinheiro — os números que saem daqui
//  são os que se usam para fechar contas com o parceiro —, por isso passa a
//  ser um módulo próprio, com casos verificados.
//
//  ⚠️ As colunas exatas ainda não foram confirmadas pela FIZ. Este leitor
//  aceita os nomes mais prováveis e FALHA ALTO quando não os encontra ou
//  quando um montante não se percebe, em vez de importar zeros em silêncio.
// ═══════════════════════════════════════════════════════════════════════

export type EstadoComissao = "pendente" | "confirmada" | "paga" | "anulada";

export interface LinhaComissaoCsv {
  id: string;
  referencia: string | null;
  estado: EstadoComissao;
  valor_liquido: number;
  valor_comissao: number;
  plano: string | null;
  ocorrido_em: string;
  confirmavel_em: string | null;
  origem: "csv";
}

/**
 * Qual dos dois delimitadores este ficheiro usa.
 *
 * Antes dividia-se por `/[,;]/`, ou seja, pelos dois ao mesmo tempo. Num CSV
 * português — ponto e vírgula como separador, vírgula como decimal, que é o
 * que o Excel em pt-PT produz — um valor como `1.234,56` partia-se em duas
 * colunas e empurrava todos os campos seguintes uma casa para a direita. A
 * data passava a ser o plano, o id passava a ser outra coisa, e a importação
 * seguia em frente sem se queixar.
 *
 * Conta-se fora das aspas: um `;` dentro de `"Lisboa; Porto"` não é
 * separador nenhum.
 */
export function detetarDelimitador(cabecalho: string): "," | ";" {
  let virgulas = 0;
  let pontoEVirgula = 0;
  let dentroDeAspas = false;
  for (const ch of cabecalho) {
    if (ch === '"') dentroDeAspas = !dentroDeAspas;
    else if (!dentroDeAspas && ch === ",") virgulas++;
    else if (!dentroDeAspas && ch === ";") pontoEVirgula++;
  }
  return pontoEVirgula > virgulas ? ";" : ",";
}

/** Divide uma linha pelo delimitador, respeitando aspas e `""` escapado. */
export function dividirLinha(linha: string, delim: "," | ";"): string[] {
  const campos: string[] = [];
  let atual = "";
  let dentroDeAspas = false;
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    if (dentroDeAspas) {
      if (ch === '"') {
        if (linha[i + 1] === '"') {
          atual += '"';
          i++;
        } else dentroDeAspas = false;
      } else atual += ch;
    } else if (ch === '"') dentroDeAspas = true;
    else if (ch === delim) {
      campos.push(atual);
      atual = "";
    } else atual += ch;
  }
  campos.push(atual);
  return campos;
}

/**
 * Montante escrito à portuguesa ou à inglesa, ou `null` se não for número.
 *
 * A regra que resolve a ambiguidade: quando aparecem os dois separadores, o
 * ÚLTIMO é o decimal (`1.234,56` → pt; `1,234.56` → en). Quando aparece só
 * um, é decimal se separar 1 ou 2 casas (`9,99`) e de milhares se separar
 * exatamente 3 (`1,234`) — que é a convenção que ambos os formatos respeitam.
 */
export function lerMontante(bruto: string): number | null {
  const s = bruto.trim().replace(/[^\d,.-]/g, "");
  if (!s || !/\d/.test(s)) return null;

  const ultimaVirgula = s.lastIndexOf(",");
  const ultimoPonto = s.lastIndexOf(".");

  let decimal: string | null = null;
  if (ultimaVirgula >= 0 && ultimoPonto >= 0) {
    decimal = ultimaVirgula > ultimoPonto ? "," : ".";
  } else if (ultimaVirgula >= 0 || ultimoPonto >= 0) {
    const sep = ultimaVirgula >= 0 ? "," : ".";
    const pos = ultimaVirgula >= 0 ? ultimaVirgula : ultimoPonto;
    const casas = s.length - pos - 1;
    // Um separador repetido nunca é decimal: `1.234.567` é de milhares.
    const repetido = s.split(sep).length > 2;
    decimal = !repetido && casas !== 3 ? sep : null;
  }

  const semMilhares = decimal
    ? s
        .split(decimal)
        .map((p, i, a) => (i === a.length - 1 ? p : p.replace(/[.,]/g, "")))
        .join(".")
    : s.replace(/[.,]/g, "");

  const n = Number(semMilhares);
  return Number.isFinite(n) ? n : null;
}

function estadoValido(v: string): EstadoComissao {
  const s = v?.trim().toLowerCase();
  if (s === "confirmada" || s === "confirmed" || s === "approved") return "confirmada";
  if (s === "anulada" || s === "cancelled" || s === "refunded") return "anulada";
  if (s === "paga" || s === "paid") return "paga";
  return "pendente";
}

export function lerCsv(texto: string): { linhas: LinhaComissaoCsv[]; erro?: string } {
  const linhasTexto = texto.trim().split(/\r?\n/);
  if (linhasTexto.length < 2) return { linhas: [], erro: "O ficheiro não tem linhas de dados." };

  const delim = detetarDelimitador(linhasTexto[0]);
  const cab = dividirLinha(linhasTexto[0], delim).map((c) => c.trim().toLowerCase());
  const col = (...nomes: string[]) => {
    for (const n of nomes) {
      const i = cab.indexOf(n);
      if (i >= 0) return i;
    }
    return -1;
  };

  const iId = col("id", "referencia", "reference");
  const iEstado = col("estado", "status");
  const iLiquido = col("valor_liquido", "net", "net_amount", "liquido");
  const iComissao = col("comissao", "commission", "valor_comissao");
  const iData = col("data", "date", "ocorrido_em");
  const iPlano = col("plano", "plan");

  if (iId < 0 || iLiquido < 0 || iComissao < 0 || iData < 0) {
    return {
      linhas: [],
      erro: `Faltam colunas obrigatórias. Encontradas: ${cab.join(", ")}. São precisas id, valor líquido, comissão e data.`,
    };
  }

  // Um montante que não se percebe PARA a importação. Isto era `|| 0`, o que
  // transformava `1.234,56` mal lido em «zero euros de comissão» e gravava-o
  // como se fosse o relatório do parceiro — um erro que só se descobre a
  // fechar contas. O contrato deste leitor, escrito no cabeçalho, é falhar
  // alto; agora cumpre-o.
  const problemas: string[] = [];
  const linhas = linhasTexto
    .slice(1)
    .filter(Boolean)
    .map((l, i) => {
      const c = dividirLinha(l, delim);
      const montante = (indice: number, rotulo: string): number => {
        const v = lerMontante(c[indice] ?? "");
        if (v === null) {
          problemas.push(`linha ${i + 2}: ${rotulo} ilegível ("${(c[indice] ?? "").trim()}")`);
          return 0;
        }
        return v;
      };
      return {
        id: c[iId]?.trim() ?? "",
        referencia: null,
        estado: iEstado >= 0 ? estadoValido(c[iEstado] ?? "") : ("pendente" as EstadoComissao),
        valor_liquido: montante(iLiquido, "valor líquido"),
        valor_comissao: montante(iComissao, "comissão"),
        plano: iPlano >= 0 ? (c[iPlano]?.trim() ?? null) : null,
        ocorrido_em: c[iData]?.trim() ?? "",
        confirmavel_em: null,
        origem: "csv" as const,
      };
    });

  if (problemas.length > 0) {
    return {
      linhas: [],
      erro: `Montantes ilegíveis — nada foi importado. ${problemas.slice(0, 5).join("; ")}${
        problemas.length > 5 ? ` (e mais ${problemas.length - 5})` : ""
      }`,
    };
  }

  return { linhas: linhas.filter((l) => l.id && l.ocorrido_em) };
}
