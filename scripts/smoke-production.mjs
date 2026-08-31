#!/usr/bin/env node

import { spawn } from "node:child_process";
import { once } from "node:events";
import { resolve } from "node:path";

const PORTA = Number(process.env.SMOKE_PORT || 3210);
const ORIGEM = `http://127.0.0.1:${PORTA}`;
const BIN_NEXT = resolve("node_modules/next/dist/bin/next");

const servidor = spawn(
  process.execPath,
  [BIN_NEXT, "start", "-H", "127.0.0.1", "-p", String(PORTA)],
  {
    env: { ...process.env, NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  },
);

let registo = "";
const guardar = (bloco) => {
  registo += bloco.toString();
  if (registo.length > 32_000) registo = registo.slice(-32_000);
};
servidor.stdout.on("data", guardar);
servidor.stderr.on("data", guardar);

const pausa = (ms) => new Promise((resolvePausa) => setTimeout(resolvePausa, ms));

function exigir(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}

async function pedir(caminho, init = {}) {
  return fetch(`${ORIGEM}${caminho}`, {
    redirect: "manual",
    signal: AbortSignal.timeout(8_000),
    ...init,
  });
}

async function esperarServidor() {
  for (let tentativa = 0; tentativa < 80; tentativa += 1) {
    if (servidor.exitCode !== null) {
      throw new Error(`O servidor terminou antes de ficar pronto (código ${servidor.exitCode}).`);
    }
    try {
      const resposta = await pedir("/");
      if (resposta.status === 200) return resposta;
    } catch {
      // O processo ainda está a arrancar.
    }
    await pausa(250);
  }
  throw new Error("O servidor de produção não ficou pronto em 20 segundos.");
}

async function executar() {
  const inicial = await esperarServidor();
  const htmlInicial = await inicial.text();

  exigir(htmlInicial.includes("Recibo Certo"), "A página inicial não contém a aplicação.");

  const metaRobots = htmlInicial.match(/<meta name="robots" content="([^"]+)"/i)?.[1] || "";
  const metaGooglebot =
    htmlInicial.match(/<meta name="googlebot" content="([^"]+)"/i)?.[1] || "";
  exigir(
    metaRobots.includes("index") &&
      metaRobots.includes("follow") &&
      !metaRobots.includes("noindex") &&
      !metaRobots.includes("nofollow"),
    `Metadata robots pública restringida: ${metaRobots || "em falta"}.`,
  );
  exigir(
    metaGooglebot.includes("index") &&
      metaGooglebot.includes("follow") &&
      metaGooglebot.includes("max-image-preview:large") &&
      metaGooglebot.includes("max-video-preview:-1") &&
      metaGooglebot.includes("max-snippet:-1") &&
      !metaGooglebot.includes("max-snippet:0"),
    `Metadata Googlebot deixou de permitir descoberta completa: ${metaGooglebot || "em falta"}.`,
  );

  exigir(inicial.headers.get("tdm-reservation") === "1", "Header tdm-reservation em falta.");
  exigir(inicial.headers.get("x-frame-options") === "DENY", "X-Frame-Options não é DENY.");
  exigir(
    inicial.headers.get("x-robots-tag")?.includes("noai"),
    "X-Robots-Tag deixou de reservar conteúdo para IA.",
  );
  exigir(
    inicial.headers.get("content-security-policy")?.includes("frame-ancestors 'none'"),
    "CSP deixou de impedir framing.",
  );
  exigir(
    inicial.headers.get("cross-origin-resource-policy") === "same-origin",
    "Cross-Origin-Resource-Policy deixou de ser same-origin.",
  );

  for (const caminho of ["/quiz-fiscal", "/quiz-fiscal/iva"]) {
    const resposta = await pedir(caminho);
    exigir(resposta.status === 200, `${caminho} respondeu ${resposta.status}, esperado 200.`);
    const html = await resposta.text();
    exigir(!html.includes("correctAnswer"), `${caminho} voltou a publicar correctAnswer.`);
  }

  const categoria = await pedir("/quiz-fiscal/iva");
  const htmlCategoria = await categoria.text();
  exigir(
    htmlCategoria.includes("Perguntas desta categoria"),
    "A página de categoria do quiz não renderizou a amostra.",
  );

  const robots = await pedir("/robots.txt");
  const textoRobots = await robots.text();
  exigir(robots.status === 200, "robots.txt não respondeu 200.");
  exigir(
    textoRobots.includes("GPTBot") && textoRobots.includes("Disallow: /"),
    "robots.txt deixou de bloquear GPTBot.",
  );

  const tdm = await pedir("/.well-known/tdmrep.json");
  const regrasTdm = await tdm.json();
  exigir(
    tdm.status === 200 &&
      Array.isArray(regrasTdm) &&
      regrasTdm.some((regra) => regra.location === "/" && regra["tdm-reservation"] === 1),
    "TDMRep público inválido.",
  );

  const security = await pedir("/.well-known/security.txt");
  const textoSecurity = await security.text();
  exigir(
    security.status === 200 &&
      textoSecurity.includes("Contact: mailto:recibocerto.pt@gmail.com") &&
      textoSecurity.includes("Canonical: https://www.recibocerto.pt/.well-known/security.txt"),
    "security.txt público inválido.",
  );

  const bloqueado = await pedir("/", { headers: { "User-Agent": "GPTBot" } });
  exigir(bloqueado.status === 403, `GPTBot recebeu ${bloqueado.status}, esperado 403.`);

  console.log(
    "Smoke de produção aprovado: descoberta, páginas públicas sem conta, headers, robots, TDM, security.txt e bloqueio de crawler.",
  );
}

try {
  await executar();
} catch (erro) {
  console.error("\nSmoke de produção reprovado:", erro instanceof Error ? erro.message : erro);
  console.error("\nÚltimo output do servidor:\n", registo);
  process.exitCode = 1;
} finally {
  if (servidor.exitCode === null) {
    servidor.kill("SIGTERM");
    await Promise.race([once(servidor, "exit"), pausa(3_000)]);
  }
  if (servidor.exitCode === null) servidor.kill("SIGKILL");
}
