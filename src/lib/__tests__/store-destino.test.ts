import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { destinoDosDados, aindaSemDestino } from "@/lib/store/persistencia";

const base = {
  disponivel: true, userId: "u1", authPronto: true, plano: "plus", planoPronto: true,
};

describe("RC-DESTINO-001 · «ainda não sei» é uma resposta", () => {
  it("com tudo respondido, o Plus vai para a nuvem e o grátis fica no aparelho", () => {
    expect(destinoDosDados(base)).toBe("nuvem");
    expect(destinoDosDados({ ...base, plano: "free" })).toBe("local");
  });

  // ⚠️ ISTO ERA O DEFEITO. `plano` começa em "free" e só passa a "plus"
  // quando a subscrição responde. Nesse intervalo, um assinante era
  // tratado como grátis: o recibo ia para o aparelho, a interface dizia
  // «Guardado», e quando a subscrição chegava a aplicação passava a ler
  // da nuvem — e o recibo desaparecia do ecrã sem ter sido perdido.
  it("enquanto a subscrição não responde, não há destino nenhum", () => {
    expect(destinoDosDados({ ...base, planoPronto: false })).toBe("por-decidir");
    expect(destinoDosDados({ ...base, plano: "free", planoPronto: false })).toBe("por-decidir");
  });

  it("enquanto a autenticação não responde, também não", () => {
    expect(destinoDosDados({ ...base, authPronto: false })).toBe("por-decidir");
    // Nem sequer se sabe se há alguém: dizer «local» aqui era adivinhar.
    expect(destinoDosDados({ ...base, authPronto: false, userId: null })).toBe("por-decidir");
  });

  it("sem sessão é local, e isso sabe-se com certeza", () => {
    expect(destinoDosDados({ ...base, userId: null })).toBe("local");
  });

  it("sem Supabase é local, e não se espera por nada", () => {
    // Uma aplicação sem nuvem configurada não tem por que hesitar.
    expect(destinoDosDados({ ...base, disponivel: false, authPronto: false })).toBe("local");
  });

  it("a recusa é recuperável e explica-se em português", () => {
    const e = aindaSemDestino();
    expect(e.tipo).toBe("rede");
    expect(e.mensagem).toMatch(/confirmar a tua conta/i);
  });
});

describe("RC-DESTINO-002 · nenhum repositório decide sozinho", () => {
  it("ninguém volta a inferir o destino a partir do nome do plano", () => {
    const dir = join(process.cwd(), "src/lib/store");
    const soltos: string[] = [];
    for (const f of readdirSync(dir).filter((n) => n.endsWith(".ts"))) {
      if (f === "persistencia.ts") continue;
      const fonte = readFileSync(join(dir, f), "utf8");
      // A forma antiga: `disponivel && !!userId && plano === "plus"`.
      for (const m of fonte.matchAll(/const\s+naNuvem\s*=\s*(.+);/g)) {
        if (!m[1].includes('destino === "nuvem"')) soltos.push(`${f}: ${m[1].trim()}`);
      }
    }
    expect(soltos, "o destino decide-se em destinoDosDados, e num sítio só").toEqual([]);
  });

  it("todos os que escrevem recusam enquanto o destino não se sabe", () => {
    const dir = join(process.cwd(), "src/lib/store");
    const semGuarda: string[] = [];
    for (const f of readdirSync(dir).filter((n) => n.endsWith(".ts"))) {
      // Quem DEFINE a função não tem de a usar.
      if (f === "persistencia.ts") continue;
      const fonte = readFileSync(join(dir, f), "utf8");
      if (!fonte.includes("destinoDosDados")) continue;
      if (!fonte.includes('destino === "por-decidir"')) semGuarda.push(f);
    }
    expect(semGuarda, "decide o destino mas escreve antes de o saber").toEqual([]);
  });
});

describe("RC-DESTINO-003 · o que já foi ganho não se perde à espera", () => {
  // O quiz é o caso em que recusar seria pior do que o defeito: o XP
  // acabou de ser ganho num quiz que a pessoa jogou, e deitá-lo fora
  // porque a autenticação ainda não respondeu não é uma proteção.
  it("o quiz adia a escrita em vez de a recusar ou de a fazer no sítio errado", () => {
    const fonte = readFileSync(
      join(process.cwd(), "src/lib/store/quiz-progresso.ts"), "utf8",
    );
    expect(fonte).toContain("destinoDosDados");
    expect(fonte).toContain('destino === "por-decidir"');
    // Fica em espera…
    expect(fonte).toMatch(/porGravar\.current\.push/);
    // …e é escrito quando o destino se souber.
    expect(fonte).toMatch(/porGravar\.current\.splice\(0\)/);
    // E quem mostra o resultado consegue saber que ainda não foi gravado.
    expect(fonte).toMatch(/adiado: true/);
  });
});
