#!/usr/bin/env node
/**
 * Monitor de dados fiscais — Recibo Certo
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
// FISCAL_YEAR vive num módulo leve à parte; fiscal-data.ts apenas o re-exporta.
const FISCAL_YEAR_FILE = join(__dirname, "..", "src", "lib", "fiscal-year.ts");
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
  const yearSrc = await readFile(FISCAL_YEAR_FILE, "utf8");

  const fiscalYear = Number((yearSrc.match(/FISCAL_YEAR\s*=\s*(\d{4})/) || [])[1]);
  const lastReview = (src.match(/DATA_LAST_REVIEW\s*=\s*"(\d{4}-\d{2}-\d{2})"/) || [])[1];
  const today = (src.match(/const TODAY\s*=\s*"(\d{4}-\d{2}-\d{2})"/) || [])[1];
  const urls = [...src.matchAll(/url:\s*"([^"]+)"/g)].map((m) => m[1]);

  const errors = [];
  const warnings = [];
  const info = [];

  if (!fiscalYear) errors.push("Não foi possível ler FISCAL_YEAR de fiscal-year.ts.");
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
  // O ficheiro tem várias datas de verificação (TODAY e os vários REV_*/`*_TODAY`),
  // porque os parâmetros foram confirmados em alturas diferentes. Exigir que TODAY
  // fosse igual a DATA_LAST_REVIEW dava um aviso permanente e sem significado. O
  // que tem de ser verdade é outra coisa: DATA_LAST_REVIEW é a data mostrada ao
  // utilizador e não pode ficar atrás da verificação mais recente.
  const datasVerificacao = [...src.matchAll(/^const [A-Z_]+ = "(\d{4}-\d{2}-\d{2})";/gm)].map((m) => m[1]);
  if (lastReview && datasVerificacao.length > 0) {
    const maisRecente = datasVerificacao.reduce((a, b) => (a > b ? a : b));
    if (maisRecente > lastReview) {
      warnings.push(
        `DATA_LAST_REVIEW (${lastReview}) é anterior à verificação mais recente do ficheiro (${maisRecente}). Atualizar DATA_LAST_REVIEW.`
      );
    } else {
      info.push(`Datas de verificação coerentes (mais recente: ${maisRecente} ≤ revisão ${lastReview}).`);
    }
  }
  if (today && lastReview && today > lastReview) {
    warnings.push(`REV_BASE_2026_06 (${today}) é posterior a DATA_LAST_REVIEW (${lastReview}). Confirmar coerência das datas.`);
  }

  // ┌───────────────────────────────────────────────────────────────────────┐
  // │ FRESCURA — a distância entre o que se ANUNCIA e o que se verificou     │
  // │                                                                       │
  // │ A verificação acima só olha para a data MAIS RECENTE. Um ficheiro em   │
  // │ que 85 parâmetros estão parados em junho e um só foi tocado em         │
  // │ setembro passa nela sem uma palavra — e é exatamente o estado real     │
  // │ deste ficheiro. A interface anuncia «revisto a 01/09»; para 16% dos    │
  // │ parâmetros isso quer dizer «alguém reviu outra coisa nesse dia».       │
  // │                                                                       │
  // │ Isto conta quantos parâmetros usam cada constante de data e mostra a   │
  // │ distribuição. Não é uma reprovação: um parâmetro estável pode ficar    │
  // │ anos certo sem mudar. É deixar de ser invisível.                       │
  // └───────────────────────────────────────────────────────────────────────┘
  const FOLGA_DIAS = 120;
  if (lastReview && datasVerificacao.length > 0) {
    // Quantos parâmetros usam cada constante `REV_*`.
    const usos = new Map();
    for (const [, nome] of src.matchAll(/^const ([A-Z_0-9]+) = "\d{4}-\d{2}-\d{2}";/gm)) {
      const n = [...src.matchAll(new RegExp(`\\b${nome}\\b`, "g"))].length - 1;
      const data = (src.match(new RegExp(`^const ${nome} = "(\\d{4}-\\d{2}-\\d{2})";`, "m")) || [])[1];
      if (data && n > 0) usos.set(data, (usos.get(data) ?? 0) + n);
    }
    const porData = [...usos.entries()].sort();
    if (porData.length > 0) {
      const total = porData.reduce((soma, [, n]) => soma + n, 0);
      const dias = (d) => Math.round((new Date(lastReview) - new Date(d)) / 86400000);
      const atrasados = porData.filter(([d]) => dias(d) > FOLGA_DIAS);
      const nAtrasados = atrasados.reduce((soma, [, n]) => soma + n, 0);

      info.push(
        // NÃO é o total de parâmetros: é quantas VEZES cada constante `REV_*`
        // aparece no código. Os parâmetros nascidos dentro de ciclos ou `map`
        // contam uma vez pela constante e várias no registo, por isso este
        // número fica abaixo do `PARAMETROS_TODOS.length` que as páginas
        // publicam. Serve para ver a DISTRIBUIÇÃO por data, não para contar.
        `Frescura: ${total} usos de constantes de data em ${porData.length} datas de verificação ` +
          `(o total publicado vem de PARAMETROS_TODOS, e é maior). ` +
          `Mais antiga: ${porData[0][0]} (${porData[0][1]} usos, ${dias(porData[0][0])} dias antes da revisão).`
      );
      if (nAtrasados > 0) {
        warnings.push(
          `${nAtrasados} uso(s) de data foram verificados há mais de ${FOLGA_DIAS} dias face a ` +
            `DATA_LAST_REVIEW (${lastReview}): ${atrasados.map(([d, n]) => `${d} (${n})`).join(", ")}. ` +
            "A interface anuncia a revisão global — reverificar ou registar a razão de continuarem válidos."
        );
      }
    }
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
  linhas.push(`# Verificação de dados fiscais — Recibo Certo`);
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
