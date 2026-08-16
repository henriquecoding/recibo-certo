// ═══════════════════════════════════════════════════════════════════════
//  O QUE É PÚBLICO NUM CONTABILISTA É UMA LISTA, NÃO UMA LINHA
//  ---------------------------------------------------------------------
//  A política do diretório escolhe LINHAS: «quem está aprovado é
//  legível». Não escolhe colunas. Enquanto o frontend lê a tabela, o que
//  sai para quem não tem sessão é tudo o que lá estiver — hoje inclui o
//  `linkedin_subject` (o identificador OIDC do LinkedIn), o `pedido_id`
//  que liga a ficha à candidatura, e o telefone, que ecrã nenhum mostra.
//
//  O problema que interessa não é o de hoje, é o de amanhã: a Progressão
//  e Comissão desenhada para esta plataforma tem XP, patamar comprado e
//  créditos. Qualquer uma dessas colunas em `contabilistas` nasceria
//  pública — a comissão de todos os contabilistas à vista, sem ninguém
//  escrever uma linha de frontend.
//
//  A correção é um contrato explícito: a view `contabilistas_publico`,
//  com as colunas ditas uma a uma. Este teste guarda-a dos dois lados —
//  o SQL que a define e o TypeScript que a lê.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();
const ler = (...p: string[]) => readFileSync(join(RAIZ, ...p), "utf8");

const MIGRACAO = ler(
  "supabase", "migrations", "20260815200000_contrato_publico_contabilistas.sql",
);
const DADOS = ler("src", "lib", "contabilistas", "dados.ts");

/** O corpo da view, para se poder perguntar o que ela seleciona. */
const CORPO_DA_VIEW = MIGRACAO.slice(
  MIGRACAO.search(/CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+public\.contabilistas_publico/),
  MIGRACAO.indexOf("COMMENT ON VIEW"),
);

describe("o contrato público do diretório", () => {
  it("é uma view, com `security_invoker = false`", () => {
    // Sem isto a view corre com os privilégios de quem pergunta e deixa
    // de devolver seja o que for no dia em que a política da tabela sair
    // — que é exatamente o dia para que ela existe.
    expect(CORPO_DA_VIEW).toContain("security_invoker = false");
    expect(CORPO_DA_VIEW).toMatch(/WHERE\s+c\.estado = 'aprovado'/);
  });

  it("mostra o que os ecrãs públicos mostram", () => {
    for (const coluna of [
      "slug", "nome", "occ", "bio", "distrito", "concelho",
      "especialidades", "modalidades", "email_contacto", "website",
      "aceita_novos_clientes", "fidelidade_ativa",
    ]) {
      expect(CORPO_DA_VIEW, `a view deixou de expor ${coluna}`).toMatch(
        new RegExp(`c\\.${coluna}\\b`),
      );
    }
  });

  it.each([
    ["linkedin_subject", "é o identificador OIDC do LinkedIn"],
    ["pedido_id", "liga a ficha pública à candidatura"],
    ["telefone", "não é mostrado por ecrã nenhum; sai por contacto_do_contabilista"],
    ["linkedin_avatar_url", "a foto sai pela rota que a serve, não pela linha"],
  ])("não expõe %s — %s", (coluna) => {
    expect(CORPO_DA_VIEW).not.toMatch(new RegExp(`c\\.${coluna}\\b`));
  });

  it("o telefone sai por função, e a função exige relação", () => {
    const fn = MIGRACAO.slice(
      MIGRACAO.indexOf("FUNCTION public.contacto_do_contabilista"),
      MIGRACAO.indexOf("COMMENT ON FUNCTION public.contacto_do_contabilista"),
    );
    expect(fn).toContain("SECURITY DEFINER");
    expect(fn).toContain("vinculo_nao_terminado");
    expect(fn).toMatch(/REVOKE EXECUTE[\s\S]*FROM anon/);
  });

  it("há uma guarda que recusa reabrir a tabela ao público", () => {
    // A correção sem a guarda dura até alguém precisar de um campo novo
    // no diretório e recriar a política aberta — que é a solução óbvia
    // para quem não leu a migração.
    expect(MIGRACAO).toContain("assert_contrato_publico_contabilistas");
    expect(MIGRACAO).toMatch(/cmd IN \('SELECT', 'ALL'\)/);
    expect(MIGRACAO).toMatch(/'anon'::name = ANY \(roles\)/);
  });

  it("não fecha o diretório no mesmo passo em que o abre", () => {
    // Quebrar as leituras no mesmo deploy que introduz a alternativa é
    // pedir um diretório vazio em produção. O corte é deliberadamente
    // um passo à parte, documentado no fim do ficheiro.
    const executavel = MIGRACAO.slice(0, MIGRACAO.indexOf("COMMIT;"));
    expect(executavel).not.toMatch(/DROP POLICY[^\n]*contabilistas_diretorio_publico/);
    expect(executavel).not.toMatch(/REVOKE SELECT ON public\.contabilistas/);
    expect(MIGRACAO).toContain("O PASSO SEGUINTE");
  });
});

describe("o cliente lê a view, não a tabela", () => {
  it("o diretório e o perfil público leem `contabilistas_publico`", () => {
    expect(DADOS).toContain('const VISTA_PUBLICA = "contabilistas_publico"');
    // Duas leituras públicas: a lista e a ficha por slug.
    const leituras = DADOS.match(/\.from\(VISTA_PUBLICA\)/g) ?? [];
    expect(leituras.length).toBeGreaterThanOrEqual(2);
  });

  it("a ficha própria continua a vir da tabela, com o estado", () => {
    // O painel precisa de saber que a conta está suspensa, e a view só
    // tem aprovados. São leituras diferentes, com autorizações diferentes.
    expect(DADOS).toContain("CAMPOS_DA_FICHA");
    expect(DADOS).toMatch(/CAMPOS_DA_FICHA[\s\S]{0,400}estado/);
  });

  it("nenhuma leitura pública seleciona a tabela inteira", () => {
    expect(DADOS).not.toMatch(/\.from\("contabilistas"\)\s*\.select\("\*"\)/);
  });

  it("o vínculo do cliente não depende da política do diretório", () => {
    // Era um `join` embutido à tabela. O cliente não tem política própria
    // sobre a ficha do contabilista — tinha-a por arrastamento. No dia em
    // que o diretório fechar, o `join` devolvia null e a área do cliente
    // ficava sem o nome de quem o acompanha.
    expect(DADOS).not.toContain('contabilista:contabilista_id (');
  });
});

// ═══════════════════════════════════════════════════════════════════════
//  A VIEW É REDEFINIDA TRÊS VEZES, E ISSO TEM DUAS CONSEQUÊNCIAS
//  ---------------------------------------------------------------------
//  Três migrações desta série definem `contabilistas_publico`, cada uma
//  acrescentando colunas NO MEIO da lista da anterior. Daí duas regras
//  que ninguém adivinha ao escrever a quarta:
//
//   1. `CREATE OR REPLACE VIEW` NÃO SERVE. Só sabe acrescentar colunas no
//      fim; sobre uma view já crescida recusa com «42P16: cannot drop
//      columns from view». Custou uma reaplicação falhada em produção.
//
//   2. A ORDEM DOS NOMES DE FICHEIRO É A ORDEM DE APLICAÇÃO. Qualquer
//      ferramenta aplica por ordem alfabética; se o nome não ordenar como
//      a dependência, a última definição a correr é a errada — e o
//      diretório passa a ler a fidelidade das colunas espelho em vez da
//      regra corrente, sem nada falhar. Foi o que aconteceu: a série
//      nasceu com nomes `1201xx/1202xx/1203xx` que ordenavam ANTES do
//      contrato público e do perfil, ao contrário das dependências.
// ═══════════════════════════════════════════════════════════════════════

/** Cada definição da view, na ordem em que uma ferramenta as aplicaria. */
function definicoesDaViewPorOrdemDeAplicacao(): { ficheiro: string; corpo: string }[] {
  const dir = join(RAIZ, "supabase", "migrations");
  const achados: { ficheiro: string; corpo: string }[] = [];
  for (const ficheiro of readdirSync(dir).sort()) {
    if (!ficheiro.endsWith(".sql")) continue;
    const sql = ler("supabase", "migrations", ficheiro);
    const re = /CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+public\.contabilistas_publico/gi;
    for (let m = re.exec(sql); m; m = re.exec(sql)) {
      const fim = sql.indexOf(";", m.index);
      achados.push({ ficheiro, corpo: sql.slice(m.index, fim === -1 ? undefined : fim) });
    }
  }
  return achados;
}

describe("a view pública sobrevive a ser reaplicada", () => {
  const definicoes = definicoesDaViewPorOrdemDeAplicacao();

  it("há mais do que uma definição — é por isso que isto importa", () => {
    expect(definicoes.length).toBeGreaterThan(1);
  });

  it.each(definicoes.map((d) => d.ficheiro))(
    "%s cria a view com DROP antes, nunca com CREATE OR REPLACE",
    (ficheiro) => {
      const sql = ler("supabase", "migrations", ficheiro);
      // `CREATE OR REPLACE VIEW` recusa com 42P16 se a view já cresceu.
      expect(
        /CREATE\s+OR\s+REPLACE\s+VIEW\s+public\.contabilistas_publico/i.test(sql),
        `${ficheiro}: usa CREATE OR REPLACE VIEW — reaplicar dá 42P16`,
      ).toBe(false);
      expect(
        /DROP\s+VIEW\s+IF\s+EXISTS\s+public\.contabilistas_publico/i.test(sql),
        `${ficheiro}: falta o DROP VIEW IF EXISTS antes do CREATE`,
      ).toBe(true);
    },
  );

  it("a ÚLTIMA definição por ordem de ficheiro é a que lê a regra corrente", () => {
    // Se um nome novo ordenar depois desta, o diretório volta a ler a
    // fidelidade das colunas espelho de `contabilistas` sem nada falhar.
    const ultima = definicoes.at(-1)!;
    expect(
      ultima.corpo,
      `a última definição da view é em ${ultima.ficheiro}, e não lê fidelidade_regras`,
    ).toContain("fidelidade_regras");
  });

  it("os nomes ordenam como as dependências, não ao contrário", () => {
    const nomes = readdirSync(join(RAIZ, "supabase", "migrations")).sort();
    const posicao = (parte: string) => nomes.findIndex((n) => n.includes(parte));

    // O contrato público cria a view; o perfil acrescenta-lhe colunas que
    // só ele cria; a fidelidade fecha-a lendo a regra; a progressão
    // substitui os ganchos que a fidelidade deixou no-op.
    const ordem = [
      "contrato_publico_contabilistas",
      "perfil_profissional_campos",
      "dashboard_modular_contabilistas",
      "fidelidade_v2_regras_versionadas",
      "progressao_comissao_contabilistas",
    ].map((p) => ({ p, i: posicao(p) }));

    for (const { p, i } of ordem) expect(i, `migração ${p} não encontrada`).toBeGreaterThan(-1);
    for (let k = 1; k < ordem.length; k++) {
      expect(
        ordem[k].i,
        `${ordem[k].p} tem de ordenar DEPOIS de ${ordem[k - 1].p} — renomeia o ficheiro`,
      ).toBeGreaterThan(ordem[k - 1].i);
    }
  });
});

describe("as migrações da plataforma continuam coerentes", () => {
  it("a migração nova não reescreve nenhuma migração já aplicada", () => {
    const nomes = readdirSync(join(RAIZ, "supabase", "migrations"));
    expect(nomes).toContain("20260815200000_contrato_publico_contabilistas.sql");
    // A 042 é histórica: a política antiga tem de continuar lá, tal como
    // foi aplicada. O que muda é o que passa a existir ao lado dela.
    expect(ler("supabase", "migrations", "042_plataforma_contabilistas.sql"))
      .toContain('CREATE POLICY "contabilistas_diretorio_publico"');
  });
});
