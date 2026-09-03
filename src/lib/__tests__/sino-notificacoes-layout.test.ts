import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// ═══════════════════════════════════════════════════════════════════════
//  ONDE O SINO ESTÁ MONTADO — e porque a regra antiga mudou
//  ---------------------------------------------------------------------
//  Este ficheiro guardava uma regra: «exatamente um `<SinoNotificacoes />`
//  por layout». Existia por uma boa razão — o canal Realtime era
//  propriedade do componente, e dois montados ao mesmo tempo eram dois
//  canais com o mesmo nome, em que o segundo cancelava o primeiro.
//
//  Mas a regra tinha um custo que ninguém tinha somado: o único sítio onde
//  o sino cabia era o rodapé da `Sidebar`, que é `hidden lg:flex`. NO
//  TELEMÓVEL NÃO HAVIA SINO NENHUM. Quem tivesse um pedido de consulta por
//  decidir e abrisse o painel no telemóvel — a maioria — não via nada.
//
//  A correção não foi levantar a regra: foi tirar-lhe a razão de existir.
//  O estado mudou-se para `lib/notificacoes/loja.ts`, que conta
//  subscritores e abre UM canal ao primeiro e fecha-o ao último. Dois
//  sinos no ecrã passaram a ser uma subscrição por construção.
//
//  O que este ficheiro guarda agora é o oposto do que guardava: que o sino
//  ESTÁ nos dois sítios, e que o componente não voltou a ficar dono do
//  canal — que é o que faria a regra antiga voltar a ser necessária.
// ═══════════════════════════════════════════════════════════════════════

const SRC = join(__dirname, "..", "..");
const ler = (caminho: string) => readFileSync(join(SRC, caminho), "utf8");

function contarSinos(caminho: string): number {
  return ler(caminho).match(/<SinoNotificacoes\s*\/>/g)?.length ?? 0;
}

describe("SinoNotificacoes — montado onde as pessoas estão", () => {
  it("o painel monta-o na barra lateral (computador)", () => {
    expect(contarSinos("components/dashboard/Sidebar.tsx")).toBe(1);
  });

  it("e no cabeçalho do painel, que é o do telemóvel", () => {
    // `DashboardShellClient` tem duas molduras: a `Sidebar` (`hidden
    // lg:flex`) e este cabeçalho (`lg:hidden`). Só uma está visível de
    // cada vez, e por isso só uma é exposta ao leitor de ecrã.
    expect(contarSinos("components/dashboard/DashboardShellClient.tsx")).toBe(1);
  });

  it("o painel do contabilista monta exatamente um sino", () => {
    expect(contarSinos("app/contabilista/layout.tsx")).toBe(1);
  });

  it("o layout servidor do painel continua a não montar nenhum", () => {
    // É um Server Component: um sino aqui punha `"use client"` a subir e
    // levava a `metadata` estática atrás.
    expect(contarSinos("app/dashboard/layout.tsx")).toBe(0);
  });

  it("o canal Realtime é da loja e não do componente", () => {
    // A garantia que substituiu a regra antiga. Se `escutarNotificacoes`
    // voltar para dentro do sino, dois sinos voltam a ser dois canais — e
    // o defeito volta sem que nada aqui dê erro se este teste não existir.
    expect(ler("components/contabilistas/SinoNotificacoes.tsx"))
      .not.toMatch(/escutarNotificacoes/);
    expect(ler("lib/notificacoes/loja.ts")).toMatch(/escutarNotificacoes/);
  });
});
