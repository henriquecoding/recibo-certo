// ═══════════════════════════════════════════════════════════════════════
//  AS GARANTIAS DOS PALCOS DE EMPRESA E DE SALÁRIO
//  ---------------------------------------------------------------------
//  `npm run palcos:e2e` (com `npm run build && npx next start` a servir).
//
//  Existe porque as três coisas de que o utilizador se queixou não se
//  veem no código nem num teste de unidade:
//
//   · «a animação está travada, cheia de bugs e lags» — a suspeita óbvia
//     era o custo de desenho, e medida lado a lado não era isso: as duas
//     versões perdiam a mesma proporção de frames. O que estava avariado
//     era a INTERAÇÃO — um `<input type="range">` inerte ao toque, e uma
//     exceção de `setPointerCapture` a desmontar o palco a meio de um
//     gesto. Ficam as duas medições: a do desenho, como rede, e a da
//     interação, que é onde o defeito estava.
//   · «não está pensado para o tema escuro» — mede-se pela COR CALCULADA
//     das superfícies no escuro. Uma camada de realce que resolve para o
//     pastel de modo claro é uma falha objetiva, e foi assim que se
//     apanhou a armadilha do `dark:` a vencer o remapeamento de
//     `globals.css`.
//   · a régua tem de responder a arrasto, a toque e a teclado, e o ponto
//     selecionado no gráfico tem de a acompanhar — senão é decoração.
//
//  ENDERECO   por omissão, http://localhost:3000
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const ENDERECO = process.env.ENDERECO ?? process.env.BASE_URL ?? "http://localhost:3000";
const EXEC = process.env.PLAYWRIGHT_CHROMIUM;
const VERSAO = JSON.parse(new TextDecoder().decode(readFileSync(new URL("../package.json", import.meta.url)))).version;

/** A cena inteira: 2300 + 3100 + 2800 + 3200, com folga. */
const CENA_EMPRESA = 12_500;
/** 2500 + 2800 + 2800 + 3300, com folga. */
const CENA_SALARIO = 12_500;

const falhas = [];
const passos = [];
const verificar = (condicao, descricao, detalhe = "") => {
  (condicao ? passos : falhas).push(detalhe ? `${descricao} — ${detalhe}` : descricao);
};

async function contexto(navegador, tema, largura = 1280) {
  const ctx = await navegador.newContext({
    viewport: { width: largura, height: 1100 },
    colorScheme: tema,
    hasTouch: largura < 700,
  });
  await ctx.addInitScript(
    ([v, t]) => {
      try {
        localStorage.setItem("recibocerto:changelog_visto", v);
        localStorage.setItem("recibocerto:theme", t);
        localStorage.setItem(
          "recibocerto:cookie-consent",
          JSON.stringify({
            necessarios: true,
            estatistica: false,
            marketing: false,
            versao: 1,
            data: new Date().toISOString(),
          }),
        );
      } catch {}
    },
    [VERSAO, tema],
  );
  return ctx;
}

/**
 * O tempo em que a thread principal esteve incapaz de responder a um
 * toque, DURANTE a cena. É o número que a palavra «lag» quer dizer.
 *
 * O limite de 350 ms não é arbitrário: uma cena de 12 s com quatro atos
 * tem de caber muito abaixo disso. Serve de rede — não de prova de que
 * alguma versão anterior falhava, porque medida lado a lado nenhuma
 * falhava aqui. O que falhava era a interação, e isso mede-se mais
 * abaixo, em `verificarRegua`.
 */
const BLOQUEIO_MAXIMO = 350;

async function medirCena(navegador, foco, duracao) {
  const ctx = await contexto(navegador, "light");
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    window.__bloqueio = 0;
    window.__tarefas = 0;
    new PerformanceObserver((lista) => {
      for (const t of lista.getEntries()) {
        window.__tarefas += 1;
        window.__bloqueio += Math.max(0, t.duration - 50);
      }
    }).observe({ type: "longtask", buffered: true });

    // ── E os frames, um a um ────────────────────────────────────────
    //  `longtask` só conta tarefas acima de 50 ms, e uma cena pode
    //  engasgar-se sem nunca lá chegar: muitas tarefas curtas — um render
    //  por frame, por exemplo — atrasam o frame seguinte sem nenhuma
    //  delas passar o limiar. Contar intervalos entre frames apanha o que
    //  o `longtask` deixa passar, e foi por aqui que se percebeu que o
    //  desenho não era o problema.
    window.__frames = [];
    let anterior = performance.now();
    const contar = (agora) => {
      window.__frames.push(agora - anterior);
      anterior = agora;
      requestAnimationFrame(contar);
    };
    requestAnimationFrame(contar);
  });
  await p.goto(`${ENDERECO}/?foco=${foco}`, { waitUntil: "load" });
  // Zerar depois da carga: o que se mede é a CENA, não o arranque da rota.
  await p.waitForTimeout(1200);
  await p.evaluate(() => {
    window.__bloqueio = 0;
    window.__tarefas = 0;
    window.__frames = [];
  });
  await p.waitForTimeout(duracao);
  const { bloqueio, tarefas, frames } = await p.evaluate(() => ({
    bloqueio: window.__bloqueio,
    tarefas: window.__tarefas,
    frames: window.__frames,
  }));

  verificar(
    bloqueio <= BLOQUEIO_MAXIMO,
    `[${foco}] a cena não bloqueia a thread principal`,
    `${Math.round(bloqueio)} ms de bloqueio em ${tarefas} tarefa(s) longa(s), limite ${BLOQUEIO_MAXIMO} ms`,
  );

  // Um frame «perdido» é um intervalo acima de 32 ms — o dobro dos 16,7
  // de 60 Hz. Abaixo de 2% do total é o ruído normal de um browser;
  // acima disso vê-se, e é o que a palavra «travada» descreve.
  const perdidos = frames.filter((ms) => ms > 32).length;
  const proporcao = frames.length ? (perdidos / frames.length) * 100 : 0;
  verificar(
    proporcao <= 2,
    `[${foco}] a cena não perde frames`,
    `${perdidos} de ${frames.length} frames acima de 32 ms (${proporcao.toFixed(1)}%, limite 2%)`,
  );

  // A cena ACABA. Não reinicia em ciclo, e o cabeçalho diz que acabou.
  const legenda = await p.locator(`#palco-${foco}-titulo + p`).innerText();
  verificar(
    /concluída/i.test(legenda),
    `[${foco}] a cena chega ao fim`,
    `legenda do cabeçalho: «${legenda}»`,
  );
  await ctx.close();
}

/** A régua move o ponto de leitura — por arrasto, por toque e por teclado. */
async function verificarRegua(navegador) {
  const ctx = await contexto(navegador, "light");
  const p = await ctx.newPage();
  await p.goto(`${ENDERECO}/?foco=empresa`, { waitUntil: "load" });
  await p.waitForTimeout(CENA_EMPRESA);

  const regua = p.locator('[role="slider"][aria-labelledby="empresa-regua-rotulo"]');
  verificar((await regua.count()) === 1, "[empresa] a régua existe e é única");

  const lerEstado = () =>
    p.evaluate(() => {
      const r = document.querySelector('[role="slider"][aria-labelledby="empresa-regua-rotulo"]');
      const ponto = document.querySelector('[data-empresa-ponto="atual"]');
      const curva = document.querySelector('[data-empresa-curva="real"]');
      return {
        agora: Number(r.getAttribute("aria-valuenow")),
        texto: r.getAttribute("aria-valuetext"),
        ponto: ponto ? `${ponto.getAttribute("cx")},${ponto.getAttribute("cy")}` : null,
        curva: curva?.getAttribute("d") ?? null,
      };
    });

  const inicial = await lerEstado();
  verificar(
    Boolean(inicial.curva && inicial.ponto),
    "[empresa] a curva real e o ponto de leitura existem",
    inicial.ponto ?? "ponto ausente",
  );
  verificar(
    Boolean(inicial.texto && /€/.test(inicial.texto)),
    "[empresa] a régua anuncia o valor em euros",
    String(inicial.texto),
  );

  // ── Arrasto ────────────────────────────────────────────────────────
  const caixa = await regua.boundingBox();
  await p.mouse.move(caixa.x + caixa.width * 0.5, caixa.y + caixa.height / 2);
  await p.mouse.down();
  await p.mouse.move(caixa.x + caixa.width * 0.8, caixa.y + caixa.height / 2, { steps: 12 });
  await p.mouse.up();
  await p.waitForTimeout(250);
  const arrastado = await lerEstado();
  verificar(
    arrastado.agora > inicial.agora,
    "[empresa] o arrasto move a régua",
    `${inicial.agora} → ${arrastado.agora}`,
  );
  verificar(
    arrastado.ponto !== inicial.ponto,
    "[empresa] o ponto do gráfico segue a régua",
    `${inicial.ponto} → ${arrastado.ponto}`,
  );

  // ── Teclado: uma paragem de Tab, setas por dentro ───────────────────
  await regua.focus();
  const focado = await p.evaluate(
    () => document.activeElement?.getAttribute("role") === "slider",
  );
  verificar(focado, "[empresa] a régua recebe foco de teclado");

  await p.keyboard.press("Home");
  await p.waitForTimeout(150);
  const noInicio = await lerEstado();
  await p.keyboard.press("ArrowRight");
  await p.waitForTimeout(150);
  const umPasso = await lerEstado();
  await p.keyboard.down("Shift");
  await p.keyboard.press("ArrowRight");
  await p.keyboard.up("Shift");
  await p.waitForTimeout(150);
  const saltoLargo = await lerEstado();

  verificar(
    umPasso.agora > noInicio.agora,
    "[empresa] a seta avança um degrau",
    `${noInicio.agora} → ${umPasso.agora}`,
  );
  verificar(
    saltoLargo.agora - umPasso.agora > umPasso.agora - noInicio.agora,
    "[empresa] Shift+seta salta mais do que a seta sozinha",
    `+${saltoLargo.agora - umPasso.agora} contra +${umPasso.agora - noInicio.agora}`,
  );

  await p.keyboard.press("End");
  await p.waitForTimeout(150);
  const noFim = await lerEstado();
  verificar(
    noFim.agora === Number(await regua.getAttribute("aria-valuemax")),
    "[empresa] End vai ao topo da escala",
    `${noFim.agora}`,
  );

  // ── Toque ──────────────────────────────────────────────────────────
  await ctx.close();
  const ctxToque = await contexto(navegador, "light", 390);
  const pt = await ctxToque.newPage();
  await pt.goto(`${ENDERECO}/?foco=empresa`, { waitUntil: "load" });
  await pt.waitForTimeout(CENA_EMPRESA);
  const reguaToque = pt.locator('[role="slider"][aria-labelledby="empresa-regua-rotulo"]');
  const antesToque = Number(await reguaToque.getAttribute("aria-valuenow"));
  const caixaToque = await reguaToque.boundingBox();
  await pt.touchscreen.tap(caixaToque.x + caixaToque.width * 0.85, caixaToque.y + caixaToque.height / 2);
  await pt.waitForTimeout(250);
  const depoisToque = Number(await reguaToque.getAttribute("aria-valuenow"));
  verificar(
    depoisToque > antesToque,
    "[empresa] um toque na calha move a régua",
    `${antesToque} → ${depoisToque}`,
  );

  // ┌───────────────────────────────────────────────────────────────────┐
  // │ UM ARRASTO DE DEDO NÃO PODE DESMONTAR O PALCO                     │
  // │                                                                   │
  // │ `setPointerCapture` atira `NotFoundError` quando o `pointerId` já │
  // │ não está ativo. Uma exceção por tratar num tratador de eventos do │
  // │ React derruba a árvore — e o palco literalmente DESAPARECE. Foi   │
  // │ assim que se apanhou: depois de um arrasto sintetizado por CDP,   │
  // │ `document.querySelector('[role=slider]')` devolvia `null`.        │
  // │                                                                   │
  // │ Eventos de toque crus (e não `touchscreen.tap`, que a Playwright  │
  // │ higieniza) são o único caminho que reproduz isto.                 │
  // └───────────────────────────────────────────────────────────────────┘
  const cdp = await ctxToque.newCDPSession(pt);
  const y = caixaToque.y + caixaToque.height / 2;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: caixaToque.x + caixaToque.width * 0.15, y }],
  });
  for (let i = 1; i <= 16; i += 1) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: caixaToque.x + caixaToque.width * (0.15 + 0.045 * i), y }],
    });
    await pt.waitForTimeout(20);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await pt.waitForTimeout(300);

  const sobreviveu = await pt.evaluate(() => {
    const el = document.querySelector('[role="slider"][aria-labelledby="empresa-regua-rotulo"]');
    return el ? Number(el.getAttribute("aria-valuenow")) : null;
  });
  verificar(
    sobreviveu !== null,
    "[empresa] um arrasto de dedo não desmonta o palco",
    sobreviveu === null ? "a régua desapareceu do DOM" : `régua em ${sobreviveu}`,
  );
  verificar(
    sobreviveu !== null && sobreviveu !== depoisToque,
    "[empresa] o arrasto de dedo move a régua",
    `${depoisToque} → ${sobreviveu}`,
  );

  // Sem transbordo horizontal a 390 px — a regra 5b do CLAUDE.md.
  const transbordo = await pt.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  verificar(transbordo <= 0, "[empresa] não transborda a 390 px", `${transbordo} px`);
  await ctxToque.close();
}

/**
 * O realce das linhas do salário resolve para a cor do tema em que está.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ A ARMADILHA QUE ISTO EXISTE PARA APANHAR                            │
 * │                                                                     │
 * │ `globals.css` remapeia `bg-clay-bg/NN` no escuro por seletor de     │
 * │ substring. Escrever `dark:bg-clay-bg/50` ao lado parece reforçar e  │
 * │ faz o contrário: a utilidade `dark:` ganha e repõe o PASTEL DE MODO │
 * │ CLARO. Medido: `rgba(246,231,224,.5)` por cima de uma linha escura, │
 * │ com o rótulo por baixo a desaparecer.                               │
 * │                                                                     │
 * │ Nenhum teste de unidade vê isto, e a olho passa por «um realce um   │
 * │ bocadinho claro». A cor calculada não passa.                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */
async function verificarTemaEscuro(navegador) {
  for (const tema of ["light", "dark"]) {
    const ctx = await contexto(navegador, tema);
    const p = await ctx.newPage();
    await p.goto(`${ENDERECO}/?foco=salario`, { waitUntil: "load" });
    await p.waitForTimeout(CENA_SALARIO);

    const camadas = await p.evaluate(() => {
      const sec = document.querySelector("#palco-salario-titulo").closest("section");
      return [...sec.querySelectorAll('[class*="bg-clay-bg"], [class*="bg-brand-light"]')].map(
        (el) => ({
          classe: el.className.toString(),
          cor: getComputedStyle(el).backgroundColor,
        }),
      );
    });

    verificar(camadas.length > 0, `[salário/${tema}] há superfícies de realce para medir`);

    /** A luminância relativa aproximada de um `rgb()`/`rgba()`. */
    const luz = (cor) => {
      const [r, g, b] = (cor.match(/[\d.]+/g) ?? [0, 0, 0]).slice(0, 3).map(Number);
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    };

    for (const camada of camadas) {
      const clara = luz(camada.cor) > 0.55;
      const nome = camada.classe.split(/\s+/).find((c) => /bg-(clay|brand-light)/.test(c)) ?? "?";
      if (tema === "dark") {
        verificar(!clara, `[salário/escuro] «${nome}» não usa a cor do modo claro`, camada.cor);
      } else {
        verificar(clara, `[salário/claro] «${nome}» mantém o pastel do modo claro`, camada.cor);
      }
    }

    // O texto sobre o realce continua a ser legível: a moldura do palco é
    // clara nos dois temas, portanto o cartão TEM de mudar de cor.
    const fundoCartao = await p.evaluate(() => {
      const sec = document.querySelector("#palco-salario-titulo").closest("section");
      return getComputedStyle(sec).backgroundColor;
    });
    const claro = luz(fundoCartao) > 0.5;
    verificar(
      tema === "dark" ? !claro : claro,
      `[salário/${tema}] a moldura acompanha o tema`,
      fundoCartao,
    );
    await ctx.close();
  }
}

// ── Correr ─────────────────────────────────────────────────────────────
const navegador = await chromium.launch(EXEC ? { executablePath: EXEC } : {});
try {
  await medirCena(navegador, "empresa", CENA_EMPRESA);
  await medirCena(navegador, "salario", CENA_SALARIO);
  await verificarRegua(navegador);
  await verificarTemaEscuro(navegador);
} finally {
  await navegador.close();
}

console.log("\n═══ PALCOS: EMPRESA E SALÁRIO ═══\n");
for (const p of passos) console.log(`  ✓ ${p}`);
if (falhas.length) {
  console.log("");
  for (const f of falhas) console.log(`  ✗ ${f}`);
  console.log(`\n${falhas.length} garantia(s) por cumprir.\n`);
  process.exit(1);
}
console.log(`\n${passos.length} garantias cumpridas.\n`);
