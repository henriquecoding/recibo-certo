#!/usr/bin/env node
/**
 * VERIFICAÇÃO DO MOTOR DE DESCOBERTA — fim a fim, num browser.
 * ----------------------------------------------------------------------
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PORQUE ISTO NÃO CABE NO VITEST                                       │
 * │                                                                     │
 * │ Os testes de `negocio-market-*` provam o motor: que uma observação  │
 * │ nacional serve qualquer zona, que uma entrevista não promove a      │
 * │ hipótese, que um cenário inviável a contradiz.                       │
 * │                                                                     │
 * │ O que eles não veem é o ecrã. E foi no ecrã que os dois defeitos    │
 * │ mais caros deste checkpoint viveram:                                 │
 * │                                                                     │
 * │  · a leitura NACIONAL era filtrada contra `null` e desaparecia,     │
 * │    com a página a dizer «falta sinal na tua zona» enquanto a fonte  │
 * │    oficial estava a responder com o valor de Portugal;              │
 * │  · o preço de UMA unidade era escrito no campo do recibo MENSAL,    │
 * │    a discordar da projeção anual por um fator igual ao volume.      │
 * │                                                                     │
 * │ Nenhum dos dois partia o build, os testes ou o type-check.          │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Uso:
 *   npm run build && npm run start        (noutro terminal)
 *   npm run descobrir:e2e
 *
 * Variáveis:
 *   RC_BASE_URL          por omissão http://localhost:3000
 *   PLAYWRIGHT_CHROMIUM  caminho para um Chromium já instalado (opcional)
 *
 * Código de saída: 0 = tudo passa · 1 = pelo menos uma falha.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.RC_BASE_URL ?? "http://localhost:3000";

const VERSAO = readFileSync(join(RAIZ, "src/lib/version.ts"), "utf8").match(
  /APP_VERSION\s*=\s*"([^"]+)"/,
)?.[1];

const falhas = [];
const ok = (nome) => console.log(`  ✓ ${nome}`);
const falhar = (nome, detalhe) => {
  falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ""}`);
  console.log(`  ✗ ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
};
const verificar = (nome, condicao, detalhe) => (condicao ? ok(nome) : falhar(nome, detalhe));

const semear = () => {
  try {
    localStorage.setItem("recibocerto:onboarded", "1");
    localStorage.setItem(
      "recibocerto:cookie-consent",
      JSON.stringify({
        necessarios: true,
        estatistica: false,
        marketing: false,
        data: new Date().toISOString(),
        versao: 1,
      }),
    );
  } catch {
    /* modo privado: os overlays fecham-se por Escape */
  }
};

async function fecharOverlays(pagina) {
  for (let i = 0; i < 3; i++) {
    const aberto = await pagina.evaluate(() => Boolean(document.querySelector('[role="dialog"]')));
    if (!aberto) return;
    await pagina.keyboard.press("Escape");
    await pagina.waitForTimeout(400);
  }
}

/** §76 — a 360 px, nada pode empurrar o documento para o lado. */
async function semOverflow(pagina, onde) {
  const r = await pagina.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  verificar(`${onde}: sem overflow horizontal`, r.scroll <= r.client + 1, `${r.scroll} > ${r.client}`);
}

async function semErroDeRuntime(pagina, onde) {
  const erro = await pagina.evaluate(
    () =>
      document.querySelector("nextjs-portal") !== null ||
      /Application error|Unhandled Runtime Error|This page couldn/i.test(document.body.innerText),
  );
  verificar(`${onde}: sem erro de runtime`, !erro);
}

/**
 * Regra 5b do CLAUDE.md: alvos ≥ 36 px. Só controlos, e só dentro de `main`.
 *
 * O âmbito não é preguiça. Estas são rotas PÚBLICAS, e o rodapé do site
 * tem ligações de texto («Cookies», «Termos») desenhadas como botões: têm
 * a altura da linha por natureza e a WCAG 2.5.8 isenta-as explicitamente.
 * Contá-las daria uma falha permanente, igual em todas as páginas, que
 * ninguém voltaria a ler — e que esconderia um alvo pequeno a sério na
 * ferramenta.
 */
async function controlosTocaveis(pagina, onde) {
  const pequenos = await pagina.evaluate(() => {
    const maus = [];
    const raiz = document.querySelector("main") ?? document.body;
    for (const el of raiz.querySelectorAll("button, select, input[type=range], input[type=date]")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const est = getComputedStyle(el);
      if (est.visibility === "hidden" || est.display === "none") continue;
      if (r.height < 36) maus.push(`${el.tagName} h=${Math.round(r.height)}`);
    }
    return maus.slice(0, 6);
  });
  verificar(`${onde}: controlos com 36 px ou mais`, pequenos.length === 0, pequenos.join(" | "));
}

/** Axe sobre o que está no ecrã naquele instante, não sobre a rota vazia. */
async function semViolacoesAxe(pagina, onde) {
  const resultado = await new AxeBuilder({ page: pagina })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  verificar(
    `${onde}: sem violações axe`,
    resultado.violations.length === 0,
    resultado.violations.map((v) => `${v.id} (${v.nodes.length}×)`).join(" | "),
  );
}

/** O cartão do piloto turístico, aberto e pronto a ler. */
async function abrirCartaoTurismo(pagina) {
  const cartao = pagina.locator("article").filter({ hasText: "alojamento turístico" }).first();
  await cartao.scrollIntoViewIfNeeded();
  if ((await cartao.getByRole("button", { expanded: true }).count()) === 0) {
    await cartao.locator("button").first().click();
    await pagina.waitForTimeout(500);
  }
  return cartao;
}

const navegador = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {}),
});

try {
  for (const [rotulo, viewport] of [
    ["telemóvel 360", { width: 360, height: 740 }],
    ["desktop 1280", { width: 1280, height: 900 }],
  ]) {
    for (const tema of ["light", "dark"]) {
      console.log(`\n═══ ${rotulo} · ${tema} ═══`);

      const contexto = await navegador.newContext({ viewport, colorScheme: tema });
      await contexto.addInitScript(semear);
      await contexto.addInitScript(
        `try { localStorage.setItem("recibocerto:changelog_visto", ${JSON.stringify(VERSAO)}); } catch {}`,
      );

      const pagina = await contexto.newPage();
      const errosJS = [];
      pagina.on("pageerror", (e) => errosJS.push(String(e)));

      // ═══ 1. A rota abre e consulta a fonte oficial ═══════════════
      await pagina.goto(`${BASE}/ferramentas/descobrir-negocio`, { waitUntil: "networkidle" });
      await fecharOverlays(pagina);
      await pagina.locator("#resultado-descoberta").waitFor({ timeout: 20000 });

      await semErroDeRuntime(pagina, "descoberta: entrada");
      await semOverflow(pagina, "descoberta: entrada");
      await controlosTocaveis(pagina, "descoberta: entrada");

      const entrada = await pagina.evaluate(() => document.body.innerText);
      verificar(
        "compatibilidade é apresentada como afinidade, não como procura",
        /Compatibilidade \d+%/.test(entrada) && /afinidade contigo/i.test(entrada),
      );

      // ═══ 2. O contexto NACIONAL não desaparece (regressão) ═══════
      //  Este é o defeito que o checkpoint anterior trouxe: sem zona
      //  fixada, o valor de Portugal era descartado por um filtro contra
      //  `null` e a página afirmava não haver sinal.
      let cartao = await abrirCartaoTurismo(pagina);
      let texto = await cartao.innerText();
      verificar(
        "sem zona fixada, a leitura nacional aparece",
        /Contexto nacional|Portugal/.test(texto) && !/Sem sinal para esta zona/.test(texto),
        texto.slice(texto.indexOf("Evidência de mercado"), texto.indexOf("Evidência de mercado") + 180),
      );
      verificar("a leitura traz período de referência", /20\d\d/.test(texto));
      verificar("a saúde da fonte chega ao ecrã", /Fonte INE:/.test(texto));

      // ═══ 3. Escolher uma zona traz o sinal REGIONAL ══════════════
      await pagina.getByRole("button", { name: "Grande Lisboa", exact: true }).click();
      await pagina.waitForTimeout(600);
      cartao = await abrirCartaoTurismo(pagina);
      texto = await cartao.innerText();
      verificar(
        "a zona escolhida traz o sinal dessa zona",
        /Grande Lisboa/.test(texto) && !/Sem sinal para esta zona/.test(texto),
      );
      await semOverflow(pagina, "descoberta: zona escolhida");

      // ═══ 4. A entrevista não promove; o piloto pago promove ══════
      const registarProva = async (rotuloProva) => {
        await cartao.getByRole("button", { name: rotuloProva, exact: true }).click();
        await cartao.locator('input[type="date"]').fill("2026-08-01");
        await cartao.getByRole("button", { name: /Registar/ }).click();
        await pagina.waitForTimeout(500);
        cartao = await abrirCartaoTurismo(pagina);
        return cartao.innerText();
      };

      texto = await registarProva("Entrevista");
      verificar(
        "uma entrevista é contada mas não valida o mercado",
        /1 entrevista/.test(texto) && !/Validada contigo/.test(texto),
        texto.slice(texto.indexOf("Provar no teu mercado"), texto.indexOf("Provar no teu mercado") + 200),
      );

      texto = await registarProva("Piloto pago");
      verificar("um piloto pago atual valida o mercado da pessoa", /Validada contigo/.test(texto), texto.slice(0, 200));
      verificar("e diz o que falta para provar operação", /Repetir vendas/.test(texto));

      await semErroDeRuntime(pagina, "descoberta: com provas");
      await semOverflow(pagina, "descoberta: com provas");
      await controlosTocaveis(pagina, "descoberta: com provas");
      // Com o dossier aberto e o painel de provas à vista — que é onde
      // vivem os controlos novos, não na rota vazia.
      await semViolacoesAxe(pagina, "descoberta: com provas");

      // A prova tem de sobreviver ao recarregamento — é local, não de sessão.
      await pagina.reload({ waitUntil: "networkidle" });
      await fecharOverlays(pagina);
      cartao = await abrirCartaoTurismo(pagina);
      verificar("a prova registada sobrevive ao recarregamento", /Validada contigo/.test(await cartao.innerText()));

      // ═══ 5. A ponte para o preço leva a hipótese ════════════════
      const paraPreco = cartao.getByRole("link", { name: /Formar o preço desta hipótese/ });
      const href = await paraPreco.getAttribute("href");
      verificar(
        "o CTA de preço leva cenário e hipótese",
        /modo=preco/.test(href ?? "") && /cenario=/.test(href ?? "") && /h=tourism-guest-operations/.test(href ?? ""),
        href ?? "(sem href)",
      );

      // ═══ 5b. A hierarquia dos CTAs não é escolhida pelo ecrã ═════
      //  Uma ação principal, uma alternativa em texto, e a rota comercial
      //  que `escolherRota()` devolver — nunca duas do mesmo peso.
      const acoes = await cartao.evaluate((el) => {
        const principais = [...el.querySelectorAll("a")].filter((a) =>
          /rounded-full/.test(a.className) && /bg-brand/.test(a.className),
        );
        return { principais: principais.length, texto: el.innerText };
      });
      verificar("há uma só ação principal no dossier", acoes.principais === 1, String(acoes.principais));
      verificar(
        "a rota comercial vem do motor, com o que segue à vista",
        !/A seguir:/.test(acoes.texto) || /Nenhum dado pessoal|Formulário mínimo|Conta e pagamento/.test(acoes.texto),
        acoes.texto.slice(acoes.texto.indexOf("A seguir:"), acoes.texto.indexOf("A seguir:") + 200),
      );

      // ═══ 6. O preço que chega ao recibo é MENSAL (regressão) ════
      await pagina.goto(`${BASE}/ferramentas/recibos-verdes?modo=preco&cenario=servico&h=tourism-guest-operations`, {
        waitUntil: "networkidle",
      });
      await fecharOverlays(pagina);

      const concluir = pagina.getByRole("button", { name: /Usar este preço no recibo verde/ }).first();
      verificar("o estúdio de preço abre dentro dos recibos verdes", (await concluir.count()) > 0);
      await semOverflow(pagina, "recibos verdes: preço");

      if ((await concluir.count()) > 0) {
        await concluir.click();
        await pagina.waitForTimeout(2000);

        const painel = await pagina.evaluate(
          () => document.querySelector("#resultado-preco-transferido")?.innerText ?? "",
        );
        verificar("o painel de transferência aparece", painel.length > 0, painel.slice(0, 120));
        verificar(
          "o painel distingue preço por unidade de base mensal",
          /por unidade/.test(painel) && /por mês/.test(painel),
          painel.slice(0, 240),
        );

        // Quem acabou de formar um preço não pode cair no «Como queres
        // simular?»: o número que a página acabou de prometer transferir
        // ficava escondido atrás de mais uma escolha.
        const corpo = await pagina.evaluate(() => document.body.innerText);
        verificar(
          "o simulador abre já com o valor, sem voltar a perguntar o modo",
          !/Como queres simular\?/.test(corpo),
          corpo.slice(corpo.indexOf("Rever o preço"), corpo.indexOf("Rever o preço") + 120),
        );

        // O campo do recibo tem de conter a base MENSAL, não o unitário.
        const numeros = await pagina.evaluate(() => {
          const painelTexto = document.querySelector("#resultado-preco-transferido")?.innerText ?? "";
          const euros = [...painelTexto.matchAll(/([\d\s.]+,\d{2})\s*€/g)].map((m) =>
            Number(m[1].replace(/[\s. ]/g, "").replace(",", ".")),
          );
          const valores = [...document.querySelectorAll("input")]
            .map((input) => Number(String(input.value).replace(/[\s. ]/g, "").replace(",", ".")))
            .filter((valor) => Number.isFinite(valor) && valor > 0);
          return { euros, valores };
        });
        const unitario = numeros.euros.length ? Math.min(...numeros.euros) : null;
        const mensal = numeros.euros.length ? Math.max(...numeros.euros) : null;
        const detalhe = `campos=${JSON.stringify(numeros.valores)} unitário=${unitario} mensal=${mensal}`;
        verificar(
          "o valor do recibo é a base mensal, não o preço de uma unidade",
          mensal !== null &&
            numeros.valores.some((valor) => Math.abs(valor - mensal) <= 1) &&
            // Com volume > 1 os dois números são diferentes: o unitário não
            // pode estar sozinho no campo mensal, que era o defeito.
            (unitario === mensal || !numeros.valores.some((valor) => Math.abs(valor - unitario) <= 0.01)),
          detalhe,
        );

        await semErroDeRuntime(pagina, "recibos verdes: transferido");
        await semOverflow(pagina, "recibos verdes: transferido");
      }

      // ═══ 7. O handoff para o estúdio de empresa ═════════════════
      await pagina.goto(`${BASE}/dashboard/negocio?o=tourism-guest-operations`, { waitUntil: "networkidle" });
      await fecharOverlays(pagina);
      await pagina.waitForTimeout(1500);

      const estudio = await pagina.evaluate(() => document.body.innerText);
      verificar(
        "a oportunidade abre na pricing engine, pelo nome",
        /Operações locais para alojamento turístico/.test(estudio),
      );
      await semErroDeRuntime(pagina, "estúdio: oportunidade");
      await semOverflow(pagina, "estúdio: oportunidade");

      // Recarregar não pode duplicar a oferta.
      await pagina.reload({ waitUntil: "networkidle" });
      await fecharOverlays(pagina);
      await pagina.waitForTimeout(1500);
      const repetido = await pagina.evaluate(
        () => (document.body.innerText.match(/Operações locais para alojamento turístico/g) ?? []).length,
      );
      const primeira = (estudio.match(/Operações locais para alojamento turístico/g) ?? []).length;
      verificar(
        "atualizar a página não duplica a oferta",
        repetido === primeira,
        `${primeira} → ${repetido}`,
      );

      // ═══ 8. O conteúdo essencial existe sem JavaScript ══════════
      //  A checklist editorial exige-o, e a rota carregava o estúdio com
      //  `ssr: false`: o HTML servido não continha uma única palavra dos
      //  cinco dossiers — nem para quem navega sem JavaScript, nem para
      //  um motor de busca.
      // `javaScriptEnabled` é opção de contexto, não de página.
      const contextoSemJs = await navegador.newContext({ viewport, javaScriptEnabled: false });
      const semJs = await contextoSemJs.newPage();
      await semJs.goto(`${BASE}/ferramentas/descobrir-negocio`, { waitUntil: "domcontentloaded" });
      // `evaluate` precisa de JavaScript na página — que é exatamente o
      // que aqui está desligado. O HTML servido lê-se com `content()`.
      const htmlSemJs = await semJs.content();
      const textoSemJs = htmlSemJs
        .replace(/<script[\s\S]*?<\/script>/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&#x27;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ");
      for (const essencial of [
        "alojamento turístico",
        "Entrevistar dez operadores",
        "Teste que pode matar a ideia",
        "Formar o preço desta hipótese",
      ]) {
        verificar(`sem JavaScript: «${essencial}» está no HTML`, textoSemJs.includes(essencial));
      }
      verificar(
        "sem JavaScript: não promete dados que ainda não consultou",
        !/A consultar/.test(textoSemJs) && /consultados no teu dispositivo/.test(textoSemJs),
      );
      verificar(
        "sem JavaScript: nenhuma rota comercial sobre uma ideia por investigar",
        !/A seguir:/.test(textoSemJs),
      );
      await contextoSemJs.close();

      verificar("sem erros de JavaScript", errosJS.length === 0, errosJS.slice(0, 2).join(" | "));
      await contexto.close();
    }
  }
} finally {
  await navegador.close();
}

console.log(
  falhas.length === 0
    ? "\n✓ Motor de descoberta verificado nas quatro combinações."
    : `\n✗ ${falhas.length} falhas:\n${falhas.map((f) => `  · ${f}`).join("\n")}`,
);
process.exit(falhas.length === 0 ? 0 : 1);
