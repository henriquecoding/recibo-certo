// ═══════════════════════════════════════════════════════════════════════
//  PARCERIAS — a camada configurável e o modo de LIGAÇÃO
//  ---------------------------------------------------------------------
//  A regra de fundo que estes testes guardam: em modo LIGACAO nada é
//  transportado, e a interface não pode dizer o contrário. A frase mais
//  errada que o site chegou a ter interpolava um valor calculado numa
//  promessa de transporte que não existia — `parcerias:copy` apanha
//  exatamente essa classe de erro, e apanha-a outra vez daqui a seis meses,
//  quando alguém copiar um bloco de um sítio para o outro.
// ═══════════════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { modoEfetivo, modoDaRota, modoValido, transportaDados } from "@/lib/parcerias/modos";
import { hostPermitido, construirLinkAfiliado } from "@/lib/parcerias/link.server";
import type { ParceriaAtiva } from "@/lib/parcerias/catalogo.server";
import { MOTIVO_LEGIVEL } from "@/lib/parcerias/errors";
import {
  SUPERFICIES,
  ROTULO_SUPERFICIE,
  DESTINO_POR_INTENT,
  superficieValida,
} from "@/content/parcerias-destinos";
import {
  DIVULGACAO_LIGACAO,
  NOTA_LIGACAO,
  EXPRESSOES_DE_HANDOFF,
  COPY_HERO,
  COPY_POR_SUPERFICIE,
  copyDaSuperficie,
} from "@/content/parcerias-copy";
import { FIZ_SIMULATOR_ROUTES } from "@/content/fiz-simulator-routes";
import { FIZ_GUIDE_ROUTES } from "@/content/fiz-guide-routes";
import { ROTULO_LIGACAO_POR_INTENT } from "@/lib/guias/manifests";

const RAIZ = join(__dirname, "..", "..");
const MIGRACAO = join(RAIZ, "..", "supabase", "migrations", "025_parcerias_configuraveis.sql");

function ficheirosFonte(dir: string, acc: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      if (nome === "__tests__" || nome === "node_modules") continue;
      ficheirosFonte(caminho, acc);
    } else if (/\.(ts|tsx)$/.test(nome)) acc.push(caminho);
  }
  return acc;
}

const url = (s: string) => new URL(s);

// ─────────────────────────────────────────────────────────────────────────
describe("parcerias:modo — o mínimo entre a parceria e a rota", () => {
  it("uma rota de handoff numa parceria de ligação degrada, não desaparece", () => {
    expect(modoEfetivo("LIGACAO", "CONSENTED_HANDOFF")).toBe("LIGACAO");
    expect(modoEfetivo("LIGACAO", "CONNECTED_ACCOUNT")).toBe("LIGACAO");
  });

  it("uma rota sem dados continua sem dados numa parceria com OAuth", () => {
    expect(modoEfetivo("CONTA_LIGADA", "NO_DATA")).toBe("LIGACAO");
  });

  it("o modo da parceria nunca é ultrapassado pela rota", () => {
    expect(modoEfetivo("HANDOFF_CONSENTIDO", "CONNECTED_ACCOUNT")).toBe("HANDOFF_CONSENTIDO");
    expect(modoEfetivo("HANDOFF_CONSENTIDO", "CONSENTED_HANDOFF")).toBe("HANDOFF_CONSENTIDO");
  });

  it("só transporta dados a partir do handoff", () => {
    expect(transportaDados("LIGACAO")).toBe(false);
    expect(transportaDados("HANDOFF_CONSENTIDO")).toBe(true);
    expect(transportaDados("CONTA_LIGADA")).toBe(true);
  });

  it("um valor inválido vindo da base de dados cai no modo mais restrito", () => {
    expect(modoValido("QUALQUER_COISA")).toBe("LIGACAO");
    expect(modoValido(null)).toBe("LIGACAO");
    expect(modoValido("CONTA_LIGADA")).toBe("CONTA_LIGADA");
  });

  it("cada política de dados tem um modo correspondente", () => {
    expect(modoDaRota("NO_DATA")).toBe("LIGACAO");
    expect(modoDaRota("CONSENTED_HANDOFF")).toBe("HANDOFF_CONSENTIDO");
    expect(modoDaRota("CONNECTED_ACCOUNT")).toBe("CONTA_LIGADA");
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("parcerias:links — nenhum destino fora da lista", () => {
  const DOMINIOS = ["fiz.co", "app.fiz.co"];

  it("aceita o domínio e os seus subdomínios, em https", () => {
    expect(hostPermitido(url("https://fiz.co/?ref=x"), DOMINIOS)).toBe(true);
    expect(hostPermitido(url("https://app.fiz.co/auth?ref=x"), DOMINIOS)).toBe(true);
    expect(hostPermitido(url("https://blog.fiz.co/"), DOMINIOS)).toBe(true);
  });

  it("recusa http, mesmo num domínio permitido", () => {
    expect(hostPermitido(url("http://fiz.co/"), DOMINIOS)).toBe(false);
  });

  it("recusa um domínio parecido", () => {
    // O clássico: `fiz.co.exemplo.pt` termina em `.pt`, não em `.fiz.co`.
    expect(hostPermitido(url("https://fiz.co.exemplo.pt/"), DOMINIOS)).toBe(false);
    expect(hostPermitido(url("https://naofiz.co/"), DOMINIOS)).toBe(false);
    expect(hostPermitido(url("https://evil.example/"), DOMINIOS)).toBe(false);
  });

  it("sem lista de domínios, nada passa — um link sem lista é um redirecionador aberto", () => {
    expect(hostPermitido(url("https://fiz.co/"), [])).toBe(false);
  });

  it("a base de dados também exige a lista e a divulgação", () => {
    const sql = readFileSync(MIGRACAO, "utf8");
    expect(sql).toMatch(/admin_partners_link_com_dominios/);
    expect(sql).toMatch(/admin_partners_link_com_divulgacao/);
    // A regra do formulário não chega: um `CHECK` é que a torna impossível
    // de contornar por um `UPDATE` direto.
    expect(sql).toMatch(/char_length\(btrim\(divulgacao\)\) >= 20/);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("parcerias:copy — nada promete o que não acontece", () => {
  const proibidas = (texto: string, onde: string) => {
    for (const p of EXPRESSOES_DE_HANDOFF) {
      expect(texto.toLowerCase(), `${onde} contém «${p}»`).not.toContain(p);
    }
  };

  it("a copy de ligação não usa vocabulário de transporte de dados", () => {
    for (const [chave, c] of Object.entries(COPY_POR_SUPERFICIE)) {
      if (!c) continue;
      proibidas(`${c.titulo} ${c.sub} ${c.cta} ${c.nota}`, chave);
    }
    for (const [chave, c] of Object.entries(COPY_HERO)) {
      proibidas(`${c.titulo} ${c.sub} ${c.cta} ${c.nota}`, `hero.${chave}`);
    }
    proibidas(NOTA_LIGACAO, "NOTA_LIGACAO");
    proibidas(DIVULGACAO_LIGACAO, "DIVULGACAO_LIGACAO");
  });

  it("os rótulos por intenção cobrem as sete intenções e nenhum promete transporte", () => {
    const intents = Object.keys(DESTINO_POR_INTENT);
    for (const i of intents) {
      const r = ROTULO_LIGACAO_POR_INTENT[i as keyof typeof ROTULO_LIGACAO_POR_INTENT];
      expect(r, i).toBeTruthy();
      proibidas(r, `intent.${i}`);
    }
    expect(intents.length).toBe(7);
  });

  it("as demos deixaram de prometer handoff", () => {
    // As duas frases que descreviam o handoff — e que em modo LIGACAO eram
    // falsas. A do DemoIRS era a pior: interpolava o IRS estimado numa
    // promessa de que esse valor ia seguir.
    for (const rel of [
      join("components", "Hero.tsx"),
      join("components", "simulador", "DemoIRS.tsx"),
    ]) {
      const fonte = readFileSync(join(RAIZ, rel), "utf8");
      // Procura-se em JSX renderizado, não em comentários — daí exigir que
      // não apareça fora de uma linha começada por `//`.
      const linhas = fonte.split("\n").filter((l) => !l.trim().startsWith("//"));
      for (const l of linhas) {
        expect(l.toLowerCase(), rel).not.toContain("campo a campo o que segue contigo");
      }
    }
  });

  it("a divulgação de ligação diz o que a genérica não dizia", () => {
    // «A parceria é remunerada» descreve um acordo. A cl. 11.2 exige dizer
    // que ESTE link paga comissão POR ESTA subscrição, e identificar como
    // publicidade.
    expect(DIVULGACAO_LIGACAO).toMatch(/publicidade/i);
    expect(DIVULGACAO_LIGACAO).toMatch(/comiss/i);
    expect(DIVULGACAO_LIGACAO.length).toBeGreaterThan(20);
    expect(NOTA_LIGACAO).toMatch(/comiss/i);
  });

  it("nenhuma copy cita um preço do parceiro", () => {
    // O preço muda do lado deles sem nos avisarem; um preço errado num bloco
    // comercial é uma afirmação enganadora (cl. 12.1).
    const tudo = [
      ...Object.values(COPY_POR_SUPERFICIE).map((c) => (c ? `${c.titulo} ${c.sub} ${c.cta}` : "")),
      ...Object.values(COPY_HERO).map((c) => `${c.titulo} ${c.sub} ${c.cta}`),
      ...FIZ_SIMULATOR_ROUTES.map((r) => `${r.fallbackLabelLigacao} ${r.promessaLigacao}`),
    ].join(" ");
    expect(tudo).not.toMatch(/\d+[,.]\d{2}\s*€/);
    expect(tudo).not.toMatch(/€\s*\d/);
  });

  it("nenhuma copy publica um número de certificação AT", () => {
    // Não foi possível confirmar em fonte pública o número de certificação da
    // FIZ. É exatamente o tipo de afirmação que `guias:claims` existe para
    // impedir — e é pior num bloco comercial do que no corpo de um Guia.
    const tudo = [
      ...Object.values(COPY_POR_SUPERFICIE).map((c) => (c ? `${c.titulo} ${c.sub}` : "")),
      ...Object.values(COPY_HERO).map((c) => `${c.titulo} ${c.sub}`),
      ...FIZ_SIMULATOR_ROUTES.map((r) => r.promessaLigacao),
    ].join(" ");
    expect(tudo).not.toMatch(/certifica[çc][ãa]o n\.?[ºo°]?\s*\d/i);
    expect(tudo).not.toMatch(/n\.?[ºo°]\s*\d{3,}/);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("parcerias:superficies — vocabulário fechado", () => {
  it("toda a superfície tem rótulo legível", () => {
    for (const s of SUPERFICIES) {
      expect(ROTULO_SUPERFICIE[s], s).toBeTruthy();
      expect(ROTULO_SUPERFICIE[s].length, s).toBeGreaterThan(5);
    }
  });

  it("as chaves são únicas e reconhecíveis", () => {
    expect(new Set(SUPERFICIES).size).toBe(SUPERFICIES.length);
    expect(superficieValida("guia.next_step")).toBe(true);
    expect(superficieValida("inventada")).toBe(false);
  });

  it("as 8 posições de anúncio do admin têm superfície correspondente", () => {
    const posicoes = [
      "dashboard", "receitas", "recibos", "prazos",
      "simulador", "comparador", "landing_hero", "landing_pricing",
    ];
    for (const p of posicoes) {
      expect(superficieValida(`anuncio.${p}`), p).toBe(true);
    }
  });

  it("a copy de recurso existe para qualquer superfície", () => {
    for (const s of SUPERFICIES) {
      const c = copyDaSuperficie(s);
      expect(c.titulo.length, s).toBeGreaterThan(3);
      expect(c.cta.length, s).toBeGreaterThan(3);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("parcerias:rel — toda a âncora externa é declarada como paga", () => {
  it("os componentes de parceria usam rel com sponsored", () => {
    for (const rel of [
      join("components", "fiz", "FizActionButton.tsx"),
      join("components", "ui", "PartnerCard.tsx"),
      join("components", "parcerias", "FizCriativoTexto.tsx"),
      join("components", "parcerias", "AnuncioSlot.tsx"),
    ]) {
      const fonte = readFileSync(join(RAIZ, rel), "utf8");
      expect(fonte, rel).toMatch(/rel="[^"]*sponsored/);
      expect(fonte, rel).toMatch(/rel="[^"]*nofollow/);
      expect(fonte, rel).toMatch(/rel="[^"]*noopener/);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("parcerias:sem-estado — nada fica no equipamento do utilizador", () => {
  const rota = readFileSync(join(RAIZ, "app", "ir", "[parceiro]", "route.ts"), "utf8");

  it("o redirecionador não escreve cookies", () => {
    // Só o código; o comentário do topo diz precisamente que nenhum
    // `Set-Cookie` sai daqui, e não pode ser ele a fazer o teste falhar.
    const codigo = rota
      .split("\n")
      .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"))
      .join("\n");
    expect(codigo).not.toMatch(/Set-Cookie/i);
    expect(codigo).not.toMatch(/cookies\(\)/);
  });

  it("responde 302, nunca 301", () => {
    // Um 301 fica cacheado no browser e impede mudar o destino.
    expect(rota).toMatch(/status:\s*302/);
    expect(rota).not.toMatch(/status:\s*301/);
  });

  it("não é indexado nem cacheado", () => {
    expect(rota).toMatch(/no-store/);
    expect(rota).toMatch(/X-Robots-Tag/);
    const robots = readFileSync(join(RAIZ, "app", "robots.ts"), "utf8");
    expect(robots).toMatch(/"\/ir\/"/);
  });

  it("a tabela de cliques não tem identificador de pessoa", () => {
    const sql = readFileSync(MIGRACAO, "utf8");
    const bloco = sql.slice(
      sql.indexOf("CREATE TABLE IF NOT EXISTS public.partner_link_clicks"),
      sql.indexOf("COMMENT ON TABLE public.partner_link_clicks"),
    );
    expect(bloco).not.toMatch(/user_id/);
    expect(bloco).not.toMatch(/\bip\b/);
    expect(bloco).not.toMatch(/user_agent/);
    expect(bloco).not.toMatch(/session/);
  });

  it("o cliente não pode escrever cliques", () => {
    const sql = readFileSync(MIGRACAO, "utf8");
    expect(sql).toMatch(/REVOKE INSERT, UPDATE, DELETE ON public\.partner_link_clicks/);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("parcerias:redirect — o handler recusa antes de redirecionar", () => {
  const rota = readFileSync(join(RAIZ, "app", "ir", "[parceiro]", "route.ts"), "utf8");

  it("verifica parceiro, estado, janela e link antes de construir o destino", () => {
    for (const guarda of [
      "parceiro_desconhecido",
      "parceiro_inativo",
      "sem_link",
      "fora_da_janela",
    ]) {
      expect(rota, guarda).toContain(guarda);
    }
  });

  it("um erro leva a uma página nossa, nunca a um 404 nem a um destino inventado", () => {
    expect(rota).toMatch(/\/parceiros\/indisponivel/);
    expect(rota).not.toMatch(/status:\s*404/);
    for (const codigo of Object.keys(MOTIVO_LEGIVEL)) {
      expect(MOTIVO_LEGIVEL[codigo as keyof typeof MOTIVO_LEGIVEL].length, codigo).toBeGreaterThan(15);
    }
  });

  it("o registo do clique não bloqueia o redirecionamento", () => {
    // `registarClique` engole os próprios erros — perder a atribuição de um
    // clique é um problema comercial nosso, não do utilizador.
    const catalogo = readFileSync(join(RAIZ, "lib", "parcerias", "catalogo.server.ts"), "utf8");
    const bloco = catalogo.slice(catalogo.indexOf("export async function registarClique"));
    expect(bloco).toMatch(/try\s*\{/);
    expect(bloco).toMatch(/catch/);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("parcerias:modo-ligacao — minimização de dados", () => {
  it("o handoff é recusado no servidor, não só na interface", () => {
    const rota = readFileSync(
      join(RAIZ, "app", "api", "integrations", "fiz", "handoff", "route.ts"),
      "utf8",
    );
    expect(rota).toMatch(/modo === "LIGACAO"/);
    expect(rota).toMatch(/status:\s*409/);
    expect(rota).toMatch(/modo_nao_permite/);
  });

  it("a identidade não é lida quando não há diálogo de consentimento", () => {
    const hook = readFileSync(join(RAIZ, "lib", "fiz", "use-identidade.ts"), "utf8");
    expect(hook).toMatch(/ativo\?: boolean/);
    const plano = readFileSync(join(RAIZ, "components", "fiz", "FizPlanoAcao.tsx"), "utf8");
    expect(plano).toMatch(/useIdentidadeFiz\(\{ ativo: !modoLigacao \}\)/);
  });

  it("os campos propostos não são calculados em modo ligação", () => {
    const plano = readFileSync(join(RAIZ, "components", "fiz", "FizPlanoAcao.tsx"), "utf8");
    expect(plano).toMatch(/if \(modoLigacao\) return \[\];/);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("parcerias:demo — a ligação existe mesmo quando o ato não aparece", () => {
  it("os atos das duas demos têm um botão real", () => {
    for (const rel of [
      join("components", "Hero.tsx"),
      join("components", "simulador", "DemoIRS.tsx"),
    ]) {
      const fonte = readFileSync(join(RAIZ, rel), "utf8");
      expect(fonte, rel).toMatch(/FizActionButton/);
      expect(fonte, rel).toMatch(/\/ir\/fiz\?s=demo\./);
    }
  });

  it("o foco, o ponteiro e o toque travam o relógio", () => {
    for (const rel of [
      join("components", "Hero.tsx"),
      join("components", "simulador", "DemoIRS.tsx"),
    ]) {
      const fonte = readFileSync(join(RAIZ, rel), "utf8");
      expect(fonte, `${rel} · ponteiro`).toMatch(/onPointerEnter=/);
      expect(fonte, `${rel} · foco`).toMatch(/onFocus=/);
      expect(fonte, `${rel} · toque`).toMatch(/onTouchStart=/);
    }
  });

  it("a faixa estática é um componente de servidor, fora do palco", () => {
    const faixa = readFileSync(join(RAIZ, "components", "fiz", "FizFaixaDemo.tsx"), "utf8");
    // Sem `"use client"`: tem de estar no HTML inicial, para funcionar sem
    // JavaScript e para quem tem movimento reduzido e nunca vê o ato.
    expect(faixa).not.toMatch(/^"use client"/m);
    expect(faixa).toMatch(/FizDisclosure/);
    // Montada nas duas páginas.
    const landing = readFileSync(join(RAIZ, "app", "page.tsx"), "utf8");
    const irs = readFileSync(join(RAIZ, "app", "ferramentas", "simulador-irs", "page.tsx"), "utf8");
    expect(landing).toMatch(/demo\.hero\.faixa/);
    expect(irs).toMatch(/demo\.irs\.faixa/);
  });

  it("o cursor encenado desmonta com o rato real", () => {
    // Dois cursores no mesmo cartão fazem a pessoa clicar no falso.
    const hero = readFileSync(join(RAIZ, "components", "Hero.tsx"), "utf8");
    expect(hero).toMatch(/\{ponteiro && !reduzNoDesenho && !sobrevoo &&/);
    expect(hero).toMatch(/\{ripple && !reduzNoDesenho && !sobrevoo &&/);
  });

  it("a régua anuncia o destino antes de lá chegar", () => {
    for (const rel of [
      join("components", "Hero.tsx"),
      join("components", "simulador", "DemoIRS.tsx"),
    ]) {
      const fonte = readFileSync(join(RAIZ, rel), "utf8");
      expect(fonte, rel).toMatch(/rotulo: "Parceiro"/);
      expect(fonte, rel).toMatch(/liga[çc][ãa]o para a FIZ/i);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("parcerias:divulgacao — sem exceção e sem toggle", () => {
  it("toda a superfície com link mostra a divulgação", () => {
    for (const rel of [
      join("components", "fiz", "FizFaixaDemo.tsx"),
      join("components", "parcerias", "AnuncioSlot.tsx"),
      join("components", "fiz", "FizNextStep.tsx"),
      join("components", "fiz", "FizPlanoAcao.tsx"),
    ]) {
      const fonte = readFileSync(join(RAIZ, rel), "utf8");
      expect(fonte, rel).toMatch(/FizDisclosure/);
    }
  });

  it("o cartão de parceiro não diz «verificado» sem dizer «comercial»", () => {
    const card = readFileSync(join(RAIZ, "components", "ui", "PartnerCard.tsx"), "utf8");
    if (card.includes("Parceiro verificado")) {
      expect(card).toMatch(/Liga[çc][ãa]o comercial/);
    }
  });

  it("a página de privacidade descreve as ligações de afiliado", () => {
    const priv = readFileSync(join(RAIZ, "app", "privacidade", "page.tsx"), "utf8");
    expect(priv).toMatch(/liga[çc][õo]es de afiliado/i);
    expect(priv).toMatch(/comiss[ãa]o/i);
    // O armazenamento pré-existente tem de estar descrito com exatidão.
    expect(priv).toMatch(/sessionStorage/);
    expect(priv).toMatch(/localStorage/);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("parcerias:sem-links-em-codigo", () => {
  it("nenhum componente escreve o link do parceiro à mão", () => {
    // Se a FIZ mudar o formato do link, muda-se uma linha na base de dados e
    // não 60 componentes. Um `href` para fiz.co em código quebraria isso — e
    // exporia o código de afiliado em HTML estático, onde é raspado.
    const infratores: string[] = [];
    for (const ficheiro of ficheirosFonte(RAIZ)) {
      const fonte = readFileSync(ficheiro, "utf8");
      const linhas = fonte.split("\n");
      for (const l of linhas) {
        if (l.trim().startsWith("//") || l.trim().startsWith("*")) continue;
        if (/https:\/\/(?:app\.)?fiz\.co[^"'`\s]*[?&]ref=[A-Za-z0-9]{4,}/.test(l)) {
          infratores.push(ficheiro.replace(RAIZ, "src"));
        }
      }
    }
    expect(infratores).toEqual([]);
  });

  it("o link real vive na migração, não no código", () => {
    const sql = readFileSync(MIGRACAO, "utf8");
    expect(sql).toMatch(/https:\/\/fiz\.co\/\?ref=/);
    expect(sql).toMatch(/https:\/\/app\.fiz\.co\/auth\?ref=/);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("parcerias:rotas-ativas — a ativação é faseada e coerente", () => {
  it("os simuladores ativados são um subconjunto pequeno", () => {
    const ativos = FIZ_SIMULATOR_ROUTES.filter((r) => r.enabled);
    expect(ativos.length).toBeGreaterThan(0);
    expect(ativos.length).toBeLessThan(FIZ_SIMULATOR_ROUTES.length);
  });

  it("os Guias ativados são um subconjunto pequeno", () => {
    const ativos = FIZ_GUIDE_ROUTES.filter((r) => r.enabled);
    expect(ativos.length).toBeGreaterThan(0);
    expect(ativos.length).toBeLessThan(FIZ_GUIDE_ROUTES.length);
  });

  it("o destino por intenção cobre as sete intenções", () => {
    expect(Object.keys(DESTINO_POR_INTENT).length).toBe(7);
    // Nenhum caminho pode ser absoluto: seria um destino fora do link.
    for (const [i, caminho] of Object.entries(DESTINO_POR_INTENT)) {
      if (caminho === null) continue;
      expect(caminho, i).toMatch(/^\//);
      expect(caminho, i).not.toMatch(/^https?:/);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("parcerias:link-real — o link emitido pela FIZ, ponta a ponta", () => {
  // Os dois destinos reais. Vivem na migração; aqui só se prova que o
  // construtor os trata como deve.
  const FIZ: ParceriaAtiva = {
    id: "fiz",
    parceiroKey: "fiz",
    nome: "FIZ",
    modo: "LIGACAO",
    linkAfiliado: "https://fiz.co/?ref=gpZWdtnhQPIsWJYR",
    linkAfiliadoRegisto: "https://app.fiz.co/auth?ref=gpZWdtnhQPIsWJYR",
    dominiosPermitidos: ["fiz.co", "app.fiz.co", "help.fiz.co", "blog.fiz.co", "diretorio.fiz.co"],
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

  it("preserva o código de referência e acrescenta as UTM", () => {
    const { url: u } = construirLinkAfiliado({
      parceiro: FIZ,
      superficie: "guia.next_step",
      slug: "abrir-atividade",
      intent: "START_FREELANCER",
      clickId: "abc123",
    });
    const parsed = new URL(u);
    expect(parsed.host).toBe("fiz.co");
    // O `ref` é o que paga a comissão: perdê-lo é perder a atribuição inteira.
    expect(parsed.searchParams.get("ref")).toBe("gpZWdtnhQPIsWJYR");
    expect(parsed.searchParams.get("utm_source")).toBe("recibocerto");
    expect(parsed.searchParams.get("utm_medium")).toBe("afiliado");
    expect(parsed.searchParams.get("utm_campaign")).toBe("guia.next_step");
    expect(parsed.searchParams.get("utm_content")).toBe("abrir-atividade");
  });

  it("`d=registo` usa o destino de alta intenção", () => {
    const { url: u, host } = construirLinkAfiliado({
      parceiro: FIZ,
      superficie: "simulador.plano_acao",
      clickId: "abc123",
      destino: "registo",
    });
    expect(host).toBe("app.fiz.co");
    expect(new URL(u).pathname).toBe("/auth");
    expect(new URL(u).searchParams.get("ref")).toBe("gpZWdtnhQPIsWJYR");
  });

  it("sem confirmação da FIZ, o caminho por intenção NÃO é aplicado", () => {
    // `caminhoSuportado: false` — não se inventa um caminho no site deles.
    const { caminho } = construirLinkAfiliado({
      parceiro: FIZ,
      superficie: "guia.next_step",
      intent: "PREPARE_IRS",
      clickId: "abc123",
    });
    expect(caminho).toBe("/");
  });

  it("com confirmação, o caminho por intenção entra", () => {
    const { url: u } = construirLinkAfiliado({
      parceiro: { ...FIZ, caminhoSuportado: true },
      superficie: "guia.next_step",
      intent: "PREPARE_IRS",
      clickId: "abc123",
    });
    const parsed = new URL(u);
    expect(parsed.pathname).toBe("/irs/");
    expect(parsed.searchParams.get("ref")).toBe("gpZWdtnhQPIsWJYR");
  });

  it("o sub-id só entra quando o parceiro confirmar o parâmetro", () => {
    const sem = new URL(
      construirLinkAfiliado({ parceiro: FIZ, superficie: "demo.hero", clickId: "cid-1" }).url,
    );
    expect([...sem.searchParams.keys()]).not.toContain("subid");

    const com = new URL(
      construirLinkAfiliado({
        parceiro: { ...FIZ, subidParam: "subid" },
        superficie: "demo.hero",
        clickId: "cid-1",
      }).url,
    );
    expect(com.searchParams.get("subid")).toBe("cid-1");
  });

  it("recusa um destino fora dos domínios permitidos", () => {
    expect(() =>
      construirLinkAfiliado({
        parceiro: { ...FIZ, linkAfiliado: "https://evil.example/?ref=x" },
        superficie: "demo.hero",
        clickId: "cid-1",
      }),
    ).toThrow(/dom[íi]nio/i);
  });

  it("nenhum dado pessoal viaja no URL", () => {
    const { url: u } = construirLinkAfiliado({
      parceiro: FIZ,
      superficie: "guia.next_step",
      slug: "abrir-atividade",
      clickId: "cid-1",
    });
    for (const chave of new URL(u).searchParams.keys()) {
      expect(chave).not.toMatch(/nif|niss|email|telefone|iban|morada|nome/i);
    }
  });
});
