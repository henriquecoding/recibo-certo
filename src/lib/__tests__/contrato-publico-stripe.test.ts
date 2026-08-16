// ═══════════════════════════════════════════════════════════════════════
//  O CONTRATO PÚBLICO NÃO DEIXA SAIR A STRIPE
//  ---------------------------------------------------------------------
//  Este teste lê o SQL, e é de propósito.
//
//  A suíte de RLS corre contra um PostgreSQL a sério e é o instrumento
//  certo para perguntas de PERMISSÃO — «quem consegue ler isto?». Mas ela
//  só aplica as migrações numeradas e duas datadas (ver `testar-rls.sh`),
//  e a migração que muda o contrato público depende de tabelas que ficam
//  fora desse conjunto. Deixar a garantia sem teste nenhum por causa
//  disso era deixá-la sem teste nenhum.
//
//  E a pergunta aqui, ao contrário, não é de permissão — é de CONTRATO:
//  «que colunas é que esta view publica?». Para essa, ler a definição é
//  mais direto do que a exercer, e apanha melhor o modo de falha real:
//  alguém acrescenta uma coluna à view daqui a seis meses e ninguém repara
//  que veio de `contabilista_stripe`.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SQL = readFileSync(
  join(process.cwd(), "supabase/migrations/20260816170000_recebimentos_no_contrato_publico.sql"),
  "utf8",
);

/** O corpo da view, sem comentários — é o que o PostgreSQL vai ler. */
function corpoDaView(): string {
  const inicio = SQL.indexOf("CREATE VIEW public.contabilistas_publico");
  expect(inicio, "a migração tem de criar a view").toBeGreaterThan(-1);
  const fim = SQL.indexOf("COMMENT ON VIEW", inicio);
  return SQL.slice(inicio, fim)
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
}

describe("contrato público: o que sai da conta Stripe", () => {
  it("publica o facto de que se pode pagar", () => {
    expect(corpoDaView()).toContain("recebe_pagamentos");
  });

  it("não deixa sair o id da conta nem os requisitos", () => {
    // São dados de negócio de outra pessoa. Que a Stripe pediu um documento
    // a alguém não é informação do cliente, e é das que fazem perder um
    // cliente por uma razão que não é dele.
    const corpo = corpoDaView();
    for (const proibido of [
      "stripe_account_id",
      "requisitos",
      "details_submitted",
      "payouts_enabled",
    ]) {
      expect(corpo, `${proibido} não pode estar no contrato público`).not.toContain(proibido);
    }
  });

  it("`charges_enabled` só aparece dentro do COALESCE, com outro nome", () => {
    // A coluna crua não pode ser publicada com o nome dela: alguém que
    // leia `charges_enabled` num payload sabe que há uma conta Stripe por
    // trás e o que a procurar. Sai como `recebe_pagamentos`, que é o facto
    // e não a sua origem.
    const corpo = corpoDaView();
    expect(corpo).toContain("COALESCE(s.charges_enabled, false) AS recebe_pagamentos");
    // Uma só ocorrência: a do COALESCE.
    expect(corpo.match(/charges_enabled/g) ?? []).toHaveLength(1);
  });

  it("a view continua a correr com os privilégios de quem a criou", () => {
    // É o que lhe permite ler a tabela fechada sem dar acesso a ela. Um
    // `security_invoker = true` aqui devolvia zero linhas a toda a gente,
    // e a falha apareceria como «ninguém aceita pagamentos».
    expect(corpoDaView()).toContain("security_invoker = false");
  });

  it("só mostra contabilistas aprovados", () => {
    expect(corpoDaView()).toMatch(/WHERE\s+c\.estado\s*=\s*'aprovado'/);
  });
});

describe("contrato público: a função para quem já é cliente", () => {
  it("devolve um booleano, e só isso", () => {
    expect(SQL).toContain(
      "CREATE OR REPLACE FUNCTION public.contabilista_recebe_pagamentos(p_contabilista uuid)",
    );
    expect(SQL).toMatch(/contabilista_recebe_pagamentos\(p_contabilista uuid\)\s*\nRETURNS boolean/);
  });

  it("corre com search_path fechado", () => {
    // Sem isto, uma função SECURITY DEFINER resolve nomes pelo caminho de
    // quem a chama — e quem a chama pode criar um `public` seu.
    const inicio = SQL.indexOf("FUNCTION public.contabilista_recebe_pagamentos");
    const corpo = SQL.slice(inicio, SQL.indexOf("$$;", inicio));
    expect(corpo).toContain("SECURITY DEFINER");
    expect(corpo).toContain("SET search_path = ''");
  });

  it("exige que o contabilista esteja aprovado", () => {
    const inicio = SQL.indexOf("FUNCTION public.contabilista_recebe_pagamentos");
    const corpo = SQL.slice(inicio, SQL.indexOf("$$;", inicio));
    expect(corpo).toContain("c.estado = 'aprovado'");
  });
});

describe("contrato público: a tabela da Stripe continua fechada", () => {
  it("reafirma que só o próprio lê, e que ninguém escreve", () => {
    expect(SQL).toContain('CREATE POLICY "stripe_proprio_le" ON public.contabilista_stripe');
    expect(SQL).toMatch(/USING \(contabilista_id = \(SELECT auth\.uid\(\)\)\)/);
    expect(SQL).toContain(
      "REVOKE INSERT, UPDATE, DELETE ON public.contabilista_stripe FROM anon, authenticated",
    );
  });

  it("não abre a tabela a `anon` em lado nenhum", () => {
    expect(SQL).not.toMatch(/GRANT[^;]*ON public\.contabilista_stripe[^;]*anon/);
  });
});
