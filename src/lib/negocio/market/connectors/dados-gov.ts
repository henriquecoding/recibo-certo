// ═══════════════════════════════════════════════════════════════════════
//  CONECTOR DADOS.GOV — resolver o recurso ATUAL, nunca um URL fixo
//  ---------------------------------------------------------------------
//  O URL de um ficheiro no dados.gov traz o instante da publicação no
//  caminho:
//
//      .../20260816-091121-bd756df9/contratos2026.zip
//
//  Fixá-lo no código significa descarregar para sempre a versão de agosto
//  de 2026 — e, pior, fazê-lo em silêncio: o pedido continua a devolver
//  200 e os dados continuam a parecer atuais. Perguntar à API qual é o
//  recurso atual é a diferença entre uma fonte que se atualiza e uma
//  cópia congelada com ar de fresca.
//
//  A API também dá `last_modified` por recurso, o que permite decidir se
//  vale a pena descarregar dezenas de megabytes antes de os descarregar.
// ═══════════════════════════════════════════════════════════════════════

const CATALOGO = "https://dados.gov.pt/api/1/datasets/";

export class DadosGovError extends Error {
  constructor(
    readonly code: "http-error" | "invalid-json" | "dataset-shape" | "resource-not-found",
    message: string,
  ) {
    super(message);
    this.name = "DadosGovError";
  }
}

export interface RecursoDadosGov {
  id: string;
  titulo: string;
  formato: string;
  url: string;
  /** ISO 8601, tal como a API o publica. */
  atualizadoEm?: string;
  bytes?: number;
  /** Checksum publicado pelo portal, quando existe. */
  checksum?: { tipo: string; valor: string };
}

export interface DatasetDadosGov {
  slug: string;
  titulo: string;
  /** Identificador da licença declarado pelo portal (`other-pd`, `cc-by`…). */
  licenca?: string;
  publicador?: string;
  atualizadoEm?: string;
  paginaUrl: string;
  recursos: readonly RecursoDadosGov[];
}

function texto(valor: unknown): string | undefined {
  return typeof valor === "string" && valor.trim() ? valor : undefined;
}

export function normalizarDataset(bruto: unknown, slug: string): DatasetDadosGov {
  if (!bruto || typeof bruto !== "object") {
    throw new DadosGovError("dataset-shape", "A resposta do dados.gov não é um objeto.");
  }
  const item = bruto as Record<string, unknown>;
  if (!Array.isArray(item.resources)) {
    throw new DadosGovError("dataset-shape", "O dataset não declara uma lista de recursos.");
  }

  const recursos: RecursoDadosGov[] = [];
  for (const cru of item.resources) {
    if (!cru || typeof cru !== "object") continue;
    const r = cru as Record<string, unknown>;
    const url = texto(r.url);
    const id = texto(r.id);
    if (!url || !id) continue;

    const checksumBruto = r.checksum as Record<string, unknown> | null | undefined;
    recursos.push({
      id,
      titulo: texto(r.title) ?? id,
      formato: (texto(r.format) ?? "").toLowerCase(),
      url,
      atualizadoEm: texto(r.last_modified),
      bytes: typeof r.filesize === "number" && Number.isFinite(r.filesize) ? r.filesize : undefined,
      checksum:
        checksumBruto && texto(checksumBruto.type) && texto(checksumBruto.value)
          ? { tipo: String(checksumBruto.type), valor: String(checksumBruto.value) }
          : undefined,
    });
  }

  const organizacao = item.organization as Record<string, unknown> | null | undefined;
  return {
    slug,
    titulo: texto(item.title) ?? slug,
    licenca: texto(item.license),
    publicador: organizacao ? texto(organizacao.name) : undefined,
    atualizadoEm: texto(item.last_update),
    paginaUrl: `https://dados.gov.pt/pt/datasets/${slug}/`,
    recursos,
  };
}

export interface OpcoesDadosGov {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

export async function obterDataset(
  slug: string,
  opcoes: OpcoesDadosGov = {},
): Promise<DatasetDadosGov> {
  const url = new URL(`${encodeURIComponent(slug)}/`, CATALOGO).toString();
  const resposta = await (opcoes.fetchImpl ?? fetch)(url, {
    headers: { Accept: "application/json" },
    signal: opcoes.signal,
  });
  if (!resposta.ok) {
    throw new DadosGovError("http-error", `O dados.gov respondeu com HTTP ${resposta.status}.`);
  }
  let bruto: unknown;
  try {
    bruto = JSON.parse(await resposta.text());
  } catch {
    throw new DadosGovError("invalid-json", "O dados.gov não devolveu JSON válido.");
  }
  return normalizarDataset(bruto, slug);
}

/**
 * Escolhe um recurso pelo nome do ficheiro e pelo formato.
 *
 * O nome é comparado contra o fim do URL, e não contra o título: os
 * títulos do portal variam («Exportar para JSON», «Export to JSON») e o
 * mesmo dataset chega a ter dois recursos com o mesmo título e conteúdos
 * diferentes. O nome do ficheiro é o que identifica de facto.
 */
export function escolherRecurso(
  dataset: DatasetDadosGov,
  criterio: { ficheiro: string; formato?: string },
): RecursoDadosGov {
  const alvo = criterio.ficheiro.toLowerCase();
  const candidatos = dataset.recursos.filter((recurso) => {
    const caminho = recurso.url.toLowerCase().split("?")[0];
    if (!caminho.endsWith(alvo)) return false;
    return criterio.formato ? recurso.formato === criterio.formato.toLowerCase() : true;
  });

  if (candidatos.length === 0) {
    throw new DadosGovError(
      "resource-not-found",
      `O dataset ${dataset.slug} não publica «${criterio.ficheiro}» no formato pedido.`,
    );
  }

  // Mais do que um: fica o mais recente. Uma republicação do mesmo
  // ficheiro é a situação normal, e a antiga não interessa.
  return [...candidatos].sort((esquerda, direita) =>
    (direita.atualizadoEm ?? "").localeCompare(esquerda.atualizadoEm ?? ""),
  )[0];
}
