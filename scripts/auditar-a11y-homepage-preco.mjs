#!/usr/bin/env node
/**
 * AUDITORIA DE ACESSIBILIDADE DA HOMEPAGE DE «PREÇO» (`/inicio/preco`).
 * ----------------------------------------------------------------------
 * A calculadora completa já tem a sua auditoria (`auditar-a11y-preco.mjs`).
 * Esta é outra superfície e outro risco: o palco do hero move-se sozinho,
 * tem quatro controlos que se arrastam, um seletor de regime que recompõe
 * o cálculo e um laboratório com separadores. Nada disto existe na
 * ferramenta, e é exatamente o tipo de coisa que passa num axe da primeira
 * vista e falha em uso.
 *
 * Por isso os estados são os ATOS e os MODOS, não só a página carregada:
 *   · o palco a meio da sequência, ainda a formar o preço;
 *   · o palco assente no resultado;
 *   · o regime de recibos verdes, onde nasce a parcela «SS e IRS»;
 *   · o laboratório com um cenário que não é o de abertura.
 *
 * O âmbito é `main`: o cabeçalho, a barra de pesquisa e o rodapé são
 * partilhados e já auditados em `verificar-cabecalho.mjs` — contá-los aqui
 * media o chrome, não esta página.
 *
 * Uso:  npx next start   (noutro terminal)
 *       node scripts/auditar-a11y-homepage-preco.mjs
 */

import { auditar, BASE } from "./lib/auditoria-a11y.mjs";

const ROTA = "/inicio/preco";

/** Espera que a sequência assente sozinha no último ato. */
const assentar = async (p) => {
  await p.waitForTimeout(12500);
};

const ESTADOS = [
  {
    nome: "palco a formar o preço",
    url: ROTA,
    // Sem preparação: o axe apanha a cena a meio, com o resultado ainda
    // esbatido e as parcelas por chegar. É o estado que mais tempo está no
    // ecrã de quem chega, e o que nunca seria auditado por omissão.
    preparar: async (p) => {
      await p.waitForTimeout(1800);
    },
  },
  {
    nome: "palco assente no resultado",
    url: ROTA,
    preparar: assentar,
  },
  {
    nome: "regime a recibos verdes",
    url: ROTA,
    preparar: async (p) => {
      await assentar(p);
      const botao = p.getByRole("radio", { name: /Recibos verdes/ }).first();
      if (await botao.count()) await botao.click().catch(() => {});
      await p.waitForTimeout(900);
    },
  },
  {
    nome: "entrada com foco de teclado",
    url: ROTA,
    preparar: async (p) => {
      await assentar(p);
      const controlo = p.locator('[role="slider"]').first();
      if (await controlo.count()) {
        await controlo.focus().catch(() => {});
        await p.keyboard.press("ArrowRight");
      }
      await p.waitForTimeout(500);
    },
  },
  {
    nome: "laboratório noutro cenário",
    url: ROTA,
    preparar: async (p) => {
      const separador = p.getByRole("tab", { name: /Marketplace/ }).first();
      if (await separador.count()) {
        await separador.scrollIntoViewIfNeeded().catch(() => {});
        await separador.click().catch(() => {});
      }
      await p.waitForTimeout(700);
    },
  },
];

const { violacoesTotais, alvosTotais, overflowTotal } = await auditar({
  estados: ESTADOS,
  seletor: "main",
  titulo: `Homepage de Preço — ${BASE}${ROTA}`,
});

console.log(
  `\n═══ TOTAL: ${violacoesTotais} violações axe · ${alvosTotais} alvos abaixo de 24px · ${overflowTotal} vistas com scroll horizontal ═══\n`,
);
process.exit(violacoesTotais > 0 || overflowTotal > 0 || alvosTotais > 0 ? 1 : 0);
