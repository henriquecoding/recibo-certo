// ═══════════════════════════════════════════════════════════════════════
//  UMA ORIGEM, UMA VERSÃO — RC-CFG-001 e RC-DOC-003
//  ---------------------------------------------------------------------
//  RC-CFG-001: `SITE_URL` (canónico, sitemap, metadata) dizia
//  `https://www.recibocerto.pt` e o `.env.example` dizia `https://recibocerto.pt`.
//  Em produção o apex responde 307 para o www — ou seja, o valor do exemplo
//  aponta para uma origem que nem sequer serve o site.
//
//  Isso seria cosmético se `NEXT_PUBLIC_APP_URL` só aparecesse em texto. Não
//  aparece: constrói os URLs de retorno da Stripe, da Lemon Squeezy e o
//  `redirect_uri` do OAuth da FIZ. Um `redirect_uri` é comparado LITERALMENTE
//  com o que está registado no fornecedor — com o host errado, a autorização é
//  recusada antes de chegar a acontecer, e o erro aparece do lado deles.
//
//  RC-DOC-003: `package.json` em 0.1.0 enquanto a aplicação se anuncia em
//  2.31.0. Duas versões é o mesmo que nenhuma — nenhum relatório de erro
//  consegue dizer que build o produziu.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { APP_VERSION } from "@/lib/version";
import { SITE_URL } from "@/lib/seo";

const raiz = join(__dirname, "..", "..", "..");
const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
});

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_APP_URL;
});

const origem = () => import("@/lib/origem");

describe("RC-CFG-001 · uma origem canónica", () => {
  it("o .env.example aponta para a origem que serve o site", () => {
    const exemplo = readFileSync(join(raiz, ".env.example"), "utf8");
    const linha = exemplo.match(/^NEXT_PUBLIC_APP_URL=(.*)$/m);
    expect(linha, "NEXT_PUBLIC_APP_URL em falta no .env.example").not.toBeNull();
    expect(linha![1].trim()).toBe(SITE_URL);
  });

  it("a origem canónica é declarada num sítio só", async () => {
    const { ORIGEM_CANONICA } = await origem();
    expect(ORIGEM_CANONICA).toBe(SITE_URL);
    // E `seo.ts` deriva dela, em vez de repetir a string.
    const seo = readFileSync(join(raiz, "src", "lib", "seo.ts"), "utf8");
    expect(seo).toMatch(/ORIGEM_CANONICA/);
  });

  it("sem variável definida, cai em localhost — nunca em produção por engano", async () => {
    const { appUrl } = await origem();
    expect(appUrl()).toBe("http://localhost:3000");
  });

  it("corrige o apex para o www, que é o que produção serve", async () => {
    const { appUrl } = await origem();
    process.env.NEXT_PUBLIC_APP_URL = "https://recibocerto.pt";
    expect(appUrl()).toBe(SITE_URL);
  });

  it("normaliza a barra final, que duplicaria nos URLs construídos", async () => {
    const { appUrl } = await origem();
    process.env.NEXT_PUBLIC_APP_URL = "https://www.recibocerto.pt/";
    expect(appUrl()).toBe(SITE_URL);
    expect(`${appUrl()}/dashboard`).toBe(`${SITE_URL}/dashboard`);
  });

  it("respeita origens de pré-visualização, que são legítimas", async () => {
    const { appUrl } = await origem();
    for (const url of [
      "https://recibo-certo-git-abc-equipa.vercel.app",
      "http://localhost:3001",
    ]) {
      process.env.NEXT_PUBLIC_APP_URL = url;
      expect(appUrl(), url).toBe(url);
    }
  });

  it("o URL de verificação impresso nos documentos é o canónico", async () => {
    // Um PDF sobrevive ao ambiente que o produziu: quem o receber daqui a um
    // ano tem de poder escrever o endereço e chegar ao site. Por isso este NÃO
    // passa por `appUrl()` — usa a constante, sempre.
    const { BASE_PUBLICA } = await import("@/lib/export/referencia");
    expect(BASE_PUBLICA).toBe(SITE_URL);

    // Sem comentários: o ficheiro EXPLICA a variável que deixou de ler, e uma
    // procura ingénua acusaria a explicação em vez do código.
    const fonte = readFileSync(join(raiz, "src", "lib", "export", "referencia.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/^\s*\/\/.*$/gm, " ");
    expect(fonte).not.toMatch(/NEXT_PUBLIC_SITE_URL/);
  });

  it("nenhum construtor de URL de pagamento ou OAuth lê a variável em bruto", () => {
    // É este o ponto do achado: o valor tem de passar pela normalização, senão
    // o apex volta a entrar por uma porta lateral.
    for (const ficheiro of [
      ["src", "lib", "stripe", "config.ts"],
      ["src", "lib", "lemonsqueezy", "config.ts"],
      ["src", "lib", "fiz", "config.ts"],
    ]) {
      const fonte = readFileSync(join(raiz, ...ficheiro), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/^\s*\/\/.*$/gm, " ");
      expect(fonte, `${ficheiro.join("/")} lê NEXT_PUBLIC_APP_URL diretamente`).not.toMatch(
        /process\.env\.NEXT_PUBLIC_APP_URL/,
      );
      expect(fonte, `${ficheiro.join("/")} devia usar appUrl()`).toMatch(/appUrl\(\)/);
    }
  });
});

describe("RC-DOC-003 · uma fonte de versão", () => {
  it("package.json e APP_VERSION dizem o mesmo", () => {
    const pkg = JSON.parse(readFileSync(join(raiz, "package.json"), "utf8"));
    expect(pkg.version).toBe(APP_VERSION);
  });

  it("existe um guardião que impede as duas voltarem a divergir", () => {
    // Sem isto, a próxima subida de `APP_VERSION` volta a deixar o
    // `package.json` para trás — foi exatamente assim que chegámos a 0.1.0
    // contra 2.31.0.
    const guardiao = readFileSync(join(raiz, "scripts", "check-versao.mjs"), "utf8");
    expect(guardiao).toMatch(/APP_VERSION/);
    const pkg = JSON.parse(readFileSync(join(raiz, "package.json"), "utf8"));
    expect(pkg.scripts.prebuild, "o guardião tem de correr antes do build").toMatch(
      /check-versao/,
    );
  });
});
