// ═══════════════════════════════════════════════════════════════════════
//  P0 — O QUE O DIRETÓRIO PÚBLICO NÃO PODE FAZER
//  ---------------------------------------------------------------------
//  Um diretório é a superfície mais exposta do produto: é pública, é
//  indexável e é lida sem sessão. As regras que aqui se verificam não são
//  preferências de estilo — são a fronteira entre o que a plataforma
//  decidiu publicar e o que apenas calhava estar na mesma tabela.
//
//  O teste é estático de propósito. Uma regressão destas não se manifesta
//  como um ecrã errado: manifesta-se como uma coluna a mais numa resposta
//  JSON que ninguém abriu. Ler o código é o que apanha isso antes de ir
//  para produção.
// ═══════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const raiz = process.cwd();
const ler = (p: string) => readFileSync(join(raiz, p), "utf8");

/**
 * O ficheiro sem os comentários.
 *
 * Estas regras são sobre o que o código FAZ, e um comentário que explica
 * porque é que o telefone não está aqui é a melhor coisa que pode estar
 * escrito neste ficheiro — seria absurdo que a regra o proibisse. O
 * `[^:]` antes de `//` deixa passar `https://` dentro de uma string.
 */
const codigo = (p: string) =>
  ler(p)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const CAMADA_DE_DADOS = "src/lib/contabilistas/diretorio.ts";

const SUPERFICIE = [
  "src/app/contabilistas/page.tsx",
  "src/app/contabilistas/DiretorioCliente.tsx",
  "src/app/contabilistas/ContabilistaCard.tsx",
  "src/app/contabilistas/DiretorioFinder.tsx",
  "src/app/contabilistas/DiretorioFiltros.tsx",
  "src/app/contabilistas/DiretorioComoFunciona.tsx",
] as const;

describe("a fronteira pública do diretório", () => {
  it("lê a view, e nunca a tabela", () => {
    const dados = ler(CAMADA_DE_DADOS);

    expect(dados).toContain('"contabilistas_publico"');
    expect(dados).not.toMatch(/\.from\(\s*["'`]contabilistas["'`]\s*\)/);
    expect(dados).not.toMatch(/from\(\s*["'`]contabilistas["'`]/);
  });

  it("pede colunas nomeadas, não a linha inteira", () => {
    const dados = ler(CAMADA_DE_DADOS);

    expect(dados).toContain("CAMPOS_DO_CARTAO");
    expect(dados).not.toMatch(/\.select\(\s*["'`]\*["'`]/);
  });

  it("não pede nem uma coluna que o cartão não mostre", () => {
    const dados = ler(CAMADA_DE_DADOS);
    const campos = dados.match(/const CAMPOS_DO_CARTAO\s*=([\s\S]*?);/)?.[1] ?? "";

    expect(campos.length).toBeGreaterThan(0);
    for (const proibida of [
      "telefone", "email_contacto", "linkedin_subject", "pedido_id", "estado",
      "preco_consulta_cents", "comissao", "patamar", "credito", "xp", "bio",
    ]) {
      expect(campos).not.toContain(proibida);
    }
  });

  it("nenhuma superfície pública fala de progressão, comissão ou telefone", () => {
    for (const ficheiro of [CAMADA_DE_DADOS, ...SUPERFICIE]) {
      const fonte = codigo(ficheiro);
      expect(fonte, ficheiro).not.toMatch(/telefone/i);
      expect(fonte, ficheiro).not.toMatch(/comiss(a|ã)o/i);
      expect(fonte, ficheiro).not.toMatch(/patamar/i);
      expect(fonte, ficheiro).not.toMatch(/linkedin_subject/i);
      expect(fonte, ficheiro).not.toMatch(/\bXP\b/);
    }
  });
});

describe("a fotografia continua a passar pelo proxy", () => {
  it("o cartão recebe um sim/não, não a URL assinada do LinkedIn", () => {
    const dados = ler(CAMADA_DE_DADOS);
    const cartao = ler("src/app/contabilistas/ContabilistaCard.tsx");

    // A URL entra na camada de dados (é o que responde «há foto?») e morre
    // lá: o que segue para o componente é `avatarDisponivel`.
    expect(dados).toContain("avatarDisponivel");
    expect(dados).toContain("avatarLinkedInExpirou");
    expect(cartao).not.toContain("linkedin_avatar_url");
    expect(cartao).not.toContain("avatarUrl");
  });

  it("o cartão não desenha uma imagem por sua conta", () => {
    const cartao = ler("src/app/contabilistas/ContabilistaCard.tsx");

    expect(cartao).toContain("AvatarContabilista");
    expect(cartao).not.toMatch(/<img\b/);
    expect(cartao).not.toContain("licdn.com");
  });

  it("o avatar continua a ser servido pelo endpoint do ReciboCerto", () => {
    const avatar = ler("src/components/contabilistas/AvatarContabilista.tsx");
    expect(avatar).toContain("/api/contabilistas/linkedin-avatar/");
    expect(avatar).toContain("setFalhou(true)");
  });
});

describe("uma página, um punhado de pedidos", () => {
  it("não há uma leitura por cartão", () => {
    const cliente = ler("src/app/contabilistas/DiretorioCliente.tsx");
    const cartao = ler("src/app/contabilistas/ContabilistaCard.tsx");

    // O cartão é apresentação pura: não lê nada, nem LinkedIn nem agenda.
    expect(cartao).not.toContain("lerDiretorio");
    expect(cartao).not.toMatch(/obterLinkedIn/);
    expect(cartao).not.toMatch(/obterDisponibilidade|ocupadosDe/);
    // E a lista não dispara leituras dentro de um `.map`.
    expect(cliente).not.toMatch(/\.map\([^)]*=>\s*(await|lerDiretorio|obter)/);
  });

  it("a página traz 24 cartões, não o diretório inteiro", () => {
    const dados = ler(CAMADA_DE_DADOS);
    expect(dados).toMatch(/POR_PAGINA\s*=\s*24/);
    expect(dados).toContain(".range(");
  });
});

describe("o que o diretório não pode prometer", () => {
  it("não anuncia horários que teria de ir buscar à agenda", () => {
    for (const ficheiro of SUPERFICIE) {
      const fonte = ler(ficheiro);
      expect(fonte, ficheiro).not.toMatch(/pr(ó|o)xima disponibilidade/i);
    }
  });

  it("não usa microcopy sem sistema por trás", () => {
    const proibidas = [
      /melhor contabilista/i, /top 1%/i, /altamente recomendad/i,
      /100% verificad/i, /resposta garantida/i, /mais escolhid/i,
      /melhor avaliad/i, /pre(ç|c)o garantido/i,
    ];
    for (const ficheiro of SUPERFICIE) {
      const fonte = codigo(ficheiro);
      for (const padrao of proibidas) expect(fonte, ficheiro).not.toMatch(padrao);
    }
  });

  it("não transforma um número escrito no formulário em selo verificado", () => {
    const cartao = ler("src/app/contabilistas/ContabilistaCard.tsx");
    const perfil = ler("src/app/contabilistas/[slug]/PerfilPublico.tsx");

    // Nenhum dos dois monta a frase à mão: ambos chamam a mesma função,
    // que é a única que sabe distinguir «informada» de «verificada».
    expect(cartao).toContain("estadoOcc");
    expect(perfil).toContain("estadoOcc");
    expect(cartao).not.toMatch(/OCC n\.º/);
  });

  it("não introduz plano pago no caminho para um contabilista", () => {
    for (const ficheiro of SUPERFICIE) {
      const fonte = ler(ficheiro);
      expect(fonte, ficheiro).not.toMatch(/\bPlus\b/);
      expect(fonte, ficheiro).not.toMatch(/upgrade|subscri(ç|c)ão necess/i);
    }
  });

  it("a ordenação não pode ser comprada", () => {
    const dados = ler(CAMADA_DE_DADOS);
    const ordenacao = dados.match(/q\s*=\s*f\.ordem[\s\S]*?;/)?.[0] ?? "";

    expect(ordenacao.length).toBeGreaterThan(0);
    expect(ordenacao).not.toMatch(/patamar|comiss|credito|destaque|xp/i);
    expect(ordenacao).toContain("aceita_novos_clientes");
  });
});
