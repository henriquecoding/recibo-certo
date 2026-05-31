#!/usr/bin/env node
/**
 * Monitor de dados fiscais — ReciboCerto
 * ----------------------------------------------------------------------
 * Deteta quando os dados fiscais estão desatualizados ou por reverificar
 * e produz um relatório. NÃO altera dados — o objetivo é ABRIR A PORTA DE
 * VERIFICAÇÃO HUMANA (via issue/PR na GitHub Action). Aplicar números à
 * lei automaticamente, sem revisão, seria perigoso num produto financeiro.
 *
 * Sinais verificados:
 *   1. O ano fiscal dos dados é anterior ao ano civil atual  → ERRO.
 *   2. A última revisão (DATA_LAST_REVIEW) excede MAX_AGE_DAYS → ERRO.
 *   3. (opcional, --check-sources) URLs das fontes inacessíveis → AVISO.
 *
 * Uso:
 *   node scripts/check-fiscal-data.mjs [--check-sources] [--now=YYYY-MM-DD]
 *
 * Código de saída: 0 = ok · 1 = requer reverificação humana.
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, "..", "src", "lib", "fiscal-data.ts");
const REPORT_FILE = join(__dirname, "..", "fiscal-check-report.md");

const MAX_AGE_DAYS = 120; // após este período, recomenda-se reverificação.

const args = process.argv.slice(2);
const checkSources = args.includes("--check-sources");
const nowArg = args.find((a) => a.startsWith("--now="));
const now = nowArg ? new Date(nowArg.split("=")[1] + "T00:00:00") : new Date();

function daysBetween(a, b) {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

function isoLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function main() {
  const src = await readFile(DATA_FILE, "utf8");

  const fiscalYear = Number((src.match(/FISCAL_YEAR\s*=\s*(\d{4})/) || [])[1]);
  const lastReview = (src.match(/DATA_LAST_REVIEW\s*=\s*"(\d{4}-\d{2}-\d{2})"/) || [])[1];
  const today = (src.match(/const TODAY\s*=\s*"(\d{4}-\d{2}-\d{2})"/) || [])[1];
  const urls = [...src.matchAll(/url:\s*"([^"]+)"/g)].map((m) => m[1]);

  const errors = [];
  const warnings = [];
  const info = [];

  if (!fiscalYear) errors.push("Não foi possível ler FISCAL_YEAR de fiscal-data.ts.");
  if (!lastReview) errors.push("Não foi possível ler DATA_LAST_REVIEW de fiscal-data.ts.");

  // 1) Ano fiscal vs. ano civil.
  if (fiscalYear) {
    const anoAtual = now.getFullYear();
    if (anoAtual > fiscalYear) {
      errors.push(
        `Os dados são do ano fiscal ${fiscalYear}, mas o ano civil atual é ${anoAtual}. ` +
          `Reverificar todas as taxas contra as fontes oficiais e o Orçamento do Estado ${anoAtual}.`
      );
    } else {
      info.push(`Ano fiscal dos dados (${fiscalYear}) está alinhado com o ano civil (${anoAtual}).`);
    }
  }

  // 2) Idade da última revisão.
  if (lastReview) {
    const idade = daysBetween(now, new Date(lastReview + "T00:00:00"));
    info.push(`Última revisão: ${lastReview} (há ${idade} dias).`);
    if (idade > MAX_AGE_DAYS) {
      errors.push(`A última revisão tem ${idade} dias (limite: ${MAX_AGE_DAYS}). Recomenda-se reverificar as fontes.`);
    }
  }
  if (today && lastReview && today !== lastReview) {
    warnings.push(`TODAY (${today}) difere de DATA_LAST_REVIEW (${lastReview}). Confirmar coerência das datas.`);
  }

  // 3) Acessibilidade das fontes (opcional).
  if (checkSources && urls.length > 0) {
    info.push(`A verificar ${urls.length} fontes…`);
    for (const url of urls) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 10_000);
        const res = await fetch(url, { method: "GET", signal: ctrl.signal, redirect: "follow" });
        clearTimeout(t);
        if (!res.ok) warnings.push(`Fonte respondeu ${res.status}: ${url}`);
      } catch (e) {
        warnings.push(`Fonte inacessível: ${url} (${e.name || "erro"})`);
      }
    }
  }

  // Relatório
  const ok = errors.length === 0;
  const linhas = [];
  linhas.push(`# Verificação de dados fiscais — ReciboCerto`);
  linhas.push("");
  linhas.push(`- Data da verificação: ${isoLocal(now)}`);
  linhas.push(`- Ano fiscal dos dados: ${fiscalYear || "?"}`);
  linhas.push(`- Última revisão: ${lastReview || "?"}`);
  linhas.push(`- Estado: ${ok ? "OK" : "REQUER REVERIFICAÇÃO"}`);
  linhas.push("");
  if (errors.length) {
    linhas.push("## Ações necessárias");
    errors.forEach((e) => linhas.push(`- [ ] ${e}`));
    linhas.push("");
  }
  if (warnings.length) {
    linhas.push("## Avisos");
    warnings.forEach((w) => linhas.push(`- ${w}`));
    linhas.push("");
  }
  if (info.length) {
    linhas.push("## Informação");
    info.forEach((i) => linhas.push(`- ${i}`));
    linhas.push("");
  }
  linhas.push("> Processo: confirmar cada valor contra a fonte legal, atualizar `src/lib/fiscal-data.ts`");
  linhas.push("> (valores + `lastVerified` + `DATA_LAST_REVIEW`) e abrir PR. As asserções de integridade");
  linhas.push("> bloqueiam o build se os dados ficarem inconsistentes.");

  const relatorio = linhas.join("\n");
  await writeFile(REPORT_FILE, relatorio + "\n", "utf8");
  console.log(relatorio);

  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error("Erro no monitor de dados fiscais:", e);
  process.exit(2);
});
