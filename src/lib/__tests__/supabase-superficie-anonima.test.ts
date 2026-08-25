// ═══════════════════════════════════════════════════════════════════════
//  A SUPERFÍCIE ANÓNIMA — inventário com intenção escrita
//  ---------------------------------------------------------------------
//  Uma função `SECURITY DEFINER` corre com os privilégios de quem a criou.
//  Concedê-la a `anon` é publicar um endpoint em `/rest/v1/rpc/…` que
//  qualquer pessoa na internet pode chamar sem conta. Às vezes é
//  exatamente o que se quer — o contador de lugares na página de planos é
//  a razão de alguém se decidir hoje — e às vezes é um descuido de uma
//  linha numa migração de trezentas.
//
//  Os advisors da Supabase listam estas funções, mas listam-nas todas da
//  mesma maneira: as deliberadas e as esquecidas. Um inventário de 78
//  achados em que 78 são intencionais e um inventário em que 77 são
//  intencionais leem-se exatamente igual, e é o septuagésimo oitavo que
//  interessa.
//
//  Este teste inverte o ónus. Cada função executável por `anon` tem de
//  estar aqui, com a razão escrita por uma pessoa. Uma função nova que
//  ganhe `GRANT … TO anon` numa migração faz isto ficar vermelho até
//  alguém escrever porquê — ou revogar.
//
//  ── O QUE ISTO NÃO É ───────────────────────────────────────────────
//  Não substitui `scripts/testar-rls.sh`, que exercita políticas contra
//  PostgreSQL a sério com cinco identidades. Isto é análise estática do
//  que as migrações declaram, e só apanha o que lá está escrito. As duas
//  coisas respondem a perguntas diferentes: aquela pergunta «a política
//  faz o que diz?», esta pergunta «quem decidiu abrir isto?».
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const DIR = "supabase/migrations";

/**
 * O que pode ser chamado sem conta, e porquê.
 *
 * `porque` não é decoração: é o campo que obriga alguém a parar e a
 * pensar. Acrescentar uma entrada aqui é uma decisão de segurança, e
 * fica com nome e razão no histórico do git.
 */
const PERMITIDAS: Readonly<Record<string, string>> = Object.freeze({
  "public.lugares_vitalicios":
    "Contagem de lugares vitalícios para a página de planos. Devolve quatro números e nenhuma identidade — é lida por quem ainda não tem conta, que é precisamente quem está a decidir se compra.",
  "public.lugares_vitalicios_total":
    "O teto de lugares vitalícios. Constante, sem acesso a tabela nenhuma; existe como origem única do número para o gatilho e a aplicação não discordarem.",
  "public.lugares_fundadores":
    "Contagem de lugares de fundador para a página de candidatura. Devolve contagens, nunca nomes.",
  "public.dias_ate_purga":
    "A janela entre o fim da subscrição e o apagamento do conteúdo. Constante; a aplicação lê daqui para dizer quanto tempo há para exportar.",
  "public.contabilista_recebe_pagamentos":
    "Se um contabilista aprovado recebe pagamentos pela plataforma. Devolve o mesmo booleano que `contabilistas_publico` já publica — nem o id da conta, nem os requisitos, nem o estado.",
});

interface Concessao {
  funcao: string;
  ficheiro: string;
}

function migracoes(): readonly { nome: string; sql: string }[] {
  return readdirSync(DIR)
    .filter((nome) => nome.endsWith(".sql"))
    .sort()
    .map((nome) => ({ nome, sql: readFileSync(join(DIR, nome), "utf8") }));
}

/** Toda a função que alguma migração concede a `anon`. */
function concedidasAAnon(): readonly Concessao[] {
  const encontradas = new Map<string, string>();
  for (const { nome, sql } of migracoes()) {
    const padrao = /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+([^\s;(]+)\s*(?:\([^)]*\))?\s+TO\s+([^;]+);/gi;
    for (const jogo of sql.matchAll(padrao)) {
      const [, funcao, papeis] = jogo;
      if (!/\banon\b/i.test(papeis!)) continue;
      encontradas.set(funcao!.trim(), nome);
    }
  }
  return [...encontradas].map(([funcao, ficheiro]) => ({ funcao, ficheiro }));
}

/** A última definição de uma função, que é a que vale. */
function ultimaDefinicao(funcao: string): string | null {
  const curto = funcao.replace(/^public\./, "");
  let corpo: string | null = null;
  for (const { sql } of migracoes()) {
    const padrao = new RegExp(
      `CREATE\\s+(?:OR\\s+REPLACE\\s+)?FUNCTION\\s+public\\.${curto}\\s*\\(`,
      "gi",
    );
    for (const jogo of sql.matchAll(padrao)) {
      corpo = sql.slice(jogo.index!, jogo.index! + 900);
    }
  }
  return corpo;
}

describe("supabase: quem pode chamar o quê sem conta", () => {
  it("as migrações existem e são legíveis", () => {
    // Sem isto, todas as asserções abaixo passariam a medir o vazio.
    expect(migracoes().length).toBeGreaterThan(20);
  });

  it("nenhuma função chega a `anon` sem razão escrita", () => {
    const semRazao = concedidasAAnon()
      .filter(({ funcao }) => !(funcao in PERMITIDAS))
      .map(({ funcao, ficheiro }) => `${funcao} (${ficheiro})`);

    expect(
      semRazao,
      "Uma função nova executável sem conta é uma decisão de segurança. " +
        "Escreve a razão em PERMITIDAS, ou revoga o GRANT.",
    ).toEqual([]);
  });

  it("a lista não guarda entradas que já ninguém concede", () => {
    // Uma permissão que sobrevive à função que a justificava é a forma
    // mais silenciosa de esta lista deixar de querer dizer alguma coisa.
    const concedidas = new Set(concedidasAAnon().map((item) => item.funcao));
    const orfas = Object.keys(PERMITIDAS).filter((nome) => !concedidas.has(nome));
    expect(orfas).toEqual([]);
  });

  it("cada razão é uma frase a sério, não um carimbo", () => {
    for (const [funcao, porque] of Object.entries(PERMITIDAS)) {
      expect(porque.length, `${funcao}: a razão está demasiado curta`).toBeGreaterThan(60);
    }
  });

  it("toda a função anónima fixa o `search_path`", () => {
    // Uma `SECURITY DEFINER` com `search_path` mutável resolve nomes pelo
    // caminho de QUEM CHAMA. Quem chama, aqui, é a internet.
    const semCaminho: string[] = [];
    for (const { funcao } of concedidasAAnon()) {
      const corpo = ultimaDefinicao(funcao);
      if (corpo === null) continue;
      if (!/SET\s+search_path\s*=/i.test(corpo)) semCaminho.push(funcao);
    }
    expect(semCaminho).toEqual([]);
  });

  it("toda a função anónima revoga de PUBLIC antes de conceder", () => {
    // `EXECUTE` é concedido a `PUBLIC` por omissão. Conceder a `anon` sem
    // revogar de `PUBLIC` não substitui a herança — soma-se a ela, e
    // qualquer papel futuro entra sem ninguém decidir que devia.
    const todas = migracoes()
      .map((item) => item.sql)
      .join("\n");
    const semRevogacao = concedidasAAnon()
      .filter(({ funcao }) => {
        const curto = funcao.replace(/^public\./, "");
        return !new RegExp(
          `REVOKE\\s+EXECUTE\\s+ON\\s+FUNCTION\\s+public\\.${curto}\\s*(?:\\([^)]*\\))?\\s+FROM\\s+[^;]*\\bPUBLIC\\b`,
          "i",
        ).test(todas);
      })
      .map(({ funcao }) => funcao);
    expect(semRevogacao).toEqual([]);
  });
});
