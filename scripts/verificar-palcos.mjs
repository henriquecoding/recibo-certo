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
/** 2900 + 3500 + 3100 + 3400, com folga. */
const CENA_CONTRATACAO = 14_000;
const ROTA_FOCO = {
  descobrir: "/",
  preco: "/inicio/preco",
  recibos: "/inicio/recibos",
  empresa: "/inicio/empresa",
  salario: "/inicio/salario",
  // ┌───────────────────────────────────────────────────────────────────┐
  // │ O PALCO QUE NENHUM PORTÃO RENDERIZAVA                             │
  // │                                                                   │
  // │ `/inicio/salario` tem DOIS palcos, trocados por um radiogroup, e  │
  // │ o de quem contrata só existe com `?percurso=empregador`. Esta     │
  // │ medição parava no percurso do trabalhador; `verificar-movel.mjs`  │
  // │ também; e `verificar-contratacao.mjs` pede explicitamente         │
  // │ `?percurso=trabalhador`. Resultado: o palco patronal nunca foi    │
  // │ medido — nem frames, nem contraste, nem fim de cena — e ficou com │
  // │ os quatro atos a `beats: []` sem nada acusar. Uma regra que só se │
  // │ verifica na metade fácil da rota é uma intenção.                  │
  // └───────────────────────────────────────────────────────────────────┘
  contratacao: "/inicio/salario?percurso=empregador",
};

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
            versao: 2,
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
  await p.goto(`${ENDERECO}${ROTA_FOCO[foco]}`, { waitUntil: "load" });
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

// ═══════════════════════════════════════════════════════════════════════
//  UMA CENA TEM DE MUDAR — o portão que apanha «isto não é uma animação»
//  ---------------------------------------------------------------------
//  ┌───────────────────────────────────────────────────────────────────────┐
//  │ O DEFEITO QUE PASSOU POR TODAS AS OUTRAS MEDIÇÕES                     │
//  │                                                                       │
//  │ O palco da contratação tinha quatro atos com `beats: []`. Tudo o que  │
//  │ os outros portões medem dava VERDE, e com razão: não bloqueava a      │
//  │ thread (não fazia nada), não perdia frames (não desenhava nada),      │
//  │ chegava ao fim (o relógio corria), tinha contraste (o texto estava    │
//  │ lá desde o primeiro frame) e não transbordava. Uma cena morta passa   │
//  │ em todas as métricas de uma cena viva, porque todas elas medem CUSTO  │
//  │ e nenhuma media MUDANÇA.                                              │
//  │                                                                       │
//  │ Isto mede a mudança, e mede-a onde ela tem significado: uma parcela   │
//  │ que ainda não recebeu a ficha mostra «—», e a barra do orçamento      │
//  │ cresce. Se alguém voltar a esvaziar os beats, as duas amostras ficam  │
//  │ iguais e este portão fica vermelho.                                   │
//  └───────────────────────────────────────────────────────────────────────┘
async function verificarQueACenaMuda(navegador) {
  const ctx = await contexto(navegador, "light");
  const p = await ctx.newPage();
  await p.goto(`${ENDERECO}${ROTA_FOCO.contratacao}`, { waitUntil: "load" });
  await p.locator("#palco-contratacao-titulo").scrollIntoViewIfNeeded().catch(() => {});

  const amostrar = () =>
    p.evaluate(() => {
      const sec = document.querySelector("#palco-contratacao-titulo")?.closest("section");
      if (!sec) return null;
      const parcelas = [...sec.querySelectorAll('[data-contratacao="parcela"]')].map((el) => ({
        id: el.getAttribute("data-parcela"),
        texto: el.textContent.trim(),
      }));
      const barra = sec.querySelector('[data-contratacao="barra-orcamento"]');
      const resto = sec.querySelector('[data-contratacao="resto"]');
      return {
        parcelas,
        barra: barra ? Math.round(barra.getBoundingClientRect().width) : -1,
        resto: resto ? resto.textContent.trim() : "",
        legenda: document.querySelector("#palco-contratacao-titulo + p")?.innerText ?? "",
      };
    });

  // ── Uma amostra a cada 120 ms durante a cena inteira ─────────────────
  //  Amostrar em dois instantes fixos seria uma corrida: a cena só arranca
  //  depois de estar no ecrã E de o browser ter um momento livre, e esse
  //  instante não é previsível. Recolher a série inteira e olhar para o
  //  conjunto não tem esse problema.
  const serie = [];
  const arranque = Date.now();
  const fim = arranque + CENA_CONTRATACAO + 2_500;
  while (Date.now() < fim) {
    const a = await amostrar();
    if (a) serie.push({ ...a, em: Date.now() - arranque });
    await p.waitForTimeout(120);
  }

  verificar(serie.length > 0, "[contratação] o palco existe e é mensurável");
  if (serie.length === 0) {
    await ctx.close();
    return;
  }

  const ultimo = serie.at(-1);
  const traco = (a) => a.parcelas.filter((x) => x.texto === "—").length;

  // 1. Houve um momento em que uma parcela ainda não tinha recebido nada.
  const comTraco = serie.filter((a) => traco(a) > 0).length;
  verificar(
    comTraco > 0,
    "[contratação] as parcelas nascem por preencher — a ficha é que as preenche",
    `${comTraco} de ${serie.length} amostras com pelo menos um «—»`,
  );

  // 2. E, no fim, todas receberam.
  verificar(
    traco(ultimo) === 0 && ultimo.parcelas.length === 3,
    "[contratação] no fim as três parcelas estão preenchidas",
    ultimo.parcelas.map((x) => `${x.id}=${x.texto}`).join(" · ") || "sem parcelas",
  );

  // 3. A barra do orçamento CRESCE: parte de zero e assenta na largura útil.
  const larguras = serie.map((a) => a.barra);
  const minima = Math.min(...larguras);
  const maxima = Math.max(...larguras);
  verificar(
    maxima - minima > 20,
    "[contratação] a barra do orçamento enche em vez de nascer cheia",
    `${minima} px → ${maxima} px`,
  );

  // 4. O resto muda de valor: é a subtração a acontecer, não a ser afirmada.
  const restos = new Set(serie.map((a) => a.resto).filter(Boolean));
  verificar(
    restos.size > 1,
    "[contratação] o valor que sobra é contado, não escrito de uma vez",
    `${restos.size} leituras distintas`,
  );

  // ┌───────────────────────────────────────────────────────────────────┐
  // │ AS DUAS QUE SÓ UMA COREOGRAFIA A SÉRIO CONSEGUE CUMPRIR           │
  // │                                                                   │
  // │ As quatro de cima passam com os beats VAZIOS — foi a primeira     │
  // │ versão deste portão e não servia. Sem beats, `noAto` cai para     │
  // │ `ato > indice` e tudo continua a mudar, só que de uma vez em cada │
  // │ fronteira de ato. Um portão que dá verde ao defeito que existe    │
  // │ para apanhar é pior do que portão nenhum: promete uma rede que    │
  // │ não está lá.                                                      │
  // │                                                                   │
  // │ Estas duas medem o que SÓ acontece por beats, dentro de um ato:   │
  // │                                                                   │
  // │  · as três fichas partem a `PASSO.irmao` (160 ms) umas das        │
  // │    outras, portanto as três parcelas NÃO se preenchem no mesmo    │
  // │    instante. Com os beats vazios preenchem-se as três no mesmo    │
  // │    commit, e os três instantes de chegada colapsam num só;        │
  // │  · a barra enche até 100% e só 1 040 ms depois RECUA os 5% da     │
  // │    margem. Com os beats vazios `enche` e `protege` ficam          │
  // │    verdadeiros no mesmo commit e a barra nunca passa dos 95%.     │
  // └───────────────────────────────────────────────────────────────────┘
  // ┌───────────────────────────────────────────────────────────────────┐
  // │ A CHEGADA É A ÚLTIMA TRANSIÇÃO, NÃO A PRIMEIRA AMOSTRA CHEIA      │
  // │                                                                   │
  // │ O HTML servido traz a cena RESOLVIDA de propósito — quem chega    │
  // │ sem JavaScript tem de ver o resultado. Só depois de o cliente     │
  // │ montar e ler `prefers-reduced-motion` é que a cena rebobina. Há   │
  // │ portanto uma janela curta, antes da hidratação, em que as três    │
  // │ parcelas já mostram valores.                                      │
  // │                                                                   │
  // │ «A primeira amostra cheia» apanhava essa janela e dava as três    │
  // │ chegadas no mesmo instante — o mesmo sintoma do defeito que isto  │
  // │ existe para apanhar, por uma razão completamente diferente. O que │
  // │ conta é a transição de «—» para número que acontece DEPOIS da     │
  // │ rebobinagem, ou seja, a última de todas.                          │
  // └───────────────────────────────────────────────────────────────────┘
  const chegada = (id) => {
    const leitura = (a) => a.parcelas.find((x) => x.id === id)?.texto ?? null;
    let ultima = null;
    for (let i = 1; i < serie.length; i += 1) {
      if (leitura(serie[i - 1]) === "—" && leitura(serie[i]) !== "—") ultima = serie[i].em;
    }
    return ultima;
  };
  const chegadas = ["refeicao", "tsu", "posto"].map((id) => ({ id, em: chegada(id) }));
  const conhecidas = chegadas.filter((c) => c.em !== null).map((c) => c.em);
  verificar(
    conhecidas.length === 3 && Math.max(...conhecidas) - Math.min(...conhecidas) >= 120,
    "[contratação] as três parcelas chegam desfasadas, não todas no mesmo instante",
    chegadas.map((c) => `${c.id}@${c.em ?? "nunca"}`).join(" · "),
  );

  const larguraFinal = ultimo.barra;
  verificar(
    maxima - larguraFinal > 8,
    "[contratação] a barra enche a 100% e só depois recua a margem protegida",
    `pico ${maxima} px, repouso ${larguraFinal} px`,
  );

  // 5. E a cena acaba.
  verificar(
    /concluída/i.test(ultimo.legenda),
    "[contratação] a cena chega ao fim",
    `legenda do cabeçalho: «${ultimo.legenda}»`,
  );

  await ctx.close();
}

/** A régua move o ponto de leitura — por arrasto, por toque e por teclado. */
async function verificarRegua(navegador) {
  const ctx = await contexto(navegador, "light");
  const p = await ctx.newPage();
  await p.goto(`${ENDERECO}${ROTA_FOCO.empresa}`, { waitUntil: "load" });
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
  await pt.goto(`${ENDERECO}${ROTA_FOCO.empresa}`, { waitUntil: "load" });
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
    await p.goto(`${ENDERECO}${ROTA_FOCO.salario}`, { waitUntil: "load" });
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

    // ┌─────────────────────────────────────────────────────────────────┐
    // │ E O PALCO IRMÃO, QUE VIVE NO MESMO LUGAR                        │
    // │                                                                 │
    // │ `PalcoContratacao` declarava `tom="escuro"` — `#0c251e` FIXO    │
    // │ nos dois temas, com o interior todo em `text-white` e           │
    // │ `bg-white/[.035]`. Em modo claro era uma laje escura que não    │
    // │ participava no tema, e o radiogroup trocava um cartão branco    │
    // │ por ela. `focos.ts` declara `tom: "claro"` para este foco e o   │
    // │ palco do trabalhador honra-o; este passou a honrá-lo também, e  │
    // │ isto é o que impede a regressão.                                │
    // └─────────────────────────────────────────────────────────────────┘
    const ctxPatronal = await contexto(navegador, tema);
    const pp = await ctxPatronal.newPage();
    await pp.goto(`${ENDERECO}${ROTA_FOCO.contratacao}`, { waitUntil: "load" });
    await pp.waitForTimeout(CENA_CONTRATACAO);
    const molduraPatronal = await pp.evaluate(() => {
      const sec = document.querySelector("#palco-contratacao-titulo")?.closest("section");
      return sec ? getComputedStyle(sec).backgroundColor : null;
    });
    verificar(
      molduraPatronal !== null,
      `[contratação/${tema}] o palco patronal está no ecrã`,
      String(molduraPatronal),
    );
    if (molduraPatronal !== null) {
      const molduraClara = luz(molduraPatronal) > 0.5;
      verificar(
        tema === "dark" ? !molduraClara : molduraClara,
        `[contratação/${tema}] a moldura acompanha o tema`,
        molduraPatronal,
      );
    }
    await ctxPatronal.close();
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
            versao: 2,
            data: new Date().toISOString(),
          }),
        );
      } catch {}
    },
    [VERSAO],
  );
  const p = await ctx.newPage();
  await p.goto(`${ENDERECO}${ROTA_FOCO.empresa}`, { waitUntil: "load" });
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

  // E ACABA — mas espera-se ATÉ acabar, em vez de dormir um orçamento fixo.
  //
  // Era `waitForTimeout(CENA_EMPRESA)` seguido de UMA leitura. Os quatro atos
  // somam 11 400 ms e a constante dá 12 500 — 9,6 % de margem — só que a cena
  // não arranca no `load`: arranca quando o `requestIdleCallback` dá licença
  // («visível + browser livre»). Num runner com seis jobs em paralelo essa
  // licença chega tarde, e os atos avançam devagar por contenção de CPU. O
  // resultado era uma reprovação que não dizia nada sobre o produto: a cena
  // TINHA arrancado (a asserção acima passou) e ainda ia no 1.º ato quando o
  // relógio do teste esgotava.
  //
  // A garantia que interessa é «a cena chega ao fim», não «a cena chega ao fim
  // em 12,5 segundos». Esperar pelo ESTADO mede a garantia; dormir mede o
  // runner — e devolve assim que a legenda muda, em vez de dormir sempre tudo.
  //
  // ⚠️ ISTO NÃO CORRIGIU A REPROVAÇÃO DO CI, e o teto encurtou por causa
  // disso. A primeira explicação — «a margem de 9,6 % não chega num runner
  // carregado» — está DESMENTIDA: com três vezes a cena (37,5 s) a legenda
  // continuou no 1.º ato. Uma cena que não avança em 37,5 s não está lenta,
  // está parada, e esperar mais só torna a mesma reprovação oito minutos
  // mais lenta. Ficam ainda por explicar, e por reproduzir:
  //
  //   · não é o relógio a suspender por sair de vista — no local, depois do
  //     mesmo scroll, `[data-palco-suspenso]` está vazio;
  //   · não é contenção de CPU — a 6× de estrangulamento a cena acaba;
  //   · localmente a suíte inteira passa, aqui e no CI o passo 15 reprova.
  //
  // O que ainda não foi possível reproduzir é a CONDIÇÃO do CI: nas sondas
  // locais a 1.ª asserção («fora do ecrã a cena não arranca») comportou-se
  // ao contrário do arreio — a cena já tinha arrancado —, o que quer dizer
  // que a sonda não estava a montar o mesmo cenário que o teste. Enquanto
  // isso não for reproduzido, qualquer explicação é palpite.
  const fim = await p
    .waitForFunction(
      () =>
        /concluída/i.test(
          document.querySelector("#palco-empresa-titulo + p")?.innerText ?? "",
        ),
      null,
      { timeout: Math.round(CENA_EMPRESA * 1.5) },
    )
    .then(() => legenda())
    .catch(() => legenda());
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
  for (const foco of ["descobrir", "preco", "recibos", "empresa", "salario", "contratacao"]) {
    for (const tema of ["light", "dark"]) {
      const ctx = await contexto(navegador, tema);
      const p = await ctx.newPage();
      await p.goto(`${ENDERECO}${ROTA_FOCO[foco]}`, { waitUntil: "load" });
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
  await medirCena(navegador, "contratacao", CENA_CONTRATACAO);
  await verificarQueACenaMuda(navegador);
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
