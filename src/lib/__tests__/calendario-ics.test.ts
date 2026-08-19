// Testes do gerador de ICS.
//
// O que se testa aqui não é «o ficheiro parece um calendário» — é cada
// uma das regras que, quando falha, produz um ficheiro que UM calendário
// aceita e outro rejeita em silêncio. Essas são as que não se apanham a
// olho: abre-se no Google, vê-se bem, e o iPhone de um cliente não mostra
// nada sem dizer porquê.

import { describe, expect, it } from "vitest";
import {
  CRLF, construirCalendario, dobrarLinha, escaparTexto, instanteUTC,
  linkGoogle, linkOutlook, linkWebcal, type EventoICS,
} from "@/lib/calendario/ics";

const AGORA = new Date("2026-08-19T08:00:00Z");

const EVENTO: EventoICS = {
  uid: "consulta-1@recibocerto.pt",
  inicio: new Date("2026-08-20T09:00:00Z"),
  fim: new Date("2026-08-20T10:00:00Z"),
  titulo: "Consulta com Ana Ferreira",
  descricao: "IRS de 2026",
  local: "Rua das Flores 12, Porto",
  atualizadoEm: AGORA,
};

describe("calendario: escapar", () => {
  it("escapa a barra invertida ANTES do resto", () => {
    // Se a ordem se inverter, o `\` que o escape da vírgula insere é
    // escapado por sua vez e o resultado traz `\\,` onde devia estar `\,`.
    expect(escaparTexto("a\\b,c")).toBe("a\\\\b\\,c");
  });

  it("escapa ponto e vírgula, vírgula e mudança de linha", () => {
    expect(escaparTexto("a;b,c\nd")).toBe("a\\;b\\,c\\nd");
  });

  it("trata \\r\\n como UMA mudança de linha", () => {
    expect(escaparTexto("a\r\nb")).toBe("a\\nb");
  });

  it("não mexe em texto que não tem nada a escapar", () => {
    expect(escaparTexto("Consulta de IRS")).toBe("Consulta de IRS");
  });
});

describe("calendario: dobrar a 75 octetos", () => {
  it("deixa em paz o que cabe", () => {
    expect(dobrarLinha("SUMMARY:curto")).toBe("SUMMARY:curto");
  });

  it("dobra, e a continuação começa por um espaço", () => {
    const dobrada = dobrarLinha(`SUMMARY:${"a".repeat(200)}`);
    const linhas = dobrada.split(CRLF);
    expect(linhas.length).toBeGreaterThan(1);
    for (const l of linhas.slice(1)) expect(l.startsWith(" ")).toBe(true);
  });

  it("nenhuma linha passa dos 75 octetos", () => {
    const dobrada = dobrarLinha(`DESCRIPTION:${"ãé".repeat(120)}`);
    for (const l of dobrada.split(CRLF)) {
      expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    }
  });

  it("nunca corta a meio de um caractere multibyte", () => {
    // Se o corte contasse caracteres em vez de octetos, um «ç» na
    // fronteira ficava partido e o ficheiro deixava de ser UTF-8 válido.
    const dobrada = dobrarLinha(`SUMMARY:${"ç".repeat(100)}`);
    const bytes = new TextEncoder().encode(dobrada.split(CRLF).join(""));
    expect(new TextDecoder("utf-8", { fatal: true }).decode(bytes)).toContain("ç");
  });

  it("desdobrada, devolve o texto original", () => {
    const original = `DESCRIPTION:${"Uma consulta com muitos pormenores. ".repeat(8)}`;
    expect(dobrarLinha(original).split(`${CRLF} `).join("")).toBe(original);
  });
});

describe("calendario: instantes", () => {
  it("emite UTC com Z, e com zeros à esquerda", () => {
    expect(instanteUTC(new Date("2026-01-02T03:04:05Z"))).toBe("20260102T030405Z");
  });

  it("não usa a hora local de quem gera o ficheiro", () => {
    // Um instante de verão em Portugal (UTC+1). O ficheiro tem de trazer
    // o instante UTC — é o calendário de quem lê que o traduz.
    expect(instanteUTC(new Date("2026-08-20T09:00:00Z"))).toBe("20260820T090000Z");
  });
});

describe("calendario: o ficheiro", () => {
  const ics = construirCalendario([EVENTO], { nome: "Recibo Certo" }, AGORA);

  it("abre e fecha como um VCALENDAR", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
  });

  it("termina TODAS as linhas em CRLF", () => {
    // O Outlook recusa `\n` sozinho, e recusa sem dizer nada.
    expect(ics.endsWith(CRLF)).toBe(true);
    expect(/[^\r]\n/.test(ics)).toBe(false);
  });

  it("traz o essencial de um evento", () => {
    expect(ics).toContain("UID:consulta-1@recibocerto.pt");
    expect(ics).toContain("DTSTART:20260820T090000Z");
    expect(ics).toContain("DTEND:20260820T100000Z");
    expect(ics).toContain("STATUS:CONFIRMED");
    expect(ics).toContain("SEQUENCE:0");
  });

  it("não emite VTIMEZONE — tudo é UTC", () => {
    expect(ics).not.toContain("VTIMEZONE");
    expect(ics).not.toContain("TZID");
  });

  it("um evento cancelado diz que está cancelado", () => {
    const c = construirCalendario(
      [{ ...EVENTO, estado: "cancelado" }], { nome: "x" }, AGORA);
    expect(c).toContain("STATUS:CANCELLED");
  });

  it("um evento cancelado não leva alarme", () => {
    const c = construirCalendario(
      [{ ...EVENTO, estado: "cancelado", alarmeMin: 60 }], { nome: "x" }, AGORA);
    expect(c).not.toContain("BEGIN:VALARM");
  });

  it("um evento de pé com alarme leva o gatilho em minutos", () => {
    const c = construirCalendario(
      [{ ...EVENTO, alarmeMin: 60 }], { nome: "x" }, AGORA);
    expect(c).toContain("TRIGGER:-PT60M");
  });

  it("GEO só sai com as duas coordenadas", () => {
    const meia = construirCalendario(
      [{ ...EVENTO, lat: 41.15, lng: null }], { nome: "x" }, AGORA);
    expect(meia).not.toContain("GEO:");

    const inteira = construirCalendario(
      [{ ...EVENTO, lat: 41.15, lng: -8.61 }], { nome: "x" }, AGORA);
    expect(inteira).toContain("GEO:41.150000;-8.610000");
  });

  it("a sequência sobe com o evento, para a alteração não ser ignorada", () => {
    const c = construirCalendario(
      [{ ...EVENTO, sequencia: 3 }], { nome: "x" }, AGORA);
    expect(c).toContain("SEQUENCE:3");
  });

  it("pede a releitura pelos dois nomes que os clientes leem", () => {
    const c = construirCalendario([EVENTO], { nome: "x", atualizarACadaMin: 60 }, AGORA);
    expect(c).toContain("REFRESH-INTERVAL;VALUE=DURATION:PT60M");
    expect(c).toContain("X-PUBLISHED-TTL:PT60M");
  });

  it("um calendário sem eventos continua a ser um ficheiro válido", () => {
    const vazio = construirCalendario([], { nome: "Recibo Certo" }, AGORA);
    expect(vazio).toContain("BEGIN:VCALENDAR");
    expect(vazio).toContain("END:VCALENDAR");
    expect(vazio).not.toContain("BEGIN:VEVENT");
  });

  it("um título com vírgulas não parte o ficheiro", () => {
    const c = construirCalendario(
      [{ ...EVENTO, titulo: "Consulta: IRS, IVA; e mais" }], { nome: "x" }, AGORA);
    expect(c).toContain("SUMMARY:Consulta: IRS\\, IVA\\; e mais");
  });

  it("é determinístico — as mesmas entradas dão o mesmo ficheiro", () => {
    expect(construirCalendario([EVENTO], { nome: "Recibo Certo" }, AGORA)).toBe(ics);
  });
});

describe("calendario: ligações rápidas", () => {
  it("o Google recebe o intervalo no formato que espera", () => {
    expect(linkGoogle(EVENTO)).toContain("dates=20260820T090000Z%2F20260820T100000Z");
  });

  it("o Outlook recebe instantes ISO", () => {
    expect(linkOutlook(EVENTO)).toContain("startdt=2026-08-20T09%3A00%3A00.000Z");
  });

  it("webcal troca o esquema e mais nada", () => {
    expect(linkWebcal("https://recibocerto.pt/api/calendario/abc.ics"))
      .toBe("webcal://recibocerto.pt/api/calendario/abc.ics");
  });
});
