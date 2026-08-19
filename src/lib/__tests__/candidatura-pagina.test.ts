// ═══════════════════════════════════════════════════════════════════════
//  A PÁGINA DE CANDIDATURA — o que ela promete tem de ser verdade
//  ---------------------------------------------------------------------
//  Uma página que convence alguém a pôr o nome dele numa plataforma é a
//  página onde uma frase generosa a mais custa mais caro. Estes testes não
//  verificam estilo: verificam que cada afirmação sobre dinheiro,
//  privacidade e funcionamento tem correspondência no código que a cumpre.
//
//  Quando uma destas falhar, a pergunta certa não é «como faço o teste
//  passar» — é «a página ainda está a dizer a verdade?».
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ler = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const PAGINA = "src/app/contabilistas/candidatura/page.tsx";
const fonte = ler(PAGINA);

const semComentarios = (s: string) =>
  s.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

describe("candidatura: não é só um formulário", () => {
  it("explica antes de pedir — o formulário é a última secção", () => {
    const primeiraSeccao = fonte.indexOf("<Seccao");
    const formulario = fonte.indexOf("<FormularioCandidatura");
    expect(primeiraSeccao).toBeGreaterThan(0);
    expect(formulario, "o formulário aparece antes de se explicar o que é")
      .toBeGreaterThan(primeiraSeccao);
  });

  it("cobre as perguntas que decidem: como chegam clientes, o que custa, o que se ganha", () => {
    const texto = fonte.replace(/\s+/g, " ");
    expect(texto).toMatch(/Como é que alguém chega até ti/);
    expect(texto).toMatch(/O que custa/);
    expect(texto).toMatch(/O que tens para trabalhar/);
    expect(texto).toMatch(/O que a plataforma não vê/);
    expect(texto).toMatch(/Perguntas que ficam/);
  });

  it("nomeia as funcionalidades que existem mesmo", () => {
    // Cada uma destas tem de ter um ecrã por trás. Uma página que promete
    // uma funcionalidade inexistente é a pior forma de perder alguém: ele
    // descobre depois de entrar.
    const rotas: [string, string][] = [
      ["Casos e propostas", "src/app/contabilista/casos/page.tsx"],
      ["Agenda e sincronização", "src/app/contabilista/agenda/page.tsx"],
      ["Recebimentos", "src/app/contabilista/pagamentos/page.tsx"],
      ["Cartão de fidelidade", "src/app/contabilista/fidelidade/page.tsx"],
      ["Progressão", "src/app/contabilista/progressao/page.tsx"],
      ["Perfil público", "src/app/contabilista/perfil/page.tsx"],
      ["Partilhas dos clientes", "src/app/contabilista/partilhas/page.tsx"],
    ];
    for (const [rotulo, ficheiro] of rotas) {
      expect(fonte, `a página promete «${rotulo}»`).toContain(rotulo);
      expect(() => ler(ficheiro), `«${rotulo}» promete um ecrã que não existe`).not.toThrow();
    }
  });
});

describe("candidatura: o dinheiro é dito com números verdadeiros", () => {
  it("a tabela de patamares vem do catálogo, e não escrita à mão", () => {
    // Números copiados para JSX divergem do catálogo na primeira vez que
    // alguém mudar um preço — e a página fica a anunciar o preço antigo.
    expect(fonte).toContain("PATAMARES.map");
    expect(fonte).toContain("formatarComissao(p.comissaoBps)");
    expect(fonte).toContain("formatarEuros(p.precoDesbloqueioCents)");
  });

  it("a comissão de fundador vem da constante partilhada", () => {
    expect(fonte).toContain("COMISSAO_FUNDADOR_TEXTO");
    expect(semComentarios(fonte)).not.toMatch(/>5%</);
  });

  it("o número de lugares vem da constante, e não de um «10» escrito", () => {
    expect(fonte).toContain("LUGARES_FUNDADORES");
  });

  it("as fronteiras comerciais são citadas do código que as impõe", () => {
    for (const c of ["COPY_BASE_DA_COMISSAO", "COPY_QUEM_FATURA",
                     "COPY_ELEGIBILIDADE", "DESBLOQUEIO_NAO_COMPRA"]) {
      expect(fonte, `a página devia citar ${c}`).toContain(c);
    }
  });

  it("o teto de encaminhamentos vem do domínio", () => {
    expect(fonte).toContain("TETO_DE_ENCAMINHAMENTOS");
  });
});

describe("candidatura: o contador não engana", () => {
  it("falha fechada — sem confirmação, não anuncia lugares", () => {
    // `lugares.verificado &&` antes de mostrar o bloco. Sem isto, uma
    // falha de leitura anunciava «restam 10» a um programa esgotado.
    expect(fonte).toContain("lugares.verificado && !lugares.esgotado");
  });

  it("o texto do contador vem de `textoLugares`, que tem teste anti-urgência", () => {
    expect(fonte).toContain("textoLugares(lugares)");
  });

  it("é lido no servidor, para chegar a quem não espera pelo JavaScript", () => {
    expect(fonte).toContain("lugaresFundadoresServidor");
    expect(fonte).not.toContain('"use client"');
  });

  it("revalida — o número muda, e uma página estática para sempre mentiria", () => {
    expect(fonte).toMatch(/export const revalidate = \d+/);
  });
});

describe("candidatura: as garantias de privacidade batem com o esquema", () => {
  const migracao = ler("supabase/migrations/20260818210000_fim_da_mediacao.sql");

  it("«ninguém lê as conversas» corresponde à política que o garante", () => {
    expect(fonte.replace(/\s+/g, " "))
      .toMatch(/Ninguém da administração as alcança/i);
    // E a política não inclui `is_admin()` senão para o que foi denunciado.
    expect(migracao).toContain(
      "OR (denunciada_em IS NOT NULL AND public.is_admin())");
  });

  it("a exceção da denúncia está dita na página, e não escondida", () => {
    expect(fonte.replace(/\s+/g, " "))
      .toMatch(/única exceção é uma mensagem que tu\s*ou o cliente nos entreguem/i);
  });

  it("«não pedimos acesso ao teu calendário» bate com o feed num sentido só", () => {
    expect(fonte).toMatch(/num sentido só/i);
    const rota = ler("src/app/api/calendario/[token]/route.ts");
    // A rota é só GET: não há forma de escrever no calendário de ninguém.
    expect(rota).toContain("export async function GET");
    expect(rota).not.toMatch(/export async function (POST|PUT|PATCH|DELETE)/);
  });

  it("«o dinheiro nunca passa por nós» é a mesma frase das fronteiras", () => {
    const fronteiras = ler("src/lib/contabilistas/progressao/fronteiras.ts");
    expect(fronteiras).toMatch(/nunca passa pela conta do Recibo Certo/);
  });
});

describe("candidatura: honestidade sobre o que ainda não é", () => {
  it("não promete volume de clientes", () => {
    const texto = semComentarios(fonte).replace(/\s+/g, " ");
    expect(texto).toMatch(/Não te prometemos volume/i);
    expect(texto).not.toMatch(/milhares de clientes|garantimos \w+ clientes/i);
  });

  it("não promete um prazo de resposta que não se garante", () => {
    expect(fonte.replace(/\s+/g, " "))
      .toMatch(/Não prometemos um prazo que ainda não conseguimos garantir/i);
  });

  it("diz que se pode combinar por fora, e o que isso custa", () => {
    const texto = fonte.replace(/\s+/g, " ");
    expect(texto).toMatch(/Não há bloqueio nenhum a partilhar contactos/i);
    expect(texto).toMatch(/não conta para XP/i);
  });

  it("não inventa testemunhos nem métricas", () => {
    const texto = semComentarios(fonte);
    expect(texto).not.toMatch(/["«][^"»]{20,}["»]\s*—\s*[A-ZÁÉÍÓÚ]/);
    expect(texto).not.toMatch(/\b\d+\s*(contabilistas|clientes|utilizadores) (já|ativos|satisfeitos)/i);
  });
});

describe("candidatura: as regras da casa", () => {
  it("sem emojis", () => {
    expect(semComentarios(fonte)).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });

  it("mobile-first: nenhuma grelha assume colunas no telemóvel", () => {
    for (const m of fonte.matchAll(/(^|[\s"])grid-cols-(\d)/g)) {
      expect(m[2], "a base assume várias colunas").toBe("1");
    }
  });

  it("a tabela larga rola dentro do seu próprio contentor", () => {
    // Sem isto, a página inteira rola na horizontal a 360px — e o resto
    // do conteúdo passa a ficar fora do ecrã.
    expect(fonte).toContain("overflow-x-auto");
    expect(fonte).toContain("min-w-[30rem]");
  });

  it("cada secção tem cabeçalho associado, para quem navega por landmarks", () => {
    expect(fonte).toContain("aria-labelledby={`s-${id}`}");
    expect(fonte).toContain('id={`s-${id}`}');
  });

  it("a tabela tem `caption` e cabeçalhos de linha", () => {
    expect(fonte).toContain("<caption className=\"sr-only\">");
    expect(fonte).toContain('scope="row"');
    expect(fonte).toContain('scope="col"');
  });
});
