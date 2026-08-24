#!/usr/bin/env node
/**
 * VERIFICAÇÃO DO SIMULADOR DE SALÁRIO LÍQUIDO — cada controlo, num browser.
 * ----------------------------------------------------------------------
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PORQUE ISTO NÃO CABE NO VITEST                                       │
 * │                                                                     │
 * │ `simulador-vencimento-auditoria.test.ts` prova que o MOTOR responde  │
 * │ a cada entrada: uma região diferente dá outra retenção, um prémio    │
 * │ regular entra na base da Segurança Social, a opção do Art. 98.º      │
 * │ substitui só a taxa marginal.                                        │
 * │                                                                     │
 * │ O que ele não vê é se o BOTÃO chega ao motor. Um controlo pode estar │
 * │ desenhado, ter `aria-pressed`, mudar de cor ao ser carregado — e     │
 * │ nunca tocar no cálculo, porque a variável de estado não entrou nas   │
 * │ dependências do `useMemo`. Do lado do utilizador isso é um botão que │
 * │ não faz nada, e nenhum teste de unidade o apanha.                     │
 * │                                                                     │
 * │ Daí a regra deste ficheiro: cada verificação carrega no controlo e   │
 * │ compara o LÍQUIDO antes e depois. Não se verifica que o botão        │
 * │ existe: verifica-se que ele muda a resposta.                         │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Uso:
 *   npm run build && npm run start        (noutro terminal)
 *   npm run vencimento:e2e
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

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.RC_BASE_URL ?? "http://localhost:3000";
const ROTA = `${BASE}/ferramentas/recibo-vencimento`;

const VERSAO = readFileSync(join(RAIZ, "src/lib/version.ts"), "utf8").match(
  /APP_VERSION\s*=\s*"([^"]+)"/,
)?.[1];

const falhas = [];
const verificar = (nome, condicao, detalhe) => {
  const linha = `${nome}${detalhe ? ` — ${detalhe}` : ""}`;
  if (condicao) console.log(`  ✓ ${linha}`);
  else {
    falhas.push(linha);
    console.log(`  ✗ ${linha}`);
  }
};

/**
 * O popup de Novidades e o banner de cookies cobrem a página com um overlay.
 * Semeá-los é o que o produto faz quando a pessoa já respondeu — não é
 * contornar nada, é começar o teste no estado de quem já usou o site.
 */
const semear = `
  localStorage.setItem("recibocerto:changelog_visto", ${JSON.stringify(VERSAO)});
  localStorage.setItem("recibocerto:cookie-consent", ${JSON.stringify(
    JSON.stringify({ necessarios: true, estatistica: false, marketing: false, data: new Date().toISOString(), versao: 1 }),
  )});
`;

const navegador = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {}),
});

async function abrir(largura = 1400, altura = 1100) {
  const ctx = await navegador.newContext({ viewport: { width: largura, height: altura } });
  await ctx.addInitScript(semear);
  const p = await ctx.newPage();
  const erros = [];
  p.on("pageerror", (e) => erros.push(String(e)));
  await p.goto(ROTA, { waitUntil: "networkidle" });
  await p.getByRole("button", { name: "Rejeitar cookies" }).click({ timeout: 5000 }).catch(() => {});
  await p.getByText("Contexto do recibo").waitFor({ timeout: 30000 });
  return { ctx, p, erros };
}

try {
  const { ctx, p, erros } = await abrir();
  const liquido = () => p.locator("aside p.font-display").first().innerText();
  const painel = () => p.locator("aside").innerText();

  /** Carrega no controlo e exige que o líquido mude. */
  const mexe = async (nome, accao) => {
    const antes = await liquido();
    await accao();
    await p.waitForTimeout(350);
    const depois = await liquido();
    verificar(nome, antes !== depois, `${antes} → ${depois}`);
    return depois;
  };

  // ═══ 1. Passo 01 — contexto do recibo ══════════════════════════════════
  console.log("\n▸ Passo 01 · contexto do recibo");
  await mexe("salário bruto", () => p.locator("#gross-salary").fill("2000"));

  {
    // O InfoTip do mês afirma que ele não altera o cálculo. Verifica-se a
    // afirmação: se um dia alterar, a promessa no ecrã passa a ser falsa.
    const antes = await liquido();
    await p.locator("select").first().selectOption("11");
    await p.waitForTimeout(350);
    const dezembro = await liquido();
    await p.locator("select").first().selectOption("0");
    await p.waitForTimeout(350);
    verificar("o mês é neutro no cálculo, como o InfoTip afirma", antes === dezembro && antes === (await liquido()));
  }

  await mexe("horas por semana valorizam a hora extra", async () => {
    await p.getByRole("button", { name: "Adicionar rubrica" }).click();
    await p.getByRole("button", { name: /Hora extra · 1\.ª em dia útil/ }).click();
    await p.locator("article", { hasText: "Hora extra · 1.ª em dia útil" })
      .locator('input[inputmode="decimal"]').first().fill("10");
    await p.waitForTimeout(300);
    await p.locator("#weekly-hours").fill("20");
  });
  await p.locator("#weekly-hours").fill("40");
  await p.waitForTimeout(300);

  await mexe("situação familiar «casado, único titular»", () => p.getByRole("button", { name: "Casado · 1 titular" }).click());
  await mexe("situação familiar «não casado»", () => p.getByRole("button", { name: "Não casado", exact: true }).click());
  {
    // Sem dependentes, «não casado» e «casado dois titulares» partilham a
    // tabela por lei: só a parcela POR DEPENDENTE os separa.
    await p.getByLabel("Mais dependentes", { exact: true }).click();
    await p.waitForTimeout(350);
    const naoCasado = await liquido();
    await p.getByRole("button", { name: "Casado · 2 titulares" }).click();
    await p.waitForTimeout(350);
    const casadoDois = await liquido();
    verificar("situação familiar «casado, dois titulares» (com dependentes)", naoCasado !== casadoDois, `${naoCasado} → ${casadoDois}`);
    await p.getByRole("button", { name: "Não casado", exact: true }).click();
    await p.getByLabel("Menos dependentes", { exact: true }).click();
    await p.waitForTimeout(350);
  }

  await mexe("contador de dependentes «+»", () => p.getByLabel("Mais dependentes", { exact: true }).click());
  await mexe("contador de dependentes «−»", () => p.getByLabel("Menos dependentes", { exact: true }).click());

  await p.getByLabel("Mais dependentes", { exact: true }).click();
  await p.getByLabel("Mais dependentes", { exact: true }).click();
  await p.waitForTimeout(300);
  await mexe("dependentes com incapacidade ≥ 60%", () => p.getByLabel("Mais dependentes com incapacidade").click());
  await mexe("fator comunicado «2×»", () => p.getByRole("button", { name: "2×" }).click());
  await mexe("fator comunicado «3×»", () => p.getByRole("button", { name: "3×" }).click());

  // Repor: com fator 3× a retenção fica a zero, e nada que REDUZA retenção
  // pode então mostrar efeito. Testar sobre zero não prova nada.
  await p.getByRole("button", { name: "1×" }).click();
  await p.getByLabel("Menos dependentes com incapacidade").click();
  await p.getByLabel("Menos dependentes", { exact: true }).click();
  await p.getByLabel("Menos dependentes", { exact: true }).click();
  await p.waitForTimeout(400);

  await mexe("região «Madeira»", () => p.getByRole("button", { name: "Madeira" }).click());
  await mexe("região «Açores»", () => p.getByRole("button", { name: "Açores" }).click());
  await mexe("região «Continente»", () => p.getByRole("button", { name: "Continente" }).click());
  await mexe("titular com incapacidade ≥ 60%", () => p.locator("label", { hasText: "Incapacidade ≥ 60%" }).last().locator('input[type="checkbox"]').check());
  await p.locator("label", { hasText: "Incapacidade ≥ 60%" }).last().locator('input[type="checkbox"]').uncheck();
  await p.waitForTimeout(300);
  await mexe("duodécimos", () => p.locator("label", { hasText: "Recebo em duodécimos" }).locator('input[type="checkbox"]').check());
  await mexe("IRS Jovem", () => p.locator("label", { hasText: "Pedi à entidade empregadora para aplicar IRS Jovem" }).locator('input[type="checkbox"]').check());
  await mexe("IRS Jovem · 5.º ano", () => p.getByRole("button", { name: "5.º" }).click());
  await mexe("IRS Jovem · 9.º ano", () => p.getByRole("button", { name: "9.º" }).click());
  await p.locator("label", { hasText: "Pedi à entidade empregadora para aplicar IRS Jovem" }).locator('input[type="checkbox"]').uncheck();
  await p.locator("label", { hasText: "Recebo em duodécimos" }).locator('input[type="checkbox"]').uncheck();
  await p.waitForTimeout(300);

  // ═══ 2. Taxa de retenção superior por opção (Art. 98.º, n.º 6 CIRS) ════
  console.log("\n▸ Opção por taxa de retenção superior (Art. 98.º, n.º 6 CIRS)");
  const caixaOpcao = p.locator("label", { hasText: "Pedi retenção a uma taxa superior" }).locator('input[type="checkbox"]');
  const semOpcao = await liquido();
  await mexe("ativar a opção aumenta a retenção", () => caixaOpcao.check());
  verificar("o passo da taxa aparece", (await p.locator("#optional-rate").count()) === 1);
  const taxaBase = Number(await p.locator("#optional-rate").inputValue());
  await mexe("subir um ponto percentual retém mais", () => p.getByLabel("Mais um ponto percentual").click());
  verificar("a taxa sobe de ponto em ponto (taxa «inteira»)", Number(await p.locator("#optional-rate").inputValue()) === taxaBase + 1);
  await caixaOpcao.uncheck();
  await p.waitForTimeout(350);
  verificar("desligar a opção repõe a retenção da tabela", (await liquido()) === semOpcao);

  // ═══ 3. Regime contributivo da entidade ════════════════════════════════
  console.log("\n▸ Regime contributivo da entidade");
  await p.getByRole("button", { name: "IPSS / sem fins lucrativos" }).click();
  await p.getByRole("tab", { name: "Empresa" }).click();
  await p.waitForTimeout(350);
  const empresaIpss = await painel();
  verificar("o separador Empresa identifica o regime IPSS", empresaIpss.includes("IPSS"));
  verificar("e aplica a taxa reduzida de 22,3%", /22,3\s?%/.test(empresaIpss));
  await p.getByRole("button", { name: "Regime geral" }).click();
  await p.waitForTimeout(350);
  verificar("o regime geral aplica os 23,75% exatos", /23,75\s?%/.test(await painel()));
  await p.getByRole("tab", { name: "Mês" }).click();

  // ═══ 4. Subsídio de refeição ═══════════════════════════════════════════
  console.log("\n▸ Subsídio de refeição");
  await p.locator("#meal-daily").fill("10,46");
  await p.waitForTimeout(300);
  await mexe("dinheiro vs cartão muda o limite isento", () => p.getByRole("button", { name: "Dinheiro" }).click());
  await p.getByRole("button", { name: "Cartão" }).click();
  await p.waitForTimeout(300);
  await mexe("valor por dia", () => p.locator("#meal-daily").fill("6,15"));
  await mexe("dias pagos", () => p.locator("#meal-days").fill("10"));
  await p.locator("#meal-days").fill("22");
  await p.waitForTimeout(300);
  await mexe("desligar o subsídio", () => p.locator("label", { hasText: "Incluir" }).locator('input[type="checkbox"]').uncheck());
  await p.locator("label", { hasText: "Incluir" }).locator('input[type="checkbox"]').check();
  await p.waitForTimeout(300);

  // ═══ 5. Modo «quero receber» (cálculo inverso) ═════════════════════════
  console.log("\n▸ Modo «quero receber»");
  await p.getByRole("button", { name: "Quero receber" }).click();
  await p.waitForTimeout(400);
  verificar("mostra o bruto necessário", (await painel()).includes("Bruto necessário"));
  await p.locator("#target-net").fill("1800");
  await p.waitForTimeout(600);
  {
    const encontrado = Number(((await painel()).match(/1\.?8\d\d,\d\d/) ?? ["0"])[0].replace(".", "").replace(",", "."));
    verificar("o alvo líquido é atingido ao cêntimo", encontrado >= 1800 && encontrado < 1800.5, `${encontrado} €`);
  }
  await p.getByRole("button", { name: "Bruto → líquido" }).click();
  await p.waitForTimeout(300);

  // ═══ 6. Construtor de rubricas ═════════════════════════════════════════
  console.log("\n▸ Construtor de rubricas");
  await p.getByRole("button", { name: "Adicionar rubrica" }).click();
  await p.waitForTimeout(250);
  for (const filtro of ["Fixos", "Variáveis", "Tempo de trabalho", "Subsídios", "Faltas", "Deslocações"]) {
    await p.getByRole("button", { name: filtro, exact: true }).click();
    await p.waitForTimeout(120);
    const visiveis = await p.locator("div.grid.max-h-\\[min\\(26rem\\,60dvh\\)\\] > button").count();
    verificar(`filtro «${filtro}»`, visiveis > 0, `${visiveis} rubricas`);
  }
  await p.getByRole("button", { name: "Todas", exact: true }).click();
  await mexe("adicionar «Comissões»", async () => {
    await p.getByRole("button", { name: /^Comissões/ }).click();
    await p.locator("article", { hasText: "Comissões" }).locator('input[inputmode="decimal"]').first().fill("500");
  });
  await mexe("remover «Comissões»", () => p.getByLabel("Remover Comissões").click());

  await p.getByRole("button", { name: "Adicionar rubrica" }).click();
  await p.getByRole("button", { name: /^Prémio de desempenho/ }).click();
  await p.locator("article", { hasText: "Prémio de desempenho" }).locator('input[inputmode="decimal"]').first().fill("400");
  await p.waitForTimeout(400);
  {
    await p.getByRole("button", { name: "Regular", exact: true }).click();
    await p.waitForTimeout(350);
    const regular = await liquido();
    await p.getByRole("button", { name: "Não regular" }).click();
    await p.waitForTimeout(350);
    verificar("«regular» e «não regular» mudam a base da Segurança Social", regular !== (await liquido()), `${regular} → ${await liquido()}`);
  }
  await p.getByLabel("Remover Prémio de desempenho").click();
  await p.waitForTimeout(300);

  await p.getByRole("button", { name: "Adicionar rubrica" }).click();
  await p.getByRole("button", { name: /^Ajuda de custo · Portugal/ }).click();
  const ajuda = p.locator("article", { hasText: "Ajuda de custo · Portugal" });
  await ajuda.locator('input[inputmode="numeric"]').first().fill("5");
  await ajuda.locator('input[inputmode="decimal"]').first().fill("100");
  await p.waitForTimeout(400);
  await mexe("escalão «Administração» isenta mais", () => ajuda.getByRole("button", { name: /Administração/ }).click());
  await p.getByLabel("Remover Ajuda de custo · Portugal").click();
  await p.waitForTimeout(300);

  // Quilómetros: o limite é POR QUILÓMETRO e o editor tem de o dizer.
  await p.getByRole("button", { name: "Adicionar rubrica" }).click();
  await p.getByRole("button", { name: /^Quilómetros em automóvel próprio/ }).click();
  const km = p.locator("article", { hasText: "Quilómetros em automóvel próprio" });
  await mexe("quilómetros acima do limite entram nas bases", async () => {
    await km.locator('input[inputmode="decimal"]').first().fill("500");
    await km.locator('input[inputmode="decimal"]').nth(1).fill("0,60");
  });
  verificar("o editor de quilómetros conta ao km, não ao dia", (await km.innerText()).includes("/km"));
  verificar("e não oferece escalões, que aqui não existem", !(await km.innerText()).includes("Administração"));
  await p.getByLabel("Remover Quilómetros em automóvel próprio").click();
  await p.waitForTimeout(300);

  // Abono para falhas: o limite é 5% da remuneração fixa, e a linha diz qual.
  await p.getByRole("button", { name: "Adicionar rubrica" }).click();
  await p.getByRole("button", { name: /^Abono para falhas/ }).click();
  await p.locator("article", { hasText: "Abono para falhas" }).locator('input[inputmode="decimal"]').first().fill("400");
  await p.waitForTimeout(450);
  await p.getByRole("tab", { name: "Mês" }).click();
  await p.waitForTimeout(300);
  verificar("o abono mostra a base dos 5% em vez de um limite anónimo", /isento até .* da remuneração fixa/.test(await painel()));
  await p.getByLabel("Remover Abono para falhas").click();
  await p.waitForTimeout(300);

  await p.getByRole("button", { name: "Adicionar rubrica" }).click();
  await p.getByRole("button", { name: /Viatura de empresa/ }).click();
  await p.waitForTimeout(300);
  verificar(
    "um benefício sem factos suficientes explica-se em vez de calcular",
    (await p.locator("body").innerText()).includes("precisamos de mais factos"),
  );
  await p.getByRole("button", { name: "Fechar", exact: true }).first().click().catch(() => {});
  await p.waitForTimeout(250);

  // ═══ 7. Separadores do resultado ═══════════════════════════════════════
  console.log("\n▸ Separadores do resultado");
  const MARCAS = {
    "Mês": "Impacto por rubrica",
    "Ano": "Líquido anual estimado",
    "Empresa": "Custo salarial direto",
    "Cálculo": "Memória do cálculo",
  };
  for (const [tab, marca] of Object.entries(MARCAS)) {
    await p.getByRole("tab", { name: tab }).click();
    await p.waitForTimeout(300);
    // `innerText` respeita `text-transform`, e estes rótulos são `uppercase`.
    verificar(`separador «${tab}»`, (await painel()).toLowerCase().includes(marca.toLowerCase()));
  }

  // Despacho n.º 10: uma taxa efetiva por remuneração, em separado.
  await p.getByRole("tab", { name: "Cálculo" }).click();
  await p.waitForTimeout(300);
  verificar("as taxas efetivas aparecem por remuneração", (await painel()).includes("Taxa efetiva de cada remuneração"));
  verificar("com a base legal do n.º 10 à vista", (await painel()).includes("n.º 10"));
  await p.locator("label", { hasText: "Recebo em duodécimos" }).locator('input[type="checkbox"]').check();
  await p.waitForTimeout(450);
  const comSubsidios = await painel();
  verificar(
    "os subsídios entram com taxa própria",
    comSubsidios.includes("Subsídio de férias") && comSubsidios.includes("Subsídio de Natal"),
  );
  await p.locator("label", { hasText: "Recebo em duodécimos" }).locator('input[type="checkbox"]').uncheck();
  await p.getByRole("tab", { name: "Mês" }).click();
  await p.waitForTimeout(300);

  // ═══ 8. Passo 03 — auditar, guardar, exportar ══════════════════════════
  console.log("\n▸ Passo 03 · confirmar e guardar");
  await p.locator("#aud-irs").fill("50");
  await p.locator("#aud-ss").fill("220");
  await p.getByRole("button", { name: "Auditar o meu recibo" }).last().click();
  await p.waitForTimeout(450);
  verificar("a auditoria devolve um veredicto", /diferença de|tudo certo|confere|não bate/i.test(await p.locator("body").innerText()));

  await p.getByRole("button", { name: "Guardar", exact: true }).click();
  await p.waitForTimeout(400);
  verificar("o diálogo de guardar cenário abre", (await p.locator("body").innerText()).includes("Guardar cenário"));
  await p.keyboard.press("Escape");
  await p.waitForTimeout(300);
  verificar("as exportações ficam atrás do gate Plus", (await p.locator("body").innerText()).includes("Desbloquear com o Plus"));

  // ═══ 9. Retribuição mínima garantida ═══════════════════════════════════
  console.log("\n▸ Retribuição mínima garantida");
  await p.locator("#gross-salary").fill("700");
  await p.waitForTimeout(500);
  verificar("avisa quando o base fica abaixo do mínimo", (await p.locator("body").innerText()).includes("retribuição mínima garantida"));
  await p.locator("#weekly-hours").fill("20");
  await p.waitForTimeout(500);
  verificar(
    "a tempo parcial o mínimo é proporcional e o aviso desaparece",
    !(await p.locator("body").innerText()).includes("retribuição mínima garantida"),
  );
  await p.locator("#weekly-hours").fill("40");
  await p.locator("#gross-salary").fill("2000");
  await p.waitForTimeout(400);

  verificar("nenhum erro de runtime em todo o percurso", erros.length === 0, erros.slice(0, 2).join(" | "));
  await ctx.close();

  // ═══ 10. Telemóvel a 360px ═════════════════════════════════════════════
  console.log("\n▸ Telemóvel a 360px");
  {
    const movel = await abrir(360, 780);
    await movel.p.locator("label", { hasText: "Pedi retenção a uma taxa superior" }).locator('input[type="checkbox"]').check();
    await movel.p.waitForTimeout(450);
    const excesso = await movel.p.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    verificar("sem scroll horizontal", excesso <= 1, `${excesso}px`);
    // O alvo de toque não é a caixa do elemento: um `::before` invisível pode
    // alargá-lo sem mudar um pixel do desenho — é o que o `InfoTip` faz. Por
    // isso mede-se por HIT TEST, tocando 6px acima do topo visível e vendo se o
    // toque ainda chega ao controlo. Medir `getBoundingClientRect` acusaria de
    // pequenos alvos que são, na prática, confortáveis.
    const pequenos = await movel.p.evaluate(() => {
      const MINIMO = 32;
      const fora = [];
      const nome = (el) => el.getAttribute("aria-label") || (el.textContent || "").trim().slice(0, 18) || el.tagName;
      // O site tem `scroll-behavior: smooth`, e uma rolagem animada não terminou
      // quando se lê o retângulo a seguir — o elemento continuava fora do
      // ecrã e o teste dava tudo por reprovado sem tocar em nada.
      const suavidade = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      for (const el of document.querySelectorAll("button, select")) {
        if (el.getBoundingClientRect().height >= MINIMO) continue;
        // `elementFromPoint` trabalha em coordenadas do VIEWPORT e devolve
        // `null` fora dele: sem trazer o elemento ao ecrã, o teste dava tudo
        // por reprovado sem sequer tocar em nada.
        el.scrollIntoView({ block: "center" });
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0 || r.height >= MINIMO) continue;
        // Mede-se a ALTURA TOCÁVEL contígua em torno do centro, e não se exige
        // que a expansão seja simétrica: um ícone encostado a outro controlo
        // continua confortável de tocar se tiver 32px de um lado ou repartidos
        // pelos dois. O que a regra pede é área, não simetria.
        const alcanca = (n) => !!n && (n === el || el.contains(n) || n.contains(el));
        const x = r.left + r.width / 2;
        const meio = r.top + r.height / 2;
        const alcance = (passo) => {
          let extensao = 0;
          for (let d = 1; d <= MINIMO; d += 1) {
            if (!alcanca(document.elementFromPoint(x, meio + passo * d))) break;
            extensao = d;
          }
          return extensao;
        };
        const tocavel = alcance(-1) + alcance(1) + 1;
        if (tocavel < MINIMO) fora.push(`${nome(el)} tocável=${Math.round(tocavel)}px`);
      }
      document.documentElement.style.scrollBehavior = suavidade;
      return fora;
    });
    verificar("alvos de toque com pelo menos 32px de área tocável", pequenos.length === 0, pequenos.slice(0, 4).join(" | "));
    await movel.ctx.close();
  }
} finally {
  await navegador.close();
}

console.log("");
if (falhas.length > 0) {
  console.error(`✗ ${falhas.length} verificação(ões) falharam:`);
  falhas.forEach((f) => console.error(`   · ${f}`));
  process.exit(1);
}
console.log("✓ Simulador de salário líquido verificado controlo a controlo.");
