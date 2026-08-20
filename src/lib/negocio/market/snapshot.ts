import type { GeographyRef, MarketObservation, MarketSnapshot, MarketSourceHealth } from "./tipos";

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`)
    .join(",")}}`;
}

async function digest(algorithm: "SHA-256" | "HMAC", text: string, key?: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) throw new Error("Web Crypto é obrigatório.");
  const bytes = new TextEncoder().encode(text);
  if (algorithm === "SHA-256") {
    const output = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(output), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  if (!key) throw new Error("A assinatura HMAC exige uma chave.");
  const imported = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const output = await crypto.subtle.sign("HMAC", imported, bytes);
  return Array.from(new Uint8Array(output), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export interface BuildMarketSnapshotInput {
  id: string;
  generatedAt: string;
  geography: GeographyRef;
  observations: readonly MarketObservation[];
  sourceHealth: readonly MarketSourceHealth[];
  formulaVersions: readonly string[];
  signingKey: string;
}

/** Produz um manifesto determinístico; a chave fica apenas no servidor/CI. */
export async function buildMarketSnapshot(input: BuildMarketSnapshotInput): Promise<MarketSnapshot> {
  if (!input.signingKey.trim()) throw new Error("A assinatura não pode usar uma chave vazia.");
  const unsigned = {
    id: input.id,
    schemaVersion: 1,
    generatedAt: input.generatedAt,
    geography: input.geography,
    observationIds: input.observations.map((item) => item.id).sort(),
    sourceHealth: [...input.sourceHealth].sort((a, b) => a.sourceId.localeCompare(b.sourceId)),
    formulaVersions: [...input.formulaVersions].sort(),
  };
  const manifestHash = `sha256:${await digest("SHA-256", canonical(unsigned))}`;
  const signature = `hmac-sha256:${await digest("HMAC", manifestHash, input.signingKey)}`;
  return { ...unsigned, manifestHash, signature };
}
