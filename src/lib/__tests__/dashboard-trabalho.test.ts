import { readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import {
  accaoAgora,
  agregar,
  deduplicar,
  emCurso,
  itemDaEtapa,
  ordenar,
} from "@/lib/dashboard/work-items/agregar";
import { ETAPAS } from "@/lib/dashboard/etapas";
import {
  ICONE_TIPO,
  LEITURA_VAZIA,
  ROTULO_ESTADO,
  ROTULO_TIPO,
  type ItemTrabalho,
  type TipoTrabalho,
} from "@/lib/dashboard/work-items/tipos";
import { CHAVES_ICONES } from "@/components/ferramentas/icon-map";

// ═══════════════════════════════════════════════════════════════════════
//  O CONTRATO DE TRABALHO EM CURSO
//  ---------------------------------------------------------------------
//  Duas famílias de garantias, e as duas são estruturais:
//
//   · a REGRA — ordenação estável, deduplicação, prioridade do «Agora»;
//   · a FRONTEIRA — a visão geral não pode importar motor nenhum para
//     desenhar três cartões (PERF-02).
// ═══════════════════════════════════════════════════════════════════════

const SRC = join(__dirname, "..", "..");

const item = (p: Partial<ItemTrabalho> & { id: string; tipo: TipoTrabalho; atualizadoEm: string }): ItemTrabalho => ({
  titulo: "Um item",
  estado: "por-completar",
  href: "/dashboard",
  fonte: "dispositivo",
  proximaAccao: { label: "Continuar", href: "/dashboard" },
  versaoEsquema: 1,
  ...p,
});

describe("dashboard:trabalho — ordenar e deduplicar", () => {
  it("ordena do mais recente para o mais antigo", () => {
    const r = ordenar([
      item({ id: "a", tipo: "preco", atualizadoEm: "2026-01-01T10:00:00.000Z" }),
      item({ id: "b", tipo: "preco", atualizadoEm: "2026-03-01T10:00:00.000Z" }),
    ]);
    expect(r.map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("desempata por id, para a lista não dançar entre renders", () => {
    const mesmoInstante = "2026-03-01T10:00:00.000Z";
    const entrada = [
      item({ id: "z", tipo: "preco", atualizadoEm: mesmoInstante }),
      item({ id: "a", tipo: "preco", atualizadoEm: mesmoInstante }),
    ];
    expect(ordenar(entrada).map((x) => x.id)).toEqual(["a", "z"]);
    // E duas vezes seguidas dá o mesmo — que é o que «estável» quer dizer.
    expect(ordenar(ordenar(entrada)).map((x) => x.id)).toEqual(["a", "z"]);
  });

  it("o projeto de negócio local e o cenário guardado são o MESMO projeto", () => {
    const r = deduplicar([
      item({ id: "negocio:rascunho", tipo: "negocio", atualizadoEm: "2026-01-01T10:00:00.000Z" }),
      item({ id: "cenario:xyz", tipo: "negocio", atualizadoEm: "2026-05-01T10:00:00.000Z", fonte: "conta" }),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe("cenario:xyz");
  });

  it("mas duas contratações são duas decisões, e ficam as duas", () => {
    const r = deduplicar([
      item({ id: "cenario:a", tipo: "contratacao", atualizadoEm: "2026-01-01T10:00:00.000Z" }),
      item({ id: "cenario:b", tipo: "contratacao", atualizadoEm: "2026-05-01T10:00:00.000Z" }),
    ]);
    expect(r).toHaveLength(2);
  });

  it("«em curso» é o que se pode retomar — nunca o que já foi decidido", () => {
    expect(emCurso(item({ id: "1", tipo: "preco", atualizadoEm: "2026-01-01T00:00:00.000Z", estado: "rascunho" }))).toBe(true);
    expect(emCurso(item({ id: "2", tipo: "preco", atualizadoEm: "2026-01-01T00:00:00.000Z", estado: "em-teste" }))).toBe(true);
    expect(emCurso(item({ id: "3", tipo: "preco", atualizadoEm: "2026-01-01T00:00:00.000Z", estado: "concluido" }))).toBe(false);
  });

  it("o cartão de uma etapa mostra o item mais recente dessa etapa", () => {
    const itens = [
      item({ id: "p1", tipo: "preco", atualizadoEm: "2026-01-01T00:00:00.000Z" }),
      item({ id: "p2", tipo: "preco", atualizadoEm: "2026-06-01T00:00:00.000Z" }),
      item({ id: "d1", tipo: "descoberta", atualizadoEm: "2026-02-01T00:00:00.000Z" }),
    ];
    expect(itemDaEtapa(itens, "preco")?.id).toBe("p2");
    expect(itemDaEtapa(itens, "contratacao")).toBeNull();
  });
});

describe("dashboard:trabalho — a regra do «Agora»", () => {
  const vazio = agregar([LEITURA_VAZIA]);

  it("um prazo a fechar ganha a tudo o resto", () => {
    const comTrabalho = agregar([
      { itens: [item({ id: "x", tipo: "preco", atualizadoEm: "2026-06-01T00:00:00.000Z" })], falhas: [] },
    ]);
    const r = accaoAgora(comTrabalho, { prazo: { titulo: "Pagamento de IVA", dias: 3 } });
    expect(r.motivo).toBe("prazo");
    expect(r.href).toBe("/dashboard/prazos");
  });

  it("um prazo em atraso di-lo, em vez de contar dias negativos", () => {
    const r = accaoAgora(vazio, { prazo: { titulo: "Pagamento de IVA", dias: -2 } });
    expect(r.descricao).toContain("já passou");
  });

  it("uma leitura falhada vem antes do trabalho — e nunca diz «não tens nada»", () => {
    const comFalha = agregar([
      { itens: [item({ id: "x", tipo: "preco", atualizadoEm: "2026-06-01T00:00:00.000Z" })], falhas: [{ dominio: "preco" }] },
    ]);
    const r = accaoAgora(comFalha);
    expect(r.motivo).toBe("leitura-falhou");
    expect(r.descricao).toContain("continuam no dispositivo");
  });

  it("com trabalho a meio, a ação é retomá-lo", () => {
    const a = agregar([
      {
        itens: [
          item({
            id: "x",
            tipo: "preco",
            atualizadoEm: "2026-06-01T00:00:00.000Z",
            proximaAccao: { label: "Continuar cálculo", href: "/dashboard/precos/novo" },
          }),
        ],
        falhas: [],
      },
    ]);
    const r = accaoAgora(a, { perfilFiscalCompleto: true });
    expect(r.motivo).toBe("trabalho-incompleto");
    expect(r.href).toBe("/dashboard/precos/novo");
  });

  it("um preço com regras anteriores não é «retomar» — é «ver o que mudou»", () => {
    const a = agregar([
      {
        itens: [
          item({
            id: "x",
            tipo: "preco",
            atualizadoEm: "2026-06-01T00:00:00.000Z",
            estado: "desatualizado",
            proximaAccao: { label: "Ver o que mudou", href: "/dashboard/precos/x" },
          }),
        ],
        falhas: [],
      },
    ]);
    expect(accaoAgora(a, { perfilFiscalCompleto: true }).motivo).toBe("preco-desatualizado");
  });

  it("sem nada em curso, pede o perfil fiscal antes de sugerir um primeiro passo", () => {
    expect(accaoAgora(vazio, { perfilFiscalCompleto: false }).motivo).toBe("perfil-fiscal");
  });

  it("uma conta nova é convidada a decidir, não a registar um recibo que não tem", () => {
    const r = accaoAgora(vazio, { perfilFiscalCompleto: true, temRecibos: false });
    expect(r.motivo).toBe("primeiro-passo");
    expect(r.href).toBe("/dashboard/descobrir");
  });

  it("quem já regista recibos recebe a continuação disso", () => {
    const r = accaoAgora(vazio, { perfilFiscalCompleto: true, temRecibos: true });
    expect(r.href).toBe("/dashboard/recibos-verdes");
  });
});

describe("dashboard:trabalho — o vocabulário é fechado e está todo traduzido", () => {
  it("cada tipo tem rótulo em pt-PT e ícone que existe", () => {
    for (const [tipo, icone] of Object.entries(ICONE_TIPO)) {
      expect(CHAVES_ICONES, `${tipo} usa um ícone inexistente`).toContain(icone);
      expect(ROTULO_TIPO[tipo as TipoTrabalho].length).toBeGreaterThan(2);
    }
  });

  it("cada estado tem rótulo, porque um cartão nunca mostra o enum", () => {
    for (const rotulo of Object.values(ROTULO_ESTADO)) {
      expect(rotulo.length).toBeGreaterThan(2);
      expect(rotulo).not.toMatch(/[a-z]+-[a-z]+/); // nada de `por-completar` no ecrã
    }
  });

  it("as quatro etapas do negócio têm todas um tipo de trabalho e copy de estado vazio", () => {
    expect(ETAPAS.map((e) => e.tipo)).toEqual(["descoberta", "preco", "negocio", "contratacao"]);
    for (const e of ETAPAS) {
      expect(e.vazio.label.length).toBeGreaterThan(3);
      expect(e.vazio.descricao.length).toBeGreaterThan(10);
      expect(e.resultado.length).toBeGreaterThan(20);
    }
  });
});

// ─── A fronteira de imports (PERF-02) ──────────────────────────────────

function resolver(deQue: string, especificador: string): string | null {
  if (!especificador.startsWith(".") && !especificador.startsWith("@/")) return null;
  const base = especificador.startsWith("@/")
    ? join(SRC, especificador.slice(2))
    : join(deQue, "..", especificador);
  for (const sufixo of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const caminho = `${base}${sufixo}`;
    try {
      if (statSync(caminho).isFile()) return caminho;
    } catch {
      /* segue */
    }
  }
  return null;
}

const IMPORT_ESTATICO = /^\s*import\s+(?!type\s)(?:[^"';]*?\s+from\s+)?["']([^"']+)["']/gm;
const IMPORT_DINAMICO = /\bimport\(\s*["']([^"']+)["']\s*\)/g;

function grafoEstatico(entradas: string[]): Set<string> {
  const vistos = new Set<string>();
  const porVer = [...entradas];
  while (porVer.length) {
    const ficheiro = porVer.pop()!;
    if (vistos.has(ficheiro)) continue;
    vistos.add(ficheiro);
    let fonte: string;
    try {
      fonte = readFileSync(ficheiro, "utf8");
    } catch {
      continue;
    }
    const semDinamicos = fonte.replace(IMPORT_DINAMICO, "import(DINAMICO)");
    for (const m of semDinamicos.matchAll(IMPORT_ESTATICO)) {
      const destino = resolver(ficheiro, m[1]);
      if (destino) porVer.push(destino);
    }
  }
  return vistos;
}

describe("dashboard:fronteira — a visão geral não paga os motores", () => {
  // ┌───────────────────────────────────────────────────────────────────┐
  // │ O DEFEITO QUE ISTO IMPEDE                                          │
  // │                                                                   │
  // │ Para desenhar «tens um cálculo de preço a meio» bastava importar   │
  // │ a store de preço — e a store importa o motor para validar o que    │
  // │ lê. Uma linha, e a página mais leve do produto passava a carregar  │
  // │ a engine de preço, o motor de descoberta e os datasets de mercado. │
  // │                                                                   │
  // │ Os adaptadores leem o cofre em bruto por causa disto. Se alguém    │
  // │ voltar a ligar a visão geral a um motor, é aqui que reprova.       │
  // └───────────────────────────────────────────────────────────────────┘
  const grafo = grafoEstatico([
    join(SRC, "app", "dashboard", "page.tsx"),
    join(SRC, "app", "dashboard", "layout.tsx"),
  ]);
  const nomes = [...grafo].map((f) => relative(SRC, f));

  const proibidos: Array<[string, string]> = [
    ["lib/pricing/", "a engine de formação de preço"],
    ["lib/negocio/descoberta/", "o motor de descoberta"],
    ["lib/negocio/market/", "os datasets de mercado"],
  ];

  for (const [prefixo, nome] of proibidos) {
    it(`não arrasta ${nome}`, () => {
      expect(nomes.filter((n) => n.startsWith(prefixo))).toEqual([]);
    });
  }

  it("os adaptadores leem o cofre em bruto, e não pelas stores dos motores", () => {
    const adaptadores = grafoEstatico([join(SRC, "lib", "dashboard", "useTrabalhoDashboard.ts")]);
    const nomesAdaptadores = [...adaptadores].map((f) => relative(SRC, f));
    expect(nomesAdaptadores).not.toContain("lib/store/perfil-descoberta.ts");
    expect(nomesAdaptadores).not.toContain("lib/store/hipoteses-mercado.ts");
    expect(nomesAdaptadores).not.toContain("lib/store/preco.ts");
    expect(nomesAdaptadores).not.toContain("lib/store/negocio.ts");
  });

  it("o agregador é puro: nem React, nem cofre, nem catálogo", () => {
    const fonte = readFileSync(join(SRC, "lib", "dashboard", "work-items", "agregar.ts"), "utf8");
    const imports = [...fonte.matchAll(IMPORT_ESTATICO)].map((m) => m[1]);
    expect(imports).toEqual([]);
    expect(fonte).not.toContain('"use client"');
  });
});

describe("dashboard:privacidade — o evento de mudança não transporta dados", () => {
  it("só viaja o nome do domínio", () => {
    const fonte = readFileSync(join(SRC, "lib", "dashboard", "eventos.ts"), "utf8");
    // O `detail` do CustomEvent é construído numa linha e é esta.
    expect(fonte).toContain("detail: { dominio }");
    for (const proibido of ["contexto:", "valor:", "titulo:", "payload:"]) {
      expect(fonte, `o evento ganhou um campo "${proibido}"`).not.toContain(proibido);
    }
  });

  it("os adaptadores não põem montantes no subtítulo de uma hipótese", () => {
    // O título de uma hipótese compõe-se das competências e da zona de
    // quem a criou: é perfil, e perfil não sai do workspace (§10.5).
    const fonte = readFileSync(join(SRC, "lib", "dashboard", "work-items", "descoberta.ts"), "utf8");
    expect(fonte).toContain('titulo: "Hipótese em teste"');
  });
});
