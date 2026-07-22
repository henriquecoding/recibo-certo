import { describe, expect, it } from "vitest";
import {
  addMoney,
  allocateMoney,
  eurCents,
  eurFromDecimal,
  multiplyRate,
  ratePpm,
} from "../src/core/money";

describe("money", () => {
  it("conserva montantes como cêntimos inteiros", () => {
    expect(eurFromDecimal(12.345).cents).toBe(1_235);
    expect(addMoney(eurCents(100), eurCents(25)).cents).toBe(125);
  });

  it("aplica 19% com arredondamento half-up", () => {
    expect(multiplyRate(eurCents(10_001), ratePpm(190_000)).cents).toBe(1_900);
  });

  it("aloca todos os cêntimos sem perda", () => {
    const parts = allocateMoney(eurCents(100), 3);
    expect(parts.map((part) => part.cents)).toEqual([34, 33, 33]);
    expect(parts.reduce((sum, part) => sum + part.cents, 0)).toBe(100);
  });

  it("recusa valores não inteiros no núcleo", () => {
    expect(() => eurCents(1.5)).toThrow(/inteiro seguro/);
    expect(() => ratePpm(1_000_001)).toThrow(/entre 0 e 1 000 000/);
  });
});
