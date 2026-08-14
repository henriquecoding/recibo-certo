import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..", "..");

function contarSinos(caminho: string): number {
  const fonte = readFileSync(join(SRC, caminho), "utf8");
  return fonte.match(/<SinoNotificacoes\s*\/>/g)?.length ?? 0;
}

describe("SinoNotificacoes — uma subscrição Realtime por layout", () => {
  it("o dashboard monta exatamente um sino", () => {
    expect(contarSinos("app/dashboard/layout.tsx")).toBe(1);
  });

  it("o painel do contabilista monta exatamente um sino", () => {
    expect(contarSinos("app/contabilista/layout.tsx")).toBe(1);
  });
});
