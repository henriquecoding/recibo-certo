#!/usr/bin/env node
/**
 * AUDITORIA DE ACESSIBILIDADE DO ESTÚDIO DE NEGÓCIO.
 * ----------------------------------------------------------------------
 * Usa o MESMO motor da auditoria de preço (`lib/auditoria-a11y.mjs`) —
 * §45: «criar equivalentes apenas se os scripts atuais não puderem ser
 * parametrizados». Podiam. Isto é só a configuração: que estados auditar.
 *
 * ── PORQUE É QUE OS ESTADOS SÃO ESTES ──────────────────────────────
 * §33 pede a matriz de estados visuais, e cada um destes é uma FORMA
 * diferente da ferramenta, não uma variação de conteúdo:
 *
 *   vazio            três portas e nada mais
 *   uma oferta       a calculadora de preço embutida
 *   portefólio       várias ofertas, barras, concentração
 *   estrutura        os campos de overhead abertos
 *   cockpit          o resultado, o break-even e a cascata
 *   tudo revelado    sensibilidade + caixa + comparação + conclusão
 *
 * O último é o pior caso de densidade e de acessibilidade — sem ele, a
 * auditoria só via a ferramenta arrumada.
 *
 * Uso:  npx next start   (noutro terminal)
 *       node scripts/auditar-a11y-negocio.mjs
 */

import { auditar, BASE } from "./lib/auditoria-a11y.mjs";

/** A rota do painel: tem `#ferramenta` e não arrasta o hero da homepage. */
const ROTA = "/dashboard/negocio";

/** Carrega em «Tenho uma ideia» e sai da calculadora para o negócio. */
const construirUmaOferta = async (p) => {
  await p.locator("button", { hasText: "Tenho uma ideia" }).first().click({ timeout: 4000 }).catch(() => {});
  await p.waitForTimeout(600);
  // O seletor de cenário da calculadora embutida.
  await p.locator("button", { hasText: "Um serviço" }).first().click({ timeout: 4000 }).catch(() => {});
  await p.waitForTimeout(600);
};

const adicionarAoNegocio = async (p) => {
  await construirUmaOferta(p);
  // Responder a um campo essencial: sem isto o negócio fica exploratório
  // e metade do ecrã não nasce.
  const horas = p.locator("#horas-unidade").first();
  if (await horas.count()) {
    await horas.fill("6");
    await horas.blur();
  }
  await p.waitForTimeout(400);
  // `.first()` obrigatório: o botão aparece duas vezes de propósito (no
  // topo e no fim), e sem isto o Playwright recusa-o por ambiguidade — e
  // a preparação falhava em silêncio, deixando a auditoria a medir o
  // ecrã vazio. É o defeito que `verificar` agora apanha.
  await p
    .getByRole("button", { name: /Adicionar esta oferta ao negócio/ })
    .first()
    .click({ timeout: 4000 })
    .catch(() => {});
  await p.waitForTimeout(700);
};

/**
 * ⚠️ Cada estado declara `verificar`: uma prova de que a preparação
 * chegou mesmo onde queria. Sem ela, um seletor que deixa de acertar faz
 * a auditoria medir o ecrã vazio e devolver zero violações — que foi o
 * primeiro resultado desta auditoria, e era falso.
 */
const ESTADOS = [
  { nome: "vazio", url: ROTA, preparar: null, verificar: "Em que ponto estás?" },

  {
    nome: "calculadora embutida",
    url: ROTA,
    preparar: construirUmaOferta,
    verificar: "Estás a calcular",
  },

  {
    nome: "uma oferta",
    url: ROTA,
    preparar: adicionarAoNegocio,
    verificar: ["O teu negócio", "Resultado operacional"],
  },

  {
    nome: "estrutura preenchida",
    url: ROTA,
    preparar: async (p) => {
      await adicionarAoNegocio(p);
      for (const rotulo of ["Contabilidade", "Software"]) {
        await p.getByRole("button", { name: new RegExp(`^${rotulo}$`) }).first().click({ timeout: 2500 }).catch(() => {});
        await p.waitForTimeout(200);
      }
      const campo = p.locator('input[id^="custo-valor-"]').first();
      if (await campo.count()) {
        await campo.fill("150");
        await campo.blur();
      }
      await p.waitForTimeout(500);
    },
    verificar: ["As contas fecham a partir de", "Custos de estrutura"],
  },

  {
    nome: "volume e capacidade abertos",
    url: ROTA,
    preparar: async (p) => {
      await adicionarAoNegocio(p);
      await p
        .getByRole("button", { name: /Ajustar volume e capacidade/ })
        .first()
        .click({ timeout: 2500 })
        .catch(() => {});
      await p.waitForTimeout(500);
    },
    verificar: "Mês provável",
  },

  {
    // O pior caso: tudo aberto ao mesmo tempo.
    nome: "tudo revelado",
    url: ROTA,
    preparar: async (p) => {
      await adicionarAoNegocio(p);
      for (const rotulo of [/Testar o cenário/, /Projetar a caixa/, /Ajustar volume e capacidade/]) {
        await p.getByRole("button", { name: rotulo }).first().click({ timeout: 2500 }).catch(() => {});
        await p.waitForTimeout(400);
      }
      // E depois tudo o que ainda esteja recolhido.
      for (let i = 0; i < 10; i++) {
        const b = p.locator('#ferramenta button[aria-expanded="false"]').first();
        if (!(await b.count())) break;
        await b.click({ timeout: 1500 }).catch(() => {});
        await p.waitForTimeout(120);
      }
      await p.waitForTimeout(400);
    },
    verificar: ["O que mais mexe no resultado", "Mês de menor caixa", "O mesmo negócio, nas duas formas"],
  },
];

const { violacoesTotais, alvosTotais, overflowTotal } = await auditar({
  estados: ESTADOS,
  titulo: `Estúdio de negócio — ${BASE}${ROTA}`,
});

console.log(
  `\n═══ TOTAL: ${violacoesTotais} violações axe · ${alvosTotais} alvos abaixo de 24px · ${overflowTotal} vistas com scroll horizontal ═══\n`,
);
process.exit(violacoesTotais > 0 || overflowTotal > 0 || alvosTotais > 0 ? 1 : 0);
