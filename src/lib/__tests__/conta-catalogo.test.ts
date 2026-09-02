import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  CONJUNTOS, GRUPOS, FORA_DO_CATALOGO, conjuntoPorId, APAGAVEIS,
} from "@/lib/conta/catalogo";
import {
  CONJUNTOS_LOCAIS, GRUPOS_LOCAIS, DOMINIOS_POR_CONJUNTO, dominiosDosConjuntos,
} from "@/lib/conta/catalogo-local";
import { DOMINIOS, type Dominio } from "@/lib/store/cofre";

const RAIZ = process.cwd();
const MIGRACOES = join(RAIZ, "supabase/migrations");

/**
 * O corpo da última definição de uma função SQL.
 *
 * Uma migração posterior recria a função com `CREATE OR REPLACE`; vale a
 * última, tal como na base de dados.
 */
function ultimaFuncaoSql(nome: string): string {
  let corpo = "";
  for (const f of readdirSync(MIGRACOES).filter((n) => n.endsWith(".sql")).sort()) {
    const sql = readFileSync(join(MIGRACOES, f), "utf8");
    const re = new RegExp(
      `CREATE OR REPLACE FUNCTION public\\.${nome}\\s*\\(([\\s\\S]*?)\\n\\$\\$;`,
      "g",
    );
    for (const m of sql.matchAll(re)) corpo = m[0];
  }
  return corpo;
}

/** As tabelas que as migrações criam, com as colunas de cada uma. */
function tabelasDasMigracoes(): Map<string, string[]> {
  const tabelas = new Map<string, string[]>();
  for (const f of readdirSync(MIGRACOES).filter((n) => n.endsWith(".sql")).sort()) {
    const sql = readFileSync(join(MIGRACOES, f), "utf8");
    const re = /CREATE TABLE (?:IF NOT EXISTS )?public\.(\w+)\s*\(([\s\S]*?)\n\);/g;
    for (const m of sql.matchAll(re)) {
      const colunas = [...m[2].matchAll(/^\s*(\w+)\s+\w/gm)].map((c) => c[1]);
      // Uma migração posterior pode recriar a tabela; fica a última.
      tabelas.set(m[1], colunas);
    }

    // As colunas acrescentadas depois contam tanto como as originais —
    // `profiles.preferencias_fiscais` nasceu num ALTER, e ler só os CREATE
    // dava um catálogo «errado» por um campo que existe mesmo.
    const alter = /ALTER TABLE (?:IF EXISTS )?public\.(\w+)([\s\S]*?);/g;
    for (const m of sql.matchAll(alter)) {
      const existentes = tabelas.get(m[1]);
      if (!existentes) continue;
      for (const c of m[2].matchAll(/ADD COLUMN (?:IF NOT EXISTS )?(\w+)/g)) {
        if (!existentes.includes(c[1])) existentes.push(c[1]);
      }
    }
  }
  return tabelas;
}

/** Colunas que dizem «esta linha é de alguém». */
const COLUNAS_DE_DONO = ["user_id", "cliente_id", "contabilista_id", "autor_id", "pedida_por"];

describe("RC-DADOS-001 · o catálogo cobre tudo o que tem dono", () => {
  // ⚠️ Este é o teste que existe por causa do buraco. A rota apagava cinco
  // tabelas; a base de dados tinha vinte e oito com dados de pessoas. Uma
  // lista escrita à mão dentro de uma rota não sobrevive a uma migração
  // nova, e ninguém dá por isso até alguém pedir para ser esquecido.
  it("nenhuma tabela com coluna de dono fica de fora sem uma razão escrita", () => {
    const noCatalogo = new Set(CONJUNTOS.flatMap((c) => c.tabelas.map((t) => t.nome)));
    const esquecidas: string[] = [];

    for (const [tabela, colunas] of tabelasDasMigracoes()) {
      const temDono = colunas.some((c) => COLUNAS_DE_DONO.includes(c));
      if (!temDono) continue;
      if (noCatalogo.has(tabela)) continue;
      if (FORA_DO_CATALOGO[tabela]) continue;
      esquecidas.push(tabela);
    }

    expect(
      esquecidas,
      "tabelas com dono fora do catálogo — declara-as em CONJUNTOS ou explica-as em FORA_DO_CATALOGO",
    ).toEqual([]);
  });

  it("toda a tabela do catálogo existe mesmo nas migrações", () => {
    const existentes = tabelasDasMigracoes();
    const inventadas = CONJUNTOS
      .flatMap((c) => c.tabelas.map((t) => `${c.id}: ${t.nome}`))
      .filter((s) => !existentes.has(s.split(": ")[1]));
    expect(inventadas, "o catálogo aponta para tabelas que não existem").toEqual([]);
  });

  it("a coluna de posse existe mesmo na tabela", () => {
    const existentes = tabelasDasMigracoes();
    const erradas: string[] = [];
    for (const c of CONJUNTOS) {
      for (const t of c.tabelas) {
        const colunas = existentes.get(t.nome) ?? [];
        if (t.posse.por === "coluna" && !colunas.includes(t.posse.coluna)) {
          erradas.push(`${t.nome} sem ${t.posse.coluna}`);
        }
        // Uma tabela que diz pender de outra tem mesmo de lhe apontar.
        if (t.posse.por === "pende") {
          const fk = `${t.posse.de.replace(/s$/, "")}_id`;
          const temFk = colunas.some((col) => col.endsWith("_id") && col !== "id");
          if (!temFk) erradas.push(`${t.nome} diz pender de ${t.posse.de} e não tem chave nenhuma`);
          void fk;
        }
        if (t.posse.por === "campo" && !colunas.includes(t.posse.coluna)) {
          erradas.push(`${t.nome} sem o campo ${t.posse.coluna}`);
        }
      }
    }
    expect(erradas).toEqual([]);
  });

  it("uma razão em FORA_DO_CATALOGO nunca é uma tabela que também está dentro", () => {
    const noCatalogo = new Set(CONJUNTOS.flatMap((c) => c.tabelas.map((t) => t.nome)));
    const ambos = Object.keys(FORA_DO_CATALOGO).filter((t) => noCatalogo.has(t));
    // `profiles` é a exceção declarada: o campo do perfil fiscal limpa-se,
    // a linha inteira sai com a conta.
    expect(ambos).toEqual(["profiles"]);
  });
});

describe("RC-DADOS-002 · o catálogo é legível por quem o vai usar", () => {
  it("cada conjunto tem id único e um grupo que existe", () => {
    const ids = CONJUNTOS.map((c) => c.id);
    expect(new Set(ids).size, "ids repetidos").toBe(ids.length);
    const grupos = new Set(GRUPOS.map((g) => g.id));
    for (const c of CONJUNTOS) {
      expect(grupos.has(c.grupo), `${c.id} num grupo inexistente`).toBe(true);
    }
  });

  it("cada grupo tem pelo menos um conjunto — nenhum aparece vazio", () => {
    for (const g of GRUPOS) {
      expect(
        CONJUNTOS.some((c) => c.grupo === g.id),
        `o grupo «${g.titulo}» não tem nada dentro`,
      ).toBe(true);
    }
  });

  it("as descrições dizem o que desaparece, sem nomes de tabelas", () => {
    for (const c of CONJUNTOS) {
      expect(c.titulo.length, `${c.id} sem título`).toBeGreaterThan(3);
      expect(c.descricao.length, `${c.id} com descrição curta de mais`).toBeGreaterThan(30);
      // Quem lê a zona de perigo não sabe o que é `contabilista_vinculos`.
      // Só os nomes técnicos contam: «recibos» é uma tabela E uma palavra
      // portuguesa, e proibi-la proibia escrever a frase que faz sentido.
      for (const t of c.tabelas.filter((x) => x.nome.includes("_"))) {
        expect(c.descricao, `${c.id} mostra o nome da tabela`).not.toContain(t.nome);
      }
    }
  });

  it("o que é retido diz porquê, e não entra na lista do que se apaga", () => {
    for (const c of CONJUNTOS) {
      if (!c.retido) continue;
      expect(c.retido.length, `${c.id} retido sem razão escrita`).toBeGreaterThan(20);
      expect(APAGAVEIS).not.toContain(c.id);
    }
  });

  it("encontra-se um conjunto pelo id, e um id inventado não devolve nada", () => {
    expect(conjuntoPorId("recibos")?.titulo).toBe("Recibos verdes");
    expect(conjuntoPorId("nao-existe")).toBeUndefined();
  });

  it("o que é retido é a tabela que a lei protege, e não o conjunto todo", () => {
    // ⚠️ `retido` era por conjunto. «Recebimentos e conta Stripe» tinha
    // duas tabelas — o histórico de pagamentos E a ligação à conta Stripe —
    // e um `retido` a cobrir as duas: não havia, em lado nenhum, forma de
    // desligar a conta de recebimentos, e a razão dada era uma lei de
    // conservação de faturação que não fala de ligações. O mesmo em
    // «Progressão e comissão», onde só `progressao_compras` é um documento.
    for (const c of CONJUNTOS.filter((x) => x.retido)) {
      expect(
        c.tabelas.length,
        `«${c.titulo}» retém ${c.tabelas.length} tabelas sob uma razão só — separa o que a lei protege do resto`,
      ).toBe(1);
    }
  });
});

describe("RC-DADOS-003 · o SQL apaga mesmo o que o catálogo diz ser apagável", () => {
  // ⚠️ ESTE É O TESTE QUE FALTAVA. Cinco conjuntos — `calendario`,
  // `painel-vistas`, `fundador`, `propostas-desbloqueio` e
  // `fidelidade-regras` — estavam declarados apagáveis, a rota validava-os
  // contra `APAGAVEIS` e mandava-os para `apagar_conjuntos`, onde não havia
  // bloco nenhum a corresponder-lhes. A função devolvia `ok: true` e as
  // linhas ficavam. Um endereço de calendário é a chave de leitura de uma
  // agenda: quem o mandou apagar continuou a ter o Google a lê-la.
  it("cada conjunto apagável tem um bloco em `apagar_conjuntos`", () => {
    const sql = ultimaFuncaoSql("apagar_conjuntos");
    expect(sql.length, "não se encontrou a função nas migrações").toBeGreaterThan(500);
    const semBloco = APAGAVEIS.filter((id) => !sql.includes(`'${id}' = ANY(p_conjuntos)`));
    expect(
      semBloco,
      "conjuntos que a interface deixa escolher e o SQL ignora em silêncio",
    ).toEqual([]);
  });

  it("`apagar_conjuntos` não apaga nada que o catálogo não declare apagável", () => {
    const sql = ultimaFuncaoSql("apagar_conjuntos");
    const nomeados = [...sql.matchAll(/'([a-z-]+)' = ANY\(p_conjuntos\)/g)].map((m) => m[1]);
    const intrusos = [...new Set(nomeados)].filter((id) => !APAGAVEIS.includes(id));
    expect(intrusos, "o SQL apaga conjuntos que o catálogo não conhece").toEqual([]);
  });

  it("`conjuntos_todos()` é exatamente `APAGAVEIS`", () => {
    // É a lista que sai quando a conta é apagada. Divergir dela é apagar a
    // conta e deixar dados para trás.
    const sql = ultimaFuncaoSql("conjuntos_todos");
    const noSql = [...sql.matchAll(/'([a-z-]+)'/g)].map((m) => m[1]).sort();
    expect(noSql).toEqual([...APAGAVEIS].sort());
  });

  it("o inventário tem uma chave por conjunto — sem ela a linha fica morta", () => {
    // ⚠️ A interface lê o inventário para saber o que a pessoa TEM. Sem
    // chave, `?? 0` dava zero, a linha aparecia a cinzento e a caixa
    // desativada: o buraco do SQL estava tapado por este, e nem dava para
    // escolher o que, escolhido, não seria apagado.
    const sql = ultimaFuncaoSql("inventario_do_utilizador");
    expect(sql.length, "não se encontrou a função nas migrações").toBeGreaterThan(500);
    const semChave = CONJUNTOS.map((c) => c.id).filter((id) => !sql.includes(`'${id}',`));
    expect(semChave, "conjuntos sem contagem — a interface não os deixa escolher").toEqual([]);
  });

  it("a retenção que a interface promete existe mesmo no esquema", () => {
    // ⚠️ «O que fica, e porquê» prometia que os pagamentos ficam retidos
    // pelo prazo legal. `pagamentos` e `progressao_compras` pendem de
    // `contabilistas(user_id)` com ON DELETE CASCADE, e `contabilistas`
    // pende de `auth.users` com ON DELETE CASCADE: apagar a conta — ou só
    // o perfil de contabilista — levava-os à frente. A promessa era falsa.
    const sql = ultimaFuncaoSql("apagar_conjuntos");
    expect(
      sql,
      "sem reter antes, o cascade leva os documentos que a interface diz que ficam",
    ).toContain("reter_faturacao");
    const reter = ultimaFuncaoSql("reter_faturacao");
    for (const t of CONJUNTOS.filter((c) => c.retido).flatMap((c) => c.tabelas.map((x) => x.nome))) {
      // `subscriptions` sai com a conta de propósito — o que fica está na
      // Stripe, e o catálogo di-lo.
      if (t === "subscriptions") continue;
      expect(reter, `${t} é prometida retida e não é copiada antes do cascade`).toContain(t);
    }
  });
});

describe("RC-DADOS-004 · o que nunca saiu do aparelho também tem catálogo", () => {
  it("cada domínio do cofre tem uma linha que a pessoa consegue ler", () => {
    // ⚠️ A zona de risco só sabia falar da nuvem. Quem não tem conta — a
    // maior parte de quem usa isto — tinha o estúdio de negócio, os preços
    // guardados, as hipóteses de mercado e o perfil de descoberta neste
    // aparelho, e nenhuma forma de os apagar.
    const noCatalogo = new Set(CONJUNTOS_LOCAIS.map((c) => c.id));
    const esquecidos = (Object.keys(DOMINIOS) as Dominio[]).filter((d) => !noCatalogo.has(d));
    expect(esquecidos, "domínios do cofre sem linha na zona de risco").toEqual([]);
  });

  it("o catálogo local não inventa domínios", () => {
    const reais = new Set(Object.keys(DOMINIOS));
    expect(CONJUNTOS_LOCAIS.filter((c) => !reais.has(c.id)).map((c) => c.id)).toEqual([]);
  });

  it("cada linha diz o que desaparece, e cabe num grupo que existe", () => {
    const grupos = new Set(GRUPOS_LOCAIS.map((g) => g.id));
    for (const c of CONJUNTOS_LOCAIS) {
      expect(grupos.has(c.grupo), `${c.id} num grupo inexistente`).toBe(true);
      expect(c.titulo.length, `${c.id} sem título`).toBeGreaterThan(3);
      expect(c.descricao.length, `${c.id} com descrição curta de mais`).toBeGreaterThan(30);
      // Quem lê isto não sabe o que é `recibocerto:hipoteses-mercado:v1`.
      expect(c.descricao, `${c.id} mostra a chave técnica`).not.toContain("recibocerto:");
    }
  });

  it("apagar um conjunto da nuvem NÃO leva o que não é a mesma coisa", () => {
    // ⚠️ O defeito que isto fixa: qualquer apagamento chamava
    // `esvaziarCofre`. Escolher «Comentários que deixaste» levava à frente
    // o estúdio de negócio, os preços e o perfil de descoberta — nada disso
    // está na nuvem, nada disso tinha sido escolhido — e a resposta dizia
    // «1 registo apagado».
    expect(dominiosDosConjuntos(["feedback"])).toEqual([]);
    expect(dominiosDosConjuntos(["cenarios"])).toEqual(["cenarios"]);
    // Os totais calculados dos recibos saem com os recibos: são deles.
    expect(dominiosDosConjuntos(["recibos"]).sort()).toEqual(["recibos", "recibos-computed"]);

    const sensiveis: Dominio[] = [
      "negocio", "precos-guardados", "perfil-descoberta",
      "hipoteses-mercado", "instantaneos-descoberta",
    ];
    const tudo = new Set(dominiosDosConjuntos(APAGAVEIS));
    for (const d of sensiveis) {
      expect(
        tudo.has(d),
        `${d} sai por causa de um apagamento na nuvem, e nunca esteve na nuvem`,
      ).toBe(false);
    }
  });

  it("um conjunto da nuvem só se liga a domínios que existem", () => {
    const reais = new Set(Object.keys(DOMINIOS));
    for (const [conjunto, dominios] of Object.entries(DOMINIOS_POR_CONJUNTO)) {
      expect(APAGAVEIS, `${conjunto} não é apagável`).toContain(conjunto);
      for (const d of dominios) expect(reais.has(d), `${conjunto} → ${d}`).toBe(true);
    }
  });
});
