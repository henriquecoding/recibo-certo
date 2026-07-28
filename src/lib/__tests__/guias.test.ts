import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  GUIDE_MANIFESTS, manifesto, TOOL_HREFS, ARQUETIPOS, HUB_GRUPOS,
  assertManifestsIntegrity, type GuideManifest,
} from "@/lib/guias/manifests";
import {
  LEGAL_SOURCES, LEITURAS_COMPLEMENTARES, DOMINIOS_AUTORIZADOS,
  assertLegalSourcesIntegrity, hostDe, type LegalSource,
} from "@/lib/guias/legal-sources";
import { LEGAL_CLAIMS, claimsDoGuia, assertClaimsIntegrity } from "@/lib/guias/claims";
import { APLICABILIDADE, assertAplicabilidadeIntegrity } from "@/lib/guias/aplicabilidade";
import { HISTORICO_GUIAS, assertHistoricoIntegrity } from "@/lib/guias/historico";
import { pesquisarGuias, normalizar, fontesDoGuia, confiancaDoGuia } from "@/lib/guias";
import { FIZ_GUIDE_ROUTES, GUIAS_SEM_ACAO_FIZ, MANIFESTO_ROTAS_META } from "@/content/fiz-guide-routes";
import { FIZ_SIMULATOR_ROUTES, SIMULADORES_SEM_ACAO_FIZ, META_ROTAS_SIMULADORES, rotaDoSimulador } from "@/content/fiz-simulator-routes";
import { CAMPOS_VALIDOS, ROTULO_CAMPO, CAMPOS_NUNCA_ENVIADOS } from "@/lib/fiz/handoff-fields";
import { destinoFizValido, urlSemDadosSensiveis, PARTNER_SCOPES, USER_SCOPES, SCOPES_LIGACAO_BASICA } from "@/lib/fiz/contracts";
import { GUIA_SLUGS } from "@/lib/seo";
import { FISCAL_YEAR } from "@/lib/fiscal-year";

// ═══════════════════════════════════════════════════════════════════════
//  Os sete grupos ESTÁTICOS de verificação do ponto 7.3 da auditoria.
//  Os dois que dependem da rede (`guias:links` e `guias:semantics`) vivem
//  em `scripts/check-guias.mjs`, porque não devem bloquear o CI de código.
// ═══════════════════════════════════════════════════════════════════════

const slugs = GUIDE_MANIFESTS.map((m) => m.slug);
const fontes = Object.values(LEGAL_SOURCES) as LegalSource[];

describe("guias:lint — manifesto, proprietário, revisão e campos obrigatórios", () => {
  it("as asserções de integridade correm sem lançar", () => {
    expect(() => assertManifestsIntegrity()).not.toThrow();
    expect(() => assertLegalSourcesIntegrity()).not.toThrow();
    expect(() => assertClaimsIntegrity()).not.toThrow();
    expect(() => assertHistoricoIntegrity()).not.toThrow();
  });

  it("os 43 guias publicados têm manifesto, proprietário e revisor", () => {
    // Contagem fixa de propósito: é a rede que apanha um guia a desaparecer
    // do catálogo sem ninguém dar por isso. Subiu de 29 para 43 com a
    // secção «Direitos e cobranças».
    expect(GUIDE_MANIFESTS).toHaveLength(43);
    for (const m of GUIDE_MANIFESTS) {
      expect(m.owner, m.slug).toBeTruthy();
      expect(m.reviewer, m.slug).toBeTruthy();
      expect(m.lastReviewedAt, m.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("cada guia tem arquétipo e grupo de hub válidos", () => {
    const hubs = new Set(HUB_GRUPOS.map((h) => h.id));
    for (const m of GUIDE_MANIFESTS) {
      expect(Object.keys(ARQUETIPOS), m.slug).toContain(m.archetype);
      expect(hubs.has(m.hub), m.slug).toBe(true);
    }
  });

  it("cada guia tem resposta curta, aplicabilidade e checklist", () => {
    expect(assertAplicabilidadeIntegrity(slugs)).toEqual([]);
  });

  it("todo o guia publicado tem histórico editorial", () => {
    for (const m of GUIDE_MANIFESTS.filter((g) => g.status === "published")) {
      expect(HISTORICO_GUIAS.some((h) => h.guideId === m.id), m.slug).toBe(true);
    }
  });
});

describe("guias:sources — nenhum domínio não autorizado classificado como oficial", () => {
  it("toda a fonte oficial vem de uma autoridade autorizada", () => {
    for (const f of fontes) {
      const host = hostDe(f.url);
      expect(DOMINIOS_AUTORIZADOS[host], `${f.id} (${host})`).toBe(f.authority);
    }
  });

  it("nenhuma leitura complementar vem de um domínio de autoridade", () => {
    for (const r of Object.values(LEITURAS_COMPLEMENTARES)) {
      expect(DOMINIOS_AUTORIZADOS[hostDe(r.url)], r.id).toBeUndefined();
    }
  });

  it("nenhuma fonte usa o caminho histórico do CIRC", () => {
    // Falha 3.1: /circ_rep/ serve a redação até 2013, com a taxa de 25 %.
    for (const f of fontes) expect(f.url, f.id).not.toContain("/circ_rep/");
  });

  it("o Despacho 233-A/2026 é citado pela AT e pelo DR, não por um banco", () => {
    // Falha 3.3: estava a apontar para um artigo do Montepio.
    const at = LEGAL_SOURCES.despachoRetencao2026;
    expect(at.authority).toBe("AT");
    expect(hostDe(at.url)).toContain("portaldasfinancas.gov.pt");
    expect(hostDe(LEGAL_SOURCES.despachoRetencao2026Dre.url)).toContain("diariodarepublica.pt");
  });

  it("o Código das Sociedades Comerciais usa o identificador correto", () => {
    // Falha 3.4: estava 34443375; o correto é 34443975.
    expect(LEGAL_SOURCES.csc.url).toContain("1986-34443975");
    expect(LEGAL_SOURCES.csc.url).not.toContain("34443375");
  });

  it("toda a fonte HTML declara âncoras esperadas", () => {
    for (const f of fontes) {
      if (f.renderMode === "html") expect(f.expectedAnchors.length, f.id).toBeGreaterThan(0);
    }
  });

  it("as fontes usam sempre HTTPS", () => {
    for (const f of fontes) expect(f.url.startsWith("https://"), f.id).toBe(true);
    for (const r of Object.values(LEITURAS_COMPLEMENTARES)) {
      expect(r.url.startsWith("https://"), r.id).toBe(true);
    }
  });
});

describe("guias:claims — nenhuma afirmação publicada sem fonte ou regra vigente", () => {
  it("cada guia publicado tem pelo menos uma afirmação registada", () => {
    for (const m of GUIDE_MANIFESTS.filter((g) => g.status === "published")) {
      expect(claimsDoGuia(m.id).length, m.slug).toBeGreaterThan(0);
    }
  });

  it("cada afirmação aponta para fontes existentes no catálogo", () => {
    for (const c of LEGAL_CLAIMS) {
      expect(c.sourceIds.length, c.id).toBeGreaterThan(0);
      for (const s of c.sourceIds) expect(LEGAL_SOURCES, c.id).toHaveProperty(s);
    }
  });

  it("nenhuma afirmação órfã: todo o guideId corresponde a um manifesto", () => {
    for (const c of LEGAL_CLAIMS) expect(slugs, c.id).toContain(c.guideId);
  });

  it("as deduções à coleta citam os artigos 78.º e seguintes, não o 87.º", () => {
    // Falha 3.2: a fonte dizia "78.º-A a 78.º-E" mas ligava a irs87.aspx.
    const usadas = claimsDoGuia("deducoes-coleta").flatMap((c) => c.sourceIds);
    for (const id of ["cirs78", "cirs78a", "cirs78b", "cirs78c", "cirs78d", "cirs78e"]) {
      expect(usadas, id).toContain(id);
    }
    // O 87.º continua presente, mas só na afirmação sobre deficiência.
    const doDeficiencia = LEGAL_CLAIMS.find((c) => c.id === "deducoes.deficiencia");
    expect(doDeficiencia?.sourceIds).toEqual(["cirs87"]);
  });

  it("as afirmações da Segurança Social não reduzem a elegibilidade a um número", () => {
    // Falha 3.6: "12 meses" e "24 meses" apresentados como suficientes.
    const parentalidade = LEGAL_CLAIMS.find((c) => c.id === "ss.parentalidade");
    expect(parentalidade?.statement).toContain("6 meses");
    expect(parentalidade?.statement).toContain("cumulativas");
    const cessacao = LEGAL_CLAIMS.find((c) => c.id === "ss.cessacao");
    expect(cessacao?.statement).toContain("360 dias");
    expect(cessacao?.statement).toContain("24 meses");
  });

  it("a presunção laboral nunca é uma afirmação verificada automatizável", () => {
    // Falha 3.7: não automatizar a conclusão laboral.
    const c = LEGAL_CLAIMS.find((x) => x.id === "acumulacao.presuncao-laboral");
    expect(c?.confidence).toBe("review_required");
    expect(c?.reviewSeverity).toBe("critical");
  });

  it("o Merchant of Record não faz afirmações universais", () => {
    // Falha 3.8: conclusões absolutas sem fontes.
    const qualificacao = LEGAL_CLAIMS.find((c) => c.id === "mor.qualificacao");
    expect(qualificacao?.confidence).toBe("review_required");
    const oss = LEGAL_CLAIMS.find((c) => c.id === "mor.oss");
    expect(oss?.statement).toContain("OSS");
  });
});

describe("guias:routes — guias, relações, ferramentas e ações apontam para destinos existentes", () => {
  it("cada guia relacionado existe e não é o próprio", () => {
    for (const m of GUIDE_MANIFESTS) {
      expect(m.relatedGuideIds.length, m.slug).toBeGreaterThan(0);
      for (const id of m.relatedGuideIds) {
        expect(slugs, `${m.slug} → ${id}`).toContain(id);
        expect(id).not.toBe(m.id);
      }
    }
  });

  it("cada ferramenta relacionada resolve para uma rota conhecida", () => {
    for (const m of GUIDE_MANIFESTS) {
      expect(m.relatedToolIds.length, m.slug).toBeGreaterThan(0);
      for (const t of m.relatedToolIds) expect(TOOL_HREFS, `${m.slug} → ${t}`).toHaveProperty(t);
    }
  });

  it("as recomendações de ferramentas variam por guia", () => {
    // Falha 4.4: os 29 guias encaminhavam todos para os mesmos dois destinos.
    const combinacoes = new Set(GUIDE_MANIFESTS.map((m) => [...m.relatedToolIds].sort().join("|")));
    expect(combinacoes.size).toBeGreaterThan(8);
  });

  it("o sitemap espelha exatamente os manifestos", () => {
    // Falha 4.5: a navegação e o índice duplicavam o catálogo à mão.
    expect([...GUIA_SLUGS].sort()).toEqual([...slugs].sort());
  });

  it("toda a ligação interna escrita à mão no corpo de um guia aponta para uma rota que existe", () => {
    // As relações do manifesto já eram validadas. Os `href` escritos
    // diretamente no JSX de cada página não eram — e são a maioria das
    // ligações que o leitor vê. Um guia podia apontar para
    // `/guias/nao-existe` e só se descobria em produção, com um 404.
    const dirGuias = join(process.cwd(), "src/app/guias");
    const paginas = readdirSync(dirGuias, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);

    const rotaExiste = (rota: string): boolean => {
      const semQuery = rota.split(/[?#]/)[0].replace(/\/$/, "");
      if (semQuery === "") return true; // "/" — a homepage
      return existsSync(join(process.cwd(), "src/app", semQuery, "page.tsx"));
    };

    const partidas: string[] = [];
    for (const slug of paginas) {
      const ficheiro = join(dirGuias, slug, "page.tsx");
      if (!existsSync(ficheiro)) continue;
      const fonte = readFileSync(ficheiro, "utf8");
      for (const m of fonte.matchAll(/href="(\/[^"]*)"/g)) {
        if (!rotaExiste(m[1])) partidas.push(`${slug} → ${m[1]}`);
      }
    }
    expect(partidas).toEqual([]);
  });
});

describe("guias:fiz-contract — capacidade, payload e consentimento seguem o contrato", () => {
  it("nenhuma rota FIZ contém URLs — só chaves de capacidade", () => {
    for (const r of FIZ_GUIDE_ROUTES) {
      expect(r.destinationKey, r.guideSlug).toMatch(/^[a-z0-9][a-z0-9._-]{2,127}$/);
      expect(r.destinationKey).not.toMatch(/^https?:/i);
      expect(r.recommendedAction).not.toContain("http");
    }
  });

  it("todas as rotas nascem desativadas enquanto a parceria estiver por fechar", () => {
    // Ponto 3 da arquitetura: não existe lançamento provisório.
    expect(MANIFESTO_ROTAS_META.ativas).toBe(0);
    for (const r of FIZ_GUIDE_ROUTES) expect(r.enabled, r.guideSlug).toBe(false);
  });

  it("cada guia ou tem ação FIZ ou tem razão documentada para não ter", () => {
    expect(MANIFESTO_ROTAS_META.comAcao + MANIFESTO_ROTAS_META.semAcao).toBe(GUIDE_MANIFESTS.length);
    for (const g of GUIAS_SEM_ACAO_FIZ) expect(g.razao.length, g.slug).toBeGreaterThan(20);
  });

  it("as ações irreversíveis exigem revisão humana na FIZ", () => {
    for (const slug of ["merchant-of-record", "acumulacao-emprego", "fatura-vs-recibo", "ifici-nhr", "mais-valias"]) {
      const m = manifesto(slug) as GuideManifest;
      expect(m.fizAction?.exigeRevisaoHumana, slug).toBe(true);
    }
  });

  it("o modo CONNECTED_ACCOUNT só é usado onde faz sentido ler estado real", () => {
    const comConta = FIZ_GUIDE_ROUTES.filter((r) => r.dataMode === "CONNECTED_ACCOUNT").map((r) => r.guideSlug);
    expect(comConta).toContain("calendario-fiscal");
    expect(comConta).toContain("seguranca-social");
    // Um guia informativo de direito laboral nunca lê a conta do utilizador.
    expect(comConta).not.toContain("subsidios-ferias-natal");
  });

  it("a ligação básica não pede permissões de escrita", () => {
    expect(SCOPES_LIGACAO_BASICA).not.toContain(USER_SCOPES.invoiceDrafts);
    expect(SCOPES_LIGACAO_BASICA).toContain(USER_SCOPES.profile);
    expect(SCOPES_LIGACAO_BASICA).toContain(USER_SCOPES.revoke);
  });

  it("os scopes de parceiro e de utilizador não se misturam", () => {
    const parceiro = Object.values(PARTNER_SCOPES);
    const utilizador = Object.values(USER_SCOPES);
    for (const s of parceiro) expect(s.startsWith("partner."), s).toBe(true);
    for (const s of utilizador) expect(s.startsWith("partner."), s).toBe(false);
  });

  it("só aceita destinos em domínios da FIZ", () => {
    expect(destinoFizValido("https://app.fiz.co/onboarding?token=abc")).toBe(true);
    expect(destinoFizValido("https://fiz.co/irs")).toBe(true);
    expect(destinoFizValido("https://fiz.co.evil.example/irs")).toBe(false);
    expect(destinoFizValido("http://app.fiz.co/x")).toBe(false);
    expect(destinoFizValido("https://exemplo.pt/fiz")).toBe(false);
  });

  it("recusa destinos com dados pessoais ou fiscais na query string", () => {
    // Ponto 8.5: nunca colocar NIF, rendimentos ou email no URL.
    expect(urlSemDadosSensiveis("https://app.fiz.co/x?token_opaco=1")).toBe(false);
    expect(urlSemDadosSensiveis("https://app.fiz.co/x?nif=123456789")).toBe(false);
    expect(urlSemDadosSensiveis("https://app.fiz.co/x?email=a@b.pt")).toBe(false);
    expect(urlSemDadosSensiveis("https://app.fiz.co/x?rendimento=1000")).toBe(false);
    expect(urlSemDadosSensiveis("https://app.fiz.co/x?h=opaco123")).toBe(true);
  });
});

describe("guias:seo — canonical, metadados e schema coerentes com o conteúdo", () => {
  it("cada guia declara descrição e sinónimos suficientes", () => {
    for (const m of GUIDE_MANIFESTS) {
      expect(m.seo.description.length, m.slug).toBeGreaterThanOrEqual(60);
      expect(m.seo.description.length, m.slug).toBeLessThanOrEqual(320);
      expect(m.seo.aliases.length, m.slug).toBeGreaterThanOrEqual(2);
    }
  });

  it("HowTo só existe em guias de procedimento com checklist", () => {
    // Ponto 9.3: não gerar schema de forma indiferenciada.
    for (const m of GUIDE_MANIFESTS) {
      if (!m.seo.schema.includes("HowTo")) continue;
      expect(m.archetype, m.slug).toBe("procedure");
      expect(APLICABILIDADE[m.slug]?.checklist.length ?? 0, m.slug).toBeGreaterThan(0);
    }
  });

  it("FAQPage só é declarado quando existem perguntas visíveis", () => {
    // Nenhum guia tem hoje uma secção de FAQ própria: declarar o schema
    // seria descrever conteúdo que não está na página.
    for (const m of GUIDE_MANIFESTS) expect(m.seo.schema, m.slug).not.toContain("FAQPage");
  });

  it("os slugs respeitam o padrão exigido pelo contrato FIZ", () => {
    for (const m of GUIDE_MANIFESTS) expect(m.slug).toMatch(/^[a-z0-9][a-z0-9-]{1,127}$/);
  });
});

describe("guias:year-rollover — nenhum valor vencido continua visível", () => {
  it("nenhum guia tem vigência terminada antes do ano fiscal corrente", () => {
    for (const m of GUIDE_MANIFESTS) {
      if (!m.effectiveTo) continue;
      expect(Number(m.effectiveTo.slice(0, 4)), m.slug).toBeGreaterThanOrEqual(FISCAL_YEAR);
    }
  });

  it("nenhuma fonte com vigência terminada é usada por uma afirmação verificada", () => {
    for (const c of LEGAL_CLAIMS) {
      if (c.confidence !== "verified") continue;
      for (const id of c.sourceIds) {
        const f = LEGAL_SOURCES[id] as LegalSource;
        if (!f.effectiveTo) continue;
        expect(Number(f.effectiveTo.slice(0, 4)), `${c.id} → ${id}`).toBeGreaterThanOrEqual(FISCAL_YEAR);
      }
    }
  });

  it("os guias anuais declaram o ano a que se aplicam", () => {
    for (const slug of ["escaloes-irs", "irs-jovem", "calendario-fiscal", "recibo-vencimento"]) {
      const m = manifesto(slug) as GuideManifest;
      expect(m.effectiveTo, slug).toBe(`${FISCAL_YEAR}-12-31`);
    }
  });
});

describe("apresentação derivada — fontes, confiança e pesquisa", () => {
  it("cada guia resolve fontes oficiais a partir das suas afirmações", () => {
    for (const m of GUIDE_MANIFESTS.filter((g) => g.status === "published")) {
      const { oficiais } = fontesDoGuia(m.slug);
      expect(oficiais.length, m.slug).toBeGreaterThan(0);
    }
  });

  it("o cabeçalho de confiança nunca promete «sempre atualizado»", () => {
    const c = confiancaDoGuia("iva-recibos-verdes");
    expect(c).not.toBeNull();
    expect(c?.revistoEm).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(c?.numeroFontesOficiais).toBeGreaterThan(0);
  });

  it("os guias com matéria por rever aparecem em revisão, não como verificados", () => {
    expect(confiancaDoGuia("merchant-of-record")?.estado).not.toBe("revisto");
    expect(confiancaDoGuia("acumulacao-emprego")?.afirmacoesPorRever).toBeGreaterThan(0);
  });

  it("a pesquisa ignora acentos e maiúsculas", () => {
    expect(normalizar("Ação Isolada")).toBe("acao isolada");
    const r = pesquisarGuias("acao isolada");
    expect(r[0]?.manifesto.slug).toBe("ato-isolado");
  });

  it("a pesquisa encontra por linguagem comum, não só pelo título", () => {
    // Ponto 9.2: "passar recibo", "IVA UE" e "VIES" têm de chegar ao sítio certo.
    expect(pesquisarGuias("passar recibo")[0]?.manifesto.slug).toBe("fatura-vs-recibo");
    expect(pesquisarGuias("vies").map((r) => r.manifesto.slug)).toContain("clientes-estrangeiros");
    // Passou a existir guia dedicado. Antes esta pesquisa caía em
    // `acumulacao-emprego`, que era o mais próximo que havia — a expectativa
    // codificava a falta, não o comportamento desejado.
    expect(pesquisarGuias("falso recibo verde")[0]?.manifesto.slug).toBe("falsos-recibos-verdes");
    expect(pesquisarGuias("quando recebo o irs")[0]?.manifesto.slug).toBe("reembolso-irs");
  });

  it("a pesquisa encontra por artigo legal", () => {
    expect(pesquisarGuias("artigo 53").map((r) => r.manifesto.slug)).toContain("iva-recibos-verdes");
  });

  it("uma pesquisa sem correspondência devolve vazio em vez de tudo", () => {
    expect(pesquisarGuias("xpto qwerty zzz")).toEqual([]);
  });
});

describe("guias:fiz-contract — simuladores (ponto 12.3 da arquitetura)", () => {
  it("nenhuma rota de simulador contém URLs", () => {
    for (const r of FIZ_SIMULATOR_ROUTES) {
      expect(r.requiredCapability, r.simulador).toMatch(/^[a-z0-9][a-z0-9._-]{2,127}$/);
      expect(r.fallbackLabel).not.toContain("http");
      expect(r.promessa).not.toContain("http");
    }
  });

  it("todas as rotas de simulador nascem desativadas", () => {
    expect(META_ROTAS_SIMULADORES.ativas).toBe(0);
  });

  it("cada simulador ou tem ação ou tem razão documentada", () => {
    for (const s of SIMULADORES_SEM_ACAO_FIZ) expect(s.razao.length, s.simulador).toBeGreaterThan(30);
    // Trabalho dependente e heranças nunca encaminham para execução fiscal.
    const semAcao = SIMULADORES_SEM_ACAO_FIZ.map((s) => s.simulador);
    expect(semAcao).toContain("recibo-vencimento");
    expect(semAcao).toContain("simulador-herancas");
  });

  it("só propõe campos que existem na lista de rótulos", () => {
    for (const r of FIZ_SIMULATOR_ROUTES) {
      for (const c of r.camposPropostos) expect(CAMPOS_VALIDOS, `${r.simulador} → ${c}`).toContain(c);
    }
  });

  it("nenhum campo proposto é um dado que nunca deve sair", () => {
    // O que está fora do vocabulário está fora por não ser consentível pelo
    // utilizador: chaves de acesso e dados de terceiros. O NIF e o email
    // saíram desta lista porque são do próprio e ele pode autorizá-los —
    // continuam, isso sim, proibidos em query string (ver fiz.test.ts).
    const texto = CAMPOS_NUNCA_ENVIADOS.join(" | ").toLowerCase();
    for (const p of ["credenciais", "clientes", "documentos", "iban"]) {
      expect(texto, p).toContain(p);
    }
    for (const campo of CAMPOS_VALIDOS) {
      const palavras = ROTULO_CAMPO[campo].toLowerCase().split(/\W+/);
      for (const p of ["niss", "iban", "password"]) {
        expect(palavras, `${campo} propõe ${p}`).not.toContain(p);
      }
    }
  });

  it("a identificação é proposta apenas onde há execução a continuar", () => {
    const IDENT = ["fullName", "taxpayerNumber", "email", "phone"];
    for (const r of FIZ_SIMULATOR_ROUTES) {
      const propoeIdent = r.camposPropostos.some((c) => IDENT.includes(c));
      // NO_DATA não transporta nada — muito menos identificação.
      if (r.dataMode === "NO_DATA") {
        expect(propoeIdent, `${r.simulador} não pode propor identificação`).toBe(false);
      } else {
        expect(propoeIdent, `${r.simulador} devia poder pré-preencher`).toBe(true);
      }
    }
  });

  it("um simulador com handoff propõe sempre pelo menos um campo", () => {
    for (const r of FIZ_SIMULATOR_ROUTES) {
      if (r.dataMode !== "CONSENTED_HANDOFF") continue;
      expect(r.camposPropostos.length, r.simulador).toBeGreaterThan(0);
    }
  });

  it("um simulador sem dados não propõe campos nenhuns", () => {
    for (const r of FIZ_SIMULATOR_ROUTES) {
      if (r.dataMode !== "NO_DATA") continue;
      expect(r.camposPropostos, r.simulador).toEqual([]);
    }
  });

  it("o Merchant of Record exige revisão humana e não envia dados", () => {
    const r = rotaDoSimulador("payout-mor");
    expect(r?.exigeRevisaoHumana).toBe(true);
    expect(r?.dataMode).toBe("NO_DATA");
  });
});
