#!/usr/bin/env node
/**
 * Monitor de fontes dos Guias — ReciboCerto
 * ----------------------------------------------------------------------
 * Cobre as duas verificações do ponto 7.3 da auditoria que dependem da
 * rede: `guias:links` e `guias:semantics`. As restantes sete são estáticas
 * e correm em vitest (`src/lib/__tests__/guias.test.ts`), onde têm acesso
 * aos tipos e falham o CI sem esperar por respostas HTTP.
 *
 * A lição central da auditoria: **HTTP 200 não é suficiente**. Uma ligação
 * pode estar tecnicamente viva e continuar juridicamente errada — a página
 * do PGDL devolve 200 com o corpo "A query falhou!", e o caminho antigo do
 * CIRC devolve 200 com a redação até 2013. Por isso este monitor distingue:
 *
 *   · falha transitória      → repetição controlada antes de acusar
 *   · bloqueio técnico       → 403/429 de anti-automação, não é link morto
 *   · redirecionamento       → destino final diferente do declarado
 *   · conteúdo inesperado    → falta uma âncora esperada
 *   · versão histórica       → aparece uma âncora proibida
 *   · fonte retirada         → 404/410
 *
 * Páginas servidas por SPA (Diário da República, Segurança Social) e PDFs
 * não têm âncoras verificáveis no corpo: aí só se valida disponibilidade,
 * e isso está declarado no catálogo (`renderMode`), não assumido aqui.
 *
 * Uso:
 *   node scripts/check-guias.mjs [--json] [--timeout=15000]
 *
 * Código de saída: 0 = ok (ou só avisos) · 1 = há erros a corrigir.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FICHEIRO = join(__dirname, "..", "src", "lib", "guias", "legal-sources.ts");

const args = process.argv.slice(2);
const saidaJson = args.includes("--json");
const timeoutMs = Number((args.find((a) => a.startsWith("--timeout=")) || "").split("=")[1]) || 15_000;

const TENTATIVAS = 3;
const ESPERA_BASE_MS = 800;
const AGENTE =
  "Mozilla/5.0 (compatible; ReciboCertoLinkCheck/1.0; +https://www.recibocerto.pt)";

const ANCORAS_PROIBIDAS_GLOBAIS = ["A query falhou", "versão até 2013", "versão até 2011"];

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Extrai as fontes do catálogo por análise textual.
 * Deliberadamente sem compilar TypeScript: este script tem de correr num
 * runner de CI mínimo, sem passo de build.
 */
function extrairFontes(src) {
  const fontes = [];
  // Cada entrada tem um `url:` e, à sua volta, os campos que nos interessam.
  const blocos = src.split(/\n  [a-zA-Z0-9_]+: \{/);
  for (const bloco of blocos) {
    const url = (bloco.match(/url:\s*"([^"]+)"/) || [])[1];
    if (!url || !url.startsWith("http")) continue;
    const id = (bloco.match(/id:\s*"([^"]+)"/) || [])[1] ?? url;
    const titulo = (bloco.match(/title:\s*"([^"]+)"/) || [])[1] ?? id;
    const renderMode = (bloco.match(/renderMode:\s*"([^"]+)"/) || [])[1] ?? "html";
    const status = (bloco.match(/status:\s*"([^"]+)"/) || [])[1] ?? "active";
    const brutoAncoras = (bloco.match(/expectedAnchors:\s*\[([^\]]*)\]/) || [])[1] ?? "";
    const expectedAnchors = [...brutoAncoras.matchAll(/[`"]([^`"]+)[`"]/g)]
      .map((m) => m[1])
      .filter((a) => a && !a.includes("${"));
    const brutoProibidas = (bloco.match(/forbiddenAnchors:\s*\[([^\]]*)\]/) || [])[1] ?? "";
    const forbiddenAnchors = [...brutoProibidas.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    fontes.push({ id, titulo, url, renderMode, status, expectedAnchors, forbiddenAnchors });
  }

  // O construtor `at(...)` gera as fontes do Portal das Finanças; as suas
  // âncoras são interpoladas ("Artigo ${artigo}"), por isso derivam-se aqui
  // a partir da própria chamada.
  for (const m of src.matchAll(
    /^\s{2}([a-zA-Z0-9_]+): at\("([^"]+)",\s*"([^"]+)",\s*"([^"]*)",\s*"([^"]+)",\s*"([^"]+)"\)/gm,
  )) {
    const [, , id, artigo, titulo, slug, codigo] = m;
    fontes.push({
      id,
      titulo,
      url: `https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/${codigo}/Pages/${slug}.aspx`,
      renderMode: "html",
      status: "active",
      expectedAnchors: [`Artigo ${artigo}`],
      forbiddenAnchors: [],
    });
  }

  // Desduplicar por URL (as entradas com spread aparecem duas vezes).
  const porUrl = new Map();
  for (const f of fontes) if (!porUrl.has(f.url)) porUrl.set(f.url, f);
  return [...porUrl.values()];
}

function normalizar(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

async function obter(url) {
  let ultimoErro = null;
  for (let tentativa = 1; tentativa <= TENTATIVAS; tentativa++) {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), timeoutMs);
    try {
      const resposta = await fetch(url, {
        redirect: "follow",
        signal: controlador.signal,
        headers: { "user-agent": AGENTE, accept: "text/html,application/pdf,*/*" },
      });
      const tipo = resposta.headers.get("content-type") ?? "";
      const corpo = tipo.includes("pdf") ? "" : await resposta.text().catch(() => "");
      return { estado: resposta.status, urlFinal: resposta.url, corpo, tipo };
    } catch (erro) {
      ultimoErro = erro;
      // Repetição controlada: uma falha de rede isolada não prova que a
      // fonte esteja permanentemente indisponível (ponto 2.2 da auditoria).
      if (tentativa < TENTATIVAS) await espera(ESPERA_BASE_MS * 2 ** (tentativa - 1));
    } finally {
      clearTimeout(temporizador);
    }
  }
  return { erro: ultimoErro?.name === "AbortError" ? "tempo excedido" : "falha de rede" };
}

function mesmoRecurso(a, b) {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    const limpa = (u) => `${u.host}${u.pathname.replace(/\/$/, "")}`.toLowerCase();
    return limpa(ua) === limpa(ub);
  } catch {
    return a === b;
  }
}

async function verificar(fonte) {
  const r = await obter(fonte.url);

  if (r.erro) {
    // Sem resposta após repetições: é um aviso, não uma certeza. Pode ser
    // bloqueio de rede do runner de CI.
    return { fonte, nivel: "aviso", diagnostico: `sem resposta (${r.erro}) após ${TENTATIVAS} tentativas` };
  }

  if (r.estado === 404 || r.estado === 410) {
    return { fonte, nivel: "erro", diagnostico: `fonte retirada (HTTP ${r.estado})` };
  }
  if (r.estado === 403 || r.estado === 429) {
    return { fonte, nivel: "aviso", diagnostico: `bloqueio anti-automação (HTTP ${r.estado}) — verificar à mão` };
  }
  if (r.estado >= 500) {
    return { fonte, nivel: "aviso", diagnostico: `indisponibilidade temporária (HTTP ${r.estado})` };
  }
  if (r.estado >= 300 || r.estado < 200) {
    return { fonte, nivel: "erro", diagnostico: `resposta inesperada (HTTP ${r.estado})` };
  }

  const avisos = [];
  if (!mesmoRecurso(fonte.url, r.urlFinal)) {
    avisos.push(`redirecionado para ${r.urlFinal}`);
  }

  // Só páginas HTML têm corpo verificável. SPAs e PDFs estão declarados no
  // catálogo e não são avaliados semanticamente — dizê-lo é mais honesto do
  // que fingir uma verificação que não existe.
  if (fonte.renderMode === "html" && r.corpo) {
    const corpo = normalizar(r.corpo);

    const proibidas = [...ANCORAS_PROIBIDAS_GLOBAIS, ...fonte.forbiddenAnchors];
    const encontradaProibida = proibidas.find((a) => corpo.includes(normalizar(a)));
    if (encontradaProibida) {
      return {
        fonte,
        nivel: "erro",
        diagnostico: `conteúdo proibido presente: «${encontradaProibida}» — versão histórica ou página de erro servida com HTTP 200`,
      };
    }

    const emFalta = fonte.expectedAnchors.filter((a) => !corpo.includes(normalizar(a)));
    if (emFalta.length > 0) {
      return {
        fonte,
        nivel: "erro",
        diagnostico: `âncora esperada em falta: ${emFalta.map((a) => `«${a}»`).join(", ")}`,
      };
    }
  }

  if (fonte.status === "historical") {
    avisos.push("declarada como histórica — só pode aparecer como comparação identificada");
  }

  return {
    fonte,
    nivel: avisos.length > 0 ? "aviso" : "ok",
    diagnostico: avisos.join(" · ") || "disponível e coerente",
  };
}

async function main() {
  const src = await readFile(FICHEIRO, "utf8");
  const fontes = extrairFontes(src);

  if (fontes.length === 0) {
    console.error("Não foi possível extrair nenhuma fonte do catálogo legal.");
    process.exit(1);
  }

  const resultados = [];
  // Sequencial de propósito: em paralelo, portais públicos respondem com
  // 429 e o relatório encher-se-ia de falsos positivos.
  for (const fonte of fontes) {
    resultados.push(await verificar(fonte));
  }

  const erros = resultados.filter((r) => r.nivel === "erro");
  const avisos = resultados.filter((r) => r.nivel === "aviso");
  const ok = resultados.filter((r) => r.nivel === "ok");

  if (saidaJson) {
    console.log(JSON.stringify({ total: fontes.length, erros, avisos, ok: ok.length }, null, 2));
  } else {
    console.log(`\nFontes verificadas: ${fontes.length}\n`);
    for (const r of erros) console.log(`  ERRO   ${r.fonte.id} — ${r.diagnostico}\n         ${r.fonte.url}`);
    for (const r of avisos) console.log(`  AVISO  ${r.fonte.id} — ${r.diagnostico}\n         ${r.fonte.url}`);
    console.log(`\n  ${ok.length} sem problemas · ${avisos.length} avisos · ${erros.length} erros\n`);
    if (erros.length === 0 && avisos.length === 0) console.log("Catálogo legal íntegro.\n");
  }

  process.exit(erros.length > 0 ? 1 : 0);
}

main().catch((erro) => {
  console.error("Falha inesperada no monitor de Guias:", erro);
  process.exit(1);
});
