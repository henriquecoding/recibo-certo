import { describe, it, expect } from "vitest";
import {
  avaliarPreenchimento,
  essenciaisDe,
  cenarioPorChave,
  CENARIOS_INICIAIS,
  type CenarioInicial,
} from "@/lib/pricing";

// ═══════════════════════════════════════════════════════════════════════
//  A CONFIANÇA NÃO É UM BOOLEANO
//  ---------------------------------------------------------------------
//  Havia um `tocado`, e um booleano vira-se com uma tecla: escrever um
//  dígito no volume fazia o cartão deixar de dizer «Um exemplo, por
//  enquanto» e passar a dizer «QUANTO DEVES COBRAR», com autoridade de
//  conselho, por cima de vinte e cinco pressupostos por confirmar.
//
//  Estes testes prendem a regra que o substituiu: a confiança sai da
//  lista do que o cenário considera essencial, e só chega a `completo`
//  quando essa lista fica vazia.
// ═══════════════════════════════════════════════════════════════════════

const nada = new Set<string>();

describe("os essenciais saem do cenário, não de uma lista paralela", () => {
  it("todos os cenários declaram pelo menos um campo essencial", () => {
    for (const c of CENARIOS_INICIAIS) {
      expect(essenciaisDe(c).length, `${c} não tem essenciais`).toBeGreaterThan(0);
    }
  });

  it("e cada pergunta do modo rápido traduz-se em campos concretos", () => {
    // Se `perguntas.ts` ganhar uma pergunta nova e ninguém a mapear, ela
    // deixa de contar para a confiança em silêncio — e o resultado passa
    // a dizer-se completo sem ela.
    for (const c of CENARIOS_INICIAIS) {
      const perguntas = cenarioPorChave(c).rapido.length;
      const campos = essenciaisDe(c).length;
      expect(campos, `${c}: ${perguntas} perguntas rápidas mas ${campos} campos`).toBeGreaterThanOrEqual(perguntas);
    }
  });

  it("sem ids repetidos dentro do mesmo cenário", () => {
    for (const c of CENARIOS_INICIAIS) {
      const campos = essenciaisDe(c);
      expect(new Set(campos).size, `${c} repete um campo`).toBe(campos.length);
    }
  });
});

describe("os três estados", () => {
  const ctxDe = (c: CenarioInicial) => cenarioPorChave(c).contexto();

  it("sem nada respondido é um exemplo", () => {
    const p = avaliarPreenchimento(ctxDe("produto_revenda"), nada);
    expect(p.estado).toBe("exemplo");
    expect(p.respondidos).toBe(0);
  });

  it("com parte respondida é uma estimativa — e diz quantos faltam", () => {
    const ctx = ctxDe("produto_revenda");
    const p = avaliarPreenchimento(ctx, new Set(["custo-direto"]));
    expect(p.estado).toBe("estimado");
    expect(p.faltam.length).toBe(essenciaisDe("produto_revenda").length - 1);
    expect(p.faltam).not.toContain("custo-direto");
  });

  it("uma tecla num campo NÃO chega para o resultado se dizer completo", () => {
    // É o defeito, na sua forma mais pura.
    for (const c of CENARIOS_INICIAIS) {
      const primeiro = essenciaisDe(c)[0];
      const p = avaliarPreenchimento(ctxDe(c), new Set([primeiro]));
      if (essenciaisDe(c).length > 1) {
        expect(p.estado, `${c} passou a completo com um campo só`).toBe("estimado");
      }
    }
  });

  it("com o essencial todo respondido é completo, e não sobra pressuposto", () => {
    for (const c of CENARIOS_INICIAIS) {
      const p = avaliarPreenchimento(ctxDe(c), new Set(essenciaisDe(c)));
      expect(p.estado, c).toBe("completo");
      expect(p.faltam, c).toEqual([]);
      expect(p.pressupostos, c).toEqual([]);
    }
  });

  it("responder a campos avançados não promove o resultado a completo", () => {
    // Alguém que abra o bloco fiscal e preencha a faturação anual mexeu no
    // contexto, mas não respondeu ao que este cenário considera essencial.
    const p = avaliarPreenchimento(ctxDe("produto_revenda"), new Set(["faturacao-anual", "regiao"]));
    expect(p.estado).toBe("estimado");
    expect(p.faltam.length).toBe(essenciaisDe("produto_revenda").length);
  });
});

describe("os pressupostos são úteis, não decorativos", () => {
  it("cada campo em falta traz rótulo, valor assumido e o porquê", () => {
    for (const c of CENARIOS_INICIAIS) {
      const p = avaliarPreenchimento(cenarioPorChave(c).contexto(), nada);
      for (const press of p.pressupostos) {
        expect(press.rotulo.length, `${c}/${press.campo}`).toBeGreaterThan(3);
        expect(press.valor.length, `${c}/${press.campo}`).toBeGreaterThan(0);
        expect(press.porque.length, `${c}/${press.campo}`).toBeGreaterThan(10);
      }
    }
  });

  it("todos os campos essenciais têm um pressuposto — nenhum fica mudo", () => {
    // Um campo em falta sem explicação é um campo que a pessoa nunca vai
    // saber que existe.
    for (const c of CENARIOS_INICIAIS) {
      const p = avaliarPreenchimento(cenarioPorChave(c).contexto(), nada);
      expect(
        p.pressupostos.map((x) => x.campo).sort(),
        `${c} tem campos essenciais sem pressuposto declarado`,
      ).toEqual([...p.faltam].sort());
    }
  });

  it("o valor assumido é o que está mesmo no contexto", () => {
    const ctx = cenarioPorChave("produto_revenda").contexto();
    ctx.volume.unidadesMes = 137;
    const volume = avaliarPreenchimento(ctx, nada).pressupostos.find((p) => p.campo === "volume");
    expect(volume?.valor).toBe("137");
  });
});
