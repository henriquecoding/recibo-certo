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

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
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
import { PARCERIA_FIZ } from "@/content/parcerias-fiz";

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
    for (const rel of DEMOS_COM_ATO_FIZ) {
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

  it("nenhuma copy de superfície anuncia o parceiro como contabilista", () => {
    // Metade destas linhas vendia a FIZ como «contabilistas certificados», e
    // a faixa da homepage era uma delas. O site TEM contabilistas — diretório
    // com perfis aprovados, vínculo sem plano pago, e uma ordem que não se
    // compra (`lib/contabilistas/diretorio.ts`). Anunciar um parceiro pago com
    // a palavra que descreve o nosso diretório punha os dois a competir pelo
    // mesmo clique, e contra a própria hierarquia de `escolherRota()`, onde o
    // contabilista vem ANTES da FIZ.
    //
    // A regra não é «a FIZ não tem contabilistas» — não sabemos, e não é isso
    // que está em causa. É que a NOSSA copy não usa essa palavra para vender
    // um parceiro: descreve-o pelo que executa. Quem precisa de julgamento
    // profissional vai para `/contabilistas`, que não é publicidade.
    for (const [chave, c] of Object.entries(COPY_POR_SUPERFICIE)) {
      if (!c) continue;
      expect(`${c.titulo} ${c.sub} ${c.cta}`.toLowerCase(), chave).not.toContain("contabilist");
    }
    for (const [chave, c] of Object.entries(COPY_HERO)) {
      expect(`${c.titulo} ${c.sub} ${c.cta}`.toLowerCase(), `hero.${chave}`).not.toContain(
        "contabilist",
      );
    }
    // E o recurso genérico, que serve qualquer superfície sem copy própria.
    for (const s of SUPERFICIES) {
      const c = copyDaSuperficie(s);
      expect(`${c.titulo} ${c.sub} ${c.cta}`.toLowerCase(), s).not.toContain("contabilist");
    }
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

/**
 * As demonstrações que têm um ATO de parceiro dentro do palco.
 *
 * Eram duas. `components/Hero.tsx` — o cartão dos quatro perfis — foi
 * substituído pelo hero da bússola, que não tem ato de parceiro nenhum: as
 * cinco respostas levam às ferramentas do produto, e a única presença da FIZ
 * na homepage é a `FizFaixaDemo`, que é servidor, estática e já tem teste
 * próprio («a faixa estática é um componente de servidor, fora do palco»).
 *
 * A lista encolheu porque uma superfície desapareceu — não porque a regra
 * afrouxou. Quem voltar a pôr um ato de parceiro num palco acrescenta-o aqui.
 */
const DEMOS_COM_ATO_FIZ = [join("components", "simulador", "DemoIRS.tsx")];

// ─────────────────────────────────────────────────────────────────────────
describe("parcerias:demo — a ligação existe mesmo quando o ato não aparece", () => {
  it("os atos de parceiro têm um botão real", () => {
    for (const rel of DEMOS_COM_ATO_FIZ) {
      const fonte = readFileSync(join(RAIZ, rel), "utf8");
      expect(fonte, rel).toMatch(/FizActionButton/);
      expect(fonte, rel).toMatch(/\/ir\/fiz\?s=demo\./);
    }
  });

  it("o foco, o ponteiro e o toque travam o relógio", () => {
    for (const rel of DEMOS_COM_ATO_FIZ) {
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
    // A landing monta o bloco «O passo seguinte» na casca estática comum às
    // cinco entradas — e é ele que declara a superfície; a página de IRS
    // continua a montar a faixa diretamente.
    const landing = readFileSync(join(RAIZ, "components", "foco", "HomepageFocoShell.tsx"), "utf8");
    const irs = readFileSync(join(RAIZ, "app", "ferramentas", "simulador-irs", "page.tsx"), "utf8");
    expect(landing).toMatch(/demo\.hero\.faixa/);
    expect(irs).toMatch(/demo\.irs\.faixa/);
  });

  it("o bloco da homepage é servidor, rotula antes do clique e não fica com o clique do contabilista", () => {
    const bloco = readFileSync(
      join(RAIZ, "components", "parcerias", "PassoSeguinteHomepage.tsx"),
      "utf8",
    );
    // Servidor: o cartaz tem de estar no HTML inicial, e o bloco não pode
    // arrastar JavaScript para o fim de cinco rotas de homepage.
    expect(bloco).not.toMatch(/^"use client"/m);

    // §13.3 da política de afiliados: rotular ANTES do clique. A divulgação
    // por baixo do cartaz não chega — tem de haver rótulo antes dele.
    expect(bloco).toMatch(/Publicidade/);
    expect(bloco).toMatch(/FizDisclosure/);
    const iRotulo = bloco.indexOf("Publicidade · o nosso parceiro");
    const iCartaz = bloco.indexOf("FizCriativoImagem href");
    expect(iRotulo, "o rótulo do anúncio desapareceu").toBeGreaterThan(-1);
    expect(iCartaz, "o cartaz desapareceu").toBeGreaterThan(-1);
    expect(iRotulo, "o rótulo tem de vir antes do cartaz").toBeLessThan(iCartaz);

    // A razão de existir deste bloco: o parceiro fica com a faixa da
    // execução e o contabilista continua a ser nosso, com destino nosso.
    expect(bloco, "a faixa do contabilista tem de levar ao nosso diretório").toMatch(
      /href="\/contabilistas"/,
    );
    // E a fronteira não é reescrita aqui — vem de `routing.ts`, que é a
    // mesma que `/metodologia#comercial` publica.
    expect(bloco).toMatch(/FRONTEIRA/);
  });

  it("o cursor encenado sai da frente do rato real", () => {
    // Dois cursores no mesmo sítio fazem a pessoa clicar no falso.
    //
    // O hero da homepage deixou de ser `Hero.tsx` e passou a ser a bússola,
    // com o ponteiro partilhado de `palco/ponteiro.tsx`. A invariante é a
    // mesma e o mecanismo é outro: o ponteiro lê a posição a cada fotograma
    // e devolve `null` enquanto houver uma linha sobrevoada — some, e o
    // relógio suspende-se por cima disso.
    const hero = readFileSync(join(RAIZ, "components", "foco", "HeroBussola.tsx"), "utf8");
    expect(hero, "a mão encenada tem de sair com uma mão a sério em cena").toMatch(
      /if \(escolhidoRef\.current\) return \{ ponto: null/,
    );
    // E a mão sai porque a pessoa TOMOU CONTA — não porque o relógio
    // ficou suspenso à espera de a ver ir embora. A distinção está em
    // `usePalco.entregar`, e é o que impede o roteiro de trocar o painel
    // que alguém acabou de abrir.
    expect(hero, "apontar tem de entregar o palco, não suspendê-lo").toMatch(
      /entregar\(\)/,
    );
    expect(hero, "e nada pode voltar a suspender em vez de entregar").not.toMatch(
      /suspenso:/,
    );
  });

  it("a régua anuncia o destino antes de lá chegar", () => {
    for (const rel of DEMOS_COM_ATO_FIZ) {
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
      join("components", "parcerias", "PassoSeguinteHomepage.tsx"),
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
  it("o link do parceiro vive num só ficheiro de código", () => {
    // A base de dados continua a mandar quando existe — é lá que se muda o
    // link sem deploy. Mas tem de haver um piso: com a parceria SÓ na base de
    // dados, uma migração por aplicar fazia o site cair na pré-visualização da
    // Fase 2 e mostrar um diálogo de consentimento a prometer transporte de
    // dados. `parcerias-fiz.ts` é esse piso, e é o único sítio onde o link
    // pode aparecer em código.
    const PERMITIDO = join("content", "parcerias-fiz.ts");
    const infratores: string[] = [];
    for (const ficheiro of ficheirosFonte(RAIZ)) {
      if (ficheiro.endsWith(PERMITIDO)) continue;
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
  // Este bloco descreve o link de PRODUÇÃO, que é o único que leva o código
  // de afiliado. Fora de produção o construtor retira-o de propósito, para um
  // clique de QA numa pré-visualização não entrar na janela de atribuição de
  // 90 dias e virar auto-referência. Sem declarar o ambiente, estes testes
  // estariam a afirmar do ambiente errado.
  const envOriginal = process.env.VERCEL_ENV;
  beforeAll(() => {
    process.env.VERCEL_ENV = "production";
  });
  afterAll(() => {
    if (envOriginal === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = envOriginal;
  });

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

// ─────────────────────────────────────────────────────────────────────────
describe("parcerias:sem-configuracao — funciona no dia do deploy", () => {
  // O teste que faltava, e que teria apanhado a falha inteira: a primeira
  // versão só ligava com `PARCERIAS_ATIVAS=true`, uma linha no Supabase e
  // `NEXT_PUBLIC_FIZ_ENABLED=true` definida NO BUILD. Nenhuma das três estava
  // posta em lado nenhum — e o resultado não foi um erro, foi o site a
  // mostrar a pré-visualização da Fase 2 com um diálogo de consentimento a
  // prometer transporte de dados. Um caminho de degradação silencioso é pior
  // do que uma falha ruidosa.
  const semAmbiente = <T,>(fn: () => T): T => {
    const guardadas = {
      enabled: process.env.NEXT_PUBLIC_FIZ_ENABLED,
      preview: process.env.NEXT_PUBLIC_FIZ_PREVIEW,
      desligadas: process.env.PARCERIAS_DESLIGADAS,
      vercel: process.env.NEXT_PUBLIC_VERCEL_ENV,
    };
    delete process.env.NEXT_PUBLIC_FIZ_ENABLED;
    delete process.env.NEXT_PUBLIC_FIZ_PREVIEW;
    delete process.env.PARCERIAS_DESLIGADAS;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    try {
      return fn();
    } finally {
      for (const [k, v] of Object.entries({
        NEXT_PUBLIC_FIZ_ENABLED: guardadas.enabled,
        NEXT_PUBLIC_FIZ_PREVIEW: guardadas.preview,
        PARCERIAS_DESLIGADAS: guardadas.desligadas,
        NEXT_PUBLIC_VERCEL_ENV: guardadas.vercel,
      })) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  };

  // ⚠️ A EXPECTATIVA MUDOU DE PROPÓSITO — RC-FIZ-002.
  //
  // Este teste afirmava `true`: a bandeira ligava-se sozinha quando a variável
  // faltava. Era a correção de um problema anterior (uma regra que desligava
  // em produção fazia deploys aparecerem vazios), mas o remédio abria uma
  // porta: qualquer ambiente sem configuração — um preview esquecido, um
  // servidor novo, um CI — nascia com a integração ligada.
  //
  // O relatório mestre de 11-08-2026 classifica isto como P0. A bandeira passa
  // a falhar FECHADA e a má configuração passa a ser ruidosa em vez de
  // silenciosa (ver `diagnosticoFiz()` em `gate.server.ts`). O teste não foi
  // apagado — inverteu-se, que é o registo honesto de uma decisão revista.
  it("a bandeira da FIZ está DESLIGADA por omissão (falha fechada)", async () => {
    const { fizAtiva } = await import("@/lib/fiz/flag");
    expect(semAmbiente(() => fizAtiva())).toBe(false);
  });

  it("as parcerias estão ligadas por omissão", async () => {
    const { parceriasAtivas } = await import("@/lib/parcerias/catalogo.server");
    expect(semAmbiente(() => parceriasAtivas())).toBe(true);
  });

  it("a parceria resolve-se sem Supabase", async () => {
    const { parceriaAtiva, parceriaUtilizavel, limparCacheParcerias } = await import(
      "@/lib/parcerias/catalogo.server"
    );
    limparCacheParcerias();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    try {
      const p = await parceriaAtiva("fiz");
      expect(p).not.toBeNull();
      expect(parceriaUtilizavel(p)).toBe(true);
      expect(p!.modo).toBe("LIGACAO");
      expect(p!.linkAfiliado).toContain("ref=");
      expect(p!.divulgacao.length).toBeGreaterThan(20);
    } finally {
      if (url) process.env.NEXT_PUBLIC_SUPABASE_URL = url;
      if (chave) process.env.SUPABASE_SERVICE_ROLE_KEY = chave;
      limparCacheParcerias();
    }
  });

  it("as superfícies ativas resolvem-se sem base de dados", async () => {
    const { placementDaSuperficie, limparCacheParcerias } = await import(
      "@/lib/parcerias/catalogo.server"
    );
    limparCacheParcerias();
    for (const s of PARCERIA_FIZ.superficiesAtivas) {
      const p = await placementDaSuperficie("fiz", s);
      expect(p, s).not.toBeNull();
    }
    // E uma que NÃO está na lista continua desligada — a ativação é faseada,
    // não é «tudo o que existe».
    expect(await placementDaSuperficie("fiz", "anuncio.dashboard")).toBeNull();
    limparCacheParcerias();
  });

  it("o piso em código traz os dois destinos e a divulgação", () => {
    expect(PARCERIA_FIZ.linkAfiliado).toMatch(/^https:\/\/fiz\.co\/\?ref=/);
    expect(PARCERIA_FIZ.linkAfiliadoRegisto).toMatch(/^https:\/\/app\.fiz\.co\/auth\?ref=/);
    // Os dois links têm de partilhar o mesmo código: dois códigos seriam duas
    // reconciliações para a mesma parceria.
    const cod = (u: string) => new URL(u).searchParams.get("ref");
    expect(cod(PARCERIA_FIZ.linkAfiliado)).toBe(cod(PARCERIA_FIZ.linkAfiliadoRegisto));
    // E os destinos têm de pertencer aos domínios que a própria definição
    // autoriza — senão o redirecionador recusa o seu próprio link.
    for (const l of [PARCERIA_FIZ.linkAfiliado, PARCERIA_FIZ.linkAfiliadoRegisto]) {
      expect(hostPermitido(new URL(l), PARCERIA_FIZ.dominiosPermitidos), l).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("parcerias:sem-modal — o diálogo de consentimento não pode abrir", () => {
  // Este é o defeito que o utilizador viu no ecrã: ao clicar no simulador
  // abria «Levar a tua simulação para a FIZ · Continuar com a FIZ sem repetir
  // dados», com o seletor de campos e o NIF lá dentro. Não era um bug de
  // interface — era a resolução a cair na pré-visualização da Fase 2 porque o
  // passo de ligação estava atrás de uma variável que ninguém definia.
  const plano = readFileSync(join(RAIZ, "components", "fiz", "FizPlanoAcao.tsx"), "utf8");

  it("o botão que abre o diálogo depende de consentimento E de campos", () => {
    // Em LIGACAO o servidor devolve `requiresConsent: false` e uma lista de
    // campos vazia. As duas condições falham, e não há caminho para o abrir.
    expect(plano).toMatch(/const podeEnviar = acao\.requiresConsent && campos\.length > 0;/);
  });

  it("a API não envia a lista de campos em modo ligação", () => {
    const rota = readFileSync(
      join(RAIZ, "app", "api", "integrations", "fiz", "simulator-route", "route.ts"),
      "utf8",
    );
    expect(rota).toMatch(/emLigacao \? \[\] : rota\.camposPropostos/);
  });

  it("o passo de ligação corre ANTES da pré-visualização", () => {
    const fonte = readFileSync(join(RAIZ, "lib", "fiz", "guide-routing.server.ts"), "utf8");
    const iLigacao = fonte.indexOf("passoDeLigacao({");
    const iPreview = fonte.indexOf("if (previewAtivo())");
    expect(iLigacao).toBeGreaterThan(0);
    expect(iPreview).toBeGreaterThan(0);
    expect(iLigacao).toBeLessThan(iPreview);
  });

  it("a pré-visualização só ganha quando é pedida explicitamente", () => {
    const fonte = readFileSync(join(RAIZ, "lib", "fiz", "guide-routing.server.ts"), "utf8");
    expect(fonte).toMatch(/NEXT_PUBLIC_FIZ_PREVIEW === "true"/);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("parcerias:copy-visivel — o que se escreve chega ao ecrã", () => {
  it("a promessa do modo LIGACAO é renderizada", () => {
    // Escrevi oito pares de copy em `fiz-simulator-routes.ts` e nenhum
    // chegava ao ecrã: `FizPlanoAcao` não mostrava `promessa` nenhuma. Copy
    // que ninguém vê é copy que ninguém revê.
    const resolucao = readFileSync(join(RAIZ, "lib", "fiz", "guide-routing.server.ts"), "utf8");
    expect(resolucao).toMatch(/promessa: rota\.promessaLigacao/);
    const plano = readFileSync(join(RAIZ, "components", "fiz", "FizPlanoAcao.tsx"), "utf8");
    expect(plano).toMatch(/\{acao\.promessa\}/);
  });

  it("o rótulo do simulador em LIGACAO é o do modo, sem recurso ao de handoff", () => {
    const resolucao = readFileSync(join(RAIZ, "lib", "fiz", "guide-routing.server.ts"), "utf8");
    // `?? rota.fallbackLabel` seria uma porta para a copy de handoff voltar.
    expect(resolucao).toMatch(/rotulo: rota\.fallbackLabelLigacao,/);
  });

  it("o cartaz é responsivo por FORMA, não por tamanho", () => {
    // As três variantes do kit são composições diferentes, não a mesma
    // imagem em três tamanhos: no 1,91:1 o texto fica ao lado do telemóvel;
    // no 9:16 desce tudo para uma coluna. Encolher a larga num ecrã de 360px
    // dá uma tira onde o título fica ilegível.
    const c = readFileSync(join(RAIZ, "components", "parcerias", "FizCriativoImagem.tsx"), "utf8");
    expect(c).toMatch(/fiz-1200x628-pt/);   // computador
    expect(c).toMatch(/fiz-1080x1080-pt/);  // tablet
    expect(c).toMatch(/fiz-1080x1920-pt/);  // telemóvel
    expect(c).toMatch(/media="\(min-width: 1024px\)"/);
    expect(c).toMatch(/media="\(min-width: 640px\)"/);
    // AVIF primeiro, WebP a seguir, PNG de recurso no `<img>`.
    expect(c).toMatch(/type="image\/avif"/);
    expect(c).toMatch(/type="image\/webp"/);
    // Dimensões explícitas em todas as fontes: sem elas é CLS garantido.
    const semDimensoes = [...c.matchAll(/<source\b[\s\S]*?\/>/g)].filter(
      (m) => !/width=\{\d+\}/.test(m[0]) || !/height=\{\d+\}/.test(m[0]),
    );
    expect(semDimensoes).toEqual([]);
    // E não pode ser recortado — cl. 15.1 permite converter, não recompor.
    const codigo = c
      .split("\n")
      .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"))
      .join("\n");
    expect(codigo).not.toMatch(/object-cover/);
  });

  it("os três ficheiros do cartaz existem em AVIF e WebP", () => {
    const dir = join(RAIZ, "..", "public", "parceiros", "fiz");
    for (const base of ["fiz-1200x628-pt", "fiz-1080x1080-pt", "fiz-1080x1920-pt"]) {
      for (const ext of ["avif", "webp"]) {
        expect(existsSync(join(dir, `${base}.${ext}`)), `${base}.${ext}`).toBe(true);
      }
    }
  });

  it("o cartaz não vive dentro do bloco que o explica", () => {
    // O criativo é um anúncio completo — o que a FIZ faz, a que preço, com
    // que certificação, e com o seu próprio botão. Dentro do cartão da página
    // de Planos, que É a explicação da parceria, seria a mesma mensagem duas
    // vezes. Vive nas faixas das demonstrações, onde é a única presença deles.
    const card = readFileSync(join(RAIZ, "components", "fiz", "FizParceriaCard.tsx"), "utf8");
    expect(card).not.toMatch(/FizCriativoImagem/);
    expect(card).not.toMatch(/fiz-1200x628|fiz-1080x/);
    const faixa = readFileSync(join(RAIZ, "components", "fiz", "FizFaixaDemo.tsx"), "utf8");
    expect(faixa).toMatch(/FizCriativoImagem/);
  });

  it("a faixa tem UM alvo, não dois para a mesma ação", () => {
    // Esteve aqui um botão «Conhecer a FIZ» por baixo do cartaz. A
    // justificação era acessibilidade — o «Experimentar» do criativo são
    // pixels —, mas o cartaz já é um `<a>` com `aria-label` e a imagem tem
    // `alt`: teclado, leitor de ecrã e imagens desligadas estavam cobertos.
    // Restava um segundo CTA colado ao primeiro.
    //
    // Vale para as DUAS superfícies do cartaz: a faixa do simulador de IRS e
    // o bloco «O passo seguinte» da homepage.
    for (const rel of [
      join("components", "fiz", "FizFaixaDemo.tsx"),
      join("components", "parcerias", "PassoSeguinteHomepage.tsx"),
    ]) {
      const fonte = readFileSync(join(RAIZ, rel), "utf8");
      expect(fonte, rel).not.toMatch(/FizActionButton/);
    }
    // O URL do cartaz é montado uma vez só, no resolvedor — e o `v` não pode
    // aparecer duas vezes no mesmo endereço.
    const resolvedor = readFileSync(join(RAIZ, "lib", "parcerias", "anuncio.server.ts"), "utf8");
    expect(resolvedor).toMatch(/v=banner/);
    expect(resolvedor).not.toMatch(/&v=[a-z]+`?\}?&v=/);
  });

  it("o cartaz é um alvo acessível por si só", () => {
    // É o que torna o botão dispensável, por isso tem de ficar garantido.
    const c = readFileSync(join(RAIZ, "components", "parcerias", "FizCriativoImagem.tsx"), "utf8");
    expect(c).toMatch(/<a\b/);
    expect(c).toMatch(/aria-label=/);
    expect(c).toMatch(/alt=\{ALT\}/);
    expect(c).toMatch(/focus-visible:ring/);
  });

  it("o cartão de preços tem um caminho real para a FIZ", () => {
    // Descrevia a parceria e o único destino era uma página nossa.
    const card = readFileSync(join(RAIZ, "components", "fiz", "FizParceriaCard.tsx"), "utf8");
    expect(card).toMatch(/\/ir\/fiz\?s=precos\.faixa/);
    expect(card).toMatch(/FizDisclosure/);
  });

  it("o cartão não oferece explicar o que acabou de explicar", () => {
    // O cartão É a explicação da parceria: quem somos, o que faz a FIZ, onde
    // acaba um e começa o outro, e as ressalvas comerciais. Ao lado do único
    // botão que acrescenta alguma coisa estava um segundo, «Como funciona a
    // parceria», a apontar para uma página cujo título é literalmente isso.
    // Acabava de se explicar e oferecia-se explicar outra vez.
    const card = readFileSync(join(RAIZ, "components", "fiz", "FizParceriaCard.tsx"), "utf8");
    const codigo = card
      .split("\n")
      .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"))
      .join("\n");
    expect(codigo).not.toMatch(/href="\/integracoes\/fiz"/);
  });

  it("a copy do cartão não fala de simulações — não há nenhuma nesta página", () => {
    // «A tua simulação fica onde está» veio do contexto dos simuladores. Na
    // página de Planos não há simulação nenhuma para ficar onde quer que seja.
    const card = readFileSync(join(RAIZ, "components", "fiz", "FizParceriaCard.tsx"), "utf8");
    const codigo = card
      .split("\n")
      .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"))
      .join("\n");
    expect(codigo).not.toMatch(/a tua simula[çc][ãa]o fica onde est[áa]/i);
  });
});
