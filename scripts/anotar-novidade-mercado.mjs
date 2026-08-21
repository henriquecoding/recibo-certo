#!/usr/bin/env node
/**
 * A ATUALIZAÇÃO DE DADOS TAMBÉM É UMA NOVIDADE.
 * ----------------------------------------------------------------------
 * A regra 9 do CLAUDE.md não abre exceções: nada chega a `main` sem subir
 * `APP_VERSION` e sem uma entrada no popup de Novidades. Um job que
 * atualiza números e passa ao lado dessa regra teria de a enfraquecer para
 * si próprio — e a regra existe precisamente porque a exceção seguinte é
 * sempre fácil de justificar.
 *
 * Por isso este passo escreve a entrada, e escreve-a com os números que
 * mudaram mesmo. «Atualizámos os dados» não diz nada a ninguém; «os
 * contratos de serviços de 2025 passaram de 230 705 para 230 709» diz.
 *
 * Uso:
 *   node scripts/anotar-novidade-mercado.mjs resumo.json
 *
 * Sai com 0 e não toca em nada quando não houve alterações — é isso que
 * impede um commit por semana a dizer que está tudo na mesma.
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const VERSION_TS = join(RAIZ, "src", "lib", "version.ts");
const CHANGELOG_TS = join(RAIZ, "src", "lib", "changelog.ts");

const ROTULOS = {
  "procurement.contracts.services": "contratos de serviços e bens celebrados",
  "procurement.open_procedures": "procedimentos abertos à concorrência",
};

const numero = (valor) => Number(valor).toLocaleString("pt-PT");

function frasesDaAlteracao(alteracao) {
  const periodo = alteracao.periodo ? ` de ${alteracao.periodo}` : "";
  const itens = [];

  for (const nacional of alteracao.nacionais) {
    const rotulo = ROTULOS[nacional.metricId] ?? nacional.metricId;
    if (nacional.antes === null) {
      itens.push(
        `Passámos a contar os ${rotulo}${periodo} em todo o país: ${numero(nacional.depois)}, ` +
          "com a repartição pelas nove regiões.",
      );
      continue;
    }
    if (nacional.antes === nacional.depois) continue;
    const subiu = nacional.depois > nacional.antes;
    const diferenca = numero(Math.abs(nacional.depois - nacional.antes));
    itens.push(
      `Os ${rotulo}${periodo} passaram de ${numero(nacional.antes)} para ` +
        `${numero(nacional.depois)} em todo o país — ${subiu ? "mais" : "menos"} ${diferenca}. ` +
        "O Portal BASE continua a registar contratos de anos já fechados, e é por isso que o número se move.",
    );
  }

  if (alteracao.zonasComMudanca > 0 && !alteracao.primeiraVez) {
    itens.push(
      `${alteracao.zonasComMudanca} leitura(s) por região mudaram de valor com esta atualização.`,
    );
  }
  if (alteracao.extraidoDe) {
    itens.push(
      `A extração foi feita sobre o ficheiro que o portal publicou em ${alteracao.extraidoDe.slice(0, 10)}. ` +
        "O valor anunciado dos contratos continua a não entrar em número nenhum: contam-se contratos, não euros.",
    );
  }

  return itens;
}

async function principal() {
  const caminho = process.argv[2];
  if (!caminho) {
    console.error("Falta o caminho do resumo. Uso: anotar-novidade-mercado.mjs resumo.json");
    process.exit(1);
  }

  const resumo = JSON.parse(await readFile(caminho, "utf8"));
  if (resumo.falhou) {
    console.error("[novidade] a ingestão falhou; não há nada para anotar.");
    process.exit(1);
  }

  const itens = (resumo.alteracoes ?? []).flatMap(frasesDaAlteracao);
  if (itens.length === 0) {
    console.log("[novidade] nada mudou. `version.ts` e `changelog.ts` ficam intactos.");
    process.exit(0);
  }

  const versaoTexto = await readFile(VERSION_TS, "utf8");
  const encontrado = versaoTexto.match(/^export const APP_VERSION = "(\d+)\.(\d+)\.(\d+)";$/m);
  if (!encontrado) {
    console.error("Não encontrei APP_VERSION em src/lib/version.ts.");
    process.exit(1);
  }
  const [, maior, menor, patch] = encontrado;
  const nova = `${maior}.${menor}.${Number(patch) + 1}`;

  await writeFile(
    VERSION_TS,
    versaoTexto.replace(
      /^export const APP_VERSION = "\d+\.\d+\.\d+";$/m,
      `export const APP_VERSION = "${nova}";`,
    ),
    "utf8",
  );

  const changelogTexto = await readFile(CHANGELOG_TS, "utf8");
  const ancora = "const NOVAS_ENTRADAS: EntradaChangelog[] = [";
  if (!changelogTexto.includes(ancora)) {
    console.error("Não encontrei o início de NOVAS_ENTRADAS em src/lib/changelog.ts.");
    process.exit(1);
  }

  const entrada = [
    "  {",
    `    version: ${JSON.stringify(nova)},`,
    `    data: ${JSON.stringify(new Date().toISOString().slice(0, 10))},`,
    `    titulo: ${JSON.stringify("Números dos contratos públicos atualizados na fonte oficial")},`,
    "    itens: [",
    ...itens.map((item) => `      ${JSON.stringify(item)},`),
    "    ],",
    "  },",
  ].join("\n");

  await writeFile(
    CHANGELOG_TS,
    changelogTexto.replace(ancora, `${ancora}\n${entrada}`),
    "utf8",
  );

  console.log(`[novidade] APP_VERSION ${encontrado[1]}.${menor}.${patch} → ${nova}`);
  for (const item of itens) console.log(`  · ${item}`);
}

await principal();
