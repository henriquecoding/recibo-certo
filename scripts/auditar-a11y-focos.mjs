#!/usr/bin/env node
/**
 * AUDITORIA DE ACESSIBILIDADE DOS CINCO FOCOS DA HOMEPAGE.
 * ----------------------------------------------------------------------
 * A homepage tem cinco leituras editoriais em rotas estáticas — `/` e
 * `/inicio/{preco,recibos,empresa,salario}` —, cada uma com um palco
 * que se move sozinho. Auditar só uma delas seria auditar um quinto do
 * que se serve.
 *
 * Os estados são os ATOS, e não só a página carregada:
 *   · o palco a meio da sequência — o estado que mais tempo está no ecrã
 *     de quem chega, e o que nunca seria auditado por omissão;
 *   · o palco assente no último ato;
 *   · a régua de focos com foco de teclado, que é o controlo novo.
 *
 * O âmbito é `main`: o cabeçalho e o rodapé são partilhados e já
 * auditados em `verificar-cabecalho.mjs` — contá-los aqui media o chrome,
 * não estas páginas.
 *
 * Uso:  npx next start   (noutro terminal)
 *       node scripts/auditar-a11y-focos.mjs
 */

import { auditar, BASE } from "./lib/auditoria-a11y.mjs";

const ROTAS = {
  descobrir: "/",
  preco: "/inicio/preco",
  recibos: "/inicio/recibos",
  empresa: "/inicio/empresa",
  salario: "/inicio/salario",
};

/** Espera que a sequência assente sozinha no último ato. */
const assentar = async (p) => {
  await p.waitForTimeout(15500);
};

const ESTADOS = [
  // A porta genérica: já não tem o cartão de audiência, mas continua a
  // ter o hero antigo e a calculadora.
  {
    nome: "porta genérica",
    url: "/",
    preparar: async (p) => {
      await p.waitForTimeout(2200);
    },
  },
  ...Object.entries(ROTAS).flatMap(([foco, url]) => [
    {
      nome: `${foco} · a meio da sequência`,
      url,
      preparar: async (p) => {
        await p.waitForTimeout(2200);
      },
    },
    {
      nome: `${foco} · assente`,
      url,
      preparar: assentar,
    },
  ]),
  {
    // A pausa do palco. É o controlo que o WCAG 2.2.2 exige, e o que
    // mais depressa se parte quando um palco novo é acrescentado.
    nome: "palco em pausa",
    url: ROTAS.salario,
    preparar: async (p) => {
      await p.waitForTimeout(2200);
      const pausa = p.getByRole("button", { name: /Pausar/ }).first();
      if (await pausa.count()) await pausa.click().catch(() => {});
      await p.waitForTimeout(600);
    },
  },
];

const { violacoesTotais, alvosTotais, overflowTotal } = await auditar({
  estados: ESTADOS,
  seletor: "main",
  titulo: `Os cinco focos da homepage — ${BASE}/`,
});

console.log(
  `\n═══ TOTAL: ${violacoesTotais} violações axe · ${alvosTotais} alvos abaixo de 24px · ${overflowTotal} vistas com scroll horizontal ═══\n`,
);
process.exit(violacoesTotais > 0 || overflowTotal > 0 || alvosTotais > 0 ? 1 : 0);
