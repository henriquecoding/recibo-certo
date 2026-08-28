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
    expect(fonte).toContain('marcar("rc:foco:navigation-start"');
    expect(fonte).toContain('marcar("rc:foco:rsc-end"');

    const ligacao = ler("components", "foco", "LinkFocoIntencao.tsx");
    expect(ligacao).toContain("`rc:foco:link-ready:${foco}`");

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
    expect(frame.match(/requestAnimationFrame\(/g)).toHaveLength(1);
    expect(frame).toContain('document.addEventListener("visibilitychange"');
    expect(frame).toContain("new IntersectionObserver");
    expect(frame).toContain('no.toggleAttribute("data-palco-suspenso"');
    expect(frame).toContain('performance.mark("rc:foco:first-animation-frame"');
    expect(frame).toContain("ultimo.current === null ? 0");
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
    expect(benchmark).toContain("{ timeout: 6_000 }");
    expect(workflow).toContain("homepage-performance:");
    expect(workflow).toContain("RC_REPETICOES: 10");
    expect(workflow).toContain("npx playwright install --with-deps ${{ matrix.browser }}");
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
