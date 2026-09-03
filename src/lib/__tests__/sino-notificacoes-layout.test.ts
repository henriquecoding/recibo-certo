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
    // O sino vive no rodapé da sidebar desde que o `layout.tsx` do painel
    // se dividiu em shell servidor + ilha cliente. A garantia é a mesma:
    // UMA subscrição Realtime, e o layout continua a montar a sidebar uma
    // só vez.
    expect(contarSinos("components/dashboard/Sidebar.tsx")).toBe(1);
    expect(contarSinos("app/dashboard/layout.tsx")).toBe(0);
  });

  it("o painel do contabilista monta exatamente um sino", () => {
    expect(contarSinos("components/contabilista/MolduraContabilista.tsx")).toBe(1);
  });
});
