#!/usr/bin/env node

/**
 * Regressão visual das cinco leituras da homepage.
 *
 * Captura 5 focos × 2 temas × 2 viewports em Chromium, com movimento
 * reduzido e fontes prontas. A comparação usa ImageMagick `compare -metric
 * AE`: mede píxeis diferentes (não hashes nem tamanhos de ficheiro) e guarda
 * sempre o atual e o diff para diagnóstico no artefacto da CI.
 */

import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { dirname, join, resolve } from "node:path";
import { chromium } from "playwright";

const executar = promisify(execFile);
const BASE = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const ATUALIZAR = process.argv.includes("--update");
/* ┌────────────────────────────────────────────────────────────────────────┐
   │ NENHUMA ESPERA AQUI DENTRO PODE SER ETERNA                             │
   │                                                                        │
   │ `page.evaluate` não tem timeout — não é uma opção mal afinada, é uma   │
   │ opção que não existe. Se a promessa lá dentro nunca resolver, o portão │
   │ fica pendurado até alguém o matar: no CI ficou 24 minutos parado na    │
   │ 16.ª das 20 capturas, sem erro e sem uma linha no registo, até o passo │
   │ expirar aos 25. Um portão pendurado não reprova nem aprova — só gasta  │
   │ o tempo de quem espera por ele.                                        │
   │                                                                        │
   │ Três esperas aqui podiam não resolver:                                 │
   │                                                                        │
   │ · `document.fonts.ready` fica pendente enquanto um pedido de fonte não │
   │   terminar — e cada `newContext` começa com a cache vazia, pelo que as │
   │   20 capturas repetem os pedidos todos: basta um ficar preso;          │
   │ · `requestAnimationFrame` não dispara numa página que o motor deixe de │
   │   pintar;                                                              │
   │ · o laço relê `scrollHeight` a cada volta, e esse valor muda à medida  │
   │   que o `content-visibility` revela as secções diferidas.              │
   │                                                                        │
   │ Passam todas a ter tecto. Medido nesta máquina, nas 20 capturas: no    │
   │ máximo 21 voltas e 500 ms — os tectos dão cerca de 20× de folga e só   │
   │ se fazem sentir quando alguma coisa está mesmo presa. A troca é        │
   │ deliberada: estabilizar de menos é um risco pequeno e VISÍVEL — a      │
   │ comparação por píxel acusa-o na imagem seguinte, e a estabilização diz │
   │ no registo o que teve de truncar. Pendurar é um risco grande e cego.   │
   └────────────────────────────────────────────────────────────────────────┘ */
const LIMIAR_POR_VIEWPORT = Object.freeze({ desktop: 0.002, mobile: 0.01 });
const LIMIAR = process.env.RC_VISUAL_THRESHOLD
  ? Number(process.env.RC_VISUAL_THRESHOLD)
  : null;
const BASELINES = resolve(process.env.RC_VISUAL_BASELINES ?? "tests/visual/homepage");
const SAIDA = resolve(process.env.RC_VISUAL_OUTPUT ?? "artifacts/visual-homepage");

if (LIMIAR !== null && (!Number.isFinite(LIMIAR) || LIMIAR < 0 || LIMIAR > 1)) {
  throw new Error("RC_VISUAL_THRESHOLD tem de estar entre 0 e 1.");
}
/** O limiar de uma captura: o do seu viewport, salvo override explícito. */
const limiarDe = (nome) =>
  LIMIAR ?? (nome.endsWith("-mobile.png") ? LIMIAR_POR_VIEWPORT.mobile : LIMIAR_POR_VIEWPORT.desktop);

const ROTAS = {
  descobrir: "/",
  preco: "/inicio/preco",
  recibos: "/inicio/recibos",
  empresa: "/inicio/empresa",
  salario: "/inicio/salario",
};
const TEMAS = ["claro", "escuro"];
const VIEWPORTS = {
  desktop: { width: 1440, height: 900, hasTouch: false, isMobile: false },
  mobile: { width: 390, height: 844, hasTouch: true, isMobile: true },
};

const pacote = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const fonteConsentimento = await readFile(
  new URL("../src/lib/cookie-consent.ts", import.meta.url),
  "utf8",
);
const correspondenciaConsentimento = fonteConsentimento.match(
  /export const CONSENT_VERSION = (\d+);/,
);
if (!correspondenciaConsentimento) {
  throw new Error("CONSENT_VERSION não encontrado.");
}
const consentimento = Number(correspondenciaConsentimento[1]);

async function exigirImageMagick() {
  try {
    await executar("compare", ["-version"]);
  } catch {
    throw new Error(
      "ImageMagick `compare` é obrigatório para a comparação visual por píxel.",
    );
  }
}

function dimensoesPNG(corpo) {
  const assinatura = "89504e470d0a1a0a";
  if (corpo.subarray(0, 8).toString("hex") !== assinatura) {
    throw new Error("Screenshot não é um PNG válido.");
  }
  return {
    largura: corpo.readUInt32BE(16),
    altura: corpo.readUInt32BE(20),
  };
}

/* ┌───────────────────────────────────────────────────────────────────┐
   │ NENHUMA ESPERA AQUI DENTRO PODE SER ETERNA                           │
   │                                                                      │
   │ `page.evaluate` não tem timeout — nenhum. Se a promessa lá dentro      │
   │ nunca resolver, o portão fica pendurado até alguém o matar. Foi o que  │
   │ aconteceu: no CI ficou 24 minutos parado na 16.ª das 20 capturas, sem │
   │ erro nenhum, até o passo expirar aos 25. Um portao que pendura não     │
   │ reprova nem aprova — só gasta o tempo de quem espera por ele.         │
   │                                                                      │
   │ Três esperas aqui podiam não resolver:                                │
   │                                                                      │
   │ · `document.fonts.ready` fica pendente enquanto um pedido de fonte    │
   │   não terminar — e cada `newContext` começa com a cache vazia, pelo   │
   │   que as 20 capturas repetem os pedidos todos: um só que fique preso  │
   │   basta;                                                             │
   │ · `requestAnimationFrame` não dispara numa página que o motor deixe    │
   │   de pintar;                                                         │
   │ · o próprio laço relê `scrollHeight` a cada volta, e esse valor muda  │
   │   à medida que o `content-visibility` revela as secções diferidas.     │
   │                                                                      │
   │ Passam todas a ter tecto. Medido nesta máquina, nas 20 capturas: no   │
   │ máximo 21 iterações e 500 ms — os tectos abaixo dão 20× de folga, e    │
   │ por isso só se fazem sentir quando alguma coisa está mesmo presa.     │
   │ Estabilizar de menos é um risco pequeno e VISÍVEL — a comparação por  │
   │ píxel acusa-o na imagem seguinte. Pendurar é um risco grande e cego.  │
   └───────────────────────────────────────────────────────────────────┘ */
const TECTO_FONTES_MS = 10_000;
const TECTO_ESTABILIZAR_MS = 10_000;
const TECTO_CAPTURA_MS = 120_000;

async function estabilizar(pagina) {
  return pagina.evaluate(
    async ({ tectoFontes, tectoLaco }) => {
      const inicio = performance.now();
      /** Um frame — ou o relógio, se o motor tiver deixado de pintar. */
      const frame = () =>
        new Promise((resolver) => {
          let resolvido = false;
          const uma = () => {
            if (resolvido) return;
            resolvido = true;
            resolver();
          };
          requestAnimationFrame(uma);
          setTimeout(uma, 250);
        });

      const fontesProntas = await Promise.race([
        document.fonts.ready.then(() => true),
        new Promise((resolver) => setTimeout(() => resolver(false), tectoFontes)),
      ]);

      const passo = Math.max(320, Math.floor(window.innerHeight * 0.8));
      let voltas = 0;
      let truncado = false;
      for (let y = 0; y < document.documentElement.scrollHeight; y += passo) {
        if (performance.now() - inicio > tectoLaco || voltas >= 400) {
          truncado = true;
          break;
        }
        voltas += 1;
        window.scrollTo(0, y);
        await frame();
      }
      window.scrollTo(0, 0);
      await frame();
      await frame();
      return {
        voltas,
        truncado,
        fontesProntas,
        ms: Math.round(performance.now() - inicio),
      };
    },
    { tectoFontes: TECTO_FONTES_MS, tectoLaco: TECTO_ESTABILIZAR_MS },
  );
}

async function capturar(navegador, foco, rota, tema, nomeViewport, viewport) {
  const contexto = await navegador.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    hasTouch: viewport.hasTouch,
    isMobile: viewport.isMobile,
    deviceScaleFactor: 1,
    colorScheme: tema === "escuro" ? "dark" : "light",
    reducedMotion: "reduce",
    locale: "pt-PT",
    timezoneId: "Europe/Lisbon",
  });
  contexto.setDefaultTimeout(45_000);
  await contexto.addInitScript(
    ({ appVersion, consentVersion, escuro }) => {
      try {
        localStorage.setItem("recibocerto:changelog_visto", appVersion);
        localStorage.setItem(
          "recibocerto:cookie-consent",
          JSON.stringify({
            necessarios: true,
            estatistica: false,
            marketing: false,
            versao: consentVersion,
            data: "2026-08-28T12:00:00.000Z",
          }),
        );
        if (escuro) localStorage.setItem("recibocerto:theme", "dark");
        else localStorage.removeItem("recibocerto:theme");
      } catch {}
    },
    {
      appVersion: VERSAO_SERVIDA,
      consentVersion: consentimento,
      escuro: tema === "escuro",
    },
  );

  const pagina = await contexto.newPage();
  const erros = [];
  pagina.on("pageerror", (erro) => erros.push(erro.message));
  pagina.on("console", (mensagem) => {
    if (mensagem.type() === "error") erros.push(mensagem.text());
  });

  try {
    const resposta = await pagina.goto(`${BASE}${rota}`, {
      waitUntil: "load",
      timeout: 45_000,
    });
    if (!resposta || resposta.status() !== 200) {
      throw new Error(`${rota} devolveu HTTP ${resposta?.status() ?? "sem resposta"}.`);
    }
    // ┌───────────────────────────────────────────────────────────────┐
    // │ ESPERAR PELO ESTADO ESTÁVEL ANTES DE EXIGIR A UNICIDADE        │
    // │                                                               │
    // │ Duas coisas, ambas apanhadas a capturar as 20 imagens seguidas │
    // │ numa máquina carregada:                                        │
    // │                                                               │
    // │ · o React insere os segmentos que ainda estão a chegar num     │
    // │   contentor escondido antes de os pôr no sítio — há um instante│
    // │   com DOIS `main` do mesmo foco, e o modo estrito do Playwright│
    // │   rebenta com «resolved to 2 elements» em vez de esperar;      │
    // │ · o `main` existe com altura zero enquanto o palco não monta,  │
    // │   e 15 s podem não chegar quando o processo está a competir    │
    // │   com uma captura de página inteira de 9 000 px.               │
    // │                                                               │
    // │ Nenhuma das duas é um defeito da página: são estados por onde  │
    // │ ela passa. A espera é pelo estado FINAL — um `main` só, com    │
    // │ altura — e só depois se exige o que tem de ser verdade.        │
    // └───────────────────────────────────────────────────────────────┘
    await pagina.waitForFunction(
      (alvo) => {
        const todos = document.querySelectorAll(`main[data-homepage-foco="${alvo}"]`);
        return todos.length === 1 && todos[0].getBoundingClientRect().height > 0;
      },
      foco,
      { timeout: 45_000 },
    );
    const principal = pagina.locator(`main[data-homepage-foco="${foco}"]`);
    await principal.waitFor({ state: "visible", timeout: 15_000 });
    if ((await principal.count()) !== 1 || (await principal.locator("h1").count()) < 1) {
      throw new Error(`${rota} não tem exatamente um main de foco com h1.`);
    }

    await pagina.addStyleTag({
      content: `
        *, *::before, *::after {
          animation: none !important;
          caret-color: transparent !important;
          scroll-behavior: auto !important;
          transition: none !important;
        }
        [data-vercel-toolbar], vercel-live-feedback { display: none !important; }
      `,
    });
    const estabilidade = await estabilizar(pagina);

    const overflow = await pagina.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    if (overflow > 1) {
      throw new Error(`${rota}/${nomeViewport} tem overflow horizontal de ${overflow}px.`);
    }
    if (erros.length > 0) {
      throw new Error(`${rota} produziu erro no browser: ${erros.join(" | ")}`);
    }

    const nome = `${foco}-${tema}-${nomeViewport}.png`;
    const destino = ATUALIZAR ? join(BASELINES, nome) : join(SAIDA, "atual", nome);
    await mkdir(dirname(destino), { recursive: true });
    await pagina.screenshot({
      path: destino,
      fullPage: true,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    });
    return { nome, destino, estabilidade };
  } finally {
    await contexto.close();
  }
}

/**
 * A captura com prazo: uma segunda tentativa, e depois erro — nunca espera.
 *
 * O tecto de dentro (`estabilizar`) cobre as promessas da página; este cobre
 * o resto — um motor que deixe de responder não devolve nem erro nem imagem,
 * e sem prazo aqui fora o portão voltava a pendurar-se.
 */
async function capturarComPrazo(...argumentos) {
  let ultimoErro;
  for (const tentativa of [1, 2]) {
    let expirar;
    try {
      return await Promise.race([
        capturar(...argumentos),
        new Promise((_, rejeitar) => {
          expirar = setTimeout(
            () =>
              rejeitar(
                new Error(
                  `captura passou de ${TECTO_CAPTURA_MS / 1000}s (tentativa ${tentativa})`,
                ),
              ),
            TECTO_CAPTURA_MS,
          );
        }),
      ]);
    } catch (erro) {
      ultimoErro = erro;
      if (tentativa === 2) break;
      process.stdout.write(`\n[visual] repetir após: ${erro.message}\n`);
    } finally {
      clearTimeout(expirar);
    }
  }
  throw ultimoErro;
}

async function comparar(nome, atual) {
  const baseline = join(BASELINES, nome);
  const diff = join(SAIDA, "diff", nome);
  await mkdir(dirname(diff), { recursive: true });
  const [esperado, recebido] = await Promise.all([
    readFile(baseline),
    readFile(atual),
  ]);
  const dEsperada = dimensoesPNG(esperado);
  const dRecebida = dimensoesPNG(recebido);
  if (
    dEsperada.largura !== dRecebida.largura ||
    dEsperada.altura !== dRecebida.altura
  ) {
    return {
      nome,
      passou: false,
      razao:
        `dimensão ${dRecebida.largura}×${dRecebida.altura}; ` +
        `baseline ${dEsperada.largura}×${dEsperada.altura}`,
    };
  }

  // ┌───────────────────────────────────────────────────────────────────┐
  // │ A IMAGEM DE DIFERENÇAS SÓ SE ESCREVE QUANDO HÁ DIFERENÇAS          │
  // │                                                                   │
  // │ Contar píxeis é barato; escrever o PNG do diff não é — estas       │
  // │ capturas de página inteira vão até 390×17 500, e codificar 20      │
  // │ delas custa mais do que todas as comparações juntas. No runner do  │
  // │ CI, onde o cache de píxeis do ImageMagick é limitado e vai a       │
  // │ disco, o passo passou de minutos a mais de uma hora sem terminar.  │
  // │                                                                   │
  // │ Duas passagens: a primeira conta contra `null:` e não escreve      │
  // │ nada; a segunda só acontece quando a primeira reprova, e é essa    │
  // │ que deixa o diff no artefacto — que é quando ele serve para        │
  // │ alguma coisa.                                                     │
  // └───────────────────────────────────────────────────────────────────┘
  const contar = async (destino) => {
    try {
      const resultado = await executar("compare", [
        "-metric",
        "AE",
        "-fuzz",
        "1%",
        baseline,
        atual,
        destino,
      ]);
      return Number(resultado.stderr.trim() || "0");
    } catch (erro) {
      // ImageMagick usa exit 1 para "há diferenças" e escreve a métrica em
      // stderr. Exit >1 ou uma métrica ilegível continuam a ser erro real.
      const codigo = erro?.code;
      const metrica = Number(String(erro?.stderr ?? "").trim());
      if (codigo !== 1 || !Number.isFinite(metrica)) throw erro;
      return metrica;
    }
  };
  const diferentes = await contar("null:");
  const total = dEsperada.largura * dEsperada.altura;
  const proporcao = diferentes / total;
  const limiar = limiarDe(nome);
  if (proporcao > limiar) await contar(diff);
  return {
    nome,
    passou: proporcao <= limiar,
    diferentes,
    total,
    proporcao,
    razao:
      `${diferentes} píxeis (${(proporcao * 100).toFixed(4)}%` +
      `, limiar ${(limiar * 100).toFixed(2)}%)`,
  };
}

/* ┌────────────────────────────────────────────────────────────────────────┐
   │ A VERSÃO TEM DE SER A DO SERVIDOR QUE SE ESTÁ A FOTOGRAFAR             │
   │                                                                        │
   │ O popup de Novidades abre quando `changelog_visto` difere de           │
   │ `APP_VERSION`. Este script silenciava-o escrevendo a versão do         │
   │ package.json do WORKTREE — e o workflow corre as duas passagens a      │
   │ partir do mesmo worktree: a referência é servida por um build antigo   │
   │ noutra porta, com outra `APP_VERSION`. Resultado: a referência ficava  │
   │ fotografada COM o modal por cima e a atual sem ele. Uma diferença de   │
   │ 5 a 10 % em todas as rotas, incluindo as que ninguém tinha tocado —    │
   │ e intermitente, porque o modal abre por temporizador e nem sempre      │
   │ chegava a pintar antes da captura.                                     │
   │                                                                        │
   │ A versão passa a vir do próprio servidor, que a publica em             │
   │ `/novidades/indice.json`. Se não vier, cai no package.json — mas com   │
   │ aviso, porque é aí que o portão volta a poder mentir.                  │
   └────────────────────────────────────────────────────────────────────────┘ */
async function versaoDoServidor() {
  try {
    const resposta = await fetch(`${BASE}/novidades/indice.json`);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const indice = await resposta.json();
    if (typeof indice.appVersion === "string" && indice.appVersion.length > 0) {
      return indice.appVersion;
    }
    throw new Error("sem appVersion");
  } catch (erro) {
    console.warn(
      `[visual] AVISO: não consegui ler a versão de ${BASE} (${erro.message}); ` +
        `uso a do package.json (${pacote.version}). Se o servidor for outro build, ` +
        "o popup de Novidades entra nas capturas.",
    );
    return pacote.version;
  }
}

if (!ATUALIZAR) await exigirImageMagick();
await mkdir(ATUALIZAR ? BASELINES : SAIDA, { recursive: true });

const VERSAO_SERVIDA = await versaoDoServidor();
console.log(`[visual] ${BASE} anuncia a versão ${VERSAO_SERVIDA}.`);

const navegador = await chromium.launch();
const versaoChromium = navegador.version();
const capturas = [];
try {
  for (const [foco, rota] of Object.entries(ROTAS)) {
    for (const tema of TEMAS) {
      for (const [nomeViewport, viewport] of Object.entries(VIEWPORTS)) {
        const marca = Date.now();
        const captura = await capturarComPrazo(
          navegador,
          foco,
          rota,
          tema,
          nomeViewport,
          viewport,
        );
        const { truncado, fontesProntas, voltas } = captura.estabilidade;
        const avisos = [
          truncado ? `laço truncado a ${voltas} voltas` : null,
          fontesProntas ? null : `fontes ainda a carregar (${TECTO_FONTES_MS / 1000}s)`,
        ].filter(Boolean);
        console.log(
          `[visual] ${foco} · ${tema} · ${nomeViewport} — ${Date.now() - marca}ms` +
            (avisos.length > 0 ? ` · AVISO: ${avisos.join("; ")}` : ""),
        );
        capturas.push(captura);
      }
    }
  }
} finally {
  await navegador.close();
}

if (ATUALIZAR) {
  const metadata = {
    schemaVersion: 1,
    baseUrl: BASE,
    appVersion: VERSAO_SERVIDA,
    chromium: versaoChromium,
    capturas: capturas.map(({ nome }) => nome),
  };
  await writeFile(
    join(BASELINES, "metadata.json"),
    `${JSON.stringify(metadata, null, 2)}\n`,
  );
  console.log(`[visual] ${capturas.length} baselines atualizadas em ${BASELINES}.`);
} else {
  const resultados = [];
  for (const captura of capturas) {
    resultados.push(await comparar(captura.nome, captura.destino));
  }
  await writeFile(
    join(SAIDA, "resultado.json"),
    `${JSON.stringify(
      { schemaVersion: 1, baseUrl: BASE, limiar: LIMIAR ?? LIMIAR_POR_VIEWPORT, resultados },
      null,
      2,
    )}\n`,
  );
  const falhas = resultados.filter((resultado) => !resultado.passou);
  for (const resultado of resultados) {
    console.log(
      `[visual] ${resultado.passou ? "OK" : "FALHA"} ${resultado.nome}: ${resultado.razao}`,
    );
  }
  if (falhas.length > 0) {
    throw new Error(`${falhas.length}/${resultados.length} comparações visuais falharam.`);
  }
}
