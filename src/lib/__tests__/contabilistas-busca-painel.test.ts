// ═══════════════════════════════════════════════════════════════════════
//  A PESQUISA DO PAINEL — o que ela tem de saber responder
//  ---------------------------------------------------------------------
//  A versão anterior era um `includes()`: não perdoava um acento, não
//  perdoava uma gralha e nunca dizia «não encontrei». Estes testes fixam
//  o que mudou — e, tão importante, que a ordem é determinística: dois
//  carregamentos com os mesmos dados dão a mesma lista, sempre.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  agruparPorTipo, pesquisarNoPainel, pontuarRegisto, ROTULO_DO_TIPO,
  sugestoesDeEntrada, type RegistoDoPainel,
} from "@/lib/contabilistas/busca";

const registo = (p: Partial<RegistoDoPainel> & { id: string; titulo: string }): RegistoDoPainel => ({
  tipo: "cliente",
  aliases: [],
  descricao: "",
  href: "/contabilista/clientes",
  prioridade: 50,
  ...p,
});

const CLIENTES: RegistoDoPainel[] = [
  registo({ id: "c1", titulo: "José Marques", aliases: ["jose@exemplo.pt"] }),
  registo({ id: "c2", titulo: "Maria Ferreira", descricao: "Acompanhamento ativo" }),
  registo({ id: "c3", titulo: "Marta Nunes", descricao: "Pedido por responder", distintivo: "Por responder", prioridade: 90 }),
];

const CASOS: RegistoDoPainel[] = [
  registo({
    id: "k1", tipo: "caso", titulo: "Liquidação adicional de IRS",
    aliases: ["RC-2026-0184", "Raquel Alves", "299000018"],
    descricao: "Recebi uma nota de liquidação com mais 1.240 € do que tinha entregado.",
    prioridade: 95, distintivo: "Sem proposta",
  }),
];

describe("encontrar o que se procura", () => {
  it("ignora acentos nos dois sentidos", () => {
    expect(pesquisarNoPainel("jose", CLIENTES).map((r) => r.registo.id)).toContain("c1");
    expect(pesquisarNoPainel("liquidacao", CASOS).map((r) => r.registo.id)).toContain("k1");
  });

  it("perdoa UMA gralha em palavras longas", () => {
    // «ferreia» → «ferreira»: falta uma letra. Uma edição, sete letras.
    expect(pesquisarNoPainel("ferreia", CLIENTES).map((r) => r.registo.id)).toContain("c2");
    // Duas edições já não: «ferreria» troca duas letras de sítio, e a
    // tolerância pára em uma de propósito — ver `distanciaAteUm`.
    expect(pesquisarNoPainel("ferreria", CLIENTES).map((r) => r.registo.id)).not.toContain("c2");
  });

  it("não perdoa gralhas em palavras curtas", () => {
    // «ira» não pode encontrar «IRS»: são perguntas diferentes.
    const ids = pesquisarNoPainel("ira", CASOS).map((r) => r.registo.id);
    expect(ids).not.toContain("k1");
  });

  it("encontra pela referência e pelo NIF, que é como se procura um caso", () => {
    expect(pesquisarNoPainel("RC-2026-0184", CASOS).map((r) => r.registo.id)).toContain("k1");
    expect(pesquisarNoPainel("299000018", CASOS).map((r) => r.registo.id)).toContain("k1");
  });

  it("o nome exato ganha a quem só o menciona na descrição", () => {
    const registos = [
      registo({ id: "a", titulo: "Maria Ferreira" }),
      registo({ id: "b", titulo: "Rui Santos", descricao: "Indicado por Maria Ferreira" }),
    ];
    expect(pesquisarNoPainel("maria ferreira", registos)[0].registo.id).toBe("a");
  });

  it("responder a metade da pergunta vale menos do que responder a toda", () => {
    const registos = [
      registo({ id: "meia", titulo: "Fecho trimestral" }),
      registo({ id: "toda", titulo: "Fecho trimestral de IVA" }),
    ];
    const r = pesquisarNoPainel("fecho trimestral iva", registos);
    expect(r[0].registo.id).toBe("toda");
  });
});

describe("não encontrar também é uma resposta", () => {
  it("uma letra não é uma pesquisa", () => {
    expect(pesquisarNoPainel("j", CLIENTES)).toHaveLength(0);
  });

  it("o que não tem nada a ver não aparece a preencher a lista", () => {
    expect(pesquisarNoPainel("helicóptero", [...CLIENTES, ...CASOS])).toHaveLength(0);
  });

  it("uma subcadeia a meio de uma palavra não conta como resultado", () => {
    // «mestral» está dentro de «trimestral», mas não começa numa fronteira
    // de palavra nem está a uma edição de distância. Sem esta regra,
    // qualquer sufixo comum encontrava meio painel.
    const tarefa = registo({ id: "t1", tipo: "tarefa", titulo: "Fecho trimestral" });
    expect(pontuarRegisto("mestral", tarefa)).toBeNull();
  });
});

describe("a ordem não muda entre carregamentos", () => {
  it("empates desfazem-se sempre da mesma maneira", () => {
    const a = [registo({ id: "z", titulo: "Fecho mensal" }), registo({ id: "a", titulo: "Fecho mensal" })];
    const b = [...a].reverse();
    expect(pesquisarNoPainel("fecho mensal", a).map((r) => r.registo.id))
      .toEqual(pesquisarNoPainel("fecho mensal", b).map((r) => r.registo.id));
  });

  it("o grupo vale o seu melhor resultado, e não uma ordem fixa", () => {
    const registos = [
      registo({ id: "nav", tipo: "navegacao", titulo: "Clientes", prioridade: 30 }),
      registo({ id: "cli", tipo: "cliente", titulo: "Cliente Silva" }),
    ];
    // «Clientes» é o título exato do atalho: o grupo dele vem à frente.
    const grupos = agruparPorTipo(pesquisarNoPainel("clientes", registos));
    expect(grupos[0][0]).toBe("navegacao");
  });
});

describe("antes de se escrever seja o que for", () => {
  it("mostra o que está à espera de alguém, e não um histórico", () => {
    const sugestoes = sugestoesDeEntrada([...CLIENTES, ...CASOS]);
    expect(sugestoes.map((s) => s.id)).toEqual(["k1", "c3"]);
    // Navegação não entra aqui: já tem grupo próprio no ecrã.
    expect(sugestoes.every((s) => s.tipo !== "navegacao")).toBe(true);
  });

  it("todos os tipos têm nome legível", () => {
    for (const tipo of ["navegacao", "cliente", "caso", "tarefa", "consulta", "partilha"] as const) {
      expect(ROTULO_DO_TIPO[tipo]).toBeTruthy();
    }
  });
});

describe("o que a paleta não faz", () => {
  const fonte = readFileSync(
    join(process.cwd(), "src/components/contabilistas/BuscaDoPainel.tsx"), "utf8",
  );

  it("não guarda no dispositivo o que se escreveu", () => {
    // No painel, o termo de pesquisa é o nome de um cliente.
    expect(fonte).not.toContain("localStorage");
    expect(fonte).not.toContain("sessionStorage");
  });

  it("usa o motor do site, e não um segundo `includes`", () => {
    expect(fonte).toContain("pesquisarNoPainel");
    expect(fonte).not.toMatch(/\.includes\(termo\)/);
  });

  it("prende o foco e devolve-o ao campo que a abriu", () => {
    expect(fonte).toContain("SuperficieModal");
    expect(fonte).toContain("focoDeRegresso");
    expect(fonte).toContain("focoInicial");
  });

  it("anuncia quantos resultados há a quem não vê a lista", () => {
    expect(fonte).toContain('role="status"');
    expect(fonte).toContain('aria-live="polite"');
    expect(fonte).toContain("aria-activedescendant");
  });

  it("carrega o índice só quando a paleta abre", () => {
    expect(fonte).toContain("if (d === null) void carregar()");
  });
});
