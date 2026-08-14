import { describe, it, expect } from "vitest";
import { assinaturaConfere, BYTES_PARA_ASSINATURA } from "@/lib/ficheiros/assinatura";

/** Bytes a partir de uma lista, com enchimento até dar para ler. */
function bytes(...b: number[]): Uint8Array {
  return new Uint8Array([...b, ...new Array(32).fill(0x20)]);
}
const texto = (s: string) => new TextEncoder().encode(s);

const PDF = bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const ZIP = bytes(0x50, 0x4b, 0x03, 0x04);

describe("assinatura: o ficheiro é o que diz ser", () => {
  it("aceita cada formato pela sua assinatura", () => {
    expect(assinaturaConfere(PDF, "application/pdf").ok).toBe(true);
    expect(assinaturaConfere(PNG, "image/png").ok).toBe(true);
    expect(assinaturaConfere(bytes(0xff, 0xd8, 0xff, 0xe0), "image/jpeg").ok).toBe(true);
    expect(
      assinaturaConfere(
        ZIP,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ).ok,
    ).toBe(true);
  });

  it("o WEBP passa apesar dos quatro bytes de tamanho no meio", () => {
    const webp = bytes(
      0x52, 0x49, 0x46, 0x46, 0x2a, 0x91, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    );
    expect(assinaturaConfere(webp, "image/webp").ok).toBe(true);
  });

  it("o HEIC é reconhecido apesar de a assinatura começar no quinto byte", () => {
    const heic = bytes(
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63,
    );
    expect(assinaturaConfere(heic, "image/heic").ok).toBe(true);
  });

  // ⚠️ O caso que motivou tudo isto. O tipo é declarado por quem envia.
  it("recusa um executável anunciado como PDF", () => {
    const exe = bytes(0x4d, 0x5a, 0x90, 0x00);
    const r = assinaturaConfere(exe, "application/pdf");
    expect(r.ok).toBe(false);
    expect(r.motivo).toContain("executável do Windows");
  });

  it("recusa um executável mesmo anunciado como texto, que é fácil de imitar", () => {
    for (const [nome, b] of [
      ["ELF", bytes(0x7f, 0x45, 0x4c, 0x46)],
      ["Mach-O", bytes(0xcf, 0xfa, 0xed, 0xfe)],
      ["shebang", texto("#!/bin/sh\necho ola\n")],
    ] as const) {
      const r = assinaturaConfere(b, "text/plain");
      expect(r.ok, `${nome} passou por texto`).toBe(false);
    }
  });

  it("recusa um PNG que diz ser PDF, e um PDF que diz ser PNG", () => {
    expect(assinaturaConfere(PNG, "application/pdf").ok).toBe(false);
    expect(assinaturaConfere(PDF, "image/png").ok).toBe(false);
  });

  it("aceita texto a sério e recusa binário disfarçado de texto", () => {
    expect(assinaturaConfere(texto("nif;valor\n123456789;1200,50\n"), "text/csv").ok).toBe(true);
    expect(assinaturaConfere(texto("Olá. Isto é uma nota.\n"), "text/plain").ok).toBe(true);
    // Bytes de controlo não aparecem em texto que alguém escreveu.
    expect(assinaturaConfere(new Uint8Array([0x01, 0x02, 0x03, 0x04]), "text/plain").ok).toBe(false);
    // E o que nem sequer é UTF-8 válido também não.
    expect(assinaturaConfere(new Uint8Array([0xc3, 0x28, 0x41]), "text/plain").ok).toBe(false);
  });

  it("recusa um formato que o balde não aceita, mesmo com bytes coerentes", () => {
    // Um SVG é XML bem formado; o problema não é estar corrompido, é
    // executar ao ser aberto no nosso domínio de armazenamento.
    const r = assinaturaConfere(texto("<svg xmlns='http://www.w3.org/2000/svg'></svg>"), "image/svg+xml");
    expect(r.ok).toBe(false);
    expect(r.motivo).toBe("Formato não aceite.");
  });

  it("recusa um ficheiro vazio em vez de o deixar passar por falta de bytes", () => {
    expect(assinaturaConfere(new Uint8Array(0), "application/pdf").ok).toBe(false);
  });

  it("decide com o que a rota lhe dá, e não com o ficheiro inteiro", () => {
    // A rota lê `BYTES_PARA_ASSINATURA` bytes. Se alguma assinatura
    // precisasse de mais, passaria a falhar em produção e a passar aqui.
    const inicio = PDF.slice(0, BYTES_PARA_ASSINATURA);
    expect(assinaturaConfere(inicio, "application/pdf").ok).toBe(true);
    expect(BYTES_PARA_ASSINATURA).toBeGreaterThanOrEqual(16);
  });
});

describe("assinatura: o que o balde aceita e o que este módulo conhece", () => {
  it("todo o tipo que a migração 048 deixa entrar tem aqui uma resposta", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/048_storage_endurecido.sql"),
      "utf8",
    );
    const bloco = sql.slice(sql.indexOf("allowed_mime_types = ARRAY["));
    const tipos = [...bloco.slice(0, bloco.indexOf("]")).matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(tipos.length).toBeGreaterThan(5);

    // Um tipo que o balde aceita e este módulo não conhece seria um
    // ficheiro que entra no armazenamento e nunca consegue ser registado.
    for (const tipo of tipos) {
      const r = assinaturaConfere(bytes(0x00), tipo);
      expect(r.motivo, `${tipo} é desconhecido da verificação`).not.toBe("Formato não aceite.");
    }
  });
});
