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
      // O quiz decide o destino, mas o que escreve não tem por onde
      // recusar: `registrarSessao` devolve o XP ganho e a subida de
      // nível, sem canal de falha, e só é chamado no fim de um quiz —
      // muito depois de a autenticação ter respondido. Acrescentar-lhe
      // um erro obrigaria a mudar quem o chama, e não é aqui que isso
      // se decide. Está escrito para não passar por esquecimento.
      if (f === "quiz-progresso.ts") continue;

      const fonte = readFileSync(join(dir, f), "utf8");
      if (!fonte.includes("destinoDosDados")) continue;
      if (!fonte.includes('destino === "por-decidir"')) semGuarda.push(f);
    }
    expect(semGuarda, "decide o destino mas escreve antes de o saber").toEqual([]);
  });
});
