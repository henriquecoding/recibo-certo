// ═══════════════════════════════════════════════════════════════════════
//  CORREÇÕES VINDAS DA REVISÃO DA PR #84
//  ---------------------------------------------------------------------
//  Um revisor automático apontou onze defeitos no ramo da parceria FIZ.
//  Verifiquei-os todos contra o código; todos existiam. Estes testes cobrem
//  os que têm lógica a sério — o leitor de CSV de comissões e as barreiras de
//  atribuição do redirecionador — e servem de cerca: se alguém desfizer uma
//  destas correções, é aqui que se sabe.
//
//  Os que são só de estrutura (uma migração, um `if` invertido, um `disabled`)
//  não se testam aqui: verificam-se a ler o ficheiro, e um teste que
//  reescrevesse o mesmo `if` não provava nada.
// ═══════════════════════════════════════════════════════════════════════

import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  detetarDelimitador,
  dividirLinha,
  lerCsv,
  lerMontante,
} from "@/lib/parcerias/csv-comissoes";
import { construirLinkAfiliado } from "@/lib/parcerias/link.server";
import { superficieValida, SUPERFICIES } from "@/content/parcerias-destinos";
import { DIVULGACAO_LIGACAO } from "@/content/parcerias-copy";
import type { ParceriaAtiva } from "@/lib/parcerias/catalogo.server";

const RAIZ = process.cwd();

/** A FIZ como o construtor a recebe, com os links reais. */
const FIZ_TESTE: ParceriaAtiva = {
  id: "fiz",
  parceiroKey: "fiz",
  nome: "FIZ",
  modo: "LIGACAO",
  linkAfiliado: "https://fiz.co/?ref=gpZWdtnhQPIsWJYR",
  linkAfiliadoRegisto: "https://app.fiz.co/auth?ref=gpZWdtnhQPIsWJYR",
  dominiosPermitidos: ["fiz.co", "app.fiz.co"],
  subidParam: null,
  caminhoSuportado: false,
  divulgacao: DIVULGACAO_LIGACAO,
  logoUrl: null,
  corMarca: null,
  comissaoDescricao: null,
  atribuicaoJanelaDias: 90,
  validacaoDias: 30,
  atribuicaoNota: null,
  inicioEm: null,
  fimEm: null,
  ativo: true,
};

describe("revisao:csv — um delimitador só, e montantes à portuguesa", () => {
  it("deteta o ponto e vírgula do Excel em pt-PT", () => {
    expect(detetarDelimitador("id;estado;liquido;comissao;data")).toBe(";");
  });

  it("deteta a vírgula quando é essa a convenção", () => {
    expect(detetarDelimitador("id,estado,liquido,comissao,data")).toBe(",");
  });

  it("não conta separadores dentro de aspas", () => {
    // Três `;` reais e duas vírgulas, mas as vírgulas estão todas protegidas.
    expect(detetarDelimitador('id;"Lisboa, Porto";"a,b";data')).toBe(";");
  });

  it("respeita aspas e aspas escapadas ao dividir", () => {
    expect(dividirLinha('a;"b;c";d', ";")).toEqual(["a", "b;c", "d"]);
    expect(dividirLinha('a;"diz ""olá""";c', ";")).toEqual(["a", 'diz "olá"', "c"]);
  });

  describe("revisao:csv — lerMontante", () => {
    const casos: Array<[string, number | null]> = [
      // Português: ponto de milhares, vírgula decimal.
      ["1.234,56", 1234.56],
      ["9,99", 9.99],
      ["1.234.567,89", 1234567.89],
      ["-1.234,56", -1234.56],
      // Inglês: vírgula de milhares, ponto decimal.
      ["1,234.56", 1234.56],
      ["9.99", 9.99],
      // Sem parte decimal — três casas é sempre grupo de milhares.
      ["1,234", 1234],
      ["1.234", 1234],
      ["1.234.567", 1234567],
      // Com símbolo e espaços, como vem de uma folha de cálculo.
      ["€ 1.234,56", 1234.56],
      ["1 234,56 EUR", 1234.56],
      // Inteiros simples.
      ["1234", 1234],
      ["0", 0],
      // O que NÃO é número tem de dizer que não é — não pode virar zero.
      ["", null],
      ["   ", null],
      ["n/d", null],
      ["—", null],
    ];

    it.each(casos)("lê %s como %s", (bruto, esperado) => {
      expect(lerMontante(bruto)).toBe(esperado);
    });
  });

  it("um CSV português com 1.234,56 não desalinha as colunas", () => {
    // Este é o caso que o `split(/[,;]/)` original partia: a vírgula decimal
    // criava uma coluna a mais e empurrava a data para o lugar do plano.
    const csv = ["id;estado;liquido;comissao;plano;data", "c-1;confirmada;1.234,56;370,37;anual;2026-07-01"].join(
      "\n",
    );
    const { linhas, erro } = lerCsv(csv);

    expect(erro).toBeUndefined();
    expect(linhas).toHaveLength(1);
    expect(linhas[0].id).toBe("c-1");
    expect(linhas[0].estado).toBe("confirmada");
    expect(linhas[0].valor_liquido).toBe(1234.56);
    expect(linhas[0].valor_comissao).toBe(370.37);
    expect(linhas[0].plano).toBe("anual");
    // A prova de que nada escorregou: a data continua a ser uma data.
    expect(linhas[0].ocorrido_em).toBe("2026-07-01");
  });

  it("o mesmo relatório à inglesa dá exatamente os mesmos números", () => {
    const csv = ["id,estado,liquido,comissao,plano,data", "c-1,confirmada,1234.56,370.37,anual,2026-07-01"].join(
      "\n",
    );
    const { linhas } = lerCsv(csv);
    expect(linhas[0].valor_liquido).toBe(1234.56);
    expect(linhas[0].valor_comissao).toBe(370.37);
  });

  it("um montante ilegível ABORTA a importação em vez de gravar zero", () => {
    const csv = ["id;liquido;comissao;data", "c-1;n/d;370,37;2026-07-01"].join("\n");
    const { linhas, erro } = lerCsv(csv);

    expect(linhas).toHaveLength(0);
    expect(erro).toMatch(/ilegíve/i);
    // A mensagem tem de dizer QUAL linha e QUAL campo — senão o admin fica a
    // olhar para um ficheiro de mil linhas sem saber onde.
    expect(erro).toContain("linha 2");
    expect(erro).toMatch(/valor líquido/);
  });

  it("continua a recusar um ficheiro sem as colunas obrigatórias", () => {
    const { linhas, erro } = lerCsv("qualquer;coisa\n1;2");
    expect(linhas).toHaveLength(0);
    expect(erro).toMatch(/Faltam colunas/);
  });
});

describe("revisao:atribuicao — `s` e `g` não saem daqui sem validação", () => {
  const ROTA = join(RAIZ, "src/app/ir/[parceiro]/route.ts");
  const fonte = () => readFileSync(ROTA, "utf8");

  it("a superfície é validada contra a lista fechada", () => {
    expect(fonte()).toMatch(/superficieValida\(superficieBruta\)/);
  });

  it("o slug do guia é validado contra os manifestos", () => {
    // Um slug que não corresponda a um guia real não pode chegar ao
    // `utm_content` — era por aí que um `?g=<email>` passava.
    expect(fonte()).toMatch(/manifesto\(slugBruto\)/);
  });

  it("a variante é limitada à forma de um token nosso", () => {
    expect(fonte()).toMatch(/\[a-z0-9_-\]\{1,32\}/);
  });

  it("superficieValida recusa o que não está na lista", () => {
    expect(superficieValida("demo.hero")).toBe(true);
    expect(superficieValida("ricopanacota@gmail.com")).toBe(false);
    expect(superficieValida("123456789")).toBe(false);
    expect(superficieValida("")).toBe(false);
  });

  it("toda a superfície da lista passa a própria validação", () => {
    for (const s of SUPERFICIES) expect(superficieValida(s)).toBe(true);
  });
});

describe("revisao:parcerias — o interruptor geral fecha a porta, não a abre", () => {
  const ROTA = join(RAIZ, "src/app/api/integrations/fiz/handoff/route.ts");

  it("desligar as parcerias RECUSA o handoff", () => {
    const fonte = readFileSync(ROTA, "utf8");
    // O defeito era `if (parceriasAtivas()) { …guarda… }`: com as parcerias
    // desligadas o guarda não corria e a execução seguia para `criarHandoff`.
    expect(fonte).toMatch(/if \(!parceriasAtivas\(\)\)/);
    expect(fonte).toMatch(/parcerias_desligadas/);

    // E o guarda de modo tem de estar FORA de qualquer `if (parceriasAtivas())`.
    const semComentarios = fonte
      .split("\n")
      .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"))
      .join("\n");
    expect(semComentarios).not.toMatch(/if \(parceriasAtivas\(\)\) \{/);
  });
});

describe("revisao:placements — desligar no admin tem de desligar no site", () => {
  const CATALOGO = join(RAIZ, "src/lib/parcerias/catalogo.server.ts");
  const ADMIN = join(RAIZ, "src/app/admin/parceiros/[id]/page.tsx");

  it("a consulta lê também as linhas desligadas", () => {
    const fonte = readFileSync(CATALOGO, "utf8");
    const semComentarios = fonte
      .split("\n")
      .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"))
      .join("\n");
    // Filtrar por `ativo = true` na consulta apagava a diferença entre
    // «desligado» e «nunca configurado», e o piso em código ressuscitava-o.
    expect(semComentarios).not.toMatch(/\.eq\("ativo", true\)/);
  });

  it("uma linha desligada devolve null em vez de cair no piso", () => {
    const fonte = readFileSync(CATALOGO, "utf8");
    expect(fonte).toMatch(/if \(!daBase\.ativo\) return null;/);
  });

  it("o formulário do admin desativa em vez de apagar", () => {
    const fonte = readFileSync(ADMIN, "utf8");
    expect(fonte).toMatch(/guardarPlacement\(\{ \.\.\.p, ativo: false \}\)/);
    expect(fonte).not.toMatch(/eliminarPlacement/);
  });
});

describe("revisao:tokens — a revogação por coluna não bastava", () => {
  const M = join(RAIZ, "supabase/migrations/026_tokens_revogar_tabela_e_conceder_colunas.sql");

  it("revoga o SELECT à TABELA e devolve coluna a coluna", () => {
    const sql = readFileSync(M, "utf8");
    // No PostgreSQL os privilégios somam-se: um REVOKE por coluna não
    // subtrai nada a um GRANT feito à tabela inteira.
    expect(sql).toMatch(/REVOKE SELECT ON public\.partner_connections FROM authenticated, anon;/);
    expect(sql).toMatch(/GRANT SELECT \(/);
  });

  it("as duas colunas de cifra ficam fora do GRANT", () => {
    const sql = readFileSync(M, "utf8");
    const grant = sql.slice(sql.indexOf("GRANT SELECT ("), sql.indexOf("TO authenticated;"));
    expect(grant).not.toMatch(/access_token_ciphertext/);
    expect(grant).not.toMatch(/refresh_token_ciphertext/);
    // E as que a interface precisa continuam lá.
    expect(grant).toMatch(/status/);
    expect(grant).toMatch(/connected_at/);
  });
});

describe("revisao:afiliado — QA não gera auto-referências", () => {
  const LINK = join(RAIZ, "src/lib/parcerias/link.server.ts");

  it("fora de produção o código de afiliado é retirado", () => {
    const fonte = readFileSync(LINK, "utf8");
    expect(fonte).toMatch(/limparAfiliadoForaDeProducao\(url\)/);
    expect(fonte).toMatch(/PARAMS_DE_AFILIADO/);
  });

  it("usa VERCEL_ENV, não NODE_ENV", () => {
    const fonte = readFileSync(LINK, "utf8");
    // `NODE_ENV` vale "production" numa pré-visualização da Vercel, que é
    // precisamente o ambiente que se quer excluir.
    expect(fonte).toMatch(/VERCEL_ENV/);
    const emProducao = fonte.slice(fonte.indexOf("function emProducao"), fonte.indexOf("function limparAfiliado"));
    expect(emProducao).not.toMatch(/NODE_ENV/);
  });

  // Os testes acima leem a fonte; estes constroem o link a sério, que é o que
  // realmente importa.
  describe("comportamento, por ambiente", () => {
    const envOriginal = process.env.VERCEL_ENV;
    afterEach(() => {
      if (envOriginal === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = envOriginal;
    });

    const construir = () =>
      construirLinkAfiliado({
        parceiro: FIZ_TESTE,
        superficie: "guia.next_step",
        clickId: "abc123",
      }).url;

    it("em produção o `ref` vai", () => {
      process.env.VERCEL_ENV = "production";
      expect(new URL(construir()).searchParams.get("ref")).toBe("gpZWdtnhQPIsWJYR");
    });

    it("numa pré-visualização o `ref` NÃO vai", () => {
      process.env.VERCEL_ENV = "preview";
      const parsed = new URL(construir());
      expect(parsed.searchParams.get("ref")).toBeNull();
      // O destino continua a ser o site deles — a pré-visualização tem de ser
      // fiel em tudo menos na atribuição.
      expect(parsed.host).toBe("fiz.co");
      expect(parsed.searchParams.get("utm_source")).toBe("recibocerto");
    });

    it("em local (sem VERCEL_ENV) o `ref` NÃO vai", () => {
      delete process.env.VERCEL_ENV;
      expect(new URL(construir()).searchParams.get("ref")).toBeNull();
    });
  });
});

describe("revisao:energia — não se joga a zero", () => {
  const STORE = join(RAIZ, "src/lib/store/quiz-progresso.ts");
  const APP = join(RAIZ, "src/components/quiz-fiscal/QuizFiscalApp.tsx");
  const RESULTADO = join(RAIZ, "src/components/quiz-fiscal/Resultado.tsx");

  it("consumirEnergia recusa quando não há energia", () => {
    const fonte = readFileSync(STORE, "utf8");
    expect(fonte).toMatch(/if \(energiaRestante <= 0\) return false;/);
  });

  it("os dois caminhos que iniciam sessão honram a recusa", () => {
    const fonte = readFileSync(APP, "utf8");
    const chamadas = fonte.match(/if \(!progresso\.consumirEnergia\(\)\) return;/g) ?? [];
    // `handleIniciar` e `handleJogarNovamente`.
    expect(chamadas).toHaveLength(2);
  });

  it("o botão de repetir fica inerte a zero", () => {
    expect(readFileSync(RESULTADO, "utf8")).toMatch(/disabled=\{semEnergia\}/);
  });
});
