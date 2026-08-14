import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const vercel = JSON.parse(
  readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
) as { crons?: { path: string; schedule: string }[] };

/**
 * Quantas vezes por dia é que esta expressão corre?
 *
 * Não é um parser de cron completo, e não precisa de ser: a pergunta é
 * uma só — «isto corre mais do que uma vez por dia?». Basta contar os
 * valores que os campos dos minutos e das horas produzem.
 *
 * Devolve `Infinity` para o que não se souber ler, de propósito: uma
 * expressão que este contador não percebe é uma expressão que ninguém
 * deve escrever em `vercel.json` sem alguém olhar.
 */
export function execucoesPorDia(expressao: string): number {
  const campos = expressao.trim().split(/\s+/);
  if (campos.length !== 5) return Infinity;

  const [minuto, hora] = campos;

  const quantos = (campo: string, max: number): number => {
    // `*` — todos os valores.
    if (campo === "*") return max;
    // `*/n` — de n em n.
    const passo = /^\*\/(\d+)$/.exec(campo);
    if (passo) return Math.ceil(max / Number(passo[1]));
    // `a-b` ou `a-b/n` — um intervalo.
    const intervalo = /^(\d+)-(\d+)(?:\/(\d+))?$/.exec(campo);
    if (intervalo) {
      const [, a, b, n] = intervalo;
      const total = Number(b) - Number(a) + 1;
      return total <= 0 ? Infinity : Math.ceil(total / Number(n ?? 1));
    }
    // `a,b,c` — uma lista. Cada item conta pelo que vale.
    if (campo.includes(",")) {
      return campo.split(",").reduce((soma, parte) => soma + quantos(parte, max), 0);
    }
    // Um valor só.
    if (/^\d+$/.test(campo)) return 1;
    return Infinity;
  };

  return quantos(minuto, 60) * quantos(hora, 24);
}

describe("RC-CRON-001 · o contador de frequências", () => {
  it("conta o que corre uma vez por dia", () => {
    expect(execucoesPorDia("0 4 * * *")).toBe(1);
    expect(execucoesPorDia("15 3 * * *")).toBe(1);
    expect(execucoesPorDia("30 4 * * 1")).toBe(1);
  });

  it("conta o que corre mais do que uma vez", () => {
    expect(execucoesPorDia("*/15 * * * *")).toBe(96);
    expect(execucoesPorDia("*/5 * * * *")).toBe(288);
    expect(execucoesPorDia("0 * * * *")).toBe(24);
    expect(execucoesPorDia("0 */2 * * *")).toBe(12);
    expect(execucoesPorDia("0 9,17 * * *")).toBe(2);
    expect(execucoesPorDia("0 9-17 * * *")).toBe(9);
    expect(execucoesPorDia("0,30 * * * *")).toBe(48);
  });

  it("desconfia do que não sabe ler, em vez de deixar passar", () => {
    expect(execucoesPorDia("disparate")).toBe(Infinity);
    expect(execucoesPorDia("0 4 * *")).toBe(Infinity);
    expect(execucoesPorDia("@daily")).toBe(Infinity);
  });
});

describe("RC-CRON-002 · nenhum cron do Vercel corre mais do que uma vez por dia", () => {
  // ⚠️ ISTO BLOQUEOU A PRODUÇÃO. O plano Hobby recusa o DEPLOYMENT — não o
  // build — de qualquer projeto cujo `vercel.json` peça um cron subdiário:
  //
  //   Hobby accounts are limited to daily cron jobs.
  //   This cron expression (*/15 * * * *) would run more than once per day.
  //
  // Como a recusa é na criação, não aparece um deployment falhado: não
  // aparece deployment nenhum, e a produção fica parada sem sinal visível.
  // Foi preciso ler a mensagem no painel para perceber porquê.
  //
  // O que precisa de correr mais vezes é agendado no Supabase, por
  // `pg_cron` — ver `supabase/migrations/053_agendador_dos_avisos.sql`.
  it("cada expressão corre no máximo uma vez por dia", () => {
    const demais = (vercel.crons ?? [])
      .map((c) => ({ ...c, vezes: execucoesPorDia(c.schedule) }))
      .filter((c) => c.vezes > 1)
      .map((c) => `${c.path}: «${c.schedule}» corre ${c.vezes}× por dia`);

    expect(
      demais,
      "O plano Hobby recusa o deployment inteiro. Agenda isto no Supabase " +
        "(migração 053) em vez de o pôr aqui.",
    ).toEqual([]);
  });

  it("os trabalhos diários continuam todos lá", () => {
    // Tirar os outros para o deployment passar seria trocar um problema
    // visível por quatro invisíveis.
    const caminhos = (vercel.crons ?? []).map((c) => c.path);
    for (const esperado of [
      "/api/cron/purgar-dados",
      "/api/cron/reconciliar-stripe",
      "/api/cron/purgar-anexos",
      "/api/cron/expirar-propostas",
    ]) {
      expect(caminhos, `${esperado} desapareceu`).toContain(esperado);
    }
  });

  it("os avisos por email deixaram de ser agendados aqui", () => {
    const caminhos = (vercel.crons ?? []).map((c) => c.path);
    expect(caminhos).not.toContain("/api/cron/avisos-email");
  });
});

describe("RC-CRON-003 · o que saiu do Vercel foi agendado no Supabase", () => {
  const migracao = readFileSync(
    join(process.cwd(), "supabase/migrations/053_agendador_dos_avisos.sql"),
    "utf8",
  );

  /** Sem os comentários: a prosa explica o erro que se evitou, e procurá-lo
   *  no texto encontrava a explicação em vez do código. */
  const sql = migracao
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");

  it("a rota continua a ser a mesma — só mudou quem a acorda", () => {
    // O worker não foi reescrito: se tivesse sido, haveria duas
    // implementações da fila e um dia divergiam.
    const rota = readFileSync(
      join(process.cwd(), "src/app/api/cron/avisos-email/route.ts"), "utf8",
    );
    expect(rota).toContain("avisos_email_reclamar");
    expect(rota).toContain("avisos_email_concluir");
    expect(rota).toContain("CRON_SECRET");
  });

  it("mantém os quinze minutos", () => {
    expect(migracao).toContain("'*/15 * * * *'");
    expect(execucoesPorDia("*/15 * * * *")).toBe(96);
  });

  it("o segredo vem do Vault, e não do ficheiro", () => {
    expect(migracao).toContain("vault.decrypted_secrets");
    // Um `Bearer ` seguido de algo que não seja uma variável é um segredo
    // escrito à mão. O único aceite é a concatenação com o que veio do Vault.
    const bearers = [...migracao.matchAll(/'Bearer [^']*'/g)].map((m) => m[0]);
    expect(bearers, "há um Bearer literal na migração").toEqual(["'Bearer '"]);
  });

  it("o comando agendado não lê o Vault — chama uma função", () => {
    // `cron.job.command` fica em claro na base de dados.
    expect(migracao).toContain("'SELECT public.disparar_avisos_email();'");
  });

  it("chama o pg_net pelo nome que ele tem mesmo", () => {
    // `extensions.net.http_get` é um nome de três partes e não existe: o
    // `WITH SCHEMA extensions` põe a extensão ali, mas as funções ficam
    // no schema `net`. Confirmado no projeto antes de escrever a migração.
    expect(sql).toContain("net.http_get(");
    expect(sql).not.toContain("extensions.net.http_get");
  });

  it("é idempotente: desagenda antes de agendar", () => {
    const desagenda = migracao.indexOf("cron.unschedule");
    const agenda = migracao.indexOf("cron.schedule");
    expect(desagenda).toBeGreaterThan(0);
    expect(desagenda).toBeLessThan(agenda);
  });

  it("quem dispara está fechado a quem não é o agendador", () => {
    expect(migracao).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.disparar_avisos_email\(\)\s*\n?\s*FROM anon, authenticated, public/,
    );
  });
});

describe("RC-CRON-004 · nenhum segredo entrou no repositório", () => {
  it("nem a migração nem o vercel.json trazem um segredo", () => {
    const suspeitos = [
      "supabase/migrations/053_agendador_dos_avisos.sql",
      "vercel.json",
      "src/app/api/cron/avisos-email/route.ts",
    ];
    for (const f of suspeitos) {
      const fonte = readFileSync(join(process.cwd(), f), "utf8");
      // O que um segredo parece quando alguém o cola sem pensar: longo,
      // sem espaços, e com a mistura de maiúsculas e dígitos que só
      // aparece em coisas geradas. Um nome de ramo como
      // «agent/protecao-ativos-proprietarios» também tem trinta e três
      // caracteres, e não é segredo nenhum — a entropia é o que separa.
      const parecidos = [...fonte.matchAll(/['"]([A-Za-z0-9+/_-]{32,})['"]/g)]
        .map((m) => m[1])
        .filter((s) => /[0-9]/.test(s) && /[A-Z]/.test(s))
        // Os SHA das actions são hexadecimais minúsculos e já não entram
        // pela regra de cima; fica aqui a rede de segurança.
        .filter((s) => !/^[0-9a-f]{40}$/.test(s));
      expect(parecidos, `${f} tem algo com cara de segredo`).toEqual([]);
    }
  });
});
