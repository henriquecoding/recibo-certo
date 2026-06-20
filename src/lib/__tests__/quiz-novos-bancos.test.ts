import { describe, it, expect } from "vitest";
import { QUIZ_PERGUNTAS } from "../quiz-fiscal";
import { getEstatisticasBanco } from "../quiz-fiscal/index";

describe("novos bancos do quiz", () => {
  it("ids únicos e opções válidas", () => {
    const ids = new Set<string>();
    for (const p of QUIZ_PERGUNTAS) {
      expect(ids.has(p.id), `id duplicado: ${p.id}`).toBe(false);
      ids.add(p.id);
      expect(p.correta).toBeGreaterThanOrEqual(0);
      expect(p.correta).toBeLessThan(p.opcoes.length);
      // Verificações estritas só nos novos bancos (dep-* / emp-*).
      if (p.id.startsWith("dep-") || p.id.startsWith("emp-")) {
        expect(p.opcoes.length, `opções != 4 em ${p.id}`).toBe(4);
        const textos = new Set(p.opcoes.map((o) => o.texto));
        expect(textos.size, `opções repetidas em ${p.id}`).toBe(4);
        expect(p.opcoes[p.correta].porque.startsWith("Correto"), `correta sem 'Correto' em ${p.id}`).toBe(true);
      }
    }
  });
  it("cada nova categoria tem cobertura suficiente e dificuldades", () => {
    const e = getEstatisticasBanco();
    const novas = ["dep_irs","dep_ss","dep_subsidios","empresa_criacao","empresa_legislacao","empresa_fiscalidade"] as const;
    for (const c of novas) {
      // Banco robusto (~100) e pelo menos algumas perguntas em cada dificuldade.
      expect(e[c].total, `${c} com poucas perguntas`).toBeGreaterThanOrEqual(85);
      expect(e[c].facil, `${c} sem perguntas fáceis`).toBeGreaterThan(0);
      expect(e[c].medio, `${c} sem perguntas médias`).toBeGreaterThan(0);
      expect(e[c].dificil, `${c} sem perguntas difíceis`).toBeGreaterThan(0);
    }
  });
});
