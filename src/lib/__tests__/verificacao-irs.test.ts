// ═══════════════════════════════════════════════════════════════════════
//  VERIFICAÇÃO DA AUDITORIA DO SIMULADOR DE IRS — a parte que faltava
//  ---------------------------------------------------------------------
//  Os achados F-01 a F-13 já têm casos de referência em
//  `fiscal-declaracao-referencia.test.ts`. Este ficheiro fecha o F-14, que
//  ficara a meio: a entrada pública estava definida, mas três ecrãs
//  continuavam a chamar o núcleo com o salário metido em `outrosRendimentos`.
//
//  A auditoria descrevia isso como dívida de arquitetura («dois motores em
//  paralelo»). Medido, era mais do que isso — era um erro de conta, do lado
//  de quem paga:
//
//      salário 30 000 € + Cat. B 15 000 €   núcleo 10 186,40 €  ·  declaração  8 585,51 €
//      salário 60 000 € + Cat. B 20 000 €   núcleo 25 008,28 €  ·  declaração 22 962,44 €
//      salário 20 000 €, 1.º ano, IRS Jovem núcleo  3 343,47 €  ·  declaração      0,00 €
//
//  Os testes abaixo prendem as duas pontas: os números certos, e a
//  impossibilidade de alguém voltar a alimentar o núcleo com um bruto.
// ═══════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  simularDeclaracaoIRS,
  simularIRSAnual,
  type DeclaracaoInput,
} from "@/lib/fiscal";
import {
  PROGRAMA_REGRESSAR,
  PROGRAMA_REGRESSAR_TETO_CALC,
  ADICIONAL_SOLIDARIEDADE,
  DEDUCAO_ESPECIFICA_DEPENDENTE,
} from "@/lib/fiscal-data";

const RAIZ = join(__dirname, "..", "..");

function ficheirosFonte(dir: string, acc: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      if (nome === "__tests__" || nome === "node_modules") continue;
      ficheirosFonte(caminho, acc);
    } else if (/\.(ts|tsx)$/.test(nome)) {
      acc.push(caminho);
    }
  }
  return acc;
}

/**
 * Devolve o texto de cada argumento passado a `fn(` no ficheiro, contando
 * chavetas para não se perder em objetos aninhados. Uma regex simples
 * apanharia a primeira `}` e deixaria passar exatamente os casos aninhados
 * que interessam.
 */
function argumentosDeChamadas(fonte: string, fn: string): string[] {
  const out: string[] = [];
  const alvo = `${fn}(`;
  let i = fonte.indexOf(alvo);
  while (i !== -1) {
    let profundidade = 0;
    let j = i + alvo.length;
    const inicio = j;
    for (; j < fonte.length; j++) {
      const c = fonte[j];
      if (c === "(" || c === "{" || c === "[") profundidade++;
      else if (c === ")" && profundidade === 0) break;
      else if (c === ")" || c === "}" || c === "]") profundidade--;
    }
    out.push(fonte.slice(inicio, j));
    i = fonte.indexOf(alvo, j);
  }
  return out;
}

describe("F-14 · uma só entrada pública para o apuramento de IRS", () => {
  it("nenhum ecrã alimenta o núcleo com `outrosRendimentos`", () => {
    // O campo existe e é legítimo — mas só `simularDeclaracaoIRS` sabe
    // calculá-lo, porque exige saber a categoria de origem. Passado a partir
    // da UI, é sempre um bruto disfarçado de líquido.
    const infratores: string[] = [];
    for (const ficheiro of ficheirosFonte(RAIZ)) {
      if (ficheiro.endsWith(join("lib", "fiscal.ts"))) continue; // o próprio motor
      const fonte = readFileSync(ficheiro, "utf8");
      if (!fonte.includes("simularIRSAnual(")) continue;
      for (const arg of argumentosDeChamadas(fonte, "simularIRSAnual")) {
        if (/\boutrosRendimentos\s*:/.test(arg)) {
          infratores.push(ficheiro.replace(RAIZ, "src"));
        }
      }
    }
    expect(infratores).toEqual([]);
  });

  it("os componentes do simulador chamam a declaração, não o núcleo", () => {
    const esperados = [
      join("components", "simulador", "DemoIRS.tsx"),
      join("components", "simulador", "ModoGuiado.tsx"),
      join("components", "SimuladorIntegrado.tsx"),
      join("components", "simulador", "SimuladorIRS.tsx"),
    ];
    for (const rel of esperados) {
      const fonte = readFileSync(join(RAIZ, rel), "utf8");
      expect(fonte, `${rel} devia importar simularDeclaracaoIRS`).toMatch(
        /simularDeclaracaoIRS/,
      );
      // Chamadas ao núcleo (não menções em comentários).
      expect(
        argumentosDeChamadas(fonte, "simularIRSAnual").length,
        `${rel} ainda chama o núcleo diretamente`,
      ).toBe(0);
    }
  });

  it("quem usa o núcleo diretamente só tem categoria B", () => {
    // Continua a ser legítimo: sem outras categorias, o núcleo infere sozinho
    // os factos do artigo 70.º e não há nada a perder.
    const diretos = [
      join("components", "guias", "CalculadoraRegimeSimplificado.tsx"),
      join("components", "dashboard", "EstimativaIRS.tsx"),
    ];
    for (const rel of diretos) {
      const fonte = readFileSync(join(RAIZ, rel), "utf8");
      for (const arg of argumentosDeChamadas(fonte, "simularIRSAnual")) {
        expect(/\boutrosRendimentos\s*:/.test(arg), rel).toBe(false);
        expect(/\bsalarios\s*:/.test(arg), rel).toBe(false);
      }
    }
  });

  it("salário + recibos verdes: o mesmo caso dá o mesmo número nos três ecrãs", () => {
    // O ModoGuiado, o SimuladorIntegrado e o wizard constroem entradas
    // diferentes para a MESMA situação. Se as três não convergirem, o site
    // volta a ter dois números para a mesma pessoa.
    const caso = { salario: 30_000, catB: 15_000 };

    const guiado = simularDeclaracaoIRS({
      independente: { brutoAnual: caso.catB, tipo: "art151", anoAtividade: 3 },
      salarios: { bruto: caso.salario },
      acumulaEmprego: true,
    });
    const integrado = simularDeclaracaoIRS({
      independente: { brutoAnual: caso.catB, tipo: "art151", anoAtividade: 3 },
      salarios: { bruto: caso.salario },
      acumulaEmprego: true,
      dependentesDetalhe: { normais: 0, bebe: 0, deficientes: 0 },
      deducoes: { saude: 0, educacao: 0, gerais: 0, rendas: 0 },
    });
    const wizard = simularDeclaracaoIRS({
      independente: { brutoAnual: caso.catB, tipo: "art151", anoAtividade: 3 },
      salarios: { bruto: caso.salario },
      acumulaEmprego: true,
    });

    expect(integrado.irsTotal).toBeCloseTo(guiado.irsTotal, 2);
    expect(wizard.irsTotal).toBeCloseTo(guiado.irsTotal, 2);
  });

  it("o salário traz consigo a dedução específica do Art. 25.º", () => {
    const r = simularDeclaracaoIRS({
      independente: { brutoAnual: 15_000, tipo: "art151", anoAtividade: 3 },
      salarios: { bruto: 30_000 },
      acumulaEmprego: true,
    });
    // O componente da categoria A declara o bruto e o que dele segue para o
    // englobamento. A diferença entre os dois é a dedução específica — e é
    // exatamente ela que se perdia quando o salário vinha como um número solto.
    //
    // (Não se compara com o coletável total de um caso sem salário: o artigo
    // 70.º abate 2 065,92 € a quem só tem os 15 000 € de recibos verdes e
    // deixa de abater quando o salário entra, o que mascararia a medição.)
    const catA = r.componentes.find((c) => c.id === "salarios");
    expect(catA).toBeDefined();
    expect(catA!.bruto).toBeCloseTo(30_000, 2);
    expect(catA!.bruto - catA!.englobado).toBeCloseTo(DEDUCAO_ESPECIFICA_DEPENDENTE.value, 2);
  });

  it("o núcleo alimentado com um bruto dá um imposto MAIOR — a prova do defeito", () => {
    // Este é o teste que documenta porque é que o refactor valeu a pena. Se
    // alguém «simplificar» voltando a passar o bruto, o número muda para pior.
    const errado = simularIRSAnual({
      brutoAnual: 15_000,
      tipo: "art151",
      anoAtividade: 3,
      acumulaEmprego: true,
      outrosRendimentos: 30_000, // bruto — era isto que a UI fazia
    });
    const certo = simularDeclaracaoIRS({
      independente: { brutoAnual: 15_000, tipo: "art151", anoAtividade: 3 },
      salarios: { bruto: 30_000 },
      acumulaEmprego: true,
    });
    expect(errado.irsEstimado).toBeGreaterThan(certo.irsTotal);
    expect(errado.irsEstimado - certo.irsTotal).toBeGreaterThan(1_000);
  });

  it("um jovem assalariado com recibos verdes não paga IRS no 1.º ano", () => {
    // O caso que o núcleo dava a 3 343,47 € porque não sabia que o número
    // anónimo era um salário.
    const r = simularDeclaracaoIRS({
      independente: { brutoAnual: 0, tipo: "art151" },
      salarios: { bruto: 20_000 },
      irsJovemAno: 1,
    });
    expect(r.irsTotal).toBeCloseTo(0, 2);
  });

  it("a exclusão por deficiência chega ao salário", () => {
    const com = simularDeclaracaoIRS({
      salarios: { bruto: 30_000 },
      deficiencia: true,
    });
    const sem = simularDeclaracaoIRS({ salarios: { bruto: 30_000 } });
    expect(com.irsTotal).toBeLessThan(sem.irsTotal);
  });
});

describe("Art. 12.º-A · Programa Regressar nas categorias A e B", () => {
  // A auditoria não listou isto, mas subir o `programaRegressar` à declaração
  // sem o aplicar à categoria A seria repetir o defeito que ela descreve: a
  // norma diz «rendimentos do trabalho dependente E dos rendimentos
  // empresariais e profissionais», e o motor só cobria os segundos.
  it("exclui 50% também do salário", () => {
    const base: DeclaracaoInput = { salarios: { bruto: 40_000 } };
    const sem = simularDeclaracaoIRS(base);
    const com = simularDeclaracaoIRS({ ...base, programaRegressar: true });
    expect(com.irsTotal).toBeLessThan(sem.irsTotal);

    // O coletável cai para metade do líquido — a exclusão morde depois da
    // dedução específica, não antes.
    const liquido = 40_000 - DEDUCAO_ESPECIFICA_DEPENDENTE.value;
    expect(com.rendimentoColetavel).toBeCloseTo(
      liquido * (1 - PROGRAMA_REGRESSAR.exclusao.value),
      2,
    );
  });

  it("o teto de 250 000 € é o limite superior do 1.º escalão do Art. 68.º-A", () => {
    expect(PROGRAMA_REGRESSAR_TETO_CALC).toBe(ADICIONAL_SOLIDARIEDADE.limiar2.value);
    expect(PROGRAMA_REGRESSAR_TETO_CALC).toBe(250_000);
  });

  it("o teto morde no montante excluído e é partilhado entre A e B", () => {
    // Salário alto o suficiente para que 50% ultrapasse o teto sozinho.
    const r = simularDeclaracaoIRS({
      salarios: { bruto: 700_000 },
      programaRegressar: true,
    });
    const liquido = 700_000 - DEDUCAO_ESPECIFICA_DEPENDENTE.value;
    // Excluído = teto, não 50% do líquido.
    expect(r.rendimentoColetavel).toBeCloseTo(liquido - PROGRAMA_REGRESSAR_TETO_CALC, 2);

    // Com o teto já gasto pela categoria A, a categoria B não recebe mais nada.
    const comCatB = simularDeclaracaoIRS({
      salarios: { bruto: 700_000 },
      independente: { brutoAnual: 50_000, tipo: "art151", anoAtividade: 3 },
      programaRegressar: true,
    });
    const semRegressar = simularDeclaracaoIRS({
      salarios: { bruto: 700_000 },
      independente: { brutoAnual: 50_000, tipo: "art151", anoAtividade: 3 },
    });
    const excluidoTotal = semRegressar.rendimentoColetavel - comCatB.rendimentoColetavel;
    expect(excluidoTotal).toBeCloseTo(PROGRAMA_REGRESSAR_TETO_CALC, 2);
  });

  it("cede ao IFICI e ao RNH antigo (Art. 12.º-A n.º 2)", () => {
    const comIfici = simularDeclaracaoIRS({
      salarios: { bruto: 40_000 },
      programaRegressar: true,
      ifici: true,
    });
    const soIfici = simularDeclaracaoIRS({ salarios: { bruto: 40_000 }, ifici: true });
    expect(comIfici.irsTotal).toBeCloseTo(soIfici.irsTotal, 2);
  });

  it("o teto vem do Art. 68.º-A e não de um número escrito à mão", () => {
    const fonte = readFileSync(join(RAIZ, "lib", "fiscal-data.ts"), "utf8");
    expect(fonte).toMatch(
      /PROGRAMA_REGRESSAR_TETO_CALC\s*=\s*ADICIONAL_SOLIDARIEDADE\.limiar2\.value/,
    );
  });

  it("é pessoal: o cônjuge não herda o estatuto", () => {
    const soA = simularDeclaracaoIRS({
      conjunta: true,
      salarios: { bruto: 40_000 },
      titularB: { salarios: { bruto: 40_000 } },
      programaRegressar: true,
    });
    const ambos = simularDeclaracaoIRS({
      conjunta: true,
      salarios: { bruto: 40_000 },
      titularB: { salarios: { bruto: 40_000 }, programaRegressar: true },
      programaRegressar: true,
    });
    expect(ambos.irsTotal).toBeLessThan(soA.irsTotal);
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  Fase 4 da auditoria — arquitetura, performance, página
//  Estes achados vivem na forma do código, não em números, por isso os
//  testes leem a fonte. É deliberado: são exatamente os que voltam a
//  desaparecer numa refactorização distraída.
// ═══════════════════════════════════════════════════════════════════════

const SIMULADOR = join(RAIZ, "components", "simulador", "SimuladorIRS.tsx");
const PAGINA = join(RAIZ, "app", "ferramentas", "simulador-irs", "page.tsx");
const UI = join(RAIZ, "components", "simulador", "ui.tsx");

describe("F-15 · o comparador não corre a cada tecla", () => {
  it("os quatro cenários vivem num useMemo e o painel usa useDeferredValue", () => {
    const fonte = readFileSync(SIMULADOR, "utf8");
    expect(fonte).toMatch(/useDeferredValue/);
    // As chamadas do comparador têm de estar dentro de um `useMemo`, não no
    // corpo do componente. Procura-se a atribuição memoizada.
    expect(fonte).toMatch(
      /const \{ individual, conjunta, autonoma, englobado \} = useMemo\(/,
    );
  });
});

describe("F-16 · a página não carrega tudo de uma vez", () => {
  it("o simulador e a demo entram por next/dynamic", () => {
    const lazy = readFileSync(
      join(RAIZ, "app", "ferramentas", "simulador-irs", "lazy.tsx"),
      "utf8",
    );
    expect(lazy).toMatch(/from "next\/dynamic"/);
    expect(lazy).toMatch(/ssr:\s*false/);
    // Um esqueleto evita o salto de layout enquanto o pacote não chega.
    expect(lazy).toMatch(/loading:/);
    // E um ErrorBoundary, para uma falha não deixar a página em branco.
    expect(lazy).toMatch(/ErrorBoundary/);
  });

  it("o changelog saiu do bundle do cliente", () => {
    // Eram 113 KB de texto a viajar em todas as páginas por causa de um
    // popup que aparece uma vez por versão.
    const versao = readFileSync(join(RAIZ, "lib", "version.ts"), "utf8");
    expect(versao).not.toMatch(/export const CHANGELOG/);

    // Antes, a garantia era o `import()` dinâmico — o changelog ainda ia para
    // o browser, só que num chunk à parte (173 KB, 58 comprimidos, a parsear
    // antes de mostrar uma linha). Agora não vai de todo: o popup lê JSON
    // estático gerado por `scripts/gen-novidades.mjs`. A verificação passa a
    // ser a forte — o módulo não pode ser referido de maneira nenhuma.
    const modal = readFileSync(join(RAIZ, "components", "ui", "NovidadesModal.tsx"), "utf8");
    expect(modal).not.toMatch(/@\/lib\/changelog/);
    expect(modal).toMatch(/@\/lib\/novidades/);

    const loader = readFileSync(join(RAIZ, "lib", "novidades.ts"), "utf8");
    expect(loader).not.toMatch(/@\/lib\/changelog/);
    expect(loader).toMatch(/\/novidades\/indice\.json/);
  });

  // As regras 10 e 11 do popup (quando aparece, e o que carrega ao entrar)
  // vivem em `novidades-popup.test.ts`, que é só sobre isso.
});

describe("F-17 · JSON-LD completo na página do simulador", () => {
  it("emite FAQ, SoftwareApplication e HowTo", () => {
    const fonte = readFileSync(PAGINA, "utf8");
    for (const schema of [
      "generateFAQSchema",
      "generateSoftwareApplicationSchema",
      "generateHowToSchema",
    ]) {
      expect(fonte, `falta ${schema}`).toMatch(new RegExp(schema));
    }
  });

  it("o BreadcrumbList existe no layout que serve a página", () => {
    // A página TEM breadcrumbs visíveis; sem o schema é um rich result
    // oferecido e não reclamado.
    const layout = readFileSync(join(RAIZ, "app", "ferramentas", "layout.tsx"), "utf8");
    expect(layout).toMatch(/generateBreadcrumbSchema/);
    expect(layout).toMatch(/application\/ld\+json/);
  });
});

describe("F-18 · acessibilidade", () => {
  it("o painel de resultado é anunciado (WCAG 4.1.3)", () => {
    const fonte = readFileSync(SIMULADOR, "utf8");
    expect(fonte).toMatch(/role="status"[\s\S]{0,80}aria-live="polite"/);
    expect(fonte).toMatch(/aria-atomic="true"/);
  });

  it("os grupos de opção são radiogroups com teclado a sério", () => {
    const fonte = readFileSync(UI, "utf8");
    expect(fonte).toMatch(/<fieldset/);
    expect(fonte).toMatch(/<legend/);
    expect(fonte).toMatch(/role="radiogroup"/);
    expect(fonte).toMatch(/role="radio"/);
    expect(fonte).toMatch(/aria-checked=/);
    // Declarar o papel sem as setas e sem o tabindex rotativo é prometer um
    // comportamento que não existe — e um leitor de ecrã anuncia a promessa.
    expect(fonte).toMatch(/ArrowRight/);
    expect(fonte).toMatch(/ArrowLeft/);
    expect(fonte).toMatch(/tabIndex=\{indice === indiceAtivo \? 0 : -1\}/);
  });

  it("os campos inválidos dizem-no a quem não vê a borda vermelha", () => {
    const fonte = readFileSync(SIMULADOR, "utf8");
    expect(fonte).toMatch(/aria-invalid=\{nifMau \|\| undefined\}/);
    expect(fonte).toMatch(/aria-describedby=\{nifMau \? "c-nif-erro"/);
  });

  it("cada etapa é um grupo com nome", () => {
    const fonte = readFileSync(SIMULADOR, "utf8");
    expect(fonte).toMatch(/role="group"/);
    expect(fonte).toMatch(/aria-current=\{active \? "step" : undefined\}/);
  });
});

describe("F-19/F-20 · H1 e caminho a seguir", () => {
  it("o H1 leva a query principal", () => {
    const fonte = readFileSync(PAGINA, "utf8");
    const h1 = fonte.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    expect(h1).not.toBeNull();
    expect(h1![1]).toMatch(/Simulador de IRS 2026/);
  });

  it("o resultado sugere sempre um passo seguinte, com ou sem categoria B", () => {
    const fonte = readFileSync(SIMULADOR, "utf8");
    expect(fonte).toMatch(/function ProximosPassos/);
    // O ramo de quem só tem salário — metade dos casos possíveis desta
    // ferramenta, e o que ficava sem caminho nenhum.
    expect(fonte).toMatch(/temCatA && !temCatB/);
    expect(fonte).toMatch(/\/ferramentas\/recibo-vencimento/);
    expect(fonte).toMatch(/\/ferramentas\/mapa-contabilistas/);
  });
});

describe("F-21/F-22 · higiene dos dados fiscais", () => {
  it("o mínimo de existência é derivado, não fundamentado na RMMG", () => {
    const fonte = readFileSync(join(RAIZ, "lib", "fiscal-data.ts"), "utf8");
    expect(fonte).toMatch(/MINIMO_EXISTENCIA_PISO/);
    expect(fonte).toMatch(/MINIMO_EXISTENCIA_IAS_MULT/);
    // A base legal deixou de dizer «RMMG × 14», que é o que a lei NÃO diz.
    expect(fonte).not.toMatch(/mínimo de existência 2026 \(RMMG/);
  });

  it("`fiscal:check` não acusa datas divergentes", () => {
    const fonte = readFileSync(join(RAIZ, "lib", "fiscal-data.ts"), "utf8");
    const revisao = fonte.match(/DATA_LAST_REVIEW = "(\d{4}-\d{2}-\d{2})"/);
    expect(revisao).not.toBeNull();
    // Nenhum `lastVerified` pode ser posterior à revisão declarada.
    const datas = [...fonte.matchAll(/"(\d{4}-\d{2}-\d{2})"/g)].map((m) => m[1]);
    const maisRecente = datas.sort().at(-1)!;
    expect(maisRecente <= revisao![1]).toBe(true);
  });
});
