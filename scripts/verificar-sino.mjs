#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════
//  O SINO, NUM BROWSER A SÉRIO — com sessão, e sem Supabase nenhum
//  ---------------------------------------------------------------------
//  Uso:
//    NEXT_PUBLIC_SUPABASE_URL=https://sinoteste.supabase.co \
//    NEXT_PUBLIC_SUPABASE_ANON_KEY=chave-de-teste npm run build
//    npm run start            (noutro terminal)
//    npm run sino:e2e
//
//  ┌─────────────────────────────────────────────────────────────────────┐
//  │ PORQUE É QUE ISTO NÃO CABE NUM TESTE DE UNIDADE                      │
//  │                                                                     │
//  │ O sino só se monta com sessão iniciada E nuvem configurada, e por    │
//  │ isso nunca tinha sido exercido. Quando finalmente o foi, tinha TRÊS  │
//  │ defeitos independentes, e nenhum deles dava erro em lado nenhum:     │
//  │                                                                     │
//  │  · o painel ficava em `opacity: 0` PARA SEMPRE — um `m.div` do       │
//  │    `motion` fora do `MotionProvider` não anima e fica no `initial`;  │
//  │  · no computador abria inteiro abaixo da dobra (0% visível a 768,    │
//  │    900 e 1080px), porque o sino vive no rodapé de uma barra          │
//  │    lateral `h-screen` e a pastilha ancorava 48px ABAIXO do botão;    │
//  │  · no telemóvel não existia de todo.                                 │
//  │                                                                     │
//  │ Os três passam num teste que leia CONTEÚDO: o texto está todo no     │
//  │ DOM. Só se apanham a perguntar ao browser o que está PINTADO — a     │
//  │ opacidade, a caixa, e quem ganha no ponto em que duas se sobrepõem.  │
//  └─────────────────────────────────────────────────────────────────────┘
//
//  Duas mentiras controladas, e mais nenhuma:
//    1. `NEXT_PUBLIC_SUPABASE_*` de teste no build, para `disponivel` ser
//       verdade e o SDK carregar;
//    2. uma sessão bem-formada escrita em `localStorage` antes de navegar,
//       e as chamadas REST do PostgREST respondidas pelo Playwright.
//
//  Tudo o resto é o código de produção: o componente, a loja, o portal, o
//  foco, a ancoragem.
//
//  ⚠️ NÃO ESTÁ NO CI, e é dito de propósito: exige um build com variáveis
//  de Supabase que o workflow não tem, e um gate que se ignora a si
//  próprio é pior do que não existir. O que ESTÁ no CI são as garantias
//  de construção em `src/lib/__tests__/notificacoes.test.ts` — que fixam
//  as três correções acima pelo lado do código. Este script é o que as
//  descobriu, e é o que se corre quando se lhe voltar a tocar.
// ═══════════════════════════════════════════════════════════════════════

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env.RC_BASE_URL ?? "http://localhost:3000";
const SAIDA = process.env.RC_SAIDA ?? ".";
const falhas = [];
const ok = (n) => console.log(`  ✓ ${n}`);
const falha = (n, d) => { falhas.push(`${n}${d ? ` — ${d}` : ""}`); console.log(`  ✗ ${n}${d ? ` — ${d}` : ""}`); };
const eq = (got, want, n) => (got === want ? ok(n) : falha(n, `esperava ${JSON.stringify(want)}, veio ${JSON.stringify(got)}`));

const UID = "11111111-2222-4333-8444-555555555555";
const b64url = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
// Um JWT com a forma certa e uma expiração no futuro. Não é validado por
// ninguém aqui: o SDK só o lê para saber se a sessão ainda serve.
const jwt = () => {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({ sub: UID, exp, role: "authenticated" })}.assinatura`;
};
const sessao = () => JSON.stringify({
  access_token: jwt(),
  refresh_token: "refresh-de-teste",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: {
    id: UID, aud: "authenticated", role: "authenticated",
    email: "sino@exemplo.pt", app_metadata: {}, user_metadata: {},
    created_at: new Date().toISOString(),
  },
});

const agora = new Date();
const hMenos = (min) => new Date(agora.getTime() - min * 60_000).toISOString();

/** 31 avisos: um a mais do que a primeira página, para o «ver mais» aparecer. */
const AVISOS = [
  { id: "a1", tipo: "proposta", titulo: "Tens uma proposta à espera",
    corpo: "Um contabilista respondeu ao teu caso.", url: "/dashboard/casos",
    lida_em: null, criado_em: hMenos(5) },
  { id: "a2", tipo: "guardiao_iva", titulo: "Já faturaste 80% do limite de isenção de IVA",
    corpo: "Faltam 3 000 € para o limite.", url: "/dashboard",
    lida_em: null, criado_em: hMenos(90) },
  { id: "a3", tipo: "consulta_confirmada", titulo: "A consulta está confirmada",
    corpo: null, url: "/dashboard/contabilista",
    lida_em: hMenos(200), criado_em: hMenos(1500) },
  ...Array.from({ length: 28 }, (_, i) => ({
    id: `v${i}`, tipo: "mensagem", titulo: `Mensagem antiga ${i + 1}`,
    corpo: null, url: null, lida_em: hMenos(4000), criado_em: hMenos(5000 + i),
  })),
];

/**
 * A sessão, mais o que tira do caminho o que não é o sino.
 *
 * O onboarding do painel e o aviso de cookies são folhas modais a
 * `z-[120]` — mais alto do que o sino, e com razão. Sem os dispensar, o
 * que se estaria a medir era a capacidade de clicar através de um véu.
 * As mesmas chaves que `scripts/verificar-dashboard.mjs` usa.
 */
function prepararArmazenamento(sessaoJson) {
  try {
    localStorage.setItem("sb-sinoteste-auth-token", sessaoJson);
    localStorage.setItem("recibocerto:onboarded", "1");
    // A forma exata de `CookieConsent` — e a `versao` CERTA: `lerConsentimento`
    // devolve `null` a uma versão antiga, e o painel volta a abrir-se.
    localStorage.setItem("recibocerto:cookie-consent", JSON.stringify({
      necessarios: true, estatistica: false, marketing: false,
      data: new Date().toISOString(), versao: 2,
    }));
  } catch { /* janela privada: o teste falha adiante, e diz porquê */ }
}

/** Instala a sessão e responde ao PostgREST. `modo` decide o que a leitura faz. */
async function preparar(ctx, modo = "ok") {
  await ctx.addInitScript(prepararArmazenamento, sessao());

  // ⚠️ ORDEM. O Playwright avalia os handlers pela ordem INVERSA do
  // registo: o último a ser registado é o primeiro a ser consultado. Com o
  // apanha-tudo registado depois do específico, era ele a responder `[]` às
  // notificações — e o sino aparecia vazio sem nada dar erro. Os
  // apanha-tudo vão primeiro, o específico por último.
  await ctx.route("**/auth/v1/**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await ctx.route("**/rest/v1/**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));

  await ctx.route("**/rest/v1/notificacoes**", async (rota) => {
    const url = rota.request().url();
    if (rota.request().method() !== "GET") return rota.fulfill({ status: 204, body: "" });
    if (modo === "erro") {
      return rota.fulfill({
        status: 500, contentType: "application/json",
        body: JSON.stringify({ message: "servidor em baixo" }),
      });
    }
    const limite = Number(/limit=(\d+)/.exec(url)?.[1] ?? 30);
    return rota.fulfill({
      status: 200, contentType: "application/json",
      headers: { "content-range": `0-${limite - 1}/*` },
      body: JSON.stringify(modo === "vazio" ? [] : AVISOS.slice(0, limite)),
    });
  });
}

// Sem o build certo, o sino não se monta — e um arreio que não encontra o
// que vem medir tem de o DIZER, não passar em branco.
{
  const resposta = await fetch(`${BASE}/dashboard`).catch(() => null);
  if (!resposta?.ok) {
    console.error(`Não há nada a responder em ${BASE}. Corre \`npm run start\` primeiro.`);
    process.exit(2);
  }
}

const navegador = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM });

try {
  // ═══ 1. TELEMÓVEL — existe, abre, e a folha fica POR CIMA da barra ═══
  console.log("\n▸ Telemóvel · 360px — o sino existe, e a folha fica inteira");
  {
    const ctx = await navegador.newContext({ viewport: { width: 360, height: 740 } });
    await preparar(ctx);
    const p = await ctx.newPage();
    const errosJs = [];
    p.on("pageerror", (e) => errosJs.push(e.message));
    await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });

    const sino = p.locator("header button[aria-haspopup='dialog'][aria-label*='Notificaç']");
    await sino.waitFor({ state: "visible", timeout: 15_000 }).catch(() => {
      console.error(
        "\nO sino não apareceu. Quase de certeza o build não tem\n" +
        "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — sem elas,\n" +
        "`supabaseConfigurado()` é falso e o componente devolve `null`.\n" +
        "Ver o cabeçalho deste ficheiro.\n",
      );
      process.exit(2);
    });
    ok("o sino existe no cabeçalho do telemóvel");

    // A contagem por ler: dois dos três primeiros não têm `lida_em`.
    eq(await sino.getAttribute("aria-label"), "Notificações: 2 por ler",
      "o rótulo diz quantos estão por ler");
    eq((await sino.locator("span[aria-hidden]").first().innerText()).trim(), "2",
      "e o distintivo mostra o mesmo número");

    const caixa = await sino.boundingBox();
    eq(Math.round(caixa.width) >= 36 && Math.round(caixa.height) >= 36, true,
      `o alvo tem ${Math.round(caixa.width)}×${Math.round(caixa.height)}px (piso 36)`);

    await sino.click();
    const painel = p.locator("[role='dialog'][aria-label='Notificações']");
    await painel.waitFor({ state: "visible" });
    // A folha entra com `y: 8 → 0` em 0,25s. Medir a meio da animação é
    // medir uma posição que nunca é a final — e foi o que deu um «não
    // assenta no fundo» que não existia.
    await p.waitForTimeout(450);
    ok("abre ao toque");

    // ⚠️ A asserção que faltava a tudo o resto: está PINTADO? O painel era
    // um `m.div` fora do `MotionProvider` e ficava em `opacity: 0` para
    // sempre — com o texto todo no DOM, a passar em qualquer verificação
    // que leia conteúdo em vez de olhar para o ecrã.
    const pintado = await p.evaluate(() => {
      const d = document.querySelector("[role='dialog'][aria-label='Notificações']");
      const cs = getComputedStyle(d);
      return { opacidade: Number(cs.opacity), transform: cs.transform };
    });
    eq(pintado.opacidade, 1, `o painel está pintado (opacity ${pintado.opacidade})`);
    eq(pintado.transform === "none" || pintado.transform === "matrix(1, 0, 0, 1, 0, 0)", true,
      `e assente, sem transform residual (${pintado.transform})`);

    // O ponto que motivou o portal: a folha tem de ficar POR CIMA da barra
    // de navegação inferior, que é irmã do cabeçalho e vem depois no DOM.
    const oclusao = await p.evaluate(() => {
      const painel = document.querySelector("[role='dialog'][aria-label='Notificações']");
      const barra = document.querySelector("nav[aria-label='Navegação principal']");
      const r = painel.getBoundingClientRect();
      const rb = barra?.getBoundingClientRect();
      // O que está mesmo pintado no ponto onde as duas se sobrepõem.
      const x = r.left + r.width / 2;
      const y = rb ? rb.top + rb.height / 2 : r.bottom - 10;
      const emCima = document.elementFromPoint(x, y);
      return {
        painelNoBody: painel.parentElement === document.body || painel.closest("body > div") !== null,
        dentroDoCabecalho: Boolean(painel.closest("header")),
        sobrepoeBarra: Boolean(rb) && r.bottom > rb.top,
        quemGanhaNoPonto: emCima ? (painel.contains(emCima) ? "painel" : (barra?.contains(emCima) ? "barra" : "outro")) : "nada",
        fundoDoPainel: Math.round(r.bottom),
        alturaJanela: window.innerHeight,
      };
    });
    eq(oclusao.dentroDoCabecalho, false, "a folha saiu do cabeçalho (portal)");
    eq(oclusao.quemGanhaNoPonto, "painel",
      "e ganha à barra de navegação no ponto em que se sobrepõem");
    eq(oclusao.fundoDoPainel <= oclusao.alturaJanela + 1, true,
      `a folha assenta no fundo do ecrã (fundo ${oclusao.fundoDoPainel}, janela ${oclusao.alturaJanela})`);

    // O conteúdo: um aviso que pede decisão, um que é só para saber.
    eq(await painel.locator("li").count(), 30, "mostra a primeira página inteira");
    eq(await painel.getByText("Tens uma proposta à espera").isVisible(), true,
      "o aviso de proposta aparece pelo título");
    eq(await painel.getByText("Já faturaste 80% do limite de isenção de IVA").isVisible(), true,
      "e o do Guardião também — o primeiro aviso que não depende de contabilista");
    eq(await painel.getByText("há 5 min").isVisible(), true, "o carimbo é relativo");
    eq(await painel.getByRole("button", { name: "Ver mais antigos" }).isVisible(), true,
      "e há «ver mais antigos», porque a página veio cheia");

    // Sem overflow lateral com a folha aberta.
    eq(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true,
      "nada rola de lado com a folha aberta");

    await p.screenshot({ path: `${SAIDA}/sino-movel-claro.png` });

    // Escape fecha e devolve o foco.
    await p.keyboard.press("Escape");
    await painel.waitFor({ state: "hidden" });
    eq(await p.evaluate(() => document.activeElement?.getAttribute("aria-haspopup")), "dialog",
      "Escape fecha e o foco volta ao sino");

    eq(errosJs.length, 0, `sem erros de JavaScript${errosJs.length ? `: ${errosJs[0]}` : ""}`);
    await ctx.close();
  }

  // ═══ 2. TECLADO E FOCO ═══════════════════════════════════════════════
  console.log("\n▸ Teclado — o foco entra, fica preso, e volta");
  {
    const ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
    await preparar(ctx);
    const p = await ctx.newPage();
    await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });

    const sino = p.locator("aside button[aria-haspopup='dialog'][aria-label*='Notificaç']");
    await sino.waitFor({ state: "visible", timeout: 15_000 });
    ok("no computador vive na barra lateral");

    await sino.focus();
    await p.keyboard.press("Enter");
    const painel = p.locator("[role='dialog'][aria-label='Notificações']");
    await painel.waitFor({ state: "visible" });
    await p.waitForTimeout(350);

    // ⚠️ O DEFEITO QUE ESTE ARREIO ENCONTROU. O sino vive no rodapé de uma
    // barra lateral `h-screen`, e a pastilha abria 48px ABAIXO do botão:
    // 0% visível, em qualquer altura de janela. Não dava erro nenhum.
    const cabe = await p.evaluate(() => {
      const d = document.querySelector("[role='dialog'][aria-label='Notificações']");
      const r = d.getBoundingClientRect();
      const visivel = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
      return { pct: Math.round((visivel / r.height) * 100), topo: Math.round(r.top), fundo: Math.round(r.bottom) };
    });
    eq(cabe.pct, 100, `o painel está inteiro dentro da janela (${cabe.pct}%, ${cabe.topo}→${cabe.fundo})`);

    // O defeito antigo: abrir com o teclado deixava o foco no botão.
    eq(await p.evaluate(() => {
      const d = document.querySelector("[role='dialog'][aria-label='Notificações']");
      return d?.contains(document.activeElement) ?? false;
    }), true, "o foco ENTRA no painel ao abrir");

    // Tab dá a volta e não sai.
    let saiu = false;
    for (let i = 0; i < 45; i += 1) {
      await p.keyboard.press("Tab");
      const dentro = await p.evaluate(() => {
        const d = document.querySelector("[role='dialog'][aria-label='Notificações']");
        return d?.contains(document.activeElement) ?? false;
      });
      if (!dentro) { saiu = true; break; }
    }
    eq(saiu, false, "o Tab dá a volta sem sair do painel");

    await p.keyboard.press("Escape");
    await painel.waitFor({ state: "hidden" });
    eq(await p.evaluate(() => document.activeElement?.getAttribute("aria-haspopup")), "dialog",
      "e o foco é devolvido a quem o abriu");

    // Acima de `sm` a pastilha é ancorada e NÃO prende o scroll da página.
    await sino.click();
    await painel.waitFor({ state: "visible" });
    eq(await p.evaluate(() => document.body.style.overflow), "",
      "no computador a pastilha não prende o scroll da página");
    eq(await p.evaluate(() => Boolean(
      document.querySelector("[role='dialog'][aria-label='Notificações']")?.closest("aside"))),
      true, "e fica ancorada ao botão, sem portal");
    await ctx.close();
  }

  // ═══ 3. MARCAR COMO LIDA — o ponto apaga-se no instante do clique ════
  console.log("\n▸ Marcar como lida");
  {
    const ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
    await preparar(ctx);
    const p = await ctx.newPage();
    await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    const sino = p.locator("aside button[aria-haspopup='dialog'][aria-label*='Notificaç']");
    await sino.waitFor({ state: "visible", timeout: 15_000 });
    await sino.click();
    const painel = p.locator("[role='dialog'][aria-label='Notificações']");
    await painel.waitFor({ state: "visible" });

    await p.waitForTimeout(350);
    await painel.getByRole("button", { name: /Marcar lidas/ }).click();
    await p.waitForTimeout(150);
    eq(await sino.getAttribute("aria-label"), "Notificações",
      "«marcar lidas» apaga a contagem sem esperar pela rede");
    eq(await painel.locator("li").count(), 30, "e a lista continua lá — lida não é apagada");
    await ctx.close();
  }

  // ═══ 4. O ERRO NÃO SE DISFARÇA DE «NÃO TENS AVISOS» ══════════════════
  console.log("\n▸ Leitura falhada · o defeito que não dava erro");
  {
    const ctx = await navegador.newContext({ viewport: { width: 360, height: 740 } });
    await preparar(ctx, "erro");
    const p = await ctx.newPage();
    await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    const sino = p.locator("header button[aria-haspopup='dialog'][aria-label*='Notificaç']");
    await sino.waitFor({ state: "visible", timeout: 15_000 });
    await sino.click();
    const painel = p.locator("[role='dialog'][aria-label='Notificações']");
    await painel.waitFor({ state: "visible" });

    const texto = await painel.innerText();
    eq(texto.includes("Não conseguimos ler os teus avisos"), true,
      "diz que não conseguiu ler");
    eq(texto.includes("Nada por aqui"), false,
      "e NÃO diz «Nada por aqui» — era o mesmo ecrã para as duas coisas");
    eq(await painel.getByRole("button", { name: /Tentar outra vez/ }).isVisible(), true,
      "e dá por onde tentar outra vez");
    await p.screenshot({ path: `${SAIDA}/sino-erro.png` });
    await ctx.close();
  }

  // ═══ 5. VAZIO — e o ecrã escuro ══════════════════════════════════════
  console.log("\n▸ Vazio, e o modo escuro pela camada `.dark`");
  {
    const ctx = await navegador.newContext({
      viewport: { width: 360, height: 740 }, colorScheme: "dark",
    });
    await preparar(ctx, "vazio");
    const p = await ctx.newPage();
    // A chave é `recibocerto:theme` (em inglês) — é a que o script
    // anti-flash do `layout.tsx` lê antes da primeira pintura. Pôr a classe
    // `.dark` à mão não chegava: o script corre depois e manda ele.
    await p.addInitScript(() => {
      try { localStorage.setItem("recibocerto:theme", "dark"); } catch { /* ignora */ }
    });
    await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    const sino = p.locator("header button[aria-haspopup='dialog'][aria-label*='Notificaç']");
    await sino.waitFor({ state: "visible", timeout: 15_000 });
    eq(await sino.getAttribute("aria-label"), "Notificações",
      "sem avisos, o rótulo não fala de contagem");
    await sino.click();
    const painel = p.locator("[role='dialog'][aria-label='Notificações']");
    await painel.waitFor({ state: "visible" });
    eq((await painel.innerText()).includes("Nada por aqui"), true,
      "e AÍ sim, «Nada por aqui»");

    const cores = await p.evaluate(() => {
      const d = document.querySelector("[role='dialog'][aria-label='Notificações']");
      const h2 = d.querySelector("h2");
      return {
        escuroLigado: document.documentElement.classList.contains("dark"),
        fundo: getComputedStyle(d).backgroundColor,
        titulo: getComputedStyle(h2).color,
      };
    });
    eq(cores.escuroLigado, true, "o tema escuro está ligado");
    // #1e221b — a palete QUENTE da camada `.dark`, e não o stone-900 frio.
    eq(cores.fundo, "rgb(30, 34, 27)",
      "o painel usa a palete quente da camada `.dark`, não uma segunda palete");
    eq(cores.titulo, "rgb(242, 240, 232)", "e o título também");
    await p.screenshot({ path: `${SAIDA}/sino-movel-escuro.png` });
    await ctx.close();
  }

  // ═══ 6. UMA SUBSCRIÇÃO, DOIS SINOS ═══════════════════════════════════
  console.log("\n▸ Dois sinos no DOM, uma leitura só");
  {
    const ctx = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
    let leituras = 0;
    await ctx.addInitScript(prepararArmazenamento, sessao());
    await ctx.route("**/auth/v1/**", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
    await ctx.route("**/rest/v1/**", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    await ctx.route("**/rest/v1/notificacoes**", async (rota) => {
      if (rota.request().method() === "GET") leituras += 1;
      return rota.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify(AVISOS.slice(0, 3)),
      });
    });

    const p = await ctx.newPage();
    await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    await p.locator("aside button[aria-haspopup='dialog']").first().waitFor({ timeout: 15_000 });
    await p.waitForTimeout(600);

    // Os dois estão montados — um `hidden lg:flex`, o outro `lg:hidden`.
    eq(await p.locator("button[aria-haspopup='dialog'][aria-label*='Notificaç']").count(), 2,
      "há dois sinos montados (barra lateral e cabeçalho)");
    eq(leituras, 1, "e uma leitura só — a loja é partilhada");
    await ctx.close();
  }
} finally {
  await navegador.close();
}

writeFileSync(`${SAIDA}/sino-resultado.json`, JSON.stringify({ falhas }, null, 2));
console.log("");
if (falhas.length) {
  console.log(`✗ ${falhas.length} falha(s):`);
  for (const f of falhas) console.log(`   · ${f}`);
  process.exit(1);
}
console.log("✓ Sino verificado ponta a ponta, num browser a sério.");
