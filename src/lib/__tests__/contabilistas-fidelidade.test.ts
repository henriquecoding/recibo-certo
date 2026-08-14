import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DESCONTO_MIN_PCT,
  DESCONTO_MAX_PCT,
  META_MIN,
  META_MAX,
  aplicarCarimbo,
  cupaoValido,
  formatarCodigoCupao,
  normalizarCodigoCupao,
  normalizarDesconto,
  normalizarMeta,
  progresso,
  validarConfigFidelidade,
  valorComDesconto,
  type EstadoCartao,
} from "@/lib/contabilistas/fidelidade";

describe("fidelidade: fronteiras do desconto", () => {
  it("aceita o mínimo de 10% e o máximo de 50%", () => {
    for (const pct of [DESCONTO_MIN_PCT, 25, DESCONTO_MAX_PCT]) {
      const r = validarConfigFidelidade({
        descontoPct: pct, meta: 5, precoConsultaCents: 12000, ativa: true,
      });
      expect(r.ok, `${pct}% devia ser aceite`).toBe(true);
    }
  });

  it("recusa abaixo de 10% e acima de 50%", () => {
    for (const pct of [0, 5, 9, 51, 100]) {
      const r = validarConfigFidelidade({
        descontoPct: pct, meta: 5, precoConsultaCents: 12000, ativa: true,
      });
      expect(r.ok, `${pct}% não devia ser aceite`).toBe(false);
    }
  });

  it("normaliza para dentro das fronteiras", () => {
    expect(normalizarDesconto(-10)).toBe(DESCONTO_MIN_PCT);
    expect(normalizarDesconto(999)).toBe(DESCONTO_MAX_PCT);
    expect(normalizarDesconto(23.4)).toBe(23);
    expect(normalizarDesconto(Number.NaN)).toBe(DESCONTO_MIN_PCT);
  });

  it("recusa metas fora de 3 a 12", () => {
    for (const meta of [0, 2, 13, 50]) {
      expect(validarConfigFidelidade({
        descontoPct: 10, meta, precoConsultaCents: 12000, ativa: true,
      }).ok).toBe(false);
    }
    expect(normalizarMeta(1)).toBe(META_MIN);
    expect(normalizarMeta(99)).toBe(META_MAX);
  });

  it("não deixa ativar o cartão sem preço definido", () => {
    const r = validarConfigFidelidade({
      descontoPct: 20, meta: 5, precoConsultaCents: 0, ativa: true,
    });
    expect(r.ok).toBe(false);
    expect(r.erros.join(" ")).toContain("preço");
  });

  it("deixa guardar sem preço enquanto o cartão está desligado", () => {
    expect(validarConfigFidelidade({
      descontoPct: 20, meta: 5, precoConsultaCents: 0, ativa: false,
    }).ok).toBe(true);
  });
});

describe("fidelidade: carimbos", () => {
  const cartao = (carimbos: number): EstadoCartao => ({
    carimbos, meta: 5, descontoPct: 20, precoConsultaCents: 12000,
  });

  it("acumula sem emitir cupão antes da meta", () => {
    for (let n = 0; n < 4; n++) {
      const r = aplicarCarimbo(cartao(n));
      expect(r.completou).toBe(false);
      expect(r.cupao).toBeNull();
      expect(r.cartao.carimbos).toBe(n + 1);
    }
  });

  it("emite o cupão exatamente ao atingir a meta", () => {
    const r = aplicarCarimbo(cartao(4));
    expect(r.completou).toBe(true);
    expect(r.cupao).toEqual({ percentagem: 20, valorBaseCents: 12000 });
    expect(r.cartao.carimbos).toBe(5);
  });

  it("abre cartão novo a zero depois de completar", () => {
    const r = aplicarCarimbo(cartao(4));
    expect(r.proximoCartao).not.toBeNull();
    expect(r.proximoCartao?.carimbos).toBe(0);
  });

  it("congela a percentagem do cartão em curso e só aplica a nova ao seguinte", () => {
    // O contabilista baixou de 20% para 10% a meio do cartão.
    const r = aplicarCarimbo(cartao(4), { descontoPct: 10 });
    expect(r.cupao?.percentagem, "quem começou a 20% recebe 20%").toBe(20);
    expect(r.proximoCartao?.descontoPct, "o cartão novo já é a 10%").toBe(10);
  });

  it("nunca ultrapassa a meta", () => {
    const r = aplicarCarimbo(cartao(9));
    expect(r.cartao.carimbos).toBe(5);
  });
});

describe("fidelidade: progresso", () => {
  it("descreve o estado sem sair das fronteiras", () => {
    expect(progresso(0, 5)).toMatchObject({ carimbos: 0, faltam: 5, completo: false, fracao: 0 });
    expect(progresso(3, 5)).toMatchObject({ carimbos: 3, faltam: 2, completo: false });
    expect(progresso(5, 5)).toMatchObject({ faltam: 0, completo: true, fracao: 1 });
    expect(progresso(-2, 5).carimbos, "carimbos negativos não existem").toBe(0);
    expect(progresso(50, 5).carimbos, "nem carimbos a mais").toBe(5);
  });
});

describe("fidelidade: dinheiro", () => {
  it("desconta em cêntimos inteiros, sem erro de vírgula flutuante", () => {
    expect(valorComDesconto(12000, 10)).toMatchObject({ descontoCents: 1200, finalCents: 10800 });
    expect(valorComDesconto(12000, 50)).toMatchObject({ descontoCents: 6000, finalCents: 6000 });
    // 33% de 10,10 € — o caso que a vírgula flutuante estraga.
    const r = valorComDesconto(1010, 33);
    expect(Number.isInteger(r.descontoCents)).toBe(true);
    expect(r.descontoCents + r.finalCents, "as partes somam sempre o todo").toBe(1010);
  });

  it("as partes somam o todo para qualquer percentagem válida", () => {
    for (let pct = DESCONTO_MIN_PCT; pct <= DESCONTO_MAX_PCT; pct++) {
      for (const base of [999, 1000, 4567, 12000, 99999]) {
        const r = valorComDesconto(base, pct);
        expect(r.descontoCents + r.finalCents).toBe(base);
        expect(r.finalCents).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("fidelidade: códigos", () => {
  it("gera um código legível e determinístico a partir dos bytes", () => {
    const bytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);
    const codigo = formatarCodigoCupao(bytes);
    expect(codigo).toMatch(/^RC-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(formatarCodigoCupao(bytes), "mesmos bytes, mesmo código").toBe(codigo);
  });

  it("não usa caracteres que se confundem ao ler em voz alta", () => {
    for (let i = 0; i < 256; i++) {
      const codigo = formatarCodigoCupao(new Uint8Array([i, i, i, i, i, i, i, i]));
      expect(codigo.slice(3)).not.toMatch(/[O0I1L]/);
    }
  });

  // Desde a migração 047 quem gera o código é a base de dados, dentro da
  // mesma transação que carimba. As duas implementações têm de descrever o
  // MESMO alfabeto: um código gerado lá e normalizado aqui tem de sobreviver
  // à viagem, e isso deixa de ser verdade em silêncio se uma das duas mudar.
  it("o alfabeto do servidor e o da base de dados são o mesmo", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/047_rpcs_transacionais.sql"),
      "utf8",
    );
    const noSql = sql.match(/v_alfabeto constant text := '([A-Z0-9]+)'/)?.[1];
    expect(noSql, "047 deixou de gerar códigos").toBeTruthy();

    // O alfabeto do lado do TypeScript, lido do que ele próprio produz.
    const doTs = new Set<string>();
    for (let i = 0; i < 256; i++) {
      doTs.add(formatarCodigoCupao(new Uint8Array([i, 0, 0, 0, 0, 0, 0, 0])).charAt(3));
    }
    expect([...doTs].sort().join("")).toBe([...noSql!].sort().join(""));
  });

  it("aceita o código escrito à mão", () => {
    const canonico = "RC-ABCD-EFGH";
    expect(normalizarCodigoCupao("rc abcd efgh")).toBe(canonico);
    expect(normalizarCodigoCupao("RCABCDEFGH")).toBe(canonico);
    expect(normalizarCodigoCupao("  RC-abcd-efgh  ")).toBe(canonico);
    expect(normalizarCodigoCupao("RC-ABC")).toBe("");
  });
});

describe("fidelidade: validade do cupão", () => {
  const agora = new Date("2026-08-12T10:00:00Z");

  it("só vale disponível e dentro do prazo", () => {
    expect(cupaoValido("disponivel", "2026-12-31T00:00:00Z", agora)).toBe(true);
    expect(cupaoValido("disponivel", "2026-01-01T00:00:00Z", agora)).toBe(false);
    expect(cupaoValido("usado", "2026-12-31T00:00:00Z", agora)).toBe(false);
    expect(cupaoValido("expirado", "2026-12-31T00:00:00Z", agora)).toBe(false);
    expect(cupaoValido("disponivel", "data-inválida", agora)).toBe(false);
  });
});
