// O contrato de evidência da página de investidores.
//
// A auditoria encontrou afirmações como "retenção alta", "código auditado",
// "plataforma que os portugueses já usam" e "penetração atual de 4%" — nenhuma
// com definição, fonte ou data, e algumas a descrever o futuro no presente.
//
// A resposta não é escrever com mais cuidado; é tornar impossível publicar sem
// evidência. Os tipos abaixo obrigam cada afirmação a declarar em que estado
// está, e cada métrica a trazer definição, data, dono e sistema de origem. O
// que não cumprir faz o BUILD FALHAR — as asserções correm ao importar os
// dados, tal como `assertFiscalDataIntegrity()` faz do lado fiscal.

/** Em que estado está uma afirmação. Nunca partilham o mesmo estilo na página. */
export type EstadoEvidencia =
  /** Existe, pode ser demonstrado hoje. */
  | "live"
  /** Existe compromisso verificável, ainda não generalizado. */
  | "pilot"
  /** Roadmap aprovado, ainda não gera valor. */
  | "planned"
  /** Precisa de teste. Não entra em nenhum caso-base. */
  | "hypothesis";

export const ROTULO_ESTADO: Record<EstadoEvidencia, string> = {
  live: "Em produção",
  pilot: "Piloto",
  planned: "Planeado",
  hypothesis: "Hipótese",
};

export interface Afirmacao {
  id: string;
  texto: string;
  estado: EstadoEvidencia;
  /** Como se verifica. Para "live", tem de ser algo que alguém possa abrir. */
  verificacao: string;
  urlFonte?: string;
}

export type TipoMetrica = "actual" | "target" | "market" | "hypothesis";
export type VisibilidadeMetrica = "public" | "gated" | "internal";

export interface MetricaInvestidor {
  id: string;
  rotulo: string;
  /** Ausente quando a métrica existe mas não é divulgada publicamente. */
  valor?: number;
  /** Como aparece na página. Ausente pelo mesmo motivo que `valor`. */
  formatado?: string;
  unidade: "users" | "eur" | "percent" | "months" | "count";
  tipo: TipoMetrica;
  visibilidade: VisibilidadeMetrica;
  /** Data de referência, AAAA-MM-DD. */
  asOf: string;
  /** Período a que respeita, quando aplicável ("últimos 30 dias"). */
  periodo?: string;
  /** O que conta e o que não conta. Sem isto, o número não quer dizer nada. */
  definicao: string;
  /** De onde sai. "manual-unverified" é proibido para métricas `actual`. */
  sistemaFonte: string;
  urlFonte?: string;
  dono: string;
}

/** Tokens que denunciam texto por preencher. */
const PROIBIDOS = ["[€]", "[data]", "[FACTO]", "[PILOTO]", "TODO", "VALIDAR", "Lorem ipsum", "XXX"];

/**
 * Uma métrica pública tem de trazer a sua prova. Uma métrica `actual` não pode
 * dizer que a origem é "manual-unverified" — é a diferença entre um número
 * medido e um número lembrado.
 */
export function assertMetrica(m: MetricaInvestidor): void {
  const erros: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(m.asOf)) erros.push("asOf tem de ser AAAA-MM-DD");
  if (m.definicao.trim().length < 20) erros.push("definicao demasiado curta para dizer o que conta");
  if (!m.dono.trim()) erros.push("sem dono");
  if (!m.sistemaFonte.trim()) erros.push("sem sistema de origem");
  if (m.tipo === "actual" && m.sistemaFonte === "manual-unverified") {
    erros.push("uma métrica actual não pode ser não-verificada");
  }
  // Uma métrica pública tem de ter valor; se não há valor para mostrar, a
  // visibilidade correta é "gated" e a página diz que é partilhada no deck.
  if (m.visibilidade === "public" && (m.valor === undefined || !m.formatado)) {
    erros.push("métrica pública sem valor — usa visibilidade 'gated'");
  }
  if (m.formatado && PROIBIDOS.some((t) => m.formatado!.includes(t))) {
    erros.push(`valor formatado contém marcador por preencher: ${m.formatado}`);
  }
  if (erros.length > 0) {
    throw new Error(`[investidores] Métrica "${m.id}" sem evidência:\n - ${erros.join("\n - ")}`);
  }
}

/**
 * Nenhum texto publicável pode conter marcadores por preencher. É a rede que
 * apanha o caso em que alguém (humano ou IA) preenche uma lacuna com "[€]" e
 * a página vai para produção a pedir dinheiro com um parêntese reto.
 */
export function assertSemMarcadores(textos: string[], contexto: string): void {
  for (const texto of textos) {
    const encontrado = PROIBIDOS.find((t) => texto.includes(t));
    if (encontrado) {
      throw new Error(
        `[investidores] ${contexto} contém marcador por preencher ("${encontrado}"): ${texto.slice(0, 120)}`,
      );
    }
  }
}

/**
 * Afirmações em "live" não podem descrever capacidades que o produto não tem.
 * A lista é curta de propósito: são exatamente as que a auditoria encontrou a
 * ser apresentadas como presente.
 */
const PROIBIDAS_EM_LIVE = [
  "crédito integrado",
  "take rate",
  "certificação própria",
  "código auditado",
  "retenção alta",
  "reconciliação open banking",
  "adiantamento de faturas",
];

export function assertAfirmacoes(afirmacoes: Afirmacao[]): void {
  const erros: string[] = [];
  const vistos = new Set<string>();

  for (const a of afirmacoes) {
    if (vistos.has(a.id)) erros.push(`id duplicado: ${a.id}`);
    vistos.add(a.id);
    if (!a.verificacao.trim()) erros.push(`${a.id}: sem forma de verificação`);
    if (a.estado === "live") {
      const proibida = PROIBIDAS_EM_LIVE.find((p) => a.texto.toLowerCase().includes(p));
      if (proibida) erros.push(`${a.id}: "${proibida}" não pode aparecer como estado atual`);
    }
  }

  assertSemMarcadores(afirmacoes.map((a) => a.texto), "Inventário de afirmações");

  if (erros.length > 0) {
    throw new Error(`[investidores] Inventário de afirmações inconsistente:\n - ${erros.join("\n - ")}`);
  }
}
