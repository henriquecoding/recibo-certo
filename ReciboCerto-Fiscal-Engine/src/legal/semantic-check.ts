import type { LegalSource } from "../core/model";

export interface RetrievedLegalDocument {
  status: number;
  finalUrl: string;
  title: string;
  text: string;
}

export interface SourceCheckResult {
  sourceId: string;
  ok: boolean;
  failures: readonly string[];
  finalUrl: string;
}

function normalize(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-PT");
}

/**
 * Verificação semântica pura. O transporte HTTP fica fora do núcleo para que
 * CI, browser ou um worker possam fornecê-lo sem acoplar as regras à rede.
 */
export function assessLegalSource(
  source: LegalSource,
  document: RetrievedLegalDocument,
): SourceCheckResult {
  const failures: string[] = [];
  if (document.status < 200 || document.status >= 300) {
    failures.push(`HTTP ${document.status}.`);
  }
  if (!document.finalUrl.startsWith("https://")) {
    failures.push("A URL final não usa HTTPS.");
  }

  const haystack = normalize(`${document.title} ${document.text}`);
  for (const anchor of source.expectedAnchors) {
    if (!haystack.includes(normalize(anchor))) {
      failures.push(`Âncora obrigatória ausente: ${anchor}`);
    }
  }
  for (const anchor of source.forbiddenAnchors ?? []) {
    if (haystack.includes(normalize(anchor))) {
      failures.push(`Âncora proibida encontrada: ${anchor}`);
    }
  }

  return {
    sourceId: source.id,
    ok: failures.length === 0,
    failures,
    finalUrl: document.finalUrl,
  };
}
