// ═══════════════════════════════════════════════════════════════════════
//  O detetor de fuga de contactos
//  ---------------------------------------------------------------------
//  Metade destes testes são sobre o que NÃO deve ser recusado, e é essa
//  metade que interessa mais. Um contacto que escapa custa uma relação; um
//  NIF recusado custa a confiança de quem não estava a fazer nada — e essa
//  perde-se com toda a gente ao mesmo tempo.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import {
  detetarContactoExterno,
  eRecusaDeContacto,
  explicarContactoExterno,
  pareceContactoExterno,
} from "@/lib/contabilistas/contacto-externo";

describe("contacto-externo: o que tem de ser apanhado", () => {
  it("apanha um email escrito por extenso", () => {
    expect(pareceContactoExterno("escreve para joao.silva@gmail.com")).toBe(true);
    expect(detetarContactoExterno("o meu mail: a@b.pt").motivos).toContain("email");
  });

  it("apanha o arroba disfarçado", () => {
    expect(pareceContactoExterno("joao (arroba) gmail (ponto) com")).toBe(true);
    expect(pareceContactoExterno("joao [at] gmail.com")).toBe(true);
    expect(pareceContactoExterno("joao arroba gmail.com")).toBe(true);
  });

  it("apanha o indicativo de país, com ou sem espaços", () => {
    expect(pareceContactoExterno("+351 912 345 678")).toBe(true);
    expect(pareceContactoExterno("00351912345678")).toBe(true);
    expect(pareceContactoExterno("+351912345678")).toBe(true);
  });

  it("apanha telemóveis com separadores — a forma de ditar um número", () => {
    expect(pareceContactoExterno("912 345 678")).toBe(true);
    expect(pareceContactoExterno("912-345-678")).toBe(true);
    expect(pareceContactoExterno("936.123.456")).toBe(true);
    expect(pareceContactoExterno("961 234 567")).toBe(true);
  });

  it("apanha fixos com separadores", () => {
    expect(pareceContactoExterno("21 123 4567")).toBe(true);
    expect(pareceContactoExterno("22-123-4567")).toBe(true);
  });

  it("apanha o telemóvel cru quando o texto o apresenta como contacto", () => {
    expect(pareceContactoExterno("o meu telemóvel é 912345678")).toBe(true);
    expect(pareceContactoExterno("liga 912345678")).toBe(true);
    expect(pareceContactoExterno("manda whats para 936123456")).toBe(true);
  });

  it("apanha canais com nome próprio", () => {
    expect(detetarContactoExterno("falamos por whatsapp").motivos).toContain("canal");
    expect(pareceContactoExterno("tenho telegram")).toBe(true);
    expect(pareceContactoExterno("wa.me/351912345678")).toBe(true);
    expect(pareceContactoExterno("t.me/joaosilva")).toBe(true);
    expect(pareceContactoExterno("segue-me em instagram.com/joao")).toBe(true);
  });

  it("apanha convites a sair sem número nenhum à vista", () => {
    expect(pareceContactoExterno("continuamos por email")).toBe(true);
    expect(pareceContactoExterno("manda-me um email")).toBe(true);
    expect(pareceContactoExterno("é mais fácil fora da plataforma")).toBe(true);
    expect(detetarContactoExterno("o meu contacto é o seguinte").motivos).toContain("convite");
  });

  it("não se deixa enganar por maiúsculas nem por espaços a mais", () => {
    expect(pareceContactoExterno("WhatsApp")).toBe(true);
    expect(pareceContactoExterno("+351   912   345   678")).toBe(true);
    expect(pareceContactoExterno("Escreve   para\n  JOAO@EXEMPLO.PT")).toBe(true);
  });
});

describe("contacto-externo: o que NÃO pode ser recusado", () => {
  it("deixa passar um NIF, mesmo quando começa por 91", () => {
    // A série 90/91/98/99 existe, e sem esta salvaguarda era indistinguível
    // de um telemóvel — é exatamente o falso positivo que o relatório proíbe.
    expect(pareceContactoExterno("o NIF é 912345678")).toBe(false);
    expect(pareceContactoExterno("NIF 123456789")).toBe(false);
    expect(pareceContactoExterno("nif: 245 678 901")).toBe(false);
    expect(pareceContactoExterno("o contribuinte dele é 918273645")).toBe(false);
    expect(pareceContactoExterno("NIPC 501234567")).toBe(false);
  });

  it("deixa passar um IBAN", () => {
    expect(pareceContactoExterno("IBAN PT50 0002 0123 1234 5678 9015 4")).toBe(false);
    expect(pareceContactoExterno("o nib é 0002 0123 12345678901 54")).toBe(false);
  });

  it("deixa passar referências de pagamento", () => {
    expect(pareceContactoExterno("entidade 10925 referência 123 456 789")).toBe(false);
    expect(pareceContactoExterno("ref. 987654321 no multibanco")).toBe(false);
  });

  it("deixa passar valores, datas e percentagens", () => {
    expect(pareceContactoExterno("são 1.234,56 € de IVA")).toBe(false);
    expect(pareceContactoExterno("o prazo é 20 de fevereiro de 2026")).toBe(false);
    expect(pareceContactoExterno("retenção de 25% sobre 3.000 €")).toBe(false);
    expect(pareceContactoExterno("o coeficiente é 0,75")).toBe(false);
  });

  it("deixa passar números de documento e de processo", () => {
    expect(pareceContactoExterno("fatura 2026/000123 de 15 de janeiro")).toBe(false);
    expect(pareceContactoExterno("o recibo 912345678 já foi emitido")).toBe(false);
  });

  it("deixa passar conversa fiscal normal", () => {
    expect(pareceContactoExterno("Podes enviar o comprovativo de retenções de julho?")).toBe(false);
    expect(pareceContactoExterno("Já submeti o IRS. Ficou a pagar 340,20 €.")).toBe(false);
    expect(pareceContactoExterno("A consulta fica marcada para dia 20 às 16:30.")).toBe(false);
    expect(pareceContactoExterno("O regime simplificado compensa-te este ano.")).toBe(false);
  });

  it("deixa passar texto vazio ou sem nada", () => {
    expect(pareceContactoExterno("")).toBe(false);
    expect(pareceContactoExterno("   ")).toBe(false);
    expect(detetarContactoExterno("obrigado!").motivos).toEqual([]);
  });
});

describe("contacto-externo: a explicação", () => {
  it("explica o motivo e diz o que se ganha em ficar", () => {
    const texto = explicarContactoExterno(["email"]);
    expect(texto).toContain("email");
    expect(texto.toLowerCase()).toContain("histórico");
  });

  it("tem uma frase para cada motivo", () => {
    for (const m of ["email", "telefone", "canal", "convite"] as const) {
      expect(explicarContactoExterno([m]).length).toBeGreaterThan(20);
    }
  });

  it("reconhece a recusa que vem do servidor", () => {
    expect(eRecusaDeContacto({ hint: "contacto_externo" })).toBe(true);
    expect(eRecusaDeContacto({ message: "Para proteger o acompanhamento, os contactos pessoais não se partilham aqui." })).toBe(true);
    expect(eRecusaDeContacto({ message: "outra coisa qualquer" })).toBe(false);
    expect(eRecusaDeContacto(null)).toBe(false);
  });
});
