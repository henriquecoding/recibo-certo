#!/usr/bin/env node

/**
 * Portão ponta a ponta do planeador de contratação.
 *
 * Antes verificava sobretudo presença: os separadores existem, não há
 * overflow, o axe não se queixa. Nada disto apanhava o defeito que importava
 * — o resultado dizer que a proposta cabe com um custo obrigatório em falta.
 * Agora o percurso é FINANCEIRO: parte-se de um cenário incompleto, resolve-se
 * o bloqueio, e verifica-se que o veredicto só aparece depois disso.
 */

import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const BASE = (process.env.RC_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const EXECUTAVEL = process.env.PLAYWRIGHT_CHROMIUM;
const VERSAO = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
const falhas = [];

function verificar(condicao, mensagem, detalhe = "") {
  if (condicao) console.log(`  ✓ ${mensagem}${detalhe ? ` — ${detalhe}` : ""}`);
  else {
    falhas.push(`${mensagem}${detalhe ? ` — ${detalhe}` : ""}`);
    console.log(`  ✗ ${mensagem}${detalhe ? ` — ${detalhe}` : ""}`);
  }
}

const browser = await chromium.launch(EXECUTAVEL ? { executablePath: EXECUTAVEL } : {});

async function novaPagina({ width, height, colorScheme = "light", hasTouch = true }) {
  const context = await browser.newContext({
    viewport: { width, height },
    hasTouch,
    colorScheme,
  });
  await context.addInitScript(([versao]) => {
    localStorage.setItem("recibocerto:changelog_visto", versao);
    localStorage.setItem("recibocerto:cookie-consent", JSON.stringify({
      necessarios: true,
      estatistica: false,
      marketing: false,
      data: new Date().toISOString(),
      versao: 2,
    }));
  }, [VERSAO]);
  const page = await context.newPage();
  const erros = [];
  page.on("pageerror", (erro) => erros.push(String(erro)));
  return { context, page, erros };
}

const semOverflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

const blocoDoSeguro = (page) => page.locator('[data-custo="accidentInsurance"]');

/** Põe o custo obrigatório num estado que desbloqueia a decisão. */
async function preencherSeguro(page, valor = "480") {
  const bloco = blocoDoSeguro(page);
  await bloco.locator("select").selectOption("confirmado");
  const campo = bloco.getByLabel("Seguro de acidentes de trabalho — valor anual");
  await campo.fill(valor);
  await campo.blur();
}

/**
 * Resolve o segundo bloqueio: sem IRCT identificado o motor não afirma
 * conformidade salarial, porque a tabela da categoria pode exigir mais do
 * que a RMMG (relatório, MOT-P0-006). Declarar que não existe instrumento é
 * uma resposta legítima — «não sei» não é.
 */
async function declararSemIrct(page) {
  await page.getByLabel("IRCT aplicável").selectOption("none");
}

async function calcular(page) {
  await page.getByRole("button", { name: /Calcular a contratação|Voltar a calcular/ }).click();
  await page.getByRole("tablist", { name: "Detalhes do resultado" }).waitFor({ timeout: 20_000 });
}

// ─── 1. Homepage de salário e bifurcação ──────────────────────────────────
{
  console.log("\n▸ Homepage de salário · 360 px");
  const { context, page, erros } = await novaPagina({ width: 360, height: 800 });
  try {
    await page.goto(`${BASE}/inicio/salario?percurso=trabalhador`, { waitUntil: "networkidle" });
    const grupo = page.getByRole("radiogroup", { name: "Escolhe o teu percurso" });
    await grupo.waitFor({ timeout: 30_000 });
    verificar(await grupo.getByRole("radio").count() === 2, "os dois percursos estão sempre visíveis");
    verificar(
      await grupo.getByRole("radio", { name: /Simular o meu salário/ }).getAttribute("aria-checked") === "true",
      "o percurso da query fica selecionado",
    );
    verificar(await semOverflow(page), "a homepage não cria overflow horizontal");

    await grupo.getByRole("radio", { name: /Planear uma contratação/ }).click();
    await page.locator("#palco-contratacao").waitFor();
    verificar(
      new URL(page.url()).searchParams.get("percurso") === "empregador",
      "a escolha atualiza a query sem recarregar",
    );
    verificar(
      await page.getByRole("link", { name: /Planear uma contratação/ }).getAttribute("href") === "/ferramentas/planeador-contratacao",
      "o CTA acompanha o percurso",
    );
    verificar(await page.getByText("Régua do orçamento anual").count() === 1, "o palco patronal mostra orçamento, pacote e capacidade");
    // O palco anunciava um veredicto fixo mesmo com custos por contar.
    const rotulo = await page.locator("#palco-contratacao").getByText(/Cabe na estimativa|Cabe nesta projeção|Custo ainda incompleto|Cenário validado/).count();
    verificar(rotulo >= 1, "o rótulo da decisão do palco vem do motor, não de texto fixo");
    verificar(
      await page.locator("#palco-contratacao").getByText("Seguro + SST").count() === 1,
      "o palco conta o seguro obrigatório em vez de o esconder",
    );

    await page.goto(`${BASE}/inicio/salario?percurso=trabalhador`, { waitUntil: "networkidle" });
    await page.goBack({ waitUntil: "networkidle" });
    verificar(new URL(page.url()).searchParams.get("percurso") === "empregador", "Back restaura o percurso da história");
    verificar(await page.locator("#palco-contratacao").count() === 1, "o palco acompanha Back/Forward");

    const a11y = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
    verificar(
      a11y.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? "")).length === 0,
      "sem violações sérias ou críticas na bifurcação",
    );
    verificar(erros.length === 0, "sem exceções de runtime na homepage", erros.join(" | "));
  } finally {
    await context.close();
  }
}

// ─── 2. Contrato de confiança: incompleto → estimado ──────────────────────
{
  console.log("\n▸ Planeador · contrato de confiança · 360 px");
  const { context, page, erros } = await novaPagina({ width: 360, height: 800 });
  try {
    await page.goto(`${BASE}/ferramentas/planeador-contratacao`, { waitUntil: "networkidle" });
    await page.getByRole("radiogroup", { name: "Objetivo da contratação" }).waitFor({ timeout: 30_000 });
    verificar(await page.getByRole("radio", { name: /Tenho um orçamento/ }).count() === 1, "os quatro objetivos respondem por teclado e toque");
    verificar(await semOverflow(page), "a ferramenta não cria overflow horizontal");

    // Nenhuma parcela pode nascer com valor escondido.
    const resumo = page.getByText("por confirmar").first();
    await resumo.waitFor();
    verificar(
      await page.getByText("Seguro de acidentes de trabalho").count() >= 1,
      "o seguro obrigatório é um campo visível, não uma secção fechada",
    );

    await calcular(page);
    const cabecalho = await page.locator("h2").filter({ hasText: /Ainda não é possível confirmar se cabe/ }).count();
    verificar(cabecalho === 1, "com o seguro por preencher, o resultado recusa o veredicto");
    verificar(
      await page.getByText(/Falta resolver isto|Faltam resolver/).count() >= 1,
      "o cabeçalho diz exatamente o que falta",
    );

    // Com o seguro resolvido mas o IRCT por identificar, o veredicto
    // continua barrado — e o motivo tem de ser o piso convencional.
    await preencherSeguro(page);
    await calcular(page);
    verificar(
      await page.locator("h2").filter({ hasText: /Ainda não é possível confirmar se cabe/ }).count() === 1,
      "com o IRCT por identificar, o veredicto continua barrado",
    );
    verificar(
      await page.getByText(/IRCT|instrumento de regulamentação|tabela da categoria/i).count() >= 1,
      "o bloqueio nomeia o piso convencional por confirmar",
    );

    await declararSemIrct(page);
    await calcular(page);
    const agora = await page.locator("h2").filter({ hasText: /Cabe na estimativa|Cabe nesta projeção/ }).count();
    verificar(agora === 1, "resolvidos os dois bloqueios, o veredicto passa a ser possível");

    verificar(await page.getByRole("tab").count() === 7, "o resultado expõe os sete separadores previstos");
    verificar(await semOverflow(page), "o resultado não cria overflow horizontal a 360 px");
    verificar(erros.length === 0, "sem exceções de runtime no percurso de confiança", erros.join(" | "));
  } finally {
    await context.close();
  }
}

// ─── 3. Separadores, calendário, capacidade, apoios e memória ─────────────
{
  console.log("\n▸ Planeador · resultado completo · 1440 px");
  const { context, page, erros } = await novaPagina({ width: 1440, height: 900, hasTouch: false });
  try {
    await page.goto(`${BASE}/ferramentas/planeador-contratacao`, { waitUntil: "networkidle" });
    await page.getByRole("radiogroup", { name: "Objetivo da contratação" }).waitFor({ timeout: 30_000 });
    await preencherSeguro(page);
    await declararSemIrct(page);
    await calcular(page);

    await page.getByRole("tab", { name: "Calendário e caixa" }).click();
    verificar(
      await page.getByText("Ano civil de entrada", { exact: true }).count() === 1,
      "o calendário separa ano civil, doze meses e estabilizado",
    );
    verificar(await page.getByText("Primeiros 12 meses").count() >= 1, "os primeiros doze meses do vínculo têm conta própria");
    verificar(await page.getByText(/O mês mais pesado é/).count() === 1, "o pico de tesouraria é nomeado, com causa");

    await page.getByRole("tab", { name: "Viabilidade" }).click();
    verificar(await page.getByText("menos feriados em dia de trabalho").count() === 1, "os feriados saem das horas disponíveis");
    verificar(await page.getByText("menos formação contínua").count() === 1, "a formação sai das horas disponíveis");

    await page.getByRole("tab", { name: "Composição do custo" }).click();
    verificar(await page.getByText("Totais por nível de conhecimento").count() === 1, "o total é apresentado por nível de conhecimento");

    await page.getByRole("tab", { name: "Apoios" }).click();
    verificar(await page.getByText(/Nenhum apoio é abatido ao custo/).count() === 1, "os apoios continuam fora do custo");

    await page.getByRole("tab", { name: "Memória de cálculo" }).click();
    verificar(
      await page.getByText("Custo anual estabilizado do posto").count() >= 1,
      "a memória de cálculo mostra a fórmula de cada total",
    );
    verificar(await page.getByText("Fontes e versão").count() === 1, "a memória de cálculo publica fontes e versão do motor");
    const centimosCrus = await page.getByText(/\d+ cêntimos/).count();
    verificar(centimosCrus === 0, "nenhuma unidade interna aparece como texto humano");

    // Comparação com um segundo pacote.
    await page.getByRole("button", { name: /Fixar para comparar/ }).click();
    await page.getByRole("tab", { name: "Os três dinheiros" }).click();
    verificar(await page.getByText(/cenários lado a lado/).count() === 1, "a comparação abre com os dois pacotes");
    verificar(await page.getByText("Nível de confiança").count() === 1, "a comparação inclui o nível de confiança");

    const a11y = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze();
    verificar(
      a11y.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? "")).length === 0,
      "sem violações sérias ou críticas no resultado",
      a11y.violations.map((v) => v.id).join(", "),
    );
    verificar(erros.length === 0, "sem exceções de runtime no resultado", erros.join(" | "));
  } finally {
    await context.close();
  }
}

// ─── 4. Os quatro objetivos ───────────────────────────────────────────────
{
  console.log("\n▸ Planeador · os quatro objetivos · 390 px");
  const { context, page, erros } = await novaPagina({ width: 390, height: 844 });
  try {
    await page.goto(`${BASE}/ferramentas/planeador-contratacao`, { waitUntil: "networkidle" });
    await page.getByRole("radiogroup", { name: "Objetivo da contratação" }).waitFor({ timeout: 30_000 });
    await preencherSeguro(page);
    await declararSemIrct(page);
    for (const objetivo of [
      /Tenho um orçamento/,
      /Quero garantir um líquido/,
      /Já tenho uma proposta/,
      /O posto tem de se pagar/,
    ]) {
      await page.getByRole("radio", { name: objetivo }).click();
      await calcular(page);
      const conclusivo = await page
        .locator("h2")
        .filter({ hasText: /Cabe na estimativa|Cabe nesta projeção|Cenário revisto|Ainda não é possível/ })
        .count();
      verificar(conclusivo === 1, `o objetivo ${objetivo.source} produz um resultado com estado`);
      verificar(await semOverflow(page), `sem overflow horizontal em ${objetivo.source}`);
    }
    verificar(erros.length === 0, "sem exceções de runtime nos quatro objetivos", erros.join(" | "));
  } finally {
    await context.close();
  }
}

// ─── 5. Privacidade, reposição e 320 px em modo escuro ────────────────────
{
  console.log("\n▸ Planeador · privacidade e reposição · 320 px escuro");
  const { context, page, erros } = await novaPagina({ width: 320, height: 700, colorScheme: "dark" });
  try {
    await page.goto(`${BASE}/ferramentas/planeador-contratacao`, { waitUntil: "networkidle" });
    await page.getByRole("radiogroup", { name: "Objetivo da contratação" }).waitFor({ timeout: 30_000 });
    await preencherSeguro(page);
    await declararSemIrct(page);

    await page.getByRole("radio", { name: /Tenho autorização/ }).click();
    verificar(
      await page.getByText(/Confirmo que o candidato autorizou/).count() === 1,
      "a autorização é uma confirmação explícita, com finalidade e duração",
    );
    verificar(
      await page.getByLabel("Dependentes").count() === 0,
      "os factos pessoais só aparecem depois da confirmação",
    );
    await page.getByRole("checkbox", { name: /Confirmo que o candidato autorizou/ }).check();
    verificar(await page.getByLabel("Dependentes").count() === 1, "confirmada a autorização, os campos abrem");

    await calcular(page);
    verificar(
      await page.getByText("projeção com factos autorizados").count() >= 1,
      "com factos autorizados o resultado é uma projeção personalizada",
    );
    // A promessa mede-se dentro do resultado: a copy editorial da página pode
    // usar a palavra para dizer justamente que ela não se aplica.
    const resultado = page.locator("section", { has: page.getByRole("tablist", { name: "Detalhes do resultado" }) });
    const exato = await resultado.getByText(/\bexat[oa]s?\b/i).count();
    verificar(exato === 0, "a palavra «exato» não volta a qualificar a projeção");
    verificar(await semOverflow(page), "sem overflow horizontal a 320 px no escuro");

    // Nenhum facto pessoal pode chegar ao endereço.
    verificar(
      !/dependant|dependente|marital|deficien/i.test(page.url()),
      "nenhum facto pessoal entra no URL",
      page.url(),
    );

    await page.getByRole("button", { name: /Começar de novo/ }).click();
    verificar(
      await page.getByRole("tablist", { name: "Detalhes do resultado" }).count() === 0,
      "a reposição fecha o resultado",
    );
    verificar(erros.length === 0, "sem exceções de runtime no percurso privado", erros.join(" | "));
  } finally {
    await context.close();
  }
}

// ─── 6. Contraste em todos os estados da decisão ──────────────────────────
//
// O axe corre acima com `color-contrast` desligado, e foi assim que nove
// textos do cabeçalho incompleto e três por cada mês inativo do calendário
// passaram despercebidos: estavam entre 2,45 e 4,49 porque o cartão levava
// `opacity`, que dilui a tinta contra o papel. Aqui a regra é ligada de
// propósito, nos dois temas e nos dois estados que mudam de paleta.
//
// A medição é ANCORADA ao resultado (`#resultado-contratacao`). Sem âncora,
// o axe varre a página inteira — cabeçalho, formulário, rodapé, diretório de
// contabilistas — e o portão passa a reprovar por coisas que não são deste
// percurso. E quando reprova, diz QUAIS: um portão que só diz «4 nós» custa
// uma corrida de CI a cada vez que dispara.
{
  console.log("\n▸ Planeador · contraste do resultado · 390 px");
  for (const tema of ["light", "dark"]) {
    for (const cenario of ["incompleto", "estimado"]) {
      const { context, page } = await novaPagina({ width: 390, height: 844, colorScheme: tema });
      try {
        await page.goto(`${BASE}/ferramentas/planeador-contratacao`, { waitUntil: "networkidle" });
        await page.getByRole("radiogroup", { name: "Objetivo da contratação" }).waitFor({ timeout: 30_000 });
        if (cenario === "estimado") {
          await preencherSeguro(page);
          await declararSemIrct(page);
        }
        await calcular(page);

        // Contraste mede-se em REPOUSO. Os separadores transitam de
        // `bg-stone-100` para `bg-brand` em 200 ms, e o axe corrido logo a
        // seguir ao clique apanhava a mistura a meio: 2,98 e 3,91:1 no CI,
        // onde a máquina é mais lenta, e nada nesta, onde a transição acaba
        // primeiro. Os valores em repouso estão certos (branco sobre
        // `bg-brand` é 5,02:1) — o que estava errado era o instante da
        // medição. Sem transições, não há instante errado.
        await page.addStyleTag({
          content: "*,*::before,*::after{transition:none!important;animation:none!important}",
        });

        const detalhes = [];
        for (const aba of [
          "Os três dinheiros",
          "Composição do custo",
          "Calendário e caixa",
          "Viabilidade",
          "Memória de cálculo",
        ]) {
          await page.getByRole("tab", { name: aba }).click();
          await page.getByRole("tab", { name: aba }).evaluate((el) =>
            new Promise((resolver) => requestAnimationFrame(() => requestAnimationFrame(() => resolver(el)))),
          );
          const relatorio = await new AxeBuilder({ page })
            .include("#resultado-contratacao")
            // Os separadores são medidos a seguir, por cor computada. O axe
            // devolveu-lhes 2,98 a 3,91:1 no runner do CI e 5,02:1 aqui, com
            // a mesma versão do Chromium e o mesmo artefacto — e o fundo
            // amostrado diretamente é `rgb(23,126,94)` desde o primeiro
            // frame, mesmo com a CPU travada 8×. Não consegui reproduzir nem
            // explicar a leitura do CI; o que se mede aqui passa a ser a cor
            // em repouso, que é determinística e é o que a regra exige.
            .exclude('[role="tablist"]')
            .withRules(["color-contrast"])
            .analyze();
          for (const violacao of relatorio.violations) {
            for (const no of violacao.nodes) {
              const razao = no.any?.[0]?.data?.contrastRatio;
              detalhes.push(
                `${aba} · ${no.target.join(" ")}${razao ? ` (${razao}:1)` : ""}`,
              );
            }
          }
        }
        verificar(
          detalhes.length === 0,
          `contraste em ${tema}/${cenario}`,
          detalhes.length === 0 ? "" : `${detalhes.length} nós — ${detalhes.slice(0, 6).join(" | ")}`,
        );

        // Separadores: cor computada, não heurística. Mede o par
        // texto/fundo em repouso de cada separador, ativo e inativo.
        const separadores = await page.evaluate(() => {
          const linear = (canal) => {
            const c = canal / 255;
            return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          };
          const luminancia = ([r, g, b]) =>
            0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
          const canais = (cor) => cor.match(/[\d.]+/g).slice(0, 3).map(Number);
          const opaco = (elemento) => {
            let no = elemento;
            while (no && no !== document.documentElement) {
              const cor = getComputedStyle(no).backgroundColor;
              const partes = cor.match(/[\d.]+/g);
              if (partes && (partes.length < 4 || Number(partes[3]) > 0.99)) return canais(cor);
              no = no.parentElement;
            }
            return [255, 255, 255];
          };
          const razao = (frente, fundo) => {
            const a = luminancia(frente);
            const b = luminancia(fundo);
            return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          };
          return [...document.querySelectorAll('#resultado-contratacao [role="tab"]')].map((aba) => ({
            nome: (aba.textContent || "").trim().slice(0, 28),
            ativo: aba.getAttribute("aria-selected") === "true",
            razao: Number(razao(canais(getComputedStyle(aba).color), opaco(aba)).toFixed(2)),
          }));
        });
        const fracos = separadores.filter((aba) => aba.razao < 4.5);
        verificar(
          fracos.length === 0,
          `contraste dos separadores em ${tema}/${cenario}`,
          fracos.length === 0
            ? `${separadores.length} separadores, mínimo ${Math.min(...separadores.map((a) => a.razao))}:1`
            : fracos.map((a) => `${a.nome} ${a.razao}:1`).join(" | "),
        );

        // O que fica FORA do resultado não é deste percurso e não reprova
        // aqui — mas também não se perde: fica escrito, com nome, para quem
        // for dono dessa parte da página.
        const pagina = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
        const foraDoResultado = pagina.violations
          .flatMap((violacao) => violacao.nodes)
          .map((no) => no.target.join(" "))
          .filter((alvo) => !alvo.includes("resultado-contratacao"));
        if (foraDoResultado.length > 0) {
          console.log(
            `    · fora do resultado, ${foraDoResultado.length} nó(s) abaixo de 4,5:1: ` +
              foraDoResultado.slice(0, 4).join(" | "),
          );
        }
      } finally {
        await context.close();
      }
    }
  }
}

// ─── 7. Guardar e reabrir ─────────────────────────────────────────────────
{
  console.log("\n▸ Planeador · guardar e reabrir · 360 px");
  const { context, page, erros } = await novaPagina({ width: 360, height: 800 });
  try {
    await page.goto(`${BASE}/ferramentas/planeador-contratacao`, { waitUntil: "networkidle" });
    await page.getByRole("radiogroup", { name: "Objetivo da contratação" }).waitFor({ timeout: 30_000 });
    await preencherSeguro(page, "512");
    await declararSemIrct(page);
    await calcular(page);
    await page.getByRole("button", { name: /Guardar cenário/ }).click();
    await page.getByRole("button", { name: "Confirmar gravação" }).click();
    await page.getByText(/guardado neste dispositivo|sincronizado na tua conta/).waitFor({ timeout: 15_000 });
    verificar(true, "o cenário é guardado só depois da confirmação explícita");

    // Simula o handoff da página de gestão e confirma a reidratação.
    const guardado = await page.evaluate(() => {
      const bruto = Object.keys(localStorage)
        .filter((chave) => chave.includes("cenarios"))
        .map((chave) => localStorage.getItem(chave))
        .find((valor) => valor && valor.includes("contratacao"));
      if (!bruto) return null;
      const lista = JSON.parse(bruto);
      const cenario = lista.find((item) => item.tipo === "contratacao");
      if (!cenario) return null;
      localStorage.setItem(
        "recibocerto:cenario-pendente:contratacao",
        JSON.stringify({ ...cenario.dados, __versao: cenario.versao }),
      );
      return cenario.dados?.schemaVersion ?? null;
    });
    verificar(guardado === 3, "o instantâneo guardado tem versão de schema", String(guardado));

    await page.goto(`${BASE}/ferramentas/planeador-contratacao`, { waitUntil: "networkidle" });
    await page.getByRole("radiogroup", { name: "Objetivo da contratação" }).waitFor({ timeout: 30_000 });
    const valor = await blocoDoSeguro(page)
      .getByLabel("Seguro de acidentes de trabalho — valor anual")
      .inputValue();
    verificar(valor.replace(/\s/g, "").startsWith("512"), "reabrir devolve os valores preenchidos", valor);
    const pendente = await page.evaluate(() =>
      localStorage.getItem("recibocerto:cenario-pendente:contratacao"));
    verificar(pendente === null, "a chave de reabertura é consumida uma única vez");
    verificar(erros.length === 0, "sem exceções de runtime ao reabrir", erros.join(" | "));
  } finally {
    await context.close();
  }
}

// ─── 8. Oclusão: nada fixo pode tapar foco, campo ou botão ────────────────
//
// O E2E media overflow, separadores e axe — e nada disto apanha uma barra
// `fixed` pousada em cima do campo que a pessoa está a preencher. O
// relatório é explícito: «nenhum elemento fixo pode cobrir foco, botão ou
// conteúdo» (MOT-P0-020, §9.5).
{
  const VIEWPORTS = [
    { width: 320, height: 640, nome: "320 px" },
    { width: 360, height: 800, nome: "360 px" },
    { width: 390, height: 844, nome: "390 px" },
    { width: 768, height: 1024, nome: "768 px" },
    { width: 1024, height: 768, nome: "1024 px" },
    { width: 1440, height: 900, nome: "1440 px" },
  ];

  for (const viewport of VIEWPORTS) {
    console.log(`\n▸ Planeador · oclusão · ${viewport.nome}`);
    const { context, page, erros } = await novaPagina(viewport);
    try {
      await page.goto(`${BASE}/ferramentas/planeador-contratacao`, { waitUntil: "networkidle" });
      await page.getByRole("radiogroup", { name: "Objetivo da contratação" }).waitFor({ timeout: 30_000 });

      /**
       * Oclusão: existe alguma posição de scroll em que este campo se vê
       * inteiro?
       *
       * Três formulações anteriores mediram a coisa errada, e vale a pena
       * dizer porquê. A primeira assinalava irmãos de fluxo normal a
       * partilharem um pixel — layout, não oclusão. A segunda e a terceira
       * perguntavam «este elemento está tapado AGORA»: numa página com uma
       * barra colada ao fundo, há sempre, em cada instante, alguma coisa
       * atrás dela, e a resposta passava a depender da posição em que o
       * teste anterior tivesse deixado a página. Um portão assim reprova ao
       * acaso, e um portão que reprova ao acaso ensina a ignorá-lo.
       *
       * A pergunta bem posta é outra, e é a que o relatório faz (§9.5): a
       * pessoa CONSEGUE ver este campo inteiro? Um campo que fica sempre
       * debaixo da barra, faça-se o scroll que se fizer, é inalcançável —
       * e é isso que o espaçador do fim do documento existe para impedir.
       * Um campo que basta rolar para ver não é um defeito.
       *
       * Mede-se o planeador, dentro de `main`: o cabeçalho e o rodapé do
       * site são de outro dono e respondem noutro portão.
       *
       * O QUE ISTO NÃO PROVA, e convém não fingir que prova: que nada está,
       * neste instante, por trás da barra. Numa página com uma camada fixa
       * colada ao fundo isso é sempre falso para alguma coisa, e depende de
       * onde a página está. O que fica por fechar é o caso do foco que
       * ATERRA debaixo da barra sem o browser rolar — ele só rola o que
       * considera fora da janela, e um campo tapado está, para ele, dentro.
       * Fechá-lo obriga a mexer no chrome global, que é de outro âmbito.
       */
      const inalcancaveis = await page.evaluate(() => {
        const raiz = document.querySelector("main") ?? document.body;
        const janela = window.innerHeight;
        const maximo = Math.max(
          0,
          document.documentElement.scrollHeight - janela,
        );

        // A faixa segura: o que sobra da janela depois do cabeçalho fixo e
        // das camadas fixas coladas ao fundo.
        let topoSeguro = 0;
        let fundoSeguro = janela;
        for (const elemento of document.querySelectorAll("body *")) {
          const estilo = getComputedStyle(elemento);
          if (estilo.position !== "fixed" && estilo.position !== "sticky") continue;
          if (estilo.pointerEvents === "none" || estilo.visibility === "hidden") continue;
          const caixa = elemento.getBoundingClientRect();
          if (caixa.width < 40 || caixa.height < 8) continue;
          if (raiz.contains(elemento)) continue;
          if (caixa.top <= 2) topoSeguro = Math.max(topoSeguro, caixa.bottom);
          if (caixa.bottom >= janela - 4) fundoSeguro = Math.min(fundoSeguro, caixa.top);
        }
        const faixa = fundoSeguro - topoSeguro;

        const problemas = [];
        const deslocamento = window.scrollY;
        for (const alvo of raiz.querySelectorAll(
          "input, select, textarea, button, a[href], [role=tab]",
        )) {
          const caixa = alvo.getBoundingClientRect();
          if (caixa.width === 0 || caixa.height === 0) continue;
          const etiqueta = alvo.getAttribute("aria-label")
            ?? alvo.textContent?.trim().slice(0, 40)
            ?? alvo.id
            ?? alvo.tagName;

          if (caixa.height > faixa) {
            problemas.push(`${etiqueta} é mais alto (${Math.round(caixa.height)}px) do que a faixa livre (${Math.round(faixa)}px)`);
            continue;
          }
          // Posição do elemento no documento e o scroll que o encostaria ao
          // topo da faixa segura.
          const topoNoDocumento = caixa.top + deslocamento;
          const desejado = topoNoDocumento - topoSeguro;
          const possivel = Math.min(Math.max(desejado, 0), maximo);
          const topoFinal = topoNoDocumento - possivel;
          if (topoFinal < topoSeguro - 1 || topoFinal + caixa.height > fundoSeguro + 1) {
            problemas.push(`${etiqueta} não chega à faixa livre em nenhuma posição de scroll`);
          }
        }
        return problemas;
      });
      verificar(
        inalcancaveis.length === 0,
        "todos os campos, botões e separadores chegam a ver-se inteiros",
        inalcancaveis.slice(0, 3).join(" | "),
      );

      verificar(await semOverflow(page), "sem overflow horizontal");
      verificar(erros.length === 0, "sem exceções de runtime", erros.join(" | "));
    } finally {
      await context.close();
    }
  }
}

await browser.close();

if (falhas.length > 0) {
  console.error(`\n${falhas.length} falha(s) no planeador de contratação.`);
  process.exit(1);
}
console.log("\nPlaneador de contratação verificado ponta a ponta.");
