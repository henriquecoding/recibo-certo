// ═══════════════════════════════════════════════════════════════════════
//  VERIFICAÇÃO DA BÚSSOLA — o hero de `/`, medido no browser
//  ---------------------------------------------------------------------
//  `npm run bussola:e2e` (com `npx next start` a servir uma BUILD).
//
//  Cinco garantias que não se veem num teste de unidade e que se partem
//  sem ninguém dar por isso. Todas nasceram de um defeito real:
//
//   1. **Premir não desloca o ponteiro.** A escala estava na propriedade
//      individual `scale`, que o CSS compõe DEPOIS da `transform` — o
//      clique encolhia a POSIÇÃO e atirava o cursor 43 px para cima.
//   2. **Sobrevoar entrega o palco.** O roteiro parava enquanto o rato
//      estivesse em cima e voltava ao sair, a trocar o painel que a
//      pessoa tinha acabado de abrir.
//   3. **Uma paragem de tabulação, e setas lá dentro** (APG do W3C).
//      Eram cinco paragens sem setas.
//   4. **No ecrã tátil, o primeiro toque abre e o segundo entra.** Sem
//      isto, quem não tem sobrevoo não conseguia apontar de todo.
//   5. **«Experimentar já, aqui» liga as duas metades de `/`** — o hero
//      fala `foco`, a calculadora fala `Perfil`, e o gesto deliberado é
//      o único sítio onde um escreve no outro.
//
//  ⚠️ Servir uma BUILD. Um `next start` sobre uma build anterior serve o
//  código antigo e faz parecer que a correção não funcionou.
//
//  PLAYWRIGHT_CHROMIUM  caminho para um Chromium já instalado (opcional)
// ═══════════════════════════════════════════════════════════════════════

import { chromium } from "playwright";

const EXEC = process.env.PLAYWRIGHT_CHROMIUM;
const URL = process.env.BASE_URL ?? "http://localhost:3000/";

function ok(cond, msg, extra = "") {
  console.log(`${cond ? "  OK  " : "  FALHA"} ${msg}${extra ? " · " + extra : ""}`);
  if (!cond) process.exitCode = 1;
}

async function abrir(opcoes = {}) {
  const b = await chromium.launch(EXEC ? { executablePath: EXEC } : {});
  const ctx = await b.newContext({
    viewport: opcoes.viewport ?? { width: 1280, height: 900 },
    reducedMotion: "no-preference",
    hasTouch: opcoes.touch ?? false,
    isMobile: opcoes.touch ?? false,
    ...(opcoes.touch ? { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" } : {}),
  });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("recibocerto:changelog_visto", "2.129.0");
      localStorage.setItem("recibocerto:cookie-consent", JSON.stringify({
        necessarios: true, estatistica: false, marketing: false, versao: 1,
        data: new Date().toISOString(),
      }));
      localStorage.removeItem("recibocerto:perfil:v1");
    } catch {}
  });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => console.log("  ERRO DE PÁGINA", String(e).slice(0, 200)));
  await p.goto(URL, { waitUntil: "networkidle" });
  await p.mouse.move(2, 2);
  return { b, p };
}

const cursor = (p) =>
  p.evaluate(() => {
    const h = document.querySelector("section[data-hero]");
    const c = h?.querySelector("div.z-40.pointer-events-none");
    if (!c) return null;
    const e = getComputedStyle(c);
    const m = e.transform.match(/matrix\(([^)]+)\)/);
    const n = m ? m[1].split(",").map(Number) : null;
    return n ? { x: +n[4].toFixed(1), y: +n[5].toFixed(1), escala: +n[0].toFixed(3), op: e.opacity } : null;
  });

const estado = (p) =>
  p.evaluate(() => {
    const h = document.querySelector("section[data-hero]");
    const passos = [...h.querySelectorAll('ol[aria-label="Etapas da demonstração"] button')];
    const ligacoes = [...h.querySelectorAll('ol[aria-labelledby="bussola-hero-titulo"] a')];
    return {
      ato: passos.findIndex((x) => x.getAttribute("aria-current") === "step"),
      atual: ligacoes.findIndex((a) => a.getAttribute("aria-current") === "true"),
      comTab: ligacoes.map((a) => a.tabIndex).join(","),
      dest: h.querySelector("aside p.font-display")?.textContent?.slice(0, 22),
      focado: document.activeElement?.textContent?.slice(0, 26).replace(/\s+/g, " "),
    };
  });

// ═══ 1 · O CLIQUE NÃO TELETRANSPORTA ═══════════════════════════════════
{
  console.log("\n═══ 1 · o clique do ponteiro ═══");
  const { b, p } = await abrir();
  const amostras = [];
  const fim = Date.now() + 11000;
  while (Date.now() < fim) {
    const c = await cursor(p);
    if (c && c.op !== "0") amostras.push(c);
    await p.waitForTimeout(60);
  }
  await b.close();

  const premidas = amostras.filter((a) => a.escala < 0.97);
  ok(premidas.length > 0, "o ponteiro chega a premir", `${premidas.length} amostras`);

  // Entre dois fotogramas consecutivos, um salto grande em posição só pode
  // ser um teletransporte — a mola nunca anda 60 px em 60 ms nestes palcos.
  let maiorSalto = 0;
  let onde = "";
  for (let i = 1; i < amostras.length; i++) {
    const a = amostras[i - 1], c = amostras[i];
    const d = Math.hypot(c.x - a.x, c.y - a.y);
    if (d > maiorSalto) {
      maiorSalto = d;
      onde = `(${a.x},${a.y})→(${c.x},${c.y}) escala ${a.escala}→${c.escala}`;
    }
  }
  // A ligação entre atos é uma viagem a sério e pode ser rápida; o que não
  // pode acontecer é a posição saltar enquanto a ESCALA muda.
  let saltoAoPremir = 0;
  for (let i = 1; i < amostras.length; i++) {
    const a = amostras[i - 1], c = amostras[i];
    if (Math.abs(c.escala - a.escala) < 0.005) continue;
    saltoAoPremir = Math.max(saltoAoPremir, Math.hypot(c.x - a.x, c.y - a.y));
  }
  ok(saltoAoPremir < 12, "premir não desloca o ponteiro", `máx ${saltoAoPremir.toFixed(1)} px`);
  console.log(`       maior salto do percurso: ${maiorSalto.toFixed(1)} px ${onde}`);

  const escalas = [...new Set(amostras.map((a) => a.escala))];
  ok(escalas.length > 4, "a escala é animada, não comutada", `${escalas.length} valores distintos`);
}

// ═══ 2 · O SOBREVOO ENTREGA O PALCO ════════════════════════════════════
{
  console.log("\n═══ 2 · sobrevoar entrega o palco ═══");
  const { b, p } = await abrir();
  await p.waitForTimeout(3500);
  const antes = await estado(p);
  await p.locator('ol[aria-labelledby="bussola-hero-titulo"] a').nth(3).hover();
  await p.waitForTimeout(400);
  const logo = await estado(p);
  await p.mouse.move(2, 2);
  await p.waitForTimeout(3000);
  const depois = await estado(p);
  const c = await cursor(p);
  await b.close();

  ok(logo.atual === 3, "sobrevoar abre a pergunta apontada", `linha ${logo.atual}`);
  ok(depois.atual === 3, "a escolha FICA depois de o rato sair", `linha ${depois.atual}`);
  ok(depois.dest === logo.dest, "o roteiro não rouba o painel de volta", `${depois.dest}`);
  ok(!c || c.op === "0", "a mão encenada sai de cena", `opacidade ${c?.op}`);
  console.log(`       antes: ato ${antes.ato}, linha ${antes.atual}`);
}

// ═══ 3 · TECLADO: UMA PARAGEM, SETAS LÁ DENTRO ═════════════════════════
{
  console.log("\n═══ 3 · teclado ═══");
  const { b, p } = await abrir();
  await p.waitForTimeout(10000);
  const inicial = await estado(p);
  ok(
    inicial.comTab.split(",").filter((t) => t === "0").length === 1,
    "só uma das cinco é paragem de tabulação",
    inicial.comTab,
  );

  await p.locator('ol[aria-labelledby="bussola-hero-titulo"] a').nth(2).focus();
  await p.waitForTimeout(200);
  const focado = await estado(p);
  ok(focado.atual === 2, "o foco abre a pergunta", `linha ${focado.atual}`);

  await p.keyboard.press("ArrowDown");
  await p.waitForTimeout(200);
  const baixo = await estado(p);
  ok(baixo.atual === 3, "seta para baixo anda uma", `linha ${baixo.atual}`);

  await p.keyboard.press("End");
  await p.waitForTimeout(200);
  const fim = await estado(p);
  ok(fim.atual === 4, "End vai à última", `linha ${fim.atual}`);

  await p.keyboard.press("ArrowDown");
  await p.waitForTimeout(200);
  const volta = await estado(p);
  ok(volta.atual === 0, "a lista dá a volta", `linha ${volta.atual}`);
  await b.close();
}

// ═══ 4 · ECRÃ TÁTIL: PRIMEIRO TOQUE ABRE, SEGUNDO ENTRA ════════════════
{
  console.log("\n═══ 4 · ecrã tátil ═══");
  const { b, p } = await abrir({ touch: true, viewport: { width: 390, height: 844 } });
  await p.waitForTimeout(10500);
  const linha = p.locator('ol[aria-labelledby="bussola-hero-titulo"] a').nth(4);
  await linha.tap();
  await p.waitForTimeout(600);
  const depoisDoPrimeiro = await estado(p);
  ok(p.url().endsWith("/"), "o primeiro toque NÃO navega", p.url().slice(-24));
  ok(depoisDoPrimeiro.atual === 4, "o primeiro toque abre a resposta", `linha ${depoisDoPrimeiro.atual}`);

  await linha.tap();
  await p.waitForTimeout(1200);
  ok(p.url().includes("foco=empresa"), "o segundo toque navega", p.url().slice(-24));
  await b.close();
}

// ═══ 5 · A LIGAÇÃO À CALCULADORA ═══════════════════════════════════════
{
  console.log("\n═══ 5 · «Experimentar já, aqui» liga as duas metades ═══");
  const { b, p } = await abrir();
  await p.waitForTimeout(1500); // as cinco linhas têm de ter acabado de entrar
  await p.locator('ol[aria-labelledby="bussola-hero-titulo"] a').nth(3).hover();
  await p.waitForTimeout(500);
  const botao = p.getByRole("button", { name: /Experimentar já, aqui/ });
  ok((await botao.count()) > 0, "o botão existe para «Salário»");
  await botao.first().click();
  await p.waitForTimeout(1400);
  const r = await p.evaluate(() => ({
    perfil: localStorage.getItem("recibocerto:perfil:v1"),
    modo: new URL(location.href).searchParams.get("modo"),
    pergunta: document.querySelector("#calculadora")?.textContent?.includes("A responder a"),
  }));
  ok(r.perfil === "dependente", "escreve o perfil certo", `${r.perfil}`);
  ok(r.modo === "dependente", "e reflete-o no URL", `?modo=${r.modo}`);
  ok(r.pergunta === true, "a calculadora diz a que pergunta responde");
  await b.close();
}

console.log(process.exitCode ? "\n=== HÁ FALHAS ===" : "\n=== TUDO VERDE ===");
