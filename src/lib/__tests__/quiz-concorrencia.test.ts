// ═══════════════════════════════════════════════════════════════════════
//  RC-QUIZ-001 — dois pedidos ao mesmo tempo não podem dar dois prémios
//  ---------------------------------------------------------------------
//  Os testes que o relatório exige, na parte que se pode exercer sem um
//  Postgres a correr: 20 submissões paralelas com bilhetes distintos no limiar
//  da recompensa, 20 aberturas paralelas no teto diário, payload malformado
//  que não consome bilhete, e a meia-noite em UTC e em Europe/Lisbon.
//
//  A base de dados é falsa, mas a semântica que interessa não é: o
//  `atualizarSe()` do duplo abaixo só escreve quando o valor lido ainda lá
//  está, que é exatamente o que um `UPDATE ... WHERE sequencia_atual = $1`
//  faz. Se a rota deixar de usar a condição, estes testes passam a falhar.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  avancoCondicional,
  dentroDoTeto,
  inicioDoDiaEm,
  premiosAutomaticosAtivos,
} from "@/lib/quiz-fiscal/concorrencia";

const ORIGINAL = { ...process.env };
afterEach(() => {
  process.env = { ...ORIGINAL };
});

/**
 * Uma linha de progresso com a semântica de escrita condicional do Postgres.
 * `atualizarSe` devolve `false` quando outro pedido já mudou o valor — é o
 * `WHERE sequencia_atual = $lido` a não encontrar linha.
 */
class LinhaProgresso {
  constructor(public sequencia: number) {}
  ler() {
    return this.sequencia;
  }
  atualizarSe(esperado: number, novo: number): boolean {
    if (this.sequencia !== esperado) return false;
    this.sequencia = novo;
    return true;
  }
}

/**
 * Uma submissão, como a rota a faz: ler, decidir, escrever com condição.
 *
 * O `await` entre a leitura e a escrita é o ponto todo do teste — é a viagem
 * à base de dados. Sem ele, cada submissão corria inteira antes da seguinte
 * começar e não havia corrida nenhuma para observar.
 */
async function submeter(linha: LinhaProgresso, meta: number): Promise<{ cupao: boolean }> {
  const lida = linha.ler();
  await Promise.resolve();
  const decisao = avancoCondicional(lida, meta);
  const escreveu = linha.atualizarSe(lida, decisao.sequenciaAGravar);
  // O cupão SÓ sai quando a escrita foi minha e o ciclo fechou.
  return { cupao: escreveu && decisao.fechouCiclo };
}

describe("RC-QUIZ-001 · um ciclo concede no máximo um prémio", () => {
  it("20 submissões paralelas no limiar dão exatamente um cupão", async () => {
    const meta = 3;
    const linha = new LinhaProgresso(meta - 1); // a um passo da recompensa

    // Vinte bilhetes distintos, todos válidos, todos submetidos ao mesmo
    // tempo: as vinte leituras acontecem antes da primeira escrita.
    const resultados = await Promise.all(
      Array.from({ length: 20 }, () => submeter(linha, meta)),
    );

    const cupoes = resultados.filter((r) => r.cupao).length;
    expect(cupoes, "um ciclo não pode conceder mais do que um prémio").toBe(1);
    expect(linha.sequencia, "o ciclo reinicia").toBe(0);
  });

  it("sem a condição na escrita, o mesmo cenário dava 20 cupões", async () => {
    // O contra-exemplo, para o teste acima não passar por acidente: é a
    // condição que salva, não a aritmética. Aqui a escrita é incondicional,
    // como era antes — e as vinte leem o mesmo valor no limiar.
    const meta = 3;
    const linha = new LinhaProgresso(meta - 1);

    const resultados = await Promise.all(
      Array.from({ length: 20 }, async () => {
        const lida = linha.ler();
        await Promise.resolve();
        const decisao = avancoCondicional(lida, meta);
        linha.sequencia = decisao.sequenciaAGravar; // escrita incondicional
        return decisao.fechouCiclo;
      }),
    );

    expect(resultados.filter(Boolean).length).toBe(20);
  });

  it("a soma do progresso não perde incrementos em série", async () => {
    const meta = 5;
    const linha = new LinhaProgresso(0);
    let cupoes = 0;
    for (let i = 0; i < meta; i++) {
      if ((await submeter(linha, meta)).cupao) cupoes++;
    }
    expect(cupoes).toBe(1);
    expect(linha.sequencia).toBe(0);
  });

  it("uma sessão imperfeita não fecha ciclo nenhum", () => {
    const meta = 3;
    const linha = new LinhaProgresso(meta - 1);
    // A rota só chega ao avanço quando a sessão é perfeita; aqui garante-se
    // que o cálculo em si nunca fecha um ciclo antes da meta.
    expect(avancoCondicional(0, meta).fechouCiclo).toBe(false);
    expect(avancoCondicional(meta - 2, meta).fechouCiclo).toBe(false);
    expect(linha.sequencia).toBe(meta - 1);
  });
});

describe("RC-QUIZ-001 · o teto diário é uma fila, não uma contagem", () => {
  it("20 aberturas paralelas no teto deixam passar exatamente o limite", () => {
    const limite = 40;
    const jaExistiam = 38; // faltam duas para o teto

    // Cada pedido insere e depois conta quantos vieram ANTES do seu. A ordem
    // é estável, por isso a decisão de cada um não depende de quando leu.
    const sobreviventes = Array.from({ length: 20 }, (_, i) =>
      dentroDoTeto(jaExistiam + i, limite),
    ).filter(Boolean).length;

    expect(sobreviventes).toBe(limite - jaExistiam);
  });

  it("contar antes de inserir deixava passar todos", () => {
    const limite = 40;
    const jaExistiam = 38;
    // O defeito original: todos leem 38, todos concluem que cabem.
    const passavam = Array.from({ length: 20 }, () => jaExistiam < limite).filter(Boolean).length;
    expect(passavam).toBe(20);
  });
});

describe("RC-QUIZ-001 · o dia é o de quem joga", () => {
  it("a meia-noite de Lisboa no verão não é a de UTC", () => {
    // 10 de agosto de 2026, 00:30 em Lisboa = 23:30 de dia 9 em UTC.
    const meiaNoiteEUmPouco = new Date("2026-08-09T23:30:00Z");
    const lisboa = inicioDoDiaEm(meiaNoiteEUmPouco, "Europe/Lisbon");
    const utc = inicioDoDiaEm(meiaNoiteEUmPouco, "UTC");

    expect(lisboa).toBe("2026-08-09T23:00:00.000Z"); // 10/08 00:00 em Lisboa
    expect(utc).toBe("2026-08-09T00:00:00.000Z"); // ainda dia 9 para UTC
    expect(lisboa).not.toBe(utc);
  });

  it("no inverno Lisboa coincide com UTC", () => {
    const janeiro = new Date("2026-01-15T10:00:00Z");
    expect(inicioDoDiaEm(janeiro, "Europe/Lisbon")).toBe("2026-01-15T00:00:00.000Z");
  });

  it("um instante já dentro do dia devolve a mesma meia-noite", () => {
    const manha = new Date("2026-08-10T09:00:00Z");
    const tarde = new Date("2026-08-10T20:00:00Z");
    expect(inicioDoDiaEm(manha)).toBe(inicioDoDiaEm(tarde));
  });
});

describe("RC-QUIZ-001 · travão administrativo", () => {
  it("por omissão a emissão automática continua ligada", () => {
    delete process.env.QUIZ_PREMIOS_AUTOMATICOS;
    expect(premiosAutomaticosAtivos()).toBe(true);
  });

  it("só a palavra 'false' a suspende", () => {
    for (const valor of ["", "true", "0", "no", "FALSE", "sim"]) {
      process.env.QUIZ_PREMIOS_AUTOMATICOS = valor;
      expect(premiosAutomaticosAtivos(), `"${valor}"`).toBe(true);
    }
    process.env.QUIZ_PREMIOS_AUTOMATICOS = "false";
    expect(premiosAutomaticosAtivos()).toBe(false);
    process.env.QUIZ_PREMIOS_AUTOMATICOS = " false ";
    expect(premiosAutomaticosAtivos()).toBe(false);
  });
});

describe("RC-QUIZ-001 · as rotas aplicam mesmo estas regras", () => {
  const codigo = (caminho: string) =>
    readFileSync(join(__dirname, "..", "..", caminho), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/^\s*\/\/.*$/gm, " ");

  it("a submissão escreve o progresso com condição, não por cima", () => {
    const fonte = codigo("app/api/quiz/sessao/route.ts");
    expect(fonte).toMatch(/avancoCondicional/);
    // A condição do compare-and-swap sobre o valor lido.
    expect(fonte).toMatch(/eq\("sequencia_atual"/);
    expect(fonte).toMatch(/premiosAutomaticosAtivos/);
  });

  it("a submissão valida as respostas ANTES de queimar o bilhete", () => {
    // Um payload malformado não pode custar a sessão a quem a abriu.
    // A procura começa no handler: o bloco de imports também tem o nome da
    // função, e apanhá-lo aí dava um teste sempre verde.
    const fonte = codigo("app/api/quiz/sessao/route.ts");
    const handler = fonte.slice(fonte.search(/export async function POST\(/));
    const posVerificacao = handler.indexOf("await verificarSessao");
    const posFecho = handler.indexOf("submetido_em: ");
    expect(posVerificacao, "chamada a verificarSessao não encontrada").toBeGreaterThan(-1);
    expect(posFecho, "fecho do bilhete não encontrado").toBeGreaterThan(-1);
    expect(posVerificacao, "o bilhete é queimado antes de validar").toBeLessThan(posFecho);
  });

  it("a abertura usa o dia de Lisboa e conta a fila", () => {
    const fonte = codigo("app/api/quiz/sessao/abrir/route.ts");
    expect(fonte).toMatch(/inicioDoDiaEm/);
    expect(fonte).toMatch(/dentroDoTeto/);
    // `setHours` era a meia-noite do servidor.
    expect(fonte).not.toMatch(/setHours/);
  });
});
