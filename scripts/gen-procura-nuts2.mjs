#!/usr/bin/env node
/**
 * O INSTANTÂNEO DE PROCURA — commitado, como já era o da oferta
 * ----------------------------------------------------------------------
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PORQUE ISTO EXISTE                                                   │
 * │                                                                     │
 * │ Os dois eixos do motor tinham arquiteturas opostas, e só uma        │
 * │ sobrevivia a um mau dia:                                             │
 * │                                                                     │
 * │   OFERTA   `import` de JSON commitado ....... entrega 100 %         │
 * │   PROCURA  `fetch` ao INE/Eurostat/RNAL no PEDIDO ... 0 % sem rede  │
 * │                                                                     │
 * │ Quando os pilotos não respondem, `procura` fica `null` em TODAS as  │
 * │ hipóteses — dezassete pontos em cem desaparecem sem deixar rasto no │
 * │ ecrã, e a pessoa recebe «não sabemos» sobre tudo. Medido: com os    │
 * │ pilotos ligados o eixo pontua em ~42 % das hipóteses; sem eles, em  │
 * │ 0 %.                                                                 │
 * │                                                                     │
 * │ A correção não é arquitetura nova. É replicar no eixo da procura o  │
 * │ padrão que já está escrito, testado e a funcionar no da oferta:     │
 * │ um job colhe, o repositório guarda, e o pedido do utilizador lê de  │
 * │ um ficheiro que está sempre lá.                                      │
 * │                                                                     │
 * │     ANTES:  fetch ao vivo → falhou? → nada                          │
 * │     DEPOIS: instantâneo (há sempre) → fetch ao vivo → substitui     │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * ── PORQUE `nuts2` E NÃO `concelhos` NO NOME ─────────────────────────
 * O relatório que pediu isto chamou-lhe `procura-concelhos.json`, por
 * simetria com a matriz de oferta. Seria um nome errado: as séries de
 * procura que os pilotos leem publicam-se às NUTS II e ao país, não aos
 * 308 concelhos. Um ficheiro chamado «concelhos» com dados regionais
 * seria exatamente o género de número plausível e conclusão errada que
 * o resto deste motor existe para não produzir. O nome diz a
 * granularidade que os dados têm.
 *
 * ── PORQUE NÃO REIMPLEMENTA NADA ─────────────────────────────────────
 * Carrega o `pilot-loader.ts` da aplicação pelo próprio módulo, com o
 * mesmo padrão de `ingerir-mercado.mjs`. Os manifestos, os conectores, a
 * quarentena, a frescura e o gate de evidência são TypeScript testado —
 * reimplementá-los aqui daria duas versões da mesma regra, a divergir na
 * primeira correção. Este ficheiro só orquestra e serializa.
 *
 * Uso:
 *   node scripts/gen-procura-nuts2.mjs           reescreve o instantâneo
 *   node scripts/gen-procura-nuts2.mjs --check   falha se divergir
 *
 * Fontes: INE (pindica.jsp), Eurostat, RNAL/Turismo de Portugal e o
 * instantâneo de contratos públicos do dados.gov — as mesmas que os
 * pilotos já usam, com as mesmas licenças já analisadas.
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = join(
  RAIZ, "src", "lib", "negocio", "market", "bulk", "dados", "procura-nuts2.json",
);

/**
 * Carrega o carregador de pilotos da aplicação, em TypeScript, sem o
 * traduzir. Mesmo padrão de `ingerir-mercado.mjs`.
 */
async function carregarLoader() {
  const { createServer } = await import("vite");
  const servidor = await createServer({
    root: RAIZ,
    logLevel: "error",
    server: { middlewareMode: true, watch: null },
    resolve: { alias: { "@": join(RAIZ, "src") } },
  });
  const modulo = await servidor.ssrLoadModule("/src/lib/negocio/market/pilot-loader.ts");
  return { loadPilotMarketEvidence: modulo.loadPilotMarketEvidence, fechar: () => servidor.close() };
}

async function construir() {
  const { loadPilotMarketEvidence, fechar } = await carregarLoader();
  let pilotos;
  try {
    pilotos = await loadPilotMarketEvidence({});
  } finally {
    await fechar();
  }

  // ── Um instantâneo vazio é pior do que nenhum ─────────────────────
  //  Escrevê-lo apagaria as leituras boas que estão no repositório e
  //  substituí-las-ia por «não sabemos», que é precisamente o ecrã que
  //  este ficheiro existe para evitar. Falhar aqui deixa o instantâneo
  //  anterior intacto — velho é melhor do que vazio.
  const totalObs = pilotos.reduce((soma, item) => soma + item.observations.length, 0);
  if (totalObs === 0) {
    throw new Error(
      "Nenhuma observação veio das fontes nesta corrida. O instantâneo anterior fica como está.",
    );
  }
  const vazios = pilotos.filter((item) => item.observations.length === 0);

  const documento = {
    schemaVersion: 1,
    id: "procura-nuts2",
    geradoEm: new Date().toISOString(),
    /**
     * A granularidade REAL destas séries. Está aqui para quem ler o
     * ficheiro não ter de a deduzir do nome.
     */
    granularidade: "nuts2+pais",
    /** Pilotos que vieram sem uma única leitura. Declarados, não escondidos. */
    semObservacoes: vazios.map((item) => item.templateId).sort(),
    pilotos,
  };

  // O hash cobre os DADOS e não `geradoEm`: sem isto o job commitava a
  // cada corrida só para dizer que os números continuam iguais.
  //
  // `checkedAt` e `retrievedAt` também saem da conta, e pela mesma razão:
  // são carimbos de quando perguntámos, não do que a fonte respondeu.
  const semCarimbos = JSON.stringify(documento, (chave, valor) =>
    chave === "geradoEm" || chave === "checkedAt" || chave === "retrievedAt" ? undefined : valor,
  );
  documento.contentHash = `sha256:${createHash("sha256").update(semCarimbos).digest("hex")}`;
  return documento;
}

const conferir = process.argv.includes("--check");
const documento = await construir();
const serializado = `${JSON.stringify(documento, null, 2)}\n`;
const contarObs = (doc) => doc.pilotos.reduce((soma, item) => soma + item.observations.length, 0);

if (conferir) {
  let atual;
  try {
    atual = JSON.parse(readFileSync(DESTINO, "utf8"));
  } catch {
    console.error("✗ procura-nuts2.json não existe. Corre o gerador.");
    process.exit(1);
  }
  if (atual.contentHash !== documento.contentHash) {
    console.error(
      `✗ procura-nuts2.json desatualizado.\n  no repositório: ${atual.contentHash}\n  nas fontes agora: ${documento.contentHash}`,
    );
    process.exit(1);
  }
  console.log(
    `✓ procura-nuts2.json em dia — ${atual.pilotos.length} pilotos · ${contarObs(atual)} observações.`,
  );
} else {
  writeFileSync(DESTINO, serializado, "utf8");
  console.log(
    `✓ procura-nuts2.json escrito — ${documento.pilotos.length} pilotos · ${contarObs(documento)} observações · ${(serializado.length / 1024).toFixed(1)} KB${
      documento.semObservacoes.length > 0 ? ` · sem leituras: ${documento.semObservacoes.join(", ")}` : ""
    }`,
  );
}
