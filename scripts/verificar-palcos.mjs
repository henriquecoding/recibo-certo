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
//     `globals.css`. E, desde que o axe deu verde a um título com
//     **1,09:1** no cartão do Descobrir, há aqui uma varredura de
//     contraste própria — ver `verificarContraste`.
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

/**
 * A cena espera pela sua vez.
 *
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ O QUE ISTO GARANTE, E O QUE NÃO GARANTE                               │
 * │                                                                       │
 * │ Garante que um palco FORA DO ECRÃ não está a correr: não gasta CPU    │
 * │ nem bateria a demonstrar para ninguém, e quando a pessoa chega lá a   │
 * │ cena começa do princípio em vez de já ter acabado.                    │
 * │                                                                       │
 * │ NÃO garante que a página carregue mais depressa — medido em A/B       │
 * │ intercalado, o bloqueio da thread é indistinguível com e sem esta     │
 * │ espera. O peso do arranque não é a animação: uma página de texto      │
 * │ sem palco nenhum já custa 60% do mesmo bloqueio. Ver o roteiro.       │
 * └───────────────────────────────────────────────────────────────────────┘
 */
async function verificarArranquePorEtapas(navegador) {
  // Uma janela baixa põe o palco abaixo da dobra sem ser preciso rolar.
  const ctx = await navegador.newContext({
    viewport: { width: 1280, height: 260 },
    colorScheme: "light",
  });
  await ctx.addInitScript(
    ([v]) => {
      try {
        localStorage.setItem("recibocerto:changelog_visto", v);
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
    [VERSAO],
  );
  const p = await ctx.newPage();
  await p.goto(`${ENDERECO}/?foco=empresa`, { waitUntil: "load" });
  await p.waitForTimeout(4000);

  /** A legenda do cabeçalho diz em que passo a cena vai. */
  const legenda = () => p.locator("#palco-empresa-titulo + p").innerText();

  const foraDoEcra = await legenda();
  verificar(
    /concluída/i.test(foraDoEcra),
    "[arranque] fora do ecrã a cena não arranca — fica no estado servido",
    `legenda: «${foraDoEcra}»`,
  );

  await p.locator("#palco-empresa-titulo").scrollIntoViewIfNeeded();
  // Tempo para a licença (visível + browser livre) e para o 1.º ato.
  await p.waitForTimeout(2500);
  const noEcra = await legenda();
  verificar(
    !/concluída/i.test(noEcra),
    "[arranque] ao entrar no ecrã a cena começa do princípio",
    `legenda: «${noEcra}»`,
  );

  // E ACABA — a rede de segurança do `timeout` do `requestIdleCallback`.
  await p.waitForTimeout(CENA_EMPRESA);
  const fim = await legenda();
  verificar(
    /concluída/i.test(fim),
    "[arranque] e chega ao fim depois de arrancar",
    `legenda: «${fim}»`,
  );
  await ctx.close();
}


// ═══════════════════════════════════════════════════════════════════════
//  O CONTRASTE REAL DE CADA PALCO, NOS DOIS TEMAS
//  ---------------------------------------------------------------------
//  ┌───────────────────────────────────────────────────────────────────────┐
//  │ O AXE PASSOU COM 1,09:1                                               │
//  │                                                                       │
//  │ O cartão da hipótese do Descobrir tinha `bg-[#f8fbf8]` — um LITERAL,  │
//  │ que nenhuma camada de tema remapeia — e texto em `text-ink` e         │
//  │ `text-stone-600`, que o `.dark` de `globals.css` inverte para tons    │
//  │ claros. Fundo branco fixo, texto a ficar branco: o título ficava a    │
//  │ **1,09:1** e era literalmente invisível.                              │
//  │                                                                       │
//  │ `auditar-a11y-focos.mjs` corre o axe na vista «desktop escuro» e      │
//  │ deu VERDE. Uma regra de contraste que não apanha 1,09:1 não é a rede  │
//  │ que se pensava ter — e é por isso que esta varredura existe ao lado.  │
//  └───────────────────────────────────────────────────────────────────────┘
//
//  Mede a razão de contraste de TODO o texto de cada palco contra o fundo
//  opaco mais próximo, nos dois temas. Ignora o que está a meio de uma
//  transição de opacidade (< 0,9), porque aí a cor ainda não é a final.
//
//  4,5:1 é o limiar da WCAG AA para texto normal. Os palcos usam muito
//  texto de 8–11 px, que é precisamente onde o limiar importa mais.
// ═══════════════════════════════════════════════════════════════════════

/** A sonda corre DENTRO do browser. A luminância é a da WCAG, com gama. */
const SONDA_CONTRASTE = `(() => {
  const canal = (v) => { const s = v/255; return s <= 0.04045 ? s/12.92 : Math.pow((s+0.055)/1.055, 2.4); };
  const luz = (c) => { const m = (c.match(/[\\d.]+/g) ?? []).map(Number); return 0.2126*canal(m[0]||0) + 0.7152*canal(m[1]||0) + 0.0722*canal(m[2]||0); };
  const opaco = (c) => { const m = (c.match(/[\\d.]+/g) ?? []).map(Number); return m.length < 4 || m[3] >= 0.95; };
  // O fundo EFETIVO: o primeiro antecessor com cor opaca. É o que o olho
  // vê, e não o que o elemento declara — que é quase sempre transparente.
  const fundoDe = (el) => { let n = el; while (n && n !== document.documentElement) { const b = getComputedStyle(n).backgroundColor; if (b && b !== "rgba(0, 0, 0, 0)" && opaco(b)) return b; n = n.parentElement; } return getComputedStyle(document.body).backgroundColor; };
  const razao = (a, b) => { const L1 = Math.max(luz(a), luz(b)), L2 = Math.min(luz(a), luz(b)); return (L1 + 0.05) / (L2 + 0.05); };
  const secao = document.querySelector("[id$='-titulo']")?.closest("section");
  if (!secao) return null;
  const maus = [];
  for (const el of secao.querySelectorAll("*")) {
    const txt = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join("");
    if (!txt) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    let op = 1, n = el; while (n && n !== document.body) { op *= Number(getComputedStyle(n).opacity); n = n.parentElement; }
    if (op < 0.9) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const k = razao(cs.color, fundoDe(el));
    if (k < 4.5) maus.push({ txt: txt.slice(0, 30), k: Number(k.toFixed(2)), cor: cs.color, fundo: fundoDe(el) });
  }
  return maus;
})()`;

async function verificarContraste(navegador) {
  for (const foco of ["descobrir", "preco", "recibos", "empresa", "salario"]) {
    for (const tema of ["light", "dark"]) {
      const ctx = await contexto(navegador, tema);
      const p = await ctx.newPage();
      await p.goto(`${ENDERECO}/?foco=${foco}`, { waitUntil: "load" });
      await p.locator("section").first().scrollIntoViewIfNeeded().catch(() => {});
      await p.waitForTimeout(CENA_EMPRESA + 3000);
      const maus = await p.evaluate(SONDA_CONTRASTE);
      if (maus === null) {
        verificar(false, `[contraste/${foco}/${tema}] palco não encontrado`);
      } else {
        verificar(
          maus.length === 0,
          `[contraste/${foco}/${tema}] todo o texto acima de 4,5:1`,
          maus.length
            ? maus
                .slice(0, 3)
                .map((m) => `${m.k}:1 «${m.txt}» (${m.cor} sobre ${m.fundo})`)
                .join(" · ")
            : "",
        );
      }
      await ctx.close();
    }
  }
}

// ── Correr ─────────────────────────────────────────────────────────────
const navegador = await chromium.launch(EXEC ? { executablePath: EXEC } : {});
try {
  await medirCena(navegador, "empresa", CENA_EMPRESA);
  await medirCena(navegador, "salario", CENA_SALARIO);
  await verificarRegua(navegador);
  await verificarTemaEscuro(navegador);
  await verificarArranquePorEtapas(navegador);
  await verificarContraste(navegador);
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
