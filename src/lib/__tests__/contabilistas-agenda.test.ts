import { describe, expect, it } from "vitest";
import {
  FUSO_PT,
  agruparPorDia,
  diaLocal,
  disponibilidadePorOmissao,
  gerarSlots,
  horaLocal,
  instanteDeLocal,
  minutosDeHora,
  partesLocais,
  rotularDia,
  type RegraDisponibilidade,
  tempoAte,
} from "@/lib/contabilistas/agenda";

// 2026-08-17 é uma segunda-feira de verão (Lisboa em UTC+1).
// 2026-01-19 é uma segunda-feira de inverno (Lisboa em UTC+0).
const SEGUNDA_VERAO = "2026-08-17";
const SEGUNDA_INVERNO = "2026-01-19";

const regraSegunda = (over: Partial<RegraDisponibilidade> = {}): RegraDisponibilidade => ({
  diaSemana: 1, inicio: "09:00", fim: "12:00", duracaoMin: 60, ...over,
});

describe("agenda: fuso horário", () => {
  it("converte hora de parede em instante no verão (UTC+1)", () => {
    const i = instanteDeLocal(2026, 8, 17, 9, 0);
    expect(i.toISOString()).toBe("2026-08-17T08:00:00.000Z");
  });

  it("converte hora de parede em instante no inverno (UTC+0)", () => {
    const i = instanteDeLocal(2026, 1, 19, 9, 0);
    expect(i.toISOString()).toBe("2026-01-19T09:00:00.000Z");
  });

  it("faz a viagem de ida e volta em qualquer altura do ano", () => {
    for (const [m, d] of [[1, 15], [3, 29], [6, 1], [10, 25], [12, 31]] as const) {
      const i = instanteDeLocal(2026, m, d, 14, 30);
      expect(horaLocal(i), `${m}/${d}`).toBe("14:30");
      expect(diaLocal(i), `${m}/${d}`).toBe(
        `2026-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      );
    }
  });

  it("lê o dia da semana certo", () => {
    expect(partesLocais(instanteDeLocal(2026, 8, 17, 12, 0)).diaSemana).toBe(1);
    expect(partesLocais(instanteDeLocal(2026, 8, 16, 12, 0)).diaSemana).toBe(0);
    expect(partesLocais(instanteDeLocal(2026, 8, 22, 12, 0)).diaSemana).toBe(6);
  });

  it("interpreta horas de parede válidas e recusa as outras", () => {
    expect(minutosDeHora("09:30")).toBe(570);
    expect(minutosDeHora("00:00")).toBe(0);
    expect(minutosDeHora("23:59")).toBe(1439);
    expect(minutosDeHora("24:00")).toBeNull();
    expect(minutosDeHora("9h30")).toBeNull();
    expect(minutosDeHora("")).toBeNull();
  });
});

describe("agenda: geração de slots", () => {
  it("gera os slots da regra, com a duração pedida", () => {
    const slots = gerarSlots({
      regras: [regraSegunda()],
      de: new Date("2026-08-17T00:00:00Z"),
      ate: new Date("2026-08-17T23:59:00Z"),
      agora: new Date("2026-08-01T00:00:00Z"),
    });
    expect(slots.map((s) => s.hora)).toEqual(["09:00", "10:00", "11:00"]);
    expect(slots[0].dia).toBe(SEGUNDA_VERAO);
    expect(slots[0].inicio).toBe("2026-08-17T08:00:00.000Z");
  });

  it("nunca gera um slot que ultrapasse a hora de fecho", () => {
    const slots = gerarSlots({
      regras: [regraSegunda({ inicio: "09:00", fim: "10:30", duracaoMin: 60 })],
      de: new Date("2026-08-17T00:00:00Z"),
      ate: new Date("2026-08-17T23:59:00Z"),
      agora: new Date("2026-08-01T00:00:00Z"),
    });
    expect(slots.map((s) => s.hora), "10:00–11:00 passaria das 10:30").toEqual(["09:00"]);
  });

  it("respeita o intervalo entre consultas", () => {
    const slots = gerarSlots({
      regras: [regraSegunda({ duracaoMin: 45, intervaloMin: 15 })],
      de: new Date("2026-08-17T00:00:00Z"),
      ate: new Date("2026-08-17T23:59:00Z"),
      agora: new Date("2026-08-01T00:00:00Z"),
    });
    expect(slots.map((s) => s.hora)).toEqual(["09:00", "10:00", "11:00"]);
  });

  it("retira horários já ocupados", () => {
    const slots = gerarSlots({
      regras: [regraSegunda()],
      ocupados: [{ inicio: "2026-08-17T09:00:00.000Z", fim: "2026-08-17T10:00:00.000Z" }],
      de: new Date("2026-08-17T00:00:00Z"),
      ate: new Date("2026-08-17T23:59:00Z"),
      agora: new Date("2026-08-01T00:00:00Z"),
    });
    // 09:00Z = 10:00 em Lisboa no verão.
    expect(slots.map((s) => s.hora)).toEqual(["09:00", "11:00"]);
  });

  it("retira horários que se sobrepõem parcialmente a um agendamento", () => {
    const slots = gerarSlots({
      regras: [regraSegunda()],
      ocupados: [{ inicio: "2026-08-17T08:30:00.000Z", fim: "2026-08-17T09:15:00.000Z" }],
      de: new Date("2026-08-17T00:00:00Z"),
      ate: new Date("2026-08-17T23:59:00Z"),
      agora: new Date("2026-08-01T00:00:00Z"),
    });
    expect(slots.map((s) => s.hora), "09:00 e 10:00 tocam no ocupado").toEqual(["11:00"]);
  });

  it("fecha o dia inteiro quando a exceção não tem horas", () => {
    const slots = gerarSlots({
      regras: [regraSegunda()],
      excecoes: [{ data: SEGUNDA_VERAO, motivo: "Férias" }],
      de: new Date("2026-08-17T00:00:00Z"),
      ate: new Date("2026-08-17T23:59:00Z"),
      agora: new Date("2026-08-01T00:00:00Z"),
    });
    expect(slots).toEqual([]);
  });

  it("fecha só o bocado indicado quando a exceção tem horas", () => {
    const slots = gerarSlots({
      regras: [regraSegunda()],
      excecoes: [{ data: SEGUNDA_VERAO, inicio: "09:00", fim: "10:00" }],
      de: new Date("2026-08-17T00:00:00Z"),
      ate: new Date("2026-08-17T23:59:00Z"),
      agora: new Date("2026-08-01T00:00:00Z"),
    });
    expect(slots.map((s) => s.hora)).toEqual(["10:00", "11:00"]);
  });

  it("não oferece horários sem a antecedência mínima", () => {
    const slots = gerarSlots({
      regras: [regraSegunda()],
      de: new Date("2026-08-17T00:00:00Z"),
      ate: new Date("2026-08-17T23:59:00Z"),
      // 09:30 de Lisboa na própria segunda: 12 h de antecedência corta o dia todo.
      agora: new Date("2026-08-17T08:30:00Z"),
      antecedenciaHoras: 12,
    });
    expect(slots).toEqual([]);
  });

  it("com antecedência zero, oferece o que ainda está para vir", () => {
    const slots = gerarSlots({
      regras: [regraSegunda()],
      de: new Date("2026-08-17T00:00:00Z"),
      ate: new Date("2026-08-17T23:59:00Z"),
      agora: new Date("2026-08-17T08:30:00Z"),
      antecedenciaHoras: 0,
    });
    expect(slots.map((s) => s.hora)).toEqual(["10:00", "11:00"]);
  });

  it("só usa as regras do dia da semana correspondente", () => {
    const slots = gerarSlots({
      regras: [regraSegunda({ diaSemana: 3 })],
      de: new Date("2026-08-17T00:00:00Z"),
      ate: new Date("2026-08-17T23:59:00Z"),
      agora: new Date("2026-08-01T00:00:00Z"),
    });
    expect(slots, "segunda-feira não tem regra de quarta").toEqual([]);
  });

  it("mantém a mesma hora de parede dos dois lados da mudança de hora", () => {
    // A mudança de outubro de 2026 é no dia 25 (domingo). Segundas 19 e 26.
    const slots = gerarSlots({
      regras: [regraSegunda({ inicio: "09:00", fim: "10:00" })],
      de: new Date("2026-10-19T00:00:00Z"),
      ate: new Date("2026-10-26T23:59:00Z"),
      agora: new Date("2026-10-01T00:00:00Z"),
    });
    expect(slots).toHaveLength(2);
    expect(slots.map((s) => s.hora), "as duas às 09:00 locais").toEqual(["09:00", "09:00"]);
    expect(slots[0].inicio, "verão: UTC+1").toBe("2026-10-19T08:00:00.000Z");
    expect(slots[1].inicio, "inverno: UTC+0").toBe("2026-10-26T09:00:00.000Z");
  });

  it("não duplica horários quando duas regras se sobrepõem", () => {
    const slots = gerarSlots({
      regras: [regraSegunda(), regraSegunda({ inicio: "09:00", fim: "11:00" })],
      de: new Date("2026-08-17T00:00:00Z"),
      ate: new Date("2026-08-17T23:59:00Z"),
      agora: new Date("2026-08-01T00:00:00Z"),
    });
    expect(slots.map((s) => s.hora)).toEqual(["09:00", "10:00", "11:00"]);
  });

  it("devolve sempre por ordem cronológica", () => {
    const slots = gerarSlots({
      regras: disponibilidadePorOmissao(60),
      de: new Date("2026-08-17T00:00:00Z"),
      ate: new Date("2026-08-21T23:59:00Z"),
      agora: new Date("2026-08-01T00:00:00Z"),
    });
    const ordenados = [...slots].sort((a, b) => a.inicio.localeCompare(b.inicio));
    expect(slots).toEqual(ordenados);
    expect(slots.length, "5 dias × 8 slots").toBe(40);
  });

  it("ignora regras inválidas em vez de rebentar", () => {
    const slots = gerarSlots({
      regras: [
        { diaSemana: 9, inicio: "09:00", fim: "12:00", duracaoMin: 60 },
        { diaSemana: 1, inicio: "lixo", fim: "12:00", duracaoMin: 60 },
        { diaSemana: 1, inicio: "12:00", fim: "09:00", duracaoMin: 60 },
        { diaSemana: 1, inicio: "09:00", fim: "12:00", duracaoMin: 0 },
        regraSegunda({ inicio: "15:00", fim: "16:00" }),
      ],
      de: new Date("2026-08-17T00:00:00Z"),
      ate: new Date("2026-08-17T23:59:00Z"),
      agora: new Date("2026-08-01T00:00:00Z"),
    });
    expect(slots.map((s) => s.hora)).toEqual(["15:00"]);
  });

  it("nunca ultrapassa a janela máxima, mesmo com um intervalo absurdo", () => {
    const slots = gerarSlots({
      regras: disponibilidadePorOmissao(60),
      de: new Date("2026-01-01T00:00:00Z"),
      ate: new Date("2030-01-01T00:00:00Z"),
      agora: new Date("2025-12-01T00:00:00Z"),
    });
    const dias = new Set(slots.map((s) => s.dia));
    expect(dias.size).toBeLessThanOrEqual(62);
  });
  it("a janela fecha pelo DIA LOCAL de `ate`, não pelo instante UTC", () => {
    // 23:59Z de 18 de agosto já é 00:59 do dia 19 em Lisboa (UTC+1 no verão).
    // A janela é de dias de calendário local — é isso que uma agenda mostra —
    // por isso o dia 19 entra. Fixado aqui para não voltar a ser uma surpresa.
    const slots = gerarSlots({
      regras: disponibilidadePorOmissao(60),
      de: new Date("2026-08-17T00:00:00Z"),
      ate: new Date("2026-08-18T23:59:00Z"),
      agora: new Date("2026-08-01T00:00:00Z"),
    });
    expect([...new Set(slots.map((s) => s.dia))]).toEqual([
      "2026-08-17", "2026-08-18", "2026-08-19",
    ]);
  });
});

describe("agenda: apresentação", () => {
  it("agrupa por dia mantendo a ordem", () => {
    const slots = gerarSlots({
      regras: disponibilidadePorOmissao(60),
      de: new Date("2026-08-17T00:00:00Z"),
      // Meio-dia local do dia 18 — ver o teste seguinte sobre a fronteira.
      ate: instanteDeLocal(2026, 8, 18, 12, 0),
      agora: new Date("2026-08-01T00:00:00Z"),
    });
    const grupos = agruparPorDia(slots);
    expect(grupos.map((g) => g.dia)).toEqual([SEGUNDA_VERAO, "2026-08-18"]);
    expect(grupos[0].slots).toHaveLength(8);
  });

  it("rotula o dia em português", () => {
    expect(rotularDia(SEGUNDA_VERAO, FUSO_PT)).toContain("segunda");
    expect(rotularDia(SEGUNDA_VERAO, FUSO_PT)).toContain("agosto");
    expect(rotularDia(SEGUNDA_INVERNO, FUSO_PT)).toContain("janeiro");
  });

  // O que a pessoa pergunta ao olhar para a agenda não é «que dia é», é
  // «tenho de me despachar?». É a essa pergunta que `tempoAte` responde.
  describe("tempoAte", () => {
    const agora = new Date("2026-08-17T09:00:00Z");
    const daqui = (ms: number) => new Date(agora.getTime() + ms).toISOString();

    it("conta em minutos, horas e dias, e diz «amanhã» quando é amanhã", () => {
      expect(tempoAte(daqui(25 * 60_000), agora)).toBe("daqui a 25 min");
      expect(tempoAte(daqui(60 * 60_000), agora)).toBe("daqui a 1 hora");
      expect(tempoAte(daqui(3 * 3600_000), agora)).toBe("daqui a 3 horas");
      expect(tempoAte(daqui(24 * 3600_000), agora)).toBe("amanhã");
      expect(tempoAte(daqui(5 * 86400_000), agora)).toBe("daqui a 5 dias");
    });

    it("uma consulta que já começou está a decorrer, não «daqui a -20 min»", () => {
      expect(tempoAte(daqui(-20 * 60_000), agora)).toBe("a decorrer");
      expect(tempoAte(agora.toISOString(), agora)).toBe("a decorrer");
    });
  });
});
