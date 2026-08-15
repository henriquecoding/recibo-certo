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
  MIGRACAO.indexOf("CREATE OR REPLACE VIEW public.contabilistas_publico"),
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
