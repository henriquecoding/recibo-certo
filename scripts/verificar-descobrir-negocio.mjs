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

      // ═══ 1. FASE A — configurar antes de ver resultados ═════════
      await pagina.goto(`${BASE}/ferramentas/descobrir-negocio`, { waitUntil: "networkidle" });
      await fecharOverlays(pagina);
      await pagina.locator("#contexto-descoberta").waitFor({ timeout: 20000 });

      await semErroDeRuntime(pagina, "descoberta: fase A");
      await semOverflow(pagina, "descoberta: fase A");
      await controlosTocaveis(pagina, "descoberta: fase A");

      const faseA = await pagina.evaluate(() => document.body.innerText);
      verificar(
        "abre na configuração, não em resultados",
        /O teu perfil está a formar-se/.test(faseA) && !/passaram os critérios/.test(faseA),
      );
      verificar(
        "a barra é de profundidade do contexto, nunca de precisão",
        // `innerText` devolve o texto JÁ transformado por CSS, e este
        // rótulo é `uppercase`. Comparar sem ignorar a caixa dava um
        // falso negativo permanente.
        /quanto já conhecemos do teu cenário/i.test(faseA) && !/precisão do perfil/i.test(faseA),
      );
      verificar(
        "não despeja cartões de negócio durante a configuração",
        (await pagina.locator("#ferramenta article").count()) === 0,
      );

      const botaoDescobrir = pagina.getByRole("button", { name: /Descobrir oportunidades/ });
      verificar("o botão de descoberta existe", (await botaoDescobrir.count()) > 0);
      verificar(
        "e está desativado enquanto não houver o mínimo",
        await botaoDescobrir.first().isDisabled(),
      );

      // ═══ 2. Responder o essencial ═══════════════════════════════
      await pagina.getByRole("button", { name: /Logística e transporte/ }).first().click();
      await pagina.getByRole("button", { name: /Organizar e executar/ }).first().click();
      await pagina.selectOption("#ode-regiao", "grande-lisboa");
      await pagina.getByRole("button", { name: "1 000 – 5 000 €", exact: true }).first().click();
      await pagina.getByRole("button", { name: /Carta de condução/ }).first().click();
      await pagina.getByRole("button", { name: /Viatura de carga/ }).first().click();
      await pagina.waitForTimeout(300);

      const profundidade = await pagina.evaluate(
        () => document.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow") ?? "0",
      );
      verificar("a profundidade sobe com as respostas", Number(profundidade) > 30, profundidade);
      verificar("o botão fica ativo", !(await botaoDescobrir.first().isDisabled()));
      await semOverflow(pagina, "descoberta: contexto preenchido");

      // ═══ 3. FASE B — os resultados, com o trabalho à vista ══════
      await botaoDescobrir.first().click();
      await pagina.locator("#resultado-descoberta").waitFor({ timeout: 20000 });
      await pagina.waitForTimeout(600);

      const faseB = await pagina.evaluate(() => document.body.innerText);
      verificar(
        "diz o que o motor fez, com contagens",
        /combinações consideradas/.test(faseB) && /hipóteses compostas/.test(faseB),
      );
      verificar("separa encaixe de confiança", /Encaixa contigo \d+%/.test(faseB) && /Confiança/.test(faseB));
      verificar("mostra as etapas reais do pipeline", /A compor hipóteses/.test(faseB));

      const cartoes = await pagina.locator("#ferramenta article").count();
      verificar("apresenta hipóteses", cartoes > 0, `${cartoes} cartões`);
      await semErroDeRuntime(pagina, "descoberta: fase B");
      await semOverflow(pagina, "descoberta: fase B");
      await controlosTocaveis(pagina, "descoberta: fase B");

      // ═══ 3b. O motor compõe o que ninguém escreveu ══════════════
      //  A afirmação central: pelo menos um resultado tem de ser uma
      //  composição, e não um dos 24 dossiers curados.
      const titulos = await pagina.locator("#ferramenta article strong").allInnerTexts();
      const curados = await pagina.getByText("Dossier curado").count();
      verificar(
        "há hipóteses compostas que não são dossiers curados",
        titulos.length > curados,
        `${titulos.length} hipóteses, ${curados} curadas`,
      );

      // ═══ 4. O dossier explica-se ════════════════════════════════
      let cartao = pagina.locator("#ferramenta article").first();
      // O primeiro dossier abre já expandido. Clicar às cegas fechava-o —
      // e todas as verificações seguintes falhavam por não haver nada.
      if ((await cartao.getByRole("button", { expanded: true }).count()) === 0) {
        await cartao.locator("button").first().click();
      }
      await pagina.waitForTimeout(500);
      let texto = await cartao.innerText();
      verificar("explica porque apareceu para esta pessoa", /Porque apareceu para ti/.test(texto));
      verificar("mostra capital e prazo em intervalo", /Investimento inicial/.test(texto));
      // ── A regra: nenhum número chega ao ecrã sem proveniência ──────
      //  Esta verificação já foi `/Estimativa/ || /Dado observado/` no
      //  primeiro cartão, e era frágil por uma razão que só se percebeu
      //  quando falhou: uma hipótese sem evidência ligada e com capital
      //  não estimável mostra «não estimável com o que sabemos» e nenhum
      //  dos dois rótulos — o que está CERTO. A verificação dependia de
      //  qual hipótese calhava em primeiro, e ficava vermelha quando o
      //  pack de mercado não respondia.
      //
      //  Passa a verificar o que o produto promete mesmo, em duas metades
      //  que juntas são mais exigentes do que a original: o cartão nunca
      //  mostra um valor sem dizer de onde vem, e a marcação existe de
      //  facto em algum lado dos resultados.
      verificar(
        "o cartão nunca mostra um número sem dizer de onde vem",
        /Dado observado|Estimativa|Cálculo|Hipótese/.test(texto) ||
          /não estimável com o que sabemos/.test(texto),
      );
      const textoDosResultados = await pagina.locator("#ferramenta").innerText();
      verificar(
        "marca o que é estimativa e o que é observação",
        /Dado observado|Estimativa|Cálculo|Hipótese/.test(textoDosResultados),
      );
      verificar("nunca lê ausência de concorrentes como oportunidade", !/pouca oferta/i.test(texto) || /por apurar/i.test(texto));
      verificar("traz plano de validação com critério", /Validar esta oportunidade/.test(texto) && /Feito quando:/.test(texto));

      // «Como chegámos a esta conclusão?»
      await cartao.getByRole("button", { name: /Como chegámos a esta conclusão/ }).click();
      await pagina.waitForTimeout(400);
      texto = await cartao.innerText();
      verificar(
        "abre as dimensões em separado",
        /Compatibilidade contigo/.test(texto) && /Exequibilidade/.test(texto) && /Lacuna de oferta/.test(texto),
      );
      // A força da evidência e a atualidade dos dados SAÍRAM do score e
      // viajam com a confiança. Somadas ao score mediam a quantidade de
      // dados dentro de um número apresentado como juízo sobre o negócio.
      verificar(
        "a força da evidência viaja com a confiança, não com o score",
        /Força da evidência/.test(texto) && !/Força das evidências/.test(texto),
      );
      verificar(
        "a pontuação vai publicada com a incerteza ao lado",
        /Pontuação \d+/.test(texto) &&
          (/entre \d+ e \d+/.test(texto) || /não há intervalo/.test(texto)),
      );
      verificar(
        "diz o que não teve base para ser avaliado",
        /sem base para avaliar/.test(texto),
      );
      verificar("publica o plano de investigação por executar", /por ligar/.test(texto));

      await semViolacoesAxe(pagina, "descoberta: dossier aberto");

      // ═══ 4b. A prova local sobrevive ao recarregamento ══════════
      await cartao.getByRole("button", { name: "Piloto pago", exact: true }).click();
      await cartao.locator('input[type="date"]').fill("2026-08-01");
      await cartao.getByRole("button", { name: /Registar/ }).click();
      await pagina.waitForTimeout(500);
      texto = await cartao.innerText();
      verificar("um piloto pago é registado como prova de mercado", /prova de mercado/.test(texto), texto.slice(0, 160));
      verificar("e a entrevista continua a não promover", /Enquanto não houver prova paga|alguém pagou/.test(texto));

      // ═══ 4c. O que descartámos ══════════════════════════════════
      const descartadas = pagina.getByRole("button", { name: /O que descartámos/ });
      if ((await descartadas.count()) > 0) {
        await descartadas.click();
        await pagina.waitForTimeout(400);
        const corpoDescartes = await pagina.evaluate(() => document.body.innerText);
        verificar(
          "as descartadas dizem o motivo e o que mudaria",
          /Deixaria de ser descartada se:/.test(corpoDescartes) || /Variante do mesmo/.test(corpoDescartes),
        );
      }

      // ═══ 5. A ponte para o preço leva o cenário ════════════════
      const paraPreco = cartao.getByRole("link", { name: /Formar o preço desta hipótese/ });
      const href = await paraPreco.getAttribute("href");
      verificar(
        "o CTA de preço leva o cenário do motor canónico",
        /modo=preco/.test(href ?? "") && /cenario=/.test(href ?? ""),
        href ?? "(sem href)",
      );

      const acoes = await cartao.evaluate((el) => {
        const principais = [...el.querySelectorAll("a")].filter(
          (a) => /rounded-full/.test(a.className) && /bg-brand\b/.test(a.className),
        );
        return principais.length;
      });
      verificar("há uma só ação principal no dossier", acoes === 1, String(acoes));

      // ═══ 5b. Voltar ao contexto não perde as respostas ══════════
      await pagina.getByRole("button", { name: /Ajustar contexto/ }).click();
      await pagina.waitForTimeout(400);
      const devolta = await pagina.evaluate(() => document.body.innerText);
      verificar(
        "voltar ao contexto conserva o que já foi respondido",
        /O teu perfil está a formar-se/.test(devolta) && /2 competências/.test(devolta),
      );
      await pagina.getByRole("button", { name: /Voltar a analisar/ }).first().click();
      await pagina.locator("#resultado-descoberta").waitFor({ timeout: 20000 });

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
      //  A parte personalizada é, por natureza, dinâmica: depende de um
      //  contexto que só existe no browser de quem responde. O que TEM de
      //  existir no HTML é «Explorar mercado» — os dossiers curados, com
      //  problema, cliente, modelo de receita e teste de falsificação —
      //  para quem navega sem JavaScript e para um motor de busca.
      const contextoSemJs = await navegador.newContext({ viewport, javaScriptEnabled: false });
      const semJs = await contextoSemJs.newPage();
      await semJs.goto(`${BASE}/ferramentas/descobrir-negocio`, { waitUntil: "domcontentloaded" });
      const htmlSemJs = await semJs.content();
      const textoSemJs = htmlSemJs
        .replace(/<script[\s\S]*?<\/script>/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&#x27;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ");
      for (const essencial of [
        "Explorar mercado",
        "alojamento turístico",
        "Entrevistar dez operadores",
        "Teste que pode matar a ideia",
        "Formar o preço desta hipótese",
      ]) {
        verificar(`sem JavaScript: «${essencial}» está no HTML`, textoSemJs.includes(essencial));
      }
      verificar(
        "sem JavaScript: os 24 dossiers curados estão no HTML",
        (textoSemJs.match(/Teste que pode matar a ideia|Problema:/g) ?? []).length >= 20,
      );
      verificar(
        "sem JavaScript: não promete análise que não fez",
        !/passaram os critérios/.test(textoSemJs),
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
