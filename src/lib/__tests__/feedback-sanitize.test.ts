import { describe, it, expect } from "vitest";
import { contemCodigo, sanitizarTexto, emailValido } from "../feedback-sanitize";

describe("feedback-sanitize — contemCodigo", () => {
  it("bloqueia HTML e scripts", () => {
    expect(contemCodigo("<script>alert(1)</script>")).toBe(true);
    expect(contemCodigo("<img src=x onerror=alert(1)>")).toBe(true);
    expect(contemCodigo("<svg onload=alert(1)>")).toBe(true);
    expect(contemCodigo("clica aqui javascript:alert(1)")).toBe(true);
    expect(contemCodigo("<a href='data:text/html,...'>")).toBe(true);
    expect(contemCodigo("olá {{constructor}}")).toBe(true);
    expect(contemCodigo("<% codigo %>")).toBe(true);
  });

  it("não marca texto normal como código", () => {
    expect(contemCodigo("Tenho uma sugestão para o simulador de IRS.")).toBe(false);
    expect(contemCodigo("O meu lucro < 1000 e a despesa > 200")).toBe(false);
    expect(contemCodigo("Adorei a app, parabéns à equipa!")).toBe(false);
    expect(contemCodigo("e-mail: ana@exemplo.pt")).toBe(false);
  });
});

describe("feedback-sanitize — sanitizarTexto", () => {
  it("remove tags mas preserva texto e quebras", () => {
    expect(sanitizarTexto("Olá <b>mundo</b>")).toBe("Olá mundo");
    expect(sanitizarTexto("linha1\nlinha2")).toBe("linha1\nlinha2");
    expect(sanitizarTexto("  espaços  ")).toBe("espaços");
  });

  it("preserva comparações matemáticas (não são tags)", () => {
    expect(sanitizarTexto("lucro < 1000 > custo")).toBe("lucro < 1000 > custo");
  });

  it("remove caracteres de controlo e largura-zero", () => {
    const zw = String.fromCharCode(0x200b); // largura zero
    const ctrl = String.fromCharCode(0x07); // bell (controlo)
    expect(sanitizarTexto("ab" + zw + "c")).toBe("abc");
    expect(sanitizarTexto("x" + ctrl + "y")).toBe("xy");
  });
});

describe("feedback-sanitize — emailValido", () => {
  it("aceita vazio (opcional) e emails válidos", () => {
    expect(emailValido("")).toBe(true);
    expect(emailValido(undefined)).toBe(true);
    expect(emailValido("ana@exemplo.pt")).toBe(true);
  });
  it("rejeita emails inválidos", () => {
    expect(emailValido("ana@@x")).toBe(false);
    expect(emailValido("sem-arroba")).toBe(false);
  });
});
