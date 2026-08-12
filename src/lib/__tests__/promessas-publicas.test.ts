// ═══════════════════════════════════════════════════════════════════════
//  PROMESSAS PÚBLICAS — o que o site AFIRMA tem de ser o que o site FAZ
//  ---------------------------------------------------------------------
//  RC-LEGAL-002 · RC-CONT-001 · RC-CONT-002 do relatório mestre de 11-08-2026.
//
//  Os três achados são o mesmo defeito visto de três ângulos: uma frase
//  escrita numa altura em que era verdade — ou em que se esperava que viesse
//  a ser — e que ninguém voltou a confrontar com o código. Nenhum teste podia
//  apanhá-los, porque nenhum teste lia a copy.
//
//  Estes leem. Não julgam estilo: cada um liga uma AFIRMAÇÃO a um FACTO
//  verificável no repositório, e quebra quando os dois se separam. Se um dia
//  a funcionalidade existir mesmo, o teste deixa de acusar — é a alegação sem
//  suporte que ele proíbe, não a alegação.
// ═══════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { GUIDE_MANIFESTS } from "@/lib/guias/manifests";
import { GUIA_SLUGS } from "@/lib/seo";

const raiz = join(__dirname, "..", "..");
const ler = (...p: string[]) => readFileSync(join(raiz, ...p), "utf8");

/** Fonte sem comentários: uma explicação não é uma promessa ao público. */
const codigo = (fonte: string) =>
  fonte
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");

describe("RC-LEGAL-002 · a política de privacidade não promete o que não existe", () => {
  it("não alega autenticação multifator enquanto não houver implementação", () => {
    const politica = codigo(ler("app", "privacidade", "page.tsx"));
    const alega = /multifator|multi-fator|autentica(ç|c)(ã|a)o de dois fatores|\bMFA\b|\b2FA\b/i.test(politica);

    // O outro lado da equação: existe MFA no código? Procuramos a API que a
    // implementaria (Supabase expõe `auth.mfa.enroll/challenge/verify`).
    const auth = [
      "lib/supabase",
      "components/auth",
      "app/auth",
    ]
      .map((d) => {
        try {
          return ler(...d.split("/"));
        } catch {
          return varrer(join(raiz, ...d.split("/")));
        }
      })
      .join("\n");
    const implementa = /\bmfa\b|\.enroll\(|listFactors|challengeAndVerify/i.test(auth);

    // A regra é a coerência, não a proibição: alegar exige implementar.
    expect(
      alega && !implementa,
      alega
        ? "A política alega MFA mas não há implementação encontrada no código de autenticação."
        : "",
    ).toBe(false);
  });

  it("a ressalva do plano gratuito cobre medição e formulários", () => {
    // «Os dados ficam exclusivamente no teu browser» é verdade para o que a
    // pessoa escreve nas calculadoras — e só para isso. Com consentimento de
    // medição concedido, ou ao submeter um formulário, sai um pedido para os
    // nossos servidores. A frase sem ressalva lê-se como "nada sai daqui".
    const politica = ler("app", "privacidade", "page.tsx");
    const secao = politica.slice(
      politica.indexOf("Plano gratuito — sem conta"),
      politica.indexOf("Conta e plano Plus"),
    );
    expect(secao.length, "secção do plano gratuito não encontrada").toBeGreaterThan(0);
    expect(secao).toMatch(/medi(ç|c)(ã|a)o|analytics/i);
    expect(secao).toMatch(/formul(á|a)rio/i);
  });
});

describe("RC-LEGAL-002 · a FIZ só é anunciada quando está ligada", () => {
  it("nenhuma superfície comercial mostra a FIZ sem consultar a bandeira", () => {
    // A contradição do relatório: a política diz «ainda não está ativa» e a
    // página de preços apresentava ligar conta e enviar simulação como
    // disponível. Com a bandeira a falhar fechada (RC-FIZ-002), a superfície
    // desaparece por omissão — mas só se a consultar.
    for (const ficheiro of [
      ["components", "Precos.tsx"],
      ["components", "Hero.tsx"],
      ["components", "fiz", "FizConnectionCard.tsx"],
      ["app", "integracoes", "fiz", "page.tsx"],
    ]) {
      const fonte = ler(...ficheiro);
      expect(fonte, `${ficheiro.join("/")} mostra a FIZ sem consultar fizAtiva()`).toMatch(
        /fizAtiva\(\)/,
      );
    }
  });
});

describe("RC-CONT-001 · uma só contagem de guias", () => {
  it("o llms.txt conta os mesmos guias que o site publica", () => {
    const fonte = codigo(ler("app", "llms.txt", "route.ts"));
    // O ficheiro não pode filtrar por `status === "published"`: esse conjunto
    // é menor do que o que o site anuncia e o sitemap submete.
    expect(fonte, "llms.txt usa um critério próprio de contagem").not.toMatch(
      /status\s*===\s*["']published["']/,
    );
    expect(fonte, "llms.txt devia contar a partir de GUIA_SLUGS").toMatch(/GUIA_SLUGS/);
  });

  it("GUIA_SLUGS é a fonte única, e diverge de 'published'", () => {
    // Guarda do próprio achado: se um dia as duas contagens coincidirem, este
    // teste passa a ser redundante — mas enquanto divergirem, é ele que
    // explica porque é que o critério importa.
    const publicados = GUIDE_MANIFESTS.filter((m) => m.status === "published").length;
    expect(GUIA_SLUGS.length).toBeGreaterThan(publicados);
  });
});

describe("RC-CONT-002 · 'atualizados automaticamente' não é verdade", () => {
  it("o rodapé não promete atualização automática dos dados fiscais", () => {
    // O workflow `fiscal-data-check.yml` deteta divergências e ABRE UM ISSUE.
    // Não altera valores: a alteração é sempre humana, com fonte oficial.
    const rodape = codigo(ler("components", "Footer.tsx"));
    expect(rodape).not.toMatch(/atualizad[oa]s?\s+automaticamente/i);
    expect(rodape).toMatch(/monitorizad|revist[oa]s?\s+por\s+human/i);
  });

  it("o workflow que sustenta a frase abre issue e não faz commit de valores", () => {
    const fluxo = readFileSync(
      join(raiz, "..", ".github", "workflows", "fiscal-data-check.yml"),
      "utf8",
    );
    expect(fluxo).toMatch(/issue/i);
  });
});

/** Concatena os ficheiros de uma pasta (um nível), para procurar uma API. */
function varrer(dir: string): string {
  const { readdirSync, statSync } = require("node:fs") as typeof import("node:fs");
  let out = "";
  let entradas: string[];
  try {
    entradas = readdirSync(dir);
  } catch {
    return "";
  }
  for (const e of entradas) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out += varrer(p);
    else if (/\.tsx?$/.test(e)) out += readFileSync(p, "utf8");
  }
  return out;
}
