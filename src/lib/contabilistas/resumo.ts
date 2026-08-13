// ═══════════════════════════════════════════════════════════════════════
//  RESUMO POR CLIENTE — o que a lista ordena e a ficha mostra
//  ---------------------------------------------------------------------
//  A página de clientes era um acordeão de cartões: com dez clientes
//  passava, com oitenta deixava de se conseguir encontrar ninguém. Uma
//  tabela com procura e ordenação precisa de números por linha — «última
//  consulta», «envios por ler» — e esses números derivam de quatro listas
//  diferentes.
//
//  A derivação vive aqui, pura, por duas razões: é a mesma para a lista e
//  para a ficha de cliente, e é a única parte disto que tem regras onde
//  alguém se pode enganar (o que conta como «última consulta» quando há
//  uma cancelada pelo meio?).
// ═══════════════════════════════════════════════════════════════════════

import type { Agendamento, Partilha, Vinculo } from "./tipos";
import { tratamentoDoCliente } from "./tipos";

export interface CartaoDoCliente {
  carimbos: number;
  meta: number;
  descontoPct: number;
  precoBaseCents: number;
}

export interface ResumoCliente {
  vinculo: Vinculo;
  /** Nome dado pelo cliente, ou identificador curto. Já resolvido. */
  tratamento: string;
  consultasRealizadas: number;
  /** Instante ISO da próxima consulta por realizar, ou `null`. */
  proxima: string | null;
  /** Instante ISO da última consulta REALIZADA, ou `null`. */
  ultima: string | null;
  partilhas: number;
  /** Envios que o contabilista ainda não abriu. É o que pede ação. */
  partilhasPorLer: number;
  cartao: CartaoDoCliente | null;
}

export interface EntradaResumo {
  vinculos: readonly Vinculo[];
  agendamentos: readonly Agendamento[];
  partilhas: readonly Partilha[];
  cartoes: Readonly<Record<string, CartaoDoCliente>>;
  /** Injetado para o teste ser determinístico. */
  agora?: Date;
}

/** Estados em que uma consulta ainda vai acontecer. */
const POR_ACONTECER = new Set(["pedido", "confirmado"]);

export function resumirClientes(e: EntradaResumo): ResumoCliente[] {
  const agora = (e.agora ?? new Date()).getTime();

  // Um índice por cliente evita percorrer as listas todas por cada vínculo:
  // com oitenta clientes e um ano de consultas, o quadrático nota-se.
  const porCliente = new Map<string, { ags: Agendamento[]; pts: Partilha[] }>();
  const balde = (id: string) => {
    let b = porCliente.get(id);
    if (!b) { b = { ags: [], pts: [] }; porCliente.set(id, b); }
    return b;
  };
  for (const a of e.agendamentos) balde(a.clienteId).ags.push(a);
  for (const p of e.partilhas) balde(p.clienteId).pts.push(p);

  return e.vinculos.map((v) => {
    const b = porCliente.get(v.clienteId) ?? { ags: [], pts: [] };

    let consultasRealizadas = 0;
    let proxima: string | null = null;
    let ultima: string | null = null;

    for (const a of b.ags) {
      const t = Date.parse(a.inicio);
      if (!Number.isFinite(t)) continue;

      if (a.estado === "realizada") {
        consultasRealizadas++;
        // A última é a mais recente REALIZADA. Uma consulta cancelada não
        // conta como contacto: dizer «última consulta em março» quando essa
        // consulta foi desmarcada seria uma afirmação falsa sobre a relação.
        if (ultima === null || t > Date.parse(ultima)) ultima = a.inicio;
      }

      if (POR_ACONTECER.has(a.estado) && t >= agora) {
        if (proxima === null || t < Date.parse(proxima)) proxima = a.inicio;
      }
    }

    // Revogadas não contam: o cliente retirou-as, e mostrá-las na contagem
    // faria a lista prometer conteúdo que já não abre.
    const vivas = b.pts.filter((p) => p.estado !== "revogada");

    return {
      vinculo: v,
      tratamento: tratamentoDoCliente(v),
      consultasRealizadas,
      proxima,
      ultima,
      partilhas: vivas.length,
      partilhasPorLer: vivas.filter((p) => p.estado === "enviada").length,
      cartao: e.cartoes[v.clienteId] ?? null,
    };
  });
}

// ─── Ordenação e procura ───────────────────────────────────────────────

export type ColunaCliente = "nome" | "desde" | "ultima" | "proxima" | "envios";
export type Sentido = "asc" | "desc";

/**
 * Ordena por uma coluna. As datas em falta vão SEMPRE para o fim, nos dois
 * sentidos — um cliente sem consultas não é «o mais antigo», é um cliente
 * sobre quem não há essa informação, e pô-lo no topo de «última consulta»
 * responderia à pergunta errada.
 */
export function ordenarClientes(
  lista: readonly ResumoCliente[],
  coluna: ColunaCliente,
  sentido: Sentido
): ResumoCliente[] {
  const sinal = sentido === "asc" ? 1 : -1;

  const data = (v: string | null) => (v ? Date.parse(v) : null);

  return [...lista].sort((a, b) => {
    switch (coluna) {
      case "nome":
        return sinal * a.tratamento.localeCompare(b.tratamento, "pt-PT", { sensitivity: "base" });
      case "envios":
        return sinal * (a.partilhas - b.partilhas);
      case "desde":
        return sinal * (Date.parse(a.vinculo.criadoEm) - Date.parse(b.vinculo.criadoEm));
      default: {
        const x = data(coluna === "ultima" ? a.ultima : a.proxima);
        const y = data(coluna === "ultima" ? b.ultima : b.proxima);
        if (x === null && y === null) return 0;
        if (x === null) return 1;
        if (y === null) return -1;
        return sinal * (x - y);
      }
    }
  });
}

/** Procura por nome, identificador ou email. Sem acentos e sem maiúsculas. */
export function filtrarPorTexto(
  lista: readonly ResumoCliente[],
  texto: string
): ResumoCliente[] {
  const q = normalizar(texto);
  if (!q) return [...lista];
  return lista.filter((r) =>
    normalizar(r.tratamento).includes(q) ||
    normalizar(r.vinculo.emailCliente ?? "").includes(q)
  );
}

function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}
