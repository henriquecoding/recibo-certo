// ═══════════════════════════════════════════════════════════════════════
//  OS INSTANTÂNEOS COMMITADOS — leitura, nunca escrita
//  ---------------------------------------------------------------------
//  A ingestão corre fora do produto e deixa aqui ficheiros JSON. Este
//  módulo é o único sítio por onde a aplicação os lê.
//
//  São `import`, e não `fs.readFile` de `public/`, por uma razão prática:
//  os ficheiros de `public/` não são rastreados para o pacote das funções
//  de servidor. O sintoma disso seria a ferramenta mostrar os números em
//  desenvolvimento e perdê-los em produção — o pior tipo de avaria, porque
//  passa em todos os testes locais.
//
//  Um `import` também torna a falta do ficheiro um erro de compilação, e
//  não uma surpresa em runtime.
// ═══════════════════════════════════════════════════════════════════════

import contratosPublicos from "./dados/contratos-publicos.json";
import { lerSnapshotBulk, type SnapshotBulk } from "./snapshot-local";

const BRUTOS: Readonly<Record<string, unknown>> = Object.freeze({
  "contratos-publicos": contratosPublicos,
});

// Validados uma vez, à carga do módulo. Um instantâneo que não atravesse
// `lerSnapshotBulk` não fica meio-lido: fica de fora, e o piloto que o usa
// degrada para «sem sinal» em vez de publicar um objeto malformado.
const VALIDADOS: ReadonlyMap<string, SnapshotBulk> = new Map(
  Object.entries(BRUTOS)
    .map(([id, bruto]) => [id, lerSnapshotBulk(bruto)] as const)
    .filter((par): par is readonly [string, SnapshotBulk] => par[1] !== null),
);

export function obterSnapshotBulk(id: string): SnapshotBulk | undefined {
  return VALIDADOS.get(id);
}

export function listarSnapshotsBulk(): readonly SnapshotBulk[] {
  return [...VALIDADOS.values()];
}
