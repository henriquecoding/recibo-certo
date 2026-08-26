// ═══════════════════════════════════════════════════════════════════════
//  O ANALISADOR DA FRONTEIRA — o que atravessa para o browser, e por quem
//  ---------------------------------------------------------------------
//  `npm run fronteira`
//
//  Percorre o grafo de imports a partir de cada ficheiro `"use client"` e
//  diz quanto código-fonte fica alcançável a partir daí, com o CAMINHO
//  que lá leva.
//
//  ── Porque é que isto tem de existir ─────────────────────────────────
//
//  O empacotador não avisa. Um componente de cliente que importa uma
//  função de um módulo de dados leva o módulo inteiro — e depois o que
//  esse importa, e assim por diante. Encontrámos assim meio megabyte de
//  catálogo de guias no primeiro ecrã da homepage, para desenhar três
//  ligações.
//
//  Ler os chunks compilados não serve: o Turbopack junta módulos sem
//  relação no mesmo ficheiro, e um chunk com fontes legais, dados
//  fiscais e concelhos não diz quem os pediu. O grafo de imports diz.
//
//  ── O que conta como «pesado» ────────────────────────────────────────
//
//  Bytes de FONTE, não do chunk. É uma aproximação — o empacotador
//  minifica e faz tree-shaking de exports não usados — mas é a
//  aproximação certa para a decisão que interessa: **este módulo devia
//  sequer ser alcançável a partir do cliente?**
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync, statSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";

const RAIZ = resolve(new URL("..", import.meta.url).pathname);
const SRC = join(RAIZ, "src");
const LIMITE = Number(process.env.LIMITE ?? 40) * 1024; // reportar acima de 40 KB

/** Todos os ficheiros de código sob `src`. */
function ficheiros(dir, saida = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "__tests__") continue;
      ficheiros(p, saida);
    } else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".d.ts")) {
      saida.push(p);
    }
  }
  return saida;
}

const TODOS = ficheiros(SRC);
const fonte = new Map(TODOS.map((f) => [f, readFileSync(f, "utf8")]));

/** `@/x` → caminho real; relativo → resolvido. `null` para pacotes. */
function resolver(deQue, especificador) {
  let base;
  if (especificador.startsWith("@/")) base = join(SRC, especificador.slice(2));
  else if (especificador.startsWith(".")) base = resolve(dirname(deQue), especificador);
  else return null; // node_modules — fora do âmbito
  for (const sufixo of [".ts", ".tsx", "/index.ts", "/index.tsx", ""]) {
    const tentativa = base + sufixo;
    if (existsSync(tentativa) && statSync(tentativa).isFile()) return tentativa;
  }
  return null;
}

/**
 * Os imports de um ficheiro.
 *
 * `import type` é ignorado: só existe para o TypeScript e desaparece na
 * compilação — contá-lo daria alarmes falsos em módulos que só partilham
 * tipos, que é precisamente o que se quer que aconteça.
 */
function importsDe(ficheiro) {
  const texto = fonte.get(ficheiro) ?? "";
  const saida = [];
  const re = /(?:^|\n)\s*(?:import|export)\s+(type\s+)?[^;'"]*?from\s+["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(texto))) {
    if (m[1]) continue;
    const alvo = resolver(ficheiro, m[2]);
    if (alvo) saida.push(alvo);
  }
  // `import "x"` por efeito colateral, e `import("x")` dinâmico.
  const soEfeito = /(?:^|\n)\s*import\s+["']([^"']+)["']/g;
  while ((m = soEfeito.exec(texto))) {
    const alvo = resolver(ficheiro, m[1]);
    if (alvo) saida.push(alvo);
  }
  return saida;
}

const ehCliente = (f) => /^\s*["']use client["']/.test(fonte.get(f) ?? "");
const ehServidor = (f) => /^\s*import\s+["']server-only["']/m.test(fonte.get(f) ?? "");

/**
 * Tudo o que se alcança a partir de `entrada`, com o caminho mais curto.
 *
 * Um `import()` dinâmico NÃO é seguido: é precisamente a ferramenta que
 * corta a fronteira, e segui-lo apagaria a diferença entre um módulo
 * carregado à entrada e outro carregado quando alguém abre um painel.
 */
function alcancavel(entrada) {
  const visto = new Map([[entrada, [entrada]]]);
  const fila = [entrada];
  while (fila.length) {
    const atual = fila.shift();
    for (const seguinte of importsDe(atual)) {
      if (visto.has(seguinte)) continue;
      visto.set(seguinte, [...visto.get(atual), seguinte]);
      fila.push(seguinte);
    }
  }
  return visto;
}

const curto = (f) => relative(SRC, f);
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

// ── As entradas ───────────────────────────────────────────────────────
//  Por omissão, todos os componentes de cliente. `ENTRADAS=a,b` limita a
//  análise a um sub-conjunto — é como se descobre o que pesa no LAYOUT,
//  que é o custo que todas as páginas pagam, e não só uma.
const ENTRADAS = process.env.ENTRADAS
  ? process.env.ENTRADAS.split(",").map((x) => join(RAIZ, x.trim()))
  : TODOS.filter(ehCliente);

/** Módulo pesado → quem o alcança, e por que caminho. */
const culpados = new Map();
for (const entrada of ENTRADAS) {
  for (const [modulo, caminho] of alcancavel(entrada)) {
    if (modulo === entrada) continue;
    const tamanho = statSync(modulo).size;
    if (tamanho < LIMITE) continue;
    if (!culpados.has(modulo)) culpados.set(modulo, { tamanho, vias: [] });
    culpados.get(modulo).vias.push(caminho);
  }
}

const ordenados = [...culpados.entries()].sort((a, z) => z[1].tamanho - a[1].tamanho);

console.log(`\n═══ MÓDULOS PESADOS ALCANÇÁVEIS DO CLIENTE (> ${kb(LIMITE)}) ═══\n`);
if (!ordenados.length) console.log("  Nenhum. Bom sinal.");

let total = 0;
for (const [modulo, { tamanho, vias }] of ordenados) {
  total += tamanho;
  const servidor = ehServidor(modulo) ? "  ⚠️ marcado server-only!" : "";
  console.log(`${kb(tamanho).padStart(8)}  ${curto(modulo)}${servidor}`);
  // O caminho mais curto até ele — é por aí que se corta.
  const via = vias.sort((a, z) => a.length - z.length)[0];
  console.log(`          via ${via.map(curto).join("\n           → ")}`);
  if (vias.length > 1) console.log(`          (e mais ${vias.length - 1} entrada(s) de cliente)`);
  console.log("");
}
console.log(`Soma dos pesados alcançáveis: ${kb(total)} de fonte\n`);
