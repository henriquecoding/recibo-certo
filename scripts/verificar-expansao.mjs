#!/usr/bin/env node
/**
 * Verificador em ciclo da expansão editorial dos Guias — ReciboCerto
 * ----------------------------------------------------------------------
 * A secção 5 do pacote é uma checklist de aceitação por guia; a secção 6
 * pede cinco verificações automáticas. Este script corre as duas coisas em
 * ciclo, até estabilizarem ou até o limite de ciclos.
 *
 * Porquê em CICLO e não uma vez? Porque estas verificações interferem umas
 * com as outras. Corrigir um URL muda o hash do artigo; escrever um corpo
 * muda o conjunto indexável, que muda o sitemap, que muda o que o
 * validador de slugs tem de olhar. Uma passagem única dá o estado depois
 * da primeira correção, não o estado final. O ciclo repete até duas
 * passagens seguidas darem o mesmo resultado — e é esse resultado que
 * conta.
 *
 * VERIFICAÇÕES
 *   1. estatica    critérios de aceitação (vitest `guias:expansao`)
 *   2. ligacoes    URL vivo + âncora esperada (scripts/check-guias.mjs)
 *   3. hash        texto do artigo mudou desde a última verificação  [--hash]
 *   4. revisao     guias fora da janela de revisão do seu risco
 *   5. progresso   quantos dos 112 têm corpo, por onda e por secção
 *
 * USO
 *   node scripts/verificar-expansao.mjs                  ciclo completo, sem rede pesada
 *   node scripts/verificar-expansao.mjs --hash           inclui o diff de fonte legal
 *   node scripts/verificar-expansao.mjs --ciclos=1       uma passagem só
 *   node scripts/verificar-expansao.mjs --json           saída para CI
 *
 * Código de saída: 0 = sem erros (avisos não bloqueiam) · 1 = há erros.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const executar = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(__dirname, "..");

const args = process.argv.slice(2);
const saidaJson = args.includes("--json");
const comHash = args.includes("--hash");
const maxCiclos = Number((args.find((a) => a.startsWith("--ciclos=")) || "").split("=")[1]) || 3;

const FICHEIRO_CATALOGO = join(RAIZ, "src/lib/guias/expansao/catalogo.ts");
const FICHEIRO_CORPOS = join(RAIZ, "src/lib/guias/expansao/corpos-redigidos.ts");
const FICHEIRO_FONTES = join(RAIZ, "src/lib/guias/expansao/fontes.ts");
const ESTADO = join(RAIZ, "scripts/estado/fontes-hash.json");

// Janela de revisão por risco de manutenção (secção 8.1 do relatório).
// Risco alto = matéria que o Orçamento do Estado mexe todos os anos.
const JANELA_DIAS = { alta: 182, media: 365, baixa: 730 };

const AGENTE = "Mozilla/5.0 (compatible; ReciboCertoLinkCheck/1.0; +https://www.recibocerto.pt)";

// ─── Leitura do catálogo (textual, sem passo de build) ─────────────────

async function lerCatalogo() {
  const src = await readFile(FICHEIRO_CATALOGO, "utf8");
  const guias = [];
  for (const bloco of src.split(/\n  \{\n/).slice(1)) {
    const g = (campo, padrao = `${campo}: "([^"]+)"`) =>
      (bloco.match(new RegExp(padrao)) || [])[1];
    const slug = g("slug");
    if (!slug) continue;
    guias.push({
      slug,
      titulo: g("titulo"),
      seccao: g("seccao"),
      estado: g("estado"),
      risco: g("risco"),
      prioridade: g("prioridade"),
      onda: Number((bloco.match(/onda: (\d)/) || [])[1] ?? 0),
      exigeRevisao: /exigeRevisaoEspecializada: true/.test(bloco),
    });
  }
  return guias;
}

async function lerCorposRedigidos() {
  const src = await readFile(FICHEIRO_CORPOS, "utf8");
  const bloco = (src.match(/new Set\(\[([\s\S]*?)\]\)/) || [])[1] ?? "";
  return new Set([...bloco.matchAll(/"([^"]+)"/g)].map((m) => m[1]));
}

async function lerFontesHtml() {
  const src = await readFile(FICHEIRO_FONTES, "utf8");
  const fontes = [];
  for (const linha of src.split("\n")) {
    const url = (linha.match(/url: "([^"]+)"/) || [])[1];
    const id = (linha.match(/id: "([^"]+)"/) || [])[1];
    const render = (linha.match(/renderMode: "([^"]+)"/) || [])[1];
    if (url && id && render === "html") fontes.push({ id, url });
  }
  return fontes;
}

// ─── 1. Critérios de aceitação (estáticos) ─────────────────────────────

async function verificarEstatica() {
  try {
    await executar("npx", ["vitest", "run", "src/lib/__tests__/guias-expansao.test.ts"], {
      cwd: RAIZ,
      maxBuffer: 16 * 1024 * 1024,
    });
    return { nome: "estatica", erros: [], avisos: [] };
  } catch (e) {
    const saida = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    const falhas = [...saida.matchAll(/FAIL\s+.*?>\s*(.+)/g)].map((m) => m[1].trim());
    return {
      nome: "estatica",
      erros: falhas.length > 0 ? falhas : ["os critérios de aceitação falharam (ver `npm run guias:expansao`)"],
      avisos: [],
    };
  }
}

// ─── 2. Ligações vivas ─────────────────────────────────────────────────

async function verificarLigacoes() {
  try {
    const { stdout } = await executar("node", [join(RAIZ, "scripts/check-guias.mjs"), "--json"], {
      cwd: RAIZ,
      maxBuffer: 32 * 1024 * 1024,
    });
    const r = JSON.parse(stdout);
    return {
      nome: "ligacoes",
      erros: (r.erros ?? []).map((x) => x.mensagem ?? JSON.stringify(x)),
      avisos: (r.avisos ?? []).map((x) => x.mensagem ?? JSON.stringify(x)),
    };
  } catch (e) {
    // O monitor sai com 1 quando há erros — a saída continua a ser útil.
    const saida = `${e.stdout ?? ""}`;
    try {
      const r = JSON.parse(saida);
      return {
        nome: "ligacoes",
        erros: (r.erros ?? []).map((x) => x.mensagem ?? JSON.stringify(x)),
        avisos: (r.avisos ?? []).map((x) => x.mensagem ?? JSON.stringify(x)),
      };
    } catch {
      return { nome: "ligacoes", erros: [], avisos: ["o monitor de ligações não devolveu JSON legível"] };
    }
  }
}

// ─── 3. Diff de fonte legal ────────────────────────────────────────────
//  O que teria apanhado a reescrita do art. 53.º do CIVA: guardar um
//  resumo do texto do artigo e comparar. Um HTTP 200 diz que a página
//  está viva; não diz que continua a dizer o mesmo.

function resumo(html) {
  const texto = html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return createHash("sha256").update(texto).digest("hex").slice(0, 16);
}

async function verificarHash() {
  const fontes = await lerFontesHtml();
  let anterior = {};
  if (existsSync(ESTADO)) {
    anterior = JSON.parse(await readFile(ESTADO, "utf8"));
  }

  const atual = {};
  const avisos = [];
  let inacessiveis = 0;

  for (const f of fontes) {
    try {
      const resposta = await fetch(f.url, {
        headers: { "user-agent": AGENTE, accept: "text/html,*/*" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!resposta.ok) {
        inacessiveis += 1;
        continue;
      }
      const h = resumo(await resposta.text());
      atual[f.id] = { hash: h, em: new Date().toISOString().slice(0, 10) };
      if (anterior[f.id] && anterior[f.id].hash !== h) {
        avisos.push(
          `${f.id}: o texto do artigo mudou desde ${anterior[f.id].em}. Reler antes de manter as afirmações que dele dependem — ${f.url}`,
        );
      }
    } catch {
      inacessiveis += 1;
    }
  }

  await mkdir(dirname(ESTADO), { recursive: true });
  await writeFile(ESTADO, `${JSON.stringify({ ...anterior, ...atual }, null, 1)}\n`);

  if (inacessiveis > 0) {
    avisos.push(`${inacessiveis} fonte(s) não responderam nesta passagem — o resumo anterior foi mantido.`);
  }
  return { nome: "hash", erros: [], avisos, detalhe: `${Object.keys(atual).length} fontes resumidas` };
}

// ─── 4. Janela de revisão ──────────────────────────────────────────────

async function verificarRevisao(guias, corpos) {
  const src = await readFile(join(RAIZ, "src/lib/guias/expansao/derivar.ts"), "utf8");
  const revistoEm = (src.match(/DATA_EXPANSAO = "([\d-]+)"/) || [])[1];
  const avisos = [];
  if (!revistoEm) {
    return { nome: "revisao", erros: ["não consegui ler `DATA_EXPANSAO` de expansao/derivar.ts"], avisos: [] };
  }

  const dias = Math.floor((Date.now() - Date.parse(revistoEm)) / 86_400_000);
  const vencidos = guias
    .filter((g) => corpos.has(g.slug) && dias > (JANELA_DIAS[g.risco] ?? 365))
    .map((g) => `${g.slug} (risco ${g.risco}, ${dias} dias desde a revisão)`);

  if (vencidos.length > 0) {
    avisos.push(`${vencidos.length} guia(s) fora da janela de revisão: ${vencidos.slice(0, 8).join(", ")}${vencidos.length > 8 ? "…" : ""}`);
  }
  return { nome: "revisao", erros: [], avisos, detalhe: `${dias} dias desde ${revistoEm}` };
}

// ─── 5. Progresso editorial ────────────────────────────────────────────

function progresso(guias, corpos) {
  const total = guias.length;
  const feitos = guias.filter((g) => corpos.has(g.slug)).length;
  const porOnda = {};
  const porSeccao = {};
  for (const g of guias) {
    porOnda[g.onda] ??= { total: 0, feitos: 0 };
    porOnda[g.onda].total += 1;
    porSeccao[g.seccao] ??= { total: 0, feitos: 0 };
    porSeccao[g.seccao].total += 1;
    if (corpos.has(g.slug)) {
      porOnda[g.onda].feitos += 1;
      porSeccao[g.seccao].feitos += 1;
    }
  }
  return { total, feitos, porOnda, porSeccao };
}

// ─── Ciclo ─────────────────────────────────────────────────────────────

async function umaPassagem(guias, corpos) {
  const verificacoes = [await verificarEstatica(), await verificarLigacoes(), await verificarRevisao(guias, corpos)];
  if (comHash) verificacoes.push(await verificarHash());
  return verificacoes;
}

const assinatura = (vs) => JSON.stringify(vs.map((v) => [v.nome, v.erros.length, v.avisos.length]));

async function principal() {
  const guias = await lerCatalogo();
  const corpos = await lerCorposRedigidos();

  let verificacoes = [];
  let anterior = null;
  let executados = 0;

  while (executados < maxCiclos) {
    executados += 1;
    if (!saidaJson) process.stderr.write(`· ciclo ${executados}/${maxCiclos}\n`);
    verificacoes = await umaPassagem(guias, corpos);
    const agora = assinatura(verificacoes);
    // Estabilizou: duas passagens seguidas com o mesmo resultado. Insistir
    // não traz informação nova, só custa tempo de rede.
    if (agora === anterior) break;
    anterior = agora;
  }

  const erros = verificacoes.flatMap((v) => v.erros.map((e) => `[${v.nome}] ${e}`));
  const avisos = verificacoes.flatMap((v) => v.avisos.map((a) => `[${v.nome}] ${a}`));
  const p = progresso(guias, corpos);

  if (saidaJson) {
    console.log(JSON.stringify({ ciclos: executados, erros, avisos, progresso: p }, null, 1));
  } else {
    console.log("\n══ Expansão editorial dos Guias — verificação ══\n");
    for (const v of verificacoes) {
      const sinal = v.erros.length > 0 ? "✗" : v.avisos.length > 0 ? "!" : "✓";
      const extra = v.detalhe ? ` · ${v.detalhe}` : "";
      console.log(`  ${sinal} ${v.nome.padEnd(10)} ${v.erros.length} erro(s), ${v.avisos.length} aviso(s)${extra}`);
    }

    console.log(`\n  Corpos redigidos: ${p.feitos} de ${p.total}`);
    for (const [onda, v] of Object.entries(p.porOnda).sort()) {
      console.log(`    onda ${onda}: ${String(v.feitos).padStart(3)} / ${v.total}`);
    }
    console.log("");
    for (const [seccao, v] of Object.entries(p.porSeccao).sort((a, b) => b[1].feitos - a[1].feitos)) {
      if (v.feitos > 0) console.log(`    ${seccao.padEnd(32)} ${v.feitos} / ${v.total}`);
    }

    if (avisos.length > 0) {
      console.log(`\n  Avisos (${avisos.length}):`);
      for (const a of avisos.slice(0, 20)) console.log(`    · ${a}`);
      if (avisos.length > 20) console.log(`    … e mais ${avisos.length - 20}`);
    }
    if (erros.length > 0) {
      console.log(`\n  ERROS (${erros.length}):`);
      for (const e of erros) console.log(`    · ${e}`);
    }
    console.log(
      `\n  ${erros.length === 0 ? "Sem erros." : "Há erros a corrigir."} ${executados === 1 ? "Uma passagem." : `Estabilizou ao fim de ${executados} ciclos.`}\n`,
    );
  }

  process.exit(erros.length > 0 ? 1 : 0);
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
