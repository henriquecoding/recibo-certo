#!/usr/bin/env node
/**
 * AUDITORIA DE ACESSIBILIDADE DA CALCULADORA DE PREÇO.
 * ----------------------------------------------------------------------
 * Corre o axe em vários estados — não só o inicial — porque a ferramenta
 * muda de forma consoante o que a pessoa responde: blocos abrem, secções
 * novas nascem, e um resultado impossível substitui o cartão inteiro. Um
 * axe só na primeira vista audita o folheto, não o produto.
 *
 * Cobre também o que o axe NÃO vê e o §18 exige:
 *   · alvos de toque abaixo de 24×24 (WCAG 2.2 AA, 2.5.8);
 *   · scroll horizontal a 320 px (1.4.10 reflow);
 *   · elementos sem foco visível;
 *   · regiões vivas em falta.
 *
 * ⚠️ A MEDIÇÃO vive agora em `lib/auditoria-a11y.mjs`, partilhada com a
 * auditoria do estúdio de negócio. Este ficheiro é a CONFIGURAÇÃO: os
 * estados desta ferramenta e o portão que se lhe aplica. Uma correção à
 * medição passa a valer para as duas — em vez de divergir na terceira.
 *
 * Uso:  npx next start   (noutro terminal)
 *       node scripts/auditar-a11y-preco.mjs
 */

import { auditar, BASE } from "./lib/auditoria-a11y.mjs";

/** Os estados a auditar. Cada um é uma forma diferente da ferramenta. */
const ESTADOS = [
  { nome: "seletor de cenário", url: "/ferramentas/calcular-preco", preparar: null },
  { nome: "cenário inicial", url: "/ferramentas/calcular-preco?c=produto_revenda", preparar: null },
  {
    nome: "blocos abertos",
    url: "/ferramentas/calcular-preco?c=marketplace",
    preparar: async (p) => {
      for (const t of ["enquadramento fiscal", "mesmo sem vender", "Comissões", "Devoluções", "Desconto"]) {
        const b = p.locator("button", { hasText: t }).first();
        if (await b.count()) await b.click().catch(() => {});
        await p.waitForTimeout(120);
      }
    },
  },
  {
    nome: "preço impossível",
    url: "/ferramentas/calcular-preco?c=marketplace",
    preparar: async (p) => {
      const el = p.locator("#objetivo-pct").first();
      if (await el.count()) { await el.fill("95"); await el.blur(); }
      await p.waitForTimeout(400);
    },
  },
  {
    nome: "memória de cálculo aberta",
    url: "/ferramentas/calcular-preco?c=servico",
    preparar: async (p) => {
      // Dois cliques desde as camadas de revelação: primeiro revela-se a
      // secção, depois abre-se a memória lá dentro. A memória nunca abre
      // sozinha em nível nenhum — ver `lib/pricing/nivel.ts`.
      for (const t of ["Como se chegou a este número", "Ver cálculo"]) {
        const b = p.locator("button", { hasText: t }).first();
        if (await b.count()) await b.click().catch(() => {});
        await p.waitForTimeout(250);
      }
    },
  },
  {
    // Estado novo: TUDO revelado. É o pior caso de densidade e de
    // acessibilidade, e sem ele a auditoria só via a ferramenta arrumada.
    nome: "tudo revelado",
    url: "/ferramentas/calcular-preco?c=marketplace",
    preparar: async (p) => {
      // `timeout` curto e explícito: o `.click()` do Playwright espera 30 s
      // por omissão, e um alvo que nunca fica estável multiplicava isso por
      // doze cliques e quatro vistas. A auditoria deixava de terminar.
      for (let i = 0; i < 12; i++) {
        const b = p.locator('button[aria-expanded="false"]').first();
        if (!(await b.count())) break;
        await b.click({ timeout: 1500 }).catch(() => {});
        await p.waitForTimeout(100);
      }
    },
  },
];

const { violacoesTotais, alvosTotais, overflowTotal } = await auditar({
  estados: ESTADOS,
  titulo: `Calculadora de preço — ${BASE}`,
});

console.log(
  `\n═══ TOTAL: ${violacoesTotais} violações axe · ${alvosTotais} alvos abaixo de 24px · ${overflowTotal} vistas com scroll horizontal ═══\n`,
);
// Os alvos entram no portão porque a medição é honesta (área efetiva, não
// caixa). Antes disso teria de ficar de fora — 141 falsos positivos nunca
// deixariam o portão fechar.
process.exit(violacoesTotais > 0 || overflowTotal > 0 || alvosTotais > 0 ? 1 : 0);
