import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import descobrir from "@/generated/homepage/descobrir.json";
import empresa from "@/generated/homepage/empresa.json";
import preco from "@/generated/homepage/preco.json";
import recibos from "@/generated/homepage/recibos.json";
import salario from "@/generated/homepage/salario.json";
import {
  FOCOS_HOMEPAGE,
  ROTA_POR_FOCO,
  focoDaRotaHomepage,
  type FocoHomepage,
} from "@/lib/foco-homepage";
import { resolverPrazoSSAtual } from "@/components/foco/recibos/PrazoSSAtual";
import { FISCAL_YEAR } from "@/lib/fiscal-year";
import { APP_VERSION } from "@/lib/version";
import { CATALOGO } from "@/lib/analytics/eventos";
import { CONSENT_VERSION } from "@/lib/cookie-consent";
import { proxy } from "@/proxy";

const SRC = join(__dirname, "..", "..");
const ler = (...partes: string[]) => readFileSync(join(SRC, ...partes), "utf8");

const ENTRADAS: Record<
  FocoHomepage,
  { ficheiro: string[]; componente: string; snapshot: string }
> = {
  descobrir: {
    ficheiro: ["app", "page.tsx"],
    componente: "HomepageDescobrir",
    snapshot: "descobrir.json",
  },
  preco: {
    ficheiro: ["app", "inicio", "preco", "page.tsx"],
    componente: "HomepagePreco",
    snapshot: "preco.json",
  },
  recibos: {
    ficheiro: ["app", "inicio", "recibos", "page.tsx"],
    componente: "HomepageRecibos",
    snapshot: "recibos.json",
  },
  empresa: {
    ficheiro: ["app", "inicio", "empresa", "page.tsx"],
    componente: "HomepageEmpresa",
    snapshot: "empresa.json",
  },
  salario: {
    ficheiro: ["app", "inicio", "salario", "page.tsx"],
    componente: "HomepageSalario",
    snapshot: "salario.json",
  },
};

describe("homepage: entradas estáticas", () => {
  it("cada rota importa exatamente o próprio palco e o próprio snapshot", () => {
    const componentes = Object.values(ENTRADAS).map((entrada) => entrada.componente);

    for (const [foco, entrada] of Object.entries(ENTRADAS)) {
      const fonte = ler(...entrada.ficheiro);
      expect(fonte, `${foco} deixou de reprovar acesso dinâmico`).toContain(
        'export const dynamic = "error"',
      );
      expect(fonte, `${foco} sem ${entrada.componente}`).toContain(entrada.componente);
      expect(fonte, `${foco} sem snapshot próprio`).toContain(
        `@/generated/homepage/${entrada.snapshot}`,
      );
      for (const outro of componentes.filter((nome) => nome !== entrada.componente)) {
        expect(fonte, `${foco} importou o palco ${outro}`).not.toContain(outro);
      }
    }
  });

  it("a raiz não volta a decidir o foco por query ou dynamic import", () => {
    const fonte = ler("app", "page.tsx");
    expect(fonte).not.toContain("searchParams");
    expect(fonte).not.toContain("next/dynamic");
    expect(fonte).not.toContain("normalizarFocoHomepage");
  });

  it("o mapa das cinco rotas é bijetivo e aceita barra final", () => {
    expect(new Set(Object.values(ROTA_POR_FOCO)).size).toBe(FOCOS_HOMEPAGE.length);
    for (const foco of FOCOS_HOMEPAGE) {
      const rota = ROTA_POR_FOCO[foco];
      expect(focoDaRotaHomepage(rota)).toBe(foco);
      expect(focoDaRotaHomepage(rota === "/" ? rota : `${rota}/`)).toBe(foco);
    }
    expect(focoDaRotaHomepage("/ferramentas/calcular-preco")).toBeNull();
  });
});

describe("homepage: snapshots fiscais", () => {
  const snapshots = [descobrir, preco, recibos, empresa, salario];

  it("todos correspondem à release e à mesma revisão dos motores", () => {
    const hashes = new Set<string>();
    for (const snapshot of snapshots) {
      expect(snapshot._meta.schema).toBe(1);
      expect(snapshot._meta.appVersion).toBe(APP_VERSION);
      expect(snapshot._meta.fiscalYear).toBe(FISCAL_YEAR);
      expect(snapshot._meta.engineHash).toMatch(/^sha256:[a-f0-9]{64}$/);
      hashes.add(snapshot._meta.engineHash);
    }
    expect(hashes.size).toBe(1);
  });

  it("resolve o prazo SS no calendário da visita, inclusive além do snapshot", () => {
    expect(
      resolverPrazoSSAtual(recibos.dados.prazosSS, new Date(2026, 0, 19, 12)),
    ).toEqual({ iso: "2026-01-20", rotulo: "20 de janeiro", dias: 1 });
    expect(
      resolverPrazoSSAtual(recibos.dados.prazosSS, new Date(2026, 0, 21, 12)),
    ).toEqual({ iso: "2026-02-20", rotulo: "20 de fevereiro", dias: 30 });
    expect(resolverPrazoSSAtual([], new Date(2034, 11, 21, 12))).toEqual({
      iso: "2035-01-20",
      rotulo: "20 de janeiro",
      dias: 30,
    });
  });
});

describe("homepage: compatibilidade e intenção", () => {
  it("redireciona URLs legados uma vez, remove só foco e preserva campanha", () => {
    for (const foco of FOCOS_HOMEPAGE) {
      const resposta = proxy(
        new NextRequest(`https://www.recibocerto.pt/?foco=${foco}&utm_source=teste`),
      );
      const destino = new URL(resposta.headers.get("location")!);
      expect(resposta.status).toBe(307);
      expect(destino.pathname).toBe(ROTA_POR_FOCO[foco]);
      expect(destino.searchParams.get("foco")).toBeNull();
      expect(destino.searchParams.get("utm_source")).toBe("teste");
    }
  });

  it("mantém instrumentação sem PII e o contrato de prefetch limitado", () => {
    expect(CATALOGO.focus_switch_ack.origem).toBe("cliente");
    expect(CATALOGO.focus_switch_ready.origem).toBe("cliente");

    const fonte = ler("components", "foco", "ControladorPrefetchFocos.tsx");
    expect(fonte).toContain("router.prefetch");
    expect(fonte).toContain("MAX_ESPECULATIVOS = 2");
    expect(fonte).toContain('effectiveType === "slow-2g"');
    expect(fonte).toContain('effectiveType === "2g"');
    expect(fonte).toContain("saveData");
    expect(fonte).toContain('item.origem !== "idle"');
    expect(fonte).toContain('marcar("rc:foco:controller-ready"');
    expect(fonte).toContain('marcar("rc:foco:pointerdown"');
    expect(fonte).toContain('marcar("rc:foco:ack-painted"');
    expect(fonte).toContain('marcar("rc:foco:content-commit"');
    expect(fonte).toContain('marcar("rc:foco:prefetch-end"');
    expect(fonte).toContain("`rc:foco:prefetch-ready:${foco}`");
    expect(fonte).toContain(
      'performance.clearMarks(`rc:foco:prefetch-ready:${item.foco}`)',
    );
    expect(fonte).toContain('marcar("rc:foco:navigation-start"');
    expect(fonte).toContain('marcar("rc:foco:rsc-end"');
    expect(fonte).toContain('document.addEventListener("keydown", aoTeclarFoco, true)');
    expect(fonte).toContain('marcar("rc:foco:keyboard-ready"');

    const ligacao = ler("components", "foco", "LinkFocoIntencao.tsx");
    expect(ligacao).toContain("`rc:foco:link-ready:${foco}`");
    expect(ligacao).toContain('evento.key === "Enter"');
    expect(ligacao).toContain("evento.preventDefault()");
    expect(ligacao).toContain('iniciar(foco, "teclado")');
    expect(ligacao).toContain("router.push(ROTA_POR_FOCO[foco], { scroll: false })");
    expect(fonte).toContain("performance.now() - navegacaoAtual.inicio < 1_000");
    expect(fonte).toContain("__rcNavegacaoPendente");
    expect(fonte).toContain("lerNavegacaoPendente()");
    expect(fonte).not.toContain("let navegacaoPendente");

    const regua = ler("components", "foco", "ReguaPerguntasHero.tsx");
    const bussola = ler("components", "foco", "HeroBussola.tsx");
    expect(regua).toContain("data-foco-destino={item.id}");
    expect(bussola).toContain("data-foco-destino={foco.id}");
  });

  it("não inicializa Supabase nem subscrição pesada para anónimo público", () => {
    const auth = ler("lib", "supabase", "auth.tsx");
    expect(auth).toContain("haEvidenciaDeSessao");
    expect(auth).toContain("rotaExigeAuth(pathname)");
    expect(auth).toContain("void ativarAuth()");

    const subscricao = ler("lib", "stripe", "subscription.tsx");
    expect(subscricao).toContain('lazy(() => import("./subscription-runtime"))');
    expect(subscricao).toContain("if (!user) return fallback");

    const layout = ler("app", "layout.tsx");
    expect(layout).not.toContain('from "@/components/ui/motion/MotionProvider"');
  });
});

describe("homepage: animação, dados de campo e budgets", () => {
  it("mantém um único relógio por palco e suspende trabalho invisível", () => {
    const frame = ler("components", "palco", "frame.ts");
    const palco = ler("components", "palco", "usePalco.ts");
    expect(frame.match(/requestAnimationFrame\(/g)).toHaveLength(1);
    expect(frame).toContain('document.addEventListener("visibilitychange"');
    expect(frame).toContain("new IntersectionObserver");
    expect(frame).toContain('no.toggleAttribute("data-palco-suspenso"');
    expect(frame).toContain('performance.mark("rc:foco:first-animation-frame"');
    expect(frame).toContain("ultimo.current === null ? 0");
    expect(palco).toContain('window.addEventListener("rc:foco:navigation-start"');
    expect(palco).toContain("sessionStorage.getItem(chave)");
    expect(palco).toContain("sessionStorage.setItem(chave, \"1\")");
    expect(palco).toContain("autoplayIgnorado || !montado || feito(beat)");
  });

  it("mantém conteúdo editorial no servidor e adia layout abaixo da dobra", () => {
    const reveal = ler("components", "ui", "Reveal.tsx");
    const precos = ler("components", "Precos.tsx");
    const css = ler("app", "globals.css");

    expect(reveal).not.toContain('"use client"');
    expect(reveal).not.toContain("motion/react");
    expect(reveal).toContain("rc-view-reveal");
    expect(precos).not.toContain('"use client"');
    expect(precos).not.toContain("motion/react");
    expect(precos).toContain("rc-home-deferred--xlarge");
    expect(css).toContain("content-visibility: auto");
    expect(css).toContain("contain-intrinsic-size: auto var(--rc-home-intrinsic");
    expect(css).toContain("[data-homepage-foco] .rc-home-deferred");
  });

  it("mantém os palcos leves sem perder transições, presença ou redução de movimento", () => {
    const palcos = [
      ["components", "descobrir", "PalcoDescobrir.tsx"],
      ["components", "descobrir", "LaboratorioDescobrir.tsx"],
      ["components", "preco", "HeroPreco.tsx"],
      ["components", "preco", "LaboratorioPreco.tsx"],
      ["components", "foco", "recibos", "PalcoRecibos.tsx"],
      ["components", "foco", "empresa", "PalcoEmpresa.tsx"],
      ["components", "foco", "salario", "PalcoSalario.tsx"],
    ];
    for (const caminho of palcos) {
      const fonte = ler(...caminho);
      expect(fonte, caminho.join("/")).not.toContain('from "motion/react"');
      expect(fonte, caminho.join("/")).toContain(
        "@/components/palco/motion-lite",
      );
    }

    const leve = ler("components", "palco", "motion-lite.tsx");
    expect(leve).toContain("style.transition = `all");
    expect(leve).toContain('mode !== "popLayout"');
    expect(leve).toContain('mode === "wait"');
    expect(leve).toContain("presenca.bloquearEntrada");
    expect(leve).toContain('matchMedia("(prefers-reduced-motion: reduce)")');

    const heroPreco = ler("components", "preco", "HeroPreco.tsx");
    const palcoPartilhado = ler("components", "simulador", "palco.tsx");
    expect(heroPreco).toContain("palco-controles");
    expect(palcoPartilhado).toContain('from "motion/react"');
  });

  it("carrega a folha completa só por intenção e leva Motion no mesmo chunk", () => {
    const nav = ler("components", "Nav.tsx");
    const marca = ler("components", "ChromeMobileMarca.tsx");
    const fronteira = ler(
      "components",
      "navegacao",
      "MenuCompletoIntencao.tsx",
    );

    for (const fonte of [nav, marca]) {
      expect(fonte).toContain("dynamic(");
      expect(fonte).toContain('import("@/components/navegacao/MenuCompletoIntencao")');
      expect(fonte).toContain("prepararMenuCompleto");
      expect(fonte).not.toContain(
        'import MenuCompleto from "@/components/navegacao/MenuCompleto"',
      );
    }
    expect(fronteira).toContain("<MotionProvider>");
    expect(fronteira).toContain("<MenuCompleto {...props} />");
  });

  it("o postbuild mede scripts servidos e inspeciona o runtime de Motion", () => {
    const gate = ler("..", "scripts", "verificar-chunks-homepage.mjs");
    expect(gate).toContain("function chunksDoDocumento(html)");
    expect(gate).toContain("chunksDoDocumento(htmlTexto)");
    expect(gate).toContain("jsManifesto");
    expect(gate).toContain('"MotionConfigContext"');
    expect(gate).toContain('"PresenceContext"');
    expect(gate).toContain("chunksComRuntimeMotion(chunksTermos)");
  });

  it("protege a fronteira estrutural do layout raiz no prebuild", () => {
    const layout = ler("app", "layout.tsx");
    const gate = ler("..", "scripts", "verificar-layout-raiz.mjs");
    const pacote = ler("..", "package.json");

    expect(layout).not.toContain("motion/react");
    expect(layout).not.toContain("@supabase/supabase-js");
    expect(gate).toContain("PROVIDERS_PERMITIDOS");
    expect(gate).toContain("IMPORTS_PROIBIDOS");
    expect(pacote).toContain("node scripts/verificar-layout-raiz.mjs");
  });

  it("recupera saídas CSS sem reintroduzir Motion no chrome global", () => {
    const avisos = ler("components", "ui", "Avisos.tsx");
    const confirmar = ler("components", "ui", "Confirmar.tsx");
    const css = ler("app", "globals.css");

    expect(avisos).toContain("rc-aviso-saida");
    expect(avisos).toContain("aSair: true");
    expect(confirmar).toContain("rc-overlay-saida");
    expect(confirmar).toContain("rc-dialogo-saida");
    expect(css).toContain("@keyframes rc-aviso-saida");
    expect(css).toContain("@keyframes rc-dialogo-saida");
    expect(avisos).not.toContain("motion/react");
    expect(confirmar).not.toContain("motion/react");
  });

  it("só carrega Speed Insights após opt-in e não envia URL privada", () => {
    const medicao = ler("components", "Medicao.tsx");
    expect(medicao).toContain('import("@vercel/speed-insights/next")');
    expect(medicao).toContain("if (!estatisticaPermitida) return null");
    expect(medicao).toContain("lerConsentimento()?.estatistica !== true");
    expect(medicao).toContain("ROTAS_DE_CAMPO.has(url.pathname)");
    expect(medicao).toContain('url.search = ""');
    expect(medicao).toContain('url.hash = ""');
    expect(medicao).toContain("route: url.pathname");
    expect(CONSENT_VERSION).toBe(2);
  });

  it("protege a matriz real, a amostra e a dispersão no CI", () => {
    const benchmark = ler("..", "scripts", "medir-desempenho.mjs");
    const workflow = ler("..", ".github", "workflows", "testes-e-build.yml");
    const esperaDestino = benchmark.indexOf(
      'await principal.first().waitFor({ state: "visible"',
    );
    const exigeDestinoUnico = benchmark.indexOf(
      "if ((await principal.count()) !== 1)",
    );
    expect(benchmark).toContain("REPETICOES < 10");
    expect(benchmark).toContain("export const CONSENT_VERSION = (\\d+);");
    expect(benchmark).toContain("chromium, firefox, webkit");
    expect(esperaDestino).toBeGreaterThan(-1);
    expect(esperaDestino).toBeLessThan(exigeDestinoUnico);
    expect(benchmark).toContain("p50: arredondar(p50)");
    expect(benchmark).toContain("p75: arredondar(p75)");
    expect(benchmark).toContain("p95: arredondar(p95)");
    expect(benchmark).toContain("dispersao: arredondar(p95 - p50)");
    expect(benchmark).toContain("contexto.setOffline(true)");
    expect(benchmark).toContain('offline: repeticao === 0 && browserNome === "chromium"');
    expect(benchmark).not.toContain("pagina.waitForURL(destino");
    expect(benchmark).toContain("getEntriesByName(`rc:foco:link-ready:${destino}`)");
    expect(benchmark).toContain('getEntriesByName("rc:foco:keyboard-ready")');
    expect(benchmark).toContain("{ timeout: 6_000 }");
    expect(benchmark).toContain("`rc:foco:prefetch-ready:${foco}`");
    expect(benchmark).not.toContain("catch(() => pagina.waitForTimeout(2_500))");
    expect(benchmark).toContain('type: "long-animation-frame"');
    expect(benchmark).toContain('entrada.name.startsWith("rc:overlay:load:")');
    expect(benchmark).toContain('modo === "preparado" && metricas.bytesTransferidos > 0');
    expect(benchmark).toContain("validarMovimentoReduzido");
    expect(benchmark).toContain("validarCacheCDN");
    expect(workflow).toContain("homepage-performance:");
    expect(workflow).toContain("RC_REPETICOES: 10");
    expect(workflow).toContain("npx playwright install --with-deps ${{ matrix.browser }}");
    expect(workflow).toContain("npm run homepage:visual");
    expect(workflow).toContain("tests/visual/homepage");
  });

  it("define rollout 10 → 50 → 100 sem duplicar a homepage", () => {
    const rollout = ler("..", "docs", "rollout-homepage.md");
    expect(rollout).toContain("vercel rolling-release configure --enable");
    expect(rollout).toContain("--stage=10 --stage=50");
    expect(rollout).toContain("vercel rolling-release start");
    expect(rollout).toContain("vercel rolling-release complete");
    expect(rollout).toContain("vercel rolling-release abort");
    expect(rollout).not.toContain("NEXT_PUBLIC_HOME_FOCOS_V2=true");
  });

  it("mantém os E2E no contrato de consentimento em vigor", () => {
    for (const script of [
      "verificar-descobrir-negocio.mjs",
      "verificar-negocio-empresa.mjs",
    ]) {
      expect(ler("..", "scripts", script)).toContain(
        `versao: ${CONSENT_VERSION}`,
      );
    }
  });
});
