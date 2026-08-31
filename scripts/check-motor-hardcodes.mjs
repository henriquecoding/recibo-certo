#!/usr/bin/env node
/**
 * Portão «sem hardcodes» do motor patronal (relatório, §10.3, MOT-P0-013).
 *
 * A regra que este script torna executável:
 *
 *   Nenhum valor, vigência, limiar, percentagem, janela, requisito, exceção
 *   ou exemplo de negócio MUTÁVEL pode viver em componentes, páginas ou
 *   adaptadores de UI. Todas as superfícies obtêm-nos de um release.
 *
 * Não é um regex sobre o ficheiro cru: comentários e literais de texto são
 * removidos por um pequeno lexer antes de se procurar o que quer que seja.
 * Sem isso, cada explicação em português sobre «40 horas» ou «2026» seria
 * uma falha, e o portão morreria de ruído em vez de morrer de rigor.
 *
 * O que NÃO é proibido está listado em `PERMITIDO`, e cada entrada tem de
 * dizer porquê. A lista é curta de propósito: cresce em revisão de PR, não
 * por conveniência.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const RAIZ = process.cwd();

/** Superfícies onde nenhuma regra mutável pode viver. */
const SUPERFICIES = [
  "src/app",
  "src/components",
  "src/lib/foco",
];

/** A fronteira única com o motor. É aqui que o release é resolvido. */
const FRONTEIRA = "src/lib/motor";

const EXTENSOES = [".ts", ".tsx"];

/**
 * Remove COMENTÁRIOS, preservando literais de texto e as posições de linha.
 * É lexical, não sintático, mas conhece strings o suficiente para não tomar
 * um `//` dentro de uma URL por um comentário — e para não apagar o valor
 * que as regras precisam de ver.
 *
 * Os comentários saem porque é neles que vive a prosa em português que
 * explica «40 horas» e «2026»: sem os tirar, o portão morria de ruído em vez
 * de morrer de rigor.
 */
function despirCodigo(fonte) {
  let saida = "";
  let i = 0;
  let estado = "codigo";
  let aspas = "";
  while (i < fonte.length) {
    const c = fonte[i];
    const seguinte = fonte[i + 1];
    if (estado === "codigo") {
      if (c === "/" && seguinte === "/") {
        estado = "linha";
        i += 2;
        continue;
      }
      if (c === "/" && seguinte === "*") {
        estado = "bloco";
        i += 2;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") {
        estado = "texto";
        aspas = c;
        saida += c;
        i += 1;
        continue;
      }
      // Uma expressão regular literal pode conter `//`; saltá-la evita que o
      // resto do ficheiro desapareça como se fosse um comentário.
      if (c === "/" && /[=(,:[!&|?{};\n]\s*$/.test(saida)) {
        saida += c;
        i += 1;
        while (i < fonte.length && fonte[i] !== "\n") {
          if (fonte[i] === "\\") {
            saida += fonte[i] + (fonte[i + 1] ?? "");
            i += 2;
            continue;
          }
          saida += fonte[i];
          if (fonte[i] === "/") {
            i += 1;
            break;
          }
          i += 1;
        }
        continue;
      }
      saida += c;
      i += 1;
      continue;
    }
    if (estado === "linha") {
      if (c === "\n") {
        estado = "codigo";
        saida += "\n";
      }
      i += 1;
      continue;
    }
    if (estado === "bloco") {
      if (c === "*" && seguinte === "/") {
        estado = "codigo";
        i += 2;
        continue;
      }
      if (c === "\n") saida += "\n";
      i += 1;
      continue;
    }
    // texto: preservado tal e qual — é onde vive o valor que se procura.
    if (c === "\\") {
      saida += c + (fonte[i + 1] ?? "");
      i += 2;
      continue;
    }
    saida += c;
    if (c === aspas) estado = "codigo";
    i += 1;
  }
  return saida;
}

/**
 * Cada regra diz o que procura, porque é proibido e onde é que a coisa
 * passou a viver.
 */
const REGRAS = [
  {
    id: "import-de-politica-anual",
    // `policy-2026`, `policy-2027`… importados por uma superfície pública.
    padrao: /from\s+["'][^"']*policy-20\d\d["']/g,
    porque:
      "Uma superfície pública não importa uma política anual. Pede o release a src/lib/motor e recebe um bundle ou uma recusa.",
  },
  {
    id: "politica-de-payroll-em-superficie",
    padrao: /\bPORTUGAL_PAYROLL_POLICY_\d{4}\b/g,
    porque:
      "A política de payroll vive no release. A superfície nunca a nomeia — chega-lhe pelo bundle do seletor.",
  },
  {
    id: "resolvedor-de-retencao-em-superficie",
    padrao: /\blegacy\d*WithholdingResolver\b/g,
    porque:
      "O adaptador de retenção fica amarrado em src/lib/motor/release.ts, num sítio só, para que a substituição seja uma linha.",
  },
  {
    id: "periodo-fixo",
    // `period: "2026-08"` e primos: um mês de política escrito à mão.
    padrao: /\b(period|workPeriod|policyDate|knowledgeAsOf)\s*:\s*["'`]20\d\d-/g,
    porque:
      "O período e a data da política não se escrevem no formulário. Derivam do que a pessoa indicou e são resolvidos pelo release.",
  },
  {
    id: "url-legal-em-superficie",
    padrao: /["'`]https:\/\/(diariodarepublica\.pt|info\.portaldasfinancas\.gov\.pt|www\.seg-social\.pt|iefponline\.iefp\.pt)[^"'`]*["'`]/g,
    porque:
      "Uma fonte legal é uma citação resolvida no catálogo do motor (resolveCitation), com artigo — não uma URL colada num componente.",
  },
];

/**
 * Exceções, cada uma com a sua razão. Cresce em revisão de PR, não por
 * atalho — e as que existem por dívida dizem-no, para que a dívida fique
 * visível em vez de a regra ser apagada.
 */
const PERMITIDO = [
  {
    ficheiro: "src/lib/motor/release.ts",
    regras: ["resolvedor-de-retencao-em-superficie"],
    porque: "É a fronteira única: existe precisamente para ser o único sítio que amarra o adaptador.",
  },
  // ── Dívida declarada ────────────────────────────────────────────────────
  // Estas superfícies pertencem a OUTRAS ferramentas — preço, herança,
  // empresa, recibos — que ainda não têm release próprio. As URLs legais
  // saem de cada uma quando o seu domínio for publicado como release, tal
  // como aconteceu com o patronal. A lista é fechada: um ficheiro NOVO com
  // uma URL legal reprova.
  ...[
    "src/app/ferramentas/calcular-preco/page.tsx",
    "src/components/SimuladorHeranca.tsx",
    "src/components/foco/empresa/HomepageEmpresa.tsx",
    "src/components/foco/recibos/HomepageRecibos.tsx",
    "src/components/foco/salario/HomepageSalario.tsx",
    "src/components/preco/HomepagePreco.tsx",
    "src/components/precos/ConclusaoPreco.tsx",
    "src/components/simulador/ModoGuiadoEmpresa.tsx",
    "src/components/simulador/ModoGuiadoHeranca.tsx",
  ].map((ficheiro) => ({
    ficheiro,
    regras: ["url-legal-em-superficie"],
    porque:
      "Ferramenta ainda sem release próprio. Migra para o catálogo legal quando o seu domínio for publicado.",
  })),
];

function permitido(caminho, regraId) {
  return PERMITIDO.some(
    (entrada) => entrada.ficheiro === caminho && entrada.regras.includes(regraId),
  );
}

function* ficheiros(dir) {
  let entradas;
  try {
    entradas = readdirSync(dir);
  } catch {
    return;
  }
  for (const entrada of entradas) {
    const caminho = join(dir, entrada);
    const info = statSync(caminho);
    if (info.isDirectory()) {
      if (entrada === "node_modules" || entrada === "__tests__") continue;
      yield* ficheiros(caminho);
      continue;
    }
    if (EXTENSOES.some((ext) => entrada.endsWith(ext))) yield caminho;
  }
}

function linhaDe(texto, indice) {
  return texto.slice(0, indice).split("\n").length;
}

const falhas = [];
let analisados = 0;

for (const raizRelativa of SUPERFICIES) {
  for (const caminho of ficheiros(join(RAIZ, raizRelativa))) {
    const relativo = relative(RAIZ, caminho).split(sep).join("/");
    if (relativo.startsWith(FRONTEIRA)) continue;
    const fonte = readFileSync(caminho, "utf8");
    const codigo = despirCodigo(fonte);
    analisados += 1;
    for (const regra of REGRAS) {
      if (permitido(relativo, regra.id)) continue;
      regra.padrao.lastIndex = 0;
      let encontro;
      while ((encontro = regra.padrao.exec(codigo)) !== null) {
        falhas.push({
          ficheiro: relativo,
          linha: linhaDe(codigo, encontro.index),
          regra: regra.id,
          trecho: encontro[0].slice(0, 90),
          porque: regra.porque,
        });
      }
    }
  }
}

// A fronteira tem de existir e ser a única a resolver o release.
const fronteira = join(RAIZ, FRONTEIRA, "release.ts");
try {
  const fonte = readFileSync(fronteira, "utf8");
  if (!fonte.includes("selectEmploymentPolicy")) {
    falhas.push({
      ficheiro: `${FRONTEIRA}/release.ts`,
      linha: 1,
      regra: "fronteira-sem-seletor",
      trecho: "",
      porque: "A fronteira do motor deixou de chamar o seletor central de releases.",
    });
  }
} catch {
  falhas.push({
    ficheiro: `${FRONTEIRA}/release.ts`,
    linha: 1,
    regra: "fronteira-em-falta",
    trecho: "",
    porque: "Sem a fronteira única, cada superfície volta a resolver a política à sua maneira.",
  });
}

if (falhas.length === 0) {
  console.log(`[motor] sem hardcodes — ${analisados} ficheiros analisados em ${SUPERFICIES.join(", ")}.`);
  process.exit(0);
}

console.error(`[motor] ${falhas.length} regra(s) mutável(eis) fora do release:\n`);
for (const falha of falhas) {
  console.error(`  ${falha.ficheiro}:${falha.linha}  [${falha.regra}]`);
  if (falha.trecho) console.error(`    ${falha.trecho}`);
  console.error(`    ${falha.porque}\n`);
}
process.exit(1);
