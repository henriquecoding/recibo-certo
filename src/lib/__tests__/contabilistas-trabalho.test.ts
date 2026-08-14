import { describe, expect, it } from "vitest";
import { progressoDe, urgenciaDe, COLUNAS, type Tarefa } from "@/lib/contabilistas/trabalho";

const tarefa = (over: Partial<Tarefa> = {}): Tarefa => ({
  id: "t", vinculoId: null, titulo: "Entregar o IVA", notas: null,
  estado: "por_tratar", prazo: null, etiquetas: [], obrigacao: null, ordem: 0,
  passos: [], ...over,
});

describe("trabalho: o progresso são passos, nunca percentagem", () => {
  it("diz «3 de 5 passos»", () => {
    const t = tarefa({
      passos: [
        { id: "1", texto: "a", feito: true, ordem: 1 },
        { id: "2", texto: "b", feito: true, ordem: 2 },
        { id: "3", texto: "c", feito: true, ordem: 3 },
        { id: "4", texto: "d", feito: false, ordem: 4 },
        { id: "5", texto: "e", feito: false, ordem: 5 },
      ],
    });
    expect(progressoDe(t).rotulo).toBe("3 de 5 passos");
    expect(progressoDe(t).feitos).toBe(3);
  });

  it("um passo só é «passo», não «passos»", () => {
    const t = tarefa({ passos: [{ id: "1", texto: "a", feito: false, ordem: 1 }] });
    expect(progressoDe(t).rotulo).toBe("0 de 1 passo");
  });

  it("sem passos não inventa progresso nenhum", () => {
    // Um IVA sem passos definidos não está «0% feito» — não se sabe, e o
    // rótulo tem de ser ausente em vez de zero.
    expect(progressoDe(tarefa()).rotulo).toBeNull();
  });

  it("nunca produz uma percentagem", () => {
    for (let feitos = 0; feitos <= 4; feitos++) {
      const passos = Array.from({ length: 4 }, (_, i) => ({
        id: String(i), texto: "x", feito: i < feitos, ordem: i,
      }));
      expect(progressoDe(tarefa({ passos })).rotulo).not.toMatch(/%/);
    }
  });
});

describe("trabalho: urgência do prazo", () => {
  const hoje = new Date("2026-08-13T09:00:00Z");

  it("classifica pela decisão que muda, não pelo número de dias", () => {
    expect(urgenciaDe("2026-08-12", hoje)).toBe("atrasado");
    expect(urgenciaDe("2026-08-13", hoje)).toBe("hoje");
    expect(urgenciaDe("2026-08-14", hoje)).toBe("amanha");
    expect(urgenciaDe("2026-08-18", hoje)).toBe("esta_semana");
    expect(urgenciaDe("2026-09-30", hoje)).toBe("folgado");
    expect(urgenciaDe(null, hoje)).toBe("sem_prazo");
  });

  it("uma data ilegível não vira urgência", () => {
    expect(urgenciaDe("amanhã", hoje)).toBe("sem_prazo");
    expect(urgenciaDe("", hoje)).toBe("sem_prazo");
  });

  it("a fronteira dos sete dias é estável à hora do dia", () => {
    for (const h of ["00:01", "12:00", "23:59"]) {
      const agora = new Date(`2026-08-13T${h}:00Z`);
      expect(urgenciaDe("2026-08-13", agora), h).toBe("hoje");
      expect(urgenciaDe("2026-08-20", agora), h).toBe("esta_semana");
    }
  });
});

describe("trabalho: as colunas", () => {
  it("«à espera do cliente» vem em segundo — é onde o trabalho pára", () => {
    // A ordem não é alfabética nem cronológica: é a do olhar. Se esta
    // coluna descer para o fim, o trabalho parado volta a esconder-se.
    expect(COLUNAS[1].id).toBe("espera_cliente");
  });

  it("são quatro, e cada uma diz o que quer dizer", () => {
    expect(COLUNAS).toHaveLength(4);
    for (const c of COLUNAS) {
      expect(c.rotulo.length, c.id).toBeGreaterThan(2);
      expect(c.ajuda.length, c.id).toBeGreaterThan(5);
    }
  });
});
