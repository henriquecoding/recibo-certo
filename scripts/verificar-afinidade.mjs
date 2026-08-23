#!/usr/bin/env node
/**
 * VERIFICAÇÃO DA SECÇÃO DE CONTABILISTAS — fim a fim, num browser a sério.
 * ----------------------------------------------------------------------
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PORQUE ISTO NÃO CABE NO VITEST                                       │
 * │                                                                     │
 * │ `contabilistas-afinidade.test.ts` prova a MATEMÁTICA da ordem e as   │
 * │ fronteiras da bagagem — funções puras, sem browser. O que não prova  │
 * │ é o que só existe depois de o React montar: se a secção aparece      │
 * │ mesmo no fim de uma ferramenta, se o observador a monta ao aproximar │
 * │ do ecrã, se o cartão leva o `?de=` no endereço, e se a página não    │
 * │ ganha barra horizontal a 360 px por causa dela.                      │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * A nuvem é encenada: as respostas de `contabilistas_publico` são
 * interceptadas e devolvidas por este script. Não é um atalho — é a única
 * forma de verificar a secção sem um projeto Supabase real, e o que se está
 * a verificar é a INTERFACE, não a base de dados (essa tem os seus testes
 * de contrato).
 *
 * Uso:
 *   NEXT_PUBLIC_SUPABASE_URL=https://exemplo.supabase.co \
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=chave-de-teste npm run build
 *   npm run start                          (noutro terminal)
 *   npm run afinidade:e2e
 *
 * Código de saída: 0 = tudo passa · 1 = pelo menos uma falha.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chromium } from "playwright";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * A versão real, lida da fonte.
 *
 * Marcar «uma versão qualquer» como vista não chega: o popup de Novidades
 * compara com `APP_VERSION`, e um valor inventado fá-lo querer abrir — com
 * um fundo escuro por cima da secção que estamos a tentar ver.
 */
const APP_VERSION = readFileSync(join(RAIZ, "src", "lib", "version.ts"), "utf8").match(
  /APP_VERSION\s*=\s*"([^"]+)"/,
)?.[1];
if (!APP_VERSION) throw new Error("Não foi possível ler APP_VERSION de src/lib/version.ts");

const BASE = process.env.RC_BASE_URL ?? "http://localhost:3000";
const EXECUTAVEL = process.env.PLAYWRIGHT_CHROMIUM;

const linhas = [];
let falhas = 0;
const reg = (nome, condicao, extra = "") => {
  if (!condicao) falhas++;
  linhas.push(`  ${condicao ? "✓" : "✗"} ${nome}${extra ? ` — ${extra}` : ""}`);
};
const seccao = (titulo) => linhas.push(`\n${titulo}`);

/** Três fichas: uma da área, uma que só a tem por termo próprio, uma alheia. */
const FICHAS = [
  {
    user_id: "11111111-1111-1111-1111-111111111111",
    slug: "ana-especialista", nome: "Ana Especialista",
    occ: "12345", occ_verificado: true,
    titulo_profissional: "Contabilista Certificada",
    apresentacao_curta: "Acompanho quem passa recibos verdes desde o primeiro ano de atividade.",
    distrito: "Lisboa", concelho: "Lisboa",
    especialidades: ["IRS", "Recibos verdes"],
    modalidades: ["online", "presencial"], idiomas: ["pt", "en"],
    resposta_media_horas: 24, linkedin_ligado: true, linkedin_avatar_url: null,
    aceita_novos_clientes: true, fidelidade_ativa: true, recebe_pagamentos: true,
    perfil_termos: [{ texto: "declarações de rendimentos" }], cobertura: null,
  },
  {
    user_id: "22222222-2222-2222-2222-222222222222",
    slug: "bruno-implicito", nome: "Bruno Implícito",
    occ: null, occ_verificado: false,
    titulo_profissional: null,
    apresentacao_curta: "Trabalho com quem factura para fora de Portugal.",
    distrito: "Porto", concelho: "Matosinhos",
    especialidades: ["IVA"],
    modalidades: ["online"], idiomas: ["pt"],
    resposta_media_horas: null, linkedin_ligado: false, linkedin_avatar_url: null,
    aceita_novos_clientes: true, fidelidade_ativa: false, recebe_pagamentos: false,
    perfil_termos: [{ texto: "nómadas digitais" }], cobertura: null,
  },
  {
    user_id: "33333333-3333-3333-3333-333333333333",
    slug: "carla-alheia", nome: "Carla Alheia",
    occ: null, occ_verificado: false,
    titulo_profissional: null, apresentacao_curta: null,
    distrito: "Faro", concelho: "Faro",
    especialidades: ["Heranças e sucessões"],
    modalidades: ["presencial"], idiomas: ["pt"],
    resposta_media_horas: null, linkedin_ligado: false, linkedin_avatar_url: null,
    aceita_novos_clientes: true, fidelidade_ativa: false, recebe_pagamentos: false,
    perfil_termos: [], cobertura: null,
  },
];

const browser = await chromium.launch(EXECUTAVEL ? { executablePath: EXECUTAVEL } : {});

async function novaPagina({ largura = 1280, altura = 900 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: largura, height: altura } });
  const pagina = await ctx.newPage();

  // Sem consentimento de estatística não há medição — e os dois overlays da
  // aplicação (cookies e Novidades) tapavam exatamente o que se quer ver.
  await pagina.addInitScript((versao) => {
    try {
      window.localStorage.setItem(
        "recibocerto:cookie-consent",
        JSON.stringify({ versao: 1, estatistica: true, marketing: false, em: new Date().toISOString() }),
      );
      window.localStorage.setItem("recibocerto:changelog_visto", versao);
    } catch { /* modo privado: segue à mesma */ }
  }, APP_VERSION);

  // ── A nuvem encenada ─────────────────────────────────────────────────
  //  Uma só rota para TODO o `/rest/v1/`: o que não for a view pública
  //  responde vazio. Sem isto, os pedidos que a página do perfil faz à
  //  agenda saíam para a rede a sério, falhavam no DNS e derrubavam o
  //  `Promise.all` que os carrega — e o que se estava a testar deixava de
  //  chegar a ser desenhado por uma razão que nada tem a ver com ele.
  await pagina.route("**/rest/v1/**", async (rota) => {
    const pedido = rota.request();
    const url = new URL(pedido.url());
    const objeto = (pedido.headers()["accept"] ?? "").includes("pgrst.object");

    if (!url.pathname.includes("contabilistas_publico")) {
      return rota.fulfill({
        status: objeto ? 406 : 200,
        contentType: "application/json",
        body: objeto ? '{"message":"sem linhas"}' : "[]",
      });
    }

    // `?slug=eq.x` é o perfil de uma pessoa; o resto é o lote do diretório.
    const slug = (url.searchParams.get("slug") ?? "").replace(/^eq\./, "");
    const linhas = slug ? FICHAS.filter((f) => f.slug === slug) : FICHAS;

    await rota.fulfill({
      status: 200,
      contentType: objeto ? "application/vnd.pgrst.object+json" : "application/json",
      headers: { "content-range": `0-${Math.max(0, linhas.length - 1)}/${linhas.length}` },
      body: JSON.stringify(objeto ? (linhas[0] ?? null) : linhas),
    });
  });
  // Sessão anónima: o `getSession` do SDK não pode ficar pendurado.
  await pagina.route("**/auth/v1/**", (rota) =>
    rota.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
  );
  await pagina.route("**/api/analytics", (rota) => rota.fulfill({ status: 204, body: "" }));

  return { ctx, pagina };
}

const SECCAO = "section[aria-labelledby='contabilistas-do-resultado']";

// ── 1. A secção aparece no fim de uma ferramenta ────────────────────────
{
  seccao("1. No fim do simulador de IRS");
  const { ctx, pagina } = await novaPagina();
  await pagina.goto(`${BASE}/ferramentas/simulador-irs`, { waitUntil: "domcontentloaded" });

  const antes = await pagina.locator(SECCAO).count();
  reg("não está montada à entrada (só perto do ecrã)", antes === 0);

  await pagina.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await pagina.waitForSelector(SECCAO, { timeout: 15000 }).catch(() => null);

  const visivel = await pagina.locator(SECCAO).count();
  reg("monta ao chegar ao fim da página", visivel === 1);

  const titulo = await pagina.locator("#contabilistas-do-resultado").textContent().catch(() => "");
  reg("tem um título próprio", /contabilista/i.test(titulo ?? ""), (titulo ?? "").trim());

  const nomes = await pagina.locator(`${SECCAO} article h3`).allTextContents();
  reg("a especialista de IRS vem primeiro", nomes[0] === "Ana Especialista", nomes.join(" · "));
  // A Carla só faz heranças: não é um terceiro cartão, é ruído com um nome.
  reg("quem não trabalha com isto não entra a encher", !nomes.includes("Carla Alheia"), nomes.join(" · "));

  const motivos = await pagina.locator(`${SECCAO} article p[data-motivo]`).allTextContents();
  reg("cada cartão diz porque aparece", motivos.length === nomes.length, motivos.join(" | "));
  reg("os acrónimos não vão para minúsculas", !/\birs\b/.test(motivos.join(" ")), motivos[0] ?? "");
  // O Bruno só tem IVA marcado; entra por ter escrito «nómadas digitais».
  reg(
    "quem corresponde por um termo escrito também entra",
    motivos.some((m) => /O perfil aponta para/.test(m)),
    motivos.join(" | "),
  );

  const rodape = await pagina.locator(SECCAO).textContent();
  reg("declara de onde vem a ordem", /A ordem vem das áreas/.test(rodape ?? ""));
  reg("declara que não há lugares pagos", /Não há lugares pagos/.test(rodape ?? ""));

  const href = await pagina.locator(`${SECCAO} article a`).first().getAttribute("href");
  reg("o cartão aponta para o perfil", (href ?? "").startsWith("/contabilistas/"), href ?? "");

  await ctx.close();
}

// ── 2. O motor muda com a ferramenta ────────────────────────────────────
{
  seccao("2. Noutra ferramenta, outra ordem");
  const { ctx, pagina } = await novaPagina();
  await pagina.goto(`${BASE}/ferramentas/simulador-herancas`, { waitUntil: "domcontentloaded" });
  await pagina.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await pagina.waitForSelector(SECCAO, { timeout: 15000 }).catch(() => null);

  const nomes = await pagina.locator(`${SECCAO} article h3`).allTextContents();
  reg("nas heranças, quem faz heranças vem primeiro", nomes[0] === "Carla Alheia", nomes.join(" · "));
  // O Bruno não tem nem heranças nem nada adjacente: fica de fora.
  reg("quem não tem nada a ver com o caso não aparece", !nomes.includes("Bruno Implícito"), nomes.join(" · "));

  const intro = await pagina.locator(SECCAO).textContent();
  reg("a frase de topo nomeia a área desta ferramenta", /heranças e sucessões/.test(intro ?? ""));
  await ctx.close();
}

// ── 3. A bagagem — levar o que se simulou ───────────────────────────────
{
  seccao("3. Levar a simulação");
  const { ctx, pagina } = await novaPagina();
  await pagina.addInitScript(() => {
    window.localStorage.setItem(
      "recibocerto:contabilistas:bagagem:v1",
      JSON.stringify({
        toolId: "simulador-irs", tipo: "simulador_irs",
        titulo: "Simulação de IRS 2026",
        conteudo: { ano: 2026, irsEstimado: 1234 }, campos: 2,
        criadoEm: new Date().toISOString(),
      }),
    );
  });
  await pagina.goto(`${BASE}/ferramentas/simulador-irs`, { waitUntil: "domcontentloaded" });
  await pagina.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await pagina.waitForSelector(SECCAO, { timeout: 15000 }).catch(() => null);

  const caixa = pagina.locator(`${SECCAO} input[type=checkbox]`);
  reg("há uma escolha para levar a simulação", (await caixa.count()) === 1);
  reg("vem marcada", await caixa.isChecked().catch(() => false));

  const texto = await pagina.locator(SECCAO).textContent();
  reg("diz que fica no dispositivo", /só neste dispositivo/i.test(texto ?? ""));
  reg("não revela valores da simulação", !/1234/.test(texto ?? ""));

  const comBagagem = await pagina.locator(`${SECCAO} article a`).first().getAttribute("href");
  reg("o cartão leva a origem no endereço", (comBagagem ?? "").includes("?de=simulador-irs"), comBagagem ?? "");

  await caixa.uncheck();
  const semBagagem = await pagina.locator(`${SECCAO} article a`).first().getAttribute("href");
  reg("desmarcar tira a origem do endereço", !(semBagagem ?? "").includes("?de="), semBagagem ?? "");

  await ctx.close();
}

// ── 4. A chegada ao perfil com bagagem ──────────────────────────────────
{
  seccao("4. Chegar ao perfil com a simulação");
  const { ctx, pagina } = await novaPagina();
  await pagina.addInitScript(() => {
    window.localStorage.setItem(
      "recibocerto:contabilistas:bagagem:v1",
      JSON.stringify({
        toolId: "simulador-irs", tipo: "simulador_irs",
        titulo: "Simulação de IRS 2026",
        conteudo: { ano: 2026, irsEstimado: 1234 }, campos: 2,
        criadoEm: new Date().toISOString(),
      }),
    );
  });
  await pagina.goto(`${BASE}/contabilistas/ana-especialista?de=simulador-irs`, {
    waitUntil: "domcontentloaded",
  });
  const barra = pagina.locator("section[aria-label='A simulação que trouxeste']");
  await barra.waitFor({ timeout: 15000 }).catch(() => null);
  reg("o perfil reconhece a bagagem", (await barra.count()) === 1);

  const texto = await barra.textContent().catch(() => "");
  reg("diz o que se traz", /Simulação de IRS 2026/.test(texto ?? ""));
  reg("promete que nada segue sem aceitação", /Nada segue antes disso/.test(texto ?? ""));
  reg("não revela valores", !/1234/.test(texto ?? ""));

  await pagina.getByRole("button", { name: "Não levar" }).click().catch(() => null);
  reg("«não levar» apaga a bagagem", (await barra.count()) === 0);
  const restou = await pagina.evaluate(() =>
    window.localStorage.getItem("recibocerto:contabilistas:bagagem:v1"),
  );
  reg("e apaga-a mesmo do dispositivo", restou === null);

  await ctx.close();
}

// ── 5. Telemóvel a 360 px ───────────────────────────────────────────────
{
  seccao("5. A 360 px");
  const { ctx, pagina } = await novaPagina({ largura: 360, altura: 740 });
  await pagina.goto(`${BASE}/ferramentas/seguranca-social`, { waitUntil: "domcontentloaded" });
  await pagina.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await pagina.waitForSelector(SECCAO, { timeout: 15000 }).catch(() => null);

  const overflow = await pagina.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  reg("sem barra horizontal", overflow <= 0, `${overflow}px`);

  // O que se mede é a ÁREA CLICÁVEL, não a caixa do elemento. Um `input`
  // de 16 px dentro de um `<label>` de 60 px é um alvo de 60 px, e o link
  // «Ver perfil» de um cartão tem por área o cartão inteiro (`after:inset-0`
  // — ver `ContabilistaCard`). Medir a caixa do elemento reprovaria os dois
  // e passaria a esconder os alvos que estão mesmo pequenos.
  const alvos = await pagina.evaluate((sel) => {
    const raiz = document.querySelector(sel);
    if (!raiz) return [];
    const areaClicavel = (e) => {
      const cartao = e.closest("article");
      if (cartao && e.tagName === "A") return cartao.getBoundingClientRect().height;
      const etiqueta = e.closest("label");
      if (etiqueta) return etiqueta.getBoundingClientRect().height;
      return e.getBoundingClientRect().height;
    };
    return [...raiz.querySelectorAll("a, button, input")]
      .map((e) => ({ alt: Math.round(areaClicavel(e)), texto: (e.textContent || e.getAttribute("type") || "?").trim().slice(0, 40) }))
      .filter((x) => x.alt > 0 && x.alt < 36);
  }, SECCAO);
  reg(
    "alvos com pelo menos 36 px",
    alvos.length === 0,
    alvos.map((a) => `${a.texto} (${a.alt}px)`).join(" · "),
  );

  await ctx.close();
}

await browser.close();

console.log(linhas.join("\n"));
console.log(`\n${falhas === 0 ? "✓ Tudo passa." : `✗ ${falhas} falha(s).`}`);
process.exit(falhas === 0 ? 0 : 1);
